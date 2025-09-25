import { Request, Response } from 'express';
import { PrismaClient, SourceDocumentType } from '@prisma/client';
import { AuthenticatedRequest } from '../types';
import { body, validationResult } from 'express-validator';

const prisma = new PrismaClient();

export const getInvoices = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, status, serviceId } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause: any = {};

    // Filtrage par rôle
    if (req.user!.role === 'EMPLOYEE') {
      whereClause.createdBy = req.user!.userId;
    } else if (req.user!.role === 'SERVICE_MANAGER') {
      whereClause.creator = {
        serviceId: req.user!.serviceId
      };
    } else if (!['ADMIN', 'GENERAL_DIRECTOR', 'ACCOUNTANT'].includes(req.user!.role)) {
      whereClause.creator = {
        serviceId: req.user!.serviceId
      };
    }

    if (status) {
      whereClause.status = status;
    }

    if (serviceId && ['ADMIN', 'GENERAL_DIRECTOR', 'ACCOUNTANT'].includes(req.user!.role)) {
      whereClause.creator = {
        serviceId: Number(serviceId)
      };
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where: whereClause,
        include: {
          customer: {
            select: { name: true, customerNumber: true }
          },
          creator: {
            select: { firstName: true, lastName: true }
          },
          quote: {
            select: { quoteNumber: true }
          },
          items: {
            include: {
              product: {
                select: { name: true, sku: true }
              }
            }
          },
          _count: {
            select: {
              paymentAllocations: true
            }
          }
        },
        skip: offset,
        take: Number(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.invoice.count({ where: whereClause })
    ]);

    res.json({
      success: true,
      data: {
        invoices,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des factures:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const getInvoiceById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const invoice = await prisma.invoice.findUnique({
      where: { id: Number(id) },
      include: {
        customer: {
          include: {
            addresses: true
          }
        },
        customerAddress: true,
        quote: true,
        creator: {
          select: { firstName: true, lastName: true, service: true }
        },
        items: {
          include: {
            product: true
          },
          orderBy: { sortOrder: 'asc' }
        },
        paymentAllocations: {
          include: {
            payment: true
          }
        }
      }
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Facture non trouvée'
      });
    }

    // Vérifier les permissions d'accès
    const canAccess = 
      req.user!.role === 'ADMIN' ||
      req.user!.role === 'GENERAL_DIRECTOR' ||
      req.user!.role === 'ACCOUNTANT' ||
      invoice.createdBy === req.user!.userId ||
      (req.user!.role === 'SERVICE_MANAGER' && invoice.creator.service?.id === req.user!.serviceId);

    if (!canAccess) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé à cette facture'
      });
    }

    res.json({
      success: true,
      data: invoice
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de la facture:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const createInvoice = async (req: AuthenticatedRequest, res: Response) => {
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
      customerAddressId,
      quoteId,
      type = 'INVOICE',
      invoiceDate,
      paymentTerms,
      terms,
      notes,
      items
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

    // Si un devis est spécifié, vérifier qu'il est approuvé
    if (quoteId) {
      const quote = await prisma.quote.findUnique({
        where: { id: quoteId }
      });

      if (!quote || quote.status !== 'APPROVED_BY_DG') {
        return res.status(400).json({
          success: false,
          message: 'Le devis doit être approuvé par le DG'
        });
      }
    }

    // Générer le numéro de facture
    const lastInvoice = await prisma.invoice.findFirst({
      orderBy: { invoiceNumber: 'desc' }
    });
    
    let nextNumber = 1;
    if (lastInvoice) {
      const lastNumber = parseInt(lastInvoice.invoiceNumber.split('-')[1]);
      nextNumber = lastNumber + 1;
    }
    
    const invoiceNumber = `FAC-${new Date().getFullYear()}-${nextNumber.toString().padStart(3, '0')}`;

    // Calculer les totaux
    let subtotalHt = 0;
    let totalVat = 0;

    const processedItems = items.map((item: any) => {
      const itemTotal = item.quantity * item.unitPriceHt * (1 - item.discountRate / 100);
      const itemVat = itemTotal * (item.vatRate / 100);
      
      subtotalHt += itemTotal;
      totalVat += itemVat;

      return {
        productId: item.productId,
        description: item.description,
        quantity: item.quantity,
        unitPriceHt: item.unitPriceHt,
        discountRate: item.discountRate || 0,
        vatRate: item.vatRate,
        totalHt: itemTotal,
        sortOrder: item.sortOrder || 0
      };
    });

    const totalTtc = subtotalHt + totalVat;
    const dueDate = new Date(invoiceDate);
    dueDate.setDate(dueDate.getDate() + (paymentTerms || customer.paymentTerms));

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        customerId,
        customerAddressId,
        quoteId,
        type,
        invoiceDate: new Date(invoiceDate),
        dueDate,
        subtotalHt,
        totalVat,
        totalTtc,
        balanceDue: totalTtc,
        paymentTerms: paymentTerms || customer.paymentTerms,
        terms,
        notes,
        createdBy: req.user!.userId,
        items: {
          create: processedItems
        }
      },
      include: {
        customer: true,
        items: {
          include: {
            product: true
          }
        }
      }
    });

    // Créer les écritures comptables
    await createAccountingEntries(invoice.id, 'INVOICE', subtotalHt, totalVat, totalTtc, req.user!.userId);

    res.status(201).json({
      success: true,
      data: invoice,
      message: 'Facture créée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la création de la facture:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const createInvoiceFromQuote = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { quoteId } = req.params;

    const quote = await prisma.quote.findUnique({
      where: { id: Number(quoteId) },
      include: {
        customer: true,
        customerAddress: true,
        items: {
          include: {
            product: true
          }
        }
      }
    });

    if (!quote) {
      return res.status(404).json({
        success: false,
        message: 'Devis non trouvé'
      });
    }

    if (quote.status !== 'APPROVED_BY_DG') {
      return res.status(400).json({
        success: false,
        message: 'Le devis doit être approuvé par le DG'
      });
    }

    // Vérifier qu'une facture n'existe pas déjà pour ce devis
    const existingInvoice = await prisma.invoice.findFirst({
      where: { quoteId: Number(quoteId) }
    });

    if (existingInvoice) {
      return res.status(400).json({
        success: false,
        message: 'Une facture existe déjà pour ce devis'
      });
    }

    // Générer le numéro de facture
    const lastInvoice = await prisma.invoice.findFirst({
      orderBy: { invoiceNumber: 'desc' }
    });
    
    let nextNumber = 1;
    if (lastInvoice) {
      const lastNumber = parseInt(lastInvoice.invoiceNumber.split('-')[1]);
      nextNumber = lastNumber + 1;
    }
    
    const invoiceNumber = `FAC-${new Date().getFullYear()}-${nextNumber.toString().padStart(3, '0')}`;

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + quote.customer.paymentTerms);

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        customerId: quote.customerId,
        customerAddressId: quote.customerAddressId,
        quoteId: Number(quoteId),
        invoiceDate: new Date(),
        dueDate,
        subtotalHt: quote.subtotalHt,
        totalVat: quote.totalVat,
        totalTtc: quote.totalTtc,
        balanceDue: quote.totalTtc,
        paymentTerms: quote.customer.paymentTerms,
        terms: quote.terms,
        notes: quote.notes,
        createdBy: req.user!.userId,
        items: {
          create: quote.items.map(item => ({
            productId: item.productId,
            description: item.description,
            quantity: item.quantity,
            unitPriceHt: item.unitPriceHt,
            discountRate: item.discountRate,
            vatRate: item.vatRate,
            totalHt: item.totalHt,
            sortOrder: item.sortOrder
          }))
        }
      },
      include: {
        customer: true,
        items: {
          include: {
            product: true
          }
        }
      }
    });

    // Créer les écritures comptables
    await createAccountingEntries(invoice.id, 'INVOICE', quote.subtotalHt, quote.totalVat, quote.totalTtc, req.user!.userId);

    res.status(201).json({
      success: true,
      data: invoice,
      message: 'Facture créée à partir du devis'
    });
  } catch (error) {
    console.error('Erreur lors de la création de la facture:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const updateInvoiceStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const invoice = await prisma.invoice.findUnique({
      where: { id: Number(id) }
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Facture non trouvée'
      });
    }

    const updatedInvoice = await prisma.invoice.update({
      where: { id: Number(id) },
      data: {
        status,
        ...(status === 'SENT' ? { sentAt: new Date() } : {})
      }
    });

    res.json({
      success: true,
      data: updatedInvoice,
      message: 'Statut de la facture mis à jour'
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du statut:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

// Fonction utilitaire pour créer les écritures comptables
async function createAccountingEntries(
  invoiceId: number,
  documentType: 'INVOICE' | 'PAYMENT',
  subtotalHt: number,
  totalVat: number,
  totalTtc: number,
  userId: number
) {
  const entries = [];

  if (documentType === 'INVOICE') {
    // Débit client
    entries.push({
      entryDate: new Date(),
      accountNumber: '411000', // Clients
      debit: totalTtc,
      credit: 0,
      description: `Facture client`,
      sourceDocumentType: 'INVOICE' as SourceDocumentType,
      sourceDocumentId: invoiceId,
      createdBy: userId
    });

    // Crédit ventes
    entries.push({
      entryDate: new Date(),
      accountNumber: '701000', // Ventes
      debit: 0,
      credit: subtotalHt,
      description: `Vente HT`,
      sourceDocumentType: 'INVOICE' as SourceDocumentType,
      sourceDocumentId: invoiceId,
      createdBy: userId
    });

    // Crédit TVA collectée
    if (totalVat > 0) {
      entries.push({
        entryDate: new Date(),
        accountNumber: '445710', // TVA collectée
        debit: 0,
        credit: totalVat,
        description: `TVA collectée`,
        sourceDocumentType: 'INVOICE' as SourceDocumentType,
        sourceDocumentId: invoiceId,
        createdBy: userId
      });
    }
  }

  await prisma.accountingEntry.createMany({
    data: entries
  });

  // Créer l'entrée de trésorerie
  await prisma.cashFlow.create({
    data: {
      transactionDate: new Date(),
      type: 'INFLOW',
      amount: totalTtc,
      description: `Facture client`,
      category: 'Ventes',
      sourceDocumentType: 'INVOICE' as SourceDocumentType,
      sourceDocumentId: invoiceId,
      createdBy: userId
    }
  });
}

// Validation middleware
export const validateInvoice = [
  body('customerId').isInt().withMessage('ID client requis'),
  body('invoiceDate').isISO8601().withMessage('Date de facture invalide'),
  body('items').isArray({ min: 1 }).withMessage('Au moins un article requis'),
  body('items.*.description').notEmpty().withMessage('Description requise'),
  body('items.*.quantity').isFloat({ min: 0.01 }).withMessage('Quantité invalide'),
  body('items.*.unitPriceHt').isFloat({ min: 0 }).withMessage('Prix unitaire invalide'),
  body('items.*.vatRate').isFloat({ min: 0, max: 100 }).withMessage('Taux TVA invalide')
];