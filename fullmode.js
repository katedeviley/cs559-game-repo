import * as THREE from 'three';
import { GLTFLoader } from './libs/three.js/examples/jsm/loaders/GLTFLoader.js';
import { scene } from './main.js';

let smoothShrink = 1;
let smoothRadius = 0;
let smoothRotation = 0; 

/**
 * Function to load the full game mode objects
 * 
 * @returns { ship: THREE.Mesh, rocks: THREE.Mesh[], drones: THREE.Mesh[], enemyShips: THREE.Mesh[] }
 */
export function loadFullMode() {
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
            if (drone.userData.shell) {
                drone.userData.shell.rotation.x += 0.01;
                drone.userData.shell.rotation.y += 0.01;
            }

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

/**
 * Function that updates the bound box based on Audio
 * 
 * @param {*} analyser 
 * @param {*} dataArray 
 * @param {*} boundsBox 
 * @param {*} bound 
 * @returns new bounds
 */
export function updateBounds(analyser, dataArray, boundsBox, bound) {
    analyser.getByteFrequencyData(dataArray);

    // Calculate BASS 
    const N = Math.min(20, dataArray.length);
    let bass = 0;
    for (let i = 0; i < N; i++) bass += dataArray[i];
    bass /= N;
    const t = bass / 255;

    // Calculate MIDS
    const start = Math.floor(dataArray.length * 0.2);
    const end = Math.floor(dataArray.length * 0.5);
    let mids = 0;
    for (let i = start; i < end; i++) mids += dataArray[i];
    mids /= (end - start);
    const m = (mids / 255) - 0.5;

    // Shrink 
    const targetShrink = 1 - (t * 0.7);
    smoothShrink = smoothShrink * 0.85 + targetShrink * 0.15;
    boundsBox.scale.set(smoothShrink, smoothShrink, 1);

    // Color
    const hue = 0.50 + t * 2;  
    const sat = 0.6 + t;          
    const light = 0.3 + t * 0.7;  

    if (boundsBox.material) {
        if (boundsBox.material.color?.setHSL) {
            boundsBox.material.color.setHSL(hue, sat, light);
        }
        boundsBox.material.opacity = 0.4 + t * 0.6;
        boundsBox.material.transparent = true;
    }

    // Rotation 
    const targetRotation = m * 0.4; 
    smoothRotation = smoothRotation * 0.85 + targetRotation * 0.15;
    boundsBox.rotation.z += smoothRotation * 0.08;

    // Smooth radius 
    const targetRadius = bound * smoothShrink;
    smoothRadius = smoothRadius * 0.85 + targetRadius * 0.15;
    smoothRadius = Math.max(smoothRadius, 10);
    return Math.sqrt(2) * smoothRadius - 2;
}

function drawShip() {
    const shipGroup = new THREE.Group();

    // Nose
    const noseGeom = new THREE.ConeGeometry(0.29, 0.8, 4); // radius, height, segments
    const noseMat = new THREE.MeshStandardMaterial({ color: 0x1e90ff, metalness: 0.5, roughness: 0.3 });
    const nose = new THREE.Mesh(noseGeom, noseMat);
    nose.rotation.x = Math.PI / 2;
    nose.position.z = 0.32;
    shipGroup.add(nose);

    // Body
    const bodyGeom = new THREE.CylinderGeometry(0.2, 0.15, 1, 6);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.7, roughness: 0 });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.position.z = -0.5;
    body.rotation.x = Math.PI / 2;
    shipGroup.add(body);

    // Wings
    const wingGeom = new THREE.ConeGeometry(0.18, 1, 3); 
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.8, roughness: 0.2 });

    const leftWing = new THREE.Mesh(wingGeom, wingMat);
    leftWing.position.set(-0.48, 0, -0.7); 
    leftWing.rotation.set(-Math.PI / 2, 0, Math.PI / 5);  
    shipGroup.add(leftWing);
    
    const rightWing = new THREE.Mesh(wingGeom, wingMat);
    rightWing.position.set(0.48, 0, -0.7);
    rightWing.rotation.set(-Math.PI / 2, 0, -Math.PI / 5); 
    shipGroup.add(rightWing);

    // Tail
    const tailGeom = new THREE.BoxGeometry(0.05, 0.3, 0.5);
    const tailMat = new THREE.MeshStandardMaterial({ color: 0x1e90ff, metalness: 0.5, roughness: 0. });

    const leftTail = new THREE.Mesh(tailGeom, tailMat);
    leftTail.position.set(-0.15, 0, -1);
    leftTail.rotation.z = -0.3;
    shipGroup.add(leftTail);

    const rightTail = new THREE.Mesh(tailGeom, tailMat);
    rightTail.position.set(0.15, 0, -1);
    rightTail.rotation.z = 0.3;
    shipGroup.add(rightTail);

    // Neon Lights
    const engineGeom = new THREE.CylinderGeometry(0.05, 0.05, 0.4, 6);
    const engineMat = new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 0.7 });
    
    const leftEngine = new THREE.Mesh(engineGeom, engineMat);
    leftEngine.position.set(-0.15, 0, -1.1);
    leftEngine.rotation.x = Math.PI / 2;
    shipGroup.add(leftEngine);

    const rightEngine = new THREE.Mesh(engineGeom, engineMat);
    rightEngine.position.set(0.15, 0, -1.1);
    rightEngine.rotation.x = Math.PI / 2;
    shipGroup.add(rightEngine);

    shipGroup.castShadow = true;
    shipGroup.receiveShadow = true;

    shipGroup.scale.set(1.2,1.2,1.2);
    shipGroup.rotation.y = Math.PI;
    shipGroup.position.set(0, -5, 0);
    scene.add(shipGroup);
    return shipGroup;
}

function drawRocks(numRocks) {
    const rocks = [];
    for (let i = 0; i < numRocks; i++) {
    
        const radius = 0.5 + Math.random() * 2; 
        const segments = 6 + Math.floor(Math.random() * 5); 
        const rockGeometry = new THREE.SphereGeometry(radius, segments, segments);

        rockGeometry.vertices = rockGeometry.attributes.position.array;
        const positions = rockGeometry.attributes.position;
        for (let j = 0; j < positions.count; j++) {
            positions.setXYZ(
                j,
                positions.getX(j) + (Math.random() - 0.5) * 0.3,
                positions.getY(j) + (Math.random() - 0.5) * 0.3,
                positions.getZ(j) + (Math.random() - 0.5) * 0.3
            );
        }
        rockGeometry.computeVertexNormals();

        const colors = [0xaaaaaa, 0x999999, 0x777777, 0x555555, 0x333333];
        const color = colors[Math.floor(Math.random() * colors.length)];
        const rockMaterial = new THREE.MeshBasicMaterial({
            color: color,
            roughness: 0.8,
            metalness: 0.5,
            transparent: true,
            opacity: 0.75,
        });

        const rock = new THREE.Mesh(rockGeometry, rockMaterial);
        rock.castShadow = true;
        rock.receiveShadow = true;

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

function drawDrones(numDrones) {
    const drones = [];

    for (let i = 0; i < numDrones; i++) {

        const group = new THREE.Group();

        // glowing core
        const coreGeom = new THREE.SphereGeometry(0.35, 16, 16);
        const coreMat = new THREE.MeshStandardMaterial({
            color: "white",
            emissive: 0xFFFF5B,
            emissiveIntensity: 1
        });
        const core = new THREE.Mesh(coreGeom, coreMat);
        group.add(core);

        // wireframe shell
        const boxGeom = new THREE.BoxGeometry(1, 1, 1);
        const boxMat = new THREE.MeshBasicMaterial({
            color: 0xad900c,
            wireframe: true
        });
        const shell = new THREE.Mesh(boxGeom, boxMat);
        group.add(shell);

        group.position.set(
            -25 + Math.random() * 40,
            -25 + Math.random() * 40,
            -50 - Math.random() * 150
        );

        group.userData.shell = shell; 
        group.userData.cooldown = Math.random() * 150;

        scene.add(group);
        drones.push(group);
    }
    return drones;
}


function drawEnemyShips(numShips) {
    const enemyShips = [];

    for (let i = 0; i < numShips; i++) {
        const group = new THREE.Group();
        const bodyGeom = new THREE.ConeGeometry(0.8, 2.2, 3);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: 0xff6600,
            metalness: 0.9,
            roughness: 0.25,
            emissive: 0xff3300,
            emissiveIntensity: 0.3
        });
        const body = new THREE.Mesh(bodyGeom, bodyMat);
        body.rotation.x = Math.PI / 2;
        group.add(body);

        const cockpitGeom = new THREE.SphereGeometry(0.3, 16, 16);
        const cockpitMat = new THREE.MeshStandardMaterial({
            color: 0xff8800,
            emissive: 0xff8800,
            emissiveIntensity: 1.3,
            metalness: 0.6,
            roughness: 0.1
        });
        const cockpit = new THREE.Mesh(cockpitGeom, cockpitMat);
        cockpit.position.set(0, 0.25, 0);
        group.add(cockpit);

        const finGeom = new THREE.BoxGeometry(0.15, 1.2, 0.25);
        const finMat = new THREE.MeshStandardMaterial({
            color: "red",
            metalness: 0.9,
            roughness: 0.2
        });
        const leftFin = new THREE.Mesh(finGeom, finMat);
        const rightFin = new THREE.Mesh(finGeom, finMat);
        leftFin.position.set(-0.7, 0.7, -0.3);
        rightFin.position.set(0.7, 0.7, -0.3);
        leftFin.rotation.z = 0.5;
        rightFin.rotation.z = -0.5;
        group.add(leftFin, rightFin);

        const hornGeom = new THREE.CylinderGeometry(0.05, 0.12, 1.0, 12);
        const hornMat = new THREE.MeshStandardMaterial({
            color: 0xff3300,
            emissive: 0xff3300,
            emissiveIntensity: 1.0,
            metalness: 0.9
        });
        const horn1 = new THREE.Mesh(hornGeom, hornMat);
        const horn2 = new THREE.Mesh(hornGeom, hornMat);
        horn1.rotation.z = Math.PI / 2;
        horn2.rotation.z = 3*Math.PI / 2;
        horn1.position.set(-0.6, -0.2, -0.5);
        horn2.position.set(0.6, -0.2, -0.5);
        group.add(horn1, horn2);

        const ringGeom = new THREE.TorusGeometry(0.45, 0.12, 8, 18);
        const ringMat = new THREE.MeshStandardMaterial({
            color: 0xff5500,
            emissive: 0xff5500,
            emissiveIntensity: 1.2,
            metalness: 1,
            roughness: 0.1
        });
        const ring = new THREE.Mesh(ringGeom, ringMat);
        ring.position.set(0, 0, -2.5);
        group.add(ring);

        group.position.set(
            -10 + Math.random() * 20,
            -10 + Math.random() * 20,
            -200
        );

        group.userData.cooldown = Math.random() * 20;
        scene.add(group);
        enemyShips.push(group);
    }
    return enemyShips;
}



function drawUFOs(numUFOs) {
    const ufos = [];

    for (let i = 0; i < numUFOs; i++) {
        const geometry = new THREE.CylinderGeometry(0.5, 1, 0.3, 16);
        const material = new THREE.MeshStandardMaterial({
            color: 0xff0000,        
            emissive: 0x550000,      
            emissiveIntensity: 0.6,
            metalness: 0.6,
            roughness: 0.25
        });

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


function drawBackground() {

    function randomOutsideBox(range) {
        let x = 0, y = 0;
    
        // Keep generating random positions until one is outside the 25x25 square
        while (Math.abs(x) < 25 && Math.abs(y) < 25) {
            x = -range + Math.random() * (range * 2);
            y = -range + Math.random() * (range * 2);
        }
    
        return { x, y };
    }

    // --- STARS ---
    const starGeom = new THREE.SphereGeometry(0.12, 8, 8);
    const starMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (let i = 0; i < 2000; i++) {
        const star = new THREE.Mesh(starGeom, starMat);
        const pos = randomOutsideBox(200);
        star.position.set(
            pos.x,
            pos.y,
            -20 - Math.random() * 250
        );
        scene.add(star);
    }

    // --- PLANETS ---
    const bgColors = [
        0x66ccff, // sky blue
        0x3399ff, // bright blue
        0x0033cc, // deep blue
        0x6699ff, // soft blue
        0x33cccc, // teal
        0x00ffee, // aqua
        0x6633ff, // purple
        0x9966ff, // lavender purple
        0x330066  // dark purple
    ];

    function randColor() {
        return bgColors[Math.floor(Math.random() * bgColors.length)];
    }

    for (let i = 0; i < 11; i++) {
        const radius = 3 + Math.random() * 4;
        const planetGeom = new THREE.SphereGeometry(radius, 32, 32);
        const planetMat = new THREE.MeshStandardMaterial({
            color: randColor(),
            metalness: 0.4,
            roughness: 0.7
        });

        const planet = new THREE.Mesh(planetGeom, planetMat);
        const pos = randomOutsideBox(150);
        planet.position.set(
            pos.x,
            pos.y,
            -40 - Math.random() * 200
        );
        scene.add(planet);
    }
}
