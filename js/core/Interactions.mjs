import * as THREE from 'three';

// Logique pure : quel corps est survolé d'après les intersections du raycaster.
export function pickHovered(intersects, bodies) {
    if (!intersects || intersects.length === 0) return null;
    const mesh = intersects[0].object;
    for (const key of Object.keys(bodies)) {
        if (bodies[key].mesh === mesh) return key;
    }
    return null;
}

// Gère le survol (raycast), le curseur, le surlignage de label, le clic→focus,
// et déclenche le callback de survol. Branché sur la scène existante.
export class Interactions {
    constructor({ camera, bodies, onFocus, onHover }) {
        this.camera = camera;
        this.bodies = bodies;
        this.onFocus = onFocus;     // (key) => void
        this.onHover = onHover;     // (key|null, clientX, clientY) => void
        this.raycaster = new THREE.Raycaster();
        this.pointer = new THREE.Vector2();
        this.hoveredKey = null;

        this._meshes = Object.values(bodies).map(b => b.mesh);
        this._downX = 0;
        this._downY = 0;
        this._onMove = this._onMove.bind(this);
        this._onClick = this._onClick.bind(this);
        this._onDown = this._onDown.bind(this);
        window.addEventListener('pointermove', this._onMove);
        window.addEventListener('pointerdown', this._onDown);
        window.addEventListener('click', this._onClick);
    }

    _onDown(event) {
        this._downX = event.clientX;
        this._downY = event.clientY;
    }

    _raycast(event) {
        this.pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
        this.raycaster.setFromCamera(this.pointer, this.camera);
        return this.raycaster.intersectObjects(this._meshes);
    }

    _onMove(event) {
        // Pointeur sur l'interface (dock, fiche…) : pas de survol à travers
        const key = event.target.tagName === 'CANVAS'
            ? pickHovered(this._raycast(event), this.bodies)
            : null;
        if (key !== this.hoveredKey) {
            this.hoveredKey = key;
            document.body.style.cursor = key ? 'pointer' : '';
        }
        this.onHover(key, event.clientX, event.clientY);
    }

    _onClick(event) {
        if (event.target.tagName !== 'CANVAS') return;
        // Fin d'une rotation de caméra (glisser) : ce n'est pas un clic de sélection
        if (Math.hypot(event.clientX - this._downX, event.clientY - this._downY) > 5) return;
        const key = pickHovered(this._raycast(event), this.bodies);
        if (key) this.onFocus(key);
    }

    // Pulsation douce du corps survolé (appelée dans la boucle de rendu)
    update() {
        const tdummy = performance.now() * 0.004;
        for (const key of Object.keys(this.bodies)) {
            const mesh = this.bodies[key].mesh;
            if (!mesh || !mesh.scale) continue;
            const base = mesh.userData._baseScale || (mesh.userData._baseScale = mesh.scale.x);
            const target = key === this.hoveredKey ? base * (1 + 0.04 + 0.02 * Math.sin(tdummy)) : base;
            mesh.scale.setScalar(THREE.MathUtils.lerp(mesh.scale.x, target, 0.2));
        }
    }

    // À appeler quand l'échelle des corps change (mode d'échelle) : les tailles
    // de repos mises en cache deviennent obsolètes.
    resetBaseScales() {
        for (const key of Object.keys(this.bodies)) {
            const mesh = this.bodies[key].mesh;
            if (mesh && mesh.userData) mesh.userData._baseScale = undefined;
        }
    }

    dispose() {
        window.removeEventListener('pointermove', this._onMove);
        window.removeEventListener('pointerdown', this._onDown);
        window.removeEventListener('click', this._onClick);
    }
}
