import * as THREE from 'three';

export class Starship {
    constructor(scene, startPlanetKey, planets) {
        this.scene = scene;
        this.planets = planets;
        
        // États de vol : 'orbiting' ou 'traveling'
        this.state = 'orbiting'; 
        this.currentPlanetKey = startPlanetKey;
        this.targetPlanetKey = null;

        this.group = new THREE.Group();
        this.mesh = null;
        this.thrusterGlow = null;
        this.trailParticles = null;
        this.particlesGroup = new THREE.Group();
        this.maxParticles = 80;
        this.particles = [];

        this.orbitAngle = 0;
        this.orbitRadius = 0;
        this.speedMultiplier = 1.0;

        this.create();
    }

    create() {
        const startPlanet = this.planets[this.currentPlanetKey];
        if (!startPlanet) return;

        this.orbitRadius = startPlanet.data.rayon + 1.5;

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
        nose.position.z = 0.5; // Placer en avant
        nose.rotation.x = Math.PI / 2;
        this.group.add(nose);

        // 4. Ailerons stabilisateurs (3 ailerons à l'arrière)
        const finGeo = new THREE.BoxGeometry(0.04, 0.2, 0.2);
        for (let i = 0; i < 3; i++) {
            const fin = new THREE.Mesh(finGeo, metalMaterial);
            const angle = (i / 3) * Math.PI * 2;
            fin.position.x = Math.cos(angle) * 0.15;
            fin.position.y = Math.sin(angle) * 0.15;
            fin.position.z = -0.3; // Placer à l'arrière
            fin.rotation.z = angle;
            this.group.add(fin);
        }

        // 5. Tuyère & Lueur du réacteur
        const nozzleGeo = new THREE.CylinderGeometry(0.08, 0.05, 0.1, 8);
        const nozzleMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8 });
        const nozzle = new THREE.Mesh(nozzleGeo, nozzleMat);
        nozzle.position.z = -0.4;
        nozzle.rotation.x = Math.PI / 2;
        this.group.add(nozzle);

        // Lueur
        const glowGeo = new THREE.SphereGeometry(0.08, 8, 8);
        const glowMat = new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0.9 });
        this.thrusterGlow = new THREE.Mesh(glowGeo, glowMat);
        this.thrusterGlow.position.z = -0.48;
        this.group.add(this.thrusterGlow);

        this.group.scale.set(1.5, 1.5, 1.5);
        this.scene.add(this.group);

        // Ajouter le groupe de particules à la scène
        this.scene.add(this.particlesGroup);

        // Initialiser la position
        this.updatePosition(1);
    }

    travelTo(planetKey) {
        if (planetKey === this.currentPlanetKey) return;
        this.targetPlanetKey = planetKey;
        this.state = 'traveling';
    }

    emitTrailParticle() {
        // Position de la tuyère en coordonnées globales
        const thrusterWorldPos = new THREE.Vector3();
        this.thrusterGlow.getWorldPosition(thrusterWorldPos);

        const particleGeo = new THREE.SphereGeometry(0.06 + Math.random() * 0.08, 4, 4);
        const particleMat = new THREE.MeshBasicMaterial({
            color: Math.random() > 0.5 ? 0xff5500 : 0xffaa00,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });
        const particle = new THREE.Mesh(particleGeo, particleMat);
        particle.position.copy(thrusterWorldPos);

        // Légère dispersion à l'opposé du sens de marche
        const backDir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.group.quaternion).normalize();
        const velocity = backDir.multiplyScalar(0.15 + Math.random() * 0.1).add(new THREE.Vector3(
            (Math.random() - 0.5) * 0.05,
            (Math.random() - 0.5) * 0.05,
            (Math.random() - 0.5) * 0.05
        ));

        this.particles.push({
            mesh: particle,
            velocity,
            age: 0,
            maxAge: 15 + Math.random() * 10
        });

        this.particlesGroup.add(particle);

        // Limiter le nombre de particules
        if (this.particles.length > this.maxParticles) {
            const old = this.particles.shift();
            this.particlesGroup.remove(old.mesh);
            old.mesh.geometry.dispose();
            old.mesh.material.dispose();
        }
    }

    updatePosition(speed) {
        if (this.state === 'orbiting') {
            const planet = this.planets[this.currentPlanetKey];
            if (!planet) return;

            this.orbitAngle += 0.02 * speed;
            const x = Math.cos(this.orbitAngle) * this.orbitRadius;
            const z = Math.sin(this.orbitAngle) * this.orbitRadius;

            const planetPos = planet.group.position;
            this.group.position.set(planetPos.x + x, planetPos.y, planetPos.z + z);

            // Orienter dans la direction orbitale
            const nextX = Math.cos(this.orbitAngle + 0.05) * this.orbitRadius;
            const nextZ = Math.sin(this.orbitAngle + 0.05) * this.orbitRadius;
            const targetDir = new THREE.Vector3(planetPos.x + nextX, planetPos.y, planetPos.z + nextZ);
            this.group.lookAt(targetDir);

            // Éteindre le réacteur (lueur faible)
            this.thrusterGlow.material.color.setHex(0x551100);
            this.thrusterGlow.scale.set(0.7, 0.7, 0.7);
        } 
        else if (this.state === 'traveling') {
            const targetPlanet = this.planets[this.targetPlanetKey];
            if (!targetPlanet) return;

            const targetPos = targetPlanet.group.position.clone();
            const direction = targetPos.clone().sub(this.group.position);
            const distance = direction.length();

            // Allumer le réacteur (lueur forte)
            this.thrusterGlow.material.color.setHex(0xff5500);
            const pulse = 1.0 + Math.sin(Date.now() * 0.05) * 0.2;
            this.thrusterGlow.scale.set(pulse, pulse, pulse);

            // Émettre des particules de traînée
            for (let i = 0; i < Math.ceil(speed); i++) {
                this.emitTrailParticle();
            }

            // Si on arrive proche de la planète cible, on rentre en orbite
            const threshold = targetPlanet.data.rayon + 1.8;
            if (distance <= threshold) {
                this.state = 'orbiting';
                this.currentPlanetKey = this.targetPlanetKey;
                this.targetPlanetKey = null;
                this.orbitRadius = targetPlanet.data.rayon + 1.5;
                this.orbitAngle = Math.random() * Math.PI * 2;
            } else {
                // Déplacement dynamique vers la planète (qui bouge !)
                direction.normalize();
                this.group.position.addScaledVector(direction, 0.45 * speed * this.speedMultiplier);
                
                // Orienter le nez vers la cible
                this.group.lookAt(targetPos);
            }
        }
    }

    update(speed) {
        // 1. Mettre à jour la fusée
        this.updatePosition(speed);

        // 2. Mettre à jour les particules de traînée
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.mesh.position.add(p.velocity);
            p.age += 1;

            // Réduction graduelle de la taille et de l'opacité
            p.mesh.scale.multiplyScalar(0.92);
            p.mesh.material.opacity = Math.max(0, 1 - p.age / p.maxAge);

            if (p.age >= p.maxAge) {
                this.particlesGroup.remove(p.mesh);
                p.mesh.geometry.dispose();
                p.mesh.material.dispose();
                this.particles.splice(i, 1);
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

        this.particles.forEach(p => {
            p.mesh.geometry.dispose();
            p.mesh.material.dispose();
        });
    }
}
