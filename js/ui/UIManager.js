import * as THREE from 'three';
import { planetData } from '../data/planetData.js';

// Interface « Dock cinéma » : dock bas (vignettes + contrôles),
// fiche latérale droite, popover effets & extras.
export class UIManager {
    constructor(callbacks) {
        this.callbacks = callbacks;

        // États locaux
        this.detailAutoRotate = true;
        this.currentBodyKey = null;

        // Mini scène pour l'aperçu de la fiche
        this.previewScene = null;
        this.previewCamera = null;
        this.previewRenderer = null;
        this.previewMesh = null;
        this.previewAnimationId = null;

        // Index { clé -> { data, parentKey } } pour planètes ET lunes
        this.bodyIndex = {};
        for (const [key, data] of Object.entries(planetData)) {
            this.bodyIndex[key] = { data, parentKey: null };
            if (data.moons) {
                for (const moon of data.moons) {
                    this.bodyIndex[moon.key] = { data: moon, parentKey: key };
                }
            }
        }

        this.init();
    }

    init() {
        this.buildDock();
        this.setupDockControls();
        this.setupEffectsPopover();
        this.setupStarshipUI();
        this.setupDetailPanel();
    }

    // --- Dock : vignettes des corps ---
    buildDock() {
        const wrap = document.getElementById('dock-planets');
        for (const [key, data] of Object.entries(planetData)) {
            const btn = document.createElement('button');
            btn.className = 'dock-planet';
            btn.dataset.planet = key;
            btn.title = data.nom;

            const ball = document.createElement('span');
            ball.className = 'dock-ball';
            ball.style.background =
                `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.55), ${data.facts.color} 55%, rgba(0,0,0,0.55))`;

            const name = document.createElement('span');
            name.className = 'dock-name';
            name.textContent = data.nom;

            btn.append(ball, name);
            btn.addEventListener('click', () => {
                if (this.callbacks.onPlanetFocus) this.callbacks.onPlanetFocus(key);
                this.showDetailPanel(key);
            });
            wrap.appendChild(btn);
        }
    }

    // Surligne la vignette du corps affiché (sa planète parente pour une lune)
    selectDockPlanet(key) {
        const entry = this.bodyIndex[key];
        const planetKey = entry && entry.parentKey ? entry.parentKey : key;
        document.querySelectorAll('.dock-planet').forEach(btn => {
            btn.classList.toggle('selected', btn.dataset.planet === planetKey);
        });
    }

    // --- Contrôles du dock ---
    setupDockControls() {
        const pauseBtn = document.getElementById('pause-btn');
        pauseBtn.addEventListener('click', () => {
            const isPaused = this.callbacks.onPlayPause();
            pauseBtn.textContent = isPaused ? '▶' : '❚❚';
            pauseBtn.classList.toggle('active', isPaused);
        });

        document.getElementById('speed-slider').addEventListener('input', (e) => {
            const speed = parseFloat(e.target.value) / 50; // 0 à 2x
            document.getElementById('speed-value').textContent = `×${speed.toFixed(1)}`;
            this.callbacks.onSpeedChange(speed);
        });

        const tourBtn = document.getElementById('tour-btn');
        tourBtn.addEventListener('click', () => {
            const willBeActive = !tourBtn.classList.contains('active');
            this.setTourActive(willBeActive);
            if (this.callbacks.onTourToggle) this.callbacks.onTourToggle(willBeActive);
        });

        const effectsBtn = document.getElementById('effects-btn');
        const popover = document.getElementById('effects-popover');
        effectsBtn.addEventListener('click', () => {
            const open = popover.classList.toggle('open');
            effectsBtn.classList.toggle('active', open);
        });

        // Fermer le popover au clic en dehors
        document.addEventListener('click', (e) => {
            if (!popover.classList.contains('open')) return;
            if (popover.contains(e.target) || effectsBtn.contains(e.target)) return;
            popover.classList.remove('open');
            effectsBtn.classList.remove('active');
        });

        document.getElementById('reset-camera-btn').addEventListener('click', () => {
            this.closeDetailPanel();
            this.selectDockPlanet(null);
            if (this.callbacks.onCameraReset) this.callbacks.onCameraReset();
        });

        // Raccourcis clavier : Espace = pause, Échap = fermer fiche/popover
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
            if (e.code === 'Space') {
                e.preventDefault();
                document.getElementById('pause-btn').click();
            } else if (e.code === 'Escape') {
                popover.classList.remove('open');
                effectsBtn.classList.remove('active');
                this.closeDetailPanel();
            }
        });
    }

    setTourActive(active) {
        const tourBtn = document.getElementById('tour-btn');
        tourBtn.classList.toggle('active', active);
        tourBtn.textContent = active ? '■ Arrêter la visite' : '🚀 Visite guidée';
    }

    // --- Popover effets, affichage, simulation ---
    setupEffectsPopover() {
        document.querySelectorAll('.effect-btn').forEach(button => {
            button.addEventListener('click', () => {
                button.classList.toggle('active');
                this.callbacks.onEffectToggle(
                    button.getAttribute('data-effect'),
                    button.classList.contains('active')
                );
            });
        });

        document.getElementById('show-orbits').addEventListener('change', (e) => {
            this.callbacks.onOrbitToggle(e.target.checked);
        });

        document.getElementById('show-labels').addEventListener('change', (e) => {
            if (this.callbacks.onLabelsToggle) this.callbacks.onLabelsToggle(e.target.checked);
        });

        document.getElementById('orbit-opacity').addEventListener('input', (e) => {
            const val = parseInt(e.target.value, 10);
            document.getElementById('orbit-opacity-value').textContent = val;
            if (this.callbacks.onOrbitOpacity) this.callbacks.onOrbitOpacity(val / 100);
        });

        document.getElementById('reset-btn').addEventListener('click', () => {
            this.callbacks.onReset();
        });
    }

    // --- StarShip ---
    setupStarshipUI() {
        const toggleBtn = document.getElementById('toggle-starship');
        const controlsDiv = document.getElementById('starship-controls');

        toggleBtn.addEventListener('click', () => {
            toggleBtn.classList.toggle('active');
            const active = toggleBtn.classList.contains('active');
            toggleBtn.textContent = active ? 'Désactiver StarShip' : 'Activer StarShip';
            controlsDiv.style.display = active ? 'block' : 'none';
            this.callbacks.onStarshipToggle(active);
        });

        document.getElementById('starship-target').addEventListener('change', (e) => {
            this.callbacks.onStarshipTarget(e.target.value);
        });

        const speedSlider = document.getElementById('starship-speed');
        const speedVal = document.getElementById('starship-speed-value');
        speedSlider.addEventListener('input', (e) => {
            const speed = parseFloat(e.target.value);
            speedVal.textContent = speed.toFixed(1);
            this.callbacks.onStarshipSpeed(speed);
        });

        const followBtn = document.getElementById('follow-starship');
        followBtn.addEventListener('click', () => {
            followBtn.classList.toggle('active');
            const active = followBtn.classList.contains('active');
            followBtn.textContent = active ? 'Ne plus suivre' : 'Suivre StarShip';
            this.callbacks.onStarshipFollow(active);
        });
    }

    // --- Fiche détaillée ---
    setupDetailPanel() {
        document.getElementById('close-panel').addEventListener('click', () => {
            this.closeDetailPanel();
        });

        document.getElementById('detail-auto-rotate').addEventListener('change', (e) => {
            this.detailAutoRotate = e.target.checked;
        });
    }

    closeDetailPanel() {
        document.getElementById('detail-panel').classList.remove('open');
        if (this.previewAnimationId) {
            cancelAnimationFrame(this.previewAnimationId);
            this.previewAnimationId = null;
        }
    }

    showDetailPanel(key) {
        const info = this.callbacks.getPlanetData(key);
        if (!info) return;

        this.currentBodyKey = key;
        this.selectDockPlanet(key);

        document.getElementById('detail-tag').textContent = info.type;
        document.getElementById('detail-name').textContent = info.nom;
        document.getElementById('detail-type').textContent = info.type;
        document.getElementById('detail-diameter').textContent = info.diametre;
        document.getElementById('detail-distance').textContent = info.distance;
        document.getElementById('detail-period').textContent = info.periode;
        document.getElementById('detail-temperature').textContent = info.temperature;
        document.getElementById('detail-description').textContent = info.description || '';

        // Chips : lunes de la planète, ou planète parente pour une lune
        const moonsDiv = document.getElementById('detail-moons');
        moonsDiv.innerHTML = '';
        const entry = this.bodyIndex[key];
        const related = [];
        if (entry) {
            if (entry.data.moons) {
                for (const moon of entry.data.moons) related.push({ key: moon.key, nom: '☾ ' + moon.nom });
            }
            if (entry.parentKey) {
                related.push({ key: entry.parentKey, nom: '↩ ' + planetData[entry.parentKey].nom });
            }
        }
        if (related.length > 0) {
            const title = document.createElement('div');
            title.className = 'moons-title';
            title.textContent = entry.parentKey ? 'En orbite autour de' : 'Lunes';
            moonsDiv.appendChild(title);
            for (const rel of related) {
                const chip = document.createElement('button');
                chip.className = 'moon-chip';
                chip.textContent = rel.nom;
                chip.addEventListener('click', () => {
                    if (this.callbacks.onPlanetFocus) this.callbacks.onPlanetFocus(rel.key);
                    this.showDetailPanel(rel.key);
                });
                moonsDiv.appendChild(chip);
            }
        }

        document.getElementById('detail-panel').classList.add('open');

        this.initPreviewScene(key, info.color, info.texture);
    }

    // --- Mini scène d'aperçu 3D ---
    initPreviewScene(bodyKey, colorHex, originalTexture) {
        const container = document.getElementById('planet-preview-container');
        if (!container) return;

        if (this.previewAnimationId) {
            cancelAnimationFrame(this.previewAnimationId);
        }

        if (!this.previewRenderer) {
            while (container.firstChild) container.removeChild(container.firstChild);
            this.previewRenderer = new THREE.WebGLRenderer({ antialias: true });
            this.previewRenderer.setClearColor(0x070a18, 1);
            container.appendChild(this.previewRenderer.domElement);
        }

        const width = container.clientWidth || 290;
        const height = container.clientHeight || 190;
        this.previewRenderer.setSize(width, height);

        this.previewScene = new THREE.Scene();
        this.previewCamera = new THREE.PerspectiveCamera(45, width / height, 0.1, 10);
        this.previewCamera.position.z = 4.2;

        // Éclairage studio
        this.previewScene.add(new THREE.AmbientLight(0xffffff, 0.3));
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.8);
        dirLight.position.set(5, 3, 5);
        this.previewScene.add(dirLight);

        const geometry = new THREE.SphereGeometry(1.5, 32, 32);

        let material;
        if (originalTexture) {
            material = new THREE.MeshStandardMaterial({
                map: originalTexture,
                roughness: 0.6,
                metalness: 0.1
            });
        } else {
            // Texture colorée unie en secours (Soleil shader, échec de chargement…)
            const canvas = document.createElement('canvas');
            canvas.width = 256; canvas.height = 256;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = colorHex;
            ctx.fillRect(0, 0, 256, 256);
            material = new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(canvas), roughness: 0.6 });
        }

        this.previewMesh = new THREE.Mesh(geometry, material);
        this.previewScene.add(this.previewMesh);

        // Anneaux pour Saturne
        if (bodyKey === 'saturne') {
            const ringGeo = new THREE.RingGeometry(1.8, 2.8, 64);
            const ringMat = new THREE.MeshStandardMaterial({
                color: 0xcca770,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.8
            });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.rotation.x = Math.PI / 2.3;
            this.previewScene.add(ring);
        }

        const animate = () => {
            if (this.previewMesh && this.detailAutoRotate) {
                this.previewMesh.rotation.y += 0.008;
            }
            if (this.previewRenderer && this.previewScene && this.previewCamera) {
                this.previewRenderer.render(this.previewScene, this.previewCamera);
            }
            this.previewAnimationId = requestAnimationFrame(animate);
        };
        animate();
    }
}
