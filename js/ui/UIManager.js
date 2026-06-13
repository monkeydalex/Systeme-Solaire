import * as THREE from 'three';
import { planetData } from '../data/planetData.js';
import { SCALE_MODE_INFO } from '../core/ScaleModes.mjs';
import { CINEMATIC_CONSTELLATIONS } from '../data/constellations.mjs';

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

        // Index des constellations { clé -> données }
        this.constellationIndex = {};
        for (const cst of CINEMATIC_CONSTELLATIONS) {
            this.constellationIndex[cst.key] = cst;
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

        const audioBtn = document.getElementById('audio-btn');
        audioBtn.addEventListener('click', () => {
            const active = audioBtn.classList.toggle('active');
            audioBtn.textContent = active ? '🔊' : '🔇';
            audioBtn.title = active ? 'Couper le son' : 'Activer le son';
            this.callbacks.onAudioToggle(active);
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
        // Onglets : un seul panneau visible à la fois
        const tabs = document.querySelectorAll('.popover-tab');
        const panels = document.querySelectorAll('.popover-panel');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const target = tab.getAttribute('data-tab');
                tabs.forEach(t => t.classList.toggle('active', t === tab));
                panels.forEach(p => p.classList.toggle('active', p.getAttribute('data-panel') === target));
            });
        });

        document.querySelectorAll('.effect-btn').forEach(button => {
            button.addEventListener('click', () => {
                button.classList.toggle('active');
                this.callbacks.onEffectToggle(
                    button.getAttribute('data-effect'),
                    button.classList.contains('active')
                );
            });
        });

        document.getElementById('zodiac-only').addEventListener('change', (e) => {
            if (this.callbacks.onConstellationFilter) this.callbacks.onConstellationFilter(e.target.checked);
        });

        document.getElementById('audio-volume').addEventListener('input', (e) => {
            const val = parseInt(e.target.value, 10);
            document.getElementById('audio-volume-value').textContent = val;
            if (this.callbacks.onVolumeChange) this.callbacks.onVolumeChange(val / 100);
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

        const scaleMode = document.getElementById('scale-mode');
        const scaleDescription = document.getElementById('scale-mode-description');
        for (const [key, info] of Object.entries(SCALE_MODE_INFO)) {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = info.label;
            scaleMode.appendChild(option);
        }
        scaleDescription.textContent = SCALE_MODE_INFO.pedagogique.description;
        scaleMode.addEventListener('change', (e) => {
            const info = SCALE_MODE_INFO[e.target.value] || SCALE_MODE_INFO.pedagogique;
            scaleDescription.textContent = info.description;
            if (this.callbacks.onScaleModeChange) this.callbacks.onScaleModeChange(e.target.value);
        });

        document.getElementById('reset-btn').addEventListener('click', () => {
            this.callbacks.onReset();
        });
    }

    // --- StarShip ---
    setupStarshipUI() {
        const toggleBtn = document.getElementById('toggle-starship');
        const controlsDiv = document.getElementById('starship-controls');

        // Construire la liste des destinations : planètes puis lunes
        const select = document.getElementById('starship-target');
        const planetGroup = document.createElement('optgroup');
        planetGroup.label = 'Planètes';
        const moonGroup = document.createElement('optgroup');
        moonGroup.label = 'Lunes';
        for (const [key, entry] of Object.entries(this.bodyIndex)) {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = entry.data.nom;
            (entry.parentKey ? moonGroup : planetGroup).appendChild(option);
        }
        select.append(planetGroup, moonGroup);
        select.value = 'terre';

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

    // HUD de mission StarShip : statut + progression, mis à jour chaque frame
    updateStarshipStatus(status) {
        if (!status) return;
        // Articles français : la Terre, la Lune, le Soleil ; les autres sans article
        const articles = { soleil: 'le Soleil', terre: 'la Terre', lune: 'la Lune' };
        const nameOf = (key) => articles[key] ||
            (this.bodyIndex[key] ? this.bodyIndex[key].data.nom : key);
        const deNameOf = (key) => {
            if (key === 'soleil') return 'du Soleil';
            if (articles[key]) return `de ${articles[key]}`;
            return `de ${nameOf(key)}`;
        };

        let text;
        if (status.state === 'traveling') {
            text = `En route vers ${nameOf(status.targetKey)} — dist. ${status.distance.toFixed(1)} u`;
        } else {
            text = `En orbite autour ${deNameOf(status.currentKey)}`;
            // Synchroniser le select avec la position réelle
            const select = document.getElementById('starship-target');
            if (select.value !== status.currentKey) select.value = status.currentKey;
        }

        const textEl = document.getElementById('starship-status-text');
        if (textEl.textContent !== text) textEl.textContent = text;
        document.getElementById('starship-progress').style.width =
            `${Math.round(status.progress * 100)}%`;
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
        document.getElementById('detail-description').textContent = info.description || '';
        this.renderDetailTable([
            { label: 'Type', value: info.type },
            { label: 'Diamètre', value: info.diametre },
            { label: 'Distance', value: info.distance },
            { label: 'Période orbitale', value: info.periode },
            { label: 'Température', value: info.temperature }
        ]);

        // Aperçu 3D rotatif : pertinent pour un corps (masqué pour une constellation)
        document.querySelector('.detail-rotate').style.display = '';

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

    // Remplit le tableau de la fiche (lignes { label, value })
    renderDetailTable(rows) {
        const tbody = document.getElementById('detail-table-body');
        tbody.innerHTML = '';
        for (const row of rows) {
            if (row.value == null || row.value === '') continue;
            const tr = document.createElement('tr');
            const td1 = document.createElement('td');
            td1.textContent = row.label;
            const td2 = document.createElement('td');
            td2.textContent = row.value;
            tr.append(td1, td2);
            tbody.appendChild(tr);
        }
    }

    // --- Fiche détaillée d'une constellation ---
    showConstellationDetail(key) {
        const cst = this.constellationIndex[key];
        if (!cst) return;

        this.currentBodyKey = key;
        this.selectDockPlanet(null);

        document.getElementById('detail-tag').textContent = cst.zodiaque ? 'Zodiaque' : 'Constellation';
        document.getElementById('detail-name').textContent = cst.nom;
        document.getElementById('detail-description').textContent = cst.description || '';

        const rows = [
            { label: 'Type', value: cst.zodiaque ? 'Signe du zodiaque' : 'Constellation' },
            { label: 'Étoile principale', value: cst.etoilePrincipale },
            { label: "Nombre d'étoiles", value: String(cst.stars.length) }
        ];
        if (cst.zodiaque) rows.push({ label: 'Dates', value: cst.dates });
        this.renderDetailTable(rows);

        // Pas d'aperçu 3D rotatif pour une constellation
        document.querySelector('.detail-rotate').style.display = 'none';
        document.getElementById('detail-moons').innerHTML = '';

        document.getElementById('detail-panel').classList.add('open');

        this.drawConstellationPreview(cst);
    }

    // Aperçu 2D : la constellation dessinée comme une carte du ciel
    drawConstellationPreview(cst) {
        const container = document.getElementById('planet-preview-container');
        if (!container) return;

        if (this.previewAnimationId) {
            cancelAnimationFrame(this.previewAnimationId);
            this.previewAnimationId = null;
        }

        const width = container.clientWidth || 290;
        const height = container.clientHeight || 190;

        // Détacher l'aperçu WebGL (conservé pour réutilisation) au profit d'un canvas 2D
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        while (container.firstChild) container.removeChild(container.firstChild);
        container.appendChild(canvas);

        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#070a18';
        ctx.fillRect(0, 0, width, height);

        // Projeter les positions (x, y) dans le canvas, axe Y inversé, avec marge
        const xs = cst.stars.map(s => s.position[0]);
        const ys = cst.stars.map(s => s.position[1]);
        const minX = Math.min(...xs), maxX = Math.max(...xs);
        const minY = Math.min(...ys), maxY = Math.max(...ys);
        const pad = 26;
        const spanX = (maxX - minX) || 1;
        const spanY = (maxY - minY) || 1;
        const scale = Math.min((width - pad * 2) / spanX, (height - pad * 2) / spanY);
        const offX = (width - spanX * scale) / 2;
        const offY = (height - spanY * scale) / 2;
        const project = (p) => ({
            x: offX + (p[0] - minX) * scale,
            y: height - (offY + (p[1] - minY) * scale)
        });

        // Tracés reliant les étoiles
        ctx.strokeStyle = cst.color;
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (const [from, to] of cst.lines) {
            const a = project(cst.stars[from].position);
            const b = project(cst.stars[to].position);
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
        }
        ctx.stroke();

        // Étoiles, avec un léger halo
        ctx.globalAlpha = 1;
        ctx.fillStyle = cst.color;
        ctx.shadowColor = cst.color;
        for (const star of cst.stars) {
            const p = project(star.position);
            ctx.shadowBlur = 8 * star.size;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 1.6 * star.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.shadowBlur = 0;
    }

    // --- Mini scène d'aperçu 3D ---
    initPreviewScene(bodyKey, colorHex, originalTexture) {
        const container = document.getElementById('planet-preview-container');
        if (!container) return;

        if (this.previewAnimationId) {
            cancelAnimationFrame(this.previewAnimationId);
        }

        if (!this.previewRenderer) {
            this.previewRenderer = new THREE.WebGLRenderer({ antialias: true });
            this.previewRenderer.setClearColor(0x070a18, 1);
        }
        // (Ré)attacher le canvas WebGL — il a pu être détaché par un aperçu 2D
        if (this.previewRenderer.domElement.parentNode !== container) {
            while (container.firstChild) container.removeChild(container.firstChild);
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
