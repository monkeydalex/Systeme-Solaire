import * as THREE from 'three';
import gsap from 'gsap';
import { SceneManager } from './core/SceneManager.js';
import { GuidedTour } from './core/GuidedTour.js';
import { Planet } from './objects/Planet.js';
import { Moon } from './objects/Moon.js';
import { Starship } from './objects/Starship.js';
import { SpecialEffectsManager } from './effects/SpecialEffects.js';
import { PostProcessing } from './effects/PostProcessing.js';
import { UIManager } from './ui/UIManager.js';
import { Labels } from './ui/Labels.js';
import { planetData } from './data/planetData.js';
import { applyScaleMode } from './core/ScaleModes.mjs';
import { AudioManager } from './audio/AudioManager.mjs';
import { Interactions } from './core/Interactions.mjs';

class App {
    constructor() {
        this.sceneManager = null;
        this.effectsManager = null;
        this.postProcessing = null;
        this.uiManager = null;

        this.planets = {};
        this.moons = {};
        this.labels = null;
        this.starship = null;
        this.tour = null;

        // États globaux
        this.simulationSpeed = 1.0;
        this.isPaused = false;
        this.showOrbits = true;
        this.focusedPlanetKey = null;
        this.cameraFollowingStarship = false;
        this.scaleMode = 'pedagogique';
        this.scaledPlanetData = applyScaleMode(planetData, this.scaleMode);

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

        // 3. Créer les planètes puis leurs lunes
        for (const [key, data] of Object.entries(this.scaledPlanetData)) {
            this.planets[key] = new Planet(key, data, scene);
        }
        for (const [key, data] of Object.entries(this.scaledPlanetData)) {
            if (!data.moons) continue;
            for (const moonData of data.moons) {
                this.moons[moonData.key] = new Moon(moonData.key, moonData, this.planets[key]);
            }
        }

        // 3b. Labels flottants cliquables au-dessus des planètes
        this.labels = new Labels(container, this.planets, (planetKey) => {
            this.focusBody(planetKey);
        });

        // 4. Initialiser le Starship (orbite la Terre par défaut)
        // Destinations possibles : planètes et lunes
        this.starship = new Starship(scene, 'terre', { ...this.planets, ...this.moons });
        // Cacher la fusée initialement (elle sera activée via l'UI)
        this.starship.group.visible = false;
        this.starship.particlesGroup.visible = false;

        // 5. Initialiser les effets spéciaux
        this.effectsManager = new SpecialEffectsManager(scene);
        // Activer les étoiles par défaut pour l'immersion
        this.effectsManager.toggleStars(true);
        const starBtn = document.querySelector('.effect-btn[data-effect="stars"]');
        if (starBtn) starBtn.classList.add('active');

        // Audio procédural (coupé tant que l'utilisateur ne l'active pas)
        this.audio = new AudioManager();

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
            onLabelsToggle: (checked) => {
                if (this.labels) this.labels.setVisible(checked);
            },
            onOrbitOpacity: (val) => {
                for (const planet of Object.values(this.planets)) {
                    if (planet.orbitMesh) planet.orbitMesh.material.opacity = val;
                }
                for (const moon of Object.values(this.moons)) {
                    if (moon.orbitMesh) moon.orbitMesh.material.opacity = val * 0.7;
                }
            },
            onScaleModeChange: (modeKey) => {
                this.applyScaleMode(modeKey);
            },
            onEffectToggle: (effect, active) => {
                if (effect === 'stars') this.effectsManager.toggleStars(active);
                else if (effect === 'constellations') this.effectsManager.toggleConstellations(active);
                else if (effect === 'nebula') this.effectsManager.toggleNebula(active);
                else if (effect === 'meteor') this.effectsManager.toggleMeteors(active);
                else if (effect === 'asteroids') this.effectsManager.toggleAsteroids(active);
                else if (effect === 'comet') this.effectsManager.toggleComet(active);
                else if (effect === 'station') this.effectsManager.toggleSpaceStation(active);
            },
            onConstellationFilter: (zodiacOnly) => {
                this.effectsManager.setZodiacOnly(zodiacOnly);
            },
            onAudioToggle: async (active) => {
                if (active) {
                    await this.audio.enable();
                    this.audio.setMuted(false);
                } else {
                    this.audio.setMuted(true);
                }
            },
            onVolumeChange: (val) => {
                this.audio.setVolume(val);
            },
            onPlanetFocus: (planetKey) => {
                this.focusBody(planetKey, false);
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
                if (this.audio) this.audio.startEngine();
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
            onTourToggle: (active) => {
                if (active) this.tour.start();
                else this.tour.stop();
            },
            getPlanetData: (key) => {
                return this.getFormattedPlanetFacts(key);
            }
        });

        // 6a. Clic sur un label de constellation → fiche détaillée
        this.effectsManager.onConstellationClick = (key) => {
            this.uiManager.showConstellationDetail(key);
        };

        // Petit clic d'UI sur les boutons du popover
        const uiClick = (e) => {
            if (this.audio && this.audio.isEnabled() && e.target.closest('button')) {
                this.audio.playClick();
            }
        };
        document.getElementById('effects-popover').addEventListener('click', uiClick);

        // 6b. Visite guidée cinématique de Mercure à Neptune
        this.tour = new GuidedTour(
            ['mercure', 'venus', 'terre', 'mars', 'jupiter', 'saturne', 'uranus', 'neptune'],
            {
                onVisit: (key) => this.focusBody(key, true, true),
                onEnd: () => this.uiManager.setTourActive(false)
            }
        );

        // 7. Survol + clic → focus, via le module Interactions
        this.interactions = new Interactions({
            camera,
            bodies: { ...this.planets, ...this.moons },
            onFocus: (key) => this.focusBody(key),
            onHover: (key) => {
                if (this.labels) this.labels.highlight(key);
                if (key && key !== this._lastHoverKey && this.audio) this.audio.playHover();
                this._lastHoverKey = key;
            }
        });

        // Redimensionner le post-processing avec la fenêtre
        window.addEventListener('resize', () => {
            this.postProcessing.resize(window.innerWidth, window.innerHeight);
        });

        // Masquer le message de chargement de l'HTML d'origine
        const loader = document.getElementById('loading-message');
        if (loader) loader.style.display = 'none';

        // 8. Démarrer la boucle de rendu
        this.animate();
    }

    applyScaleMode(modeKey) {
        this.scaleMode = modeKey;
        this.scaledPlanetData = applyScaleMode(planetData, modeKey);

        for (const [key, data] of Object.entries(this.scaledPlanetData)) {
            if (this.planets[key]) {
                this.planets[key].applyScaleData(data);
            }

            if (!data.moons) continue;
            for (const moonData of data.moons) {
                if (this.moons[moonData.key]) {
                    this.moons[moonData.key].applyScaleData(moonData);
                }
            }
        }

        if (this.interactions) this.interactions.resetBaseScales();
    }

    // Focalise la caméra sur une planète ou une lune, et ouvre sa fiche
    focusBody(key, openPanel = true, fromTour = false) {
        // Toute interaction manuelle interrompt la visite guidée
        if (!fromTour && this.tour && this.tour.active) {
            this.tour.stop();
        }

        if (this.audio) { this.audio.playSelect(); this.audio.playWhoosh(); }

        this.focusedPlanetKey = key;
        this.cameraFollowingStarship = false;

        // Décocher le suivi de la caméra du Starship si nécessaire
        const followBtn = document.getElementById('follow-starship');
        if (followBtn) {
            followBtn.classList.remove('active');
            followBtn.textContent = 'Suivre StarShip';
        }

        if (openPanel && this.uiManager) {
            this.uiManager.showDetailPanel(key);
        }
    }

    resetSimulation() {
        if (this.tour && this.tour.active) this.tour.stop();

        this.simulationSpeed = 1.0;
        this.isPaused = false;
        this.focusedPlanetKey = null;
        this.cameraFollowingStarship = false;

        const speedSlider = document.getElementById('speed-slider');
        if (speedSlider) speedSlider.value = 50;

        const pauseBtn = document.getElementById('pause-btn');
        if (pauseBtn) {
            pauseBtn.textContent = '❚❚';
            pauseBtn.classList.remove('active');
        }

        // Réinitialiser les angles des planètes
        for (const planet of Object.values(this.planets)) {
            planet.angle = Math.random() * Math.PI * 2;
            planet.updatePosition();
        }

        // Réinitialiser le Starship vers la Terre
        this.starship.destroy();
        this.starship = new Starship(this.sceneManager.scene, 'terre', { ...this.planets, ...this.moons });
        const toggleBtn = document.getElementById('toggle-starship');
        if (toggleBtn) {
            toggleBtn.classList.remove('active');
            toggleBtn.textContent = 'Activer StarShip';
        }
        const controlsDiv = document.getElementById('starship-controls');
        if (controlsDiv) controlsDiv.style.display = 'none';

        // Réinitialiser la caméra
        gsap.to(this.sceneManager.camera.position, { x: 0, y: 60, z: 130, duration: 1.0 });
        gsap.to(this.sceneManager.controls.target, { x: 0, y: 0, z: 0, duration: 1.0 });
    }

    getFormattedPlanetFacts(key) {
        // Les informations astronomiques réelles vivent dans planetData.js
        const body = this.planets[key] || this.moons[key];
        if (!body) return null;

        const facts = body.data.facts;
        return {
            nom: body.data.nom,
            type: facts.type,
            diametre: facts.diametre,
            distance: facts.distance,
            periode: facts.periode,
            temperature: facts.temperature,
            color: facts.color,
            description: body.data.description || '',
            // Pour la mini-preview (null = couleur unie)
            texture: (body.getPreviewTexture ? body.getPreviewTexture() : body.mesh.material.map) || null
        };
    }

    // Position monde + distance de cadrage d'un corps (planète ou lune)
    getFocusTarget(key) {
        const planet = this.planets[key];
        if (planet) {
            const dist = key === 'soleil' ? 22 : planet.data.rayon * 4.5 + 4;
            return { pos: planet.group.position.clone(), dist };
        }
        const moon = this.moons[key];
        if (moon) {
            const pos = new THREE.Vector3();
            moon.mesh.getWorldPosition(pos);
            return { pos, dist: moon.data.rayon * 8 + 2 };
        }
        return null;
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));

        const speed = this.isPaused ? 0 : this.simulationSpeed;

        // 1. Mettre à jour les planètes puis les lunes
        for (const planet of Object.values(this.planets)) {
            planet.update(speed, this.showOrbits);
        }
        for (const moon of Object.values(this.moons)) {
            moon.update(speed, this.showOrbits);
        }

        // 2. Mettre à jour le Starship et son HUD de mission
        if (this.starship && this.starship.group.visible) {
            this.starship.update(speed);
            const status = this.starship.getStatus();
            this.uiManager.updateStarshipStatus(status);
            if (this.audio) {
                if (status.state === 'traveling') this.audio.startEngine();
                else this.audio.stopEngine();
            }
        }

        // 3. Mettre à jour les effets spéciaux
        if (this.effectsManager) {
            this.effectsManager.update(speed, this.planets);
        }

        // 3b. Survol : pulsation douce du corps survolé
        if (this.interactions) this.interactions.update();

        // 4. Suivi de caméra intelligent (Pursuit / Focus camera)
        const camera = this.sceneManager.camera;
        const controls = this.sceneManager.controls;

        if (this.focusedPlanetKey) {
            const target = this.getFocusTarget(this.focusedPlanetKey);
            if (target) {
                const { pos, dist } = target;
                let targetCamPos;

                if (this.focusedPlanetKey === 'soleil') {
                    targetCamPos = pos.clone().add(new THREE.Vector3(dist, dist * 0.4, dist));
                } else {
                    // Se placer du côté éclairé : entre le Soleil (origine) et le corps,
                    // décalé latéralement pour un éclairage en trois-quarts
                    const dirToSun = pos.clone().negate().normalize();
                    const side = new THREE.Vector3().crossVectors(dirToSun, new THREE.Vector3(0, 1, 0)).normalize();
                    targetCamPos = pos.clone()
                        .addScaledVector(dirToSun, dist * 0.8)
                        .addScaledVector(side, dist * 0.5)
                        .add(new THREE.Vector3(0, dist * 0.35, 0));
                }

                // Lerp très fluide
                camera.position.lerp(targetCamPos, 0.05);
                controls.target.lerp(pos, 0.05);
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

        // 6. Rendu final avec Post-processing (Bloom) puis labels 2D
        this.postProcessing.render();
        if (this.labels) {
            this.labels.render(this.sceneManager.scene, camera);
        }
    }
}

// Lancement au chargement du DOM
window.addEventListener('DOMContentLoaded', () => {
    new App();
});
