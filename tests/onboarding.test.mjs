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
