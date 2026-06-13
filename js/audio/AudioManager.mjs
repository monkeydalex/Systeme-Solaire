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
        this.startAmbient();
    }

    setVolume(v) {
        this.volume = v;
        if (this.master && !this.muted) this.master.gain.setValueAtTime(v, this.ctx.currentTime);
    }

    setMuted(m) {
        this.muted = m;
        if (this.master) this.master.gain.setValueAtTime(m ? 0 : this.volume, this.ctx.currentTime);
    }

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
}
