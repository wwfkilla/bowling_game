import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

// Custom Shader for VHS / Horror Effects
const VHSShader = {
    uniforms: {
        "tDiffuse": { value: null },
        "time": { value: 0.0 }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float time;
        varying vec2 vUv;

        void main() {
            vec2 p = vUv;
            
            vec4 texel = texture2D(tDiffuse, p);
            
            // Subtle Chromatic Aberration logic can go here if needed, 
            // but let's keep it simple to ensure alpha works.
            vec4 col = texel;

            // Scanlines (Only apply if there's actual content/alpha)
            if (col.a > 0.1) {
                float scanline = sin(p.y * 1000.0) * 0.01;
                col.rgb -= scanline;
            }

            gl_FragColor = col;
        }
    `
};

export class PostProcessor {
    constructor(renderer, scene, camera) {
        // Create a render target that supports transparency
        const size = renderer.getSize(new THREE.Vector2());
        const renderTarget = new THREE.WebGLRenderTarget(size.x, size.y, {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBAFormat,
            type: THREE.UnsignedByteType
        });

        this.composer = new EffectComposer(renderer, renderTarget);
        
        // 1. Basic Scene Render
        const renderPass = new RenderPass(scene, camera);
        // Ensure render pass doesn't clear the alpha to 1
        renderPass.clearAlpha = 0; 
        this.composer.addPass(renderPass);

        // 2. VHS / CRT Effect
        this.vhsPass = new ShaderPass(VHSShader);
        this.composer.addPass(this.vhsPass);
    }

    update(dt) {
        this.vhsPass.uniforms["time"].value += dt;
    }

    render() {
        this.composer.render();
    }
}