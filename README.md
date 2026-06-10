# Système Solaire Interactif

Simulation 3D interactive du système solaire (Three.js + Vite), à des fins éducatives.

## Fonctionnalités

- Soleil animé par shader (convection, granulation) avec couronne et bloom
- 8 planètes avec textures NASA réelles, inclinaisons axiales réelles et atmosphères (Terre, Vénus)
- 6 lunes cliquables : la Lune, Io, Europe, Ganymède, Callisto, Titan
- Anneaux de Saturne avec division de Cassini
- Interface « Dock cinéma » : vignettes des corps, pause/vitesse, popover effets
- Visite guidée cinématique de Mercure à Neptune (interruptible)
- Labels 3D cliquables au-dessus des planètes
- Fiche détaillée avec aperçu 3D, données astronomiques réelles et description
- Effets spéciaux : étoiles scintillantes, nébuleuse, météores, astéroïdes, comète, station spatiale
- StarShip pilotable de planète en planète, caméra embarquée

## Lancer le projet

```bash
npm install
npm run dev      # serveur de développement Vite
npm run build    # build de production
```

## Contrôles

- **Clic gauche + déplacer** : rotation de la caméra · **Molette** : zoom · **Clic droit + déplacer** : pan
- **Clic sur une planète, une lune, un label ou une vignette du dock** : focus caméra + fiche détaillée
- **🚀 Visite guidée** : vol automatique de Mercure à Neptune
- **✦** : effets, affichage (orbites, labels), StarShip, réinitialisation
- **⌖** : retour à la vue d'ensemble

## Structure

```
js/
├── main.js               # Orchestration, boucle de rendu, caméra
├── core/
│   ├── SceneManager.js   # Scène, caméra, renderer, contrôles
│   └── GuidedTour.js     # Visite guidée cinématique
├── objects/
│   ├── Planet.js         # Planètes (textures réelles + fallback procédural)
│   ├── Moon.js           # Lunes procédurales en orbite
│   ├── SunMaterial.js    # Shader FBM animé du Soleil
│   └── Starship.js       # Fusée pilotable
├── effects/
│   ├── PostProcessing.js # Bloom (UnrealBloomPass)
│   └── SpecialEffects.js # Étoiles, nébuleuse, météores, astéroïdes…
├── ui/
│   ├── UIManager.js      # Dock, fiche détaillée, popover
│   └── Labels.js         # Labels CSS2D flottants
└── data/
    └── planetData.js     # Données des planètes et lunes (source unique)
```

## À propos des données

Les fiches utilisent des données astronomiques réelles, mais les tailles, distances et
vitesses de la scène 3D sont à l'échelle pédagogique pour une meilleure visualisation.
