const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const factory = require('../utils/crudFactory');
const asyncHandler = require('express-async-handler');
const { safeAccess } = require('../utils/safe-access');

// Méthodes de base améliorées
exports.getAllEmployes = asyncHandler(async (req, res, next) => {
    const { statut, status, search, page = 1, limit = 10 } = req.query;
    let where = {};
    
    // Supporte les deux noms de paramètres (statut en fr, status de l'url)
    const activeStatus = statut || status;
    if (activeStatus) where.statut = { equals: activeStatus, mode: 'insensitive' };
    
    if (search) {
        where.OR = [
            { nom: { contains: search, mode: 'insensitive' } },
            { prenoms: { contains: search, mode: 'insensitive' } },
            { matricule: { contains: search, mode: 'insensitive' } }
        ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    try {
      const [data, total] = await Promise.all([
        prisma.employe.findMany({ 
            where,
            orderBy: { nom: 'asc' },
            skip,
            take
        }),
        prisma.employe.count({ where })
      ]);

      res.status(200).json({
        data,
        total,
        page: parseInt(page),
        limit: parseInt(limit)
      });
    } catch (e) {
      console.error("Prisma Employe error:", e);
      res.status(500).json({ error: e.message });
    }
});

exports.getEmploye = factory.getOne('employe');

// Vision 360° de l'employé
exports.getEmployeProfile = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const isIdNumeric = !isNaN(Number(id));
    
    const employe = await prisma.employe.findUnique({
        where: { id: isIdNumeric ? Number(id) : id },
        include: {
            contrats: { orderBy: { dateDebut: 'desc' } },
            conges: { orderBy: { dateDebut: 'desc' } },
            bulletins: { orderBy: { dateGeneration: 'desc' }, take: 12 },
            prets: { orderBy: { datePret: 'desc' } },
            absences: { orderBy: { dateAbsence: 'desc' } },
            historiques: { orderBy: { dateEvenement: 'desc' } },
            évaluationsRecues: true
        }
    });

    if (!employe) return res.status(404).json({ error: "Employé introuvable" });
    
    // Protection des données sensibles ou optionnelles
    const responseData = {
        ...employe,
        contrats: safeAccess(employe, 'contrats', []),
        conges: safeAccess(employe, 'conges', []),
        bulletins: safeAccess(employe, 'bulletins', []),
        prets: safeAccess(employe, 'prets', []),
        absences: safeAccess(employe, 'absences', [])
    };

    res.status(200).json(responseData);
});

// Surcharge de createOne...
// [rest of functions]
exports.createEmploye = asyncHandler(async (req, res, next) => {
  const newEmploye = await prisma.employe.create({
    data: req.body,
  });
  res.status(201).json(newEmploye);
});

exports.updateEmploye = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const isIdNumeric = !isNaN(Number(id));
  const updatedEmploye = await prisma.employe.update({
    where: { id: isIdNumeric ? Number(id) : id },
    data: req.body,
  });
  res.status(200).json(updatedEmploye);
});

exports.deleteEmploye = factory.deleteOne('employe');

exports.getEmployeContrats = asyncHandler(async (req, res, next) => {
    const matricule = req.params.matricule;
    const contrats = await prisma.contrat.findMany({
        where: { matricule }
    });
    res.status(200).json(contrats);
});

