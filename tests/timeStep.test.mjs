import { test } from 'node:test';
import assert from 'node:assert/strict';
import { frameScale } from '../js/core/TimeStep.mjs';

// Les vitesses de la scène sont exprimées « par image à 60 Hz » :
// frameScale convertit le temps réel écoulé en nombre d'images de référence.
test('frameScale: 1 image à 60 Hz vaut 1', () => {
    assert.equal(frameScale(1 / 60), 1);
});

test('frameScale: à 144 Hz chaque image avance moins, même vitesse par seconde', () => {
    const perSecondAt144 = frameScale(1 / 144) * 144;
    const perSecondAt60 = frameScale(1 / 60) * 60;
    assert.ok(Math.abs(perSecondAt144 - perSecondAt60) < 1e-9);
});

test('frameScale: un gros saut (onglet caché, lag) est plafonné', () => {
    assert.equal(frameScale(5), 6);
    assert.equal(frameScale(0), 0);
});
