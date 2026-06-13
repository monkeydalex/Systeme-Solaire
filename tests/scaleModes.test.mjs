import test from 'node:test';
import assert from 'node:assert/strict';
import { applyScaleMode, SCALE_MODE_INFO } from '../js/core/ScaleModes.mjs';

const source = {
    soleil: {
        nom: 'Soleil',
        rayon: 5,
        distance: 0,
        vitesseOrbite: 0
    },
    mercure: {
        nom: 'Mercure',
        rayon: 0.8,
        distance: 10,
        vitesseOrbite: 0.02
    },
    neptune: {
        nom: 'Neptune',
        rayon: 1.7,
        distance: 85,
        vitesseOrbite: 0.002,
        moons: [
            {
                key: 'triton',
                nom: 'Triton',
                rayon: 0.3,
                distance: 4,
                vitesseOrbite: 0.03
            }
        ]
    }
};

test('pedagogique mode keeps scene distances and speeds unchanged', () => {
    const scaled = applyScaleMode(source, 'pedagogique');

    assert.equal(scaled.mercure.distance, 10);
    assert.equal(scaled.neptune.distance, 85);
    assert.equal(scaled.neptune.vitesseOrbite, 0.002);
    assert.equal(scaled.neptune.moons[0].distance, 4);
});

test('compact mode compresses planetary distances while preserving the sun center', () => {
    const scaled = applyScaleMode(source, 'compact');

    assert.equal(scaled.soleil.distance, 0);
    assert.equal(scaled.mercure.distance, 8);
    assert.equal(scaled.neptune.distance, 50);
    assert.equal(scaled.neptune.moons[0].distance, 3.2);
});

test('distance mode stretches outer planets more than inner planets', () => {
    const scaled = applyScaleMode(source, 'distances');

    assert.equal(scaled.mercure.distance, 14);
    assert.equal(scaled.neptune.distance, 115);
    assert.ok(scaled.neptune.distance - source.neptune.distance > scaled.mercure.distance - source.mercure.distance);
    assert.equal(scaled.neptune.vitesseOrbite, 0.0014);
});

test('unknown scale modes fall back to pedagogique metadata and values', () => {
    const scaled = applyScaleMode(source, 'missing-mode');

    assert.equal(SCALE_MODE_INFO.pedagogique.label, 'Pédagogique');
    assert.equal(scaled.mercure.distance, source.mercure.distance);
});
