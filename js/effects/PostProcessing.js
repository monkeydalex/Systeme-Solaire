import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

export class PostProcessing {
    constructor(renderer, scene, camera) {
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;
        this.composer = null;
        this.bloomPass = null;
        this.enabled = true;

        this.init();
    }

    init() {
        // Configuration de l'EffectComposer
        this.composer = new EffectComposer(this.renderer);
        
        // 1. Render Pass principal
        const renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);

        // 2. Bloom Pass réaliste (UnrealBloomPass)
        // Paramètres : résolution, force, rayon, seuil de luminosité
        this.bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            0.8,    // Force de la lueur (assez prononcée pour le soleil)
            0.4,    // Rayon de diffusion
            0.85    // Seuil de luminosité (ne fait briller que le soleil et les étoiles)
        );
        
        this.composer.addPass(this.bloomPass);
    }

    resize(width, height) {
        if (this.composer) {
            this.composer.setSize(width, height);
        }
        if (this.bloomPass) {
            this.bloomPass.setSize(width, height);
        }
    }

    render() {
        if (this.enabled && this.composer) {
            this.composer.render();
        } else {
            this.renderer.render(this.scene, this.camera);
        }
    }

    setEnabled(enabled) {
        this.enabled = enabled;
    }
}
