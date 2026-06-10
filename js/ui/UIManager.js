import * as THREE from 'three';
import gsap from 'gsap';

export class UIManager {
    constructor(callbacks) {
        this.callbacks = callbacks; // Callbacks vers le moteur principal ({ onSpeedChange, onPlayPause, onReset, onOrbitToggle, onEffectToggle, onPlanetFocus, onStarshipToggle, onStarshipTarget, onStarshipSpeed, onStarshipFollow })
        
        // États locaux
        this.detailPanelActive = false;
        this.detailAutoRotate = true;
        
        // Mini scene pour le panneau détail
        this.previewScene = null;
        this.previewCamera = null;
        this.previewRenderer = null;
        this.previewMesh = null;
        this.previewAnimationId = null;

        this.init();
    }

    init() {
        this.setupTabs();
        this.setupPanelCollapse();
        this.setupSimulationControls();
        this.setupPlanetList();
        this.setupEffectsControls();
        this.setupStarshipUI();
        this.setupDetailPanelClose();
    }

    // --- Onglets ---
    setupTabs() {
        const tabs = document.querySelectorAll('.tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                document.querySelectorAll('.tab-content').forEach(content => {
                    content.style.display = 'none';
                });
                
                const contentId = tab.getAttribute('data-tab') + '-content';
                const selectedContent = document.getElementById(contentId);
                if (selectedContent) {
                    selectedContent.style.display = 'block';
                }
            });
        });
    }

    // --- Menu Collapsable ---
    setupPanelCollapse() {
        const controlPanel = document.getElementById('control-panel');
        const panelToggle = document.getElementById('panel-toggle');
        
        if (panelToggle && controlPanel) {
            panelToggle.addEventListener('click', () => {
                controlPanel.classList.toggle('collapsed');
                
                if (controlPanel.classList.contains('collapsed')) {
                    panelToggle.innerHTML = '<i class="fas fa-cogs fa-2x"></i><span class="toggle-hint">MENU</span>';
                    panelToggle.setAttribute('title', 'Ouvrir le panneau de contrôle');
                } else {
                    panelToggle.innerHTML = '<i class="fas fa-times fa-2x"></i><span class="toggle-hint">FERMER</span>';
                    panelToggle.setAttribute('title', 'Fermer le panneau de contrôle');
                }
            });
        }
    }

    // --- Contrôles généraux ---
    setupSimulationControls() {
        // Vitesse
        const speedSlider = document.getElementById('speed-slider');
        if (speedSlider) {
            speedSlider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value) / 50; // 0 à 2x
                if (this.callbacks.onSpeedChange) this.callbacks.onSpeedChange(val);
            });
        }

        // Pause / Lecture
        const pauseBtn = document.getElementById('pause-btn');
        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => {
                if (this.callbacks.onPlayPause) {
                    const isPaused = this.callbacks.onPlayPause();
                    pauseBtn.innerHTML = isPaused ? 
                        '<i class="fas fa-play"></i> Reprendre' : 
                        '<i class="fas fa-pause"></i> Pause';
                }
            });
        }

        // Réinitialiser
        const resetBtn = document.getElementById('reset-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (this.callbacks.onReset) this.callbacks.onReset();
            });
        }

        // Caméra reset
        const resetCameraBtn = document.getElementById('reset-camera-btn');
        if (resetCameraBtn) {
            resetCameraBtn.addEventListener('click', () => {
                if (this.callbacks.onCameraReset) this.callbacks.onCameraReset();
            });
        }

        // Orbites
        const orbitsCheckbox = document.getElementById('show-orbits');
        if (orbitsCheckbox) {
            orbitsCheckbox.addEventListener('change', (e) => {
                if (this.callbacks.onOrbitToggle) this.callbacks.onOrbitToggle(e.target.checked);
            });
        }
    }

    // --- Liste des Planètes ---
    setupPlanetList() {
        const planetItems = document.querySelectorAll('#planets-section li');
        planetItems.forEach(item => {
            item.addEventListener('click', () => {
                const planetKey = item.getAttribute('data-planet');
                if (planetKey) {
                    planetItems.forEach(p => p.classList.remove('selected'));
                    item.classList.add('selected');
                    
                    if (this.callbacks.onPlanetFocus) {
                        this.callbacks.onPlanetFocus(planetKey);
                    }
                    this.showDetailPanel(planetKey);
                }
            });
        });
    }

    // --- Effets spéciaux ---
    setupEffectsControls() {
        const effectButtons = document.querySelectorAll('.effect-btn');
        effectButtons.forEach(button => {
            button.addEventListener('click', () => {
                const effect = button.getAttribute('data-effect');
                button.classList.toggle('active');
                
                const active = button.classList.contains('active');
                if (this.callbacks.onEffectToggle) {
                    this.callbacks.onEffectToggle(effect, active);
                }
            });
        });
    }

    // --- Starship UI (Nouveau) ---
    setupStarshipUI() {
        // Ces éléments seront ajoutés au DOM via index.html, mais nous configurons les écouteurs ici
        const toggleBtn = document.getElementById('toggle-starship');
        const controlsDiv = document.getElementById('starship-controls');
        const targetSelect = document.getElementById('starship-target');
        const speedSlider = document.getElementById('starship-speed');
        const speedVal = document.getElementById('starship-speed-value');
        const followBtn = document.getElementById('follow-starship');

        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                toggleBtn.classList.toggle('active');
                const active = toggleBtn.classList.contains('active');

                if (active) {
                    toggleBtn.innerHTML = '<i class="fas fa-power-off"></i> Désactiver StarShip';
                    if (controlsDiv) controlsDiv.style.display = 'block';
                } else {
                    toggleBtn.innerHTML = '<i class="fas fa-power-off"></i> Activer StarShip';
                    if (controlsDiv) controlsDiv.style.display = 'none';
                }

                if (this.callbacks.onStarshipToggle) {
                    this.callbacks.onStarshipToggle(active);
                }
            });
        }

        if (targetSelect) {
            targetSelect.addEventListener('change', (e) => {
                if (this.callbacks.onStarshipTarget) {
                    this.callbacks.onStarshipTarget(e.target.value);
                }
            });
        }

        if (speedSlider) {
            speedSlider.addEventListener('input', (e) => {
                const speed = parseFloat(e.target.value);
                if (speedVal) speedVal.textContent = speed.toFixed(1);
                if (this.callbacks.onStarshipSpeed) {
                    this.callbacks.onStarshipSpeed(speed);
                }
            });
        }

        if (followBtn) {
            followBtn.addEventListener('click', () => {
                followBtn.classList.toggle('active');
                const active = followBtn.classList.contains('active');
                if (active) {
                    followBtn.innerHTML = '<i class="fas fa-eye-slash"></i> Ne plus suivre';
                } else {
                    followBtn.innerHTML = '<i class="fas fa-eye"></i> Suivre StarShip';
                }
                if (this.callbacks.onStarshipFollow) {
                    this.callbacks.onStarshipFollow(active);
                }
            });
        }
    }

    // --- Panneau Détaillé & Mini Rendu ---
    setupDetailPanelClose() {
        const closeBtn = document.getElementById('close-panel');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                const detailPanel = document.getElementById('planet-detail-panel');
                if (detailPanel) {
                    detailPanel.style.display = 'none';
                    this.detailPanelActive = false;
                    
                    // Stopper la mini boucle d'animation
                    if (this.previewAnimationId) {
                        cancelAnimationFrame(this.previewAnimationId);
                    }

                    // Réinitialiser la caméra générale
                    if (this.callbacks.onCameraReset) this.callbacks.onCameraReset();
                }
            });
        }

        const autoRotateChk = document.getElementById('detail-auto-rotate');
        if (autoRotateChk) {
            autoRotateChk.addEventListener('change', (e) => {
                this.detailAutoRotate = e.target.checked;
            });
        }

        const focusBtn = document.getElementById('detail-focus-planet');
        if (focusBtn) {
            focusBtn.addEventListener('click', () => {
                if (this.callbacks.onPlanetFocus) {
                    const activePlanet = document.querySelector('#planets-section li.selected');
                    if (activePlanet) {
                        this.callbacks.onPlanetFocus(activePlanet.getAttribute('data-planet'));
                    }
                }
            });
        }
    }

    showDetailPanel(planetKey) {
        const planetInfo = this.callbacks.getPlanetData(planetKey);
        if (!planetInfo) return;

        this.detailPanelActive = true;
        const panel = document.getElementById('planet-detail-panel');
        if (panel) panel.style.display = 'block';

        // Mettre à jour les textes du DOM
        document.getElementById('detail-planet-name').textContent = planetInfo.nom;
        document.getElementById('detail-planet-type').textContent = planetInfo.type;
        document.getElementById('detail-planet-diameter').textContent = planetInfo.diametre;
        document.getElementById('detail-planet-distance').textContent = planetInfo.distance;
        document.getElementById('detail-planet-orbital-period').textContent = planetInfo.periode;
        document.getElementById('detail-planet-temperature').textContent = planetInfo.temperature;

        // Configurer le mini canvas de prévisualisation
        this.initPreviewScene(planetKey, planetInfo.color, planetInfo.texture);
    }

    initPreviewScene(planetKey, colorHex, originalTexture) {
        const container = document.getElementById('planet-preview-container');
        if (!container) return;

        // Arrêter l'ancienne animation
        if (this.previewAnimationId) {
            cancelAnimationFrame(this.previewAnimationId);
        }

        // Créer le renderer une seule fois
        if (!this.previewRenderer) {
            while (container.firstChild) container.removeChild(container.firstChild);
            this.previewRenderer = new THREE.WebGLRenderer({ antialias: true });
            this.previewRenderer.setClearColor(0x111116, 1);
            container.appendChild(this.previewRenderer.domElement);
        }
        
        const width = container.clientWidth || 320;
        const height = container.clientHeight || 320;
        this.previewRenderer.setSize(width, height);

        // Scène & Caméra
        this.previewScene = new THREE.Scene();
        this.previewCamera = new THREE.PerspectiveCamera(45, width / height, 0.1, 10);
        this.previewCamera.position.z = 4.2;

        // Éclairage studio
        const ambLight = new THREE.AmbientLight(0xffffff, 0.3);
        this.previewScene.add(ambLight);
        
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.8);
        dirLight.position.set(5, 3, 5);
        this.previewScene.add(dirLight);

        // Mesh de la planète
        const geometry = new THREE.SphereGeometry(1.5, 32, 32);
        
        // Matériau avec texture récupérée de l'objet principal si disponible
        let material;
        if (originalTexture) {
            material = new THREE.MeshStandardMaterial({
                map: originalTexture,
                roughness: 0.6,
                metalness: 0.1
            });
        } else {
            // Créer une texture colorée basique en secours
            const canvas = document.createElement('canvas');
            canvas.width = 256; canvas.height = 256;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = colorHex;
            ctx.fillRect(0,0,256,256);
            const fallbackTex = new THREE.CanvasTexture(canvas);
            material = new THREE.MeshStandardMaterial({ map: fallbackTex, roughness: 0.6 });
        }

        this.previewMesh = new THREE.Mesh(geometry, material);
        this.previewScene.add(this.previewMesh);

        // Anneaux si c'est Saturne
        if (planetKey === 'saturne') {
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

        // Lancer la boucle d'animation locale
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
