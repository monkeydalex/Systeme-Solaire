# Système Solaire — Spec de refonte qualité

**Date :** 2026-06-10
**Statut :** validé par l'utilisateur (terminal + maquettes compagnon visuel)

## Objectif

Faire passer la simulation 3D du système solaire (Three.js + Vite + GSAP) d'un état buggé et terne à une application « extraordinaire » : réalisme photo, interface « Dock cinéma » validée en maquette, lunes, labels 3D et visite guidée cinématique.

## Diagnostic de départ

- Les textures JPG NASA de `textures/` ne sont **jamais chargées** : `Planet.create()` utilise directement les textures procédurales canvas.
- Éclairage cassé : planètes quasi noires (PointLight inadapté au modèle physique de Three.js récent, ambiante négligeable).
- Focus caméra mal cadré (Saturne hors champ), bloom jamais redimensionné, `gsap` utilisé sans import dans `main.js`.
- Code mort : `js/main-fixed.js` (76 Ko), `js/main-direct.js` (16 Ko), `texture-test.html`.

## Phases

### Phase 1 — Corrections fondamentales
- Supprimer le code mort listé ci-dessus.
- `Planet` : charger `data.texture` via `TextureLoader` (colorSpace sRGB) ; en cas d'échec (`onError`), retomber sur la texture procédurale actuelle.
- Éclairage : PointLight solaire sans atténuation (decay 0, intensité ~2,2), ambiante relevée (~0x404060), exposition ajustée.
- `SceneManager.onWindowResize` appelle `PostProcessing.resize`.
- `import gsap from 'gsap'` dans `main.js`.
- Consolider les données réelles (`realFacts` de `main.js`) dans `planetData.js` — source unique.

### Phase 2 — Rendu spectaculaire
- **Soleil** : `ShaderMaterial` animé (bruit FBM, granulation, ramp orange→blanc) + couronne (sprites additifs multicouches). La texture sun.jpg n'est plus utilisée pour la surface.
- **Starfield** : remplacement de l'implémentation dans `SpecialEffects.toggleStars` par 2-3 couches de Points (tailles/couleurs variées, scintillement léger), toujours activé par défaut.
- **Atmosphères Fresnel** (Terre bleue, Vénus ocre) renforcées.
- **Inclinaisons axiales réelles** (`axialTilt` dans planetData ; Uranus ~98°), appliquées au groupe de rotation ; les anneaux suivent l'inclinaison.
- **Anneaux de Saturne** : texture radiale plus fine (bandes + division de Cassini), transparence améliorée.

### Phase 3 — Lunes et labels
- `js/objects/Moon.js` : sphère procédurale en orbite autour de sa planète. Données dans `planetData.js` (`moons` par planète) : Lune (Terre) ; Io, Europe, Ganymède, Callisto (Jupiter) ; Titan (Saturne). Cliquables (raycast) → fiche info.
- `js/ui/Labels.js` : `CSS2DRenderer` en overlay, un label par planète, clic = focus. Toggle dans le popover effets.
- Correction du cadrage focus caméra (notamment Saturne avec anneaux).

### Phase 4 — UI « Dock cinéma » + visite guidée
Maquette validée (`.superpowers/brainstorm/…/dock-design.html`) :
- **Topbar** : titre + sous-titre, discret en haut-gauche.
- **Dock bas centré** : 9 vignettes rondes (dégradés couleur par corps), clic = focus + fiche, vignette active surlignée cyan ; séparateur ; contrôles : pause/lecture, slider vitesse, bouton « Visite guidée », bouton ✦ (popover effets + StarShip + toggles labels/orbites), bouton ⌖ (reset caméra).
- **Fiche latérale droite** : glisse au clic — tag type, nom, aperçu 3D (mini-scène existante), tableau de données, chips lunes cliquables, description. Fermeture ✕.
- **Popover effets** : étoiles, nébuleuse, météores, astéroïdes, comète, station + section StarShip (activer, destination, vitesse, suivre) + labels + orbites.
- `js/core/GuidedTour.js` : enchaîne Mercure→Neptune (focus + fiche, ~6 s par planète), via GSAP/timer, interruptible (re-clic sur le bouton ou interaction dock). 
- Réécriture de `index.html`, `styles.css`, `js/ui/UIManager.js` (mêmes callbacks + nouveaux : tour, labels). Police Outfit conservée.

## Contraintes

- Aucun téléchargement externe : textures locales + génération procédurale.
- Stack inchangé : Vite, Three.js 0.184, GSAP. Pas de framework UI.
- Les fonctionnalités existantes restent : StarShip, effets spéciaux, vitesse de simulation, orbites.

## Vérification (chaque phase)

- `node --check` n'est pas applicable aux modules ES avec imports → vérification par le serveur Vite + Playwright headless (Edge) : zéro erreur console, captures (vue globale, Terre, Saturne, Soleil, lunes, dock, fiche, visite guidée).
- Commit git par phase.

## Hors périmètre

Échelle réaliste (toggle), textures de lunes téléchargées, orbites elliptiques, mode VR, i18n.
