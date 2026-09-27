import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { planetData } from '../js/data/planetData.js';

// Vite ne copie dans dist/ que le dossier public/ : une texture référencée
// par une chaîne ailleurs serait absente (404) en production.
const publicDir = fileURLToPath(new URL('../public/', import.meta.url));

function allTexturePaths() {
    const paths = [];
    for (const body of Object.values(planetData)) {
        if (body.texture) paths.push(body.texture);
        for (const moon of body.moons || []) {
            if (moon.texture) paths.push(moon.texture);
        }
    }
    return paths;
}

test('textures: chaque texture déclarée existe dans public/', () => {
    const paths = allTexturePaths();
    assert.ok(paths.length >= 9);
    for (const p of paths) {
        assert.ok(existsSync(publicDir + p.replace(/^\.\//, '')), `manquante : public/${p}`);
    }
});
