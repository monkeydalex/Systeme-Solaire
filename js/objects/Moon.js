import * as THREE from 'three';

// Lune en orbite autour d'une planète. Texture procédurale (base colorée + cratères),
// orbite simplifiée dans le plan écliptique, cliquable via son mesh.
export class Moon {
    constructor(key, data, planet) {
        this.key = key;
        this.data = data;
        this.planet = planet;
        this.angle = Math.random() * Math.PI * 2;

        this.mesh = null;
        this.orbitMesh = null;

        this.create();
    }

    create() {
        const geometry = new THREE.SphereGeometry(this.data.rayon, 32, 32);
        const material = new THREE.MeshStandardMaterial({
            map: this.createTexture(),
            roughness: 0.95,
            metalness: 0.0
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        this.updatePosition();
        // Attaché au group (pas au tiltGroup) : orbite simplifiée dans le plan écliptique
        this.planet.group.add(this.mesh);

        // Orbite discrète autour de la planète
        const points = [];
        for (let i = 0; i <= 64; i++) {
            const theta = (i / 64) * Math.PI * 2;
            points.push(new THREE.Vector3(
                Math.cos(theta) * this.data.distance, 0, Math.sin(theta) * this.data.distance
            ));
        }
        const orbitGeometry = new THREE.BufferGeometry().setFromPoints(points);
        const orbitMaterial = new THREE.LineBasicMaterial({
            color: 0x556688,
            transparent: true,
            opacity: 0.2
        });
        this.orbitMesh = new THREE.Line(orbitGeometry, orbitMaterial);
        this.planet.group.add(this.orbitMesh);
    }

    createTexture() {
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // Base colorée avec léger dégradé
        ctx.fillStyle = this.data.color;
        ctx.fillRect(0, 0, size, size);

        // Variations de teinte
        for (let i = 0; i < 350; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const r = 2 + Math.random() * 14;
            const shade = Math.random() > 0.5 ? 255 : 0;
            ctx.fillStyle = `rgba(${shade}, ${shade}, ${shade}, ${0.02 + Math.random() * 0.05})`;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
        }

        // Cratères (cercle sombre + liseré clair)
        for (let i = 0; i < 45; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const r = 1.5 + Math.random() * 6;
            ctx.fillStyle = `rgba(0, 0, 0, ${0.12 + Math.random() * 0.18})`;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.stroke();
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        return texture;
    }

    updatePosition() {
        this.mesh.position.x = Math.cos(this.angle) * this.data.distance;
        this.mesh.position.z = Math.sin(this.angle) * this.data.distance;
    }

    update(speed, showOrbits) {
        this.angle += this.data.vitesseOrbite * speed;
        this.updatePosition();
        this.mesh.rotation.y += 0.01 * speed;
        if (this.orbitMesh) this.orbitMesh.visible = showOrbits;
    }

    destroy() {
        this.planet.group.remove(this.mesh);
        this.planet.group.remove(this.orbitMesh);
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
        this.orbitMesh.geometry.dispose();
        this.orbitMesh.material.dispose();
    }
}
