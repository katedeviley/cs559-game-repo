// prototype.js
import * as THREE from 'three';
import { scene } from './main.js';

/**
 * Function to load the prototype mode objects
 * 
 * @returns { ship: THREE.Mesh, rocks: THREE.Mesh[], drones: THREE.Mesh[], enemyShips: THREE.Mesh[] }
 */
export function loadPrototypeMode() { 
    const ship = drawPrototypeShip();
    const rocks = drawPrototypeRocks(70);
    const drones = drawPrototypeDrones(7);
    const enemyShips = drawPrototypeEnemyShips(3);
    const ufos = drawPrototypeUFOs(2);
    const boundsBox = drawPrototypeBounds(25);

    return { ship, rocks, drones, enemyShips, ufos, boundsBox };
}

function drawPrototypeShip() {
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

function drawPrototypeRocks(numRocks) {
    const rocks = [];
    for (let i = 0; i < numRocks; i++) {
    
        const rockGeometry = new THREE.SphereGeometry( 0.2 + Math.random() * 2, 8, 8);
        const rockMaterial = new THREE.MeshBasicMaterial({ color: "grey", wireframe: true  });
        const rock = new THREE.Mesh(rockGeometry, rockMaterial);
        rock.position.set(
            Math.random() * 50 - 25,
            Math.random() * 50 - 25,
            Math.random() * -225 -25
        );
        rock.userData.radius = rockGeometry.parameters.radius;
        rock.userData.speed = 0.05 + Math.random() * 0.2;
        scene.add(rock);
        rocks.push(rock);
    }
    return rocks;
}

function drawPrototypeDrones(numDrones) {
    const drones = [];

    for (let i = 0; i < numDrones; i++) {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshBasicMaterial({ color: "yellow", wireframe: true });
        const drone = new THREE.Mesh(geometry, material);

        drone.position.set(
            -25 + Math.random() * 40,
            -25 + Math.random() * 40,
            -50 - Math.random() * 150
        );

        drone.userData.cooldown = Math.random() * 150; 
        scene.add(drone);
        drones.push(drone);
    }
    return drones;
}

function drawPrototypeEnemyShips(numShips) {
    const enemyShips = [];

    for (let i = 0; i < numShips; i++) {
        const geometry = new THREE.ConeGeometry(0.8, 2, 8);
        const material = new THREE.MeshBasicMaterial({ color: "orange", wireframe: true });
        const enemyShip = new THREE.Mesh(geometry, material);

        enemyShip.position.set(
            -10 + Math.random() * 20,
            -10 + Math.random() * 20,
            -200
        );

        enemyShip.rotation.set(Math.PI / 2, 0, 0); 
        enemyShip.userData.cooldown = Math.random() * 20;
        scene.add(enemyShip);
        enemyShips.push(enemyShip);
    }
    return enemyShips;
}

function drawPrototypeUFOs(numUFOs) {
    const ufos = [];

    for (let i = 0; i < numUFOs; i++) {
        const geometry = new THREE.CylinderGeometry(0.5, 1, 0.3, 16);
        const material = new THREE.MeshBasicMaterial({ color: "red", wireframe: true });
        const ufo = new THREE.Mesh(geometry, material);

        ufo.position.set(
            -15 + Math.random() * 30,
            -15 + Math.random() * 30,
            -250
        );

        ufo.userData.cooldown = 5;
        scene.add(ufo);
        ufos.push(ufo);
    }
    return ufos;
}

function drawPrototypeBounds(n)  {    
    const bound = n*2;
    const geometry = new THREE.BoxGeometry(bound, bound, bound*10);
    const material = new THREE.MeshBasicMaterial({ color: "white", wireframe: true });
    const box = new THREE.Mesh(geometry, material);
    
    box.position.set(0, 0, -bound + n/2);
    box.userData.originalRadius = n;
    scene.add(box);
    return box;
}