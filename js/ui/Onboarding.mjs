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

    // Astuce one-shot
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
