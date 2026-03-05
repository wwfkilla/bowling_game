import * as THREE from 'three';

export class ParticleSystem {
    constructor(scene) {
        this.scene = scene;
        this.particles = [];
        this.decals = new THREE.Group();
        this.scene.add(this.decals);
        
        // Reuse geometry/material for performance
        this.geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
        this.decalGeo = new THREE.CircleGeometry(0.2, 8);
        this.material = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // Vibrant Punk Red
    }

    emit(position, count = 15) {
        // Create spray particles
        for(let i=0; i<count * 3; i++) { // Triple particles
            const mesh = new THREE.Mesh(this.geometry, this.material);
            mesh.position.copy(position);
            
            mesh.userData = {
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 12,
                    Math.random() * 6,
                    (Math.random() - 0.5) * 12
                ),
                life: 1.5
            };
            
            this.scene.add(mesh);
            this.particles.push(mesh);
        }

        // Create many floor stains (Decals)
        for(let i=0; i<10; i++) {
            const stain = new THREE.Mesh(this.decalGeo, this.material);
            stain.position.set(
                position.x + (Math.random() - 0.5) * 4.0, 
                0.02 + (i * 0.001),
                position.z + (Math.random() - 0.5) * 4.0
            );
            stain.rotation.x = -Math.PI / 2;
            stain.scale.setScalar(0.2 + Math.random() * 1.5);
            this.decals.add(stain);
        }
    }

    clearDecals() {
        while(this.decals.children.length > 0) {
            this.decals.remove(this.decals.children[0]);
        }
    }

    update(dt) {
        for(let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            
            p.userData.life -= dt;
            p.userData.velocity.y -= 9.8 * dt; // Gravity
            p.position.addScaledVector(p.userData.velocity, dt);
            
            p.rotation.x += dt * 5;
            p.rotation.z += dt * 5;
            p.scale.setScalar(p.userData.life);

            if(p.userData.life <= 0 || p.position.y < -5) {
                this.scene.remove(p);
                this.particles.splice(i, 1);
            }
        }
    }
}
