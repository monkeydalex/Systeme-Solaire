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
