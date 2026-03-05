import * as THREE from 'three';
import { PhysicsWorld } from './physics.js';
import { BowlingAlley } from './bowling.js';
import { GameControls } from './controls.js';
import { PostProcessor } from './effects.js';
import { ParticleSystem } from './particles.js';
import { UIManager } from './ui.js';
import { AudioManager } from './audio.js';

class Game {
    constructor() {
        this.container = document.getElementById('game-container');
        this.clock = new THREE.Clock();
        
        // 1. Setup Renderer with Transparency (alpha: true)
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: false, 
            powerPreference: "high-performance",
            alpha: true // Allow body background to show through
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.setClearColor(0x000000, 0); // Fully transparent clear color
        this.container.appendChild(this.renderer.domElement);

        // 2. Setup Scene & Camera
        this.scene = new THREE.Scene();
        // No scene.background so it remains transparent
        
        // Fog still helps with depth, matching the intended background deep charcoal
        this.scene.fog = new THREE.FogExp2(0x151515, 0.008); 

        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 7, 16); 
        this.camera.lookAt(0, 0, -10);

        // 3. Initialize Modules
        this.ui = new UIManager();
        this.audio = new AudioManager();
        
        this.shakeTime = 0;
        this.originalCamPos = new THREE.Vector3(0, 7, 16);

        this.init();
    }

    async init() {
        try {
            this.ui.showParams("INITIALIZING PHYSICS...");
            
            // Initialize Ammo Physics
            this.physics = new PhysicsWorld();
            await this.physics.init();

            // Setup Game Logic
            this.particles = new ParticleSystem(this.scene);
            this.bowling = new BowlingAlley(this.scene, this.physics, this.particles, this.ui, this.audio, this);
            this.controls = new GameControls(this.camera, this.renderer.domElement, this.bowling);
            this.effects = new PostProcessor(this.renderer, this.scene, this.camera);

            // Lighting
            this.setupLights();

            // Start Loop
            window.addEventListener('resize', () => this.onWindowResize(), false);
            this.ui.showParams("INSERT COIN");
            
            // Start Sound on interaction
            window.addEventListener('click', async () => {
                if(!this.audio.started) {
                    this.ui.showParams("LOADING MUSIC...");
                    await this.audio.init();
                    this.ui.showParams("MUSIC READY");
                    const volSlider = document.getElementById('volume');
                    if(volSlider) {
                        volSlider.addEventListener('input', (e) => {
                            this.audio.setMusicVolume(parseFloat(e.target.value));
                        });
                    }
                }
            }, { once: true });

            this.animate();
        } catch (e) {
            this.ui.showError(e.message || e);
        }
    }

    triggerShake(duration = 0.2) {
        this.shakeTime = duration;
    }

    setupLights() {
        // Ambient for baseline visibility
        const ambient = new THREE.AmbientLight(0xffffff, 0.2); 
        this.scene.add(ambient);

        const hemi = new THREE.HemisphereLight(0xffffff, 0x000000, 0.4);
        this.scene.add(hemi);

        // Main Lane Light (Flickering Bulb)
        this.spotLight = new THREE.SpotLight(0xffffff, 120); 
        this.spotLight.position.set(0, 20, 5); 
        this.spotLight.angle = Math.PI / 3; 
        this.spotLight.penumbra = 0.5;
        this.spotLight.decay = 1.0; 
        this.spotLight.castShadow = true;
        this.scene.add(this.spotLight);

        // Pin Light (Dedicated spotlight for the pins)
        this.pinLight = new THREE.SpotLight(0xffffff, 60);
        this.pinLight.position.set(0, 10, -15);
        this.pinLight.target.position.set(0, 0, -20);
        this.scene.add(this.pinLight);
        this.scene.add(this.pinLight.target);

        // Green Eerie Pin Light (Mood)
        const pointL = new THREE.PointLight(0x00ff00, 10, 30);
        pointL.position.set(0, 2, -18);
        this.scene.add(pointL);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.effects.composer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        const dt = this.clock.getDelta();

        // 1. Flicker Lighting
        if (this.spotLight) {
            const baseIntensity = 120;
            const jitter = (Math.random() - 0.5) * 40;
            const blackout = Math.random() > 0.99 ? 0 : 1; 
            this.spotLight.intensity = (baseIntensity + jitter) * blackout;
        }

        // Screen Shake
        if (this.shakeTime > 0) {
            this.shakeTime -= dt;
            const intensity = 0.5;
            this.camera.position.set(
                this.originalCamPos.x + (Math.random() - 0.5) * intensity,
                this.originalCamPos.y + (Math.random() - 0.5) * intensity,
                this.originalCamPos.z + (Math.random() - 0.5) * intensity
            );
        } else {
            this.camera.position.copy(this.originalCamPos);
        }

        // Update Modules
        this.physics.update(dt);
        this.bowling.update(dt);
        this.particles.update(dt);
        this.effects.update(dt);

        // Render via Post-Processing
        this.effects.render();
    }
}

new Game();