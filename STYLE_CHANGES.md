# Harmonisation du Style avec prarabellum groups

## Modifications Appliquées

### 1. Configuration Tailwind & CSS Globaux (`frontend/app/globals.css`)

**Changements principaux :**
- **Couleur primaire** : Changé de `hsl(222.2 47.4% 11.2%)` (bleu nuit très sombre) vers `hsl(221 83% 53%)` (bleu vif #2563eb similaire à Tailwind blue-600)
- **Couleur de focus (ring)** : Changé vers la même couleur primaire bleue pour cohérence
- **Fond de page** : Changé de `bg-background` (blanc) vers `bg-gray-50` pour un look plus doux
- **Radius** : Réduit de `0.5rem` (8px) à `0.25rem` (4px) pour des bordures plus subtiles
- **Police** : Ajout explicite de la police Inter avec fallbacks système

### 2. Composant Button (`frontend/src/components/ui/button.tsx`)

**Style prarabellum groups appliqué :**
- Variante `default` : `bg-blue-600` au lieu de `bg-primary` (plus direct)
- Variante `destructive` : `bg-red-600` au lieu de `bg-destructive`
- Variante `outline` : `border-gray-300` avec `hover:bg-gray-50`
- Variante `ghost` : `bg-transparent` avec `hover:bg-gray-100`
- Focus simplifié : `focus:ring-2 focus:ring-blue-500` au lieu du système ring-offset

### 3. Composant Card (`frontend/src/components/ui/card.tsx`)

**Simplification :**
- Border : `border-gray-200` au lieu de `border` (variable)
- Background : `bg-white` au lieu de `bg-card`
- Texte : `text-gray-900` au lieu de `text-card-foreground`
- Radius : `rounded` (4px) au lieu de `rounded-lg` (8px)
- Shadow : Conservé `shadow-sm` pour un effet subtil

### 4. Composant Input (`frontend/src/components/ui/input.tsx`)

**Style épuré :**
- Border : `border-gray-300` au lieu de `border-input`
- Background : `bg-white` au lieu de `bg-background`
- Texte : `text-gray-900` avec `placeholder:text-gray-400`
- Focus : `focus:ring-2 focus:ring-blue-500` (simplifié, sans offset)
- Radius : `rounded` (4px) au lieu de `rounded-md` (6px)

### 5. Nouvelle Sidebar Simplifiée (`frontend/src/components/layout/SimpleSidebar.tsx`)

**Caractéristiques du style prarabellum groups :**
- Design épuré avec fond blanc et bordure droite grise
- Indicateur actif : `bg-blue-50` + `text-blue-700` + `border-r-2 border-blue-700`
- Hover simple : `hover:bg-gray-50`
- Logo simple en texte (pas de gradient complexe)
- Avatar utilisateur : cercle bleu avec initiales
- Section administration séparée avec titre en majuscules
- Bouton déconnexion en bas avec icône
- Responsive : Overlay mobile avec transition douce

## Différences Clés avec le Style Précédent

| Aspect | Avant (ParabellumGroups) | Après (Style prarabellum groups) |
|--------|--------------------------|-------------------------|
| **Couleur primaire** | Bleu nuit très sombre | Bleu vif (#2563eb) |
| **Arrondis** | 8px (rounded-lg) | 4px (rounded) |
| **Fond page** | Blanc pur | Gris clair (gray-50) |
| **Sidebar** | Complexe avec gradients et catégories repliables | Simple, liste plate avec sections |
| **Indicateur actif** | Multiple styles possibles | Bordure droite bleue constante |
| **Cards** | Shadow medium, coins arrondis | Shadow subtle, coins plus droits |
| **Buttons** | Classes variables (primary, ring) | Classes directes (blue-600) |
| **Focus** | Ring avec offset | Ring simple sans offset |

## Comment Utiliser la Nouvelle Sidebar

Pour utiliser la sidebar simplifiée au style prarabellum groups, modifiez le layout :

```tsx
// Dans frontend/app/(dashboard)/layout.tsx
import SimpleSidebar from '@/components/layout/SimpleSidebar';

export default function DashboardLayout({ children }) {
  return (
    <div className="flex h-screen">
      <SimpleSidebar />
      <main className="flex-1 ml-64 overflow-auto">
        {children}
      </main>
    </div>
  );
}
```

## Vérification Visuelle

Après redémarrage du frontend, vous devriez constater :
1. ✅ Couleur bleue plus vive sur tous les boutons primaires
2. ✅ Coins moins arrondis sur les cards et inputs
3. ✅ Fond de page gris clair au lieu de blanc
4. ✅ Bordures plus fines et subtiles
5. ✅ Police Inter appliquée partout

## Notes Importantes

- L'ancienne Sidebar (`Sidebar.tsx`) est conservée intacte
- La nouvelle Sidebar simplifiée est dans `SimpleSidebar.tsx`
- Tous les composants UI existants bénéficient automatiquement du nouveau thème
- Les variables CSS peuvent être ajustées dans `globals.css` pour fine-tuning
