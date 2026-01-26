# ✅ CORRECTIONS SCRIPTS POWERSHELL

## Problème

Les scripts PowerShell avaient des erreurs de syntaxe causées par :
1. **Caractères Unicode mal encodés** (✓, ✗, F)
2. **Guillemets Unicode** au lieu de guillemets ASCII
3. **Problèmes d'encodage UTF-8 BOM** sur Windows

**Erreurs rencontrées** :
```
Jeton inattendu « » dans l'expression ou l'instruction.
Accolade fermante « } » manquante
Le terminateur " est manquant dans la chaîne
```

---

## Solution Appliquée

### 1. Remplacement des Caractères Unicode

**Avant** :
```powershell
Write-Host " ✓ Actif" -ForegroundColor Green
Write-Host " ✗ Inactif" -ForegroundColor Red
```

**Après** :
```powershell
Write-Host " [OK] Actif" -ForegroundColor Green
Write-Host " [KO] Inactif" -ForegroundColor Red
```

### 2. Correction des Guillemets

**Avant** :
```powershell
ArgumentList = "-NoExit", "-Command", "cd '$Path'; $Command" -WindowStyle Minimized
```

**Après** :
```powershell
$startArgs = @{
    FilePath = "powershell"
    ArgumentList = "-NoExit", "-Command", "cd '$Path'; $Command"
    WindowStyle = "Minimized"
}
Start-Process @startArgs
```

### 3. Suppression des Accents

**Avant** :
```powershell
# Script de démarrage
Write-Host "Déjà actif"
```

**Après** :
```powershell
# Script de demarrage
Write-Host "Deja actif"
```

---

## Scripts Corrigés

### ✅ check-services.ps1

**Fonctionnalités** :
- Vérifie l'état des 3 services requis
- Affiche le PID et le nom du processus
- Indique si le système est opérationnel

**Usage** :
```powershell
.\check-services.ps1
```

**Sortie** :
```
[API Gateway] Port 3001... [OK] Actif
    PID: 27988 | Processus: node
[Auth Service] Port 4001... [OK] Actif
    PID: 28004 | Processus: node
[Frontend (Next.js)] Port 3000... [OK] Actif
    PID: 31824 | Processus: node

[OK] Systeme operationnel
Services actifs: 3/3
```

---

### ✅ start-services.ps1

**Fonctionnalités** :
- Démarre automatiquement les 3 services
- Vérifie si déjà actifs
- Attend 10 secondes max par service
- Ouvre chaque service dans une fenêtre minimisée

**Usage** :
```powershell
.\start-services.ps1
```

**Comportement** :
1. Vérifie si le port est déjà utilisé
2. Si oui → Skip (déjà actif)
3. Si non → Démarre le service en arrière-plan
4. Attend que le port soit accessible
5. Affiche le résultat

---

### ✅ stop-services.ps1

**Fonctionnalités** :
- Arrête tous les services en cours
- Trouve le PID par le port
- Kill le processus avec `-Force`

**Usage** :
```powershell
.\stop-services.ps1
```

**Sortie** :
```
[Frontend (Next.js)] Recherche du processus sur le port 3000... [OK] Arrete (PID: 31824)
[API Gateway] Recherche du processus sur le port 3001... [OK] Arrete (PID: 27988)
[Auth Service] Recherche du processus sur le port 4001... [OK] Arrete (PID: 28004)

[OK] Tous les services sont arretes
```

---

## État Actuel

### ✅ Tous les Services Actifs

```
Services actifs: 3/3

- API Gateway:  http://localhost:3001     [PID: 27988]
- Auth Service: http://localhost:4001     [PID: 28004]
- Frontend:     http://localhost:3000     [PID: 31824]
```

### ✅ Test de Connexion

```powershell
.\test-login.ps1
```

**Résultat** : LOGIN SUCCESS ✅

---

## Workflow de Développement

### Démarrage

```powershell
# Option 1 : Automatique (recommandé)
.\start-services.ps1

# Option 2 : Manuel (3 terminaux)
# Terminal 1
cd services/api-gateway; npm start

# Terminal 2
cd services/auth-service; node index.js

# Terminal 3
cd frontend; npm run dev
```

### Vérification

```powershell
.\check-services.ps1
```

### Arrêt

```powershell
.\stop-services.ps1
```

---

## Commandes Rapides

| Action | Commande |
|--------|----------|
| **Démarrer tout** | `.\start-services.ps1` |
| **Vérifier état** | `.\check-services.ps1` |
| **Arrêter tout** | `.\stop-services.ps1` |
| **Tester login** | `.\test-login.ps1` |

---

## URLs d'Accès

| Service | URL |
|---------|-----|
| **Frontend** | http://localhost:3000/login |
| **API Gateway** | http://localhost:3001 |
| **Auth Health** | http://localhost:4001/api/health |

**Identifiants** :
- Email: admin@parabellum.com
- Password: admin123

---

## Fichiers Modifiés

1. ✅ `check-services.ps1` - Correction encodage + syntaxe
2. ✅ `start-services.ps1` - Correction encodage + syntaxe
3. ✅ `stop-services.ps1` - Correction encodage + syntaxe

**Total** : 3 scripts corrigés et testés

---

**Date** : 21 janvier 2026 18:20 UTC
**Status** : ✅ Scripts opérationnels
**Système** : ✅ Tous services actifs (3/3)
