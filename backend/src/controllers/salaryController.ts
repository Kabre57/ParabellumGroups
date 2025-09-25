import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../types';
import { body, validationResult } from 'express-validator';
import { SourceDocumentType } from '@prisma/client';

const prisma = new PrismaClient();

export const getSalaries = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, employeeId, year, month } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause: any = {};

    if (employeeId) {
      whereClause.employeeId = Number(employeeId);
    }

    if (year) {
      const startDate = new Date(Number(year), 0, 1);
      const endDate = new Date(Number(year) + 1, 0, 1);
      whereClause.paymentDate = {
        gte: startDate,
        lt: endDate
      };
    }

    if (month && year) {
      const startDate = new Date(Number(year), Number(month) - 1, 1);
      const endDate = new Date(Number(year), Number(month), 1);
      whereClause.paymentDate = {
        gte: startDate,
        lt: endDate
      };
    }

    // Filtrage par service pour les non-admin
    if (!['ADMIN', 'GENERAL_DIRECTOR', 'ACCOUNTANT'].includes(req.user!.role)) {
      whereClause.employee = {
        serviceId: req.user!.serviceId
      };
    }

    const [salaries, total] = await Promise.all([
      prisma.salary.findMany({
        where: whereClause,
        include: {
          employee: {
            include: {
              service: true
            }
          }
        },
        skip: offset,
        take: Number(limit),
        orderBy: { paymentDate: 'desc' }
      }),
      prisma.salary.count({ where: whereClause })
    ]);

    res.json({
      success: true,
      data: {
        salaries,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des salaires:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const getSalaryById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const salary = await prisma.salary.findUnique({
      where: { id: Number(id) },
      include: {
        employee: {
          include: {
            service: true
          }
        }
      }
    });

    if (!salary) {
      return res.status(404).json({
        success: false,
        message: 'Salaire non trouvé'
      });
    }

    // Vérifier les permissions d'accès
    if (!['ADMIN', 'GENERAL_DIRECTOR', 'ACCOUNTANT'].includes(req.user!.role) &&
      salary.employee.serviceId !== req.user!.serviceId) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé à ce salaire'
      });
    }

    res.json({
      success: true,
      data: salary
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du salaire:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const createSalary = async (req: AuthenticatedRequest, res: Response) => {
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
      employeeId,
      paymentDate,
      workingDays,
      baseSalary,
      overtime,
      bonuses,
      allowances,
      paidLeave,
      cnpsEmployee,
      cnamEmployee,
      fdfpEmployee,
      socialContributions,
      taxes,
      nonTaxableAmount,
      otherDeductions,
      loanDeductions,
      notes
    } = req.body;

    // Vérifier que l'employé existe
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        contracts: {
          where: { isActive: true },
          take: 1
        }
      }
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employé non trouvé'
      });
    }

    if (!employee.contracts.length) {
      return res.status(400).json({
        success: false,
        message: 'Aucun contrat actif trouvé pour cet employé'
      });
    }

    // Calculer les totaux
    const grossSalary = baseSalary + (overtime || 0) + (bonuses || 0) + (allowances || 0);
    const totalDeductions = (socialContributions || 0) + (taxes || 0) + (otherDeductions || 0);
    const netSalary = grossSalary - totalDeductions;

    const salary = await prisma.salary.create({
      data: {
        employeeId,
        paymentDate: new Date(paymentDate),
        workingDays: workingDays || 0,
        baseSalary,
        overtime: overtime || 0,
        bonuses: bonuses || 0,
        allowances: allowances || 0,
        paidLeave: paidLeave || 0,
        grossSalary,
        socialContributions: socialContributions || 0,
        cnpsEmployee: cnpsEmployee || 0,
        cnamEmployee: cnamEmployee || 0,
        fdfpEmployee: fdfpEmployee || 0,
        taxes: taxes || 0,
        nonTaxableAmount: nonTaxableAmount || 0,
        otherDeductions: otherDeductions || 0,
        loanDeductions: loanDeductions || 0,
        totalDeductions,
        netSalary,
        notes
      },
      include: {
        employee: {
          include: {
            service: true
          }
        }
      }
    });

    // Créer les écritures comptables
    await createSalaryAccountingEntries(salary.id, grossSalary, totalDeductions, netSalary, req.user!.userId);

    res.status(201).json({
      success: true,
      data: salary,
      message: 'Salaire créé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la création du salaire:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const updateSalary = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    const existingSalary = await prisma.salary.findUnique({
      where: { id: Number(id) },
      include: {
        employee: true
      }
    });

    if (!existingSalary) {
      return res.status(404).json({
        success: false,
        message: 'Salaire non trouvé'
      });
    }

    const {
      paymentDate,
      workingDays,
      baseSalary,
      overtime,
      bonuses,
      allowances,
      paidLeave,
      cnpsEmployee,
      cnamEmployee,
      fdfpEmployee,
      socialContributions,
      taxes,
      nonTaxableAmount,
      otherDeductions,
      loanDeductions,
      notes
    } = req.body;

    // Recalculer les totaux
    const grossSalary = baseSalary + (overtime || 0) + (bonuses || 0) + (allowances || 0);
    const totalDeductions = (socialContributions || 0) + (taxes || 0) + (otherDeductions || 0);
    const netSalary = grossSalary - totalDeductions;

    const salary = await prisma.salary.update({
      where: { id: Number(id) },
      data: {
        paymentDate: paymentDate ? new Date(paymentDate) : undefined,
        workingDays: workingDays || 0,
        baseSalary,
        overtime: overtime || 0,
        bonuses: bonuses || 0,
        allowances: allowances || 0,
        paidLeave: paidLeave || 0,
        grossSalary,
        socialContributions: socialContributions || 0,
        cnpsEmployee: cnpsEmployee || 0,
        cnamEmployee: cnamEmployee || 0,
        fdfpEmployee: fdfpEmployee || 0,
        taxes: taxes || 0,
        nonTaxableAmount: nonTaxableAmount || 0,
        otherDeductions: otherDeductions || 0,
        loanDeductions: loanDeductions || 0,
        totalDeductions,
        netSalary,
        notes
      },
      include: {
        employee: {
          include: {
            service: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: salary,
      message: 'Salaire mis à jour avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du salaire:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const deleteSalary = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existingSalary = await prisma.salary.findUnique({
      where: { id: Number(id) }
    });

    if (!existingSalary) {
      return res.status(404).json({
        success: false,
        message: 'Salaire non trouvé'
      });
    }

    await prisma.salary.delete({
      where: { id: Number(id) }
    });

    res.json({
      success: true,
      message: 'Salaire supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression du salaire:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const getSalaryReport = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { year, month, serviceId } = req.query;

    let whereClause: any = {};

    if (year) {
      const startDate = new Date(Number(year), month ? Number(month) - 1 : 0, 1);
      const endDate = month
        ? new Date(Number(year), Number(month), 1)
        : new Date(Number(year) + 1, 0, 1);

      whereClause.paymentDate = {
        gte: startDate,
        lt: endDate
      };
    }

    if (serviceId) {
      whereClause.employee = {
        serviceId: Number(serviceId)
      };
    }

    const salaries = await prisma.salary.findMany({
      where: whereClause,
      include: {
        employee: {
          include: {
            service: true
          }
        }
      },
      orderBy: { paymentDate: 'desc' }
    });

    // Calculer les totaux
    const totalGross = salaries.reduce((sum, salary) => sum + salary.grossSalary, 0);
    const totalNet = salaries.reduce((sum, salary) => sum + salary.netSalary, 0);
    const totalDeductions = salaries.reduce((sum, salary) => sum + salary.totalDeductions, 0);

    // Grouper par service
    const byService = salaries.reduce((acc, salary) => {
      const serviceName = salary.employee.service?.name || 'Sans service';
      if (!acc[serviceName]) {
        acc[serviceName] = {
          count: 0,
          totalGross: 0,
          totalNet: 0,
          totalDeductions: 0
        };
      }
      acc[serviceName].count++;
      acc[serviceName].totalGross += salary.grossSalary;
      acc[serviceName].totalNet += salary.netSalary;
      acc[serviceName].totalDeductions += salary.totalDeductions;
      return acc;
    }, {} as any);

    res.json({
      success: true,
      data: {
        summary: {
          totalEmployees: salaries.length,
          totalGross,
          totalNet,
          totalDeductions
        },
        byService,
        salaries
      }
    });
  } catch (error) {
    console.error('Erreur lors de la génération du rapport de salaires:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

export const paySalary = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { paymentDate, paymentMethod, reference, notes } = req.body;

    const salary = await prisma.salary.findUnique({
      where: { id: Number(id) },
      include: {
        employee: {
          include: {
            service: true
          }
        }
      }
    });

    if (!salary) {
      return res.status(404).json({
        success: false,
        message: 'Salaire non trouvé'
      });
    }

    if (salary.status === 'PAID') {
      return res.status(400).json({
        success: false,
        message: 'Ce salaire a déjà été payé'
      });
    }

    // Mettre à jour le statut du salaire
    const updatedSalary = await prisma.salary.update({
      where: { id: Number(id) },
      data: {
        status: 'PAID',
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        paymentMethod,
        reference,
        notes: notes ? `${salary.notes || ''}\nPaiement: ${notes}` : salary.notes
      },
      include: {
        employee: {
          include: {
            service: true
          }
        }
      }
    });

    // Créer l'écriture de trésorerie pour le paiement
    await prisma.cashFlow.create({
      data: {
        transactionDate: paymentDate ? new Date(paymentDate) : new Date(),
        type: 'OUTFLOW',
        amount: salary.netSalary,
        description: `Paiement salaire ${salary.employee.firstName} ${salary.employee.lastName}`,
        category: 'Salaires',
        sourceDocumentType: 'SALARY',
        sourceDocumentId: salary.id,
        createdBy: req.user!.userId
      }
    });

    res.json({
      success: true,
      data: updatedSalary,
      message: 'Salaire marqué comme payé'
    });
  } catch (error) {
    console.error('Erreur lors du paiement du salaire:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
};

// Fonction utilitaire pour créer les écritures comptables de salaire
async function createSalaryAccountingEntries(
  salaryId: number,
  grossSalary: number,
  totalDeductions: number,
  netSalary: number,
  userId: number
) {
  const entries = [];

  // Débit charges de personnel
  entries.push({
    entryDate: new Date(),
    accountNumber: '641000', // Charges de personnel
    debit: grossSalary,
    credit: 0,
    description: 'Salaire brut',
    sourceDocumentType: 'SALARY' as SourceDocumentType, // <-- Ajouter le cast
    sourceDocumentId: salaryId,
    createdBy: userId
  });

  // Crédit dettes sociales
  entries.push({
    entryDate: new Date(),
    accountNumber: '431000', // Dettes sociales
    debit: 0,
    credit: totalDeductions,
    description: 'Cotisations sociales',
    sourceDocumentType: 'SALARY' as SourceDocumentType, // <-- Ajouter le cast
    sourceDocumentId: salaryId,
    createdBy: userId
  });

  // Crédit dettes envers le personnel
  entries.push({
    entryDate: new Date(),
    accountNumber: '421000', // Dettes envers le personnel
    debit: 0,
    credit: netSalary,
    description: 'Salaire net à payer',
    sourceDocumentType: 'SALARY' as SourceDocumentType, // <-- Ajouter le cast
    sourceDocumentId: salaryId,
    createdBy: userId
  });

  await prisma.accountingEntry.createMany({
    data: entries
  });

  // Créer l'entrée de trésorerie
  await prisma.cashFlow.create({
    data: {
      transactionDate: new Date(),
      type: 'OUTFLOW',
      amount: netSalary,
      description: 'Paiement salaire',
      category: 'Salaires',
      sourceDocumentType: 'SALARY' as SourceDocumentType, // <-- Ajouter le cast ici aussi
      sourceDocumentId: salaryId,
      createdBy: userId
    }
  });
}

// Validation middleware
export const validateSalary = [
  body('employeeId').isInt().withMessage('ID employé requis'),
  body('paymentDate').isISO8601().withMessage('Date de paiement invalide'),
  body('workingDays').isInt({ min: 1, max: 31 }).withMessage('Nombre de jours travaillés invalide'),
  body('baseSalary').isFloat({ min: 0 }).withMessage('Salaire de base invalide'),
  body('overtime').optional().isFloat({ min: 0 }).withMessage('Heures supplémentaires invalides'),
  body('bonuses').optional().isFloat({ min: 0 }).withMessage('Primes invalides'),
  body('allowances').optional().isFloat({ min: 0 }).withMessage('Indemnités invalides'),
  body('paidLeave').optional().isFloat({ min: 0 }).withMessage('Congés payés invalides'),
  body('cnpsEmployee').optional().isFloat({ min: 0 }).withMessage('CNPS Employé invalide'),
  body('cnamEmployee').optional().isFloat({ min: 0 }).withMessage('CNAM Employé invalide'),
  body('fdfpEmployee').optional().isFloat({ min: 0 }).withMessage('FDFP Employé invalide'),
  body('socialContributions').optional().isFloat({ min: 0 }).withMessage('Cotisations sociales invalides'),
  body('taxes').optional().isFloat({ min: 0 }).withMessage('Impôts invalides'),
  body('nonTaxableAmount').optional().isFloat({ min: 0 }).withMessage('Montant non taxable invalide'),
  body('otherDeductions').optional().isFloat({ min: 0 }).withMessage('Autres déductions invalides'),
  body('loanDeductions').optional().isFloat({ min: 0 }).withMessage('Déductions de prêt invalides')
];