import test from 'node:test';
import assert from 'node:assert/strict';
import { CINEMATIC_CONSTELLATIONS } from '../js/data/constellations.mjs';

test('cinematic constellations define drawable star paths', () => {
    assert.ok(CINEMATIC_CONSTELLATIONS.length >= 5);

    for (const constellation of CINEMATIC_CONSTELLATIONS) {
        assert.ok(constellation.key);
        assert.ok(constellation.nom);
        assert.ok(constellation.color.startsWith('#'));
        assert.ok(constellation.stars.length >= 4);
        assert.ok(constellation.lines.length >= constellation.stars.length - 2);

        for (const star of constellation.stars) {
            assert.equal(star.position.length, 3);
            assert.ok(star.size > 0);
        }
    }
});

test('constellation line indexes point to existing stars', () => {
    for (const constellation of CINEMATIC_CONSTELLATIONS) {
        const maxIndex = constellation.stars.length - 1;

        for (const [from, to] of constellation.lines) {
            assert.ok(from >= 0 && from <= maxIndex);
            assert.ok(to >= 0 && to <= maxIndex);
            assert.notEqual(from, to);
        }
    }
});

test('the twelve zodiac signs are present with dates and a main star', () => {
    const zodiac = CINEMATIC_CONSTELLATIONS.filter(c => c.zodiaque);
    assert.equal(zodiac.length, 12);

    for (const constellation of zodiac) {
        assert.ok(constellation.dates, `${constellation.nom} manque ses dates`);
        assert.ok(constellation.etoilePrincipale, `${constellation.nom} manque son étoile principale`);
    }
});
