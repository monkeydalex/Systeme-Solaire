import * as THREE from 'three';

export class SpecialEffectsManager {
    constructor(scene) {
        this.scene = scene;
        
        // États des effets
        this.stars = null;
        this.nebula = null;
        this.meteors = [];
        this.asteroidBelt = null;
        this.comet = null;
        this.spaceStation = null;

        // Configuration
        this.starsCount = 2000;
        this.asteroidsCount = 400;
        this.nextMeteorTime = 0;
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

    // --- Nébuleuse Spatiale ---
    toggleNebula(active) {
        if (active && !this.nebula) {
            const size = 512;
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');

            // Dégradé radial complexe pour la nébuleuse
            const grad = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
            grad.addColorStop(0, 'rgba(100, 50, 200, 0.22)');
            grad.addColorStop(0.3, 'rgba(150, 50, 100, 0.12)');
            grad.addColorStop(0.7, 'rgba(50, 20, 120, 0.05)');
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, size, size);

            // Taches colorées secondaires pour de la variété
            for (let i = 0; i < 6; i++) {
                const x = size/2 + (Math.random() - 0.5) * size * 0.4;
                const y = size/2 + (Math.random() - 0.5) * size * 0.4;
                const r = size * (0.15 + Math.random() * 0.2);
                
                const spotGrad = ctx.createRadialGradient(x, y, 0, x, y, r);
                const col = Math.random() > 0.5 ? 'rgba(0, 180, 255, 0.06)' : 'rgba(255, 50, 150, 0.05)';
                spotGrad.addColorStop(0, col);
                spotGrad.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = spotGrad;
                ctx.beginPath();
                ctx.arc(x, y, r, 0, Math.PI*2);
                ctx.fill();
            }

            const texture = new THREE.CanvasTexture(canvas);
            const material = new THREE.SpriteMaterial({
                map: texture,
                transparent: true,
                opacity: 0.8,
                blending: THREE.AdditiveBlending
            });

            this.nebula = new THREE.Sprite(material);
            this.nebula.scale.set(400, 250, 1);
            this.nebula.position.set(0, -50, -250);
            this.scene.add(this.nebula);
        } else if (!active && this.nebula) {
            this.scene.remove(this.nebula);
            this.nebula.material.map.dispose();
            this.nebula.material.dispose();
            this.nebula = null;
        }
    }

    // --- Pluie de Météores (Étoiles Filantes) ---
    toggleMeteors(active) {
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
        const length = 5 + Math.random() * 10;
        // Créer un trait lumineux effilé
        const geometry = new THREE.CylinderGeometry(0.0, 0.15, length, 4);
        const material = new THREE.MeshBasicMaterial({
            color: 0xffddaa,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });
        const mesh = new THREE.Mesh(geometry, material);

        // Position de départ haute et éloignée
        mesh.position.set(
            (Math.random() - 0.5) * 400,
            120 + Math.random() * 30,
            (Math.random() - 0.5) * 400
        );

        // Rotation pour pointer dans le sens de la chute (diagonale)
        mesh.rotation.z = Math.PI / 4 + (Math.random() - 0.5) * 0.2;
        mesh.rotation.x = (Math.random() - 0.5) * 0.2;

        const velocity = new THREE.Vector3(
            -1.5 - Math.random() * 1.5,
            -2.0 - Math.random() * 2.0,
            (Math.random() - 0.5) * 0.5
        );

        this.meteors.push({
            mesh,
            velocity,
            age: 0,
            maxAge: 40 + Math.random() * 30
        });

        this.scene.add(mesh);
    }

    // --- Ceinture d'Astéroïdes (Rochers irréguliers) ---
    toggleAsteroids(active) {
        if (active && !this.asteroidBelt) {
            this.asteroidBelt = new THREE.Group();
            
            // Matériau rocheux
            const material = new THREE.MeshStandardMaterial({
                color: 0x6e635b,
                roughness: 0.9,
                metalness: 0.1,
                flatShading: true // Aspect anguleux rocheux
            });

            for (let i = 0; i < this.asteroidsCount; i++) {
                // Créer des formes irrégulières
                const radius = 0.12 + Math.random() * 0.28;
                const geometry = new THREE.DodecahedronGeometry(radius, 1);
                
                // Déformer légèrement les sommets pour casser la régularité
                const pos = geometry.attributes.position;
                for (let j = 0; j < pos.count; j++) {
                    pos.setX(j, pos.getX(j) + (Math.random() - 0.5) * radius * 0.3);
                    pos.setY(j, pos.getY(j) + (Math.random() - 0.5) * radius * 0.3);
                    pos.setZ(j, pos.getZ(j) + (Math.random() - 0.5) * radius * 0.3);
                }
                geometry.computeVertexNormals();

                const asteroid = new THREE.Mesh(geometry, material);

                // Positionnement dans la ceinture entre Mars et Jupiter (distances 30 et 40)
                const dist = 33 + Math.random() * 5;
                const angle = Math.random() * Math.PI * 2;
                const height = (Math.random() - 0.5) * 1.8;

                asteroid.position.set(
                    Math.cos(angle) * dist,
                    height,
                    Math.sin(angle) * dist
                );

                // Rotations aléatoires
                asteroid.rotation.set(
                    Math.random() * Math.PI,
                    Math.random() * Math.PI,
                    Math.random() * Math.PI
                );

                asteroid.userData = {
                    orbitAngle: angle,
                    orbitRadius: dist,
                    orbitSpeed: (0.0005 + Math.random() * 0.001),
                    rotSpeedX: (Math.random() - 0.5) * 0.02,
                    rotSpeedY: (Math.random() - 0.5) * 0.02
                };

                asteroid.castShadow = true;
                asteroid.receiveShadow = true;
                this.asteroidBelt.add(asteroid);
            }

            this.scene.add(this.asteroidBelt);
        } else if (!active && this.asteroidBelt) {
            this.scene.remove(this.asteroidBelt);
            this.asteroidBelt.children.forEach(c => {
                c.geometry.dispose();
            });
            this.asteroidBelt = null;
        }
    }

    // --- Comète (avec noyau glacé et queue lumineuse) ---
    toggleComet(active) {
        if (active && !this.comet) {
            this.comet = new THREE.Group();

            // Noyau
            const nucleusGeo = new THREE.DodecahedronGeometry(0.3, 1);
            const nucleusMat = new THREE.MeshBasicMaterial({ color: 0xddf0ff });
            const nucleus = new THREE.Mesh(nucleusGeo, nucleusMat);
            this.comet.add(nucleus);

            // Queue de la comète (Cône transparent)
            const tailGeo = new THREE.ConeGeometry(0.5, 7, 8, 1, true);
            // Déplacer le pivot du cône à sa pointe
            tailGeo.translate(0, -3.5, 0);
            
            const tailMat = new THREE.MeshBasicMaterial({
                color: 0x90b0ff,
                transparent: true,
                opacity: 0.35,
                blending: THREE.AdditiveBlending,
                side: THREE.DoubleSide
            });
            const tail = new THREE.Mesh(tailGeo, tailMat);
            
            // Pointer la queue à l'opposé du mouvement (pivotée de 90 deg pour être horizontale)
            tail.rotation.x = -Math.PI / 2; 
            this.comet.add(tail);

            // Paramètres orbitaux très elliptiques
            this.comet.userData = {
                angle: 0,
                orbitRadiusX: 85,
                orbitRadiusZ: 35,
                speed: 0.003
            };

            this.scene.add(this.comet);
        } else if (!active && this.comet) {
            this.scene.remove(this.comet);
            this.comet.children.forEach(c => c.geometry.dispose());
            this.comet = null;
        }
    }

    // --- Station Spatiale (ISS style autour de la Terre) ---
    toggleSpaceStation(active) {
        if (active && !this.spaceStation) {
            this.spaceStation = new THREE.Group();

            // Structure cylindrique centrale
            const moduleGeo = new THREE.CylinderGeometry(0.12, 0.12, 1.2, 8);
            const metalMat = new THREE.MeshStandardMaterial({ color: 0xdcdcdc, roughness: 0.4, metalness: 0.8 });
            const mainModule = new THREE.Mesh(moduleGeo, metalMat);
            mainModule.rotation.z = Math.PI / 2;
            this.spaceStation.add(mainModule);

            // Panneaux solaires (bleus scintillants)
            const panelGeo = new THREE.BoxGeometry(0.03, 0.4, 1.4);
            const panelMat = new THREE.MeshStandardMaterial({
                color: 0x053570,
                roughness: 0.1,
                metalness: 0.9,
                emissive: 0x011030
            });

            const p1 = new THREE.Mesh(panelGeo, panelMat);
            p1.position.set(-0.6, 0, 0);
            const p2 = new THREE.Mesh(panelGeo, panelMat);
            p2.position.set(0.6, 0, 0);

            this.spaceStation.add(p1);
            this.spaceStation.add(p2);

            this.spaceStation.scale.set(0.8, 0.8, 0.8);
            this.spaceStation.userData = {
                angle: 0,
                orbitRadius: 2.2, // Proche de la Terre
                orbitSpeed: 0.02
            };

            this.scene.add(this.spaceStation);
        } else if (!active && this.spaceStation) {
            this.scene.remove(this.spaceStation);
            this.spaceStation.children.forEach(c => c.geometry.dispose());
            this.spaceStation = null;
        }
    }

    // --- Boucle de Mise à jour d'Animation ---
    update(speed, planets, postProcessingComposer) {
        const time = Date.now() * 0.001;

        // 1. Étoiles
        if (this.stars && this.stars.material.uniforms) {
            this.stars.material.uniforms.uTime.value = time;
        }

        // 2. Nébuleuse
        if (this.nebula) {
            this.nebula.rotation.z += 0.0003 * speed;
        }

        // 3. Météores
        if (this.meteors.length > 0 || (this.stars && Math.random() < 0.02 * speed)) {
            // Créer un météore de temps en temps si l'effet d'étoiles est actif
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
                m.mesh.material.opacity = Math.max(0, (m.maxAge - m.age) / 10);
            }

            if (m.age >= m.maxAge || m.mesh.position.y < -50) {
                this.scene.remove(m.mesh);
                m.mesh.geometry.dispose();
                m.mesh.material.dispose();
                this.meteors.splice(i, 1);
            }
        }

        // 4. Ceinture d'Astéroïdes
        if (this.asteroidBelt) {
            this.asteroidBelt.children.forEach(asteroid => {
                const ud = asteroid.userData;
                ud.orbitAngle += ud.orbitSpeed * speed;
                asteroid.position.x = Math.cos(ud.orbitAngle) * ud.orbitRadius;
                asteroid.position.z = Math.sin(ud.orbitAngle) * ud.orbitRadius;
                
                asteroid.rotation.x += ud.rotSpeedX * speed;
                asteroid.rotation.y += ud.rotSpeedY * speed;
            });
        }

        // 5. Comète
        if (this.comet) {
            const ud = this.comet.userData;
            ud.angle += ud.speed * speed;

            // Orbite Keplerienne / Elliptique
            const prevX = this.comet.position.x;
            const prevZ = this.comet.position.z;

            this.comet.position.x = Math.cos(ud.angle) * ud.orbitRadiusX;
            this.comet.position.z = Math.sin(ud.angle) * ud.orbitRadiusZ;
            // Inclinaison de l'orbite
            this.comet.position.y = Math.cos(ud.angle) * 12;

            // Orienter la queue de la comète à l'opposé de son vecteur vitesse
            const velocity = new THREE.Vector3(
                this.comet.position.x - prevX,
                this.comet.position.y - this.comet.position.y, // Simplifié sur le plan X/Z
                this.comet.position.z - prevZ
            );
            if (velocity.lengthSq() > 0.0001) {
                velocity.normalize();
                // Faire pivoter le groupe pour orienter la queue (qui est sur l'axe Z négatif du groupe)
                const targetPoint = this.comet.position.clone().add(velocity);
                this.comet.lookAt(targetPoint);
            }
        }

        // 6. Station Spatiale (ISS) autour de la Terre
        if (this.spaceStation && planets['terre']) {
            const earthMesh = planets['terre'].group;
            const ud = this.spaceStation.userData;
            ud.angle += ud.orbitSpeed * speed;

            // Position relative à la Terre
            const offsetX = Math.cos(ud.angle) * ud.orbitRadius;
            const offsetZ = Math.sin(ud.angle) * ud.orbitRadius;
            const offsetY = Math.sin(ud.angle * 0.5) * 0.4; // Inclinaison de l'orbite

            this.spaceStation.position.set(
                earthMesh.position.x + offsetX,
                earthMesh.position.y + offsetY,
                earthMesh.position.z + offsetZ
            );

            // Faire pointer la station vers la Terre
            this.spaceStation.lookAt(earthMesh.position);
        }
    }
}
