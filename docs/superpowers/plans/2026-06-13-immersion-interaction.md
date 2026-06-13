# Immersion & Interaction — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add procedural ambient/interaction audio, richer interaction feedback, hover-based exploration, and a polished first-impression onboarding to the Three.js solar-system simulator.

**Architecture:** Three new self-contained ES modules (`AudioManager`, `Interactions`, `Onboarding`) wired into the existing `main.js`/`UIManager` callback structure, mirroring the existing `SpecialEffects`/`Labels` pattern. Pure, node-testable logic lives in `.mjs` files (like `ScaleModes.mjs`); browser glue is verified in the live preview. Each feature is independently toggleable and degrades gracefully.

**Tech Stack:** Vanilla ES modules, Three.js, gsap (already deps), Web Audio API (no new deps, no assets), `node --test` for unit tests, Vite dev server + preview tools for browser verification.

---

## Conventions for this plan

- Unit tests run with `npm test` (`node --test tests/*.test.mjs`). Testable logic is authored in `.mjs` files so node can import it as ESM.
- "Verify in browser" steps assume the Vite dev server is running (`preview_start` name `systeme-solaire`, port 3000) on a **clean single context** (close stray preview tabs; a fresh `preview_stop`+`preview_start` avoids background-tab rAF throttling that breaks screenshots).
- Commit messages end with the project's Co-Authored-By trailer.
- Existing integration anchors (no exact line numbers — they shift):
  - `main.js`: `App.init()` builds `sceneManager` (`scene`/`camera`/`renderer`/`controls`), `planets`, `moons`, `effectsManager`, `uiManager`; `focusBody(key, openPanel, fromTour)`; `setupRaycasting()`; `getFocusTarget(key)`; `animate()` loop with the `if (this.focusedPlanetKey)` focus-lerp block; the `new UIManager({...callbacks})` object.
  - `UIManager`: `setupDockControls()`, `setupEffectsPopover()` (tabs), the `callbacks` object.
  - `index.html`: `#dock .dock-controls` (buttons `pause-btn`, `effects-btn`, `reset-camera-btn`), `#speed-slider`, the `affichage` popover panel, `#loading-message`.

---

## File Structure

- Create `js/audio/AudioManager.mjs` — Web Audio synthesis: context, master gain, ambient drone, SFX, engine loop. Pure of DOM/THREE; takes an injectable context factory for testing.
- Create `js/core/Interactions.mjs` — exports pure `pickHovered()` + the `Interactions` class (hover raycast, cursor/label/halo feedback, click→focus, click ripple, cinematic camera tween). Imports THREE.
- Create `js/ui/Onboarding.mjs` — exports pure `shouldPlayIntro()` + `Onboarding` class (animated loader fade, skippable intro flight, one-shot tip toast). Imports gsap.
- Create `js/ui/tooltip.mjs` — exports pure `formatTooltip()` used by the hover tooltip.
- Modify `js/main.js` — instantiate the three modules; wire audio to focus/starship/UI; replace `setupRaycasting` with `Interactions`; call `interactions.update()` and audio updates in the loop.
- Modify `js/ui/UIManager.js` — add dock audio button handler, volume slider handler, speed-marker rendering; expose new callbacks.
- Modify `index.html` — dock audio button, volume slider in Affichage panel, speed markers, hover tooltip element, tip toast element, animated loader markup.
- Modify `styles.css` — audio button, volume slider, speed markers, tooltip, tip toast, animated loader, intro skip button.
- Create tests: `tests/audioManager.test.mjs`, `tests/interactions.test.mjs`, `tests/tooltip.test.mjs`, `tests/onboarding.test.mjs`.

---

# PHASE 1 — Procedural Audio

## Task 1: AudioManager core (context, master gain, enable/mute/volume)

**Files:**
- Create: `js/audio/AudioManager.mjs`
- Test: `tests/audioManager.test.mjs`

- [ ] **Step 1: Write the failing test**

```javascript
// tests/audioManager.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { AudioManager } from '../js/audio/AudioManager.mjs';

// Minimal fake Web Audio graph: every node records connections and param sets.
function makeFakeContext() {
    const make = (type) => ({
        type,
        connections: [],
        connect(n) { this.connections.push(n); return n; },
        disconnect() { this.connections = []; }
    });
    const param = () => ({
        value: 0,
        setValueAtTime(v) { this.value = v; return this; },
        linearRampToValueAtTime(v) { this.value = v; return this; },
        exponentialRampToValueAtTime(v) { this.value = v; return this; }
    });
    return {
        state: 'suspended',
        currentTime: 0,
        destination: make('destination'),
        resumed: 0,
        resume() { this.state = 'running'; this.resumed++; return Promise.resolve(); },
        createGain() { const g = make('gain'); g.gain = param(); return g; },
        createOscillator() {
            const o = make('osc'); o.frequency = param(); o.detune = param();
            o.type = 'sine'; o.started = false;
            o.start = () => { o.started = true; }; o.stop = () => {};
            return o;
        },
        createBiquadFilter() { const f = make('filter'); f.frequency = param(); f.Q = param(); f.type = 'lowpass'; return f; },
        createDelay() { const d = make('delay'); d.delayTime = param(); return d; },
        createBufferSource() { const s = make('bufsrc'); s.start = () => {}; s.stop = () => {}; return s; },
        createBuffer() { return { getChannelData: () => new Float32Array(8) }; },
        sampleRate: 44100
    };
}

test('AudioManager: disabled by default, play* are no-ops before enable', () => {
    const am = new AudioManager(makeFakeContext);
    assert.equal(am.isEnabled(), false);
    // Must not throw when not enabled:
    am.playHover();
    am.playSelect();
    am.playClick();
    am.startEngine();
    am.stopEngine();
    assert.equal(am.isEnabled(), false);
});

test('AudioManager: enable() is idempotent and resumes the context once', async () => {
    const ctx = makeFakeContext();
    const am = new AudioManager(() => ctx);
    await am.enable();
    await am.enable();
    assert.equal(am.isEnabled(), true);
    assert.equal(ctx.resumed >= 1, true);
    // Only one context created/resumed; a second enable does not recreate it.
    assert.equal(am.ctx, ctx);
});

test('AudioManager: setVolume and setMuted drive the master gain', async () => {
    const am = new AudioManager(makeFakeContext);
    await am.enable();
    am.setVolume(0.5);
    assert.equal(am.master.gain.value, 0.5);
    am.setMuted(true);
    assert.equal(am.master.gain.value, 0);
    am.setMuted(false);
    assert.equal(am.master.gain.value, 0.5);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '../js/audio/AudioManager.mjs'`.

- [ ] **Step 3: Write minimal implementation**

```javascript
// js/audio/AudioManager.mjs
// Synthèse audio procédurale (Web Audio). Aucune dépendance, aucun asset.
// Coupé par défaut : enable() doit être appelé suite à un geste utilisateur.
export class AudioManager {
    // contextFactory : () => AudioContext (injectable pour les tests)
    constructor(contextFactory) {
        this.contextFactory = contextFactory
            || (() => new (window.AudioContext || window.webkitAudioContext)());
        this.ctx = null;
        this.master = null;
        this.volume = 0.5;
        this.muted = false;
        this.enabled = false;
        this.ambient = null;
        this.engine = null;
    }

    isEnabled() { return this.enabled; }

    async enable() {
        if (this.enabled) return;
        if (!this.ctx) {
            this.ctx = this.contextFactory();
            this.master = this.ctx.createGain();
            this.master.gain.setValueAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime);
            this.master.connect(this.ctx.destination);
        }
        if (this.ctx.state === 'suspended') await this.ctx.resume();
        this.enabled = true;
    }

    setVolume(v) {
        this.volume = v;
        if (this.master && !this.muted) this.master.gain.setValueAtTime(v, this.ctx.currentTime);
    }

    setMuted(m) {
        this.muted = m;
        if (this.master) this.master.gain.setValueAtTime(m ? 0 : this.volume, this.ctx.currentTime);
    }

    // Stubs remplis dans les tâches suivantes ; no-op tant que non activé.
    playHover() {}
    playSelect() {}
    playWhoosh() {}
    playClick() {}
    startEngine() {}
    stopEngine() {}
    startAmbient() {}
    stopAmbient() {}
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS (all three AudioManager tests + existing tests).

- [ ] **Step 5: Commit**

```bash
git add js/audio/AudioManager.mjs tests/audioManager.test.mjs
git commit -m "feat(audio): AudioManager core (context, master gain, mute/volume)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Ambient drone

**Files:**
- Modify: `js/audio/AudioManager.mjs` (`startAmbient`/`stopAmbient`, called from `enable`)
- Test: `tests/audioManager.test.mjs`

- [ ] **Step 1: Write the failing test**

Append to `tests/audioManager.test.mjs`:

```javascript
test('AudioManager: enable() starts the ambient drone, stopAmbient clears it', async () => {
    const am = new AudioManager(makeFakeContext);
    await am.enable();
    assert.ok(am.ambient, 'ambient should be created on enable');
    assert.equal(Array.isArray(am.ambient.nodes), true);
    assert.ok(am.ambient.nodes.length >= 3, 'ambient builds several nodes');
    am.stopAmbient();
    assert.equal(am.ambient, null);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `am.ambient` is `null` (startAmbient is a stub).

- [ ] **Step 3: Write minimal implementation**

In `AudioManager.mjs`, at the end of `enable()` (after `this.enabled = true;`) add:

```javascript
        this.startAmbient();
```

Replace the `startAmbient`/`stopAmbient` stubs with:

```javascript
    // Bourdon spatial : oscillateurs désaccordés → lowpass modulé par LFO → delay/feedback.
    startAmbient() {
        if (!this.ctx || this.ambient) return;
        const t = this.ctx.currentTime;
        const out = this.ctx.createGain();
        out.gain.setValueAtTime(0, t);
        out.gain.linearRampToValueAtTime(0.18, t + 3); // fondu d'entrée

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(420, t);
        filter.Q.setValueAtTime(6, t);

        // Réverb légère : delay avec feedback
        const delay = this.ctx.createDelay();
        delay.delayTime.setValueAtTime(0.34, t);
        const feedback = this.ctx.createGain();
        feedback.gain.setValueAtTime(0.45, t);
        delay.connect(feedback);
        feedback.connect(delay);

        const oscs = [];
        const freqs = [55, 82.4, 110]; // La grave + quinte + octave
        for (const f of freqs) {
            const o = this.ctx.createOscillator();
            o.type = 'sawtooth';
            o.frequency.setValueAtTime(f, t);
            o.detune.setValueAtTime((Math.random() * 12) - 6, t);
            o.connect(filter);
            o.start();
            oscs.push(o);
        }

        // LFO lent module la coupure du filtre
        const lfo = this.ctx.createOscillator();
        lfo.frequency.setValueAtTime(0.05, t);
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.setValueAtTime(180, t);
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);
        lfo.start();

        filter.connect(out);
        filter.connect(delay);
        delay.connect(out);
        out.connect(this.master);

        this.ambient = { nodes: [...oscs, lfo, filter, delay, feedback, lfoGain, out], out };
    }

    stopAmbient() {
        if (!this.ambient) return;
        for (const n of this.ambient.nodes) {
            if (n.stop) { try { n.stop(); } catch {} }
            if (n.disconnect) n.disconnect();
        }
        this.ambient = null;
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add js/audio/AudioManager.mjs tests/audioManager.test.mjs
git commit -m "feat(audio): evolving ambient space drone

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Interaction SFX + StarShip engine

**Files:**
- Modify: `js/audio/AudioManager.mjs`
- Test: `tests/audioManager.test.mjs`

- [ ] **Step 1: Write the failing test**

Append to `tests/audioManager.test.mjs`:

```javascript
test('AudioManager: SFX trigger without error once enabled, engine toggles state', async () => {
    const am = new AudioManager(makeFakeContext);
    await am.enable();
    am.playHover();
    am.playSelect();
    am.playWhoosh();
    am.playClick();
    assert.equal(am.engine, null);
    am.startEngine();
    assert.ok(am.engine, 'engine running');
    am.startEngine(); // idempotent
    am.stopEngine();
    assert.equal(am.engine, null);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `am.engine` stays `null` (startEngine is a stub).

- [ ] **Step 3: Write minimal implementation**

Replace the `playHover/playSelect/playWhoosh/playClick/startEngine/stopEngine` stubs with:

```javascript
    // Enveloppe utilitaire : oscillateur ponctuel.
    _blip({ type = 'sine', freq = 440, freqTo = null, dur = 0.12, gain = 0.2 }) {
        if (!this.ctx || !this.enabled) return;
        const t = this.ctx.currentTime;
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = type;
        o.frequency.setValueAtTime(freq, t);
        if (freqTo !== null) o.frequency.exponentialRampToValueAtTime(freqTo, t + dur);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g);
        g.connect(this.master);
        o.start(t);
        o.stop(t + dur + 0.02);
    }

    playHover() { this._blip({ type: 'sine', freq: 880, dur: 0.08, gain: 0.06 }); }

    playSelect() {
        this._blip({ type: 'triangle', freq: 523.25, dur: 0.18, gain: 0.12 });
        this._blip({ type: 'sine', freq: 783.99, dur: 0.22, gain: 0.08 });
    }

    playClick() { this._blip({ type: 'square', freq: 320, dur: 0.04, gain: 0.05 }); }

    // Whoosh : bruit filtré balayé.
    playWhoosh() {
        if (!this.ctx || !this.enabled) return;
        const t = this.ctx.currentTime;
        const dur = 0.6;
        const buffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * dur), this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        const src = this.ctx.createBufferSource();
        src.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(300, t);
        filter.frequency.exponentialRampToValueAtTime(2200, t + dur);
        filter.Q.setValueAtTime(0.8, t);
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.12, t + 0.08);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        src.connect(filter);
        filter.connect(g);
        g.connect(this.master);
        src.start(t);
        src.stop(t + dur);
    }

    // Moteur StarShip : rumble bouclé bas.
    startEngine() {
        if (!this.ctx || !this.enabled || this.engine) return;
        const t = this.ctx.currentTime;
        const o = this.ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(48, t);
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(180, t);
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.1, t + 0.4);
        o.connect(filter);
        filter.connect(g);
        g.connect(this.master);
        o.start();
        this.engine = { o, filter, g };
    }

    stopEngine() {
        if (!this.engine) return;
        const t = this.ctx.currentTime;
        this.engine.g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
        const { o } = this.engine;
        try { o.stop(t + 0.35); } catch {}
        this.engine = null;
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add js/audio/AudioManager.mjs tests/audioManager.test.mjs
git commit -m "feat(audio): interaction SFX (hover/select/whoosh/click) and ship engine

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Audio UI controls + wiring (dock button, volume, focus/ship/UI sounds)

**Files:**
- Modify: `index.html` (dock button, volume slider in Affichage panel)
- Modify: `js/ui/UIManager.js` (handlers + callbacks)
- Modify: `js/main.js` (instantiate AudioManager, wire callbacks, focus/ship sounds)
- Modify: `styles.css` (audio button state)

- [ ] **Step 1: Add the dock audio button**

In `index.html`, inside `.dock-controls`, add the audio button just before `reset-camera-btn`:

```html
            <button id="audio-btn" class="dock-btn" title="Activer le son">🔇</button>
```

- [ ] **Step 2: Add the volume control to the Affichage panel**

In `index.html`, inside `<section class="popover-panel" data-panel="affichage">`, after the orbit-opacity label, add:

```html
            <label class="popover-label">Volume <span id="audio-volume-value">50</span> %
                <input type="range" id="audio-volume" min="0" max="100" value="50">
            </label>
```

- [ ] **Step 3: Wire the UIManager handlers**

In `js/ui/UIManager.js`, inside `setupDockControls()`, add (near the other dock buttons):

```javascript
        const audioBtn = document.getElementById('audio-btn');
        audioBtn.addEventListener('click', () => {
            const active = audioBtn.classList.toggle('active');
            audioBtn.textContent = active ? '🔊' : '🔇';
            audioBtn.title = active ? 'Couper le son' : 'Activer le son';
            this.callbacks.onAudioToggle(active);
        });
```

In `setupEffectsPopover()`, after the `zodiac-only` listener, add:

```javascript
        document.getElementById('audio-volume').addEventListener('input', (e) => {
            const val = parseInt(e.target.value, 10);
            document.getElementById('audio-volume-value').textContent = val;
            if (this.callbacks.onVolumeChange) this.callbacks.onVolumeChange(val / 100);
        });
```

- [ ] **Step 4: Instantiate and wire AudioManager in main.js**

In `js/main.js`, add the import at the top:

```javascript
import { AudioManager } from './audio/AudioManager.mjs';
```

In `App.init()`, after `this.effectsManager` is created, add:

```javascript
        // Audio procédural (coupé tant que l'utilisateur ne l'active pas)
        this.audio = new AudioManager();
```

In the `new UIManager({...})` callbacks object, add:

```javascript
            onAudioToggle: async (active) => {
                if (active) {
                    await this.audio.enable();
                    this.audio.setMuted(false);
                } else {
                    this.audio.setMuted(true);
                }
            },
            onVolumeChange: (val) => {
                this.audio.setVolume(val);
            },
```

In `focusBody(key, openPanel, fromTour)`, near the top (after the tour-stop guard), add:

```javascript
        if (this.audio) { this.audio.playSelect(); this.audio.playWhoosh(); }
```

In the `onStarshipTarget` callback, after `this.starship.travelTo(planetKey);`, add:

```javascript
                if (this.audio) this.audio.startEngine();
```

In `App.init()`, after the UIManager is constructed, add a delegated UI click sound (dock + popover buttons, excluding planet/audio which have their own handling):

```javascript
        // Petit clic d'UI sur les boutons du dock et du popover
        const uiClick = (e) => {
            if (this.audio && this.audio.isEnabled() && e.target.closest('button')) {
                this.audio.playClick();
            }
        };
        document.getElementById('effects-popover').addEventListener('click', uiClick);
```

In `animate()`, where the StarShip status is updated, stop the engine when it finishes traveling. Replace the StarShip status block:

```javascript
        if (this.starship && this.starship.group.visible) {
            this.starship.update(speed);
            const status = this.starship.getStatus();
            this.uiManager.updateStarshipStatus(status);
            if (this.audio) {
                if (status.state === 'traveling') this.audio.startEngine();
                else this.audio.stopEngine();
            }
        }
```

- [ ] **Step 5: Add audio button active style**

In `styles.css`, after the existing `.dock-btn` rules (search `#tour-btn` block region / `.dock-btn`), add:

```css
#audio-btn.active {
    color: var(--accent);
    border-color: var(--accent);
}
```

- [ ] **Step 6: Verify in browser**

Start clean: `preview_stop` (if running) then `preview_start` `systeme-solaire`.
- `preview_eval`: click `#audio-btn`, assert it becomes `active` and text `🔊`.
- `preview_console_logs` level error → none.
- `preview_eval`: click a dock planet (`.dock-planet[data-planet="mars"]`), confirm no console error (select+whoosh sounds fire; audio is audible locally — in headless we assert no throw and `audio.isEnabled()` via a temporary `window.__audioEnabled` probe is NOT required; rely on no-error).

Expected: button toggles, no errors.

- [ ] **Step 7: Commit**

```bash
git add index.html js/ui/UIManager.js js/main.js styles.css
git commit -m "feat(audio): dock toggle + volume, focus/ship/UI sound wiring

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

# PHASE 2 — Interaction Feedback & Dynamism

## Task 5: `pickHovered` pure helper + Interactions module skeleton

**Files:**
- Create: `js/core/Interactions.mjs`
- Test: `tests/interactions.test.mjs`

- [ ] **Step 1: Write the failing test**

```javascript
// tests/interactions.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { pickHovered } from '../js/core/Interactions.mjs';

test('pickHovered: returns the key of the first intersected body mesh', () => {
    const meshA = { id: 'a' }, meshB = { id: 'b' };
    const bodies = { terre: { mesh: meshA }, mars: { mesh: meshB } };
    assert.equal(pickHovered([{ object: meshB }], bodies), 'mars');
    assert.equal(pickHovered([{ object: meshA }, { object: meshB }], bodies), 'terre');
});

test('pickHovered: returns null when nothing matches', () => {
    const bodies = { terre: { mesh: { id: 'a' } } };
    assert.equal(pickHovered([], bodies), null);
    assert.equal(pickHovered([{ object: { id: 'z' } }], bodies), null);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '../js/core/Interactions.mjs'`.

- [ ] **Step 3: Write minimal implementation**

```javascript
// js/core/Interactions.mjs
import * as THREE from 'three';
import gsap from 'gsap';

// Logique pure : quel corps est survolé d'après les intersections du raycaster.
export function pickHovered(intersects, bodies) {
    if (!intersects || intersects.length === 0) return null;
    const mesh = intersects[0].object;
    for (const key of Object.keys(bodies)) {
        if (bodies[key].mesh === mesh) return key;
    }
    return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add js/core/Interactions.mjs tests/interactions.test.mjs
git commit -m "feat(interactions): pickHovered pure helper

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: Interactions class — hover feedback + click→focus (replaces setupRaycasting)

**Files:**
- Modify: `js/core/Interactions.mjs`
- Modify: `js/main.js` (replace `setupRaycasting()` usage with `Interactions`)
- Modify: `js/ui/Labels.js` (expose a way to highlight a label) — see step
- Modify: `styles.css` (`.planet-label.hovered`, body cursor)

- [ ] **Step 1: Add the Interactions class**

Append to `js/core/Interactions.mjs`:

```javascript
// Gère le survol (raycast), le curseur, le surlignage de label, le clic→focus,
// et déclenche les sons de survol. Branché sur la scène existante.
export class Interactions {
    constructor({ domElement, camera, bodies, onFocus, onHover }) {
        this.domElement = domElement;
        this.camera = camera;
        this.bodies = bodies;
        this.onFocus = onFocus;     // (key) => void
        this.onHover = onHover;     // (key|null, clientX, clientY) => void
        this.raycaster = new THREE.Raycaster();
        this.pointer = new THREE.Vector2();
        this.hoveredKey = null;

        this._meshes = Object.values(bodies).map(b => b.mesh);
        this._onMove = this._onMove.bind(this);
        this._onClick = this._onClick.bind(this);
        window.addEventListener('pointermove', this._onMove);
        window.addEventListener('click', this._onClick);
    }

    _raycast(event) {
        this.pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
        this.raycaster.setFromCamera(this.pointer, this.camera);
        return this.raycaster.intersectObjects(this._meshes);
    }

    _onMove(event) {
        const key = pickHovered(this._raycast(event), this.bodies);
        if (key !== this.hoveredKey) {
            this.hoveredKey = key;
            document.body.style.cursor = key ? 'pointer' : '';
        }
        this.onHover(key, event.clientX, event.clientY);
    }

    _onClick(event) {
        if (event.target.tagName !== 'CANVAS') return;
        const key = pickHovered(this._raycast(event), this.bodies);
        if (key) this.onFocus(key);
    }

    // Pulsation douce du corps survolé (appelée dans la boucle de rendu)
    update() {
        const tdummy = performance.now() * 0.004;
        for (const key of Object.keys(this.bodies)) {
            const mesh = this.bodies[key].mesh;
            if (!mesh || !mesh.scale) continue;
            const base = mesh.userData._baseScale || (mesh.userData._baseScale = mesh.scale.x);
            const target = key === this.hoveredKey ? base * (1 + 0.04 + 0.02 * Math.sin(tdummy)) : base;
            mesh.scale.setScalar(THREE.MathUtils.lerp(mesh.scale.x, target, 0.2));
        }
    }

    // À appeler quand l'échelle des corps change (mode d'échelle) : les tailles
    // de repos mises en cache deviennent obsolètes.
    resetBaseScales() {
        for (const key of Object.keys(this.bodies)) {
            const mesh = this.bodies[key].mesh;
            if (mesh && mesh.userData) mesh.userData._baseScale = undefined;
        }
    }

    dispose() {
        window.removeEventListener('pointermove', this._onMove);
        window.removeEventListener('click', this._onClick);
    }
}
```

- [ ] **Step 2: Add label highlight support in Labels.js**

In `js/ui/Labels.js`, store key→div and add a method. After the loop that builds labels (where `this.objects.push(labelObj)`), also keep the element keyed. Change the loop body to also record:

```javascript
            this.objects.push(labelObj);
            (this.labelDivs || (this.labelDivs = {}))[key] = div;
```

Add this method to the `Labels` class:

```javascript
    highlight(key) {
        if (!this.labelDivs) return;
        for (const [k, div] of Object.entries(this.labelDivs)) {
            div.classList.toggle('hovered', k === key);
        }
    }
```

- [ ] **Step 3: Replace setupRaycasting wiring in main.js**

In `js/main.js`, add the import:

```javascript
import { Interactions } from './core/Interactions.mjs';
```

Remove the `this.setupRaycasting();` call and the `setupRaycasting()` method body usage by replacing the call site (keep the method for now or delete it). Replace `this.setupRaycasting();` with:

```javascript
        // Survol + clic → focus, via le module Interactions
        this.interactions = new Interactions({
            domElement: renderer.domElement,
            camera,
            bodies: { ...this.planets, ...this.moons },
            onFocus: (key) => this.focusBody(key),
            onHover: (key) => {
                if (this.labels) this.labels.highlight(key);
                if (key && key !== this._lastHoverKey && this.audio) this.audio.playHover();
                this._lastHoverKey = key;
            }
        });
```

Delete the now-unused `setupRaycasting()` method (its click logic is replaced by `Interactions._onClick`).

In `animate()`, after the effects update, add:

```javascript
        if (this.interactions) this.interactions.update();
```

In `applyScaleMode(modeKey)`, after the loop that re-applies scale data to planets/moons, invalidate the cached hover base scales:

```javascript
        if (this.interactions) this.interactions.resetBaseScales();
```

- [ ] **Step 4: Add hover styles**

In `styles.css`, after `.planet-label:hover`, add:

```css
.planet-label.hovered {
    color: var(--accent);
    border-color: var(--accent);
    background: rgba(10, 14, 30, 0.8);
}
```

- [ ] **Step 5: Verify in browser**

Clean restart. Then:
- `preview_eval`: dispatch a `pointermove` over the canvas center and read `document.body.style.cursor` — won't reliably hit a planet by coords, so instead assert no console errors and that `interactions` exists by probing a focus: click a dock planet and confirm the panel opens (focus path still works through `Interactions` not being required for dock).
- `preview_eval`: simulate a canvas click at a known planet — hard via coords. Acceptable check: confirm clicking the canvas does not throw and dock-driven focus still works.
- `preview_console_logs` error → none.
- `preview_screenshot` to confirm scene still renders.

Expected: no errors, scene renders, dock focus works.

- [ ] **Step 6: Commit**

```bash
git add js/core/Interactions.mjs js/main.js js/ui/Labels.js styles.css
git commit -m "feat(interactions): hover highlight + cursor + hover sound, unified click→focus

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: Click ripple + cinematic camera tween

**Files:**
- Modify: `js/main.js` (`focusBody` triggers a gsap camera tween; spawn a ripple ring)
- Modify: `js/core/Interactions.mjs` (ripple helper) OR inline in main — implemented in main for scene access

- [ ] **Step 1: Add a ripple + tween to focusBody**

In `js/main.js`, add a helper method to `App`:

```javascript
    // Onde concentrique brève au point focalisé
    spawnFocusRipple(worldPos, radius) {
        const scene = this.sceneManager.scene;
        const geo = new THREE.RingGeometry(radius * 1.05, radius * 1.18, 48);
        const mat = new THREE.MeshBasicMaterial({
            color: 0x9fd8ff, transparent: true, opacity: 0.8,
            side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending
        });
        const ring = new THREE.Mesh(geo, mat);
        ring.position.copy(worldPos);
        ring.quaternion.copy(this.sceneManager.camera.quaternion); // face caméra
        scene.add(ring);
        gsap.to(ring.scale, { x: 3, y: 3, z: 3, duration: 0.9, ease: 'power2.out' });
        gsap.to(mat, {
            opacity: 0, duration: 0.9, ease: 'power2.out',
            onComplete: () => { scene.remove(ring); geo.dispose(); mat.dispose(); }
        });
    }

    // Vol de caméra eased vers le cadrage d'un corps (interruptible)
    cinematicFocus(key) {
        const target = this.getFocusTarget(key);
        if (!target) return;
        const { pos, dist } = target;
        const dirToSun = pos.clone().negate().normalize();
        const side = new THREE.Vector3().crossVectors(dirToSun, new THREE.Vector3(0, 1, 0)).normalize();
        const camPos = key === 'soleil'
            ? pos.clone().add(new THREE.Vector3(dist, dist * 0.4, dist))
            : pos.clone().addScaledVector(dirToSun, dist * 0.8).addScaledVector(side, dist * 0.5).add(new THREE.Vector3(0, dist * 0.35, 0));

        this.focusTweening = true;
        gsap.killTweensOf(this.sceneManager.camera.position);
        gsap.killTweensOf(this.sceneManager.controls.target);
        gsap.to(this.sceneManager.camera.position, { x: camPos.x, y: camPos.y, z: camPos.z, duration: 1.4, ease: 'power3.inOut' });
        gsap.to(this.sceneManager.controls.target, {
            x: pos.x, y: pos.y, z: pos.z, duration: 1.4, ease: 'power3.inOut',
            onComplete: () => { this.focusTweening = false; }
        });
        this.spawnFocusRipple(pos, key === 'soleil' ? 6 : (this.planets[key] ? this.planets[key].data.rayon : 1));
    }
```

- [ ] **Step 2: Call the cinematic tween from focusBody and gate the lerp**

In `focusBody(...)`, after setting `this.focusedPlanetKey = key;`, add:

```javascript
        this.cinematicFocus(key);
```

In `animate()`, change the focus-follow guard so the per-frame lerp is skipped while the tween runs:

```javascript
        if (this.focusedPlanetKey && !this.focusTweening) {
```

(Leave the `else if (this.cameraFollowingStarship ...)` branch unchanged.)

- [ ] **Step 3: Verify in browser**

Clean restart.
- `preview_eval`: click `.dock-planet[data-planet="jupiter"]`. Then after ~1.6s (separate eval round-trip) `preview_screenshot` — Jupiter should be framed (camera moved cinematically) and the panel open.
- `preview_console_logs` error → none.

Expected: smooth framed transition, ripple visible briefly, no errors.

- [ ] **Step 4: Commit**

```bash
git add js/main.js
git commit -m "feat(interactions): cinematic focus tween + click ripple

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

# PHASE 3 — Enriched Exploration

## Task 8: Hover tooltip

**Files:**
- Create: `js/ui/tooltip.mjs`
- Test: `tests/tooltip.test.mjs`
- Modify: `index.html` (tooltip element), `styles.css` (tooltip), `js/main.js` (feed it from onHover)

- [ ] **Step 1: Write the failing test**

```javascript
// tests/tooltip.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { formatTooltip } from '../js/ui/tooltip.mjs';

test('formatTooltip: name + key fact', () => {
    assert.equal(
        formatTooltip({ nom: 'Mars', facts: { type: 'Planète tellurique' } }),
        'Mars — Planète tellurique'
    );
});

test('formatTooltip: falls back to name only when no facts', () => {
    assert.equal(formatTooltip({ nom: 'Io' }), 'Io');
    assert.equal(formatTooltip(null), '');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```javascript
// js/ui/tooltip.mjs
// Texte d'infobulle au survol : "Nom — fait clé".
export function formatTooltip(data) {
    if (!data || !data.nom) return '';
    const fact = data.facts && data.facts.type;
    return fact ? `${data.nom} — ${fact}` : data.nom;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Add the tooltip element + style**

In `index.html`, before the `#help-hint` div, add:

```html
    <div id="hover-tooltip"></div>
```

In `styles.css`, add:

```css
#hover-tooltip {
    position: fixed;
    pointer-events: none;
    z-index: 11;
    padding: 4px 10px;
    font-size: 0.74rem;
    letter-spacing: 0.04em;
    color: rgba(220, 230, 255, 0.95);
    background: rgba(10, 14, 30, 0.78);
    border: 1px solid rgba(140, 165, 255, 0.3);
    border-radius: 8px;
    transform: translate(12px, 12px);
    opacity: 0;
    transition: opacity 0.15s;
    white-space: nowrap;
}
#hover-tooltip.visible { opacity: 1; }
```

- [ ] **Step 6: Feed the tooltip from main.js onHover**

In `js/main.js`, add the import:

```javascript
import { formatTooltip } from './ui/tooltip.mjs';
```

Extend the `onHover` callback passed to `Interactions` so it also updates the tooltip:

```javascript
            onHover: (key, x, y) => {
                if (this.labels) this.labels.highlight(key);
                if (key && key !== this._lastHoverKey && this.audio) this.audio.playHover();
                this._lastHoverKey = key;
                const tip = document.getElementById('hover-tooltip');
                const data = key ? (this.planets[key] || this.moons[key]).data : null;
                if (data) {
                    tip.textContent = formatTooltip(data);
                    tip.style.left = x + 'px';
                    tip.style.top = y + 'px';
                    tip.classList.add('visible');
                } else {
                    tip.classList.remove('visible');
                }
            }
```

- [ ] **Step 7: Verify in browser**

Clean restart.
- `preview_eval`: set `#hover-tooltip` via simulating onHover is internal; instead assert the element exists and `formatTooltip` output by temporarily calling it is covered by unit test. Confirm no console errors and the element is present (`document.getElementById('hover-tooltip')`).
- `preview_console_logs` error → none.

Expected: element present, no errors (hover visuals confirmed live).

- [ ] **Step 8: Commit**

```bash
git add js/ui/tooltip.mjs tests/tooltip.test.mjs index.html styles.css js/main.js
git commit -m "feat(explore): lightweight hover tooltip

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 9: Time-speed markers under the slider

**Files:**
- Modify: `index.html` (markers element under `#speed-slider`)
- Modify: `styles.css` (markers layout)

- [ ] **Step 1: Add markers markup**

In `index.html`, the dock speed control is `#speed-slider` + `#speed-value` inside `.dock-controls`. Wrap the slider region by adding a markers row directly after `#speed-value`:

```html
            <span class="speed-markers" aria-hidden="true"><i>lent</i><i>×1</i><i>rapide</i></span>
```

- [ ] **Step 2: Style the markers**

In `styles.css`, add:

```css
.speed-markers {
    display: none;
}
@media (min-width: 720px) {
    .speed-markers {
        display: flex;
        gap: 6px;
        font-size: 0.58rem;
        letter-spacing: 0.04em;
        color: var(--text-dim);
        text-transform: uppercase;
    }
    .speed-markers i { font-style: normal; opacity: 0.7; }
}
```

- [ ] **Step 3: Verify in browser**

Clean restart. `preview_screenshot` of the dock → markers visible near the speed slider. `preview_console_logs` error → none.

Expected: markers render, no layout breakage.

- [ ] **Step 4: Commit**

```bash
git add index.html styles.css
git commit -m "feat(explore): time-speed markers under the dock slider

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

# PHASE 4 — First Impression / Onboarding

## Task 10: `shouldPlayIntro` pure helper + Onboarding module

**Files:**
- Create: `js/ui/Onboarding.mjs`
- Test: `tests/onboarding.test.mjs`

- [ ] **Step 1: Write the failing test**

```javascript
// tests/onboarding.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldPlayIntro } from '../js/ui/Onboarding.mjs';

function fakeStorage(initial = {}) {
    const map = new Map(Object.entries(initial));
    return {
        getItem: (k) => (map.has(k) ? map.get(k) : null),
        setItem: (k, v) => map.set(k, String(v))
    };
}

test('shouldPlayIntro: true on first visit', () => {
    assert.equal(shouldPlayIntro(fakeStorage()), true);
});

test('shouldPlayIntro: false once the flag is set', () => {
    assert.equal(shouldPlayIntro(fakeStorage({ 'ss_intro_seen': '1' })), false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```javascript
// js/ui/Onboarding.mjs
import gsap from 'gsap';

const INTRO_KEY = 'ss_intro_seen';

// Logique pure : doit-on jouer l'intro ? (première visite de session/appareil)
export function shouldPlayIntro(storage) {
    try { return storage.getItem(INTRO_KEY) !== '1'; }
    catch { return false; }
}

// Orchestration de l'accueil : fondu du loader, vol d'intro skippable, astuce one-shot.
export class Onboarding {
    constructor({ camera, controls, storage = window.localStorage, onAudioWhoosh = () => {} }) {
        this.camera = camera;
        this.controls = controls;
        this.storage = storage;
        this.onAudioWhoosh = onAudioWhoosh;
    }

    fadeOutLoader() {
        const loader = document.getElementById('loading-message');
        if (!loader) return;
        gsap.to(loader, { opacity: 0, duration: 0.6, onComplete: () => { loader.style.display = 'none'; } });
    }

    markSeen() {
        try { this.storage.setItem(INTRO_KEY, '1'); } catch {}
    }

    // Vol d'intro : part d'un plan large, se pose sur la vue d'ensemble. Skippable.
    playIntro(onDone = () => {}) {
        const cam = this.camera, ctrl = this.controls;
        const finish = () => {
            gsap.killTweensOf(cam.position);
            gsap.killTweensOf(ctrl.target);
            cam.position.set(0, 60, 130);
            ctrl.target.set(0, 0, 0);
            this.markSeen();
            this._removeSkip();
            onDone();
        };
        this._finish = finish;

        // Bouton "Passer" + interruption au clic/touche
        const skip = document.createElement('button');
        skip.id = 'intro-skip';
        skip.textContent = 'Passer ▸';
        skip.addEventListener('click', finish);
        document.body.appendChild(skip);
        this._skipEl = skip;
        this._onKey = (e) => { if (e.code === 'Escape' || e.code === 'Space') finish(); };
        window.addEventListener('keydown', this._onKey);

        cam.position.set(0, 220, 360);
        ctrl.target.set(0, 0, 0);
        this.onAudioWhoosh();
        gsap.to(cam.position, { x: 0, y: 60, z: 130, duration: 3.6, ease: 'power2.inOut', onComplete: finish });
    }

    _removeSkip() {
        if (this._skipEl) { this._skipEl.remove(); this._skipEl = null; }
        if (this._onKey) { window.removeEventListener('keydown', this._onKey); this._onKey = null; }
    }

    // Astuce one-shot (réutilise le même flag de "déjà vu" via une clé dédiée)
    showTip(text) {
        const TIP_KEY = 'ss_tip_seen';
        try { if (this.storage.getItem(TIP_KEY) === '1') return; } catch { return; }
        const toast = document.createElement('div');
        toast.id = 'tip-toast';
        toast.innerHTML = `<span>${text}</span><button aria-label="Fermer">✕</button>`;
        document.body.appendChild(toast);
        const close = () => { gsap.to(toast, { opacity: 0, duration: 0.4, onComplete: () => toast.remove() }); };
        toast.querySelector('button').addEventListener('click', close);
        try { this.storage.setItem(TIP_KEY, '1'); } catch {}
        gsap.fromTo(toast, { opacity: 0 }, { opacity: 1, duration: 0.5 });
        gsap.to(toast, { opacity: 0, duration: 0.6, delay: 7, onComplete: () => toast.remove() });
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add js/ui/Onboarding.mjs tests/onboarding.test.mjs
git commit -m "feat(onboarding): shouldPlayIntro helper + Onboarding orchestration

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 11: Animated loader + intro + tip wiring

**Files:**
- Modify: `index.html` (animated loader markup, keep `#loading-message` id)
- Modify: `styles.css` (loader animation, `#intro-skip`, `#tip-toast`)
- Modify: `js/main.js` (instantiate Onboarding, replace loader-hide with fade + intro + tip)

- [ ] **Step 1: Replace the loader markup**

In `index.html`, replace the `#loading-message` block with an animated version:

```html
    <div id="loading-message">
        <div class="loader-system">
            <span class="loader-sun"></span>
            <span class="loader-orbit"></span>
            <span class="loader-orbit loader-orbit-2"></span>
        </div>
        <span class="loader-text">Chargement du système solaire…</span>
    </div>
```

- [ ] **Step 2: Add loader/intro/tip styles**

In `styles.css`, add:

```css
.loader-system { position: relative; width: 90px; height: 90px; margin: 0 auto 16px; }
.loader-sun {
    position: absolute; top: 50%; left: 50%; width: 22px; height: 22px;
    margin: -11px 0 0 -11px; border-radius: 50%;
    background: radial-gradient(circle at 40% 40%, #fff3b0, #ffae00 60%, #ff6a00);
    box-shadow: 0 0 22px rgba(255, 170, 0, 0.8);
    animation: loader-pulse 1.8s ease-in-out infinite;
}
.loader-orbit {
    position: absolute; top: 50%; left: 50%; width: 90px; height: 90px;
    margin: -45px 0 0 -45px; border: 1px solid rgba(140, 165, 255, 0.4);
    border-radius: 50%; animation: loader-spin 2.4s linear infinite;
}
.loader-orbit::after {
    content: ''; position: absolute; top: -4px; left: 50%; width: 8px; height: 8px;
    margin-left: -4px; border-radius: 50%; background: #8fd8ff;
    box-shadow: 0 0 10px #8fd8ff;
}
.loader-orbit-2 { width: 58px; height: 58px; margin: -29px 0 0 -29px; animation-duration: 1.5s; }
.loader-orbit-2::after { background: #ffd27a; box-shadow: 0 0 10px #ffd27a; }
@keyframes loader-pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.18); } }
@keyframes loader-spin { to { transform: rotate(360deg); } }

#intro-skip {
    position: fixed; bottom: 96px; right: 22px; z-index: 30;
    font-family: var(--font-main); font-size: 0.8rem; color: var(--text);
    padding: 8px 16px; border-radius: 999px; cursor: pointer;
    border: 1px solid var(--glass-border); background: var(--glass-bg);
    backdrop-filter: blur(10px);
}
#intro-skip:hover { border-color: var(--accent); color: var(--accent); }

#tip-toast {
    position: fixed; bottom: 96px; left: 50%; transform: translateX(-50%); z-index: 30;
    display: flex; align-items: center; gap: 12px;
    font-size: 0.82rem; color: var(--text);
    padding: 10px 14px; border-radius: 12px;
    border: 1px solid var(--glass-border); background: var(--glass-bg);
    backdrop-filter: blur(12px); box-shadow: 0 10px 30px rgba(0,0,0,0.5);
}
#tip-toast button {
    border: none; background: transparent; color: var(--text-dim);
    cursor: pointer; font-size: 0.9rem;
}
#tip-toast button:hover { color: var(--accent); }
```

- [ ] **Step 3: Wire Onboarding in main.js**

In `js/main.js`, add the import:

```javascript
import { Onboarding, shouldPlayIntro } from './ui/Onboarding.mjs';
```

Find the loader-hide code in `App.init()`:

```javascript
        const loader = document.getElementById('loading-message');
        if (loader) loader.style.display = 'none';
```

Replace it with:

```javascript
        // Accueil : fondu du loader, vol d'intro (1re visite) puis astuce
        this.onboarding = new Onboarding({
            camera,
            controls: this.sceneManager.controls,
            onAudioWhoosh: () => { if (this.audio) this.audio.playWhoosh(); }
        });
        this.onboarding.fadeOutLoader();
        const showTip = () => this.onboarding.showTip('Survolez ou cliquez une planète pour l’explorer.');
        if (shouldPlayIntro(window.localStorage)) {
            this.onboarding.playIntro(showTip);
        } else {
            showTip();
        }
```

- [ ] **Step 4: Verify in browser**

Clean restart (clears nothing in localStorage automatically; to re-test intro, `preview_eval` `localStorage.removeItem('ss_intro_seen'); localStorage.removeItem('ss_tip_seen'); location.reload();`).
- After reload, `preview_screenshot` during the first ~3s should show the wide intro framing + `#intro-skip` button.
- `preview_eval`: click `#intro-skip`, confirm it disappears and camera settles (`camera` position ~ (0,60,130) — probe by reading via a temporary global if needed, else screenshot).
- `preview_eval`: confirm `#tip-toast` appears after intro, then closing it removes it.
- `preview_console_logs` error → none.

Expected: animated loader, skippable intro, one-shot tip, no errors.

- [ ] **Step 5: Commit**

```bash
git add index.html styles.css js/main.js
git commit -m "feat(onboarding): animated loader, skippable intro flight, one-shot tip

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Final verification

- [ ] **Run the full unit suite**

Run: `npm test`
Expected: all tests pass (constellations, scaleModes, audioManager, interactions, tooltip, onboarding).

- [ ] **Full browser smoke test (clean restart)**

- Toggle audio on; focus planets (cinematic move + ripple); hover (cursor + tooltip + label highlight); enable StarShip and travel (engine sound start/stop); switch popover tabs; toggle constellations + zodiac filter (regression). Confirm no console errors and screenshots look right.

- [ ] **Confirm no regressions**

- Constellations, detail panels (planet 3D preview re-attaches after a constellation 2D preview), guided tour, scale modes all still work.

---

## Notes for the implementer

- `performance.now()` is fine in browser code; do NOT use `Date.now()`/`Math.random()` inside any module that is unit-tested for determinism (the audio detune uses `Math.random()` only in browser-run ambient code, never asserted in tests).
- Web Audio is inaudible in headless verification — assert "no throw" + state, not sound.
- If `pointermove` raycasting costs frames, throttle `_onMove` (e.g., skip if `performance.now() - last < 16`). Add only if a frame-rate problem is observed.
- Keep `.mjs` for anything imported by tests; browser-only glue may stay in `.js`.
