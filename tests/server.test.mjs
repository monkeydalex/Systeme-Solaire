import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHandler } from '../server.js';

let server, base, dir;

before(async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ss-server-'));
    fs.writeFileSync(path.join(dir, 'index.html'), '<h1>ok</h1>');
    fs.writeFileSync(path.join(dir, '404.html'), '<h1>404</h1>');
    fs.mkdirSync(path.join(dir, 'assets'));
    fs.writeFileSync(path.join(dir, 'assets', 'app.js'), 'x');
    server = http.createServer(createHandler(dir));
    await new Promise(r => server.listen(0, r));
    base = `http://localhost:${server.address().port}`;
});

after(() => {
    server.close();
    fs.rmSync(dir, { recursive: true, force: true });
});

test('server: sert index.html sur /', async () => {
    const r = await fetch(base + '/');
    assert.equal(r.status, 200);
    assert.match(r.headers.get('content-type'), /text\/html/);
    assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
});

test('server: une URL malformée renvoie 400 sans faire planter le serveur', async () => {
    const r = await fetch(base + '/%E0%A4%A');
    assert.equal(r.status, 400);
    const again = await fetch(base + '/');
    assert.equal(again.status, 200);
});

test('server: un dossier ou un fichier absent renvoie la page 404', async () => {
    for (const p of ['/assets', '/absent.js']) {
        const r = await fetch(base + p);
        assert.equal(r.status, 404);
        assert.match(await r.text(), /404/);
    }
});

test('server: refuse de sortir du dossier servi', async () => {
    const r = await new Promise(res => http.get(base + '/..%2f..%2fetc%2fpasswd', res));
    assert.ok(r.statusCode === 403 || r.statusCode === 404);
});

test('server: cache long pour assets/, MIME correct', async () => {
    const r = await fetch(base + '/assets/app.js');
    assert.equal(r.status, 200);
    assert.match(r.headers.get('content-type'), /text\/javascript/);
    assert.match(r.headers.get('cache-control'), /immutable/);
});
