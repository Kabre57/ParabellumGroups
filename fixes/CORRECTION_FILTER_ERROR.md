# Correction - Erreur "filter is not a function"

## 🐛 Problème Identifié

**Erreur** : `TypeError: specialites.filter is not a function`

**Cause** : Incompatibilité de format entre le backend et le frontend

### Format Backend
Le backend retourne :
```json
{
  "success": true,
  "message": "...",
  "data": [...],  // ← Les données sont ici
  "page": 1,
  "total": 10
}
```

### Format Attendu par le Frontend
Le frontend attendait :
```json
[...]  // ← Tableau directement
```

---

## ✅ Solution Appliquée

### 1. Fonction Helper Créée

**Fichier** : `frontend/src/shared/api/services/technical.ts`

```typescript
class TechnicalService {
  // Helper pour extraire les données de la réponse
  private extractData<T>(response: any): T {
    // Si la réponse a un format { data: ... }, extraire data
    // Sinon retourner la réponse directement
    return response.data?.data !== undefined ? response.data.data : response.data;
  }
}
```

**Logique** :
- Si `response.data.data` existe → retourner `response.data.data` (format backend)
- Sinon → retourner `response.data` (format alternatif)

### 2. Application Globale

**34 méthodes** du service `TechnicalService` ont été mises à jour :

**Avant** :
```typescript
async getSpecialites(): Promise<Specialite[]> {
  const response = await apiClient.get(`${this.basePath}/specialites`);
  return response.data;  // ❌ Retourne { success, data, page, total }
}
```

**Après** :
```typescript
async getSpecialites(): Promise<Specialite[]> {
  const response = await apiClient.get(`${this.basePath}/specialites`);
  return this.extractData(response);  // ✅ Extrait [...] depuis response.data.data
}
```

### 3. Protection Défensive Ajoutée

**Fichier** : `frontend/app/(dashboard)/dashboard/technical/specialites/page.tsx`

```typescript
const { data: specialites = [], isLoading } = useSpecialites();

// S'assurer que specialites est un tableau
const specialitesArray = Array.isArray(specialites) ? specialites : [];

const filteredSpecialites = specialitesArray.filter((spec: Specialite) =>
  spec.nom?.toLowerCase().includes(search.toLowerCase())
);
```

**Bénéfice** : Protection contre les cas où les données ne seraient pas un tableau.

---

## 📋 Méthodes Corrigées

### Spécialités (4)
- `getSpecialites()`
- `getSpecialite(id)`
- `createSpecialite(data)`
- `updateSpecialite(id, data)`

### Techniciens (7)
- `getTechniciens(params)`
- `getTechnicien(id)`
- `getAvailableTechniciens(params)`
- `getTechnicienStats(id)`
- `createTechnicien(data)`
- `updateTechnicien(id, data)`
- `updateTechnicienStatus(id, status)`

### Missions (7)
- `getMissions(params)`
- `getMission(id)`
- `getMissionsStats()`
- `createMission(data)`
- `updateMission(id, data)`
- `updateMissionStatus(id, status)`
- `assignTechnicienToMission(...)`

### Interventions (6)
- `getInterventions(params)`
- `getIntervention(id)`
- `createIntervention(data)`
- `updateIntervention(id, data)`
- `updateInterventionStatus(id, status)`
- `completeIntervention(id, data)`

### Rapports (4)
- `getRapports(params)`
- `getRapport(id)`
- `createRapport(data)`
- `updateRapport(id, data)`

### Matériel (6)
- `getMateriel(params)`
- `getMaterielById(id)`
- `getMaterielAlertes()`
- `getSortiesEnCours()`
- `createMateriel(data)`
- `updateMateriel(id, data)`

**Total** : 34 méthodes corrigées

---

## 🎯 Impact

✅ **Page Spécialités** : Fonctionne maintenant correctement  
✅ **Toutes les pages Technical** : Compatible avec le format backend  
✅ **Robustesse** : Gère les deux formats de réponse (avec ou sans wrapper)  
✅ **Cohérence** : Toutes les méthodes du service utilisent le même pattern

---

## 🧪 Test de Vérification

1. Ouvrir `/dashboard/technical/specialites`
2. Vérifier que la liste se charge sans erreur
3. Vérifier que la recherche fonctionne
4. Créer/modifier une spécialité
5. Vérifier que les toasts s'affichent

---

**Date** : 2026-01-22  
**Fichiers modifiés** : 2  
**Lignes modifiées** : ~40
