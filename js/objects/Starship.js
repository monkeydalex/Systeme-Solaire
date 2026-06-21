import * as THREE from 'three';

const _matrix = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _up = new THREE.Vector3(0, 1, 0);
const _vec = new THREE.Vector3();

// Vaisseau pilotable : vol avec accélération/freinage progressifs, trajectoire
// incurvée (steering), rotation lissée, insertion orbitale douce.
// Destinations valides : planètes ET lunes.
export class Starship {
    constructor(scene, startKey, bodies) {
        this.scene = scene;
        this.bodies = bodies; // { clé -> Planet | Moon }

        // États de vol : 'orbiting' ou 'traveling'
        this.state = 'orbiting';
        this.currentKey = startKey;
        this.targetKey = null;

        this.group = new THREE.Group();
        this.particlesGroup = new THREE.Group();
        this.flameGroup = null;
        this.engineLight = null;
        this.nozzleAnchor = null;

        this.orbitAngle = 0;
        this.orbitRadius = 0;
        this.speedMultiplier = 1.0;

        // Dynamique de vol
        this.heading = new THREE.Vector3(0, 0, 1);
        this.travelSpeed = 0;
        this.startDistance = 1;
        this.lastDistance = 0;

        // Pool de particules de traînée (sprites réutilisés, zéro churn)
        this.trailPool = [];
        this.trailSize = 110;
        this.trailIndex = 0;

        this.create();
    }

    // Position monde d'un corps (planète ou lune)
    getBodyPos(key, out) {
        const body = this.bodies[key];
        if (!body) return null;
        if (body.planet) {
            // Lune : position monde du mesh
            return body.mesh.getWorldPosition(out);
        }
        return out.copy(body.group.position);
    }

    getBodyRadius(key) {
        const body = this.bodies[key];
        return body ? body.data.rayon : 1;
    }

    // Rayon d'orbite du vaisseau autour d'un corps
    getOrbitRadius(key) {
        const body = this.bodies[key];
        if (!body) return 2;
        return body.data.rayon + (body.planet ? 0.9 : 1.5);
    }

    create() {
        this.orbitRadius = this.getOrbitRadius(this.currentKey);

        // 1. Matériau métallique poli (Chrome/Acier)
        const metalMaterial = new THREE.MeshStandardMaterial({
            color: 0xe0e0e0,
            metalness: 0.9,
            roughness: 0.15
        });

        // 2. Corps de la fusée (Cylindre élancé)
        const bodyGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.7, 12);
        const body = new THREE.Mesh(bodyGeo, metalMaterial);
        body.rotation.x = Math.PI / 2; // Orienter le long de l'axe Z local
        this.group.add(body);

        // 3. Nez (Cône aérodynamique)
        const noseGeo = new THREE.ConeGeometry(0.12, 0.3, 12);
        const nose = new THREE.Mesh(noseGeo, metalMaterial);
        nose.position.z = 0.5;
        nose.rotation.x = Math.PI / 2;
        this.group.add(nose);

        // 4. Ailerons stabilisateurs (3 ailerons à l'arrière)
        const finGeo = new THREE.BoxGeometry(0.04, 0.2, 0.2);
        for (let i = 0; i < 3; i++) {
            const fin = new THREE.Mesh(finGeo, metalMaterial);
            const angle = (i / 3) * Math.PI * 2;
            fin.position.x = Math.cos(angle) * 0.15;
            fin.position.y = Math.sin(angle) * 0.15;
            fin.position.z = -0.3;
            fin.rotation.z = angle;
            this.group.add(fin);
        }

        // 5. Tuyère
        const nozzleGeo = new THREE.CylinderGeometry(0.08, 0.05, 0.1, 8);
        const nozzleMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8 });
        const nozzle = new THREE.Mesh(nozzleGeo, nozzleMat);
        nozzle.position.z = -0.4;
        nozzle.rotation.x = Math.PI / 2;
        this.group.add(nozzle);

        // Point d'émission des particules
        this.nozzleAnchor = new THREE.Object3D();
        this.nozzleAnchor.position.z = -0.5;
        this.group.add(this.nozzleAnchor);

        // 6. Flamme du réacteur : double cône additif (cœur blanc + halo orange)
        this.flameGroup = new THREE.Group();
        this.flameGroup.position.z = -0.45;

        const outerFlameGeo = new THREE.ConeGeometry(0.10, 0.6, 8, 1, true);
        outerFlameGeo.translate(0, -0.3, 0); // base à l'origine, pointe vers -Y
        const outerFlame = new THREE.Mesh(outerFlameGeo, new THREE.MeshBasicMaterial({
            color: 0xff6622,
            transparent: true,
            opacity: 0.65,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            depthWrite: false
        }));
        outerFlame.rotation.x = -Math.PI / 2; // pointe vers -Z (l'arrière)
        this.flameGroup.add(outerFlame);

        const innerFlameGeo = new THREE.ConeGeometry(0.05, 0.35, 8, 1, true);
        innerFlameGeo.translate(0, -0.175, 0);
        const innerFlame = new THREE.Mesh(innerFlameGeo, new THREE.MeshBasicMaterial({
            color: 0xfff0cc,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            depthWrite: false
        }));
        innerFlame.rotation.x = -Math.PI / 2;
        this.flameGroup.add(innerFlame);

        this.group.add(this.flameGroup);

        // 7. Lumière dynamique du réacteur
        this.engineLight = new THREE.PointLight(0xff7733, 0.4, 7, 2);
        this.engineLight.position.z = -0.7;
        this.group.add(this.engineLight);

        this.group.scale.set(1.5, 1.5, 1.5);
        this.scene.add(this.group);
        this.scene.add(this.particlesGroup);

        this.createTrailPool();
        this.updatePosition(1);
    }

    // --- Pool de sprites de traînée ---
    createTrailPool() {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 32;
        const ctx = canvas.getContext('2d');
        const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
        grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
        grad.addColorStop(0.35, 'rgba(255, 200, 120, 0.7)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 32, 32);
        this.trailTexture = new THREE.CanvasTexture(canvas);

        for (let i = 0; i < this.trailSize; i++) {
            const material = new THREE.SpriteMaterial({
                map: this.trailTexture,
                color: i % 3 === 0 ? 0xffcc66 : 0xff7733,
                transparent: true,
                opacity: 0,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            const sprite = new THREE.Sprite(material);
            sprite.visible = false;
            this.particlesGroup.add(sprite);
            this.trailPool.push({
                sprite,
                velocity: new THREE.Vector3(),
                age: 0,
                maxAge: 0,
                size: 1,
                active: false
            });
        }
    }

    emitTrailParticle() {
        const slot = this.trailPool[this.trailIndex];
        this.trailIndex = (this.trailIndex + 1) % this.trailSize;

        this.nozzleAnchor.getWorldPosition(slot.sprite.position);

        const backDir = _vec.set(0, 0, -1).applyQuaternion(this.group.quaternion);
        slot.velocity.copy(backDir).multiplyScalar(0.12 + Math.random() * 0.08);
        slot.velocity.x += (Math.random() - 0.5) * 0.04;
        slot.velocity.y += (Math.random() - 0.5) * 0.04;
        slot.velocity.z += (Math.random() - 0.5) * 0.04;

        slot.age = 0;
        slot.maxAge = 16 + Math.random() * 12;
        slot.size = 0.3 + Math.random() * 0.25;
        slot.active = true;
        slot.sprite.visible = true;
        slot.sprite.scale.setScalar(slot.size);
        slot.sprite.material.opacity = 0.85;
    }

    travelTo(key) {
        if (key === this.currentKey && this.state === 'orbiting') return;
        if (!this.bodies[key]) return;

        this.targetKey = key;
        this.state = 'traveling';
        this.travelSpeed = Math.max(this.travelSpeed, 0.04);

        // Départ tangent : on garde le cap actuel et on incurve vers la cible
        this.heading.set(0, 0, 1).applyQuaternion(this.group.quaternion).normalize();

        const targetPos = this.getBodyPos(key, _vec);
        this.startDistance = Math.max(this.group.position.distanceTo(targetPos), 1);
        this.lastDistance = this.startDistance;
    }

    // Oriente le groupe vers un point, en douceur
    steerTowards(point, factor) {
        _matrix.lookAt(point, this.group.position, _up);
        _quat.setFromRotationMatrix(_matrix);
        this.group.quaternion.slerp(_quat, Math.min(factor, 1));
    }

    updatePosition(speed) {
        if (this.state === 'orbiting') {
            const planetPos = this.getBodyPos(this.currentKey, _vec);
            if (!planetPos) return;

            // Insertion orbitale douce : le rayon converge vers le rayon cible
            const targetRadius = this.getOrbitRadius(this.currentKey);
            this.orbitRadius += (targetRadius - this.orbitRadius) * Math.min(0.03 * speed, 1);

            this.orbitAngle += 0.02 * speed;
            const x = Math.cos(this.orbitAngle) * this.orbitRadius;
            const z = Math.sin(this.orbitAngle) * this.orbitRadius;
            this.group.position.set(planetPos.x + x, planetPos.y, planetPos.z + z);

            // Orientation tangente à l'orbite, lissée
            const nextX = Math.cos(this.orbitAngle + 0.25) * this.orbitRadius;
            const nextZ = Math.sin(this.orbitAngle + 0.25) * this.orbitRadius;
            this.steerTowards(
                new THREE.Vector3(planetPos.x + nextX, planetPos.y, planetPos.z + nextZ),
                0.2 * speed
            );

            // Mémoriser le cap pour un départ tangent
            this.heading.set(0, 0, 1).applyQuaternion(this.group.quaternion).normalize();

            // Réacteur au ralenti
            this.setEngine(0.25, speed);
        }
        else if (this.state === 'traveling') {
            const targetPos = this.getBodyPos(this.targetKey, new THREE.Vector3());
            if (!targetPos) return;

            const toTarget = targetPos.clone().sub(this.group.position);
            const distance = toTarget.length();
            this.lastDistance = distance;

            const arriveRadius = this.getOrbitRadius(this.targetKey);

            // Vitesse désirée : pleine accélération, freinage progressif à l'approche
            const maxSpeed = 0.5 * this.speedMultiplier;
            const brakeDistance = Math.min(this.startDistance * 0.4, 18);
            let desired = maxSpeed * THREE.MathUtils.clamp((distance - arriveRadius) / brakeDistance, 0, 1);
            desired = Math.max(desired, 0.05);

            // Inertie : la vitesse réelle converge vers la vitesse désirée
            this.travelSpeed += (desired - this.travelSpeed) * Math.min(0.05 * speed, 1);

            // Steering : le cap s'incurve vers la cible (trajectoire courbe)
            const dir = toTarget.normalize();
            this.heading.lerp(dir, Math.min(0.08 * speed, 1)).normalize();
            this.group.position.addScaledVector(this.heading, this.travelSpeed * speed);

            // Rotation lissée vers le cap
            this.steerTowards(this.group.position.clone().add(this.heading), 0.15 * speed);

            // Réacteur : poussée proportionnelle à la vitesse
            this.setEngine(0.4 + (this.travelSpeed / maxSpeed) * 1.0, speed);

            // Traînée de particules
            if (this.travelSpeed > 0.08) {
                const count = Math.ceil(speed);
                for (let i = 0; i < count; i++) this.emitTrailParticle();
            }

            // Insertion en orbite à l'arrivée (sans téléportation : on garde
            // la position actuelle comme point de départ de l'orbite)
            if (distance <= arriveRadius + 0.4) {
                this.state = 'orbiting';
                this.currentKey = this.targetKey;
                this.targetKey = null;
                this.travelSpeed = 0;
                this.orbitRadius = Math.max(distance, 0.5);
                this.orbitAngle = Math.atan2(
                    this.group.position.z - targetPos.z,
                    this.group.position.x - targetPos.x
                );
            }
        }
    }

    // Intensité du réacteur : flamme + lumière, avec flicker
    setEngine(intensity, speed) {
        const flicker = 1 + Math.sin(Date.now() * 0.04) * 0.15 + (Math.random() - 0.5) * 0.1;
        const scale = Math.max(intensity * flicker, 0.05);
        this.flameGroup.scale.set(
            Math.min(scale, 1.2),
            Math.min(scale, 1.2),
            scale // étirement de la flamme vers l'arrière
        );
        this.engineLight.intensity = intensity * 1.8 * flicker;
    }

    // État courant pour le HUD de mission
    getStatus() {
        let progress = 1;
        if (this.state === 'traveling') {
            const arriveRadius = this.getOrbitRadius(this.targetKey);
            const total = Math.max(this.startDistance - arriveRadius, 0.001);
            progress = THREE.MathUtils.clamp(1 - (this.lastDistance - arriveRadius) / total, 0, 1);
        }
        return {
            state: this.state,
            currentKey: this.currentKey,
            targetKey: this.targetKey,
            distance: this.lastDistance,
            progress
        };
    }

    update(speed) {
        // 1. Mettre à jour la fusée
        this.updatePosition(speed);

        // 2. Mettre à jour les particules de traînée (pool)
        for (const p of this.trailPool) {
            if (!p.active) continue;
            p.sprite.position.add(p.velocity);
            p.age += 1;

            const t = p.age / p.maxAge;
            p.sprite.material.opacity = Math.max(0, (1 - t)) * 0.85;
            p.sprite.scale.setScalar(p.size * (1 + t * 1.6)); // la fumée s'étale

            if (p.age >= p.maxAge) {
                p.active = false;
                p.sprite.visible = false;
            }
        }
    }

    destroy() {
        this.scene.remove(this.group);
        this.scene.remove(this.particlesGroup);

        this.group.traverse(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
        });
        for (const p of this.trailPool) {
            p.sprite.material.dispose();
        }
        if (this.trailTexture) this.trailTexture.dispose();
    }
}
