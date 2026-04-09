/**
 * Factory classique pour générer les fonctions CRUD de nos contrôleurs
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getAll = (model) => async (req, res, next) => {
  try {
    const data = await prisma[model].findMany();
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

const getOne = (model) => async (req, res, next) => {
  try {
    const { id } = req.params;
    // Vérification spéciale pour modèle avec UUID
    const isIdNumeric = !isNaN(Number(id));
    const data = await prisma[model].findUnique({
      where: { id: isIdNumeric ? Number(id) : id },
    });
    
    if (!data) {
      return res.status(404).json({ error: 'Ressource introuvable' });
    }
    
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

const createOne = (model) => async (req, res, next) => {
  try {
    const doc = await prisma[model].create({
      data: req.body,
    });
    res.status(201).json(doc);
  } catch (error) {
    next(error);
  }
};

const updateOne = (model) => async (req, res, next) => {
  try {
    const { id } = req.params;
    const isIdNumeric = !isNaN(Number(id));
    const doc = await prisma[model].update({
      where: { id: isIdNumeric ? Number(id) : id },
      data: req.body,
    });
    res.status(200).json(doc);
  } catch (error) {
    next(error);
  }
};

const deleteOne = (model) => async (req, res, next) => {
  try {
    const { id } = req.params;
    const isIdNumeric = !isNaN(Number(id));
    await prisma[model].delete({
      where: { id: isIdNumeric ? Number(id) : id },
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAll,
  getOne,
  createOne,
  updateOne,
  deleteOne,
};
