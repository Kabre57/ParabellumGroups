import { Request, Response } from 'express';
import { PrismaClient, SourceDocumentType } from '@prisma/client';
import { AuthenticatedRequest } from '../types';
import { body, validationResult } from 'express-validator';

const prisma = new PrismaClient();

export const getPayments = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, customerId } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause: any = {};

    if (customerId) {
      whereClause.customerId = Number(customerId);
    }

    // Filtrage par rôle si nécessaire
    if (!['ADMIN', 'GENERAL_DIRECTOR', 'ACCOUNTANT'].includes(req.user!.role)) {
      whereClause.creator = {
        serviceId: req.user!.serviceId
      };
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where: whereClause,
        include: {
          customer: {
            select: { name: true, customerNumber: true }
          },
          creator: {
            select: { firstName: true, lastName: true }
          },
          allocations: {
            include: {
              invoice: {
                select: { invoiceNumber: true, totalTtc: true }
              }
            }
          }
        },
        skip: offset,
        take: Number(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.payment.count({ where: whereClause })
    ]);

    res.json({
      success: true,
      data: {
        payments,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des paiements:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const getPaymentById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const payment = await prisma.payment.findUnique({
      where: { id: Number(id) },
      include: {
        customer: true,
        creator: {
          select: { firstName: true, lastName: true }
        },
        allocations: {
          include: {
            invoice: {
              select: { invoiceNumber: true, totalTtc: true, balanceDue: true }
            }
          }
        }
      }
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Paiement non trouvé'
      });
    }

    res.json({
      success: true,
      data: payment
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du paiement:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const createPayment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    const {
      customerId,
      amount,
      paymentDate,
      paymentMethod,
      reference,
      notes,
      invoiceAllocations
    } = req.body;

    // Vérifier que le client existe
    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Client non trouvé'
      });
    }

    // Générer le numéro de paiement
    const lastPayment = await prisma.payment.findFirst({
      orderBy: { paymentNumber: 'desc' }
    });
    
    let nextNumber = 1;
    if (lastPayment) {
      const lastNumber = parseInt(lastPayment.paymentNumber.split('-')[1]);
      nextNumber = lastNumber + 1;
    }
    
    const paymentNumber = `PAY-${new Date().getFullYear()}-${nextNumber.toString().padStart(3, '0')}`;

    // Vérifier les allocations si spécifiées
    let totalAllocated = 0;
    if (invoiceAllocations && invoiceAllocations.length > 0) {
      for (const allocation of invoiceAllocations) {
        const invoice = await prisma.invoice.findUnique({
          where: { id: allocation.invoiceId }
        });

        if (!invoice) {
          return res.status(404).json({
            success: false,
            message: `Facture ${allocation.invoiceId} non trouvée`
          });
        }

        if (invoice.customerId !== customerId) {
          return res.status(400).json({
            success: false,
            message: 'Toutes les factures doivent appartenir au même client'
          });
        }

        totalAllocated += allocation.amount;
      }

      if (totalAllocated > amount) {
        return res.status(400).json({
          success: false,
          message: 'Le total des allocations dépasse le montant du paiement'
        });
      }
    }

    const payment = await prisma.payment.create({
      data: {
        paymentNumber,
        customerId,
        amount,
        paymentDate: new Date(paymentDate),
        paymentMethod,
        reference,
        notes,
        createdBy: req.user!.userId,
        allocations: invoiceAllocations ? {
          create: invoiceAllocations.map((allocation: any) => ({
            invoiceId: allocation.invoiceId,
            amount: allocation.amount
          }))
        } : undefined
      },
      include: {
        customer: true,
        allocations: {
          include: {
            invoice: true
          }
        }
      }
    });

    // Mettre à jour les factures concernées
    if (invoiceAllocations && invoiceAllocations.length > 0) {
      for (const allocation of invoiceAllocations) {
        const invoice = await prisma.invoice.findUnique({
          where: { id: allocation.invoiceId }
        });

        if (invoice) {
          const newPaidAmount = invoice.paidAmount + allocation.amount;
          const newBalanceDue = invoice.totalTtc - newPaidAmount;
          
          let newStatus = invoice.status;
          if (newBalanceDue <= 0) {
            newStatus = 'PAID';
          } else if (newPaidAmount > 0) {
            newStatus = 'PARTIAL';
          }

          await prisma.invoice.update({
            where: { id: allocation.invoiceId },
            data: {
              paidAmount: newPaidAmount,
              balanceDue: newBalanceDue,
              status: newStatus
            }
          });
        }
      }
    }

    // Créer les écritures comptables
    await createPaymentAccountingEntries(payment.id, amount, paymentMethod, req.user!.userId);

    res.status(201).json({
      success: true,
      data: payment,
      message: 'Paiement enregistré avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la création du paiement:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const getUnpaidInvoices = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { customerId } = req.params;

    const invoices = await prisma.invoice.findMany({
      where: {
        customerId: Number(customerId),
        status: {
          in: ['SENT', 'PARTIAL', 'OVERDUE']
        },
        balanceDue: {
          gt: 0
        }
      },
      select: {
        id: true,
        invoiceNumber: true,
        invoiceDate: true,
        dueDate: true,
        totalTtc: true,
        paidAmount: true,
        balanceDue: true,
        status: true
      },
      orderBy: { invoiceDate: 'asc' }
    });

    res.json({
      success: true,
      data: invoices
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des factures impayées:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

// Fonction utilitaire pour créer les écritures comptables de paiement
async function createPaymentAccountingEntries(
  paymentId: number,
  amount: number,
  paymentMethod: string,
  userId: number
) {
  const entries = [];

  // Débit banque/caisse selon le mode de paiement
  let accountNumber = '512000'; // Banque par défaut
  switch (paymentMethod) {
    case 'CASH':
      accountNumber = '531000'; // Caisse
      break;
    case 'CHECK':
      accountNumber = '512100'; // Chèques à encaisser
      break;
    case 'CARD':
      accountNumber = '512200'; // Banque carte
      break;
  }

  entries.push({
    entryDate: new Date(),
    accountNumber,
    debit: amount,
    credit: 0,
    description: `Encaissement client`,
    sourceDocumentType: SourceDocumentType.PAYMENT,
    sourceDocumentId: paymentId,
    createdBy: userId
  });

  // Crédit client
  entries.push({
    entryDate: new Date(),
    accountNumber: '411000', // Clients
    debit: 0,
    credit: amount,
    description: `Paiement client`,
    sourceDocumentType: SourceDocumentType.PAYMENT,
    sourceDocumentId: paymentId,
    createdBy: userId
  });

  await prisma.accountingEntry.createMany({
    data: entries
  });

  // Créer l'entrée de trésorerie
  await prisma.cashFlow.create({
    data: {
      transactionDate: new Date(),
      type: 'INFLOW',
      amount,
      description: `Paiement client`,
      category: 'Encaissements',
      sourceDocumentType: 'PAYMENT',
      sourceDocumentId: paymentId,
      createdBy: userId
    }
  });
}

// Validation middleware
export const validatePayment = [
  body('customerId').isInt().withMessage('ID client requis'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Montant invalide'),
  body('paymentDate').isISO8601().withMessage('Date de paiement invalide'),
  body('paymentMethod').isIn(['TRANSFER', 'CHECK', 'CARD', 'CASH', 'OTHER']).withMessage('Mode de paiement invalide')
];