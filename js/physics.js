// Wrapper for Ammo.js
export class PhysicsWorld {
    constructor() {
        this.world = null;
        this.rigidBodies = [];
        this.tmpTrans = null;
    }

    async init() {
        if (!window.Ammo) {
            throw new Error("Ammo.js script not loaded."); 
        }

        // If Ammo is a function, it's the factory.
        // If it's an object, it might be already initialized (though uncommon with this build).
        if (typeof window.Ammo === 'function') {
            // Initialize the factory
            await window.Ammo();
        } 
        
        // After await, window.Ammo might still be the factory or the module depending on build.
        // But internal references usually bind correctly.

        this.tmpTrans = new Ammo.btTransform();

        const collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
        const dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
        const broadphase = new Ammo.btDbvtBroadphase();
        const solver = new Ammo.btSequentialImpulseConstraintSolver();

        this.world = new Ammo.btDiscreteDynamicsWorld(dispatcher, broadphase, solver, collisionConfiguration);
        this.world.setGravity(new Ammo.btVector3(0, -9.82, 0));
    }

    update(dt) {
        if (!this.world) return;
        this.world.stepSimulation(dt, 10);

        // Sync graphics with physics
        for (let i = 0; i < this.rigidBodies.length; i++) {
            const obj = this.rigidBodies[i];
            
            // Safety check: Ensure the object and its physics body still exist
            if (!obj) {
                console.warn("Physics: Object is null, removing from list.");
                this.rigidBodies.splice(i, 1);
                i--;
                continue;
            }
            
            if (!obj.userData || !obj.userData.physicsBody) {
                // This happens if userData was overwritten or body removed but mesh stayed in list
                // console.warn("Physics: Object missing physicsBody", obj); 
                continue;
            }
            
            const ms = obj.userData.physicsBody.getMotionState();
            if (ms) {
                ms.getWorldTransform(this.tmpTrans);
                const p = this.tmpTrans.getOrigin();
                const q = this.tmpTrans.getRotation();
                obj.position.set(p.x(), p.y(), p.z());
                obj.quaternion.set(q.x(), q.y(), q.z(), q.w());
            }
        }
    }

    createRigidBody(mesh, mass, shapeType = 'box', size = null) {
        if (!mesh) return null;

        const pos = mesh.position;
        const quat = mesh.quaternion;

        const transform = new Ammo.btTransform();
        transform.setIdentity();
        transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
        transform.setRotation(new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w));

        const motionState = new Ammo.btDefaultMotionState(transform);

        let colShape;
        if (shapeType === 'box') {
            const hs = size ? size : new THREE.Vector3().copy(mesh.geometry.parameters ? new THREE.Vector3(mesh.geometry.parameters.width, mesh.geometry.parameters.height, mesh.geometry.parameters.depth).multiplyScalar(0.5) : new THREE.Vector3(1,1,1));
            colShape = new Ammo.btBoxShape(new Ammo.btVector3(hs.x, hs.y, hs.z));
        } else if (shapeType === 'sphere') {
            colShape = new Ammo.btSphereShape(size || mesh.geometry.parameters.radius);
        } else if (shapeType === 'cylinder') {
             colShape = new Ammo.btCylinderShape(new Ammo.btVector3(size.x, size.y, size.z));
        }

        colShape.setMargin(0.05);

        const localInertia = new Ammo.btVector3(0, 0, 0);
        if (mass > 0) {
            colShape.calculateLocalInertia(mass, localInertia);
        }

        const rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, colShape, localInertia);
        const body = new Ammo.btRigidBody(rbInfo);

        // Friction and restitution (bounciness)
        body.setFriction(0.5);
        body.setRestitution(0.3);

        mesh.userData.physicsBody = body;
        body.threeMesh = mesh; // Back reference

        if (mass > 0) {
            this.rigidBodies.push(mesh);
            // Disable deactivation so pins don't freeze in mid-air/fall
            body.setActivationState(4); 
        }

        this.world.addRigidBody(body);
        return body;
    }
    
    removeBody(mesh) {
        if (!mesh || !mesh.userData.physicsBody) return;
        const body = mesh.userData.physicsBody;
        this.world.removeRigidBody(body);
        const idx = this.rigidBodies.indexOf(mesh);
        if(idx > -1) this.rigidBodies.splice(idx, 1);
        Ammo.destroy(body);
        mesh.userData.physicsBody = null;
    }
}
