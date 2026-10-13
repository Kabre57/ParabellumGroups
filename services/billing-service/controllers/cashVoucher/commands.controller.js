// Gestion de la création et de la validation des bons de caisse.
const { CashVoucherStatus, CashVoucherFlowType, resolveTreasuryAccountId, getTreasuryAccountingAccountId, assertEnterpriseInScope, resolveEnterpriseContext, resolveAccountingAccount, getTreasuryFamilyFromPaymentMethod, getTreasuryJournalMeta, AccountingPostingService, MappingService, prisma, ensureCreateAccess, ensureApprovalAccess, parseDate, parseAmount, nextVoucherNumber, serializeCashVoucher } = require('./shared');

exports.createCashVoucher = async (req, res) => {
  try {
    const accessError = ensureCreateAccess(req);
    if (accessError) {
      return res.status(accessError.status).json(accessError.body);
    }

    const {
      sourceType,
      sourceId,
      sourceNumber,
      expenseCategory,
      serviceId,
      serviceName,
      supplierId,
      supplierName,
      beneficiaryName,
      beneficiaryPhone,
      description,
      amountHT,
      amountTVA,
      amountTTC,
      paymentMethod,
      flowType,
      treasuryAccountId,
      issueDate,
      disbursementDate,
      reference,
      notes,
      status,
    } = req.body;

    if (!beneficiaryName || !description || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Le bénéficiaire, la description et le mode de paiement sont obligatoires',
      });
    }

    const { enterpriseId: resolvedEnterpriseId, enterpriseName: contextEnterpriseName } =
      await resolveEnterpriseContext(req, req.body.enterpriseId);
    if (!resolvedEnterpriseId) {
      return res.status(400).json({ success: false, message: 'Choisissez une entreprise active avant de créer un bon de caisse.' });
    }
    const resolvedEnterpriseName = contextEnterpriseName || req.body.enterpriseName || req.user?.enterpriseName || null;

    await assertEnterpriseInScope(
      req,
      resolvedEnterpriseId,
      "Vous n'avez pas acces a l'entreprise selectionnee pour ce bon de caisse."
    );

    if (sourceType && sourceId) {
      const existingVoucher = await prisma.cashVoucher.findFirst({
        where: {
          sourceType: String(sourceType),
          sourceId: String(sourceId),
          enterpriseId: resolvedEnterpriseId,
          status: {
            not: 'ANNULE',
          },
        },
      });

      if (existingVoucher) {
        return res.status(409).json({
          success: false,
          message: 'Un bon de caisse actif existe déjà pour cette pièce achat',
          data: serializeCashVoucher(existingVoucher),
        });
      }
    }

    const resolvedTreasuryAccountId = await resolveTreasuryAccountId(prisma, {
      treasuryAccountId,
      paymentMethod,
      user: req.user,
      enterpriseId: resolvedEnterpriseId,
    });

    await AccountingPostingService.assertTreasuryAccountPeriodOpen(
      resolvedTreasuryAccountId,
      parseDate(disbursementDate) || parseDate(issueDate) || new Date()
    );

    const voucher = await prisma.cashVoucher.create({
      data: {
        voucherNumber: await nextVoucherNumber(),
        sourceType: sourceType || 'OTHER',
        sourceId: sourceId || null,
        sourceNumber: sourceNumber || null,
        expenseCategory: expenseCategory || null,
        enterpriseId: Number.isInteger(resolvedEnterpriseId) ? resolvedEnterpriseId : null,
        enterpriseName: resolvedEnterpriseName,
        serviceId: serviceId != null && serviceId !== '' ? Number(serviceId) : null,
        serviceName: serviceName || null,
        supplierId: supplierId || null,
        supplierName: supplierName || null,
        beneficiaryName: String(beneficiaryName).trim(),
        beneficiaryPhone: beneficiaryPhone || null,
        description: String(description).trim(),
        amountHT: parseAmount(amountHT, parseAmount(amountTTC, 0)),
        amountTVA: parseAmount(amountTVA, 0),
        amountTTC: parseAmount(amountTTC, parseAmount(amountHT, 0)),
        paymentMethod,
        flowType: Object.values(CashVoucherFlowType).includes(String(flowType))
          ? flowType
          : 'DECAISSEMENT',
        treasuryAccountId: resolvedTreasuryAccountId,
        issueDate: parseDate(issueDate) || new Date(),
        disbursementDate: parseDate(disbursementDate),
        reference: reference || null,
        notes: notes || null,
        status: Object.values(CashVoucherStatus).includes(String(status)) ? status : 'BROUILLON',
        createdByUserId: String(req.user?.userId || req.user?.id || ''),
        createdByEmail: req.user?.email || null,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Bon de caisse créé avec succès',
      data: serializeCashVoucher(voucher),
    });
  } catch (error) {
    console.error('Erreur création bon de caisse:', error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : 'Erreur lors de la création du bon de caisse',
    });
  }
};

exports.updateCashVoucherStatus = async (req, res) => {
  try {
    const accessError = ensureApprovalAccess(req);
    if (accessError) {
      return res.status(accessError.status).json(accessError.body);
    }

    const { id } = req.params;
    const { status, disbursementDate, reference, notes } = req.body;

    if (!Object.values(CashVoucherStatus).includes(String(status))) {
      return res.status(400).json({
        success: false,
        message: 'Statut de bon de caisse invalide',
      });
    }

    const existing = await prisma.cashVoucher.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Bon de caisse non trouvé',
      });
    }

    await assertEnterpriseInScope(req, existing.enterpriseId, "Vous n'avez pas acces a ce bon de caisse.");

    const updated = await prisma.$transaction(async (tx) => {
      if (existing.status !== status) {
        await AccountingPostingService.assertSourceNotPosted('CASH_VOUCHER', existing.id, tx);
      }
      const updatedVoucher = await tx.cashVoucher.update({
        where: { id },
        data: {
          status,
          disbursementDate:
            (status === 'DECAISSE' || status === 'ENCAISSEMENT')
              ? parseDate(disbursementDate) || existing.disbursementDate || new Date()
              : parseDate(disbursementDate) || existing.disbursementDate,
          reference: reference !== undefined ? reference || null : existing.reference,
          notes: notes !== undefined ? notes || null : existing.notes,
          approvedByUserId: String(req.user?.userId || req.user?.id || ''),
          approvedByEmail: req.user?.email || null,
        },
      });

      // Si le statut passe à DECAISSE ou ENCAISSEMENT, on comptabilise
      if ((status === 'DECAISSE' || status === 'ENCAISSEMENT') && existing.status !== status) {
        const resolvedTreasuryAccountId = await resolveTreasuryAccountId(tx, {
          treasuryAccountId: updatedVoucher.treasuryAccountId,
          paymentMethod: updatedVoucher.paymentMethod,
          user: req.user,
          enterpriseId: updatedVoucher.enterpriseId,
        });

        const preferredTreasuryAccountingAccountId = await getTreasuryAccountingAccountId(tx, resolvedTreasuryAccountId);
        const treasuryAccount = await resolveAccountingAccount(tx, getTreasuryFamilyFromPaymentMethod(updatedVoucher.paymentMethod), {
          preferredAccountId: preferredTreasuryAccountingAccountId,
          enterpriseId: updatedVoucher.enterpriseId,
          user: req.user,
        });

        const journalMeta = await getTreasuryJournalMeta(tx, treasuryAccount, { enterpriseId: updatedVoucher.enterpriseId });

        const mappingType = updatedVoucher.flowType === 'DECAISSEMENT' ? 'CASH_VOUCHER' : 'ENCAISSEMENT';
        const counterpartMapping = await MappingService.resolveAccount(mappingType, updatedVoucher.expenseCategory || updatedVoucher.description, updatedVoucher.enterpriseId);
        const counterpartAccount = await resolveAccountingAccount(tx, updatedVoucher.flowType === 'DECAISSEMENT' ? 'MISC_EXPENSE' : 'REVENUE', {
          preferredAccountId: counterpartMapping?.accountId,
          preferredCode: counterpartMapping?.code,
          enterpriseId: updatedVoucher.enterpriseId,
          user: req.user,
        });

        const isDecaissement = updatedVoucher.flowType === 'DECAISSEMENT';
        const amountValue = Number(updatedVoucher.amountTTC);

        const postingLines = [
          {
            accountId: treasuryAccount.id,
            side: isDecaissement ? 'CREDIT' : 'DEBIT',
            amount: amountValue,
            description: `${updatedVoucher.voucherNumber} - ${updatedVoucher.description}`,
          },
          {
            accountId: counterpartAccount.id,
            side: isDecaissement ? 'DEBIT' : 'CREDIT',
            amount: amountValue,
            description: updatedVoucher.description,
          },
        ];

        await AccountingPostingService.postEntry({
          entryDate: updatedVoucher.disbursementDate || new Date(),
          journalCode: journalMeta.journalCode,
          journalLabel: journalMeta.journalLabel,
          label: `${updatedVoucher.voucherNumber} - ${updatedVoucher.description}`,
          reference: updatedVoucher.reference || updatedVoucher.voucherNumber,
          sourceType: 'CASH_VOUCHER',
          sourceId: updatedVoucher.id,
          enterpriseId: updatedVoucher.enterpriseId,
          enterpriseName: updatedVoucher.enterpriseName,
          createdByUserId: String(req.user?.userId || req.user?.id || ''),
          createdByEmail: req.user?.email || null,
          lines: postingLines,
        }, tx);

        if (resolvedTreasuryAccountId) {
          await tx.treasuryAccount.update({
            where: { id: resolvedTreasuryAccountId },
            data: {
              currentBalance: {
                increment: isDecaissement ? -amountValue : amountValue,
              },
            },
          });
        }
      }

      return updatedVoucher;
    });

    return res.json({
      success: true,
      message: 'Statut du bon de caisse mis à jour et comptabilisé',
      data: serializeCashVoucher(updated),
    });
  } catch (error) {
    console.error('Erreur mise à jour bon de caisse:', error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : 'Erreur lors de la mise à jour du bon de caisse',
    });
  }
};
