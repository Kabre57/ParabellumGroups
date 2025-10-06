// backend/prisma/seed-role-permissions.ts
// -----------------------------------------------------------------------------
// SEED "RolePermission" ADAPTÉ À TON SCHÉMA (PAS DE MODÈLE "Role") AVEC POLITIQUES AFFINÉES
// -----------------------------------------------------------------------------
// ➜ Contexte de ton projet confirmé :
//   - Table `permissions` (name unique, ex: "missions.read").
//   - Table `role_permissions` avec champs : role (enum UserRole), permissionId (FK permissions.id).
//   - Contrainte d'unicité composite : @@unique([role, permissionId])
//     → Prisma expose la clé unique comme "role_permissionId".
//   - Enum Prisma `UserRole`: ADMIN, GENERAL_DIRECTOR, SERVICE_MANAGER, EMPLOYEE, ACCOUNTANT, PURCHASING_MANAGER.
//
// ➜ Ce seed :
//   - Charge toutes les permissions en DB (celles seedées via seed-permissions.ts).
//   - Définit des politiques par rôle (catégories × actions) de manière plus fine.
//   - Crée/assure les liens (role, permissionId) avec upsert idempotent.
//
// ➜ Exécution :
//   npx ts-node prisma/seed-role-permissions.ts
//
// ➜ Remarque :
//   - Les politiques ci-dessous respectent les bonnes pratiques courantes :
//     * ADMIN : tout.
//     * GENERAL_DIRECTOR : vision large (lecture globale + gestion clés).
//     * SERVICE_MANAGER : pilotage opérationnel (missions/interventions/équipes/etc.).
//     * ACCOUNTANT : finances/comptes/rapports (+ lecture opérations).
//     * PURCHASING_MANAGER : achats/stock/fournisseurs/contrats (+ lecture opérations).
//     * EMPLOYEE : opérations du quotidien sans delete/approve (lire/créer/modifier).
//   - Le code est "défensif" : il ne prend que les permissions réellement existantes en DB.
// -----------------------------------------------------------------------------

import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

/** Retourne les permissions dont l'action (partie après le point) est dans `actions`. */
const onlyActions = (list: string[], actions: string[]) =>
  list.filter((p) => actions.includes(p.split('.')[1]));

/** Permissions de ALL_NAMES qui commencent par "prefix." */
const byPrefix = (all: Set<string>, prefix: string) =>
  Array.from(all).filter((p) => p.startsWith(prefix + '.'));

/** Permissions de ALL_NAMES dont le préfixe (avant le point) est dans `prefixes`. */
const byPrefixes = (all: Set<string>, prefixes: string[]) =>
  Array.from(all).filter((p) => prefixes.some((px) => p.startsWith(px + '.')));

/**
 * Fabrique une liste de permissions à partir d'un ensemble de préfixes + un ensemble d'actions autorisées.
 * - Filtre dynamiquement pour ne sélectionner que les permissions réelles.
 * - Exemple: allow(ALL, ['missions','interventions'], ['read','create'])
 */
const allow = (ALL: Set<string>, prefixes: string[], actions: string[]) => {
  const inPrefixes = byPrefixes(ALL, prefixes);
  return onlyActions(inPrefixes, actions);
};

/** Union sans doublons */
const union = (...lists: string[][]) => Array.from(new Set(lists.flat()));

async function main() {
  // ---------------------------------------------------------------------------
  // 1) Charger toutes les permissions présentes en DB (nom ↔ id)
  // ---------------------------------------------------------------------------
  const dbPerms = await prisma.permission.findMany({
    select: { id: true, name: true },
  });

  const ALL_NAMES = new Set(dbPerms.map((p) => p.name));   // ex: "missions.read"
  const idByName = new Map(dbPerms.map((p) => [p.name, p.id]));

  // ---------------------------------------------------------------------------
  // 2) Définir des "ensembles" de catégories pour faciliter la lecture
  //    (on ne garde que les catégories qui existent réellement via `allow`)
  // ---------------------------------------------------------------------------
  // Domaines opérationnels
  const OPS = ['missions', 'interventions', 'techniciens', 'materiels', 'calendar'];
  // Communication / notifications
  const COMMS = ['messages', 'notifications'];
  // Congés / RH légers
  const HR = ['leaves', 'profile'];
  // Comptable / financier
  const FIN = ['loans', 'cashFlow', 'account', 'accounts', 'comptes', 'accountingEntry', 'rapports'];
  // Achats / stock / clients / contrats / fournisseurs
  const SUPPLY = ['materiels', 'supplier', 'purchases', 'stock', 'contracts', 'customer'];
  // Supervision / reporting
  const MGMT = ['dashboard', 'reports', 'users'];

  // ---------------------------------------------------------------------------
  // 3) Politique par rôle (AFFINÉE)
  //    → On compose avec `allow(ALL_NAMES, prefixes, actions)` pour ne lier
  //      que ce qui existe réellement.
  // ---------------------------------------------------------------------------

  // ADMIN : accès complet (simple et robuste)
  const ADMIN = Array.from(ALL_NAMES);

  // GENERAL_DIRECTOR : supervision + lecture globale + gestion limitée sur domaines clés
  const GENERAL_DIRECTOR = union(
    // Supervision/reporting/gestion
    allow(ALL_NAMES, MGMT, ['read', 'create', 'update', 'delete', 'analytics', 'reports', 'export']),
    // Gestion opérationnelle haut niveau
    allow(ALL_NAMES, ['missions', 'interventions', 'calendar'], ['read', 'create', 'update', 'delete', 'approve', 'validate', 'assign']),
    // Lecture globale "filet de sécurité"
    onlyActions(Array.from(ALL_NAMES), ['read'])
  );

  // SERVICE_MANAGER : pilotage opérationnel (missions/interventions/équipes/matériels/agenda/comms)
  const SERVICE_MANAGER = union(
    allow(ALL_NAMES, OPS, ['read', 'create', 'update', 'delete', 'assign', 'validate', 'approve']),
    allow(ALL_NAMES, COMMS, ['read', 'create', 'update', 'delete']),
    // lecture basique RH si présent
    allow(ALL_NAMES, HR, ['read'])
  );

  // ACCOUNTANT : finances/comptes/rapports + lecture opérations
  const ACCOUNTANT = union(
    allow(ALL_NAMES, FIN, ['read', 'create', 'update', 'delete', 'export']),
    // lecture opérations
    allow(ALL_NAMES, ['missions', 'interventions', 'materiels', 'contracts', 'supplier', 'purchases', 'stock'], ['read'])
  );

  // PURCHASING_MANAGER : achats/stock/fournisseurs/contrats/clients + lecture opérations
  const PURCHASING_MANAGER = union(
    allow(ALL_NAMES, SUPPLY, ['read', 'create', 'update', 'delete', 'approve']),
    // lecture opérations
    allow(ALL_NAMES, ['missions', 'interventions'], ['read'])
  );

  // EMPLOYEE : opérations quotidiennes sans delete/approve, profil
  const EMPLOYEE = union(
    allow(ALL_NAMES, ['missions', 'interventions', 'calendar', 'messages', 'notifications', 'leaves'], ['read', 'create', 'update']),
    allow(ALL_NAMES, ['profile'], ['read', 'create', 'update'])
  );

  // Registre final
  const rolePolicies: Record<UserRole, string[]> = {
    [UserRole.ADMIN]: ADMIN,
    [UserRole.GENERAL_DIRECTOR]: GENERAL_DIRECTOR,
    [UserRole.SERVICE_MANAGER]: SERVICE_MANAGER,
    [UserRole.ACCOUNTANT]: ACCOUNTANT,
    [UserRole.PURCHASING_MANAGER]: PURCHASING_MANAGER,
    [UserRole.EMPLOYEE]: EMPLOYEE,
  };

  // ---------------------------------------------------------------------------
  // 4) Upsert des liens role(enum) ↔ permissionId
  // ---------------------------------------------------------------------------
  let totalLinks = 0;

  for (const role of Object.values(UserRole)) {
    // Permissions souhaitées pour ce rôle
    const wanted = rolePolicies[role] || [];

    // Garder uniquement celles réellement présentes (défensif)
    const existing = wanted.filter((name) => idByName.has(name));

    for (const name of existing) {
      const permissionId = idByName.get(name)!;

      await prisma.rolePermission.upsert({
        // clé composite générée par Prisma pour @@unique([role, permissionId])
        where: { role_permissionId: { role, permissionId } },
        create: { role, permissionId },
        update: {},
      });

    totalLinks++;
    }

    console.log(`Linked ${existing.length} permissions -> ${role}`);
  }

  console.log(`\nTotal links created/ensured: ${totalLinks}`);
}

// Lancement du seed
main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
