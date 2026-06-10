import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';
import { fallbackColors } from '../data/planetData.js';
import { createSunMaterial } from './SunMaterial.js';

const noise2D = createNoise2D();

// Cache local pour les textures générées
const generatedTextureCache = {};

export class Planet {
    constructor(key, data, scene) {
        this.key = key;
        this.data = data;
        this.scene = scene;
        this.angle = Math.random() * Math.PI * 2;
        
        this.group = new THREE.Group();
        // Groupe incliné selon l'axe réel de la planète (porte mesh, nuages, anneaux)
        this.tiltGroup = new THREE.Group();
        this.mesh = null;
        this.sunMaterial = null;
        this.cloudsMesh = null;
        this.atmosphereMesh = null;
        this.orbitMesh = null;
        this.ringsMesh = null;
        this.light = null;
        this.glowSprite = null;

        this.create();
    }

    create() {
        // 1. Géométrie
        const geometry = new THREE.SphereGeometry(this.data.rayon, 64, 64);

        // 2. Texture & Matériau
        const texture = this.loadTexture();

        let material;
        if (this.key === 'soleil') {
            // Surface animée par shader (FBM) — la texture JPG n'est plus utilisée
            material = createSunMaterial();
            this.sunMaterial = material;
        } else {
            material = new THREE.MeshStandardMaterial({
                map: texture,
                roughness: 0.8,
                metalness: 0.1,
                bumpMap: texture, // Utilisation de la même texture comme bump map pour le relief
                bumpScale: this.data.rayon * 0.02
            });
            
            // Propriétés spéculaires pour l'eau sur la Terre
            if (this.key === 'terre') {
                material.roughness = 0.4;
                material.metalness = 0.05;
            }
        }

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = this.key !== 'soleil';
        this.mesh.receiveShadow = this.key !== 'soleil';
        this.tiltGroup.rotation.z = THREE.MathUtils.degToRad(this.data.axialTilt || 0);
        this.tiltGroup.add(this.mesh);
        this.group.add(this.tiltGroup);

        // 3. Cas spécifiques
        // A. Soleil (Lumière + Lueur)
        if (this.key === 'soleil') {
            // PointLight centrale puissante (decay 0 : pas d'atténuation,
            // les distances de la scène sont pédagogiques, pas physiques)
            this.light = new THREE.PointLight(0xffffff, 2.2, 0, 0);
            this.light.castShadow = true;
            this.light.shadow.mapSize.width = 2048;
            this.light.shadow.mapSize.height = 2048;
            this.light.shadow.bias = -0.001;
            this.group.add(this.light);

            // Sprite de lueur du soleil
            const glowCanvas = this.createSunGlowTexture();
            const glowTexture = new THREE.CanvasTexture(glowCanvas);
            const spriteMaterial = new THREE.SpriteMaterial({
                map: glowTexture,
                color: 0xffaa44,
                transparent: true,
                blending: THREE.AdditiveBlending,
                opacity: 0.8
            });
            this.glowSprite = new THREE.Sprite(spriteMaterial);
            this.glowSprite.scale.set(this.data.rayon * 4, this.data.rayon * 4, 1);
            this.group.add(this.glowSprite);

            // Couronne externe : halo plus large et plus diffus
            const coronaMaterial = new THREE.SpriteMaterial({
                map: glowTexture,
                color: 0xff5511,
                transparent: true,
                blending: THREE.AdditiveBlending,
                opacity: 0.30
            });
            this.coronaSprite = new THREE.Sprite(coronaMaterial);
            this.coronaSprite.scale.set(this.data.rayon * 7.5, this.data.rayon * 7.5, 1);
            this.group.add(this.coronaSprite);
        }

        // B. Terre (Nuages + Atmosphère)
        if (this.key === 'terre') {
            // Nuages
            const cloudsGeometry = new THREE.SphereGeometry(this.data.rayon + 0.03, 64, 64);
            const cloudsTexture = this.createCloudsTexture();
            const cloudsMaterial = new THREE.MeshStandardMaterial({
                alphaMap: cloudsTexture,
                transparent: true,
                color: 0xffffff,
                blending: THREE.NormalBlending
            });
            this.cloudsMesh = new THREE.Mesh(cloudsGeometry, cloudsMaterial);
            this.tiltGroup.add(this.cloudsMesh);
        }

        // C. Atmosphère (Terre & Vénus)
        if (this.key === 'terre' || this.key === 'venus') {
            const atmosphereGeometry = new THREE.SphereGeometry(this.data.rayon + 0.14, 64, 64);
            
            // Shader d'atmosphère (Glow externe)
            const color = this.key === 'terre' ? new THREE.Color(0x3a9eff) : new THREE.Color(0xffcc88);
            const atmosphereMaterial = new THREE.ShaderMaterial({
                vertexShader: `
                    varying vec3 vNormal;
                    void main() {
                        vNormal = normalize(normalMatrix * normal);
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `,
                fragmentShader: `
                    varying vec3 vNormal;
                    uniform vec3 color;
                    void main() {
                        float intensity = pow(0.78 - dot(vNormal, vec3(0, 0, 1.0)), 2.2) * 1.5;
                        gl_FragColor = vec4(color, 1.0) * intensity;
                    }
                `,
                uniforms: {
                    color: { value: color }
                },
                blending: THREE.AdditiveBlending,
                side: THREE.BackSide,
                transparent: true
            });

            this.atmosphereMesh = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
            this.group.add(this.atmosphereMesh);
        }

        // D. Saturne (Anneaux)
        if (this.key === 'saturne') {
            const innerRadius = this.data.rayon + 0.5;
            const outerRadius = this.data.rayon + 3.0;
            const ringGeometry = new THREE.RingGeometry(innerRadius, outerRadius, 128);

            // Remapper les UVs radialement : u = position entre rayon interne et externe,
            // sinon la texture 1D serait plaquée de gauche à droite sur le plan
            const ringPos = ringGeometry.attributes.position;
            const ringUv = ringGeometry.attributes.uv;
            const v3 = new THREE.Vector3();
            for (let i = 0; i < ringPos.count; i++) {
                v3.fromBufferAttribute(ringPos, i);
                const r = (v3.length() - innerRadius) / (outerRadius - innerRadius);
                ringUv.setXY(i, r, 0.5);
            }


            // Texture d'anneau avec Cassini Division procédurale
            const ringCanvas = this.createSaturnRingsTexture();
            const ringTexture = new THREE.CanvasTexture(ringCanvas);
            
            // Orienter correctement la texture sur l'anneau
            ringTexture.wrapS = THREE.ClampToEdgeWrapping;
            ringTexture.wrapT = THREE.ClampToEdgeWrapping;
            
            const ringMaterial = new THREE.MeshStandardMaterial({
                map: ringTexture,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.9,
                roughness: 0.6
            });

            this.ringsMesh = new THREE.Mesh(ringGeometry, ringMaterial);
            // Plan équatorial exact : l'inclinaison réelle vient du tiltGroup
            this.ringsMesh.rotation.x = Math.PI / 2;
            this.ringsMesh.receiveShadow = true;
            this.ringsMesh.castShadow = true;
            this.tiltGroup.add(this.ringsMesh);
        }

        // 4. Positionnement initial
        if (this.key !== 'soleil') {
            this.updatePosition();
            this.createOrbit();
        }

        this.scene.add(this.group);
    }

    createOrbit() {
        const distance = this.data.distance;
        // Créer une géométrie de ligne circulaire
        const points = [];
        for (let i = 0; i <= 128; i++) {
            const theta = (i / 128) * Math.PI * 2;
            points.push(new THREE.Vector3(Math.cos(theta) * distance, 0, Math.sin(theta) * distance));
        }
        const orbitGeometry = new THREE.BufferGeometry().setFromPoints(points);
        const orbitMaterial = new THREE.LineBasicMaterial({
            color: 0x444466,
            transparent: true,
            opacity: 0.25,
            linewidth: 1
        });
        this.orbitMesh = new THREE.Line(orbitGeometry, orbitMaterial);
        this.scene.add(this.orbitMesh);
    }

    updatePosition() {
        if (this.key !== 'soleil') {
            this.group.position.x = Math.cos(this.angle) * this.data.distance;
            this.group.position.z = Math.sin(this.angle) * this.data.distance;
        }
    }

    update(speed, showOrbits) {
        // Rotation sur elle-même
        if (this.mesh) {
            this.mesh.rotation.y += this.data.vitesseRotation * speed;
        }

        // Rotation des nuages (Terre)
        if (this.cloudsMesh) {
            this.cloudsMesh.rotation.y += (this.data.vitesseRotation * 1.15) * speed;
        }

        // Orbite autour du Soleil
        if (this.key !== 'soleil') {
            this.angle += this.data.vitesseOrbite * speed;
            this.updatePosition();
        }

        // Visibilité de l'orbite
        if (this.orbitMesh) {
            this.orbitMesh.visible = showOrbits;
        }

        // Effet de pulsation subtil pour la lueur du soleil
        if (this.glowSprite) {
            const time = Date.now() * 0.001;
            const scale = this.data.rayon * 4 + Math.sin(time * 2) * 0.2;
            this.glowSprite.scale.set(scale, scale, 1);
        }

        // Animation de la surface du Soleil
        if (this.sunMaterial) {
            this.sunMaterial.uniforms.uTime.value = Date.now() * 0.001;
        }
    }

    destroy() {
        this.scene.remove(this.group);
        if (this.orbitMesh) this.scene.remove(this.orbitMesh);
        
        // Libération de la mémoire
        this.group.traverse(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                else child.material.dispose();
            }
        });
        if (this.orbitMesh) {
            this.orbitMesh.geometry.dispose();
            this.orbitMesh.material.dispose();
        }
    }

    // Charge la vraie texture JPG ; retombe sur la texture procédurale en cas d'échec
    loadTexture() {
        if (!this.data.texture) return this.getOrCreateProceduralTexture();

        const loader = new THREE.TextureLoader();
        const texture = loader.load(
            this.data.texture,
            undefined,
            undefined,
            () => {
                console.warn(`Texture introuvable pour ${this.key}, fallback procédural`);
                const fallback = this.getOrCreateProceduralTexture();
                if (this.mesh) {
                    this.mesh.material.map = fallback;
                    if (this.mesh.material.bumpMap) this.mesh.material.bumpMap = fallback;
                    this.mesh.material.needsUpdate = true;
                }
            }
        );
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = 8;
        return texture;
    }

    // --- Générateurs Procéduraux Avancés de Textures ---

    getOrCreateProceduralTexture() {
        const cacheKey = this.key;
        if (generatedTextureCache[cacheKey]) {
            return generatedTextureCache[cacheKey];
        }

        const size = 1024; // Haute résolution pour les planètes
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        const baseColorHex = fallbackColors[this.key] || '#ffffff';
        
        // Remplir le fond
        ctx.fillStyle = baseColorHex;
        ctx.fillRect(0, 0, size, size);

        // Dessiner des détails selon la planète
        switch (this.key) {
            case 'soleil':
                this.drawSunTexture(ctx, size);
                break;
            case 'mercure':
                this.drawMercuryTexture(ctx, size);
                break;
            case 'venus':
                this.drawVenusTexture(ctx, size);
                break;
            case 'terre':
                this.drawEarthTexture(ctx, size);
                break;
            case 'mars':
                this.drawMarsTexture(ctx, size);
                break;
            case 'jupiter':
                this.drawGasGiantTexture(ctx, size, [
                    { y: 0.1, color: '#e3b88a', weight: 8 },
                    { y: 0.25, color: '#be7d55', weight: 12 },
                    { y: 0.35, color: '#d2ab82', weight: 6 },
                    { y: 0.5, color: '#a65e38', weight: 15 },
                    { y: 0.65, color: '#c99f74', weight: 8 },
                    { y: 0.8, color: '#7e4225', weight: 10 }
                ], true); // true = ajouter la grande tache rouge
                break;
            case 'saturne':
                this.drawGasGiantTexture(ctx, size, [
                    { y: 0.1, color: '#e6d8a3', weight: 10 },
                    { y: 0.3, color: '#cca770', weight: 14 },
                    { y: 0.5, color: '#dfc293', weight: 8 },
                    { y: 0.7, color: '#bca070', weight: 12 }
                ], false);
                break;
            case 'uranus':
                this.drawIceGiantTexture(ctx, size, baseColorHex, 0.1);
                break;
            case 'neptune':
                this.drawIceGiantTexture(ctx, size, baseColorHex, 0.2, true); // true = ajouter la grande tache sombre
                break;
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        generatedTextureCache[cacheKey] = texture;
        return texture;
    }

    drawSunTexture(ctx, size) {
        // Texture de plasma en fusion
        const imgData = ctx.getImageData(0, 0, size, size);
        const data = imgData.data;

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const idx = (y * size + x) * 4;
                
                // Bruit multi-échelle
                const n1 = noise2D(x / 40, y / 40) * 0.5 + 0.5;
                const n2 = noise2D(x / 15, y / 15) * 0.25;
                const val = n1 + n2;

                // Palette de couleurs solaires (rouge -> orange -> jaune)
                data[idx] = Math.min(255, 230 + val * 50);          // Rouge
                data[idx+1] = Math.max(0, Math.min(255, 100 + val * 160)); // Vert
                data[idx+2] = Math.max(0, Math.min(255, val * 40));        // Bleu
            }
        }
        ctx.putImageData(imgData, 0, 0);
    }

    drawMercuryTexture(ctx, size) {
        // Cratères et couleur rocheuse grise
        this.drawNoiseBasedRelief(ctx, size, '#858585', '#525252', 15);
        
        // Ajouter des petits cercles blancs diffus (cratères d'impact)
        for (let i = 0; i < 200; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const r = Math.random() * 8 + 2;
            
            const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
            grad.addColorStop(0, 'rgba(255,255,255,0.4)');
            grad.addColorStop(0.5, 'rgba(255,255,255,0.1)');
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawVenusTexture(ctx, size) {
        // Nuages acides denses et turbulents
        const imgData = ctx.getImageData(0, 0, size, size);
        const data = imgData.data;

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const idx = (y * size + x) * 4;
                
                // Bandes de vent diagonales
                const nx = x + y * 0.5;
                const ny = y - x * 0.2;
                
                const n1 = noise2D(nx / 80, ny / 50) * 0.6 + 0.4;
                const n2 = noise2D(nx / 20, ny / 20) * 0.15;
                const val = n1 + n2;

                // Nuance jaune-ocre
                data[idx] = Math.min(255, 220 + val * 35);
                data[idx+1] = Math.min(255, 185 + val * 45);
                data[idx+2] = Math.min(255, 120 + val * 60);
            }
        }
        ctx.putImageData(imgData, 0, 0);
    }

    drawEarthTexture(ctx, size) {
        // Génération procédurale de continents et océans réalistes
        const imgData = ctx.getImageData(0, 0, size, size);
        const data = imgData.data;

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const idx = (y * size + x) * 4;
                
                // Multi-fractal noise pour les continents
                let val = 0;
                let scale = 120;
                let weight = 1.0;
                for (let j = 0; j < 4; j++) {
                    val += (noise2D(x / scale, y / scale) * 0.5 + 0.5) * weight;
                    scale /= 2;
                    weight *= 0.5;
                }

                // Seuillage pour séparer terre et eau
                if (val > 0.85) {
                    // Terres émergées (Vert / Marron selon l'altitude/bruit)
                    const terrainNoise = noise2D(x/20, y/20) * 0.5 + 0.5;
                    if (terrainNoise > 0.6) {
                        // Montagne (Marron)
                        data[idx] = 110 + terrainNoise * 40;
                        data[idx+1] = 90 + terrainNoise * 20;
                        data[idx+2] = 60;
                    } else {
                        // Plaine (Vert)
                        data[idx] = 35 + terrainNoise * 30;
                        data[idx+1] = 100 + terrainNoise * 40;
                        data[idx+2] = 30;
                    }
                    
                    // Calottes polaires (blanches) aux extrêmes nord et sud
                    const lat = Math.abs(y - size/2) / (size/2);
                    if (lat > 0.82) {
                        data[idx] = 245;
                        data[idx+1] = 245;
                        data[idx+2] = 250;
                    }
                } else {
                    // Océan (Bleu foncé, plus clair près des côtes)
                    const distToCoast = (0.85 - val) * 6;
                    data[idx] = Math.max(10, Math.min(25, 20 + distToCoast * 15));
                    data[idx+1] = Math.max(30, Math.min(65, 45 + distToCoast * 35));
                    data[idx+2] = Math.max(80, Math.min(180, 110 + distToCoast * 65));
                }
            }
        }
        ctx.putImageData(imgData, 0, 0);
    }

    createCloudsTexture() {
        // Texture de nuages uniquement (canal alpha)
        const size = 1024;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const imgData = ctx.getImageData(0, 0, size, size);
        const data = imgData.data;

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const idx = (y * size + x) * 4;
                
                // Vent d'ouest (étirement horizontal)
                const nx = x + noise2D(x/100, y/100) * 10;
                
                // Bruit fractal pour les motifs de nuages
                let val = 0;
                let scale = 150;
                let weight = 1.0;
                for (let j = 0; j < 3; j++) {
                    val += (noise2D(nx / scale, y / scale) * 0.5 + 0.5) * weight;
                    scale /= 2;
                    weight *= 0.55;
                }

                // Masque alpha
                const alpha = val > 0.8 ? Math.min(255, (val - 0.8) * 4.5 * 255) : 0;
                
                data[idx] = 255;
                data[idx+1] = 255;
                data[idx+2] = 255;
                data[idx+3] = alpha;
            }
        }
        ctx.putImageData(imgData, 0, 0);
        return new THREE.CanvasTexture(canvas);
    }

    drawMarsTexture(ctx, size) {
        // Texture rocheuse rouge oxyde
        this.drawNoiseBasedRelief(ctx, size, '#c55a30', '#8c3114', 25);
        
        // Calotte polaire sud blanche/glacée
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(size/2, size, size*0.06, 0, Math.PI, true);
        ctx.fill();
    }

    drawGasGiantTexture(ctx, size, bands, addRedSpot) {
        const imgData = ctx.getImageData(0, 0, size, size);
        const data = imgData.data;

        // Convertir les couleurs hexa de la bande en RGB
        const rgbBands = bands.map(b => {
            const r = parseInt(b.color.slice(1, 3), 16);
            const g = parseInt(b.color.slice(3, 5), 16);
            const bVal = parseInt(b.color.slice(5, 7), 16);
            return { y: b.y * size, r, g, b: bVal, w: b.weight };
        });

        for (let y = 0; y < size; y++) {
            // Trouver la couleur de base de la bande pour cette ligne y
            let closestBand = rgbBands[0];
            let secondClosest = rgbBands[1] || rgbBands[0];
            let dist1 = Math.abs(y - closestBand.y);
            let dist2 = Math.abs(y - secondClosest.y);

            rgbBands.forEach(b => {
                const dist = Math.abs(y - b.y);
                if (dist < dist1) {
                    secondClosest = closestBand;
                    dist2 = dist1;
                    closestBand = b;
                    dist1 = dist;
                } else if (dist < dist2) {
                    secondClosest = b;
                    dist2 = dist;
                }
            });

            // Interpoler la couleur
            const factor = dist1 + dist2 > 0 ? dist1 / (dist1 + dist2) : 0;
            const rBase = closestBand.r * (1 - factor) + secondClosest.r * factor;
            const gBase = closestBand.g * (1 - factor) + secondClosest.g * factor;
            const bBase = closestBand.b * (1 - factor) + secondClosest.b * factor;

            for (let x = 0; x < size; x++) {
                const idx = (y * size + x) * 4;
                
                // Turbulence sur les bandes (ondes de cisaillement)
                const shear = noise2D(x/40, y/30) * 15;
                const n = noise2D((x + shear)/15, y/15) * 12;

                data[idx] = Math.max(0, Math.min(255, rBase + n));
                data[idx+1] = Math.max(0, Math.min(255, gBase + n));
                data[idx+2] = Math.max(0, Math.min(255, bBase + n));
            }
        }

        ctx.putImageData(imgData, 0, 0);

        // Ajouter la Grande Tache Rouge (Jupiter)
        if (addRedSpot) {
            const spotX = size * 0.6;
            const spotY = size * 0.72; // Hémisphère Sud
            const rx = size * 0.08;
            const ry = size * 0.05;
            
            const grad = ctx.createRadialGradient(spotX, spotY, 0, spotX, spotY, rx);
            grad.addColorStop(0, '#ab3e25');
            grad.addColorStop(0.6, '#bd5a3e');
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.ellipse(spotX, spotY, rx, ry, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawIceGiantTexture(ctx, size, baseColorHex, detailStrength, addDarkSpot = false) {
        const imgData = ctx.getImageData(0, 0, size, size);
        const data = imgData.data;
        const r = parseInt(baseColorHex.slice(1, 3), 16);
        const g = parseInt(baseColorHex.slice(3, 5), 16);
        const b = parseInt(baseColorHex.slice(5, 7), 16);

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const idx = (y * size + x) * 4;
                const n = noise2D(x / 80, y / 80) * detailStrength * 40;

                data[idx] = Math.max(0, Math.min(255, r + n * 0.4));
                data[idx+1] = Math.max(0, Math.min(255, g + n * 0.8));
                data[idx+2] = Math.max(0, Math.min(255, b + n));
            }
        }
        ctx.putImageData(imgData, 0, 0);

        if (addDarkSpot) {
            // Grande tache sombre de Neptune
            const spotX = size * 0.4;
            const spotY = size * 0.35;
            const rSpot = size * 0.06;
            
            const grad = ctx.createRadialGradient(spotX, spotY, 0, spotX, spotY, rSpot);
            grad.addColorStop(0, '#151c6e');
            grad.addColorStop(0.7, '#2332aa');
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.ellipse(spotX, spotY, rSpot, rSpot * 0.6, Math.PI / 10, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawNoiseBasedRelief(ctx, size, color1, color2, noiseScale) {
        const imgData = ctx.getImageData(0, 0, size, size);
        const data = imgData.data;
        
        const r1 = parseInt(color1.slice(1, 3), 16);
        const g1 = parseInt(color1.slice(3, 5), 16);
        const b1 = parseInt(color1.slice(5, 7), 16);

        const r2 = parseInt(color2.slice(1, 3), 16);
        const g2 = parseInt(color2.slice(3, 5), 16);
        const b2 = parseInt(color2.slice(5, 7), 16);

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const idx = (y * size + x) * 4;
                const val = noise2D(x / noiseScale, y / noiseScale) * 0.5 + 0.5;

                // Interpoler
                data[idx] = r1 * val + r2 * (1 - val);
                data[idx+1] = g1 * val + g2 * (1 - val);
                data[idx+2] = b1 * val + b2 * (1 - val);
            }
        }
        ctx.putImageData(imgData, 0, 0);
    }

    createSunGlowTexture() {
        const size = 512;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        const grad = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
        grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
        grad.addColorStop(0.2, 'rgba(255, 180, 50, 0.7)');
        grad.addColorStop(0.4, 'rgba(255, 90, 0, 0.35)');
        grad.addColorStop(0.7, 'rgba(230, 45, 0, 0.08)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);
        return canvas;
    }

    createSaturnRingsTexture() {
        // Texture unidimensionnelle projetée radialement
        const size = 512;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = 1;
        const ctx = canvas.getContext('2d');

        // Créer un dégradé représentant la Cassini Division et les différentes bandes des anneaux
        const grad = ctx.createLinearGradient(0, 0, size, 0);
        grad.addColorStop(0.0, 'rgba(0, 0, 0, 0)');          // Proche planète
        grad.addColorStop(0.12, 'rgba(165, 140, 110, 0.15)'); // Anneau C faible
        grad.addColorStop(0.25, 'rgba(220, 195, 160, 0.85)'); // Anneau B interne
        grad.addColorStop(0.60, 'rgba(235, 210, 175, 0.95)'); // Anneau B externe
        grad.addColorStop(0.64, 'rgba(0, 0, 0, 0)');          // Cassini Division (vide)
        grad.addColorStop(0.69, 'rgba(195, 170, 140, 0.75)'); // Anneau A interne
        grad.addColorStop(0.92, 'rgba(175, 150, 120, 0.65)'); // Anneau A externe
        grad.addColorStop(0.96, 'rgba(0, 0, 0, 0)');          // Encke Gap (vide)
        grad.addColorStop(1.0, 'rgba(150, 125, 95, 0.25)');   // Anneau F externe

        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, 1);

        // Bandes fines aléatoires pour donner du grain aux anneaux
        for (let i = 0; i < 60; i++) {
            const x = Math.floor(80 + Math.random() * (size - 100));
            ctx.fillStyle = `rgba(0, 0, 0, ${0.05 + Math.random() * 0.22})`;
            ctx.fillRect(x, 0, 1 + Math.floor(Math.random() * 2), 1);
        }
        return canvas;
    }
}
