// main.js
// @ts-nocheck
import * as THREE from 'three';
import { drawPrototypeShip, drawPrototypeRocks, drawPrototypeBounds, drawPrototypeDrone} from './prototype.js';

export let scene, camera, renderer;
let ship, rocks = [];
let drones, updateDrones;

// Game state variables
const shipHitRadius = 1;
let shipHP = 100;
const hpDisplay = document.getElementById("hp");

// ship movement state
let mouseX = 0, mouseY = 0;
const shipSpeed = 0.2;
const bound = 25;
const keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false };

function init() {
    // -- scene setup --
    scene = new THREE.Scene();

    // -- camera setup --
    camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
    camera.position.z = 10;

    // -- renderer setup --
    const canvas = document.getElementById("gameCanvas");
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize( window.innerWidth, window.innerHeight );
    document.body.appendChild( renderer.domElement );

    // -- Draw initial objects --
    ship = drawPrototypeShip();
    rocks = drawPrototypeRocks(50);
    drawPrototypeBounds(bound);
    ({ drones, updateDrones } = drawPrototypeDrone(5, ship));

    // --- Mouse listener ---
    window.addEventListener("keydown", (e) => {
        if (keys.hasOwnProperty(e.key)) keys[e.key] = true;
    });
    window.addEventListener("keyup", (e) => {
        if (keys.hasOwnProperty(e.key)) keys[e.key] = false;
    });

    window.addEventListener("mousemove", (e) => {
        mouseX = -(e.clientX / window.innerWidth) * 2 + 1;
        mouseY = (e.clientY / window.innerHeight) * 2 - 1;
    });

    animate();
}

function updateCamera() {
    if (!ship) return;

    const offsetDistance = 10;  // distance behind ship
    const height = 0;           // height above ship
    const sensitivity = 7;      // how far mouse moves camera

    const camX = ship.position.x;
    const camY = ship.position.y + mouseY * sensitivity;
    const camZ = ship.position.z + offsetDistance;

    camera.position.set(camX, camY + height, camZ);
    camera.lookAt(ship.position);
}

function resetRock(rock) {
    rock.position.z = -150; 
    rock.position.x = Math.random() * 50 - 25;
    rock.position.y = Math.random() * 50 - 25;
}

function animate() {
    requestAnimationFrame(animate);

    // -- Ship movement --
    if (ship) {
        if (keys.ArrowUp && ship.position.y < bound) ship.position.y += shipSpeed;
        if (keys.ArrowDown && ship.position.y > -bound) ship.position.y -= shipSpeed;
        if (keys.ArrowLeft && ship.position.x > -bound) ship.position.x -= shipSpeed;
        if (keys.ArrowRight && ship.position.x < bound) ship.position.x += shipSpeed;
    }
    updateCamera();

    // -- Rock movement --
    for (let rock of rocks) {
        rock.position.z += rock.userData.speed;

        // Check if rock reached the ship/camera
        const dx = rock.position.x - ship.position.x;
        const dy = rock.position.y - ship.position.y;
        const dz = rock.position.z - ship.position.z;
        const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);

         // Ship is hit
        if (distance < shipHitRadius) {
            shipHP -= 10;
            shipHP = Math.max(shipHP, 0);

            // update UI 
            hpDisplay.textContent = `Ship HP: ${shipHP}`;  
            hitMessage.style.display = "block";
            setTimeout(() => {
                hitMessage.style.display = "none";
            }, 500);

            resetRock(rock);

        } else if (rock.position.z > camera.position.z + 2) {
            resetRock(rock);
        }
    }

    // -- Drone Movements --
    // Update drones
    const bullets = updateDrones();

    // Check bullet collisions with ship
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        const distance = b.position.distanceTo(ship.position);
        if (distance < 1) {
            shipHP -= 5;
            hpDisplay.textContent = `Ship HP: ${shipHP}`;
            scene.remove(b);
            bullets.splice(i, 1);
        }
    }

    renderer.render(scene, camera);
}

init();
