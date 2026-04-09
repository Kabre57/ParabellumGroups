const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');

const generateToken = (id, role, matricule) => {
    return jwt.sign({ id, role, matricule }, process.env.JWT_SECRET || 'supersecretjwtforlogipaie2026', {
        expiresIn: '30d',
    });
};

exports.register = asyncHandler(async (req, res) => {
    const { matricule, email, password, role } = req.body;

    if (!matricule || !email || !password) {
        res.status(400).json({ message: 'Veuillez fournir un matricule, un email et un mot de passe.' });
        return;
    }

    const userExists = await prisma.userAccount.findUnique({ where: { matricule } });
    if (userExists) {
        res.status(400).json({ message: 'Un compte existe déjà pour ce matricule.' });
        return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await prisma.userAccount.create({
        data: {
            matricule,
            email,
            password: hashedPassword,
            role: role || 'EMPLOYE',
        }
    });

    if (user) {
        res.status(201).json({
            id: user.id,
            matricule: user.matricule,
            email: user.email,
            role: user.role,
            token: generateToken(user.id, user.role, user.matricule),
        });
    } else {
        res.status(400).json({ message: 'Données utilisateur invalides.' });
    }
});

exports.login = asyncHandler(async (req, res) => {
    const { matricule, password } = req.body;

    const user = await prisma.userAccount.findUnique({ where: { matricule } });

    if (user && (await bcrypt.compare(password, user.password))) {
        await prisma.userAccount.update({
            where: { id: user.id },
            data: { lastLogin: new Date() }
        });

        res.json({
            id: user.id,
            matricule: user.matricule,
            email: user.email,
            role: user.role,
            token: generateToken(user.id, user.role, user.matricule),
        });
    } else {
        res.status(401).json({ message: 'Matricule ou mot de passe incorrect.' });
    }
});
