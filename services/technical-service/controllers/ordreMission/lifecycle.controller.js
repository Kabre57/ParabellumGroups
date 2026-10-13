// Creation, mise a jour et creation groupee des ordres.
const { prisma, VEHICLE_TYPES, ORDER_STATUSES, includeOrderRelations, buildOrderCreateInput } = require('./shared');

exports.create = async (req, res) => {
  try {
    const {
      missionId,
      interventionId,
      technicienId,
      vehiculeType,
      vehiculeLabel,
      pieceIdentite,
      fonction,
      qualite,
      destination,
      objetMission,
      notes,
    } = req.body;

    if (!missionId || !technicienId || !vehiculeType) {
      return res.status(400).json({
        success: false,
        error: 'Les champs missionId, technicienId et vehiculeType sont requis',
      });
    }

    if (!VEHICLE_TYPES.includes(vehiculeType)) {
      return res.status(400).json({
        success: false,
        error: `Le type de vehicule doit etre l une des valeurs suivantes: ${VEHICLE_TYPES.join(', ')}`,
      });
    }

    const [mission, technicien, intervention] = await Promise.all([
      prisma.mission.findUnique({ where: { id: missionId } }),
      prisma.technicien.findUnique({ where: { id: technicienId } }),
      interventionId ? prisma.intervention.findUnique({
        where: { id: interventionId },
        include: {
          techniciens: true,
        },
      }) : Promise.resolve(null),
    ]);

    if (!mission) {
      return res.status(404).json({ success: false, error: 'Mission non trouvee' });
    }
    if (!technicien) {
      return res.status(404).json({ success: false, error: 'Technicien non trouve' });
    }
    if (interventionId && !intervention) {
      return res.status(404).json({ success: false, error: 'Intervention non trouvee' });
    }
    if (intervention && intervention.missionId !== missionId) {
      return res.status(400).json({ success: false, error: 'L intervention ne correspond pas a la mission selectionnee' });
    }
    if (intervention) {
      const isAssigned = intervention.techniciens.some((assignment) => assignment.technicienId === technicienId);
      if (!isAssigned) {
        return res.status(400).json({
          success: false,
          error: 'Ce technicien n est pas affecte a cette intervention',
        });
      }
    }

    const order = await prisma.$transaction(async (tx) => {
      const data = await buildOrderCreateInput({
        client: tx,
        mission,
        intervention,
        technicien,
        vehiculeType,
        vehiculeLabel,
        pieceIdentite,
        fonction,
        qualite,
        destination,
        objetMission,
        notes,
        createdByUserId: req.user?.id,
      });

      return tx.ordreMission.create({
        data,
        include: includeOrderRelations,
      });
    });

    res.status(201).json({
      success: true,
      message: 'Ordre de mission genere avec succes',
      data: order,
    });
  } catch (error) {
    console.error('Error in create ordre mission:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de la generation de l ordre de mission',
    });
  }
};

exports.createBatch = async (req, res) => {
  try {
    const {
      interventionId,
      technicienIds,
      vehiculeType,
      vehiculeLabel,
      qualite,
      destination,
      objetMission,
      notes,
    } = req.body;

    if (!interventionId || !vehiculeType) {
      return res.status(400).json({
        success: false,
        error: 'Les champs interventionId et vehiculeType sont requis',
      });
    }

    if (!VEHICLE_TYPES.includes(vehiculeType)) {
      return res.status(400).json({
        success: false,
        error: `Le type de vehicule doit etre l une des valeurs suivantes: ${VEHICLE_TYPES.join(', ')}`,
      });
    }

    const intervention = await prisma.intervention.findUnique({
      where: { id: interventionId },
      include: {
        mission: true,
        techniciens: {
          include: {
            technicien: {
              include: {
                specialite: true,
              },
            },
          },
        },
      },
    });

    if (!intervention) {
      return res.status(404).json({
        success: false,
        error: 'Intervention non trouvee',
      });
    }

    const selectedIds = Array.isArray(technicienIds) && technicienIds.length > 0
      ? technicienIds
      : intervention.techniciens.map((assignment) => assignment.technicienId);

    const assignments = intervention.techniciens.filter((assignment) => selectedIds.includes(assignment.technicienId));

    if (assignments.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Aucun technicien affecte a cette intervention',
      });
    }

    const createdOrders = await prisma.$transaction(async (tx) => {
      const orders = [];

      for (const assignment of assignments) {
        const data = await buildOrderCreateInput({
          client: tx,
          mission: intervention.mission,
          intervention,
          technicien: assignment.technicien,
          vehiculeType,
          vehiculeLabel,
          qualite,
          destination,
          objetMission,
          notes,
          createdByUserId: req.user?.id,
        });

        const order = await tx.ordreMission.create({
          data,
          include: includeOrderRelations,
        });
        orders.push(order);
      }

      return orders;
    });

    res.status(201).json({
      success: true,
      message: `${createdOrders.length} ordre(s) de mission genere(s) avec succes`,
      data: createdOrders,
    });
  } catch (error) {
    console.error('Error in createBatch ordres mission:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de la generation en lot des ordres de mission',
    });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      pieceIdentite,
      fonction,
      qualite,
      destination,
      objetMission,
      vehiculeType,
      vehiculeLabel,
      dateDepart,
      dateRetour,
      notes,
      status,
    } = req.body;

    const existing = await prisma.ordreMission.findUnique({
      where: { id },
      include: includeOrderRelations,
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Ordre de mission non trouve',
      });
    }

    if (vehiculeType && !VEHICLE_TYPES.includes(vehiculeType)) {
      return res.status(400).json({
        success: false,
        error: `Le type de vehicule doit etre l une des valeurs suivantes: ${VEHICLE_TYPES.join(', ')}`,
      });
    }

    if (status && !ORDER_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Le statut doit etre l une des valeurs suivantes: ${ORDER_STATUSES.join(', ')}`,
      });
    }

    const order = await prisma.ordreMission.update({
      where: { id },
      data: {
        pieceIdentite: pieceIdentite !== undefined ? (pieceIdentite?.trim() || null) : undefined,
        fonction: fonction !== undefined ? (fonction?.trim() || null) : undefined,
        qualite: qualite !== undefined ? (qualite?.trim() || null) : undefined,
        destination: destination !== undefined ? (destination?.trim() || existing.destination) : undefined,
        objetMission: objetMission !== undefined ? (objetMission?.trim() || existing.objetMission) : undefined,
        vehiculeType: vehiculeType || undefined,
        vehiculeLabel: vehiculeLabel !== undefined ? (vehiculeLabel?.trim() || null) : undefined,
        dateDepart: dateDepart ? new Date(dateDepart) : undefined,
        dateRetour: dateRetour !== undefined ? (dateRetour ? new Date(dateRetour) : null) : undefined,
        notes: notes !== undefined ? (notes?.trim() || null) : undefined,
        status: status || undefined,
      },
      include: includeOrderRelations,
    });

    res.json({
      success: true,
      message: 'Ordre de mission mis a jour avec succes',
      data: order,
    });
  } catch (error) {
    console.error('Error in update ordre mission:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise a jour de l ordre de mission',
    });
  }
};

exports.markPrinted = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.ordreMission.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Ordre de mission non trouve',
      });
    }

    const order = await prisma.ordreMission.update({
      where: { id },
      data: {
        status: 'IMPRIME',
        printedAt: new Date(),
      },
      include: includeOrderRelations,
    });

    res.json({
      success: true,
      message: 'Ordre de mission marque comme imprime',
      data: order,
    });
  } catch (error) {
    console.error('Error in markPrinted ordre mission:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise a jour de l ordre de mission',
    });
  }
};
