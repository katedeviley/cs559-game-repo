import * as THREE from 'three';
import { scene } from './main.js';

/**
 * Function to load the full game mode objects
 * 
 * @returns { ship: THREE.Mesh, rocks: THREE.Mesh[], drones: THREE.Mesh[], enemyShips: THREE.Mesh[] }
 */
export function loadFullMode() {
    //loadPrototypeMode(scene);
    const ship = drawShip();
    const rocks = drawRocks(70);
    const drones = drawDrones(7);
    const enemyShips = drawEnemyShips(3);
    const ufos = drawUFOs(2);
    drawBackground();

    return { ship, rocks, drones, enemyShips, ufos };
}


/**
 * Function to update drone/enemy ship movements and shooting
 * 
 * @param {*} ship 
 * @param {*} drones 
 * @param {*} bullets 
 * @param {*} velocity 
 * @param {*} coolDown 
 * @returns updated bullets array
 */
export function updateObjects(ship, drones, bullets, velocity= 0.2, coolDown= 50) {
    const separationDistance = 5.0;
    const separationStrength = 0.1;

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
        velocity = Math.random() * velocity + 0.12
        drone.position.addScaledVector(dir, velocity); 

        // --- Shooting ---
        drone.userData.cooldown -= 1;
        if (drone.userData.cooldown <= 0) {
            const bulletGeometry = new THREE.SphereGeometry(0.1, 6, 6);
            const bulletMaterial = new THREE.MeshBasicMaterial({ color: "red", wireframe: true });
            const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);

            bullet.position.copy(drone.position);
            bullet.userData.direction = dir.clone();
            bullet.userData.speed = 1;

            scene.add(bullet);
            bullets.push(bullet);

            drone.userData.cooldown = coolDown + Math.random() * coolDown;
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


/**
 * Function to update UFO movements and laser targeting
 * 
 * @param {*} ship 
 * @param {*} ufos 
 * @param {*} lasers 
 * @returns updated lasers array
 */
export function updateUFOs(ship, ufos, lasers) {
    const separationDistance = 7.0;
    const separationStrength = 4;
    const velocity = 0.07;

    for (let i = 0; i < ufos.length; i++) {
        const ufo = ufos[i];
        const dir = new THREE.Vector3().subVectors(
            new THREE.Vector3(ship.position.x, ship.position.y, -250), 
            new THREE.Vector3(ufo.position.x, ufo.position.y, -250)).normalize();

        // --- Separation from other ufos ---
        const avoid = new THREE.Vector3();
        for (let j = 0; j < ufos.length; j++) {
            if (i === j) continue;

            const other = ufos[j];
            const dist = ufo.position.distanceTo(other.position);

            if (dist < separationDistance) {
                const push = new THREE.Vector3()
                    .subVectors(ufo.position, other.position)
                    .normalize()
                    .multiplyScalar((separationDistance - dist) * separationStrength);

                avoid.add(push);
            }
        }

        // --- Wander / randomness ---
        if (!ufo.userData.wander) {
            ufo.userData.wander = {
                x: Math.random() * 1000,
                y: Math.random() * 1000
            };
        }

        ufo.userData.wander.x += 0.01;
        ufo.userData.wander.y += 0.01;

        const randomOffset = new THREE.Vector3(
            Math.sin(ufo.userData.wander.x) * 0.4,   
            Math.cos(ufo.userData.wander.y) * 0.4, 
            0
        );

        dir.add(avoid).add(randomOffset).normalize();
        ufo.position.addScaledVector(dir, velocity);

        // --- Laser ---
        if (!ufo.userData.laser) {
            const geo = new THREE.CylinderGeometry(0.1, 0.1, 300);
            const mat = new THREE.MeshBasicMaterial({ color: "red", wireframe: true });
            const laser = new THREE.Mesh(geo, mat);

            laser.rotation.set(Math.PI / 2, 0, 0);  
            scene.add(laser);

            ufo.userData.laser = laser;   
        }

        const laser = ufo.userData.laser;
        laser.position.copy(ufo.position).add(new THREE.Vector3(0, 0, 150));
    }
    return lasers;
}


function drawShip() {

}

function drawRocks(numRocks) {

}

function drawDrones(numDrones) {

}

function drawEnemyShips(numShips) {

}

function drawUFOs(numUFOs) {

}

function drawBackground() {

}
  