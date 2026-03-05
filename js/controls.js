import * as THREE from 'three';

export class GameControls {
    constructor(camera, domElement, bowling) {
        this.camera = camera;
        this.domElement = domElement;
        this.bowling = bowling;

        this.isDragging = false;
        this.startPos = new THREE.Vector2();
        this.endPos = new THREE.Vector2();
        
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        // Visual line for aiming
        const material = new THREE.LineBasicMaterial({ color: 0x00ff00 });
        const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,0)]);
        this.trajectoryLine = new THREE.Line(geometry, material);
        this.trajectoryLine.frustumCulled = false; // Always render
        this.bowling.scene.add(this.trajectoryLine);

        this.setupEvents();
    }

    setupEvents() {
        this.domElement.addEventListener('mousedown', (e) => this.onDown(e));
        this.domElement.addEventListener('mousemove', (e) => this.onMove(e));
        window.addEventListener('mouseup', (e) => this.onUp(e));
        
        // Touch support
        this.domElement.addEventListener('touchstart', (e) => this.onDown(e.touches[0]));
        this.domElement.addEventListener('touchmove', (e) => this.onMove(e.touches[0]));
        window.addEventListener('touchend', (e) => this.onUp(e));

        // Keyboard
        window.addEventListener('keydown', (e) => {
            if(e.key.toLowerCase() === 'r') this.bowling.resetRack();
        });
    }

    getIntersects(inputEvent) {
        this.mouse.x = (inputEvent.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(inputEvent.clientY / window.innerHeight) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse, this.camera);
        // Only intersect the ball
        return this.raycaster.intersectObject(this.bowling.ball);
    }

    onDown(e) {
        if (!this.bowling.canThrow) return;
        
        const intersects = this.getIntersects(e);
        if (intersects.length > 0) {
            this.isDragging = true;
            this.startPos.set(e.clientX, e.clientY);
            this.domElement.style.cursor = 'grabbing';
            this.bowling.audio.playSynth("charge"); // Charge sound
        }
    }

    onMove(e) {
        if (!this.isDragging) return;
        
        this.endPos.set(e.clientX, e.clientY);
        
        // Update visual line
        // Project start and end to 3D roughly
        const ballPos = this.bowling.ball.position.clone();
        
        // Calculate drag delta
        const dx = (this.startPos.x - this.endPos.x) * 0.05;
        const dy = (this.startPos.y - this.endPos.y) * 0.05;

        // Visual feedback point
        const target = ballPos.clone();
        target.x += dx;
        target.z -= Math.abs(dy); // Always forward

        const positions = this.trajectoryLine.geometry.attributes.position.array;
        positions[0] = ballPos.x; positions[1] = ballPos.y; positions[2] = ballPos.z;
        positions[3] = target.x;  positions[4] = target.y;  positions[5] = target.z;
        this.trajectoryLine.geometry.attributes.position.needsUpdate = true;
    }

    onUp(e) {
        if (!this.isDragging) return;
        this.isDragging = false;
        this.domElement.style.cursor = 'default';
        
        // Hide line
        const positions = this.trajectoryLine.geometry.attributes.position.array;
        positions[0]=0;positions[1]=0;positions[2]=0;
        positions[3]=0;positions[4]=0;positions[5]=0;
        this.trajectoryLine.geometry.attributes.position.needsUpdate = true;

        // Calculate Impulse
        const dx = (this.startPos.x - this.endPos.x);
        const dy = (this.startPos.y - this.endPos.y);
        
        // Power multiplier
        const power = 1.5; 
        
        // Apply Impulse to Ammo Body
        const body = this.bowling.ball.userData.physicsBody;
        if(body) {
            body.activate(true);
            // X is side-to-side, Z is forward (negative)
            // We invert dy because dragging down (positive) should shoot forward (negative)
            const forceX = dx * power;
            const forceZ = -Math.abs(dy) * power * 2; // More power forward
            
            const impulse = new Ammo.btVector3(forceX, 0, forceZ);
            body.applyCentralImpulse(impulse);
            
            // Notify game logic
            this.bowling.onThrow();
        }
        
        this.bowling.audio.playSynth("shoot");
    }
}
