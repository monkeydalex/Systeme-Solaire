import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';
import { fallbackColors } from '../data/planetData.js';
import { createSunMaterial } from './SunMaterial.js';

const noise2D = createNoise2D();

// Cache local pour les textures générées
const generatedTextureCache = {};

const textureLoader = new THREE.TextureLoader();

// Texture auxiliaire (relief, rugosité, nuages…) : données linéaires, pas sRGB
function loadDataTexture(url) {
    const texture = textureLoader.load(url);
    texture.anisotropy = 8;
    return texture;
}

// Masque la lumière émise (villes de la Terre) du côté jour : le Soleil est à
// l'origine, sa direction se déduit donc de la position monde du fragment.
function maskEmissiveOnDaySide(material) {
    material.onBeforeCompile = (shader) => {
        shader.vertexShader = 'varying vec3 vSunWorldPos;\nvarying vec3 vSunWorldNormal;\n' +
            shader.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
                vSunWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
                vSunWorldNormal = normalize(mat3(modelMatrix) * objectNormal);`);
        shader.fragmentShader = 'varying vec3 vSunWorldPos;\nvarying vec3 vSunWorldNormal;\n' +
            shader.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
                float sunFacing = dot(normalize(vSunWorldNormal), normalize(-vSunWorldPos));
                totalEmissiveRadiance *= smoothstep(0.12, -0.18, sunFacing);`);
    };
}

// Atmosphère : halo de bord (fresnel) éclairé seulement du côté du Soleil
function createAtmosphereMaterial(color, strength) {
    return new THREE.ShaderMaterial({
        vertexShader: `
            varying vec3 vNormalView;
            varying vec3 vNormalWorld;
            varying vec3 vPosWorld;
            void main() {
                vNormalView = normalize(normalMatrix * normal);
                vNormalWorld = normalize(mat3(modelMatrix) * normal);
                vPosWorld = (modelMatrix * vec4(position, 1.0)).xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 color;
            uniform float strength;
            varying vec3 vNormalView;
            varying vec3 vNormalWorld;
            varying vec3 vPosWorld;
            void main() {
                float rim = pow(clamp(0.78 - dot(vNormalView, vec3(0.0, 0.0, 1.0)), 0.0, 1.0), 2.2);
                float day = smoothstep(-0.35, 0.55, dot(normalize(vNormalWorld), normalize(-vPosWorld)));
                gl_FragColor = vec4(color * rim * day * strength, 1.0);
            }
        `,
        uniforms: {
            color: { value: color },
            strength: { value: strength }
        },
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false
    });
}

// Anneau plat dont les UVs sont remappés radialement : u = position entre rayon
// interne et externe, sinon la texture 1D serait plaquée de gauche à droite
export function createRingGeometry(innerRadius, outerRadius) {
    const geometry = new THREE.RingGeometry(innerRadius, outerRadius, 128);
    const pos = geometry.attributes.position;
    const uv = geometry.attributes.uv;
    const v3 = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
        v3.fromBufferAttribute(pos, i);
        uv.setXY(i, (v3.length() - innerRadius) / (outerRadius - innerRadius), 0.5);
    }
    return geometry;
}

// Anneaux : texture radiale (couleur + transparence) et ombre de la planète,
// calculée analytiquement (rayon anneau → Soleil intercepte-t-il la sphère ?)
function createRingMaterial(texture, planetCenter, planetRadius) {
    return new THREE.ShaderMaterial({
        vertexShader: `
            varying vec2 vUv;
            varying vec3 vPosWorld;
            void main() {
                vUv = uv;
                vPosWorld = (modelMatrix * vec4(position, 1.0)).xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform sampler2D ringMap;
            uniform vec3 planetCenter;
            uniform float planetRadius;
            varying vec2 vUv;
            varying vec3 vPosWorld;
            void main() {
                vec4 texel = texture2D(ringMap, vec2(vUv.x, 0.5));
                vec3 toSun = normalize(-vPosWorld);
                vec3 oc = vPosWorld - planetCenter;
                float b = dot(oc, toSun);
                float closest = length(oc - b * toSun);
                float shadow = b < 0.0
                    ? smoothstep(planetRadius * 0.92, planetRadius * 1.04, closest)
                    : 1.0;
                vec3 col = texel.rgb * (0.12 + 0.95 * shadow);
                gl_FragColor = vec4(col, texel.a * 0.95);
                #include <colorspace_fragment>
            }
        `,
        uniforms: {
            ringMap: { value: texture },
            planetCenter: { value: planetCenter },
            planetRadius: { value: planetRadius }
        },
        side: THREE.DoubleSide,
        transparent: true,
        depthWrite: false
    });
}

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
        let material;
        if (this.key === 'soleil') {
            // Surface animée par shader (FBM) : pas de texture à charger
            material = createSunMaterial();
            this.sunMaterial = material;
        } else if (this.key === 'terre') {
            // Océans brillants / continents mats, relief, lumières des villes la nuit
            material = new THREE.MeshStandardMaterial({
                map: this.loadTexture(),
                normalMap: loadDataTexture('./textures/earth_normal.webp'),
                normalScale: new THREE.Vector2(0.8, 0.8),
                roughnessMap: loadDataTexture('./textures/earth_roughness.webp'),
                roughness: 1,
                metalness: 0,
                emissiveMap: this.loadColorTexture('./textures/earth_night.webp'),
                emissive: new THREE.Color(0xffd9a8),
                emissiveIntensity: 1.6
            });
            maskEmissiveOnDaySide(material);
        } else {
            const texture = this.loadTexture();
            // Relief tiré de la texture de couleur : seulement pour les surfaces rocheuses
            const rocky = this.key === 'mercure' || this.key === 'mars';
            material = new THREE.MeshStandardMaterial({
                map: texture,
                roughness: 0.95,
                metalness: 0,
                bumpMap: rocky ? texture : null,
                bumpScale: rocky ? 1.5 : 1
            });
        }

        this.mesh = new THREE.Mesh(geometry, material);
        this.tiltGroup.rotation.z = THREE.MathUtils.degToRad(this.data.axialTilt || 0);
        this.tiltGroup.add(this.mesh);
        this.group.add(this.tiltGroup);

        // 3. Cas spécifiques
        // A. Soleil (Lumière + Lueur)
        if (this.key === 'soleil') {
            // PointLight centrale puissante (decay 0 : pas d'atténuation,
            // les distances de la scène sont pédagogiques, pas physiques)
            this.light = new THREE.PointLight(0xffffff, 2.4, 0, 0);
            this.group.add(this.light);

            // Sprite de lueur du soleil
            const glowCanvas = this.createSunGlowTexture();
            const glowTexture = new THREE.CanvasTexture(glowCanvas);
            const spriteMaterial = new THREE.SpriteMaterial({
                map: glowTexture,
                color: 0xffaa44,
                transparent: true,
                blending: THREE.AdditiveBlending,
                opacity: 0.8,
                // Sans ça, le quad du sprite masque les orbites derrière lui
                depthWrite: false
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
                opacity: 0.30,
                depthWrite: false
            });
            this.coronaSprite = new THREE.Sprite(coronaMaterial);
            this.coronaSprite.scale.set(this.data.rayon * 7.5, this.data.rayon * 7.5, 1);
            this.group.add(this.coronaSprite);
        }

        // B. Terre (Nuages + Atmosphère)
        if (this.key === 'terre') {
            // Nuages réels (niveaux de gris utilisés comme transparence)
            const cloudsGeometry = new THREE.SphereGeometry(this.data.rayon * 1.012, 64, 64);
            const cloudsMaterial = new THREE.MeshStandardMaterial({
                alphaMap: loadDataTexture('./textures/earth_clouds.webp'),
                transparent: true,
                depthWrite: false,
                color: 0xffffff,
                roughness: 1,
                metalness: 0
            });
            this.cloudsMesh = new THREE.Mesh(cloudsGeometry, cloudsMaterial);
            this.tiltGroup.add(this.cloudsMesh);
        }

        // C. Atmosphère (Terre & Vénus)
        if (this.key === 'terre' || this.key === 'venus') {
            const atmosphereGeometry = new THREE.SphereGeometry(this.data.rayon + 0.14, 64, 64);
            const atmosphereMaterial = this.key === 'terre'
                ? createAtmosphereMaterial(new THREE.Color(0x3a9eff), 1.5)
                : createAtmosphereMaterial(new THREE.Color(0xffcc88), 1.2);

            this.atmosphereMesh = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
            this.group.add(this.atmosphereMesh);
        }

        // D. Saturne (Anneaux)
        if (this.key === 'saturne') {
            const innerRadius = this.data.rayon + 0.5;
            const outerRadius = this.data.rayon + 3.0;
            const ringGeometry = createRingGeometry(innerRadius, outerRadius);

            // Texture réelle des anneaux (division de Cassini incluse), ombre de Saturne
            const ringTexture = this.loadColorTexture('./textures/saturn_ring.webp');
            const ringMaterial = createRingMaterial(ringTexture, this.group.position, this.data.rayon);

            this.ringsMesh = new THREE.Mesh(ringGeometry, ringMaterial);
            // Plan équatorial exact : l'inclinaison réelle vient du tiltGroup
            this.ringsMesh.rotation.x = Math.PI / 2;
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
            color: 0x7788bb,
            transparent: true,
            opacity: 0.5,
            linewidth: 1
        });
        this.orbitMesh = new THREE.Line(orbitGeometry, orbitMaterial);
        this.scene.add(this.orbitMesh);
    }

    rebuildOrbit() {
        if (this.orbitMesh) {
            this.scene.remove(this.orbitMesh);
            this.orbitMesh.geometry.dispose();
            this.orbitMesh.material.dispose();
            this.orbitMesh = null;
        }

        if (this.key !== 'soleil') {
            this.createOrbit();
        }
    }

    applyScaleData(data) {
        this.data = {
            ...this.data,
            distance: data.distance,
            vitesseOrbite: data.vitesseOrbite
        };
        this.updatePosition();
        this.rebuildOrbit();
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

    // Texture pour l'aperçu de la fiche : les corps dont la vraie texture est
    // inutilisable en gros plan (Soleil devenu shader, dégradés trop lisses
    // d'Uranus/Neptune) utilisent la version procédurale détaillée
    // Textures réutilisées par l'aperçu 3D de la fiche (mêmes que dans la scène)
    getPreviewTextures() {
        if (this.key === 'soleil') {
            // Le Soleil de la scène est un shader : l'aperçu charge sa texture à la demande
            if (!this.previewTexture) this.previewTexture = this.loadTexture();
            return { map: this.previewTexture, emissive: true };
        }
        const material = this.mesh.material;
        return {
            map: material.map,
            normalMap: material.normalMap,
            roughnessMap: material.roughnessMap,
            bumpMap: material.bumpMap,
            clouds: this.cloudsMesh ? this.cloudsMesh.material.alphaMap : null,
            ring: this.ringsMesh ? this.ringsMesh.material.uniforms.ringMap.value : null,
            ringRadii: this.ringsMesh
                ? [(this.data.rayon + 0.5) / this.data.rayon, (this.data.rayon + 3.0) / this.data.rayon]
                : null
        };
    }

    loadColorTexture(url) {
        const texture = textureLoader.load(url);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = 8;
        return texture;
    }

    // Charge la vraie texture ; retombe sur la texture procédurale en cas d'échec
    loadTexture() {
        if (!this.data.texture) return this.getOrCreateProceduralTexture();

        const texture = textureLoader.load(
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
                this.drawIceGiantTexture(ctx, size, [
                    '#8fd8e8', '#a5e2ec', '#7cc8de', '#96dce6', '#6db8d6'
                ], 0.5);
                break;
            case 'neptune':
                this.drawIceGiantTexture(ctx, size, [
                    '#2c50c8', '#3f6ad8', '#2a48b0', '#4a78e0', '#1f3a9a'
                ], 1.0, true); // true = ajouter la grande tache sombre
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

    drawIceGiantTexture(ctx, size, bandColors, detailStrength, addDarkSpot = false) {
        // 1. Bandes latitudinales (dégradé vertical)
        const grad = ctx.createLinearGradient(0, 0, 0, size);
        bandColors.forEach((color, i) => grad.addColorStop(i / (bandColors.length - 1), color));
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);

        // 2. Vents zonaux : stries horizontales bruitées
        const imgData = ctx.getImageData(0, 0, size, size);
        const data = imgData.data;
        for (let y = 0; y < size; y++) {
            const bandNoise = noise2D(0.5, y / 16);
            for (let x = 0; x < size; x++) {
                const idx = (y * size + x) * 4;
                const n = (noise2D(x / 180, y / 24) * 0.7 + bandNoise * 0.5) * detailStrength * 26;
                data[idx] = Math.max(0, Math.min(255, data[idx] + n * 0.5));
                data[idx + 1] = Math.max(0, Math.min(255, data[idx + 1] + n * 0.8));
                data[idx + 2] = Math.max(0, Math.min(255, data[idx + 2] + n));
            }
        }
        ctx.putImageData(imgData, 0, 0);

        // 3. Nuages clairs étirés par les vents
        for (let i = 0; i < 14; i++) {
            const x = Math.random() * size;
            const y = size * (0.12 + Math.random() * 0.76);
            const w = size * (0.05 + Math.random() * 0.14);
            const cloudGrad = ctx.createRadialGradient(x, y, 0, x, y, w);
            cloudGrad.addColorStop(0, `rgba(255, 255, 255, ${0.08 + detailStrength * 0.12})`);
            cloudGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = cloudGrad;
            ctx.beginPath();
            ctx.ellipse(x, y, w, w * 0.22, 0, 0, Math.PI * 2);
            ctx.fill();
        }

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
}
