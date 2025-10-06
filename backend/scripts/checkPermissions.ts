import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkUserPermissions(userId: number, requestedPermissions: string[]) {
  // Récupère toutes les permissions en base
  const dbPermissions = await prisma.permission.findMany();
  const dbPermissionNames = dbPermissions.map((p) => p.name);

  // Vérifie celles qui manquent
  const invalidPermissions = requestedPermissions.filter(
    (perm) => !dbPermissionNames.includes(perm)
  );

  if (invalidPermissions.length > 0) {
    console.log("❌ Permissions invalides :", invalidPermissions);
  } else {
    console.log("✅ Toutes les permissions sont valides");
  }
}

async function main() {
  // Exemple : permissions envoyées par ton frontend
  const requestedPermissions = [
    "dashboard.read",
    "calendar.read",
    "calendar.manage", // va être signalée si elle n'existe pas en base
    "interventions.read"
  ];

  await checkUserPermissions(34, requestedPermissions);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
