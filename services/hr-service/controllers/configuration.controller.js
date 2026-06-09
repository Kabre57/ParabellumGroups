const { PrismaClient } = require('@prisma/client');
const asyncHandler = require('express-async-handler');
const {
  buildConfigurationData,
  getActiveConfiguration,
  getActiveConfigurationRecord,
  mapConfiguration
} = require('../services/config.service');

const prisma = new PrismaClient();

exports.getActiveConfiguration = asyncHandler(async (req, res) => {
  const configuration = await getActiveConfiguration(prisma);
  res.status(200).json(configuration);
});

exports.listConfigurations = asyncHandler(async (req, res) => {
  const configurations = await prisma.configuration.findMany({
    orderBy: { dateMiseAJour: 'desc' }
  });

  res.status(200).json({
    data: configurations.map(mapConfiguration)
  });
});

exports.upsertActiveConfiguration = asyncHandler(async (req, res) => {
  const payload = {
    ...buildConfigurationData(req.body),
    isActive: true,
    dateMiseAJour: new Date()
  };

  const configuration = await prisma.$transaction(async (tx) => {
    const existing = await getActiveConfigurationRecord(tx);

    if (existing) {
      return tx.configuration.update({
        where: { id: existing.id },
        data: payload
      });
    }

    return tx.configuration.create({
      data: payload
    });
  });

  res.status(200).json(mapConfiguration(configuration));
});
