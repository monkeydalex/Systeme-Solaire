import * as THREE from 'three';
import gsap from 'gsap';
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
        
        // Ã‰tats globaux
        this.simulationSpeed = 1.0;
        this.isPaused = false;
        this.showOrbits = true;
        this.focusedPlanetKey = null;
        this.cameraFollowingStarship = false;

        this.init();
    }

    init() {
        // 1. Initialiser le gestionnaire de scÃ¨ne
        const container = document.getElementById('scene-container');
        this.sceneManager = new SceneManager();
        this.sceneManager.init(container);

        const scene = this.sceneManager.scene;
        const camera = this.sceneManager.camera;
        const renderer = this.sceneManager.renderer;

        // 2. Initialiser le post-processing (Bloom)
        this.postProcessing = new PostProcessing(renderer, scene, camera);

        // 3. CrÃ©er les planÃ¨tes
        for (const [key, data] of Object.entries(planetData)) {
            this.planets[key] = new Planet(key, data, scene);
        }

        // 4. Initialiser le Starship (orbite la Terre par dÃ©faut)
        this.starship = new Starship(scene, 'terre', this.planets);
        // Cacher la fusÃ©e initialement (elle sera activÃ©e via l'UI)
        this.starship.group.visible = false;
        this.starship.particlesGroup.visible = false;

        // 5. Initialiser les effets spÃ©ciaux
        this.effectsManager = new SpecialEffectsManager(scene);
        // Activer les Ã©toiles par dÃ©faut pour l'immersion
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
                
                // RÃ©initialiser la camÃ©ra gÃ©nÃ©rale avec transition fluide
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
                
                // DÃ©cocher le suivi de la camÃ©ra du Starship si nÃ©cessaire
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
                    this.focusedPlanetKey = null; // DÃ©sactiver le focus planÃ¨te
                }
            },
            getPlanetData: (planetKey) => {
                return this.getFormattedPlanetFacts(planetKey);
            }
        });

        // 7. Raycasting pour clics sur la scÃ¨ne
        this.setupRaycasting();

        // Redimensionner le post-processing avec la fenÃªtre
        window.addEventListener('resize', () => {
            this.postProcessing.resize(window.innerWidth, window.innerHeight);
        });

        // Masquer le message de chargement de l'HTML d'origine
        const loader = document.getElementById('loading-message');
        if (loader) loader.style.display = 'none';

        // 8. DÃ©marrer la boucle de rendu
        this.animate();
    }

    setupRaycasting() {
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();

        window.addEventListener('click', (event) => {
            // EmpÃªcher le clic de se propager si on clique sur l'UI
            if (event.target.tagName !== 'CANVAS') return;
            
            // Calculer la position normalisÃ©e de la souris
            mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

            raycaster.setFromCamera(mouse, this.sceneManager.camera);
            
            // Intersection avec les sphÃ¨res des planÃ¨tes uniquement
            const planetMeshes = Object.values(this.planets).map(p => p.mesh);
            const intersects = raycaster.intersectObjects(planetMeshes);

            if (intersects.length > 0) {
                const clickedMesh = intersects[0].object;
                const clickedKey = Object.keys(this.planets).find(k => this.planets[k].mesh === clickedMesh);
                
                if (clickedKey) {
                    // SÃ©lectionner la planÃ¨te dans la liste latÃ©rale
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

        // RÃ©initialiser les angles des planÃ¨tes
        for (const planet of Object.values(this.planets)) {
            planet.angle = Math.random() * Math.PI * 2;
            planet.updatePosition();
        }

        // RÃ©initialiser le Starship vers la Terre
        this.starship.destroy();
        this.starship = new Starship(this.sceneManager.scene, 'terre', this.planets);
        const toggleBtn = document.getElementById('toggle-starship');
        if (toggleBtn) {
            toggleBtn.classList.remove('active');
            toggleBtn.innerHTML = '<i class="fas fa-power-off"></i> Activer StarShip';
        }
        const controlsDiv = document.getElementById('starship-controls');
        if (controlsDiv) controlsDiv.style.display = 'none';

        // RÃ©initialiser la camÃ©ra
        gsap.to(this.sceneManager.camera.position, { x: 0, y: 60, z: 130, duration: 1.0 });
        gsap.to(this.sceneManager.controls.target, { x: 0, y: 0, z: 0, duration: 1.0 });
    }

    getFormattedPlanetFacts(planetKey) {
        const p = this.planets[planetKey];
        if (!p) return null;

        // Les informations astronomiques reelles vivent dans planetData.js
        const facts = p.data.facts;
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

        // 1. Mettre Ã  jour les planÃ¨tes
        for (const planet of Object.values(this.planets)) {
            planet.update(speed, this.showOrbits);
        }

        // 2. Mettre Ã  jour le Starship
        if (this.starship && this.starship.group.visible) {
            this.starship.update(speed);
        }

        // 3. Mettre Ã  jour les effets spÃ©ciaux
        if (this.effectsManager) {
            this.effectsManager.update(speed, this.planets);
        }

        // 4. Suivi de camÃ©ra intelligent (Pursuit / Focus camera)
        const camera = this.sceneManager.camera;
        const controls = this.sceneManager.controls;

        if (this.focusedPlanetKey) {
            const planet = this.planets[this.focusedPlanetKey];
            if (planet) {
                const planetPos = planet.group.position;
                // Calculer la distance de focus selon le rayon de la planÃ¨te
                const dist = this.focusedPlanetKey === 'soleil' ? 22 : planet.data.rayon * 4.5 + 4;
                const offset = new THREE.Vector3(dist, dist * 0.4, dist);
                const targetCamPos = planetPos.clone().add(offset);

                // Lerp trÃ¨s fluide
                camera.position.lerp(targetCamPos, 0.05);
                controls.target.lerp(planetPos, 0.05);
            }
        } 
        else if (this.cameraFollowingStarship && this.starship && this.starship.group.visible) {
            const shipPos = this.starship.group.position;
            // Positionner la camÃ©ra lÃ©gÃ¨rement derriÃ¨re la fusÃ©e
            const backDir = new THREE.Vector3(0, 0.6, -2.5).applyQuaternion(this.starship.group.quaternion);
            const targetCamPos = shipPos.clone().add(backDir);

            camera.position.lerp(targetCamPos, 0.08);
            controls.target.lerp(shipPos, 0.08);
        }

        // 5. Mettre Ã  jour la physique des contrÃ´les
        this.sceneManager.update();

        // 6. Rendu final avec Post-processing (Bloom)
        this.postProcessing.render();
    }
}

// Lancement au chargement du DOM
window.addEventListener('DOMContentLoaded', () => {
    new App();
});