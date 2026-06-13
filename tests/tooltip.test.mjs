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
