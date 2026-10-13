// Synchronisation des missions avec le CRM.
const { syncMissionById, syncMissionsByClient } = require('./shared');

exports.resyncFromCrm = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await syncMissionById(id, req);

    if (!result.updated) {
      return res.status(400).json({
        success: false,
        error: result.reason || 'Impossible de resynchroniser la mission depuis le CRM',
      });
    }

    res.json({
      success: true,
      message: 'Mission resynchronisée depuis le CRM',
      data: result.mission,
    });
  } catch (error) {
    console.error('Error in resyncFromCrm:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la resynchronisation CRM de la mission',
    });
  }
};

exports.resyncFromCrmByClient = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { addressId, deletedAddressId } = req.body || {};
    const result = await syncMissionsByClient({ clientId, addressId, deletedAddressId }, req);

    res.json({
      success: true,
      message: 'Missions resynchronisées depuis le CRM',
      data: {
        updated: result.updated,
        missions: result.missions,
      },
    });
  } catch (error) {
    console.error('Error in resyncFromCrmByClient:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la resynchronisation CRM des missions',
    });
  }
};
