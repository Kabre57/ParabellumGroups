import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Application } from 'express';
import { logger } from './logger';

// Configuration Swagger
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Parabellum Groups API',
      version: '1.0.0',
      description: 'API complète pour la gestion d\'entreprise Parabellum Groups',
      contact: {
        name: 'Équipe Développement',
        email: 'theogeoffroy5@gmail.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: process.env.API_BASE_URL || 'http://localhost:3001/api/v1',
        description: 'Serveur de développement'
      },
      {
        url: 'https://api.parabellum.com/v1',
        description: 'Serveur de production'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token JWT pour l\'authentification'
        }
      },
      schemas: {
        // Schémas de base
        ApiResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Indique si la requête a réussi'
            },
            data: {
              type: 'object',
              description: 'Données de la réponse'
            },
            message: {
              type: 'string',
              description: 'Message descriptif'
            },
            errors: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Liste des erreurs'
            }
          }
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {}
            },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'integer' },
                limit: { type: 'integer' },
                total: { type: 'integer' },
                totalPages: { type: 'integer' }
              }
            }
          }
        },
        
        // Schémas des entités principales
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            email: { type: 'string', format: 'email' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            role: {
              type: 'string',
              enum: ['ADMIN', 'GENERAL_DIRECTOR', 'SERVICE_MANAGER', 'EMPLOYEE', 'ACCOUNTANT', 'PURCHASING_MANAGER']
            },
            serviceId: { type: 'integer', nullable: true },
            isActive: { type: 'boolean' },
            lastLogin: { type: 'string', format: 'date-time', nullable: true },
            avatarUrl: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        
        Service: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            description: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },

        Customer: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            customerNumber: { type: 'string' },
            type: {
              type: 'string',
              enum: ['INDIVIDUAL', 'COMPANY']
            },
            name: { type: 'string' },
            legalName: { type: 'string', nullable: true },
            idu: { type: 'string', nullable: true },
            vatNumber: { type: 'string', nullable: true },
            email: { type: 'string', format: 'email', nullable: true },
            phone: { type: 'string', nullable: true },
            mobile: { type: 'string', nullable: true },
            website: { type: 'string', nullable: true },
            paymentTerms: { type: 'integer' },
            paymentMethod: {
              type: 'string',
              enum: ['TRANSFER', 'CHECK', 'CARD', 'CASH', 'OTHER']
            },
            creditLimit: { type: 'number' },
            discountRate: { type: 'number' },
            category: { type: 'string', nullable: true },
            tags: { type: 'string', nullable: true },
            notes: { type: 'string', nullable: true },
            isActive: { type: 'boolean' },
            serviceId: { type: 'integer', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },

        CustomerAddress: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            customerId: { type: 'integer' },
            type: {
              type: 'string',
              enum: ['BILLING', 'SHIPPING', 'OTHER']
            },
            name: { type: 'string', nullable: true },
            addressLine1: { type: 'string' },
            addressLine2: { type: 'string', nullable: true },
            postalCode: { type: 'string' },
            city: { type: 'string' },
            country: { type: 'string' },
            isDefault: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },

        Product: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            sku: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string', nullable: true },
            type: {
              type: 'string',
              enum: ['PRODUCT', 'SERVICE', 'SUBSCRIPTION']
            },
            category: { type: 'string', nullable: true },
            unit: { type: 'string' },
            priceHt: { type: 'number' },
            vatRate: { type: 'number' },
            costPrice: { type: 'number', nullable: true },
            stockQuantity: { type: 'integer' },
            stockAlertThreshold: { type: 'integer' },
            isActive: { type: 'boolean' },
            weight: { type: 'number', nullable: true },
            dimensions: { type: 'string', nullable: true },
            imageUrl: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },

        Quote: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            quoteNumber: { type: 'string' },
            customerId: { type: 'integer' },
            customerAddressId: { type: 'integer', nullable: true },
            status: {
              type: 'string',
              enum: [
                'DRAFT',
                'SUBMITTED_FOR_SERVICE_APPROVAL',
                'APPROVED_BY_SERVICE_MANAGER',
                'REJECTED_BY_SERVICE_MANAGER',
                'SUBMITTED_FOR_DG_APPROVAL',
                'APPROVED_BY_DG',
                'REJECTED_BY_DG',
                'ACCEPTED_BY_CLIENT',
                'REJECTED_BY_CLIENT',
                'EXPIRED'
              ]
            },
            quoteDate: { type: 'string', format: 'date-time' },
            validUntil: { type: 'string', format: 'date-time' },
            subtotalHt: { type: 'number' },
            discountAmount: { type: 'number' },
            totalVat: { type: 'number' },
            totalTtc: { type: 'number' },
            terms: { type: 'string', nullable: true },
            notes: { type: 'string', nullable: true },
            quoteType: {
              type: 'string',
              enum: ['DQE', 'REAL']
            },
            dqeReference: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },

        Invoice: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            invoiceNumber: { type: 'string' },
            customerId: { type: 'integer' },
            customerAddressId: { type: 'integer', nullable: true },
            quoteId: { type: 'integer', nullable: true },
            type: {
              type: 'string',
              enum: ['INVOICE', 'CREDIT_NOTE', 'PROFORMA']
            },
            status: {
              type: 'string',
              enum: ['DRAFT', 'SENT', 'PAID', 'PARTIAL', 'OVERDUE', 'CANCELLED']
            },
            invoiceDate: { type: 'string', format: 'date-time' },
            dueDate: { type: 'string', format: 'date-time' },
            subtotalHt: { type: 'number' },
            discountAmount: { type: 'number' },
            totalVat: { type: 'number' },
            totalTtc: { type: 'number' },
            paidAmount: { type: 'number' },
            balanceDue: { type: 'number' },
            paymentTerms: { type: 'integer' },
            lateFeeRate: { type: 'number' },
            terms: { type: 'string', nullable: true },
            notes: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },

        Payment: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            paymentNumber: { type: 'string' },
            customerId: { type: 'integer' },
            amount: { type: 'number' },
            paymentDate: { type: 'string', format: 'date-time' },
            paymentMethod: {
              type: 'string',
              enum: ['TRANSFER', 'CHECK', 'CARD', 'CASH', 'OTHER']
            },
            reference: { type: 'string', nullable: true },
            notes: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },

        Employee: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            employeeNumber: { type: 'string' },
            registrationNumber: { type: 'string', nullable: true },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            email: { type: 'string', format: 'email', nullable: true },
            phone: { type: 'string', nullable: true },
            position: { type: 'string' },
            department: { type: 'string', nullable: true },
            hireDate: { type: 'string', format: 'date-time' },
            isActive: { type: 'boolean' },
            serviceId: { type: 'integer', nullable: true },
            userId: { type: 'integer', nullable: true }
          }
        },

        Contract: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            employeeId: { type: 'integer' },
            contractType: {
              type: 'string',
              enum: ['CDI', 'CDD', 'STAGE', 'FREELANCE']
            },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time', nullable: true },
            baseSalary: { type: 'number' },
            workingHours: { type: 'number' },
            benefits: { type: 'string', nullable: true },
            terms: { type: 'string', nullable: true },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },

        Salary: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            employeeId: { type: 'integer' },
            paymentDate: { type: 'string', format: 'date-time' },
            baseSalary: { type: 'number' },
            grossSalary: { type: 'number' },
            netSalary: { type: 'number' },
            status: {
              type: 'string',
              enum: ['PENDING', 'PAID']
            },
            paymentMethod: {
              type: 'string',
              enum: ['TRANSFER', 'CHECK', 'CARD', 'CASH', 'OTHER']
            },
            reference: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },

        LeaveRequest: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            employeeId: { type: 'integer' },
            leaveType: {
              type: 'string',
              enum: ['ANNUAL', 'SICK', 'PERSONAL', 'MATERNITY', 'PATERNITY', 'OTHER']
            },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
            days: { type: 'integer' },
            reason: { type: 'string' },
            status: {
              type: 'string',
              enum: ['PENDING', 'APPROVED', 'REJECTED']
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },

        Expense: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            employeeId: { type: 'integer' },
            date: { type: 'string', format: 'date-time' },
            category: { type: 'string' },
            description: { type: 'string', nullable: true },
            amount: { type: 'number' },
            currency: { type: 'string' },
            status: {
              type: 'string',
              enum: ['PENDING', 'PAID', 'REIMBURSED']
            },
            receiptUrl: { type: 'string', nullable: true },
            notes: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },

        // Schémas pour le module technique
        Specialite: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            libelle: { type: 'string' },
            description: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },

        Technicien: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            nom: { type: 'string' },
            prenom: { type: 'string' },
            contact: { type: 'string' },
            specialiteId: { type: 'integer' },
            utilisateurId: { type: 'integer', nullable: true },
            isActive: { type: 'boolean' },
            status: {
              type: 'string',
              enum: ['AVAILABLE', 'ON_MISSION', 'ON_LEAVE', 'SICK', 'TRAINING']
            },
            currentMissionId: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },

        Mission: {
          type: 'object',
          properties: {
            numIntervention: { type: 'string' },
            natureIntervention: { type: 'string' },
            objectifDuContrat: { type: 'string' },
            description: { type: 'string', nullable: true },
            priorite: { type: 'string' },
            statut: { type: 'string' },
            dateSortieFicheIntervention: { type: 'string', format: 'date-time' },
            clientId: { type: 'integer' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },

        Intervention: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            dateHeureDebut: { type: 'string', format: 'date-time' },
            dateHeureFin: { type: 'string', format: 'date-time', nullable: true },
            duree: { type: 'integer', nullable: true },
            missionId: { type: 'string' },
            statut: { type: 'string' },
            commentaire: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },

        Materiel: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            reference: { type: 'string' },
            designation: { type: 'string' },
            description: { type: 'string', nullable: true },
            quantiteTotale: { type: 'integer' },
            quantiteDisponible: { type: 'integer' },
            seuilAlerte: { type: 'integer' },
            emplacement: { type: 'string', nullable: true },
            categorie: { type: 'string' },
            prixUnitaire: { type: 'number', nullable: true },
            fournisseur: { type: 'string', nullable: true },
            dateAchat: { type: 'string', format: 'date-time', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },

        // Schémas pour les projets clients
        ClientProject: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            description: { type: 'string', nullable: true },
            customerId: { type: 'integer' },
            serviceId: { type: 'integer' },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time', nullable: true },
            budget: { type: 'number', nullable: true },
            status: {
              type: 'string',
              enum: ['PLANNED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED']
            },
            priority: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },

        // Schémas pour les achats
        PurchaseOrder: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            orderNumber: { type: 'string' },
            supplierId: { type: 'integer' },
            status: {
              type: 'string',
              enum: ['PENDING', 'APPROVED', 'REJECTED', 'PARTIALLY_RECEIVED', 'COMPLETED', 'CANCELLED']
            },
            orderDate: { type: 'string', format: 'date-time' },
            expectedDate: { type: 'string', format: 'date-time', nullable: true },
            subtotalHt: { type: 'number' },
            totalVat: { type: 'number' },
            totalTtc: { type: 'number' },
            notes: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },

        // Schémas pour les évaluations
        PerformanceReview: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            employeeId: { type: 'integer' },
            reviewerId: { type: 'integer' },
            reviewDate: { type: 'string', format: 'date-time' },
            type: {
              type: 'string',
              enum: ['ANNUAL', 'PROBATION', 'PROMOTION', 'PROJECT']
            },
            status: {
              type: 'string',
              enum: ['DRAFT', 'PENDING_REVIEW', 'COMPLETED', 'ACKNOWLEDGED']
            },
            overallScore: { type: 'number', nullable: true },
            strengths: { type: 'string', nullable: true },
            areasToImprove: { type: 'string', nullable: true },
            goals: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },

        // Schémas pour le calendrier
        CalendarEvent: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            title: { type: 'string' },
            description: { type: 'string', nullable: true },
            startTime: { type: 'string', format: 'date-time' },
            endTime: { type: 'string', format: 'date-time' },
            type: {
              type: 'string',
              enum: ['MEETING', 'TASK', 'APPOINTMENT', 'REMINDER', 'OTHER']
            },
            priority: { type: 'string' },
            isAllDay: { type: 'boolean' },
            location: { type: 'string', nullable: true },
            reminder: { type: 'string', format: 'date-time', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },

        // Schémas pour les prêts
        Loan: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            loanNumber: { type: 'string' },
            employeeId: { type: 'integer' },
            amount: { type: 'number' },
            interestRate: { type: 'number' },
            monthlyPayment: { type: 'number' },
            remainingAmount: { type: 'number' },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
            purpose: { type: 'string', nullable: true },
            status: {
              type: 'string',
              enum: ['ACTIVE', 'COMPLETED', 'CANCELLED']
            },
            notes: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },

        // Schémas pour les prospects
        Prospect: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            companyName: { type: 'string' },
            contactName: { type: 'string' },
            email: { type: 'string', format: 'email', nullable: true },
            phone: { type: 'string', nullable: true },
            stage: { type: 'string' },
            priority: { type: 'string' },
            estimatedValue: { type: 'number', nullable: true },
            lastContact: { type: 'string', format: 'date-time' },
            nextActionDate: { type: 'string', format: 'date-time', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ],
    tags: [
      { name: 'auth', description: 'Authentification' },
      { name: 'users', description: 'Gestion des Utilisateurs' },
      { name: 'services', description: 'Gestion des Services' },
      { name: 'customers', description: 'Gestion des Clients' },
      { name: 'products', description: 'Gestion des Produits' },
      { name: 'quotes', description: 'Gestion des Devis' },
      { name: 'invoices', description: 'Gestion des Factures' },
      { name: 'payments', description: 'Gestion des Paiements' },
      { name: 'employees', description: 'Gestion des Employés' },
      { name: 'contracts', description: 'Gestion des Contrats' },
      { name: 'salaries', description: 'Gestion des Salaires' },
      { name: 'leaves', description: 'Gestion des Congés' },
      { name: 'expenses', description: 'Gestion des Dépenses' },
      { name: 'loans', description: 'Gestion des Prêts' },
      { name: 'prospects', description: 'Gestion des Prospects' },
      { name: 'specialites', description: 'Gestion des Spécialités' },
      { name: 'techniciens', description: 'Gestion des Techniciens' },
      { name: 'missions', description: 'Gestion des Missions' },
      { name: 'interventions', description: 'Gestion des Interventions' },
      { name: 'materiels', description: 'Gestion du Matériel' },
      { name: 'rapports', description: 'Gestion des Rapports' },
      { name: 'projects', description: 'Gestion des Projets Clients' },
      { name: 'purchases', description: 'Gestion des Achats' },
      { name: 'performance', description: 'Évaluations de Performance' },
      { name: 'calendar', description: 'Gestion du Calendrier' },
      { name: 'permissions', description: 'Gestion des Permissions' },
      { name: 'notifications', description: 'Gestion des Notifications' },
      { name: 'messages', description: 'Messagerie Interne' },
      { name: 'reports', description: 'Rapports et Analyses' },
      { name: 'admin', description: 'Administration' },
      { name: 'logs', description: 'Journalisation et Logs' }
    ]
  },
  apis: [
    './src/routes/*.ts',
    './src/controllers/*.ts',
    './src/models/*.ts'
  ]
};

// Générer la spécification Swagger
const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Configuration de l'interface Swagger UI
const swaggerUiOptions = {
  customCss: `
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info .title { color: #1f2937; }
    .swagger-ui .scheme-container { background: #f9fafb; padding: 20px; border-radius: 8px; }
    .swagger-ui .tag { background: #3b82f6; color: white; }
  `,
  customSiteTitle: 'Parabellum Groups API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    tryItOutEnabled: true,
    tagsSorter: 'alpha',
    operationsSorter: 'alpha'
  }
};

// Fonction pour configurer Swagger
export const setupSwagger = (app: Application): void => {
  try {
    // Route pour la spécification JSON
    app.get('/api-docs.json', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(swaggerSpec);
    });

    // Interface Swagger UI
    app.use('/api-docs', swaggerUi.serve);
    app.get('/api-docs', swaggerUi.setup(swaggerSpec, swaggerUiOptions));

    // Route de redirection pour faciliter l'accès
    app.get('/docs', (req, res) => {
      res.redirect('/api-docs');
    });

    logger.info('📚 Documentation Swagger configurée sur /api-docs');
  } catch (error) {
    logger.error('❌ Erreur lors de la configuration de Swagger:', error);
  }
};

// Fonction pour ajouter des annotations Swagger aux routes
export const swaggerTags = {
  auth: 'Authentification',
  users: 'Gestion des Utilisateurs',
  services: 'Gestion des Services',
  customers: 'Gestion des Clients',
  products: 'Gestion des Produits',
  quotes: 'Gestion des Devis',
  invoices: 'Gestion des Factures',
  payments: 'Gestion des Paiements',
  employees: 'Gestion des Employés',
  contracts: 'Gestion des Contrats',
  salaries: 'Gestion des Salaires',
  leaves: 'Gestion des Congés',
  expenses: 'Gestion des Dépenses',
  loans: 'Gestion des Prêts',
  prospects: 'Gestion des Prospects',
  specialites: 'Gestion des Spécialités',
  techniciens: 'Gestion des Techniciens',
  missions: 'Gestion des Missions',
  interventions: 'Gestion des Interventions',
  materiels: 'Gestion du Matériel',
  rapports: 'Gestion des Rapports',
  projects: 'Gestion des Projets Clients',
  purchases: 'Gestion des Achats',
  performance: 'Évaluations de Performance',
  calendar: 'Gestion du Calendrier',
  permissions: 'Gestion des Permissions',
  notifications: 'Gestion des Notifications',
  messages: 'Messagerie Interne',
  reports: 'Rapports et Analyses',
  admin: 'Administration',
  logs: 'Journalisation et Logs'
};

export default swaggerSpec;