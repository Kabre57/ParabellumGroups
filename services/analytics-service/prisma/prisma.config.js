require('dotenv').config();
const { defineConfig, env } = require("prisma/config");

module.exports = defineConfig({
    schema: 'prisma/schema.prisma', // Chemin vers votre fichier schema.prisma
    migrations: {
        path: 'prisma/migrations', // Dossier pour les migrations
    },
    datasource: { 
        url: env('DATABASE_URL'), // Assurez-vous que cette variable d'environnement est définie
    },
});