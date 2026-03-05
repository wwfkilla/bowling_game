import * as THREE from 'three';

export class BowlingAlley {
    constructor(scene, physics, particles, ui, audio, game) {
        this.scene = scene;
        this.physics = physics;
        this.particles = particles;
        this.ui = ui;
        this.audio = audio;
        this.game = game;

        this.pins = [];
        this.ball = null;
        this.score = 0;
        this.currentFrame = 1;
        this.currentThrow = 1; 
        this.canThrow = true;
        
        // Tracking for scoring
        this.frameData = Array.from({length: 10}, () => ({ t1: "", t2: "", t3: "", total: null }));

        this.createLane();
        this.createLaneMarkings();
        this.createCleaner();
        this.resetRack();
    }

    createCleaner() {
        const geo = new THREE.BoxGeometry(4, 0.5, 0.5);
        const mat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8 }); 
        this.cleaner = new THREE.Mesh(geo, mat);
        this.cleaner.position.set(0, 0.25, -30); // Hidden at back
        this.scene.add(this.cleaner);
        this.cleanerActive = false;
    }

    async cleanupSequence() {
        if (this.cleanerActive) return;
        this.cleanerActive = true;
        
        const startZ = -30;
        const endZ = 15;
        const duration = 2000;
        const start = Date.now();

        return new Promise(resolve => {
            const animate = () => {
                const elapsed = Date.now() - start;
                const progress = Math.min(elapsed / duration, 1);
                
                this.cleaner.position.z = startZ + (endZ - startZ) * progress;

                this.particles.decals.children.forEach(decal => {
                    if (decal.position.z < this.cleaner.position.z) {
                        decal.visible = false;
                    }
                });

                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    this.particles.clearDecals();
                    this.cleaner.position.z = startZ; // Return to back
                    this.cleanerActive = false;
                    resolve();
                }
            };
            animate();
        });
    }

    createLane() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        // Base wood color (Lightened slightly for visibility)
        ctx.fillStyle = '#4d3b2f';
        ctx.fillRect(0, 0, 512, 512);
        
        // Grain/Dirt
        for(let i=0; i<5000; i++) {
            ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.4})`;
            ctx.fillRect(Math.random()*512, Math.random()*512, 2, 2);
        }
        
        // Scuffs
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        for(let i=0; i<20; i++) {
            ctx.beginPath();
            ctx.moveTo(Math.random()*512, Math.random()*512);
            ctx.lineTo(Math.random()*512, Math.random()*512);
            ctx.stroke();
        }

        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(1, 10);

        const laneGeo = new THREE.BoxGeometry(4, 0.5, 40);
        const laneMat = new THREE.MeshStandardMaterial({ 
            map: tex,
            roughness: 0.8,
            metalness: 0.1 
        });
        const lane = new THREE.Mesh(laneGeo, laneMat);
        lane.position.set(0, -0.25, -10);
        lane.receiveShadow = true;
        this.scene.add(lane);
        this.physics.createRigidBody(lane, 0, 'box', new THREE.Vector3(2, 0.25, 20));

        // Gutters (Rusted Metal)
        const gutterGeo = new THREE.BoxGeometry(1, 0.5, 40);
        const gutterMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 }); 
        
        const leftG = new THREE.Mesh(gutterGeo, gutterMat);
        leftG.position.set(-2.5, -0.25, -10);
        this.scene.add(leftG);
        this.physics.createRigidBody(leftG, 0, 'box', new THREE.Vector3(0.5, 0.25, 20));

        const rightG = new THREE.Mesh(gutterGeo, gutterMat);
        rightG.position.set(2.5, -0.25, -10);
        this.scene.add(rightG);
        this.physics.createRigidBody(rightG, 0, 'box', new THREE.Vector3(0.5, 0.25, 20));
        
        // Back Wall / Pinsetter Area
        const backCanvas = document.createElement('canvas');
        backCanvas.width = 256;
        backCanvas.height = 256;
        const bCtx = backCanvas.getContext('2d');
        
        // Dirty Metal Base
        bCtx.fillStyle = '#2a2a2a';
        bCtx.fillRect(0, 0, 256, 256);
        
        // Rusted horizontal slats/details
        bCtx.strokeStyle = '#111111';
        bCtx.lineWidth = 4;
        for(let i=0; i<10; i++) {
            bCtx.beginPath();
            bCtx.moveTo(0, i * 25);
            bCtx.lineTo(256, i * 25);
            bCtx.stroke();
            
            // Rust/Grime splats
            bCtx.fillStyle = `rgba(50, 20, 0, ${Math.random() * 0.3})`;
            bCtx.fillRect(Math.random()*256, i*25, 40, 10);
        }

        const backTex = new THREE.CanvasTexture(backCanvas);
        const backGeo = new THREE.BoxGeometry(8, 6, 1);
        const backMat = new THREE.MeshStandardMaterial({ 
            map: backTex,
            roughness: 0.9,
            metalness: 0.2
        });
        const back = new THREE.Mesh(backGeo, backMat);
        back.position.set(0, 2.5, -25); 
        this.scene.add(back);
    }

    createLaneMarkings() {
        const arrowGeo = new THREE.ConeGeometry(0.12, 0.5, 3);
        const arrowMat = new THREE.MeshBasicMaterial({ 
            color: 0xff0000, // Blood Red Markings
            transparent: true, 
            opacity: 0.4 
        });
        
        const arrowZ = 0;
        const arrowSpacingX = 0.5;
        const arrowSpacingZ = 0.4;

        for (let i = 0; i < 7; i++) {
            const arrow = new THREE.Mesh(arrowGeo, arrowMat);
            const offset = i - 3;
            arrow.position.x = offset * arrowSpacingX;
            arrow.position.z = arrowZ - Math.abs(offset) * arrowSpacingZ;
            arrow.position.y = 0.05;
            arrow.rotation.x = Math.PI / 2;
            arrow.rotation.z = Math.PI;
            this.scene.add(arrow);
        }
    }

    createBall() {
        if(this.ball) {
            this.scene.remove(this.ball);
            this.physics.removeBody(this.ball);
        }

        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        
        // Dark Charcoal
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, 256, 256);
        
        // Grungy "Skull" or "X"
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.moveTo(80, 80); ctx.lineTo(176, 176);
        ctx.moveTo(176, 80); ctx.lineTo(80, 176);
        ctx.stroke();
        
        // Finger Holes
        ctx.fillStyle = '#000000';
        ctx.beginPath(); ctx.arc(128, 50, 15, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(100, 100, 12, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(156, 100, 12, 0, Math.PI*2); ctx.fill();

        const tex = new THREE.CanvasTexture(canvas);

        const geo = new THREE.SphereGeometry(0.35, 32, 32);
        const mat = new THREE.MeshStandardMaterial({ 
            map: tex,
            roughness: 0.8, 
            metalness: 0.1
        }); 
        this.ball = new THREE.Mesh(geo, mat);
        this.ball.position.set(0, 0.5, 8);
        this.ball.castShadow = true;
        this.scene.add(this.ball);
        
        this.physics.createRigidBody(this.ball, 7, 'sphere');
        const body = this.ball.userData.physicsBody;
        if (body) {
            body.setRestitution(0.5);
            body.setFriction(0.4);
            body.setActivationState(4);
        }
    }

    async resetRack() {
        if(this.currentFrame > 10) {
            this.ui.showOverlay("GAME OVER");
            setTimeout(() => {
                this.score = 0;
                this.currentFrame = 1;
                this.frameData = Array.from({length: 10}, () => ({ t1: "", t2: "", t3: "", total: null }));
                this.ui.resetSheet();
                this.resetRack();
            }, 5000);
            return;
        }

        this.canThrow = false;

        if (this.particles.decals.children.length > 0) {
            this.ui.showOverlay("SCRUBBING BLOOD...");
            await this.cleanupSequence();
        }

        this.pins.forEach(p => {
            this.scene.remove(p);
            this.physics.removeBody(p);
        });
        this.pins = [];

        // Weathered "Yellowed" Plastic Material (No Emission)
        const geo = new THREE.CylinderGeometry(0.12, 0.12, 0.8, 16);
        const mat = new THREE.MeshStandardMaterial({ 
            color: 0xddddcc, // Yellowish old plastic
            roughness: 0.6
        });
        const matTape = new THREE.MeshBasicMaterial({ color: 0x333333 }); // Duct Tape Stripe

        const startZ = -18;
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col <= row; col++) {
                const x = (col - row * 0.5) * 0.4;
                const z = startZ - row * 0.4;

                const pin = new THREE.Mesh(geo, mat);
                const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.125, 0.1, 16), matTape);
                stripe.position.y = 0.2;
                pin.add(stripe);

                pin.position.set(x, 0.5, z);
                pin.castShadow = true;
                this.scene.add(pin);
                pin.userData = { isPin: true, knocked: false, hit: false };
                this.physics.createRigidBody(pin, 0.8, 'cylinder', new THREE.Vector3(0.12, 0.4, 0.12));
                this.pins.push(pin);
            }
        }
        
        this.createBall();
        this.currentThrow = 1;
        this.canThrow = true;
        this.ui.updatePinStats(0, 10);
        this.ui.showOverlay(`TAPE ${this.currentFrame}`); // VHS style
    }

    onThrow() {
        if (!this.canThrow) return;
        this.canThrow = false;
        setTimeout(() => this.evaluateTurn(), 6000);
    }

    evaluateTurn() {
        const standingPins = [];
        const prevPinsLeft = this.pins.length;

        this.pins.forEach(pin => {
            let knocked = false;
            if (!pin.userData.knocked) {
                const up = new THREE.Vector3(0, 1, 0);
                up.applyQuaternion(pin.quaternion);
                if (up.y < 0.7 || pin.position.y < 0) knocked = true;
            } else {
                knocked = true;
            }

            if (knocked) {
                 pin.userData.knocked = true;
                 if(pin.parent) { 
                    this.score += 1;
                    this.scene.remove(pin);
                    this.physics.removeBody(pin);
                 }
            } else {
                standingPins.push(pin);
            }
        });
        
        const pinsLeft = standingPins.length;
        const pinsInThisThrow = prevPinsLeft - pinsLeft;
        this.pins = standingPins;
        
        this.ui.updateScore(this.score);
        this.ui.updatePinStats(10 - pinsLeft, pinsLeft);

        const fd = this.frameData[this.currentFrame - 1];

        if (this.currentThrow === 1) {
            if (pinsLeft === 0) {
                fd.t1 = "X"; fd.t2 = ""; fd.total = this.score;
                this.ui.updateFrame(this.currentFrame, "X", "", this.score);
                this.ui.showOverlay("TOTAL KILL");
                this.audio.playSynth("win");
                if(this.game) this.game.triggerShake(0.8);
                this.currentFrame++;
                setTimeout(() => this.resetRack(), 2000);
            } else {
                fd.t1 = pinsInThisThrow;
                this.ui.updateFrame(this.currentFrame, pinsInThisThrow, "-", null);
                this.currentThrow = 2;
                this.createBall();
                this.canThrow = true;
                this.ui.showOverlay("THROW 2");
            }
        } else {
            if (pinsLeft === 0) {
                fd.t2 = "/";
                this.ui.updateFrame(this.currentFrame, fd.t1, "/", this.score);
                this.ui.showOverlay("SPARE THEM?");
                this.audio.playSynth("win");
                if(this.game) this.game.triggerShake(0.5);
            } else {
                fd.t2 = pinsInThisThrow;
                this.ui.updateFrame(this.currentFrame, fd.t1, pinsInThisThrow, this.score);
                this.ui.showOverlay("NEXT TAPE");
            }
            fd.total = this.score;
            this.currentFrame++;
            setTimeout(() => this.resetRack(), 2000);
        }
    }

    update(dt) {
        if (this.ball && this.ball.position.z < -22) {
            const body = this.ball.userData.physicsBody;
            if (body) {
                const vel = body.getLinearVelocity();
                if (vel.z() > 0) {
                    vel.setZ(0);
                    body.setLinearVelocity(vel);
                }
            }
        }

        if(this.ball && this.ball.position) {
            this.pins.forEach(pin => {
                if(!pin.userData.hit) {
                    const dist = this.ball.position.distanceTo(pin.position);
                    if(dist < 0.6) {
                        pin.userData.hit = true;
                        this.particles.emit(pin.position, 30);
                        this.audio.playSynth("hit");
                        if(this.game) this.game.triggerShake(0.2);
                    }
                }
            });
        }
    }
}