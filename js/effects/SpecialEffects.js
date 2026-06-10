import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';

const noise2D = createNoise2D();

export class SpecialEffectsManager {
    constructor(scene) {
        this.scene = scene;

        // États des effets
        this.stars = null;
        this.nebulas = [];
        this.meteorsActive = false;
        this.meteors = [];
        this.asteroidBelt = null;
        this.asteroidData = null;
        this.comet = null;
        this.spaceStation = null;

        // Configuration
        this.starsCount = 6000;
        this.asteroidsCount = 600;
        this.nextMeteorTime = 0;

        this._dummy = new THREE.Object3D();
    }

    // --- Étoiles Scintillantes (Shader ultra-performant) ---
    toggleStars(active) {
        if (active && !this.stars) {
            const geometry = new THREE.BufferGeometry();
            const positions = new Float32Array(this.starsCount * 3);
            const sizes = new Float32Array(this.starsCount);
            const phases = new Float32Array(this.starsCount);
            const colors = new Float32Array(this.starsCount * 3);

            const starColors = [
                new THREE.Color(0xffffff),
                new THREE.Color(0xffe9d4), // Étoile un peu chaude
                new THREE.Color(0xd4f0ff), // Étoile bleutée
                new THREE.Color(0xffd4d4)  // Étoile rougeâtre
            ];

            for (let i = 0; i < this.starsCount; i++) {
                // Position aléatoire dans une sphère géante autour du système
                const radius = 350 + Math.random() * 200;
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(2 * Math.random() - 1);

                positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
                positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
                positions[i * 3 + 2] = radius * Math.cos(phi);

                sizes[i] = Math.random() * 2.0 + 0.5;
                phases[i] = Math.random() * Math.PI * 2;

                const col = starColors[Math.floor(Math.random() * starColors.length)];
                colors[i * 3] = col.r;
                colors[i * 3 + 1] = col.g;
                colors[i * 3 + 2] = col.b;
            }

            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
            geometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1));
            geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

            // Shader de particules scintillantes
            const material = new THREE.ShaderMaterial({
                uniforms: {
                    uTime: { value: 0 }
                },
                vertexShader: `
                    uniform float uTime;
                    attribute float size;
                    attribute float phase;
                    attribute vec3 color;
                    varying vec3 vColor;
                    varying float vAlpha;

                    void main() {
                        vColor = color;
                        // Calcul du scintillement dans le vertex shader
                        vAlpha = 0.4 + 0.6 * sin(uTime * 2.0 + phase);

                        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                        gl_PointSize = size * (300.0 / -mvPosition.z);
                        gl_Position = projectionMatrix * mvPosition;
                    }
                `,
                fragmentShader: `
                    varying vec3 vColor;
                    varying float vAlpha;

                    void main() {
                        // Dessiner un point circulaire et adouci
                        float dist = length(gl_PointCoord - vec2(0.5));
                        if (dist > 0.5) discard;

                        float alpha = smoothstep(0.5, 0.1, dist) * vAlpha;
                        gl_FragColor = vec4(vColor, alpha);
                    }
                `,
                transparent: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });

            this.stars = new THREE.Points(geometry, material);
            this.scene.add(this.stars);
        } else if (!active && this.stars) {
            this.scene.remove(this.stars);
            this.stars.geometry.dispose();
            this.stars.material.dispose();
            this.stars = null;
        }
    }

    // --- Nébuleuses (voiles fBM répartis autour de la scène) ---
    createNebulaTexture(r, g, b) {
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const imgData = ctx.createImageData(size, size);
        const data = imgData.data;

        const seedX = Math.random() * 100;
        const seedY = Math.random() * 100;

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                // Bruit fractal 4 octaves
                let n = 0, amp = 0.5, freq = 1 / 90;
                for (let o = 0; o < 4; o++) {
                    n += amp * (noise2D(seedX + x * freq, seedY + y * freq) * 0.5 + 0.5);
                    amp *= 0.5;
                    freq *= 2.1;
                }

                // Atténuation radiale douce vers les bords
                const dx = (x - size / 2) / (size / 2);
                const dy = (y - size / 2) / (size / 2);
                const falloff = Math.max(0, 1 - (dx * dx + dy * dy));

                const v = Math.pow(n, 2.2) * falloff;
                const idx = (y * size + x) * 4;
                data[idx] = r;
                data[idx + 1] = g;
                data[idx + 2] = b;
                data[idx + 3] = Math.min(255, v * 280);
            }
        }
        ctx.putImageData(imgData, 0, 0);
        return new THREE.CanvasTexture(canvas);
    }

    toggleNebula(active) {
        if (active && this.nebulas.length === 0) {
            // Trois voiles colorés, loin derrière les étoiles proches,
            // répartis pour être visibles sous tous les angles de caméra
            const configs = [
                { color: [150, 70, 220], pos: [-320, 90, -280], scale: 380 },  // violet
                { color: [40, 160, 255], pos: [340, -60, -300], scale: 300 },  // cyan
                { color: [255, 90, 140], pos: [120, 150, 330], scale: 330 }    // rose
            ];

            for (const cfg of configs) {
                const material = new THREE.SpriteMaterial({
                    map: this.createNebulaTexture(...cfg.color),
                    transparent: true,
                    opacity: 0.55,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false,
                    rotation: Math.random() * Math.PI
                });
                const sprite = new THREE.Sprite(material);
                sprite.position.set(...cfg.pos);
                sprite.scale.set(cfg.scale, cfg.scale * 0.65, 1);
                this.scene.add(sprite);
                this.nebulas.push(sprite);
            }
        } else if (!active && this.nebulas.length > 0) {
            for (const nebula of this.nebulas) {
                this.scene.remove(nebula);
                nebula.material.map.dispose();
                nebula.material.dispose();
            }
            this.nebulas = [];
        }
    }

    // --- Pluie de Météores (Étoiles Filantes) ---
    toggleMeteors(active) {
        this.meteorsActive = active;
        if (!active && this.meteors.length > 0) {
            this.meteors.forEach(m => {
                this.scene.remove(m.mesh);
                m.mesh.geometry.dispose();
                m.mesh.material.dispose();
            });
            this.meteors = [];
        }
    }

    createMeteor() {
        const length = 6 + Math.random() * 12;
        // Trait effilé : tête large (+Y) vers pointe fine (-Y)
        const geometry = new THREE.CylinderGeometry(0.16, 0.0, length, 5);
        geometry.translate(0, -length / 2, 0); // tête à l'origine, traînée derrière

        const warm = Math.random() > 0.4;
        const material = new THREE.MeshBasicMaterial({
            color: warm ? 0xffddaa : 0xcfe4ff,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const mesh = new THREE.Mesh(geometry, material);

        mesh.position.set(
            (Math.random() - 0.5) * 400,
            110 + Math.random() * 40,
            (Math.random() - 0.5) * 400
        );

        const velocity = new THREE.Vector3(
            -1.5 - Math.random() * 1.5,
            -2.0 - Math.random() * 2.0,
            (Math.random() - 0.5) * 0.8
        );

        // Orienter la tête (+Y local) dans la direction du vol
        const dir = velocity.clone().normalize();
        mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);

        this.meteors.push({
            mesh,
            velocity,
            age: 0,
            maxAge: 40 + Math.random() * 30
        });

        this.scene.add(mesh);
    }

    // --- Ceinture d'Astéroïdes (InstancedMesh : un seul draw call) ---
    toggleAsteroids(active) {
        if (active && !this.asteroidBelt) {
            // Une géométrie rocheuse partagée, déformée pour casser la régularité
            const geometry = new THREE.DodecahedronGeometry(1, 1);
            const pos = geometry.attributes.position;
            for (let j = 0; j < pos.count; j++) {
                pos.setX(j, pos.getX(j) + (Math.random() - 0.5) * 0.35);
                pos.setY(j, pos.getY(j) + (Math.random() - 0.5) * 0.35);
                pos.setZ(j, pos.getZ(j) + (Math.random() - 0.5) * 0.35);
            }
            geometry.computeVertexNormals();

            const material = new THREE.MeshStandardMaterial({
                color: 0x8a7d72,
                roughness: 0.9,
                metalness: 0.1,
                flatShading: true
            });

            this.asteroidBelt = new THREE.InstancedMesh(geometry, material, this.asteroidsCount);
            this.asteroidBelt.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

            // Données orbitales par instance
            this.asteroidData = [];
            for (let i = 0; i < this.asteroidsCount; i++) {
                this.asteroidData.push({
                    angle: Math.random() * Math.PI * 2,
                    radius: 33 + Math.random() * 5,
                    height: (Math.random() - 0.5) * 2.0,
                    orbitSpeed: 0.0005 + Math.random() * 0.001,
                    scale: 0.1 + Math.random() * 0.28,
                    rotX: Math.random() * Math.PI,
                    rotY: Math.random() * Math.PI,
                    rotSpeedX: (Math.random() - 0.5) * 0.02,
                    rotSpeedY: (Math.random() - 0.5) * 0.02
                });
            }
            this.updateAsteroidMatrices(0);

            this.scene.add(this.asteroidBelt);
        } else if (!active && this.asteroidBelt) {
            this.scene.remove(this.asteroidBelt);
            this.asteroidBelt.geometry.dispose();
            this.asteroidBelt.material.dispose();
            this.asteroidBelt.dispose();
            this.asteroidBelt = null;
            this.asteroidData = null;
        }
    }

    updateAsteroidMatrices(speed) {
        const dummy = this._dummy;
        for (let i = 0; i < this.asteroidsCount; i++) {
            const a = this.asteroidData[i];
            a.angle += a.orbitSpeed * speed;
            a.rotX += a.rotSpeedX * speed;
            a.rotY += a.rotSpeedY * speed;

            dummy.position.set(
                Math.cos(a.angle) * a.radius,
                a.height,
                Math.sin(a.angle) * a.radius
            );
            dummy.rotation.set(a.rotX, a.rotY, 0);
            dummy.scale.setScalar(a.scale);
            dummy.updateMatrix();
            this.asteroidBelt.setMatrixAt(i, dummy.matrix);
        }
        this.asteroidBelt.instanceMatrix.needsUpdate = true;
    }

    // --- Comète : noyau + coma + double queue anti-solaire, orbite à foyer ---
    toggleComet(active) {
        if (active && !this.comet) {
            this.comet = new THREE.Group();

            // Noyau glacé
            const nucleusGeo = new THREE.DodecahedronGeometry(0.3, 1);
            const nucleusMat = new THREE.MeshBasicMaterial({ color: 0xddf0ff });
            this.comet.add(new THREE.Mesh(nucleusGeo, nucleusMat));

            // Coma : halo autour du noyau
            const comaCanvas = document.createElement('canvas');
            comaCanvas.width = comaCanvas.height = 64;
            const cctx = comaCanvas.getContext('2d');
            const comaGrad = cctx.createRadialGradient(32, 32, 0, 32, 32, 32);
            comaGrad.addColorStop(0, 'rgba(210, 235, 255, 0.9)');
            comaGrad.addColorStop(0.4, 'rgba(150, 200, 255, 0.35)');
            comaGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            cctx.fillStyle = comaGrad;
            cctx.fillRect(0, 0, 64, 64);
            const comaMat = new THREE.SpriteMaterial({
                map: new THREE.CanvasTexture(comaCanvas),
                transparent: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                opacity: 0.9
            });
            const coma = new THREE.Sprite(comaMat);
            coma.scale.set(2.2, 2.2, 1);
            this.comet.add(coma);

            // Queue ionique : longue, fine, bleutée — pointe à l'opposé du Soleil (-Y local)
            const ionGeo = new THREE.ConeGeometry(0.35, 10, 8, 1, true);
            ionGeo.translate(0, -5, 0); // pointe au noyau, s'étend vers -Y
            const ionMat = new THREE.MeshBasicMaterial({
                color: 0x88b8ff,
                transparent: true,
                opacity: 0.30,
                blending: THREE.AdditiveBlending,
                side: THREE.DoubleSide,
                depthWrite: false
            });
            this.comet.add(new THREE.Mesh(ionGeo, ionMat));

            // Queue de poussière : plus courte, large, chaude, légèrement incurvée
            const dustGeo = new THREE.ConeGeometry(0.75, 6, 8, 1, true);
            dustGeo.translate(0, -3, 0);
            const dustMat = new THREE.MeshBasicMaterial({
                color: 0xffeecc,
                transparent: true,
                opacity: 0.18,
                blending: THREE.AdditiveBlending,
                side: THREE.DoubleSide,
                depthWrite: false
            });
            const dustTail = new THREE.Mesh(dustGeo, dustMat);
            dustTail.rotation.z = 0.22; // décalée de la queue ionique
            this.comet.add(dustTail);

            // Orbite elliptique avec le Soleil au foyer (périhélie proche)
            const a = 60, b = 26;
            this.comet.userData = {
                angle: Math.random() * Math.PI * 2,
                a,
                b,
                c: Math.sqrt(a * a - b * b), // décalage du foyer
                speed: 0.004
            };

            this.scene.add(this.comet);
        } else if (!active && this.comet) {
            this.scene.remove(this.comet);
            this.comet.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (child.material.map) child.material.map.dispose();
                    child.material.dispose();
                }
            });
            this.comet = null;
        }
    }

    // --- Station Spatiale (ISS-like autour de la Terre) ---
    toggleSpaceStation(active) {
        if (active && !this.spaceStation) {
            this.spaceStation = new THREE.Group();

            const metalMat = new THREE.MeshStandardMaterial({ color: 0xdcdcdc, roughness: 0.35, metalness: 0.8 });
            const panelMat = new THREE.MeshStandardMaterial({
                color: 0x0a3f85,
                roughness: 0.15,
                metalness: 0.85,
                emissive: 0x06204a
            });

            // Poutre principale
            const truss = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.07, 0.07), metalMat);
            this.spaceStation.add(truss);

            // 4 panneaux solaires par paires aux extrémités
            const panelGeo = new THREE.BoxGeometry(0.55, 0.015, 0.4);
            for (const [x, z] of [[-1.0, 0.28], [-1.0, -0.28], [1.0, 0.28], [1.0, -0.28]]) {
                const panel = new THREE.Mesh(panelGeo, panelMat);
                panel.position.set(x, 0, z);
                this.spaceStation.add(panel);
            }

            // Modules pressurisés en croix au centre
            const moduleA = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.9, 12), metalMat);
            moduleA.rotation.x = Math.PI / 2; // le long de Z
            this.spaceStation.add(moduleA);

            const moduleB = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.5, 12), metalMat);
            this.spaceStation.add(moduleB); // vertical

            // Coupole / antenne parabolique
            const dish = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), metalMat);
            dish.position.set(0, 0.3, 0);
            this.spaceStation.add(dish);

            this.spaceStation.userData = {
                angle: 0,
                orbitRadius: 2.3,
                orbitSpeed: 0.02
            };

            this.scene.add(this.spaceStation);
        } else if (!active && this.spaceStation) {
            this.scene.remove(this.spaceStation);
            this.spaceStation.traverse(child => {
                if (child.geometry) child.geometry.dispose();
            });
            this.spaceStation = null;
        }
    }

    // --- Boucle de Mise à jour d'Animation ---
    update(speed, planets) {
        const time = Date.now() * 0.001;

        // 1. Étoiles
        if (this.stars && this.stars.material.uniforms) {
            this.stars.material.uniforms.uTime.value = time;
        }

        // 2. Nébuleuses : dérive très lente
        for (const nebula of this.nebulas) {
            nebula.material.rotation += 0.0001 * speed;
        }

        // 3. Météores : spawn uniquement si l'effet est activé
        if (this.meteorsActive) {
            const now = Date.now();
            if (now > this.nextMeteorTime && this.meteors.length < 15) {
                this.createMeteor();
                this.nextMeteorTime = now + 400 + Math.random() * 1200 / (speed || 1);
            }
        }

        // Mettre à jour les météores existants
        for (let i = this.meteors.length - 1; i >= 0; i--) {
            const m = this.meteors[i];
            m.mesh.position.addScaledVector(m.velocity, speed);
            m.age += speed;

            // Fade-out à la fin
            if (m.age > m.maxAge - 10) {
                m.mesh.material.opacity = Math.max(0, (m.maxAge - m.age) / 10) * 0.9;
            }

            if (m.age >= m.maxAge || m.mesh.position.y < -50) {
                this.scene.remove(m.mesh);
                m.mesh.geometry.dispose();
                m.mesh.material.dispose();
                this.meteors.splice(i, 1);
            }
        }

        // 4. Ceinture d'Astéroïdes (matrices d'instances)
        if (this.asteroidBelt) {
            this.updateAsteroidMatrices(speed);
        }

        // 5. Comète : orbite à foyer, plus rapide au périhélie, queues anti-solaires
        if (this.comet) {
            const ud = this.comet.userData;
            this.comet.position.set(
                Math.cos(ud.angle) * ud.a - ud.c,
                Math.sin(ud.angle) * 6,
                Math.sin(ud.angle) * ud.b
            );

            const r = this.comet.position.length();
            // Accélération képlérienne approchée près du Soleil
            ud.angle += ud.speed * (28 / Math.max(r, 6)) * speed;

            // Les queues (axe -Y local) pointent à l'opposé du Soleil (origine)
            if (r > 0.001) {
                const awayFromSun = this.comet.position.clone().normalize();
                this.comet.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), awayFromSun);
            }

            // La coma s'intensifie près du Soleil
            const coma = this.comet.children[1];
            if (coma && coma.material) {
                coma.material.opacity = THREE.MathUtils.clamp(1.6 - r / 40, 0.25, 1);
            }
        }

        // 6. Station Spatiale (ISS) autour de la Terre
        if (this.spaceStation && planets['terre']) {
            const earthGroup = planets['terre'].group;
            const ud = this.spaceStation.userData;
            ud.angle += ud.orbitSpeed * speed;

            // Orbite légèrement inclinée autour de la Terre
            const offsetX = Math.cos(ud.angle) * ud.orbitRadius;
            const offsetZ = Math.sin(ud.angle) * ud.orbitRadius;
            const offsetY = Math.sin(ud.angle) * 0.5;

            this.spaceStation.position.set(
                earthGroup.position.x + offsetX,
                earthGroup.position.y + offsetY,
                earthGroup.position.z + offsetZ
            );

            // Garder la poutre tangente à l'orbite
            this.spaceStation.lookAt(earthGroup.position);
        }
    }
}
