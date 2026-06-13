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

test('AudioManager: enable() starts the ambient drone, stopAmbient clears it', async () => {
    const am = new AudioManager(makeFakeContext);
    await am.enable();
    assert.ok(am.ambient, 'ambient should be created on enable');
    assert.equal(Array.isArray(am.ambient.nodes), true);
    assert.ok(am.ambient.nodes.length >= 3, 'ambient builds several nodes');
    am.stopAmbient();
    assert.equal(am.ambient, null);
});

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
