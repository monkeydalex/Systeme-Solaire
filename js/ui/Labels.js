import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

// Labels flottants au-dessus des planètes (CSS2DRenderer en overlay).
// Cliquables : déclenche le callback de focus.
export class Labels {
    constructor(container, planets, onPlanetClick) {
        this.renderer = new CSS2DRenderer();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.domElement.style.position = 'absolute';
        this.renderer.domElement.style.top = '0';
        this.renderer.domElement.style.left = '0';
        this.renderer.domElement.style.pointerEvents = 'none';
        container.appendChild(this.renderer.domElement);

        this.objects = [];
        this.visible = true;

        for (const [key, planet] of Object.entries(planets)) {
            const div = document.createElement('div');
            div.className = 'planet-label';
            div.textContent = planet.data.nom;
            div.style.pointerEvents = 'auto';
            div.addEventListener('click', () => onPlanetClick(key));

            const labelObj = new CSS2DObject(div);
            labelObj.position.set(0, planet.data.rayon + 1.1, 0);
            planet.group.add(labelObj);
            this.objects.push(labelObj);
        }

        window.addEventListener('resize', () => {
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    setVisible(visible) {
        this.visible = visible;
        for (const obj of this.objects) {
            obj.element.style.display = visible ? '' : 'none';
        }
    }

    render(scene, camera) {
        this.renderer.render(scene, camera);
    }
}
