const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const factory = require('../utils/crudFactory');
const asyncHandler = require('express-async-handler');
const { safeAccess } = require('../utils/safe-access');

const MATRICULE_PREFIX = process.env.HR_MATRICULE_PREFIX || 'PBL';

const pickText = (...values) => {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    const normalized = String(value).trim();
    if (normalized) return normalized;
  }
  return undefined;
};

const parseDate = (value) => {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const parseNumber = (...values) => {
  for (const value of values) {
    if (value === undefined || value === null || value === '') continue;
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return undefined;
};

const normalizeActiveStatus = (value, fallback = 'Actif') => {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value ? 'Actif' : 'Inactif';

  const normalized = String(value).trim().toLowerCase();
  if (['false', '0', 'inactif', 'inactive', 'inactifs', 'suspendu', 'conge', 'congé'].includes(normalized)) {
    return 'Inactif';
  }

  return 'Actif';
};

const activeStringFilter = () => ({
  equals: 'Actif',
  mode: 'insensitive'
});

const employeeInclude = {
  contrats: {
    orderBy: { dateDebut: 'desc' },
    take: 1
  }
};

const findEmployeeByIdOrMatricule = (id, client = prisma, options = {}) => {
  const identifier = String(id || '').trim();
  if (!identifier) return null;

  return client.employe.findFirst({
    where: {
      OR: [
        { id: identifier },
        { matricule: identifier }
      ]
    },
    ...options
  });
};

const generateMatricule = async (client = prisma) => {
  const existingCount = await client.employe.count({
    where: { matricule: { startsWith: MATRICULE_PREFIX } }
  });

  let nextNumber = existingCount + 1;
  while (nextNumber < 1000000) {
    const candidate = `${MATRICULE_PREFIX}${String(nextNumber).padStart(4, '0')}`;
    const existing = await client.employe.findUnique({ where: { matricule: candidate } });
    if (!existing) return candidate;
    nextNumber += 1;
  }

  return `${MATRICULE_PREFIX}${Date.now()}`;
};

const buildEmployeeData = async (body = {}, client = prisma, { isCreate = false } = {}) => {
  const nom = pickText(body.nom, body.lastName, body.lastname);
  const prenoms = pickText(body.prenoms, body.prenom, body.firstName, body.firstname);
  const matricule = pickText(body.matricule, body.employeeNumber, body.employeeId);

  const data = {
    matricule: isCreate ? (matricule || await generateMatricule(client)) : undefined,
    civilite: pickText(body.civilite, body.title),
    nom,
    prenoms,
    nomComplet: pickText(body.nomComplet, body.fullName, [prenoms, nom].filter(Boolean).join(' ')),
    sexe: pickText(body.sexe, body.gender),
    dateNaissance: parseDate(body.dateNaissance || body.dateOfBirth),
    lieuNaissance: pickText(body.lieuNaissance, body.birthPlace),
    nationalite: pickText(body.nationalite, body.nationality),
    codeNationalite: pickText(body.codeNationalite, body.nationalityCode),
    situationMatrimoniale: pickText(body.situationMatrimoniale, body.maritalStatus),
    nombreEnfants: parseNumber(body.nombreEnfants, body.childrenCount),
    nombrePartsIgr: parseNumber(body.nombrePartsIgr, body.igrShares),
    adressePersonnelle: pickText(body.adressePersonnelle, body.adresse, body.address),
    telephonePersonnel: pickText(body.telephonePersonnel, body.telephone, body.phoneNumber),
    emailPersonnel: pickText(body.emailPersonnel, body.email),
    lieuHabitation: pickText(body.lieuHabitation, body.residence),
    naturePieceIdentite: pickText(body.naturePieceIdentite, body.identityDocumentType),
    numeroPieceIdentite: pickText(body.numeroPieceIdentite, body.identityDocumentNumber),
    numeroCnps: pickText(body.numeroCnps, body.cnpsNumber),
    nonSoumisCnps: body.nonSoumisCnps,
    modePaiement: pickText(body.modePaiement, body.paymentMode),
    rib: pickText(body.rib, body.bankAccount),
    banque: pickText(body.banque, body.bank),
    statut: normalizeActiveStatus(body.statut ?? body.status ?? body.isActive, isCreate ? 'Actif' : undefined)
  };

  Object.keys(data).forEach((key) => data[key] === undefined && delete data[key]);
  return data;
};

const buildContractData = (body = {}, matricule) => {
  const salaireBaseMensuel = parseNumber(
    body.salaireBaseMensuel ??
    body.salaireBase ??
    body.salaire ??
    body.salary ??
    body.baseSalary
  );
  const dateDebut = parseDate(body.dateDebut || body.dateEmbauche || body.hireDate || body.startDate);
  const posteOccupe = pickText(body.posteOccupe, body.poste, body.position);
  const service = pickText(body.service, body.departement, body.department);
  const direction = pickText(body.direction);
  const rawTypeContrat = pickText(body.typeContrat, body.contractType, body.employmentStatus);

  if (!salaireBaseMensuel && !dateDebut && !posteOccupe && !service && !direction && !rawTypeContrat) {
    return null;
  }

  const data = {
    matricule,
    typeContrat: rawTypeContrat || 'CDI',
    dateDebut,
    posteOccupe,
    direction,
    service,
    salaireBaseMensuel,
    statutContrat: normalizeActiveStatus(body.statutContrat ?? body.contractStatus ?? body.isActive, 'Actif')
  };

  Object.keys(data).forEach((key) => data[key] === undefined && delete data[key]);
  return data;
};

// Méthodes de base améliorées
exports.getAllEmployes = asyncHandler(async (req, res, next) => {
    const {
      statut,
      status,
      search,
      departement,
      department,
      employmentStatus,
      typeContrat,
      page = 1,
      pageSize,
      limit = 10
    } = req.query;
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

    const contractFilters = {};
    const departmentFilter = departement || department;
    if (departmentFilter) {
      contractFilters.OR = [
        { service: { equals: String(departmentFilter), mode: 'insensitive' } },
        { direction: { equals: String(departmentFilter), mode: 'insensitive' } }
      ];
    }
    if (employmentStatus || typeContrat) {
      contractFilters.typeContrat = { equals: String(employmentStatus || typeContrat), mode: 'insensitive' };
    }
    if (Object.keys(contractFilters).length > 0) {
      where.contrats = { some: contractFilters };
    }

    const take = parseInt(pageSize || limit, 10) || 10;
    const skip = (parseInt(page, 10) - 1) * take;

    try {
      const [data, total] = await Promise.all([
        prisma.employe.findMany({ 
            where,
            include: employeeInclude,
            orderBy: { nom: 'asc' },
            skip,
            take
        }),
        prisma.employe.count({ where })
      ]);

      res.status(200).json({
        data,
        total,
        page: parseInt(page, 10),
        limit: take,
        pageSize: take,
        totalPages: Math.max(1, Math.ceil(total / Math.max(1, take)))
      });
    } catch (e) {
      console.error("Prisma Employe error:", e);
      res.status(500).json({ error: e.message });
    }
});

exports.getEmploye = asyncHandler(async (req, res) => {
  const employe = await findEmployeeByIdOrMatricule(req.params.id, prisma, {
    include: {
      contrats: { orderBy: { dateDebut: 'desc' } }
    }
  });

  if (!employe) return res.status(404).json({ error: 'Employé introuvable' });
  res.status(200).json(employe);
});

// Vision 360° de l'employé
exports.getEmployeProfile = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    
    const employe = await findEmployeeByIdOrMatricule(id, prisma, {
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
  const employe = await prisma.$transaction(async (tx) => {
    const employeeData = await buildEmployeeData(req.body, tx, { isCreate: true });
    const newEmploye = await tx.employe.create({
      data: employeeData,
    });

    const contractData = buildContractData(req.body, newEmploye.matricule);
    if (contractData) {
      await tx.contrat.create({ data: contractData });
    }

    return tx.employe.findUnique({
      where: { id: newEmploye.id },
      include: {
        contrats: { orderBy: { dateDebut: 'desc' } }
      }
    });
  });

  res.status(201).json(employe);
});

exports.updateEmploye = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const updatedEmploye = await prisma.$transaction(async (tx) => {
    const existing = await findEmployeeByIdOrMatricule(id, tx);
    if (!existing) return null;

    const employeeData = await buildEmployeeData(req.body, tx, { isCreate: false });
    delete employeeData.matricule;

    const employe = await tx.employe.update({
      where: { id: existing.id },
      data: employeeData,
    });

    const contractData = buildContractData(req.body, employe.matricule);
    if (contractData) {
      const activeContract = await tx.contrat.findFirst({
        where: {
          matricule: employe.matricule,
          statutContrat: activeStringFilter()
        },
        orderBy: { dateDebut: 'desc' }
      });

      if (activeContract) {
        delete contractData.matricule;
        await tx.contrat.update({
          where: { id: activeContract.id },
          data: contractData
        });
      } else {
        await tx.contrat.create({ data: contractData });
      }
    }

    return tx.employe.findUnique({
      where: { id: employe.id },
      include: {
        contrats: { orderBy: { dateDebut: 'desc' } }
      }
    });
  });

  if (!updatedEmploye) return res.status(404).json({ error: 'Employé introuvable' });
  res.status(200).json(updatedEmploye);
});

exports.deleteEmploye = asyncHandler(async (req, res) => {
  const employe = await findEmployeeByIdOrMatricule(req.params.id);
  if (!employe) return res.status(404).json({ error: 'Employé introuvable' });

  await prisma.employe.delete({ where: { id: employe.id } });
  res.status(204).send();
});

exports.getEmployeContrats = asyncHandler(async (req, res, next) => {
    const matricule = req.params.matricule;
    const contrats = await prisma.contrat.findMany({
        where: { matricule }
    });
    res.status(200).json(contrats);
});
