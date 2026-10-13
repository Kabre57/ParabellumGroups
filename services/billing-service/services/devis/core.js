// Dépendances, statuts et calculs communs à tous les parcours de devis.
const crypto = require('crypto');
const path = require('path');
const moment = require('moment');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { generateDevisNumber, generateFactureNumber } = require('../../utils/billingNumberGenerator');
const { calculateMontants, calculateTotal } = require('../../utils/tvaCalculator');
const { generateDevisPDF } = require('../../utils/pdfGenerator');
const { uploadToS3, isS3Configured } = require('../../utils/s3');
const {
  applyEnterpriseScope,
  assertEnterpriseInScope,
  resolveEnterpriseContext,
} = require('../../utils/enterpriseScope');

const prisma = new PrismaClient();

const QUOTE_READ_INCLUDE = {
  lignes: true,
  evenements: {
    orderBy: { createdAt: 'desc' },
  },
};

const CLIENT_RESPONSE_STATUS = ['ACCEPTE', 'REFUSE', 'MODIFICATION_DEMANDEE'];
const BILLING_READY_STATUS = ['ACCEPTE', 'TRANSMIS_FACTURATION'];

const normalizeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeText = (value) => {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized || null;
};

const buildBillingLine = (ligne = {}) => {
  const description = String(
    ligne.description ||
      ligne.designation ||
      ligne.nom ||
      ligne.label ||
      ''
  ).trim();
  const imageUrl = normalizeText(ligne.imageUrl || ligne.image || ligne.image_url || null);
  const quantite = normalizeNumber(
    ligne.quantite ?? ligne.quantity ?? ligne.qty ?? 1,
    1
  );
  const prixUnitaire = normalizeNumber(
    ligne.prixUnitaire ?? ligne.unitPrice ?? ligne.unit_price ?? 0
  );
  const tauxTVA = normalizeNumber(
    ligne.tauxTVA ?? ligne.vatRate ?? ligne.vat_rate ?? ligne.tva ?? 0
  );
  const montants = calculateMontants(quantite, prixUnitaire, tauxTVA);

  return {
    description,
    imageUrl,
    quantite,
    prixUnitaire,
    tauxTVA,
    ...montants,
  };
};

const normalizeLines = (lignes) => {
  if (!Array.isArray(lignes)) return [];
  return lignes
    .map(buildBillingLine)
    .filter((ligne) => ligne.description && ligne.quantite > 0);
};

const buildTotals = (lignes) =>
  lignes.length > 0
    ? calculateTotal(lignes)
    : { totalHT: 0, totalTVA: 0, totalTTC: 0 };

const getDefaultDate = (value, daysToAdd = 30) => {
  if (value) return new Date(value);
  const date = new Date();
  date.setDate(date.getDate() + daysToAdd);
  return date;
};

module.exports = { PrismaClient, generateDevisNumber, generateFactureNumber, calculateMontants, calculateTotal, generateDevisPDF, uploadToS3, isS3Configured, applyEnterpriseScope, assertEnterpriseInScope, resolveEnterpriseContext, crypto, path, moment, axios, jwt, prisma, QUOTE_READ_INCLUDE, CLIENT_RESPONSE_STATUS, BILLING_READY_STATUS, normalizeNumber, normalizeText, buildBillingLine, normalizeLines, buildTotals, getDefaultDate };
