# Reset de la base `technical-service`

Objectif: vider les donnees de test du module technique sans casser le schema Prisma.

## Avant de supprimer

- Fais un backup si tu veux pouvoir revenir en arriere.
- Les commandes ci-dessous suppriment les missions, interventions, rapports, sorties materiel et donnees associees du `technical-service`.
- Si tu es en production, ne fais pas ca sans sauvegarde.

## Methode 1: reset complet du schema `technical-service`

A utiliser si tu veux repartir de zero avec une base vide.

```bash
cd services/technical-service
npx prisma migrate reset --force --skip-seed
```

Effet:
- supprime toutes les tables du schema `technical-service`
- recree le schema a partir des migrations
- ne recharge pas les donnees de seed grace a `--skip-seed`

## Methode 2: vider seulement les donnees en gardant le schema

A utiliser si tu veux garder les tables et repartir vide.

```bash
cd services/technical-service
cat > /tmp/technical-truncate.sql <<'SQL'
TRUNCATE TABLE
  rapports,
  sorties_materiel,
  interventions_techniciens,
  interventions,
  missions_techniciens,
  missions,
  materiel,
  techniciens,
  specialites
RESTART IDENTITY CASCADE;
SQL
npx prisma db execute --file /tmp/technical-truncate.sql --schema prisma/schema.prisma
```

Effet:
- vide les donnees du module technique
- garde le schema Prisma intact
- remet les compteurs auto-increment a zero si necessaire

## Methode 3: reset depuis Docker si tu utilises la stack compose

Si tu veux supprimer puis recreer le volume de donnees du service technique:

```bash
docker compose stop technical-service
cd services/technical-service
npx prisma migrate reset --force --skip-seed
cd ../..
docker compose up -d technical-service
```

## Verifications apres reset

```bash
cd services/technical-service
npx prisma studio
```

Ou via API:

```bash
curl -H "Authorization: Bearer <TOKEN>" http://127.0.0.1:8080/api/technical/missions
curl -H "Authorization: Bearer <TOKEN>" http://127.0.0.1:8080/api/technical/interventions
```

Les listes doivent revenir vides.

## Backup minimal avant reset

Si tu veux une sauvegarde PostgreSQL rapide avant nettoyage:

```bash
pg_dump "$DATABASE_URL" > /tmp/technical-service-backup-$(date +%F-%H%M%S).sql
```

## Recharger des donnees de demo ensuite

Si plus tard tu veux remettre les seeds de demo:

```bash
cd services/technical-service
npx prisma db seed
```
