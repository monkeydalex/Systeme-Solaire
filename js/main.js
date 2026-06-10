import * as THREE from 'three';
import { SceneManager } from './core/SceneManager.js';
import { Planet } from './objects/Planet.js';
import { Starship } from './objects/Starship.js';
import { SpecialEffectsManager } from './effects/SpecialEffects.js';
import { PostProcessing } from './effects/PostProcessing.js';
import { UIManager } from './ui/UIManager.js';
import { planetData } from './data/planetData.js';

class App {
    constructor() {
        this.sceneManager = null;
        this.effectsManager = null;
        this.postProcessing = null;
        this.uiManager = null;
        
        this.planets = {};
        this.starship = null;
        
        // États globaux
        this.simulationSpeed = 1.0;
        this.isPaused = false;
        this.showOrbits = true;
        this.focusedPlanetKey = null;
        this.cameraFollowingStarship = false;

        this.init();
    }

    init() {
        // 1. Initialiser le gestionnaire de scène
        const container = document.getElementById('scene-container');
        this.sceneManager = new SceneManager();
        this.sceneManager.init(container);

        const scene = this.sceneManager.scene;
        const camera = this.sceneManager.camera;
        const renderer = this.sceneManager.renderer;

        // 2. Initialiser le post-processing (Bloom)
        this.postProcessing = new PostProcessing(renderer, scene, camera);

        // 3. Créer les planètes
        for (const [key, data] of Object.entries(planetData)) {
            this.planets[key] = new Planet(key, data, scene);
        }

        // 4. Initialiser le Starship (orbite la Terre par défaut)
        this.starship = new Starship(scene, 'terre', this.planets);
        // Cacher la fusée initialement (elle sera activée via l'UI)
        this.starship.group.visible = false;
        this.starship.particlesGroup.visible = false;

        // 5. Initialiser les effets spéciaux
        this.effectsManager = new SpecialEffectsManager(scene);
        // Activer les étoiles par défaut pour l'immersion
        this.effectsManager.toggleStars(true);
        const starBtn = document.querySelector('.effect-btn[data-effect="stars"]');
        if (starBtn) starBtn.classList.add('active');

        // 6. Configurer l'UI avec ses callbacks
        this.uiManager = new UIManager({
            onSpeedChange: (val) => {
                this.simulationSpeed = val;
            },
            onPlayPause: () => {
                this.isPaused = !this.isPaused;
                return this.isPaused;
            },
            onReset: () => {
                this.resetSimulation();
            },
            onCameraReset: () => {
                this.focusedPlanetKey = null;
                this.cameraFollowingStarship = false;
                
                // Réinitialiser la caméra générale avec transition fluide
                gsap.to(camera.position, { x: 0, y: 60, z: 130, duration: 1.2, ease: "power2.out" });
                gsap.to(this.sceneManager.controls.target, { x: 0, y: 0, z: 0, duration: 1.2, ease: "power2.out" });
            },
            onOrbitToggle: (checked) => {
                this.showOrbits = checked;
            },
            onEffectToggle: (effect, active) => {
                if (effect === 'stars') this.effectsManager.toggleStars(active);
                else if (effect === 'nebula') this.effectsManager.toggleNebula(active);
                else if (effect === 'meteor') this.effectsManager.toggleMeteors(active);
                else if (effect === 'asteroids') this.effectsManager.toggleAsteroids(active);
                else if (effect === 'comet') this.effectsManager.toggleComet(active);
                else if (effect === 'station') this.effectsManager.toggleSpaceStation(active);
            },
            onPlanetFocus: (planetKey) => {
                this.focusedPlanetKey = planetKey;
                this.cameraFollowingStarship = false;
                
                // Décocher le suivi de la caméra du Starship si nécessaire
                const followBtn = document.getElementById('follow-starship');
                if (followBtn) {
                    followBtn.classList.remove('active');
                    followBtn.innerHTML = '<i class="fas fa-eye"></i> Suivre StarShip';
                }
            },
            onStarshipToggle: (active) => {
                this.starship.group.visible = active;
                this.starship.particlesGroup.visible = active;
                if (!active) {
                    this.cameraFollowingStarship = false;
                }
            },
            onStarshipTarget: (planetKey) => {
                this.starship.travelTo(planetKey);
            },
            onStarshipSpeed: (val) => {
                this.starship.speedMultiplier = val;
            },
            onStarshipFollow: (active) => {
                this.cameraFollowingStarship = active;
                if (active) {
                    this.focusedPlanetKey = null; // Désactiver le focus planète
                }
            },
            getPlanetData: (planetKey) => {
                return this.getFormattedPlanetFacts(planetKey);
            }
        });

        // 7. Raycasting pour clics sur la scène
        this.setupRaycasting();

        // Masquer le message de chargement de l'HTML d'origine
        const loader = document.getElementById('loading-message');
        if (loader) loader.style.display = 'none';

        // 8. Démarrer la boucle de rendu
        this.animate();
    }

    setupRaycasting() {
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();

        window.addEventListener('click', (event) => {
            // Empêcher le clic de se propager si on clique sur l'UI
            if (event.target.tagName !== 'CANVAS') return;
            
            // Calculer la position normalisée de la souris
            mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

            raycaster.setFromCamera(mouse, this.sceneManager.camera);
            
            // Intersection avec les sphères des planètes uniquement
            const planetMeshes = Object.values(this.planets).map(p => p.mesh);
            const intersects = raycaster.intersectObjects(planetMeshes);

            if (intersects.length > 0) {
                const clickedMesh = intersects[0].object;
                const clickedKey = Object.keys(this.planets).find(k => this.planets[k].mesh === clickedMesh);
                
                if (clickedKey) {
                    // Sélectionner la planète dans la liste latérale
                    const planetListItems = document.querySelectorAll('#planets-section li');
                    planetListItems.forEach(item => {
                        if (item.getAttribute('data-planet') === clickedKey) {
                            item.classList.add('selected');
                        } else {
                            item.classList.remove('selected');
                        }
                    });

                    // Focaliser et ouvrir l'UI
                    this.focusedPlanetKey = clickedKey;
                    this.cameraFollowingStarship = false;
                    this.uiManager.showDetailPanel(clickedKey);
                }
            }
        });
    }

    resetSimulation() {
        this.simulationSpeed = 1.0;
        this.isPaused = false;
        this.focusedPlanetKey = null;
        this.cameraFollowingStarship = false;

        const speedSlider = document.getElementById('speed-slider');
        if (speedSlider) speedSlider.value = 50;

        const pauseBtn = document.getElementById('pause-btn');
        if (pauseBtn) pauseBtn.innerHTML = '<i class="fas fa-pause"></i> Pause';

        // Réinitialiser les angles des planètes
        for (const planet of Object.values(this.planets)) {
            planet.angle = Math.random() * Math.PI * 2;
            planet.updatePosition();
        }

        // Réinitialiser le Starship vers la Terre
        this.starship.destroy();
        this.starship = new Starship(this.sceneManager.scene, 'terre', this.planets);
        const toggleBtn = document.getElementById('toggle-starship');
        if (toggleBtn) {
            toggleBtn.classList.remove('active');
            toggleBtn.innerHTML = '<i class="fas fa-power-off"></i> Activer StarShip';
        }
        const controlsDiv = document.getElementById('starship-controls');
        if (controlsDiv) controlsDiv.style.display = 'none';

        // Réinitialiser la caméra
        gsap.to(this.sceneManager.camera.position, { x: 0, y: 60, z: 130, duration: 1.0 });
        gsap.to(this.sceneManager.controls.target, { x: 0, y: 0, z: 0, duration: 1.0 });
    }

    getFormattedPlanetFacts(planetKey) {
        const p = this.planets[planetKey];
        if (!p) return null;

        // Informations réelles astronomiques pour rendre la simulation de haute qualité
        const realFacts = {
            soleil: {
                type: "Étoile naine jaune",
                diametre: "1 392 700 km",
                distance: "Centre",
                periode: "N/A",
                temperature: "~5 500 °C",
                color: "#ffcc00"
            },
            mercure: {
                type: "Planète tellurique",
                diametre: "4 879 km",
                distance: "57,9 millions km",
                periode: "88 jours",
                temperature: "-173 à 427 °C",
                color: "#a0a0a0"
            },
            venus: {
                type: "Planète tellurique",
                diametre: "12 104 km",
                distance: "108,2 millions km",
                periode: "224,7 jours",
                temperature: "462 °C",
                color: "#e6c8a0"
            },
            terre: {
                type: "Planète tellurique (Habitable)",
                diametre: "12 742 km",
                distance: "149,6 millions km",
                periode: "365,25 jours",
                temperature: "-89 à 58 °C",
                color: "#3366cc"
            },
            mars: {
                type: "Planète tellurique",
                diametre: "6 779 km",
                distance: "227,9 millions km",
                periode: "687 jours",
                temperature: "-143 à 35 °C",
                color: "#cc6633"
            },
            jupiter: {
                type: "Géante gazeuse",
                diametre: "139 820 km",
                distance: "778,5 millions km",
                periode: "11,86 ans",
                temperature: "-108 °C",
                color: "#e0c8a0"
            },
            saturne: {
                type: "Géante gazeuse",
                diametre: "116 460 km",
                distance: "1,43 milliard km",
                periode: "29,45 ans",
                temperature: "-139 °C",
                color: "#e6d9a3"
            },
            uranus: {
                type: "Géante de glace",
                diametre: "50 724 km",
                distance: "2,87 milliards km",
                periode: "84 ans",
                temperature: "-197 °C",
                color: "#99ccff"
            },
            neptune: {
                type: "Géante de glace",
                diametre: "49 244 km",
                distance: "4,50 milliards km",
                periode: "164,8 ans",
                temperature: "-201 °C",
                color: "#3333cc"
            }
        };

        const facts = realFacts[planetKey];
        return {
            nom: p.data.nom,
            type: facts.type,
            diametre: facts.diametre,
            distance: facts.distance,
            periode: facts.periode,
            temperature: facts.temperature,
            color: facts.color,
            texture: p.mesh.material.map // On transmet la texture 3D pour la mini-preview
        };
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));

        const speed = this.isPaused ? 0 : this.simulationSpeed;

        // 1. Mettre à jour les planètes
        for (const planet of Object.values(this.planets)) {
            planet.update(speed, this.showOrbits);
        }

        // 2. Mettre à jour le Starship
        if (this.starship && this.starship.group.visible) {
            this.starship.update(speed);
        }

        // 3. Mettre à jour les effets spéciaux
        if (this.effectsManager) {
            this.effectsManager.update(speed, this.planets);
        }

        // 4. Suivi de caméra intelligent (Pursuit / Focus camera)
        const camera = this.sceneManager.camera;
        const controls = this.sceneManager.controls;

        if (this.focusedPlanetKey) {
            const planet = this.planets[this.focusedPlanetKey];
            if (planet) {
                const planetPos = planet.group.position;
                // Calculer la distance de focus selon le rayon de la planète
                const dist = this.focusedPlanetKey === 'soleil' ? 22 : planet.data.rayon * 4.5 + 4;
                const offset = new THREE.Vector3(dist, dist * 0.4, dist);
                const targetCamPos = planetPos.clone().add(offset);

                // Lerp très fluide
                camera.position.lerp(targetCamPos, 0.05);
                controls.target.lerp(planetPos, 0.05);
            }
        } 
        else if (this.cameraFollowingStarship && this.starship && this.starship.group.visible) {
            const shipPos = this.starship.group.position;
            // Positionner la caméra légèrement derrière la fusée
            const backDir = new THREE.Vector3(0, 0.6, -2.5).applyQuaternion(this.starship.group.quaternion);
            const targetCamPos = shipPos.clone().add(backDir);

            camera.position.lerp(targetCamPos, 0.08);
            controls.target.lerp(shipPos, 0.08);
        }

        // 5. Mettre à jour la physique des contrôles
        this.sceneManager.update();

        // 6. Rendu final avec Post-processing (Bloom)
        this.postProcessing.render();
    }
}

// Lancement au chargement du DOM
window.addEventListener('DOMContentLoaded', () => {
    new App();
});