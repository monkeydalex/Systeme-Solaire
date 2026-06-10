// Données des planètes
const planetData = {
    soleil: {
        nom: "Soleil",
        rayon: 5,
        distance: 0,
        vitesseRotation: 0.001,
        texture: "textures/sun.jpg",
        description: "Le Soleil est l'étoile au centre de notre système solaire. C'est une sphère presque parfaite de plasma chaud, chauffée par la fusion nucléaire, principalement d'hydrogène en hélium.",
        emissive: 0xffff00,
        lumiere: true
    },
    mercure: {
        nom: "Mercure",
        rayon: 0.4,
        distance: 10,
        vitesseRotation: 0.004,
        vitesseOrbite: 0.02,
        texture: "textures/mercury.jpg",
        description: "Mercure est la planète la plus proche du Soleil et la plus petite du système solaire. Sa surface est couverte de cratères semblables à ceux de la Lune."
    },
    venus: {
        nom: "Vénus",
        rayon: 0.9,
        distance: 15,
        vitesseRotation: 0.002,
        vitesseOrbite: 0.015,
        texture: "textures/venus.jpg",
        description: "Vénus est la deuxième planète du système solaire. Elle est souvent appelée la jumelle de la Terre en raison de sa taille similaire, mais son atmosphère dense de dioxyde de carbone la rend extrêmement chaude."
    },
    terre: {
        nom: "Terre",
        rayon: 1,
        distance: 20,
        vitesseRotation: 0.01,
        vitesseOrbite: 0.01,
        texture: "textures/earth.jpg",
        description: "La Terre est notre planète, la seule connue pour abriter la vie. Elle est caractérisée par ses océans d'eau liquide, son atmosphère riche en oxygène et sa biodiversité."
    },
    mars: {
        nom: "Mars",
        rayon: 0.5,
        distance: 25,
        vitesseRotation: 0.008,
        vitesseOrbite: 0.008,
        texture: "textures/mars.jpg",
        description: "Mars est surnommée la planète rouge en raison de sa couleur caractéristique due à l'oxyde de fer présent à sa surface. Elle possède des calottes polaires et des traces d'anciens cours d'eau."
    },
    jupiter: {
        nom: "Jupiter",
        rayon: 2.5,
        distance: 40,
        vitesseRotation: 0.02,
        vitesseOrbite: 0.005,
        texture: "textures/jupiter.jpg",
        description: "Jupiter est la plus grande planète du système solaire. C'est une géante gazeuse avec une atmosphère composée principalement d'hydrogène et d'hélium, et sa caractéristique la plus connue est sa Grande Tache Rouge."
    },
    saturne: {
        nom: "Saturne",
        rayon: 2.2,
        distance: 55,
        vitesseRotation: 0.018,
        vitesseOrbite: 0.004,
        texture: "textures/saturn.jpg",
        description: "Saturne est célèbre pour ses anneaux spectaculaires composés de glace et de poussière. C'est une géante gazeuse similaire à Jupiter mais moins massive."
    },
    uranus: {
        nom: "Uranus",
        rayon: 1.8,
        distance: 70,
        vitesseRotation: 0.012,
        vitesseOrbite: 0.003,
        texture: "textures/uranus.jpg",
        description: "Uranus est une géante de glace qui a la particularité de tourner sur un axe presque parallèle au plan de son orbite, comme si elle était couchée sur le côté."
    },
    neptune: {
        nom: "Neptune",
        rayon: 1.7,
        distance: 85,
        vitesseRotation: 0.014,
        vitesseOrbite: 0.002,
        texture: "textures/neptune.jpg",
        description: "Neptune est la planète la plus éloignée du Soleil. C'est une géante de glace caractérisée par sa couleur bleue intense due à la présence de méthane dans son atmosphère."
    }
};

// Variables globales
let scene, camera, renderer, controls;
let planets = {};
let textureLoader;
let raycaster, mouse;
let selectedPlanet = null;
let simulationSpeed = 1;
let orbits = [];
let showOrbits = true;

// Initialisation
function init() {
    // Création de la scène
    scene = new THREE.Scene();
    
    // Création de la caméra
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 50;
    camera.position.y = 30;
    
    // Création du renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.getElementById('scene-container').appendChild(renderer.domElement);
    
    // Contrôles de la caméra
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    
    // Chargeur de textures
    textureLoader = new THREE.TextureLoader();
    
    // Fond étoilé
    createStarBackground();
    
    // Création des planètes
    createPlanets();
    
    // Raycaster pour l'interaction
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
    
    // Gestionnaires d'événements
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('click', onMouseClick);
    
    // Animation
    animate();
}

// Création du fond étoilé
function createStarBackground() {
    const starsGeometry = new THREE.BufferGeometry();
    const starsMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.1
    });
    
    const starsVertices = [];
    for (let i = 0; i < 10000; i++) {
        const x = (Math.random() - 0.5) * 2000;
        const y = (Math.random() - 0.5) * 2000;
        const z = (Math.random() - 0.5) * 2000;
        starsVertices.push(x, y, z);
    }
    
    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
    const stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);
}

// Création des planètes
function createPlanets() {
    // URLs des textures de la NASA
    const textureURLs = {
        soleil: "https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/frames/730x730_1x1_30p/sun.jpg",
        mercure: "https://svs.gsfc.nasa.gov/vis/a000000/a004300/a004386/mercury_1k_color.jpg",
        venus: "https://svs.gsfc.nasa.gov/vis/a000000/a004800/a004824/venus_atmosphere.jpg",
        terre: "https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57735/land_shallow_topo_2048.jpg",
        mars: "https://svs.gsfc.nasa.gov/vis/a000000/a004500/a004579/mars_4k_color.jpg",
        jupiter: "https://svs.gsfc.nasa.gov/vis/a000000/a004800/a004881/jupiter_4k.jpg",
        saturne: "https://svs.gsfc.nasa.gov/vis/a000000/a004400/a004411/saturn.jpg",
        uranus: "https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004730/uranus.jpg",
        neptune: "https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004730/neptune.jpg"
    };
    
    // Création de chaque planète
    for (const [key, data] of Object.entries(planetData)) {
        // Création de la géométrie et du matériau
        const geometry = new THREE.SphereGeometry(data.rayon, 32, 32);
        
        // Utilisation d'une texture temporaire en attendant le chargement
        const material = new THREE.MeshPhongMaterial({ 
            color: 0xffffff,
            emissive: data.emissive || 0x000000,
            shininess: 25
        });
        
        // Création du mesh
        const planet = new THREE.Mesh(geometry, material);
        
        // Positionnement
        if (key !== 'soleil') {
            planet.position.x = data.distance;
            
            // Création de l'orbite
            const orbitGeometry = new THREE.RingGeometry(data.distance - 0.1, data.distance + 0.1, 128);
            const orbitMaterial = new THREE.MeshBasicMaterial({ 
                color: 0xffffff, 
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.2
            });
            const orbit = new THREE.Mesh(orbitGeometry, orbitMaterial);
            orbit.rotation.x = Math.PI / 2;
            scene.add(orbit);
            orbits.push(orbit);
        }
        
        // Ajout de la planète à la scène et au dictionnaire
        scene.add(planet);
        planets[key] = {
            mesh: planet,
            data: data,
            angle: Math.random() * Math.PI * 2 // Angle initial aléatoire
        };
        
        // Chargement de la texture depuis les URLs de la NASA
        if (textureURLs[key]) {
            textureLoader.load(textureURLs[key], (texture) => {
                planet.material.map = texture;
                planet.material.needsUpdate = true;
            });
        }
        
        // Ajout d'une lumière pour le soleil
        if (data.lumiere) {
            const light = new THREE.PointLight(0xffffff, 1.5, 300);
            planet.add(light);
            
            // Ajout d'un effet de lueur
            const sunGlow = new THREE.Sprite(
                new THREE.SpriteMaterial({
                    map: textureLoader.load('https://cdn.jsdelivr.net/gh/mrdoob/three.js@master/examples/textures/sprites/glow.png'),
                    color: 0xffff00,
                    transparent: true,
                    blending: THREE.AdditiveBlending
                })
            );
            sunGlow.scale.set(20, 20, 1);
            planet.add(sunGlow);
        }
        
        // Ajout d'anneaux pour Saturne
        if (key === 'saturne') {
            const ringGeometry = new THREE.RingGeometry(data.rayon + 0.5, data.rayon + 2, 64);
            const ringMaterial = new THREE.MeshBasicMaterial({
                color: 0xf8d8c0,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.8
            });
            const ring = new THREE.Mesh(ringGeometry, ringMaterial);
            ring.rotation.x = Math.PI / 2;
            planet.add(ring);
        }
    }
    
    // Ajout d'une lumière ambiante
    const ambientLight = new THREE.AmbientLight(0x333333);
    scene.add(ambientLight);
}

// Gestion du redimensionnement de la fenêtre
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Gestion du mouvement de la souris
function onMouseMove(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

// Gestion du clic de la souris
function onMouseClick() {
    raycaster.setFromCamera(mouse, camera);
    
    const intersects = raycaster.intersectObjects(scene.children);
    
    let clickedPlanet = null;
    
    for (const intersect of intersects) {
        // Vérifier si l'objet intersecté est une planète
        for (const [key, planet] of Object.entries(planets)) {
            if (intersect.object === planet.mesh) {
                clickedPlanet = key;
                break;
            }
        }
        
        if (clickedPlanet) break;
    }
    
    if (clickedPlanet) {
        selectedPlanet = clickedPlanet;
        updatePlanetInfo(clickedPlanet);
    }
}

// Mise à jour des informations sur la planète
function updatePlanetInfo(planetKey) {
    const planet = planets[planetKey];
    const infoElement = document.getElementById('planet-info');
    
    if (infoElement) {
        const titleElement = infoElement.querySelector('h2');
        const descriptionElement = document.getElementById('planet-description');
        
        if (titleElement && descriptionElement) {
            titleElement.textContent = planet.data.nom;
            descriptionElement.textContent = planet.data.description;
        }
    }
}

// Animation
function animate() {
    requestAnimationFrame(animate);
    
    // Mise à jour des contrôles
    controls.update();
    
    // Rotation et orbite des planètes
    for (const [key, planet] of Object.entries(planets)) {
        // Rotation sur soi-même
        planet.mesh.rotation.y += (planet.data.vitesseRotation || 0) * simulationSpeed;
        
        // Orbite autour du soleil
        if (key !== 'soleil' && planet.data.vitesseOrbite) {
            planet.angle += planet.data.vitesseOrbite * simulationSpeed;
            planet.mesh.position.x = Math.cos(planet.angle) * planet.data.distance;
            planet.mesh.position.z = Math.sin(planet.angle) * planet.data.distance;
        }
    }
    
    // Rendu de la scène
    renderer.render(scene, camera);
}

// Fonction pour se focaliser sur une planète
function focusOnPlanet(planetKey) {
    const planet = planets[planetKey];
    if (!planet) return;
    
    // Mise à jour des informations
    updatePlanetInfo(planetKey);
    
    // Animation de la caméra vers la planète
    const targetPosition = new THREE.Vector3().copy(planet.mesh.position);
    
    // Ajuster la distance en fonction de la taille de la planète
    const distance = planetKey === 'soleil' ? 20 : 10;
    const offset = new THREE.Vector3(distance, distance / 2, distance);
    
    // Animation de la caméra
    const startPosition = camera.position.clone();
    const startTime = Date.now();
    const duration = 1000; // 1 seconde
    
    function animateCamera() {
        const now = Date.now();
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Interpolation
        const newPosition = new THREE.Vector3().lerpVectors(
            startPosition,
            new THREE.Vector3(
                targetPosition.x + offset.x,
                targetPosition.y + offset.y,
                targetPosition.z + offset.z
            ),
            progress
        );
        
        camera.position.copy(newPosition);
        controls.target.copy(targetPosition);
        controls.update();
        
        if (progress < 1) {
            requestAnimationFrame(animateCamera);
        }
    }
    
    animateCamera();
}

// Fonction pour réinitialiser la caméra
function resetCamera() {
    const startPosition = camera.position.clone();
    const targetPosition = new THREE.Vector3(0, 30, 50);
    const startTarget = controls.target.clone();
    const targetTarget = new THREE.Vector3(0, 0, 0);
    
    const startTime = Date.now();
    const duration = 1000; // 1 seconde
    
    function animateReset() {
        const now = Date.now();
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Interpolation
        camera.position.lerpVectors(startPosition, targetPosition, progress);
        controls.target.lerpVectors(startTarget, targetTarget, progress);
        controls.update();
        
        if (progress < 1) {
            requestAnimationFrame(animateReset);
        }
    }
    
    animateReset();
}

// Fonction pour basculer l'affichage des orbites
function toggleOrbits() {
    showOrbits = !showOrbits;
    
    for (const orbit of orbits) {
        orbit.visible = showOrbits;
    }
}

// Initialisation des contrôles de l'interface
function initUIControls() {
    // Contrôle de la vitesse
    const speedSlider = document.getElementById('speed-slider');
    const speedValue = document.getElementById('speed-value');
    
    if (speedSlider && speedValue) {
        speedSlider.addEventListener('input', function() {
            simulationSpeed = parseFloat(this.value);
            speedValue.textContent = simulationSpeed.toFixed(1) + 'x';
        });
    }
    
    // Bouton de réinitialisation de la caméra
    const resetButton = document.getElementById('reset-camera');
    if (resetButton) {
        resetButton.addEventListener('click', resetCamera);
    }
    
    // Bouton pour basculer l'affichage des orbites
    const toggleOrbitsButton = document.getElementById('toggle-orbits');
    if (toggleOrbitsButton) {
        toggleOrbitsButton.addEventListener('click', toggleOrbits);
    }
    
    // Liste des planètes
    const planetItems = document.querySelectorAll('#planet-list li');
    planetItems.forEach(item => {
        item.addEventListener('click', function() {
            const planetKey = this.getAttribute('data-planet');
            if (planetKey) {
                focusOnPlanet(planetKey);
            }
        });
    });
}

// Démarrage de l'application
window.addEventListener('DOMContentLoaded', function() {
    init();
    initUIControls();
}); 