'use strict';

const express = require('express');
const router = express.Router();

const consentCtrl = require('../controllers/crm.consentement.controller');
const ticketCtrl = require('../controllers/crm.ticket.controller');
const satisfactionCtrl = require('../controllers/crm.satisfaction.controller');
const relanceCtrl = require('../controllers/crm.relance.controller');

// ========================
// CONSENTEMENTS RGPD
// ========================
// GET    /api/crm/consentements/:clientId         - Liste les consentements d'un client
// PUT    /api/crm/consentements/:clientId         - Upsert un consentement
// POST   /api/crm/consentements/:clientId/bulk    - Mise à jour groupée

router.get('/consentements/:clientId', consentCtrl.getConsentements);
router.put('/consentements/:clientId', consentCtrl.upsertConsentement);
router.post('/consentements/:clientId/bulk', consentCtrl.bulkUpdateConsentements);

// ========================
// SEGMENTS CLIENTS
// ========================
// GET    /api/crm/segments                        - Liste des segments
// POST   /api/crm/segments                        - Crée un segment
// PATCH  /api/crm/segments/:id                    - Met à jour un segment
// DELETE /api/crm/segments/:id                    - Supprime un segment
// GET    /api/crm/segments/:id/clients            - Évalue et retourne les clients du segment

router.get('/segments', consentCtrl.getSegments);
router.post('/segments', consentCtrl.createSegment);
router.patch('/segments/:id', consentCtrl.updateSegment);
router.delete('/segments/:id', consentCtrl.deleteSegment);
router.get('/segments/:id/clients', consentCtrl.getSegmentClients);

// ========================
// TICKETS / RÉCLAMATIONS
// ========================
// GET    /api/crm/tickets                         - Liste des tickets (filtres)
// GET    /api/crm/tickets/stats                   - Statistiques KPI
// POST   /api/crm/tickets                         - Crée un ticket
// GET    /api/crm/tickets/:id                     - Détail d'un ticket
// PATCH  /api/crm/tickets/:id/statut              - Change le statut (workflow)
// POST   /api/crm/tickets/:id/commentaire         - Ajoute un commentaire
// PATCH  /api/crm/tickets/:id/assigner            - Assigne à un agent

router.get('/tickets/stats', ticketCtrl.getTicketStats);
router.get('/tickets', ticketCtrl.getTickets);
router.post('/tickets', ticketCtrl.createTicket);
router.get('/tickets/:id', ticketCtrl.getTicketById);
router.patch('/tickets/:id/statut', ticketCtrl.updateTicketStatut);
router.post('/tickets/:id/commentaire', ticketCtrl.addCommentaire);
router.patch('/tickets/:id/assigner', ticketCtrl.assignerTicket);

// ========================
// SONDAGES DE SATISFACTION (NPS / CSAT / CES)
// ========================
// GET    /api/crm/sondages                        - Liste des sondages
// GET    /api/crm/sondages/stats                  - Statistiques NPS/CSAT globales
// POST   /api/crm/sondages                        - Crée un sondage
// POST   /api/crm/sondages/:id/envoyer            - Envoie à des clients
// POST   /api/crm/sondages/repondre               - Enregistre une réponse (par token)

router.get('/sondages/stats', satisfactionCtrl.getSondageStats);
router.get('/sondages', satisfactionCtrl.getSondages);
router.post('/sondages', satisfactionCtrl.createSondage);
router.post('/sondages/:id/envoyer', satisfactionCtrl.envoyerSondage);
router.post('/sondages/repondre', satisfactionCtrl.enregistrerReponse);

// ========================
// RELANCES AUTOMATIQUES (Email / SMS / WhatsApp)
// ========================
// GET    /api/crm/relances                        - Liste des relances
// POST   /api/crm/relances                        - Crée une relance
// PATCH  /api/crm/relances/:id                    - Met à jour une relance
// DELETE /api/crm/relances/:id                    - Supprime une relance
// POST   /api/crm/relances/:id/executer           - Exécution manuelle (ou simulation)
// GET    /api/crm/relances/:id/executions         - Historique des exécutions

router.get('/relances', relanceCtrl.getRelances);
router.post('/relances', relanceCtrl.createRelance);
router.patch('/relances/:id', relanceCtrl.updateRelance);
router.delete('/relances/:id', relanceCtrl.deleteRelance);
router.post('/relances/:id/executer', relanceCtrl.executerRelance);
router.get('/relances/:id/executions', relanceCtrl.getExecutions);

module.exports = router;
