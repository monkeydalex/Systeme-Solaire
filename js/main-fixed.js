// Données des planètes
const planetData = {
    soleil: {
        nom: "Soleil",
        rayon: 5,
        distance: 0,
        vitesseRotation: 0.004,
        vitesseOrbite: 0,
        texture: "./textures/sun.jpg",
        emissive: 0xffff00,
        lumiere: true,
        description: "Le Soleil est l'étoile au centre de notre système solaire. C'est une sphère presque parfaite de plasma chaud, chauffée par la fusion nucléaire dans son noyau."
    },
    mercure: {
        nom: "Mercure",
        rayon: 0.8,
        distance: 10,
        vitesseRotation: 0.004,
        vitesseOrbite: 0.02,
        texture: "./textures/mercury.jpg",
        description: "Mercure est la planète la plus proche du Soleil et la plus petite du système solaire. Sa surface est couverte de cratères similaires à ceux de la Lune."
    },
    venus: {
        nom: "Vénus",
        rayon: 1.2,
        distance: 15,
        vitesseRotation: 0.002,
        vitesseOrbite: 0.015,
        texture: "./textures/venus.jpg",
        description: "Vénus est la deuxième planète du système solaire. Elle est souvent appelée la jumelle de la Terre en raison de sa taille similaire, mais son atmosphère dense de dioxyde de carbone la rend extrêmement chaude."
    },
    terre: {
        nom: "Terre",
        rayon: 1.3,
        distance: 20,
        vitesseRotation: 0.01,
        vitesseOrbite: 0.01,
        texture: "./textures/earth.jpg",
        description: "La Terre est notre planète d'origine, la seule connue pour abriter la vie. Elle est caractérisée par ses océans d'eau liquide, son atmosphère riche en oxygène et sa biodiversité."
    },
    mars: {
        nom: "Mars",
        rayon: 1.1,
        distance: 30,
        vitesseRotation: 0.008,
        vitesseOrbite: 0.008,
        texture: "./textures/mars.jpg",
        description: "Mars est surnommée la planète rouge en raison de la présence d'oxyde de fer à sa surface. Elle possède des calottes polaires, des vallées, des déserts et des volcans éteints comme l'Olympus Mons."
    },
    jupiter: {
        nom: "Jupiter",
        rayon: 2.5,
        distance: 40,
        vitesseRotation: 0.02,
        vitesseOrbite: 0.005,
        texture: "./textures/jupiter.jpg",
        description: "Jupiter est la plus grande planète du système solaire. C'est une géante gazeuse avec une atmosphère composée principalement d'hydrogène et d'hélium, et sa caractéristique la plus connue est sa Grande Tache Rouge."
    },
    saturne: {
        nom: "Saturne",
        rayon: 2.2,
        distance: 55,
        vitesseRotation: 0.018,
        vitesseOrbite: 0.004,
        texture: "./textures/saturn.jpg",
        description: "Saturne est célèbre pour ses anneaux spectaculaires composés de glace et de poussière. C'est une géante gazeuse similaire à Jupiter mais moins massive."
    },
    uranus: {
        nom: "Uranus",
        rayon: 1.8,
        distance: 70,
        vitesseRotation: 0.012,
        vitesseOrbite: 0.003,
        texture: "./textures/uranus.jpg",
        description: "Uranus est une géante de glace qui a la particularité de tourner sur un axe presque parallèle au plan de son orbite, comme si elle était couchée sur le côté."
    },
    neptune: {
        nom: "Neptune",
        rayon: 1.7,
        distance: 85,
        vitesseRotation: 0.014,
        vitesseOrbite: 0.002,
        texture: "./textures/neptune.jpg",
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
let texturesLoaded = 0;
let totalTextures = 0;

// Variables pour le panneau détaillé
let detailPanelScene, detailPanelCamera, detailPanelRenderer;
let detailPlanetMesh = null;
let detailPanelRings = null;
let detailPanelActive = false;
let detailAutoRotate = true;
let detailPanelAnimationId = null; // Pour stopper la boucle d'animation si besoin

// Variables pour la fusée StarShip
let starship = null;
let starshipActive = false;
let starshipTargetPlanet = null;
let starshipSpeed = 0.5;
let starshipTrail = [];
let starshipTrailMaxLength = 50;

// Variables pour les effets spéciaux
let starsAnimationActive = false;
let starsAnimation = null;
let nebulaEffect = null;
let nebulaActive = false;
let meteorShower = null;
let meteorShowerActive = false;
let asteroidBelt = null;
let asteroidBeltActive = false;
let comet = null;
let cometActive = false;
let spaceStation = null;
let spaceStationActive = false;

// Cache pour stocker les textures préchargées
const textureCache = {};

// Paramètres des effets spéciaux
const effectParams = {
    stars: {
        count: 500, // Plus d'étoiles
        minSize: 0.05,
        maxSize: 0.2,
        minOpacity: 0.3,
        maxOpacity: 0.8,
        minSpeed: 0.5,
        maxSpeed: 2.5,
        colors: [0xffffff, 0xffd700, 0x87ceeb, 0xff69b4] // Étoiles colorées
    },
    nebula: {
        size: 1024,
        colors: [
            { color: 'rgba(120,80,255,0.25)', stop: 0 },
            { color: 'rgba(120,80,255,0.15)', stop: 0.3 },
            { color: 'rgba(80,40,120,0.08)', stop: 0.7 },
            { color: 'rgba(0,0,0,0)', stop: 1 }
        ],
        rotationSpeed: 0.0001
    },
    meteors: {
        maxCount: 50,
        minSpeed: 0.5,
        maxSpeed: 2.0,
        minSize: 0.1,
        maxSize: 0.3,
        colors: [0xffcc88, 0xff9966, 0xff6633],
        spawnInterval: { min: 100, max: 500 }
    },
    asteroids: {
        count: 300,
        minSize: 0.1,
        maxSize: 0.3,
        minOrbitRadius: 30,
        maxOrbitRadius: 60,
        minRotationSpeed: 0.01,
        maxRotationSpeed: 0.03,
        minOrbitSpeed: 0.001,
        maxOrbitSpeed: 0.003,
        colors: [0x888888, 0x666666, 0x444444]
    },
    comet: {
        size: 0.5,
        tailLength: 5,
        tailWidth: 0.3,
        orbitRadius: 90,
        orbitSpeed: 0.002,
        orbitTilt: Math.PI / 6,
        color: 0xffffff,
        tailColor: 0x88ccff
    },
    spaceStation: {
        orbitRadius: 25,
        orbitSpeed: 0.003,
        rotationSpeed: 0.01,
        bodyColor: 0xccccff,
        panelColor: 0x00aaff,
        size: { x: 1.5, y: 0.4, z: 0.4 },
        panelSize: { x: 0.9, y: 0.1, z: 1.8 }
    }
};

// Shaders personnalisés pour les planètes
const planetVertexShader = `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    
    void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const planetFragmentShader = `
    uniform sampler2D texture;
    uniform float time;
    uniform vec3 lightPosition;
    uniform float atmosphereDensity;
    
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    
    void main() {
        // Texture de base
        vec4 texColor = texture2D(texture, vUv);
        
        // Éclairage de base
        vec3 lightDir = normalize(lightPosition - vPosition);
        float diff = max(dot(vNormal, lightDir), 0.0);
        
        // Effet d'atmosphère
        float atmosphere = pow(1.0 - dot(vNormal, vec3(0.0, 0.0, 1.0)), atmosphereDensity);
        
        // Combinaison des effets
        vec3 finalColor = texColor.rgb * (0.3 + 0.7 * diff) + vec3(0.2, 0.3, 0.5) * atmosphere;
        
        gl_FragColor = vec4(finalColor, 1.0);
    }
`;

// Fonction pour charger une image locale en contournant les restrictions CORS
function loadLocalImageAsDataURL(url) {
    return new Promise((resolve, reject) => {
        console.log(`Tentative de chargement de l'image locale: ${url}`);
        
        // Créer un élément canvas pour dessiner l'image
        const img = new Image();
        img.crossOrigin = "Anonymous";
        
        img.onload = function() {
            console.log(`✅ Image locale chargée avec succès: ${url}`);
            
            // Créer un canvas et y dessiner l'image
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            
            // Convertir le canvas en Data URL
            try {
                const dataURL = canvas.toDataURL('image/jpeg');
                resolve(dataURL);
            } catch (e) {
                console.error(`❌ Erreur lors de la conversion en Data URL: ${e.message}`);
                reject(e);
            }
        };
        
        img.onerror = function(e) {
            console.error(`❌ Erreur lors du chargement de l'image locale: ${url}`, e);
            reject(new Error(`Impossible de charger l'image: ${url}`));
        };
        
        // Ajouter un timestamp pour éviter la mise en cache du navigateur
        img.src = url + "?t=" + new Date().getTime();
        
        // Définir un timeout
        setTimeout(() => {
            if (!img.complete) {
                console.log(`⏱️ Timeout pour l'image locale: ${url}`);
                reject(new Error(`Timeout lors du chargement de l'image: ${url}`));
            }
        }, 5000);
    });
}

// Fonction pour précharger toutes les textures
function preloadTextures() {
    console.log("Génération de textures procédurales...");
    
    // Afficher le message de chargement
    const loadingMessage = document.getElementById('loading-message');
    if (loadingMessage) {
        loadingMessage.style.display = 'block';
    }
    
    // Créer un tableau pour stocker toutes les promesses de chargement
    const texturePromises = [];
    
    // Utiliser directement des textures procédurales pour chaque planète
    for (const [key, data] of Object.entries(planetData)) {
        const texturePath = data.texture;
        console.log(`Création d'une texture procédurale pour: ${key}`);
        
        // Créer une promesse pour chaque texture
        const promise = new Promise((resolve) => {
            // Créer une texture procédurale avec la couleur appropriée
            const fallbackColor = window.fallbackColors[key] || "#ffffff";
            const canvas = window.createFallbackTexture(fallbackColor, 512);
            
            // Stocker le canvas dans le cache
            textureCache[texturePath] = canvas;
            resolve(canvas);
            
            // Incrémenter le compteur de textures chargées
            texturesLoaded++;
            console.log(`Texture procédurale créée: ${texturesLoaded}/${totalTextures}`);
        });
        
        texturePromises.push(promise);
    }
    
    // Créer une texture de lueur pour le soleil
    const glowTexturePath = 'glow.png';
    const glowPromise = new Promise((resolve) => {
        // Créer un canvas pour la texture de lueur
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        
        // Créer un dégradé radial pour simuler une lueur
        const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.3, 'rgba(255, 255, 128, 0.8)');
        gradient.addColorStop(0.7, 'rgba(255, 255, 0, 0.3)');
        gradient.addColorStop(1, 'rgba(255, 255, 0, 0)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 256, 256);
        
        // Stocker le canvas dans le cache
        textureCache[glowTexturePath] = canvas;
        resolve(canvas);
        
        // Incrémenter le compteur de textures chargées
        texturesLoaded++;
        console.log(`Texture de lueur créée: ${texturesLoaded}/${totalTextures}`);
    });
    
    texturePromises.push(glowPromise);
    
    // Attendre que toutes les textures soient créées
    return Promise.all(texturePromises)
        .then(() => {
            console.log("Toutes les textures procédurales ont été créées avec succès!");
            // Appliquer les textures aux planètes
            reloadTextures();
            // Masquer le message de chargement
            if (loadingMessage) {
                loadingMessage.style.display = 'none';
            }
            // Démarrer l'animation
            animate();
        })
        .catch(error => {
            console.error("Erreur lors du chargement des textures:", error);
            if (loadingMessage) {
                loadingMessage.style.display = 'none';
            }
        });
}

// Fonction pour masquer le message de chargement
function hideLoadingMessage() {
    const loadingMessage = document.getElementById('loading-message');
    if (loadingMessage) {
        loadingMessage.style.display = 'none';
    }
}

// Fonction pour vérifier si toutes les textures sont chargées
function checkTexturesLoaded() {
    texturesLoaded++;
    console.log(`Texture chargée: ${texturesLoaded}/${totalTextures}`);
    if (texturesLoaded >= totalTextures) {
        console.log("Toutes les textures sont chargées!");
        hideLoadingMessage();
    }
}

// Fonction pour créer une texture procédurale améliorée pour une planète
function createEnhancedPlanetTexture(planetKey, data) {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Couleur de base
    const baseColor = window.fallbackColors[planetKey] || "#ffffff";
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, size, size);

    // Créer des variations de couleur pour simuler des reliefs
    const noise = new SimplexNoise();
    for (let i = 0; i < 10000; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const radius = Math.random() * 2 + 0.5;

        // Utiliser le bruit de Simplex pour créer des variations plus naturelles
        const noiseValue = noise.noise2D(x / 50, y / 50);
        const variation = noiseValue * 30;

        // Décomposer la couleur de base
        const r = parseInt(baseColor.slice(1, 3), 16);
        const g = parseInt(baseColor.slice(3, 5), 16);
        const b = parseInt(baseColor.slice(5, 7), 16);

        // Appliquer la variation
        const newR = Math.max(0, Math.min(255, r + variation));
        const newG = Math.max(0, Math.min(255, g + variation));
        const newB = Math.max(0, Math.min(255, b + variation));

        ctx.fillStyle = `rgb(${newR}, ${newG}, ${newB})`;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    }

    // Ajouter des détails spécifiques selon la planète
    switch(planetKey) {
        case 'soleil':
            // Ajouter des taches solaires
            for (let i = 0; i < 20; i++) {
                const x = Math.random() * size;
                const y = Math.random() * size;
                const radius = Math.random() * 10 + 5;
                ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.fill();
            }
            break;
        case 'terre':
            // Ajouter des continents
            for (let i = 0; i < 5; i++) {
                const x = Math.random() * size;
                const y = Math.random() * size;
                const radius = Math.random() * 50 + 30;
                ctx.fillStyle = '#2d5a27';
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.fill();
            }
            break;
        case 'jupiter':
            // Ajouter des bandes caractéristiques
            for (let i = 0; i < 10; i++) {
                const y = (i * size / 10) + Math.random() * 20;
                const height = Math.random() * 20 + 10;
                ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.3})`;
                ctx.fillRect(0, y, size, height);
            }
            break;
        case 'saturne':
            // Ajouter des bandes plus subtiles
            for (let i = 0; i < 15; i++) {
                const y = (i * size / 15) + Math.random() * 10;
                const height = Math.random() * 10 + 5;
                ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.2})`;
                ctx.fillRect(0, y, size, height);
            }
            break;
    }

    return canvas;
}

// Fonction pour créer un matériau amélioré pour une planète
function createEnhancedPlanetMaterial(texture, emissive, atmosphereDensity = 1.5) {
    return new THREE.MeshPhongMaterial({
        map: texture,
        emissive: emissive || 0x000000,
        shininess: 25,
        transparent: true,
        opacity: 1.0
    });
}

// Création des planètes
function createPlanets() {
    totalTextures = Object.keys(planetData).length + 1;
    console.log(`Nombre total de textures à charger: ${totalTextures}`);
    // Création de chaque planète
    for (const [key, data] of Object.entries(planetData)) {
        const geometry = new THREE.SphereGeometry(data.rayon, 64, 64);
        // Toujours utiliser une texture procédurale
        const fallbackColor = window.fallbackColors[key] || "#ffffff";
        const canvas = window.createFallbackTexture(fallbackColor, 512);
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        const material = new THREE.MeshPhongMaterial({ 
            map: texture,
            emissive: data.emissive || 0x000000,
            shininess: 25
        });
        const planet = new THREE.Mesh(geometry, material);
        if (key !== 'soleil') {
            planet.position.x = data.distance;
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
        scene.add(planet);
        planets[key] = {
            mesh: planet,
            data: data,
            angle: Math.random() * Math.PI * 2
        };
        if (data.lumiere) {
            const light = new THREE.PointLight(0xffffff, 1.5, 300);
            planet.add(light);
            try {
                const canvas = document.createElement('canvas');
                canvas.width = 256;
                canvas.height = 256;
                const ctx = canvas.getContext('2d');
                const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
                gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
                gradient.addColorStop(0.3, 'rgba(255, 255, 128, 0.8)');
                gradient.addColorStop(0.7, 'rgba(255, 255, 0, 0.3)');
                gradient.addColorStop(1, 'rgba(255, 255, 0, 0)');
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, 256, 256);
                const glowTexture = new THREE.CanvasTexture(canvas);
                glowTexture.needsUpdate = true;
                const sunGlow = new THREE.Sprite(
                    new THREE.SpriteMaterial({
                        map: glowTexture,
                        color: 0xffff00,
                        transparent: true,
                        blending: THREE.AdditiveBlending
                    })
                );
                sunGlow.scale.set(20, 20, 1);
                planet.add(sunGlow);
                textureCache['glow.png'] = canvas;
                checkTexturesLoaded();
            } catch (error) {
                console.error("Erreur lors de la création de l'effet de lueur du soleil:", error);
                checkTexturesLoaded();
            }
        }
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
    const ambientLight = new THREE.AmbientLight(0x333333);
    scene.add(ambientLight);
}

// Gestion du redimensionnement de la fenêtre
function onWindowResize() {
    // Mise à jour de la caméra principale
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    // Mise à jour du renderer du panneau détaillé
    if (detailPanelRenderer) {
        const container = document.getElementById('planet-preview-container');
        if (container) {
            const width = container.clientWidth;
            const height = container.clientHeight;
            detailPanelRenderer.setSize(width, height);
        }
    }
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
        showDetailPanel(clickedPlanet);
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
    
    // Mise à jour des uniforms des shaders
    for (const [key, planet] of Object.entries(planets)) {
        if (planet.mesh && planet.mesh.material) {
            // Vérifier si c'est un ShaderMaterial
            if (planet.mesh.material instanceof THREE.ShaderMaterial && 
                planet.mesh.material.uniforms) {
                const uniforms = planet.mesh.material.uniforms;
                
                // Mettre à jour le temps
                if (uniforms.time && typeof uniforms.time.value === 'number') {
                    uniforms.time.value = performance.now() * 0.001;
                }
                
                // Mettre à jour la position de la lumière
                if (uniforms.lightPosition && 
                    uniforms.lightPosition.value instanceof THREE.Vector3 && 
                    planets.soleil && 
                    planets.soleil.mesh) {
                    uniforms.lightPosition.value.copy(planets.soleil.mesh.position);
                }
            }
        }
    }
    
    // Mise à jour des contrôles
    controls.update();
    
    // Rotation et orbite des planètes
    for (const [key, planet] of Object.entries(planets)) {
        if (planet.mesh) {
            // Rotation sur soi-même
            planet.mesh.rotation.y += (planet.data.vitesseRotation || 0) * simulationSpeed;
            
            // Orbite autour du soleil
            if (key !== 'soleil' && planet.data.vitesseOrbite) {
                planet.angle += planet.data.vitesseOrbite * simulationSpeed;
                planet.mesh.position.x = Math.cos(planet.angle) * planet.data.distance;
                planet.mesh.position.z = Math.sin(planet.angle) * planet.data.distance;
            }
        }
    }
    
    // Animation des étoiles scintillantes
    if (starsAnimationActive && starsAnimation) {
        const time = Date.now() * 0.001; // Temps en secondes
        
        starsAnimation.forEach(star => {
            if (star.visible) {
                // Faire scintiller les étoiles en modifiant leur opacité
                const phase = star.userData.phase;
                const speed = star.userData.speed;
                const originalOpacity = star.userData.originalOpacity;
                
                // Utiliser une fonction sinusoïdale pour l'animation
                const opacity = originalOpacity * (0.7 + 0.3 * Math.sin(speed * time + phase));
                star.material.opacity = opacity;
                
                // Faire pulser les étoiles (changer leur taille)
                if (star.userData.scaleSpeed && star.userData.originalScale) {
                    const scaleFactor = star.userData.originalScale * (0.8 + 0.4 * Math.sin(star.userData.scaleSpeed * time + phase));
                    star.scale.set(scaleFactor, scaleFactor, scaleFactor);
                }
                
                star.material.needsUpdate = true;
            }
        });
    }
    
    // Animation de la nébuleuse
    if (nebulaActive && nebulaEffect) {
        // Rotation lente de la nébuleuse
        nebulaEffect.rotation.z += 0.0001 * simulationSpeed;
    }
    
    // Animation de la pluie de météores
    if (meteorShowerActive && meteorShower) {
        const time = Date.now();
        
        // Créer de nouveaux météores périodiquement
        if (time > meteorShower.nextMeteorTime && meteorShower.meteors.length < meteorShower.maxMeteors) {
            meteorShower.createMeteor();
            // Définir le prochain moment pour créer un météore (entre 100 et 500 ms)
            meteorShower.nextMeteorTime = time + Math.random() * 400 + 100;
        }
        
        // Animer les météores existants
        for (let i = meteorShower.meteors.length - 1; i >= 0; i--) {
            const meteor = meteorShower.meteors[i];
            
            // Déplacer le météore selon sa vélocité
            meteor.position.add(meteor.userData.velocity);
            
            // Augmenter l'âge du météore
            meteor.userData.age++;
            
            // Supprimer le météore s'il est trop vieux ou trop bas
            if (meteor.userData.age > meteor.userData.lifespan || meteor.position.y < -20) {
                scene.remove(meteor);
                if (meteor.geometry) meteor.geometry.dispose();
                if (meteor.material) meteor.material.dispose();
                meteorShower.meteors.splice(i, 1);
            }
        }
    }
    
    // Animation de la ceinture d'astéroïdes
    if (asteroidBeltActive && asteroidBelt) {
        // Animer chaque astéroïde
        asteroidBelt.children.forEach(asteroid => {
            // Rotation sur soi-même
            asteroid.rotation.x += asteroid.userData.rotationSpeed * simulationSpeed;
            asteroid.rotation.y += asteroid.userData.rotationSpeed * simulationSpeed;
            
            // Orbite
            asteroid.userData.orbitAngle += asteroid.userData.orbitSpeed * simulationSpeed;
            asteroid.position.x = Math.cos(asteroid.userData.orbitAngle) * asteroid.userData.orbitRadius;
            asteroid.position.z = Math.sin(asteroid.userData.orbitAngle) * asteroid.userData.orbitRadius;
        });
    }
    
    // Animation de la comète
    if (cometActive && comet) {
        // Mettre à jour l'angle d'orbite
        comet.userData.orbitAngle += comet.userData.orbitSpeed * simulationSpeed;
        
        // Calculer la nouvelle position
        const radius = comet.userData.orbitRadius;
        const angle = comet.userData.orbitAngle;
        const tilt = comet.userData.orbitTilt;
        
        // Orbite elliptique
        comet.position.x = radius * Math.cos(angle);
        comet.position.z = radius * Math.sin(angle);
        comet.position.y = radius * 0.3 * Math.sin(angle) * Math.sin(tilt);
        
        // Orienter la comète dans la direction du mouvement
        comet.lookAt(0, 0, 0);
    }
    
    // Animation de la station spatiale
    if (spaceStationActive && spaceStation) {
        // Si la cible est définie et existe
        const targetKey = spaceStation.userData.target;
        if (planets[targetKey] && planets[targetKey].mesh) {
            const targetPlanet = planets[targetKey].mesh;
            
            // Mettre à jour l'angle d'orbite
            spaceStation.userData.orbitAngle += spaceStation.userData.orbitSpeed * simulationSpeed;
            const angle = spaceStation.userData.orbitAngle;
            const radius = spaceStation.userData.orbitRadius;
            
            // Calculer la nouvelle position relative à la planète cible
            const orbitX = Math.cos(angle) * radius;
            const orbitZ = Math.sin(angle) * radius;
            
            spaceStation.position.x = targetPlanet.position.x + orbitX;
            spaceStation.position.z = targetPlanet.position.z + orbitZ;
            spaceStation.position.y = targetPlanet.position.y + 0.5 * Math.sin(angle);
            
            // Orienter la station vers la planète
            spaceStation.lookAt(targetPlanet.position);
        }
    }
    
    // Mise à jour de la fusée StarShip
    if (starshipActive) {
        updateStarship();
    }
    
    // Rendu de la scène
    renderer.render(scene, camera);
}

// Fonction pour se focaliser sur une planète
function focusOnPlanet(planetKey) {
    const planet = planets[planetKey];
    if (!planet) return;
    updatePlanetInfo(planetKey);
    
    const targetPosition = new THREE.Vector3().copy(planet.mesh.position);
    const distance = planetKey === 'soleil' ? 25 : 15; // Distance ajustée
    const offset = new THREE.Vector3(distance, distance / 2, distance);
    
    const startPosition = camera.position.clone();
    const startTarget = controls.target.clone();
    const targetCamera = new THREE.Vector3(
        targetPosition.x + offset.x,
        targetPosition.y + offset.y,
        targetPosition.z + offset.z
    );
    
    const startTime = Date.now();
    const duration = 1000;
    
    function animateCamera() {
        const now = Date.now();
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Interpolation plus douce
        camera.position.lerpVectors(startPosition, targetCamera, progress);
        controls.target.lerpVectors(startTarget, targetPosition, progress);
        
        // Permettre une vue complète de la planète
        if (progress === 1) {
            controls.minPolarAngle = 0;
            controls.maxPolarAngle = Math.PI;
        }
        
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
    const targetPosition = new THREE.Vector3(0, 40, 100); // Position plus élevée
    const startTarget = controls.target.clone();
    const targetTarget = new THREE.Vector3(0, 0, 0);
    const startTime = Date.now();
    const duration = 1000;

    function animateReset() {
        const now = Date.now();
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Interpolation plus douce
        camera.position.lerpVectors(startPosition, targetPosition, progress);
        controls.target.lerpVectors(startTarget, targetTarget, progress);
        
        // Réinitialiser les angles de la caméra
        if (progress === 1) {
            controls.minPolarAngle = 0;
            controls.maxPolarAngle = Math.PI;
        }
        
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

// Fonction pour recharger les textures
function reloadTextures() {
    console.log("Application des textures procédurales aux planètes...");
    
    // Afficher le message de chargement pendant le processus
    const loadingMessage = document.getElementById('loading-message');
    if (loadingMessage) {
        loadingMessage.style.display = 'block';
    }
    
    // Appliquer les textures du cache à chaque planète
    for (const [key, planet] of Object.entries(planets)) {
        const texturePath = planet.data.texture;
        
        // Vérifier si la texture est dans le cache
        if (textureCache[texturePath]) {
            console.log(`Application de la texture procédurale en cache pour ${key}`);
            const cachedCanvas = textureCache[texturePath];
            
            // Créer une texture à partir du canvas
            const texture = new THREE.CanvasTexture(cachedCanvas);
            texture.needsUpdate = true;
            
            planet.mesh.material.map = texture;
            planet.mesh.material.needsUpdate = true;
        } else {
            console.log(`Aucune texture en cache pour ${key}, création d'une nouvelle texture procédurale`);
            
            // Créer une texture procédurale
            const fallbackColor = window.fallbackColors[key] || "#ffffff";
            const fallbackCanvas = window.createFallbackTexture(fallbackColor, 512);
            
            // Créer une texture à partir du canvas
            const texture = new THREE.CanvasTexture(fallbackCanvas);
            texture.needsUpdate = true;
            
            planet.mesh.material.map = texture;
            planet.mesh.material.needsUpdate = true;
            
            // Stocker dans le cache pour les utilisations futures
            textureCache[texturePath] = fallbackCanvas;
        }
    }
    
    // Appliquer la texture de lueur du soleil si elle existe
    if (planets.soleil && planets.soleil.mesh) {
        const sunMesh = planets.soleil.mesh;
        const glowTexturePath = 'glow.png';
        
        // Pour chaque enfant du soleil, vérifier s'il s'agit d'un sprite (effet de lueur)
        for (let i = 0; i < sunMesh.children.length; i++) {
            const child = sunMesh.children[i];
            if (child instanceof THREE.Sprite) {
                // Appliquer la texture de lueur du cache
                if (textureCache[glowTexturePath]) {
                    console.log("Application de la texture de lueur en cache pour le Soleil");
                    const cachedCanvas = textureCache[glowTexturePath];
                    
                    // Créer une texture à partir du canvas
                    const glowTexture = new THREE.CanvasTexture(cachedCanvas);
                    glowTexture.needsUpdate = true;
                    
                    child.material.map = glowTexture;
                    child.material.needsUpdate = true;
                }
                break;
            }
        }
    }
    
    // Masquer le message de chargement une fois terminé
    if (loadingMessage) {
        loadingMessage.style.display = 'none';
    }
    
    console.log("Toutes les textures ont été appliquées avec succès !");
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
    
    // Bouton pour recharger les textures
    const reloadTexturesButton = document.getElementById('reload-textures');
    if (reloadTexturesButton) {
        reloadTexturesButton.addEventListener('click', reloadTextures);
    }
    
    // Bouton pour activer/désactiver la fusée StarShip
    const toggleStarshipButton = document.getElementById('toggle-starship');
    if (toggleStarshipButton) {
        toggleStarshipButton.addEventListener('click', function() {
            toggleStarship();
            this.classList.toggle('active');
            // Mettre à jour le texte du bouton
            this.innerHTML = starshipActive ? 
                '<i class="fas fa-power-off"></i> Désactiver StarShip' : 
                '<i class="fas fa-power-off"></i> Activer StarShip';
        });
    }
    
    // Bouton pour suivre la fusée avec la caméra
    const followStarshipButton = document.getElementById('follow-starship');
    if (followStarshipButton) {
        followStarshipButton.addEventListener('click', function() {
            if (starship && starshipActive) {
                followStarship();
            } else {
                alert('Activez d\'abord la fusée StarShip !');
            }
        });
    }
    
    // Sélecteur de planète cible pour la fusée
    const starshipTargetSelect = document.getElementById('starship-target');
    if (starshipTargetSelect) {
        starshipTargetSelect.addEventListener('change', function() {
            setStarshipTarget(this.value);
        });
    }
    
    // Contrôle de la vitesse de la fusée
    const starshipSpeedSlider = document.getElementById('starship-speed');
    const starshipSpeedValue = document.getElementById('starship-speed-value');
    
    if (starshipSpeedSlider && starshipSpeedValue) {
        starshipSpeedSlider.addEventListener('input', function() {
            starshipSpeed = parseFloat(this.value);
            starshipSpeedValue.textContent = starshipSpeed.toFixed(1);
        });
    }
    
    // Liste des planètes
    const planetItems = document.querySelectorAll('#planets-section li');
    planetItems.forEach(item => {
        item.addEventListener('click', function() {
            const planetKey = this.getAttribute('data-planet');
            if (planetKey) {
                // Retirer la sélection de toutes les planètes
                planetItems.forEach(planet => planet.classList.remove('selected'));
                // Ajouter la classe selected à la planète cliquée
                this.classList.add('selected');
                
                focusOnPlanet(planetKey);
                showDetailPanel(planetKey);
            }
        });
    });
    
    // Contrôles des effets spéciaux
    // Animations d'arrière-plan
    const toggleStarsAnimationButton = document.getElementById('toggle-stars-animation');
    if (toggleStarsAnimationButton) {
        toggleStarsAnimationButton.addEventListener('click', function() {
            toggleStarsAnimation();
            // Ne pas modifier la classe ici, la fonction toggleStarsAnimation s'en charge
        });
    }
    
    const toggleNebulaEffectButton = document.getElementById('toggle-nebula-effect');
    if (toggleNebulaEffectButton) {
        toggleNebulaEffectButton.addEventListener('click', function() {
            toggleNebulaEffect();
            // Ne pas modifier la classe ici, la fonction toggleNebulaEffect s'en charge
        });
    }
    
    const toggleMeteorShowerButton = document.getElementById('toggle-meteor-shower');
    if (toggleMeteorShowerButton) {
        toggleMeteorShowerButton.addEventListener('click', function() {
            toggleMeteorShower();
            // Ne pas modifier la classe ici, la fonction toggleMeteorShower s'en charge
        });
    }
    
    // Objets spéciaux
    const addAsteroidBeltButton = document.getElementById('add-asteroid-belt');
    if (addAsteroidBeltButton) {
        addAsteroidBeltButton.addEventListener('click', function() {
            toggleAsteroidBelt();
            // Ne pas modifier la classe ici, la fonction toggleAsteroidBelt s'en charge
        });
    }
    
    const addCometButton = document.getElementById('add-comet');
    if (addCometButton) {
        addCometButton.addEventListener('click', function() {
            toggleComet();
            // Ne pas modifier la classe ici, la fonction toggleComet s'en charge
        });
    }
    
    const addSpaceStationButton = document.getElementById('add-space-station');
    if (addSpaceStationButton) {
        addSpaceStationButton.addEventListener('click', function() {
            toggleSpaceStation();
            // Ne pas modifier la classe ici, la fonction toggleSpaceStation s'en charge
        });
    }
}

// Fonction pour initialiser l'interface utilisateur
function setupUI() {
    // Gestion des onglets
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Retirer la classe active de tous les onglets
            tabs.forEach(t => t.classList.remove('active'));
            // Ajouter la classe active à l'onglet cliqué
            tab.classList.add('active');
            
            // Afficher le contenu correspondant
            const contentId = tab.getAttribute('data-tab') + '-content';
            document.querySelectorAll('.tab-content').forEach(content => {
                content.style.display = 'none';
            });
            const selectedContent = document.getElementById(contentId);
            if (selectedContent) {
                selectedContent.style.display = 'block';
            }
        });
    });

    // Gestion de la liste des planètes
    const planetList = document.querySelectorAll('#planets-section li');
    planetList.forEach(item => {
        item.addEventListener('click', () => {
            const planetKey = item.getAttribute('data-planet');
            if (planetKey && planets[planetKey]) {
                // Retirer la sélection de toutes les planètes
                planetList.forEach(p => p.classList.remove('selected'));
                // Ajouter la classe selected à la planète cliquée
                item.classList.add('selected');
                
                // Afficher le panneau détaillé
                showDetailPanel(planetKey);
                // Centrer la vue sur la planète
                focusOnPlanet(planetKey);
            }
        });
    });

    // Gestion du panneau détaillé
    const closeButton = document.getElementById('close-panel');
    if (closeButton) {
        closeButton.addEventListener('click', () => {
            const detailPanel = document.getElementById('planet-detail-panel');
            if (detailPanel) {
                detailPanel.style.display = 'none';
                detailPanelActive = false;
                resetCamera(); // Réinitialiser la caméra à la fermeture
            }
        });
    }

    const autoRotateCheckbox = document.getElementById('detail-auto-rotate');
    if (autoRotateCheckbox) {
        autoRotateCheckbox.addEventListener('change', function() {
            detailAutoRotate = this.checked;
        });
    }

    const focusButton = document.getElementById('detail-focus-planet');
    if (focusButton) {
        focusButton.addEventListener('click', () => {
            if (selectedPlanet) {
                focusOnPlanet(selectedPlanet);
            }
        });
    }

    // Gestion des contrôles de simulation
    const speedSlider = document.getElementById('speed-slider');
    if (speedSlider) {
        speedSlider.addEventListener('input', () => {
            simulationSpeed = parseFloat(speedSlider.value) / 50;
        });
    }
    
    // Gestion des boutons de contrôle
    const pauseBtn = document.getElementById('pause-btn');
    if (pauseBtn) {
        pauseBtn.addEventListener('click', () => {
            simulationSpeed = simulationSpeed === 0 ? 1 : 0;
            pauseBtn.innerHTML = simulationSpeed === 0 ? 
                '<i class="fas fa-play"></i> Reprendre' : 
                '<i class="fas fa-pause"></i> Pause';
        });
    }
    
    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            resetSimulation();
        });
    }
    
    // Gestion des contrôles de caméra
    const resetCameraBtn = document.getElementById('reset-camera-btn');
    if (resetCameraBtn) {
        resetCameraBtn.addEventListener('click', resetCamera);
    }
    
    // Gestion des cases à cocher
    const showOrbitsCheckbox = document.getElementById('show-orbits');
    if (showOrbitsCheckbox) {
        showOrbitsCheckbox.addEventListener('change', () => {
            toggleOrbits();
        });
    }
    
    const showTexturesCheckbox = document.getElementById('show-textures');
    if (showTexturesCheckbox) {
        showTexturesCheckbox.addEventListener('change', () => {
            reloadTextures();
        });
    }
    
    // Gestion des effets spéciaux
    const effectButtons = document.querySelectorAll('.effect-btn');
    effectButtons.forEach(button => {
        button.addEventListener('click', () => {
            const effect = button.getAttribute('data-effect');
            switch(effect) {
                case 'stars':
                    toggleStarsAnimation();
                    break;
                case 'nebula':
                    toggleNebulaEffect();
                    break;
                case 'meteor':
                    toggleMeteorShower();
                    break;
                case 'asteroids':
                    toggleAsteroidBelt();
                    break;
                case 'comet':
                    toggleComet();
                    break;
                case 'station':
                    toggleSpaceStation();
                    break;
            }
            button.classList.toggle('active');
        });
    });

    // Gestion du panneau latéral
    const controlPanel = document.getElementById('control-panel');
    const panelToggle = document.getElementById('panel-toggle');
    
    if (panelToggle && controlPanel) {
        panelToggle.addEventListener('click', function() {
            controlPanel.classList.toggle('collapsed');
            
            // Masquer tous les onglets quand le menu est fermé
            if (controlPanel.classList.contains('collapsed')) {
                document.querySelectorAll('.tab-content').forEach(content => {
                    content.style.display = 'none';
                });
                this.innerHTML = '<i class="fas fa-cogs fa-2x"></i><span class="toggle-hint">MENU</span>';
                this.setAttribute('title', 'Ouvrir le panneau de contrôle');
            } else {
                // Afficher l'onglet actif quand le menu est ouvert
                const activeTab = document.querySelector('.tab.active');
                if (activeTab) {
                    const contentId = activeTab.getAttribute('data-tab') + '-content';
                    const selectedContent = document.getElementById(contentId);
                    if (selectedContent) {
                        selectedContent.style.display = 'block';
                    }
                }
                this.innerHTML = '<i class="fas fa-times fa-2x"></i><span class="toggle-hint">FERMER</span>';
                this.setAttribute('title', 'Fermer le panneau de contrôle');
            }
        });
    }
}

// Fonction pour initialiser le panneau détaillé
function initDetailPanel() {
    // Création de la scène pour la prévisualisation
    detailPanelScene = new THREE.Scene();
    detailPanelScene.background = new THREE.Color(0x000000);

    // Caméra
    detailPanelCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
    detailPanelCamera.position.z = 5;

    // Renderer : supprimer l'ancien canvas si besoin
    const container = document.getElementById('planet-preview-container');
    if (!container) {
        console.error("Container pour la prévisualisation non trouvé");
        return;
    }
    // Supprimer les anciens canvas
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }
    // Créer le renderer
    detailPanelRenderer = new THREE.WebGLRenderer({ antialias: true });
    detailPanelRenderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(detailPanelRenderer.domElement);

    // Lumière ambiante
    const ambientLight = new THREE.AmbientLight(0xffffff, 2.0);
    detailPanelScene.add(ambientLight);
    // Lumière directionnelle
    const directionalLight = new THREE.DirectionalLight(0xffffff, 2.0);
    directionalLight.position.set(5, 3, 5);
    detailPanelScene.add(directionalLight);
    // Loguer la position et l'intensité des lumières
    console.log('Lumière ambiante:', ambientLight);
    console.log('Lumière directionnelle:', directionalLight);
}

// Fonction pour animer la prévisualisation
function animateDetailPanel() {
    if (!detailPanelScene || !detailPanelCamera || !detailPanelRenderer) return;
    if (detailPanelAnimationId) {
        cancelAnimationFrame(detailPanelAnimationId);
    }
    function loop() {
        if (detailPlanetMesh && detailAutoRotate) {
            detailPlanetMesh.rotation.y += 0.01;
        }
        detailPanelRenderer.render(detailPanelScene, detailPanelCamera);
        detailPanelAnimationId = requestAnimationFrame(loop);
    }
    detailPanelAnimationId = requestAnimationFrame(loop);
}

// Fonction pour formater les distances
function formatDistance(distance) {
    if (distance < 1) {
        return `${(distance * 1000).toFixed(0)} m`;
    } else if (distance < 1000) {
        return `${distance.toFixed(1)} km`;
    } else {
        return `${(distance / 1000).toFixed(1)} Mm`;
    }
}

// Fonction pour formater le temps
function formatTime(seconds) {
    if (seconds < 60) {
        return `${seconds.toFixed(1)} secondes`;
    } else if (seconds < 3600) {
        return `${(seconds / 60).toFixed(1)} minutes`;
    } else if (seconds < 86400) {
        return `${(seconds / 3600).toFixed(1)} heures`;
    } else if (seconds < 31536000) {
        return `${(seconds / 86400).toFixed(1)} jours`;
    } else {
        return `${(seconds / 31536000).toFixed(1)} années`;
    }
}

// Fonction pour afficher le panneau détaillé
function showDetailPanel(planetKey) {
    const planet = planets[planetKey];
    if (!planet) return;
    selectedPlanet = planetKey;

    // Mettre à jour les informations de la planète
    const detailPanel = document.getElementById('planet-detail-panel');
    if (!detailPanel) return;

    // Mettre à jour les informations
    const nameElement = document.getElementById('detail-planet-name');
    const typeElement = document.getElementById('detail-planet-type');
    const diameterElement = document.getElementById('detail-planet-diameter');
    const distanceElement = document.getElementById('detail-planet-distance');
    const orbitalPeriodElement = document.getElementById('detail-planet-orbital-period');
    const temperatureElement = document.getElementById('detail-planet-temperature');

    if (nameElement) nameElement.textContent = planet.data.nom;
    if (typeElement) typeElement.textContent = getPlanetType(planetKey);
    if (diameterElement) diameterElement.textContent = formatDistance(planet.data.rayon * 2);
    if (distanceElement) distanceElement.textContent = formatDistance(planet.data.distance);
    if (orbitalPeriodElement) orbitalPeriodElement.textContent = formatTime(2 * Math.PI / planet.data.vitesseOrbite);
    if (temperatureElement) temperatureElement.textContent = getPlanetTemperature(planet.data.nom);

    // Afficher le panneau
    detailPanel.style.display = 'block';
    detailPanelActive = true;

    // Créer le renderer uniquement si nécessaire et si le container est visible
    const container = document.getElementById('planet-preview-container');
    if (!container) return;
    if (!detailPanelRenderer) {
        // Supprimer les anciens canvas
        while (container.firstChild) container.removeChild(container.firstChild);
        detailPanelRenderer = new THREE.WebGLRenderer({ antialias: true });
        detailPanelRenderer.setClearColor(0x181818, 1);
        container.appendChild(detailPanelRenderer.domElement);
    }
    // Forcer la taille du renderer
    detailPanelRenderer.setSize(container.clientWidth, container.clientHeight, false);

    // Initialiser la scène/caméra si besoin
    if (!detailPanelScene) {
        detailPanelScene = new THREE.Scene();
        detailPanelScene.background = new THREE.Color(0x000000);
    }
    if (!detailPanelCamera) {
        detailPanelCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
        detailPanelCamera.position.z = 5;
    }
    detailPanelCamera.lookAt(0, 0, 0);

    // Nettoyer la scène (sauf lumières)
    const toRemove = [];
    detailPanelScene.children.forEach(obj => {
        if (!(obj instanceof THREE.Light)) toRemove.push(obj);
    });
    toRemove.forEach(obj => {
        detailPanelScene.remove(obj);
        if (obj.geometry) obj.geometry.dispose && obj.geometry.dispose();
        if (obj.material) {
            if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose && m.dispose());
            else if (obj.material.dispose) obj.material.dispose();
        }
    });
    detailPlanetMesh = null;
    if (detailPanelRings) {
        if (detailPanelRings.geometry) detailPanelRings.geometry.dispose();
        if (detailPanelRings.material) detailPanelRings.material.dispose();
        detailPanelRings = null;
    }

    // Créer la planète avec la texture procédurale ou fallback
    let previewTexture = null;
    if (textureCache[planet.data.texture]) {
        previewTexture = new THREE.CanvasTexture(textureCache[planet.data.texture]);
    } else {
        // Générer un canvas de fallback si la texture n'existe pas
        const fallbackColor = window.fallbackColors[planetKey] || '#ffffff';
        const fallbackCanvas = window.createFallbackTexture(fallbackColor, 320);
        previewTexture = new THREE.CanvasTexture(fallbackCanvas);
    }
    const geometry = new THREE.SphereGeometry(2, 32, 32);
    const material = new THREE.MeshPhongMaterial({
        map: previewTexture,
        shininess: 25
    });
    detailPlanetMesh = new THREE.Mesh(geometry, material);
    detailPanelScene.add(detailPlanetMesh);

    // Lumières si absentes
    if (!detailPanelScene.children.some(obj => obj instanceof THREE.AmbientLight)) {
        const ambientLight = new THREE.AmbientLight(0xffffff, 2.0);
        detailPanelScene.add(ambientLight);
    }
    if (!detailPanelScene.children.some(obj => obj instanceof THREE.DirectionalLight)) {
        const directionalLight = new THREE.DirectionalLight(0xffffff, 2.0);
        directionalLight.position.set(5, 3, 5);
        detailPanelScene.add(directionalLight);
    }

    // Lancer la boucle d'animation
    animateDetailPanel();

    // Fallback : si le renderer ne fonctionne pas, afficher une image 2D
    setTimeout(() => {
        const gl = detailPanelRenderer.getContext();
        const pixels = new Uint8Array(4);
        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        if (pixels[0] === 0 && pixels[1] === 0 && pixels[2] === 0 && pixels[3] === 0) {
            // Rien n'est dessiné, fallback 2D
            while (container.firstChild) container.removeChild(container.firstChild);
            const fallbackCanvas = window.createFallbackTexture(window.fallbackColors[planetKey] || "#ffffff", container.clientWidth);
            fallbackCanvas.style.width = '100%';
            fallbackCanvas.style.height = '100%';
            container.appendChild(fallbackCanvas);
        }
    }, 500);
}

// Fonction pour obtenir le type de planète
function getPlanetType(planetKey) {
    switch(planetKey) {
        case 'soleil':
            return "Étoile";
        case 'mercure':
        case 'venus':
        case 'terre':
        case 'mars':
            return "Planète tellurique";
        case 'jupiter':
        case 'saturne':
            return "Géante gazeuse";
        case 'uranus':
        case 'neptune':
            return "Géante de glace";
        default:
            return "Planète";
    }
}

// Fonction pour obtenir la température d'une planète
function getPlanetTemperature(planetName) {
    const temperatures = {
        "Soleil": "5500°C",
        "Mercure": "427°C",
        "Vénus": "462°C",
        "Terre": "15°C",
        "Mars": "-63°C",
        "Jupiter": "-110°C",
        "Saturne": "-140°C",
        "Uranus": "-195°C",
        "Neptune": "-200°C"
    };
    return temperatures[planetName] || "N/A";
}

// Initialisation
function init() {
    // Initialisation de l'interface
    setupUI();

    // Création de la scène
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    // Configuration de la caméra
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 50, 100);
    camera.lookAt(0, 0, 0);

    // Configuration du renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.getElementById('scene-container').appendChild(renderer.domElement);

    // Configuration des contrôles
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 10;
    controls.maxDistance = 500;
    // Supprimer la limitation de l'angle vertical
    // controls.maxPolarAngle = Math.PI / 2;
    controls.enableZoom = true;
    controls.autoRotate = false;
    controls.autoRotateSpeed = 0.5;
    controls.enablePan = true;
    controls.panSpeed = 0.5;
    controls.rotateSpeed = 0.5;

    // Création des planètes
    createPlanets();

    // Gestion du redimensionnement
    window.addEventListener('resize', onWindowResize, false);

    // Préchargement des textures
    preloadTextures().then(() => {
        // Masquer le message de chargement une fois tout chargé
        hideLoadingMessage();
        // Démarrer l'animation
        animate();
    }).catch(error => {
        console.error("Erreur lors de l'initialisation:", error);
        hideLoadingMessage();
    });
}

// Démarrage de l'application
window.addEventListener('DOMContentLoaded', function() {
    // Initialiser la simulation
    init();
    
    // Configurer le panneau latéral pour qu'il démarre en mode réduit si l'écran est petit
    const screenWidth = window.innerWidth;
    const controlPanel = document.getElementById('control-panel');
    const panelToggle = document.getElementById('panel-toggle');
    const menuHelp = document.getElementById('menu-help');
    
    // Sur les écrans plus petits, réduire automatiquement le panneau au démarrage
    if (screenWidth < 1200 && controlPanel && panelToggle) {
        controlPanel.classList.add('collapsed');
        panelToggle.innerHTML = '<i class="fas fa-cogs fa-2x"></i><span class="toggle-hint">MENU</span>';
        panelToggle.setAttribute('title', 'Ouvrir le panneau de contrôle');
    } else if (controlPanel && panelToggle) {
        // Si le panneau est ouvert au démarrage
        panelToggle.innerHTML = '<i class="fas fa-times fa-2x"></i><span class="toggle-hint">FERMER</span>';
        panelToggle.setAttribute('title', 'Fermer le panneau de contrôle');
    }
    
    // Positionner correctement l'aide du menu
    if (menuHelp) {
        // Positionner l'aide par rapport au bouton
        menuHelp.style.left = '80px'; // Juste à côté du bouton
        
        // Faire disparaître l'aide après 7 secondes
        setTimeout(function() {
            menuHelp.style.animation = 'fadeOut 1s ease-in-out forwards';
        }, 7000);
    }
    
    // Bouton pour réduire/agrandir le panneau
    if (panelToggle) {
        panelToggle.addEventListener('click', function() {
            controlPanel.classList.toggle('collapsed');
            
            if (controlPanel.classList.contains('collapsed')) {
                this.innerHTML = '<i class="fas fa-cogs fa-2x"></i><span class="toggle-hint">MENU</span>';
                this.setAttribute('title', 'Ouvrir le panneau de contrôle');
            } else {
                this.innerHTML = '<i class="fas fa-times fa-2x"></i><span class="toggle-hint">FERMER</span>';
                this.setAttribute('title', 'Fermer le panneau de contrôle');
            }
        });
    }
});

function toggleStarsAnimation() {
    starsAnimationActive = !starsAnimationActive;
    if (starsAnimationActive && !starsAnimation) {
        starsAnimation = [];
        const params = effectParams.stars;
        
        for (let i = 0; i < params.count; i++) {
            const size = Math.random() * (params.maxSize - params.minSize) + params.minSize;
            const geometry = new THREE.SphereGeometry(size, 8, 8);
            const color = params.colors[Math.floor(Math.random() * params.colors.length)];
            const material = new THREE.MeshBasicMaterial({ 
                color: color,
                transparent: true, 
                opacity: Math.random() * (params.maxOpacity - params.minOpacity) + params.minOpacity 
            });
            const star = new THREE.Mesh(geometry, material);
            
            // Position aléatoire dans un volume plus grand
            star.position.set(
                (Math.random() - 0.5) * 600,
                (Math.random() - 0.5) * 300 + 50,
                (Math.random() - 0.5) * 600
            );
            
            star.userData = {
                phase: Math.random() * Math.PI * 2,
                speed: Math.random() * (params.maxSpeed - params.minSpeed) + params.minSpeed,
                originalOpacity: material.opacity,
                scaleSpeed: Math.random() * 2 + 0.5,
                originalScale: star.scale.x,
                color: color
            };
            
            scene.add(star);
            starsAnimation.push(star);
        }
    } else if (!starsAnimationActive && starsAnimation) {
        starsAnimation.forEach(star => {
            scene.remove(star);
            if (star.geometry) star.geometry.dispose();
            if (star.material) star.material.dispose();
        });
        starsAnimation = null;
    }
}

function toggleNebulaEffect() {
    nebulaActive = !nebulaActive;
    if (nebulaActive && !nebulaEffect) {
        const params = effectParams.nebula;
        const nebulaCanvas = createNebulaTexture(params.size, params.colors);
        const nebulaTexture = new THREE.CanvasTexture(nebulaCanvas);
        const material = new THREE.SpriteMaterial({ 
            map: nebulaTexture, 
            color: 0xffffff, 
            transparent: true, 
            opacity: 0.5,
            blending: THREE.AdditiveBlending
        });
        nebulaEffect = new THREE.Sprite(material);
        nebulaEffect.scale.set(300, 150, 1);
        nebulaEffect.position.set(0, 80, -150);
        scene.add(nebulaEffect);
    } else if (!nebulaActive && nebulaEffect) {
        scene.remove(nebulaEffect);
        if (nebulaEffect.material.map) nebulaEffect.material.map.dispose();
        nebulaEffect.material.dispose();
        nebulaEffect = null;
    }
}

function toggleMeteorShower() {
    meteorShowerActive = !meteorShowerActive;
    if (meteorShowerActive && !meteorShower) {
        const params = effectParams.meteors;
        meteorShower = {
            meteors: [],
            nextMeteorTime: Date.now(),
            maxMeteors: params.maxCount,
            createMeteor: function() {
                const size = Math.random() * (params.maxSize - params.minSize) + params.minSize;
                const geometry = new THREE.SphereGeometry(size, 8, 8);
                const color = params.colors[Math.floor(Math.random() * params.colors.length)];
                const material = new THREE.MeshBasicMaterial({ 
                    color: color,
                    transparent: true,
                    opacity: 0.8
                });
                const meteor = new THREE.Mesh(geometry, material);
                
                // Position de départ plus aléatoire
                meteor.position.set(
                    (Math.random() - 0.5) * 300,
                    150 + Math.random() * 50,
                    (Math.random() - 0.5) * 300
                );
                
                const speed = Math.random() * (params.maxSpeed - params.minSpeed) + params.minSpeed;
                meteor.userData = {
                    velocity: new THREE.Vector3(
                        Math.random() * speed - speed/2,
                        -speed,
                        Math.random() * speed - speed/2
                    ),
                    age: 0,
                    lifespan: Math.floor(Math.random() * 60 + 40),
                    color: color
                };
                
                scene.add(meteor);
                meteorShower.meteors.push(meteor);
            }
        };
    } else if (!meteorShowerActive && meteorShower) {
        meteorShower.meteors.forEach(m => {
            scene.remove(m);
            if (m.geometry) m.geometry.dispose();
            if (m.material) m.material.dispose();
        });
        meteorShower = null;
    }
}

function toggleAsteroidBelt() {
    asteroidBeltActive = !asteroidBeltActive;
    if (asteroidBeltActive && !asteroidBelt) {
        const params = effectParams.asteroids;
        asteroidBelt = new THREE.Group();
        
        for (let i = 0; i < params.count; i++) {
            const size = Math.random() * (params.maxSize - params.minSize) + params.minSize;
            const geometry = new THREE.SphereGeometry(size, 8, 8);
            const color = params.colors[Math.floor(Math.random() * params.colors.length)];
            const material = new THREE.MeshLambertMaterial({ 
                color: color,
                flatShading: true
            });
            const asteroid = new THREE.Mesh(geometry, material);
            
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * (params.maxOrbitRadius - params.minOrbitRadius) + params.minOrbitRadius;
            const height = Math.random() * 4 - 2;
            
            asteroid.position.set(
                Math.cos(angle) * radius,
                height,
                Math.sin(angle) * radius
            );
            
            asteroid.userData = {
                rotationSpeed: Math.random() * (params.maxRotationSpeed - params.minRotationSpeed) + params.minRotationSpeed,
                orbitSpeed: Math.random() * (params.maxOrbitSpeed - params.minOrbitSpeed) + params.minOrbitSpeed,
                orbitAngle: angle,
                orbitRadius: radius,
                height: height
            };
            
            asteroidBelt.add(asteroid);
        }
        scene.add(asteroidBelt);
    } else if (!asteroidBeltActive && asteroidBelt) {
        asteroidBelt.children.forEach(asteroid => {
            if (asteroid.geometry) asteroid.geometry.dispose();
            if (asteroid.material) asteroid.material.dispose();
        });
        scene.remove(asteroidBelt);
        asteroidBelt = null;
    }
}

function toggleComet() {
    cometActive = !cometActive;
    if (cometActive && !comet) {
        const params = effectParams.comet;
        
        // Créer un groupe pour la comète et sa queue
        const cometGroup = new THREE.Group();
        
        // Corps de la comète
        const geometry = new THREE.SphereGeometry(params.size, 16, 16);
        const material = new THREE.MeshBasicMaterial({ 
            color: params.color,
            transparent: true,
            opacity: 0.9
        });
        const cometBody = new THREE.Mesh(geometry, material);
        cometGroup.add(cometBody);
        
        // Queue de la comète
        const tailGeometry = new THREE.ConeGeometry(params.tailWidth, params.tailLength, 8);
        const tailMaterial = new THREE.MeshBasicMaterial({
            color: params.tailColor,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide
        });
        const tail = new THREE.Mesh(tailGeometry, tailMaterial);
        tail.rotation.x = Math.PI / 2;
        tail.position.z = -params.tailLength / 2;
        cometGroup.add(tail);
        
        cometGroup.userData = {
            orbitAngle: Math.random() * Math.PI * 2,
            orbitRadius: params.orbitRadius,
            orbitSpeed: params.orbitSpeed,
            orbitTilt: params.orbitTilt
        };
        
        scene.add(cometGroup);
        comet = cometGroup;
    } else if (!cometActive && comet) {
        comet.children.forEach(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
        });
        scene.remove(comet);
        comet = null;
    }
}

function toggleSpaceStation() {
    spaceStationActive = !spaceStationActive;
    if (spaceStationActive && !spaceStation) {
        const params = effectParams.spaceStation;
        spaceStation = createSpaceStationMesh(params);
        spaceStation.userData = {
            orbitAngle: Math.random() * Math.PI * 2,
            orbitRadius: params.orbitRadius,
            orbitSpeed: params.orbitSpeed,
            rotationSpeed: params.rotationSpeed,
            target: 'terre'
        };
        scene.add(spaceStation);
    } else if (!spaceStationActive && spaceStation) {
        spaceStation.children.forEach(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
        });
        scene.remove(spaceStation);
        spaceStation = null;
    }
}

// Fonction améliorée pour créer la station spatiale
function createSpaceStationMesh(params) {
    const group = new THREE.Group();
    
    // Corps principal
    const bodyGeometry = new THREE.BoxGeometry(
        params.size.x,
        params.size.y,
        params.size.z
    );
    const bodyMaterial = new THREE.MeshPhongMaterial({ 
        color: params.bodyColor,
        shininess: 80
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    group.add(body);
    
    // Panneaux solaires
    const panelMaterial = new THREE.MeshPhongMaterial({ 
        color: params.panelColor,
        shininess: 100
    });
    
    for (let i = -1; i <= 1; i += 2) {
        const panel = new THREE.Mesh(
            new THREE.BoxGeometry(
                params.panelSize.x,
                params.panelSize.y,
                params.panelSize.z
            ),
            panelMaterial
        );
        panel.position.x = i * (params.size.x/2 + params.panelSize.x/2 + 0.3);
        group.add(panel);
    }
    
    // Ajouter des détails (antennes, modules)
    const antennaGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.5);
    const antennaMaterial = new THREE.MeshPhongMaterial({ color: 0x888888 });
    
    for (let i = -1; i <= 1; i += 2) {
        const antenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
        antenna.position.set(i * 0.8, 0.3, 0);
        antenna.rotation.x = Math.PI / 2;
        group.add(antenna);
    }
    
    return group;
}

// Fonction améliorée pour créer la texture de nébuleuse
function createNebulaTexture(size, colors) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    // Créer le dégradé avec les couleurs spécifiées
    const gradient = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
    colors.forEach(color => {
        gradient.addColorStop(color.stop, color.color);
    });
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    
    // Ajouter des variations de couleur aléatoires
    for (let i = 0; i < 50; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const radius = Math.random() * size/4;
        const opacity = Math.random() * 0.1;
        
        const spotGradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        spotGradient.addColorStop(0, `rgba(255, 255, 255, ${opacity})`);
        spotGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.fillStyle = spotGradient;
        ctx.fillRect(0, 0, size, size);
    }
    
    return canvas;
}

// 3. Permettre de cliquer sur une planète dans la simulation
// Ajout d'un gestionnaire de clic sur la scène 3D
window.addEventListener('click', function(event) {
    if (event.target.tagName === 'CANVAS' && !detailPanelActive) {
        // Calculer la position de la souris en coordonnées normalisées
        const rect = event.target.getBoundingClientRect();
        const mouse = {
            x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
            y: -((event.clientY - rect.top) / rect.height) * 2 + 1
        };
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(Object.values(planets).map(p => p.mesh));
        if (intersects.length > 0) {
            // Trouver la planète cliquée
            const mesh = intersects[0].object;
            const planetKey = Object.keys(planets).find(k => planets[k].mesh === mesh);
            if (planetKey) {
                // Sélectionner la planète dans le menu
                const planetItems = document.querySelectorAll('#planets-section li');
                planetItems.forEach(item => {
                    if (item.getAttribute('data-planet') === planetKey) {
                        item.classList.add('selected');
                    } else {
                        item.classList.remove('selected');
                    }
                });
                // Focus et affichage du panneau détaillé
                focusOnPlanet(planetKey);
                showDetailPanel(planetKey);
            }
        }
    }
}); 