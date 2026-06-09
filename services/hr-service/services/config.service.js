const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const DEFAULT_CONFIGURATION = {
  nomEntreprise: 'Parabellum Groups',
  sigle: 'Parabellum',
  adresseSiege: "Abidjan, Cote d'Ivoire",
  idu: 'CI-2019-0046392 R',
  numeroCc: '1234567',
  compteContribuable: '1234567',
  numeroCnps: '1234567',
  numeroCnam: '7654321',
  numeroFdfp: '9876543',
  rccm: '',
  telephone: '',
  email: '',
  tauxCnpsSalarial: 0.063,
  tauxCnpsPatronal: 0.077,
  tauxIs: 0.012,
  tauxCn: null,
  tauxFdfpApprentis: 0.004,
  tauxFdfpContinu: 0.012,
  smig: 75000,
  plafondCnps: 1647315,
  baremesIgr: null,
  isActive: true
};

const nullableString = (value) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const text = String(value).trim();
  return text || null;
};

const nullableNumber = (value) => {
  if (value === undefined || value === null || value === '') return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
};

const toNumber = (value, fallback = undefined) => {
  if (value === undefined || value === null || value === '') return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const mapConfiguration = (config = {}) => {
  const merged = {
    ...DEFAULT_CONFIGURATION,
    ...config
  };

  const compteContribuable = merged.compteContribuable || merged.numeroCc || '';
  const address = merged.adresseSiege || '';

  return {
    id: merged.id,
    nomEntreprise: merged.nomEntreprise || DEFAULT_CONFIGURATION.nomEntreprise,
    sigle: merged.sigle || DEFAULT_CONFIGURATION.sigle,
    adresseSiege: address,
    address,
    idu: merged.idu || '',
    numeroCc: merged.numeroCc || compteContribuable,
    compteContribuable,
    rccm: merged.rccm || '',
    numeroCnps: merged.numeroCnps || '',
    immatriculationCNPS: merged.numeroCnps || '',
    numeroCnam: merged.numeroCnam || '',
    cnamNumber: merged.numeroCnam || '',
    numeroFdfp: merged.numeroFdfp || '',
    fdfpNumber: merged.numeroFdfp || '',
    telephone: merged.telephone || '',
    email: merged.email || '',
    tauxCnpsSalarial: toNumber(merged.tauxCnpsSalarial, DEFAULT_CONFIGURATION.tauxCnpsSalarial),
    tauxCnpsPatronal: toNumber(merged.tauxCnpsPatronal, DEFAULT_CONFIGURATION.tauxCnpsPatronal),
    tauxIs: toNumber(merged.tauxIs, DEFAULT_CONFIGURATION.tauxIs),
    tauxCn: toNumber(merged.tauxCn, DEFAULT_CONFIGURATION.tauxCn),
    tauxFdfpApprentis: toNumber(merged.tauxFdfpApprentis, DEFAULT_CONFIGURATION.tauxFdfpApprentis),
    tauxFdfpContinu: toNumber(merged.tauxFdfpContinu, DEFAULT_CONFIGURATION.tauxFdfpContinu),
    smig: toNumber(merged.smig, DEFAULT_CONFIGURATION.smig),
    plafondCnps: toNumber(merged.plafondCnps, DEFAULT_CONFIGURATION.plafondCnps),
    baremesIgr: merged.baremesIgr || null,
    dateMiseAJour: merged.dateMiseAJour || null,
    isActive: merged.isActive !== false
  };
};

const buildConfigurationData = (body = {}) => {
  const data = {
    nomEntreprise: nullableString(body.nomEntreprise ?? body.companyName ?? body.name),
    sigle: nullableString(body.sigle ?? body.acronym),
    numeroCc: nullableString(body.numeroCc ?? body.compteContribuable ?? body.taxAccount),
    compteContribuable: nullableString(body.compteContribuable ?? body.numeroCc ?? body.taxAccount),
    idu: nullableString(body.idu ?? body.taxId),
    rccm: nullableString(body.rccm),
    numeroCnps: nullableString(body.numeroCnps ?? body.immatriculationCNPS ?? body.cnpsNumber),
    numeroCnam: nullableString(body.numeroCnam ?? body.cnamNumber),
    numeroFdfp: nullableString(body.numeroFdfp ?? body.fdfpNumber),
    adresseSiege: nullableString(body.adresseSiege ?? body.address),
    telephone: nullableString(body.telephone ?? body.phone),
    email: nullableString(body.email),
    tauxCnpsSalarial: nullableNumber(body.tauxCnpsSalarial),
    tauxCnpsPatronal: nullableNumber(body.tauxCnpsPatronal),
    tauxIs: nullableNumber(body.tauxIs),
    tauxCn: nullableNumber(body.tauxCn),
    tauxFdfpApprentis: nullableNumber(body.tauxFdfpApprentis),
    tauxFdfpContinu: nullableNumber(body.tauxFdfpContinu),
    smig: nullableNumber(body.smig),
    plafondCnps: nullableNumber(body.plafondCnps),
    baremesIgr: body.baremesIgr,
    isActive: body.isActive
  };

  Object.keys(data).forEach((key) => data[key] === undefined && delete data[key]);
  return data;
};

const getActiveConfigurationRecord = async (client = prisma) => {
  return client.configuration.findFirst({
    where: { isActive: true },
    orderBy: { dateMiseAJour: 'desc' }
  });
};

const getActiveConfiguration = async (client = prisma) => {
  const config = await getActiveConfigurationRecord(client);
  return mapConfiguration(config || {});
};

module.exports = {
  DEFAULT_CONFIGURATION,
  buildConfigurationData,
  getActiveConfiguration,
  getActiveConfigurationRecord,
  mapConfiguration
};
