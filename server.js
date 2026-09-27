import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Serveur statique minimal pour le build de production (dist/).
// En développement, utiliser `pnpm dev` (Vite).

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2',
};

const SECURITY_HEADERS = {
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
};

export function createHandler(baseDir) {
    const root = path.resolve(baseDir);

    const send = (res, status, body, type = 'text/plain; charset=utf-8', extra = {}) => {
        res.writeHead(status, { 'Content-Type': type, ...SECURITY_HEADERS, ...extra });
        res.end(body);
    };

    const sendNotFound = (res) => {
        fs.readFile(path.join(root, '404.html'), (err, content) => {
            if (err) send(res, 404, 'Page non trouvée');
            else send(res, 404, content, MIME_TYPES['.html']);
        });
    };

    return (req, res) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') {
            send(res, 405, 'Méthode non autorisée', undefined, { Allow: 'GET, HEAD' });
            return;
        }

        let requestedPath;
        try {
            requestedPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
        } catch {
            send(res, 400, 'Requête invalide');
            return;
        }
        if (requestedPath.endsWith('/')) requestedPath += 'index.html';

        // Empêcher toute sortie de root (path traversal)
        const filePath = path.join(root, requestedPath);
        if (!filePath.startsWith(root + path.sep)) {
            send(res, 403, 'Accès refusé');
            return;
        }

        fs.stat(filePath, (err, stats) => {
            if (err || !stats.isFile()) {
                sendNotFound(res);
                return;
            }
            const type = MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
            // Les fichiers de assets/ ont un hash dans leur nom : cache long
            const cache = requestedPath.startsWith('/assets/')
                ? 'public, max-age=31536000, immutable'
                : 'no-cache';
            res.writeHead(200, { 'Content-Type': type, 'Content-Length': stats.size, 'Cache-Control': cache, ...SECURITY_HEADERS });
            if (req.method === 'HEAD') {
                res.end();
                return;
            }
            fs.createReadStream(filePath).pipe(res);
        });
    };
}

// Lancement direct : `pnpm start` (après `pnpm build`)
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const distDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'dist');
    if (!fs.existsSync(path.join(distDir, 'index.html'))) {
        console.error('Aucun build trouvé : lancez d\'abord `pnpm build`.');
        process.exit(1);
    }
    const port = Number(process.env.PORT) || 3000;
    http.createServer(createHandler(distDir)).listen(port, () => {
        console.log(`Serveur démarré sur http://localhost:${port}`);
    });
}
