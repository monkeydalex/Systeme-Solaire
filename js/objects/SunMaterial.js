import * as THREE from 'three';

// Matériau shader animé du Soleil : bruit FBM avec déformation de domaine
// (granulation + cellules de convection), assombrissement du limbe,
// surbrillance poussée pour exciter le bloom.
export function createSunMaterial() {
    return new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 }
        },
        vertexShader: `
            varying vec3 vPos;
            varying vec3 vNormalView;
            void main() {
                vPos = normalize(position);
                vNormalView = normalize(normalMatrix * normal);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float uTime;
            varying vec3 vPos;
            varying vec3 vNormalView;

            float hash(vec3 p) {
                p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
                p *= 17.0;
                return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
            }

            float noise(vec3 x) {
                vec3 i = floor(x);
                vec3 f = fract(x);
                f = f * f * (3.0 - 2.0 * f);
                return mix(
                    mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x),
                        mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
                    mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                        mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),
                    f.z);
            }

            float fbm(vec3 p) {
                float v = 0.0;
                float a = 0.5;
                for (int i = 0; i < 5; i++) {
                    v += a * noise(p);
                    p *= 2.02;
                    a *= 0.5;
                }
                return v;
            }

            void main() {
                float t = uTime * 0.06;

                // Grandes cellules de convection (déformation de domaine)
                vec3 p = vPos * 3.5;
                float n = fbm(p + fbm(p + vec3(t)));

                // Granulation fine qui défile lentement
                float granul = fbm(vPos * 14.0 + vec3(0.0, t * 2.5, 0.0));

                float v = clamp(n * 0.7 + granul * 0.45, 0.0, 1.2);

                vec3 col = mix(vec3(0.45, 0.08, 0.0), vec3(1.0, 0.35, 0.02), smoothstep(0.15, 0.55, v));
                col = mix(col, vec3(1.0, 0.85, 0.45), smoothstep(0.50, 0.80, v));
                col = mix(col, vec3(1.0, 1.0, 0.88), smoothstep(0.78, 1.00, v));

                // Assombrissement du limbe
                float limb = clamp(dot(normalize(vNormalView), vec3(0.0, 0.0, 1.0)), 0.0, 1.0);
                col *= 0.55 + 0.65 * limb;

                // Pousser au-dessus du seuil de bloom
                col *= 1.5;

                gl_FragColor = vec4(col, 1.0);
            }
        `
    });
}
