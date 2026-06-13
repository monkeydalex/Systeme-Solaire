# Immersion & interaction — Design

Date : 2026-06-13

## Objectif

Renforcer l'immersion et le dynamisme du simulateur de système solaire selon quatre
axes : audio procédural, feedback visuel des interactions, exploration enrichie, et
première impression (onboarding). Le tout sans dépendances lourdes, hors-ligne, en
respectant le style et l'architecture existants (modules autonomes branchés sur les
callbacks de `UIManager`/`main.js`, comme `SpecialEffects` et `Labels`).

## Critères de succès

- L'ambiance et les sons d'interaction fonctionnent sans aucun fichier asset ni
  dépendance externe (Web Audio API), démarrent seulement après un geste utilisateur,
  et sont entièrement coupables.
- Survoler un corps le met en évidence (curseur, halo, label) ; le focaliser produit
  une transition caméra cinématique et une onde brève.
- Une infobulle légère apparaît au survol sans ouvrir la fiche.
- Le premier chargement présente un écran animé, un court vol de caméra skippable, et
  une astuce one-shot.
- Aucune régression : les fonctionnalités existantes (constellations, fiches, dock,
  visite guidée, StarShip, modes d'échelle) continuent de marcher.

## Architecture

Nouveaux modules autonomes, chacun avec une responsabilité unique :

```
js/
├── audio/
│   └── AudioManager.js     # Synthèse Web Audio : ambiance + SFX, master gain/mute
├── core/
│   └── Interactions.js     # Survol (raycast), curseur, halo, infobulle, onde au clic
└── ui/
    └── Onboarding.js       # Écran de chargement animé, intro caméra, astuce one-shot
```

Intégration : `main.js` instancie ces modules et les relie aux interactions existantes
(raycasting, focus caméra, callbacks d'UI). `UIManager` expose les nouveaux contrôles
(bouton audio, volume). Aucune réécriture des modules existants — seulement des points
de branchement.

Principe transverse : chaque effet est **activable/désactivable** et **dégradable**
(si l'audio n'est pas débloqué, le reste fonctionne ; si un corps n'est pas survolable,
pas d'erreur).

## Livraison

Spec globale, implémentation **par phases** vérifiées dans le navigateur, dans l'ordre :
1. Audio → 2. Feedback visuel → 3. Exploration → 4. Onboarding.

Chaque phase est autonome et laisse l'application dans un état fonctionnel.

---

## Phase 1 — Audio procédural (`AudioManager.js`)

**Rôle.** Générer toute l'ambiance et les sons d'interaction par synthèse, via un
unique `AudioContext`.

**Contrainte navigateur.** Les navigateurs bloquent l'audio avant un geste utilisateur.
L'audio est donc **coupé par défaut** ; le `AudioContext` est créé/repris (`resume()`)
au premier clic sur le bouton audio, avec un fondu d'entrée.

**Composants sonores.**
- *Ambiance* (`startAmbient()` / `stopAmbient()`) : 2-3 oscillateurs désaccordés
  (basse fréquence) → un `BiquadFilter` lowpass dont la fréquence de coupure est
  modulée par un LFO lent → une réverb légère par réseau de `DelayNode` avec feedback
  (pas de fichier d'impulsion) → master gain. Bourdon spatial évolutif, en boucle continue.
- *SFX synthétisés* (déclenchés ponctuellement, chacun crée et libère ses nœuds) :
  - `playHover()` : blip court et doux (oscillateur sinus + enveloppe rapide).
  - `playSelect()` : carillon (deux partiels harmoniques, enveloppe douce).
  - `playWhoosh()` : bruit blanc filtré avec balayage de coupure (transition caméra).
  - StarShip : `startEngine()` / `stopEngine()` (rumble bouclé bas pendant le voyage).
  - `playClick()` : clic d'UI discret.

**Interface publique.**
- `enable()` : crée/reprend le contexte, démarre l'ambiance, fondu d'entrée. Idempotent.
- `setMuted(bool)` / `setVolume(0..1)` : master gain.
- `isEnabled()` : état.
- Les `play*` / `start*` / `stop*` ci-dessus sont sans effet tant que `enable()` n'a
  pas été appelé (dégradation silencieuse).

**Contrôles UI.**
- Bouton `🔊 / 🔇` dans le dock (à côté de `✦`/`⌖`) : bascule enable/mute.
- Curseur de volume dans l'onglet **Affichage** du popover.

**Branchements `main.js` / `UIManager`.**
- Survol d'un corps (Phase 2) → `playHover()`.
- Focus d'un corps (clic/label/dock/visite) → `playSelect()` + `playWhoosh()`.
- Début/fin de voyage StarShip → `startEngine()` / `stopEngine()`.
- Boutons/onglets de l'UI → `playClick()`.

**Tests.** `tests/audioManager.test.mjs` avec un `AudioContext` factice (mock minimal
des nœuds) : vérifier que `enable()` est idempotent, que `setMuted`/`setVolume`
ajustent le gain, et que les `play*` ne lèvent pas d'erreur avant `enable()`.

## Phase 2 — Feedback & dynamisme visuel (`Interactions.js`)

**Rôle.** Centraliser le survol et le retour visuel, à partir du raycasting existant
(extrait de `main.js` `setupRaycasting`, étendu au survol).

**Survol (`pointermove`).** Raycast sur les sphères planètes+lunes :
- corps survolé → curseur `pointer`, léger halo (montée d'`emissiveIntensity` ou
  `scale` pulsé via un facteur appliqué dans la boucle), surlignage du label
  correspondant (classe CSS), déclenche `audio.playHover()` (anti-spam : seulement au
  changement de corps survolé).
- aucun corps → réinitialise curseur, halo, label.

**Onde au clic.** À la focalisation d'un corps, afficher une onde concentrique brève :
un `RingGeometry`/sprite transparent centré sur le corps, animé en expansion + fondu
(gsap), puis retiré. Géré dans `Interactions` (ou un petit helper d'effet).

**Transition caméra cinématique.** Le focus actuel lerp chaque frame. On ajoute, au
*déclenchement* d'un focus, un tween gsap eased de la caméra et de la cible vers la
position de cadrage calculée (réutilise `getFocusTarget`), interruptible par toute
nouvelle interaction (cohérent avec l'arrêt de la visite guidée). Le suivi continu
(corps en mouvement) reste géré par le lerp existant une fois la transition finie.

**Interface.** `Interactions` reçoit `{ camera, controls, scene, bodies, callbacks }`
et expose `update()` (appelé dans la boucle, pour le pulse de halo) + gère ses propres
écouteurs `pointermove`/`click`. Le `click` de focalisation réutilise/remplace le
`setupRaycasting` actuel pour éviter la double gestion.

**Tests.** Logique pure testable : fonction de sélection du corps survolé à partir
d'intersections (mock), et calcul d'état de halo. Le rendu visuel est vérifié dans le
navigateur (captures).

## Phase 3 — Exploration enrichie

**Infobulle au survol.** Un `<div id="hover-tooltip">` positionné près du curseur
(coordonnées écran du `pointermove`), affichant `nom` + un fait clé (type, ou distance).
Alimenté par l'événement de survol de la Phase 2 (réutilise `bodyIndex`/données).
Masqué quand aucun corps n'est survolé. N'ouvre pas la fiche.

**Repères de vitesse du temps.** Sous le slider de vitesse du dock, ajouter des repères
textuels donnant du sens à l'échelle (ex. « lent · ×1 · rapide » ou paliers).
Purement informatif, branché sur la valeur du slider. Implémentation CSS/HTML légère,
sans changer la logique de `onSpeedChange`.

**Tests.** Formatage de l'infobulle (fonction pure nom+fait) testable si extrait ;
sinon vérification navigateur.

## Phase 4 — Première impression / onboarding (`Onboarding.js`)

**Écran de chargement animé.** Remplacer le `#loading-message` statique par un visuel
animé (CSS/SVG : un soleil pulsant et des orbites qui s'esquissent). Masqué une fois la
scène prête (déjà géré par `main.js`), avec un fondu de sortie.

**Intro cinématique (1ᵉʳ chargement).** Après le chargement, un court vol de caméra
(gsap, ~3-4 s) partant d'un plan large pour se poser sur la vue d'ensemble. **Skippable**
(bouton « Passer » + n'importe quel clic/touche l'interrompt). Déclenche un `playWhoosh()`
si l'audio est actif. N'apparaît qu'au premier chargement de session (drapeau
`localStorage`), pour ne pas gêner les visites répétées.

**Astuce découvrable.** Un toast one-shot (« Survolez ou cliquez une planète pour
l'explorer ») affiché après l'intro, refermable, mémorisé via `localStorage`.

**Interface.** `Onboarding` reçoit `{ camera, controls, onComplete }` et expose
`playIntro()` ; il lit/écrit ses drapeaux `localStorage`. Aucune dépendance aux autres
phases (mais déclenche un son si `AudioManager` est actif).

**Tests.** Logique de drapeau « première visite » (lecture/écriture `localStorage`)
testable avec un mock ; visuel vérifié dans le navigateur.

---

## Hors-périmètre (YAGNI)

- Pas de fichiers audio ni de bibliothèque audio externe.
- Pas de parallaxe de fond, ni de comparateur de tailles dédié (pourront faire l'objet
  d'une itération ultérieure).
- Pas de refonte des modules existants ; uniquement des points de branchement.
- Pas de réglages audio fins par effet (un seul volume maître suffit).

## Risques & parades

- *Autoplay bloqué* → audio off par défaut, déblocage explicite au geste utilisateur.
- *Spam de sons au survol* → ne jouer `playHover` qu'au changement de corps survolé.
- *Multi-onglets de preview faussant la vérif* (déjà rencontré) → vérifier sur un
  contexte propre, privilégier les assertions DOM/synchrones aux captures quand le
  rendu n'est pas en jeu.
- *Coût en frames du raycast au `pointermove`* → throttling léger si nécessaire.
