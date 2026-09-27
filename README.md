# Système Solaire Interactif

Simulation 3D interactive du système solaire (Three.js + Vite), à des fins éducatives.

## Fonctionnalités

- Soleil animé par shader (convection, granulation) avec couronne et bloom
- 8 planètes avec textures réelles haute définition et inclinaisons axiales réelles
- Terre détaillée : relief, océans réfléchissants, nuages, lumières des villes côté nuit
- Atmosphères (Terre, Vénus) éclairées du côté du Soleil
- Anneaux de Saturne avec division de Cassini et ombre de la planète
- 6 lunes cliquables : la Lune, Io, Europe, Ganymède, Callisto, Titan
- Fond de Voie lactée, étoiles scintillantes, constellations cliquables (dont les 12 signes du zodiaque)
- Interface « Dock cinéma » : vignettes des corps, pause/vitesse, popover effets
- Visite guidée cinématique de Mercure à Neptune (interruptible)
- Fiche détaillée avec aperçu 3D, données astronomiques réelles et description
- Effets : nébuleuse, météores, ceinture d'astéroïdes, comète, station spatiale
- StarShip pilotable de planète en planète, caméra embarquée
- Trois modes d'échelle (pédagogique, compacte, distances accentuées)
- Ambiance sonore procédurale (désactivée par défaut)

## Lancer le projet

Prérequis : Node.js 22 ou plus récent, [pnpm](https://pnpm.io/).

```bash
pnpm install
pnpm dev         # serveur de développement Vite (http://localhost:3000)
pnpm test        # tests unitaires (node --test)
pnpm build       # build de production dans dist/
pnpm start       # sert dist/ (après pnpm build) ; port modifiable via PORT
```

## Contrôles

- **Clic gauche + déplacer** : rotation de la caméra · **Molette** : zoom · **Clic droit + déplacer** : pan
- **Clic sur une planète, une lune, un label ou une vignette du dock** : focus caméra + fiche détaillée
- **Espace** : pause / lecture · **Échap** : fermer la fiche
- **🚀 Visite guidée** : vol automatique de Mercure à Neptune
- **✦** : effets, affichage (orbites, labels, échelle, volume), StarShip, réinitialisation
- **⌖** : retour à la vue d'ensemble

## Structure

```
js/
├── main.js                # Orchestration, boucle de rendu, caméra
├── core/
│   ├── SceneManager.js    # Scène, caméra, renderer, contrôles, fond
│   ├── GuidedTour.js      # Visite guidée cinématique
│   ├── Interactions.mjs   # Survol, clic → focus
│   ├── ScaleModes.mjs     # Modes d'échelle des distances
│   └── TimeStep.mjs       # Pas de temps indépendant du taux de rafraîchissement
├── objects/
│   ├── Planet.js          # Planètes, atmosphères, anneaux (fallback procédural)
│   ├── Moon.js            # Lunes en orbite
│   ├── SunMaterial.js     # Shader animé du Soleil
│   └── Starship.js        # Fusée pilotable
├── effects/
│   ├── PostProcessing.js  # Bloom + sortie (tone mapping)
│   └── SpecialEffects.js  # Étoiles, constellations, nébuleuse, météores…
├── audio/
│   └── AudioManager.mjs   # Synthèse audio procédurale (Web Audio)
├── ui/
│   ├── UIManager.js       # Dock, fiche détaillée, popover
│   ├── Labels.js          # Labels CSS2D flottants
│   ├── Onboarding.mjs     # Chargement, vol d'intro, astuce
│   └── tooltip.mjs        # Infobulle de survol
└── data/
    ├── planetData.js      # Données des planètes et lunes (source unique)
    └── constellations.mjs # Constellations et zodiaque
public/textures/           # Textures (copiées telles quelles dans le build)
server.js                  # Petit serveur statique pour dist/
tests/                     # Tests unitaires
```

## À propos des données

Les fiches utilisent des données astronomiques réelles, mais les tailles, distances et
vitesses de la scène 3D sont à l'échelle pédagogique pour une meilleure visualisation.

## Crédits

- Textures des planètes, de la Lune, des anneaux et de la Voie lactée :
  [Solar System Scope](https://www.solarsystemscope.com/textures/), licence
  [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), récupérées via Wikimedia Commons,
  redimensionnées et converties en WebP.
- [three.js](https://threejs.org/) (MIT), [GSAP](https://gsap.com/), [simplex-noise](https://github.com/jwagner/simplex-noise.js) (MIT).

## Licence

Code sous licence [ISC](LICENSE). Les textures restent sous licence CC BY 4.0 (voir ci-dessus).
