'use strict';

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Génère une référence unique pour un ticket : TKT-YYYY-NNNN
 */
async function generateTicketReference() {
  const year = new Date().getFullYear();
  const count = await prisma.ticketCRM.count({
    where: { createdAt: { gte: new Date(`${year}-01-01`) } },
  });
  return `TKT-${year}-${String(count + 1).padStart(4, '0')}`;
}

/**
 * GET /api/crm/tickets
 * Liste les tickets avec filtres
 */
const getTickets = async (req, res) => {
  try {
    const {
      clientId, statut, priorite, categorie, assigneA,
      page = 1, limit = 50, search,
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const where = {
      ...(clientId ? { clientId } : {}),
      ...(statut ? { statut } : {}),
      ...(priorite ? { priorite } : {}),
      ...(categorie ? { categorie } : {}),
      ...(assigneA ? { assigneA } : {}),
      ...(search ? {
        OR: [
          { sujet: { contains: search, mode: 'insensitive' } },
          { reference: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      } : {}),
    };

    const [tickets, total] = await Promise.all([
      prisma.ticketCRM.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: [{ priorite: 'asc' }, { createdAt: 'desc' }],
        include: {
          client: { select: { id: true, nom: true, email: true, reference: true } },
          contact: { select: { id: true, nom: true, prenom: true, email: true } },
          _count: { select: { historiqueTicket: true } },
        },
      }),
      prisma.ticketCRM.count({ where }),
    ]);

    res.json({
      success: true,
      data: tickets,
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    console.error('[CRM] Erreur getTickets:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des tickets' });
  }
};

/**
 * POST /api/crm/tickets
 * Crée un nouveau ticket
 */
const createTicket = async (req, res) => {
  try {
    const {
      clientId, contactId, sujet, description,
      categorie, canal, priorite, assigneA, serviceId,
      slaDeadline, tags, metadata,
    } = req.body;

    if (!clientId || !sujet || !description) {
      return res.status(400).json({ error: 'clientId, sujet et description sont requis' });
    }

    const reference = await generateTicketReference();

    const ticket = await prisma.ticketCRM.create({
      data: {
        reference,
        clientId,
        contactId,
        sujet,
        description,
        categorie: categorie || 'DEMANDE',
        canal: canal || 'EMAIL_CANAL',
        statut: 'NOUVEAU',
        priorite: priorite || 'NORMALE',
        assigneA,
        serviceId,
        slaDeadline: slaDeadline ? new Date(slaDeadline) : null,
        tags: tags || [],
        metadata: metadata || {},
        createdById: req.user?.id || 'system',
      },
      include: {
        client: { select: { id: true, nom: true, email: true } },
      },
    });

    // Créer l'événement initial dans l'historique
    await prisma.ticketHistorique.create({
      data: {
        ticketId: ticket.id,
        typeEvenement: 'CREATION',
        nouvelleValeur: 'NOUVEAU',
        commentaire: `Ticket créé via ${canal || 'EMAIL_CANAL'}`,
        isPublic: false,
        auteurId: req.user?.id || 'system',
      },
    });

    res.status(201).json({ success: true, data: ticket });
  } catch (error) {
    console.error('[CRM] Erreur createTicket:', error);
    res.status(500).json({ error: 'Erreur lors de la création du ticket' });
  }
};

/**
 * GET /api/crm/tickets/:id
 * Récupère un ticket avec son historique complet
 */
const getTicketById = async (req, res) => {
  try {
    const { id } = req.params;
    const ticket = await prisma.ticketCRM.findUnique({
      where: { id },
      include: {
        client: { select: { id: true, nom: true, email: true, telephone: true, reference: true } },
        contact: { select: { id: true, nom: true, prenom: true, email: true } },
        historiqueTicket: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!ticket) return res.status(404).json({ error: 'Ticket non trouvé' });
    res.json({ success: true, data: ticket });
  } catch (error) {
    console.error('[CRM] Erreur getTicketById:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du ticket' });
  }
};

/**
 * PATCH /api/crm/tickets/:id/statut
 * Change le statut d'un ticket (workflow)
 */
const updateTicketStatut = async (req, res) => {
  try {
    const { id } = req.params;
    const { statut, commentaire, isPublic = false } = req.body;

    const TRANSITIONS_VALIDES = {
      NOUVEAU: ['EN_COURS', 'FERME'],
      EN_COURS: ['EN_ATTENTE', 'RESOLU', 'FERME'],
      EN_ATTENTE: ['EN_COURS', 'RESOLU', 'FERME'],
      RESOLU: ['FERME', 'EN_COURS'],
      FERME: [],
    };

    const ticket = await prisma.ticketCRM.findUnique({ where: { id } });
    if (!ticket) return res.status(404).json({ error: 'Ticket non trouvé' });

    const transitionsAutorisees = TRANSITIONS_VALIDES[ticket.statut] || [];
    if (!transitionsAutorisees.includes(statut)) {
      return res.status(400).json({
        error: `Transition non autorisée : ${ticket.statut} → ${statut}`,
        transitionsAutorisees,
      });
    }

    const updateData = {
      statut,
      updatedAt: new Date(),
      ...(statut === 'EN_COURS' && !ticket.premierTraitementLe ? { premierTraitementLe: new Date() } : {}),
      ...(statut === 'RESOLU' ? { resolvedAt: new Date() } : {}),
      ...(statut === 'FERME' ? { closedAt: new Date() } : {}),
    };

    const [updatedTicket] = await prisma.$transaction([
      prisma.ticketCRM.update({ where: { id }, data: updateData }),
      prisma.ticketHistorique.create({
        data: {
          ticketId: id,
          typeEvenement: 'STATUT',
          ancienneValeur: ticket.statut,
          nouvelleValeur: statut,
          commentaire,
          isPublic,
          auteurId: req.user?.id || 'system',
        },
      }),
    ]);

    res.json({ success: true, data: updatedTicket });
  } catch (error) {
    console.error('[CRM] Erreur updateTicketStatut:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du statut' });
  }
};

/**
 * POST /api/crm/tickets/:id/commentaire
 * Ajoute un commentaire à un ticket
 */
const addCommentaire = async (req, res) => {
  try {
    const { id } = req.params;
    const { commentaire, isPublic = false } = req.body;

    if (!commentaire) return res.status(400).json({ error: 'Le commentaire est requis' });

    const historique = await prisma.ticketHistorique.create({
      data: {
        ticketId: id,
        typeEvenement: 'COMMENTAIRE',
        commentaire,
        isPublic,
        auteurId: req.user?.id || 'system',
      },
    });

    res.status(201).json({ success: true, data: historique });
  } catch (error) {
    console.error('[CRM] Erreur addCommentaire:', error);
    res.status(500).json({ error: 'Erreur lors de l\'ajout du commentaire' });
  }
};

/**
 * PATCH /api/crm/tickets/:id/assigner
 * Assigne un ticket à un utilisateur
 */
const assignerTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { assigneA, serviceId } = req.body;

    const ticket = await prisma.ticketCRM.findUnique({ where: { id } });
    if (!ticket) return res.status(404).json({ error: 'Ticket non trouvé' });

    const [updated] = await prisma.$transaction([
      prisma.ticketCRM.update({ where: { id }, data: { assigneA, serviceId, updatedAt: new Date() } }),
      prisma.ticketHistorique.create({
        data: {
          ticketId: id,
          typeEvenement: 'ASSIGNATION',
          ancienneValeur: ticket.assigneA,
          nouvelleValeur: assigneA,
          isPublic: false,
          auteurId: req.user?.id || 'system',
        },
      }),
    ]);

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('[CRM] Erreur assignerTicket:', error);
    res.status(500).json({ error: 'Erreur lors de l\'assignation' });
  }
};

/**
 * GET /api/crm/tickets/stats
 * Statistiques globales des tickets (KPIs dashboard)
 */
const getTicketStats = async (req, res) => {
  try {
    const [total, parStatut, parPriorite, parCategorie, enRetard] = await Promise.all([
      prisma.ticketCRM.count(),
      prisma.ticketCRM.groupBy({ by: ['statut'], _count: { id: true } }),
      prisma.ticketCRM.groupBy({ by: ['priorite'], _count: { id: true } }),
      prisma.ticketCRM.groupBy({ by: ['categorie'], _count: { id: true } }),
      prisma.ticketCRM.count({
        where: {
          slaDeadline: { lt: new Date() },
          statut: { notIn: ['RESOLU', 'FERME'] },
        },
      }),
    ]);

    const resolus = parStatut.find(s => s.statut === 'RESOLU')?._count.id || 0;
    const tauxResolution = total > 0 ? ((resolus / total) * 100).toFixed(1) : 0;

    res.json({
      success: true,
      data: {
        total,
        tauxResolution: Number(tauxResolution),
        enRetard,
        parStatut: Object.fromEntries(parStatut.map(s => [s.statut, s._count.id])),
        parPriorite: Object.fromEntries(parPriorite.map(p => [p.priorite, p._count.id])),
        parCategorie: Object.fromEntries(parCategorie.map(c => [c.categorie, c._count.id])),
      },
    });
  } catch (error) {
    console.error('[CRM] Erreur getTicketStats:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });
  }
};

module.exports = {
  getTickets,
  createTicket,
  getTicketById,
  updateTicketStatut,
  addCommentaire,
  assignerTicket,
  getTicketStats,
};
