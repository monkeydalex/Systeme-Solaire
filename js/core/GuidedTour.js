import gsap from 'gsap';

// Visite guidée cinématique : enchaîne le focus sur une séquence de corps,
// ~6 s par étape. Interruptible à tout moment via stop().
export class GuidedTour {
    constructor(keys, callbacks) {
        this.keys = keys;
        this.callbacks = callbacks; // { onVisit(key), onEnd() }
        this.index = 0;
        this.active = false;
        this.timer = null;
    }

    start() {
        if (this.active) return;
        this.active = true;
        this.index = 0;
        this.visitNext();
    }

    visitNext() {
        if (!this.active) return;
        if (this.index >= this.keys.length) {
            this.stop();
            return;
        }
        const key = this.keys[this.index++];
        this.callbacks.onVisit(key);
        this.timer = gsap.delayedCall(6, () => this.visitNext());
    }

    stop() {
        if (!this.active) return;
        this.active = false;
        if (this.timer) {
            this.timer.kill();
            this.timer = null;
        }
        if (this.callbacks.onEnd) this.callbacks.onEnd();
    }
}
