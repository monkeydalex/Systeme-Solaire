const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
    console.log(`Requête reçue: ${req.url}`);
    
    // Gérer la racine
    let filePath = req.url === '/' 
        ? './index.html' 
        : '.' + req.url;
    
    const extname = path.extname(filePath);
    let contentType = MIME_TYPES[extname] || 'application/octet-stream';
    
    // Ajouter les en-têtes CORS pour toutes les réponses
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    
    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                // Page non trouvée
                fs.readFile('./404.html', (err, content) => {
                    res.writeHead(404, { 
                        'Content-Type': 'text/html',
                        'Cross-Origin-Opener-Policy': 'same-origin',
                        'Cross-Origin-Embedder-Policy': 'require-corp'
                    });
                    res.end(content, 'utf-8');
                });
            } else {
                // Erreur serveur
                res.writeHead(500);
                res.end(`Erreur serveur: ${err.code}`);
            }
        } else {
            // Succès
            res.writeHead(200, { 
                'Content-Type': contentType,
                'Cross-Origin-Opener-Policy': 'same-origin',
                'Cross-Origin-Embedder-Policy': 'require-corp'
            });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
    console.log(`Appuyez sur Ctrl+C pour arrêter le serveur`);
}); 