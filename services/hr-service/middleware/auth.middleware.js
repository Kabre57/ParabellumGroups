const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const headerValue = (req, name) => {
    const value = req.headers[name.toLowerCase()];
    return Array.isArray(value) ? value[0] : value;
};

const resolveUser = async (decoded, req) => {
    const id = decoded.id || decoded.userId || headerValue(req, 'x-user-id');
    const email = decoded.email || headerValue(req, 'x-user-email');
    const matricule = decoded.matricule || decoded.employeeMatricule || headerValue(req, 'x-user-matricule');
    const role = decoded.role || decoded.roleCode || headerValue(req, 'x-user-role') || 'EMPLOYE';

    const lookups = [];
    if (typeof id === 'string' && uuidRegex.test(id)) {
        lookups.push({ id });
    }
    if (email) {
        lookups.push({ email: String(email) });
    }
    if (matricule) {
        lookups.push({ matricule: String(matricule) });
    }

    for (const where of lookups) {
        const user = await prisma.userAccount.findUnique({
            where,
            select: { id: true, matricule: true, email: true, role: true }
        });

        if (user) return user;
    }

    return {
        id: String(id || email || matricule || 'external-user'),
        matricule: matricule ? String(matricule) : null,
        email: email ? String(email) : null,
        role,
        external: true
    };
};

const authenticateUser = asyncHandler(async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];

            // Transitional mock logic for the legacy front-end
            if (token === 'MOCK_TOKEN_LOGIPAIE') {
                req.user = { id: "999", matricule: 'EMP001', role: 'RH_ADMIN' };
                return next();
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretjwtforlogipaie2026');
            req.user = await resolveUser(decoded, req);
            
            next();
        } catch (error) {
            console.error("Auth Middleware Error:", error.message);
            return res.status(401).json({ error: 'Non autorisé, token échoué ou expiré' });
        }
    }

    if (!token) {
        return res.status(401).json({ error: 'Non autorisé, aucun token fourni' });
    }
});

const adminRoleFilter = (req, res, next) => {
    if (req.user && (req.user.role === 'RH_MANAGER' || req.user.role === 'RH_ADMIN')) {
        next();
    } else {
        res.status(403);
        throw new Error('Accès interdit: Rôle RH requis');
    }
};

module.exports = { authenticateUser, adminRoleFilter };
