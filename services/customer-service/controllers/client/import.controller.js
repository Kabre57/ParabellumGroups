// Gestion de la création et l’import de clients.
const { prisma, logger, validationResult, toJsonSafe, parseScopedInteger, normalizeImportKey, buildImportRowMap, pickImportValue, parseImportNumber, parseImportInteger, parseImportEnum, compactImportData, isValidImportEmail } = require('./shared');

exports.create = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const {
      nom,
      raisonSociale,
      email,
      telephone,
      mobile,
      fax,
      siteWeb,
      idu,
      ncc,
      rccm,
      codeActivite,
      typeClientId,
      secteurActiviteId,
      status = 'PROSPECT',
      priorite = 'MOYENNE',
      source,
      chiffreAffaireAnnuel,
      effectif,
      prospectId,
      commercialId,
      enterpriseId,
      serviceId
    } = req.body;

    // Check if email already exists
    const existingClient = await prisma.client.findUnique({
      where: { email }
    });

    if (existingClient) {
      return res.status(409).json({
        success: false,
        error: 'Un client avec cet email existe déjà'
      });
    }

    // Generate unique reference
    const reference = await generateClientReference();

    // Create client with transaction
    const client = await prisma.$transaction(async (tx) => {
      const newClient = await tx.client.create({
        data: {
          reference,
          nom,
          raisonSociale,
          email,
          telephone,
          mobile,
          fax,
          siteWeb,
          idu,
          ncc,
          rccm,
          codeActivite,
          typeClientId,
          secteurActiviteId,
          status,
          priorite,
          source,
          chiffreAffaireAnnuel: chiffreAffaireAnnuel ? parseFloat(chiffreAffaireAnnuel) : null,
          effectif: effectif ? parseInt(effectif) : null,
          prospectId,
          commercialId,
          enterpriseId: parseScopedInteger(enterpriseId) ?? parseScopedInteger(req.user?.enterpriseId),
          serviceId: parseScopedInteger(serviceId) ?? parseScopedInteger(req.user?.serviceId),
          datePremierContact: new Date(),
          createdBy: req.user.id,
          updatedBy: req.user.id
        }
      });

      // Create historique entry
      await tx.historiqueClient.create({
        data: {
          clientId: newClient.id,
          typeChangement: 'CREATION',
          entite: 'CLIENT',
          nouvelleValeur: newClient,
          modifieParId: req.user.id,
          modifieLe: new Date(),
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        }
      });

      // If prospectId provided, create sync record
      if (prospectId) {
        await tx.synchronisationProspectClient.create({
          data: {
            prospectId,
            clientId: newClient.id,
            typeSync: 'PROSPECT_TO_CLIENT',
            status: 'SUCCES',
            details: {
              convertedAt: new Date(),
              convertedBy: req.user.id
            }
          }
        });
      }

      return newClient;
    });

    logger.info('Client créé', {
      clientId: client.id,
      userId: req.user.id,
      clientName: client.nom
    });

    res.status(201).json({
      success: true,
      message: 'Client créé avec succès',
      data: client
    });
  } catch (error) {
    logger.error('Erreur lors de la création du client:', error);

    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        error: 'Violation de contrainte unique',
        details: error.meta?.target || 'Champ unique déjà utilisé'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création du client',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Import clients from parsed CSV rows.
 */

exports.importClients = async (req, res) => {
  const items = Array.isArray(req.body) ? req.body : req.body?.items;
  const updateExisting = req.body?.options?.updateExisting !== false;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Aucune ligne client a importer'
    });
  }

  const result = {
    total: items.length,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: []
  };

  try {
    const typeClients = await prisma.typeClient.findMany({
      where: { isActive: true },
      orderBy: [{ ordre: 'asc' }, { libelle: 'asc' }]
    });
    const typeById = new Map(typeClients.map((typeClient) => [typeClient.id, typeClient]));
    const typeByKey = new Map();

    typeClients.forEach((typeClient) => {
      typeByKey.set(normalizeImportKey(typeClient.code), typeClient);
      typeByKey.set(normalizeImportKey(typeClient.libelle), typeClient);
    });

    for (const [index, row] of items.entries()) {
      const rowNumber = index + 2;

      try {
        if (!row || typeof row !== 'object') {
          throw new Error('Ligne invalide');
        }

        const rowMap = buildImportRowMap(row);
        const nom = pickImportValue(rowMap, ['nom', 'nom client', 'client', 'name']);
        const email = pickImportValue(rowMap, ['email', 'mail', 'courriel']);

        if (!nom) {
          throw new Error('Le nom est requis');
        }
        if (!email || !isValidImportEmail(email)) {
          throw new Error('Un email valide est requis');
        }

        let typeClientId = pickImportValue(rowMap, ['typeClientId', 'type client id', 'id type client']);
        if (typeClientId && !typeById.has(typeClientId)) {
          throw new Error(`Type client introuvable: ${typeClientId}`);
        }

        if (!typeClientId) {
          const typeToken = pickImportValue(rowMap, ['typeClient', 'type client', 'type', 'code type client']);
          const matchedType = typeToken ? typeByKey.get(normalizeImportKey(typeToken)) : null;
          typeClientId = matchedType?.id;
        }

        const status = parseImportEnum(
          pickImportValue(rowMap, ['status', 'statut']),
          ['PROSPECT', 'ACTIF', 'INACTIF', 'SUSPENDU', 'ARCHIVE', 'LEAD_CHAUD', 'LEAD_FROID'],
          'Statut'
        );
        const priorite = parseImportEnum(
          pickImportValue(rowMap, ['priorite', 'priorite client', 'priority']),
          ['BASSE', 'MOYENNE', 'HAUTE', 'CRITIQUE'],
          'Priorite'
        );
        const source = parseImportEnum(
          pickImportValue(rowMap, ['source', 'origine']),
          ['PROSPECTION', 'RECOMMANDATION', 'PARTENAIRE', 'SALON', 'SITE_WEB', 'RESEAUX_SOCIAUX', 'CAMPAGNE_EMAIL', 'APPEL_ENTRANT', 'BASE_ACHETEE', 'AUTRE'],
          'Source'
        );

        const existingClient = await prisma.client.findUnique({
          where: { email }
        });

        if (existingClient && !updateExisting) {
          result.skipped += 1;
          continue;
        }

        if (!typeClientId && !existingClient) {
          typeClientId = typeClients[0]?.id;
        }

        if (!typeClientId && !existingClient) {
          throw new Error('Aucun type client actif disponible');
        }

        const rowEnterpriseId = parseScopedInteger(pickImportValue(rowMap, ['enterpriseId', 'entreprise id']));
        const rowServiceId = parseScopedInteger(pickImportValue(rowMap, ['serviceId', 'service id']));

        const data = compactImportData({
          reference: existingClient
            ? pickImportValue(rowMap, ['reference', 'ref'])
            : pickImportValue(rowMap, ['reference', 'ref']) || await generateClientReference(),
          nom,
          raisonSociale: pickImportValue(rowMap, ['raisonSociale', 'raison sociale', 'societe', 'entreprise']),
          email,
          telephone: pickImportValue(rowMap, ['telephone', 'tel', 'phone']),
          mobile: pickImportValue(rowMap, ['mobile', 'portable']),
          fax: pickImportValue(rowMap, ['fax']),
          siteWeb: pickImportValue(rowMap, ['siteWeb', 'site web', 'website']),
          idu: pickImportValue(rowMap, ['idu']),
          ncc: pickImportValue(rowMap, ['ncc']),
          rccm: pickImportValue(rowMap, ['rccm']),
          codeActivite: pickImportValue(rowMap, ['codeActivite', 'code activite', 'ape']),
          typeClientId,
          secteurActiviteId: pickImportValue(rowMap, ['secteurActiviteId', 'secteur activite id']),
          status: status || (existingClient ? undefined : 'PROSPECT'),
          priorite: priorite || (existingClient ? undefined : 'MOYENNE'),
          source,
          chiffreAffaireAnnuel: parseImportNumber(
            pickImportValue(rowMap, ['chiffreAffaireAnnuel', 'chiffre affaire annuel', 'ca annuel']),
            'Chiffre d affaire annuel'
          ),
          effectif: parseImportInteger(pickImportValue(rowMap, ['effectif', 'employees']), 'Effectif'),
          enterpriseId: rowEnterpriseId ?? (existingClient ? undefined : parseScopedInteger(req.user?.enterpriseId)),
          serviceId: rowServiceId ?? (existingClient ? undefined : parseScopedInteger(req.user?.serviceId)),
          updatedBy: req.user.id
        });

        await prisma.$transaction(async (tx) => {
          const savedClient = existingClient
            ? await tx.client.update({
                where: { id: existingClient.id },
                data
              })
            : await tx.client.create({
                data: {
                  ...data,
                  datePremierContact: new Date(),
                  createdBy: req.user.id
                }
              });

          await tx.historiqueClient.create({
            data: {
              clientId: savedClient.id,
              typeChangement: existingClient ? 'MODIFICATION' : 'CREATION',
              entite: 'CLIENT',
              ancienneValeur: existingClient ? toJsonSafe(existingClient) : null,
              nouvelleValeur: toJsonSafe(savedClient),
              modifieParId: req.user.id,
              modifieLe: new Date(),
              ipAddress: req.ip,
              userAgent: req.get('user-agent')
            }
          });
        });

        if (existingClient) {
          result.updated += 1;
        } else {
          result.created += 1;
        }
      } catch (error) {
        result.skipped += 1;
        result.errors.push({
          row: rowNumber,
          message: error.code === 'P2002'
            ? `Valeur deja utilisee: ${error.meta?.target || 'champ unique'}`
            : error.message
        });
      }
    }

    res.json({
      success: result.errors.length === 0,
      message: 'Import clients termine',
      data: result
    });
  } catch (error) {
    logger.error('Erreur lors de l import clients:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l import des clients',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update client information
 */
