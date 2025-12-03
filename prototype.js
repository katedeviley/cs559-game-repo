// prototype.js
import * as THREE from 'three';
import { scene } from './main.js';

export function drawPrototypeShip() {
    const geometry = new THREE.BufferGeometry();
    const vertices = new Float32Array([
         0,  0,  1,     
        -0.6, 0, -1,   
         0.6, 0, -1,    
         0, 0.4, -0.6,  
    ]);
    const indices = [
        0, 1, 2,  
        0, 3, 1, 
        0, 2, 3,  
    ];

    geometry.setIndex(indices);
    geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();

    const material = new THREE.MeshBasicMaterial({ color: "lightgreen", wireframe: true });
    const ship = new THREE.Mesh(geometry, material);

    ship.rotation.set(0, Math.PI, 0); 
    ship.position.set(0, -5, 0);
    scene.add(ship);

    return ship;
}

export function drawPrototypeRocks(numRocks = 10) {
    const rocks = [];
    for (let i = 0; i < numRocks; i++) {
        const rockGeometry = new THREE.SphereGeometry( 0.2 + Math.random() * 2, 8, 8);
        const rockMaterial = new THREE.MeshBasicMaterial({ color: "grey", wireframe: true  });
        const rock = new THREE.Mesh(rockGeometry, rockMaterial);
        rock.position.set(
            Math.random() * 50 - 25,
            Math.random() * 50 - 25,
            Math.random() * -150 + 25
        );
        rock.userData.speed = 0.05 + Math.random() * 0.2;
        scene.add(rock);
        rocks.push(rock);
    }
    return rocks;
}

export function drawPrototypeBounds(n = 25)  {    
    const bound = n*2;
    const geometry = new THREE.BoxGeometry(bound, bound, bound*10);
    const material = new THREE.MeshBasicMaterial({ color: "white", wireframe: true });
    const box = new THREE.Mesh(geometry, material);
    
    box.position.set(0, 0, -bound + n/2);
    scene.add(box);
    return box;
}

export function drawPrototypeDrones(numDrones = 3, ship) {
    const drones = [];
    const bullets = [];

    for (let i = 0; i < numDrones; i++) {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshBasicMaterial({ color: "orange", wireframe: true });
        const drone = new THREE.Mesh(geometry, material);

        drone.position.set(
            -25 + Math.random() * 40,
            -25 + Math.random() * 40,
            -20 - Math.random() * 100
        );

        // Store shooting cooldown 
        drone.userData.cooldown = Math.random() * 100; 
        scene.add(drone);
        drones.push(drone);
    }

    /**
     * Function for drone movement and shooting
     */
    function updateDrones() {
        const separationDistance = 5.0; // how far apart drones stay
        const separationStrength = 0.1; // how strong the avoidance push is
        const droneVelocity = 0.1;
    
        for (let i = 0; i < drones.length; i++) {
            const drone = drones[i];
            const dir = new THREE.Vector3().subVectors(ship.position, drone.position).normalize();
    
            // --- Separation from other drones ---
            const avoid = new THREE.Vector3();
            for (let j = 0; j < drones.length; j++) {
                if (i === j) continue;
    
                const other = drones[j];
                const dist = drone.position.distanceTo(other.position);
    
                if (dist < separationDistance) {
                    const push = new THREE.Vector3()
                        .subVectors(drone.position, other.position)
                        .normalize()
                        .multiplyScalar((separationDistance - dist) * separationStrength);
    
                    avoid.add(push);
                }
            }
    
            dir.add(avoid).normalize();
            drone.position.addScaledVector(dir, droneVelocity); 

            // --- Shooting ---
            drone.userData.cooldown -= 1;
            if (drone.userData.cooldown <= 0) {
                const bulletGeometry = new THREE.SphereGeometry(0.1, 6, 6);
                const bulletMaterial = new THREE.MeshBasicMaterial({ color: "red", wireframe: true });
                const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);

                bullet.position.copy(drone.position);
                bullet.userData.direction = dir.clone();
                bullet.userData.speed = 0.5;

                scene.add(bullet);
                bullets.push(bullet);

                drone.userData.cooldown = 100 + Math.random() * 100;
            }
        }

        for (let i = bullets.length - 1; i >= 0; i--) {
            const b = bullets[i];
            b.position.addScaledVector(b.userData.direction, b.userData.speed);

            if (b.position.distanceTo(ship.position) > 200) {
                scene.remove(b);
                bullets.splice(i, 1);
            }
        }

        return bullets; 
    }

    return { drones, updateDrones };
}