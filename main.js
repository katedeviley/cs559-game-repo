// main.js
// @ts-nocheck
import * as THREE from 'three';
import { loadPrototypeMode} from './prototype.js';
import { updateObjects, updateUFOs, loadFullMode} from './fullmode.js';
export let scene, camera, renderer;

// high score
let highScore = parseInt(localStorage.getItem("highScore")) || 0;
document.getElementById("highscore").textContent = "High Score: " + highScore;

// Game state variables
let gameOver = false;
let gameStarted = false;
let shipHP = 100;
let score = 0;
let cooldownOn = false; 
const shipHitRadius = 1;

// Ship movement state
let mouseX = 0, mouseY = 0;
const shipSpeed = 0.2;
const bound = 25;
const keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false };

// Game Elements
let ship, rocks, drones, enemyShips, ufos;
let enemyBullets = [], droneBullets = [], shipBullets = [], laserBeams = [];

// Messages
const hitMessage = document.getElementById("hitMessage");
const difficulty = document.getElementById("difficulty");
const loss = document.getElementById("pointLoss");
const gain = document.getElementById("pointGain");

let mediumShown = false, hardShown = false;

function init() {
    let canShoot = true;

    // -- scene setup --
    scene = new THREE.Scene();

    // -- camera setup --
    camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
    camera.position.z = 10;

    // -- renderer setup --
    const canvas = document.getElementById("gameCanvas");
    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);;

    // -- Draw initial objects --
    ({ ship, rocks, drones, enemyShips, ufos } = loadPrototypeMode());

    // -- Display Level & Instructions --
    difficulty.style.display = "block";
    document.getElementById("instructions").style.display = "block";
    setTimeout(() => { 
        difficulty.style.display = "none";
        document.getElementById("instructions").style.display = "none";
     }, 3000);

    // --- Mouse listener ---
    window.addEventListener("keydown", (e) => {
        if (!gameStarted && (e.code === "Space" || e.code === "Enter")) {
            const s = document.getElementById("arcadeStartScreen");
            if (s) s.style.display = "none";
            gameStarted = true;
        }
    });

    window.addEventListener("keydown", (e) => {
        if (keys.hasOwnProperty(e.key)) keys[e.key] = true;
        if (!gameStarted) return;
        if (e.code === "Space" && canShoot) {
            shootBullet();
            canShoot = false;
            setTimeout(() => canShoot = true, 200);


            }
    });

    window.addEventListener("keyup", (e) => {
        if (keys.hasOwnProperty(e.key)) keys[e.key] = false;
    });

    window.addEventListener("mousemove", (e) => {
        mouseX = -(e.clientX / window.innerWidth) * 2 + 1;
        mouseY = (e.clientY / window.innerHeight) * 2 - 1;
    });

    document.getElementById("restartButton").addEventListener("click", () => {
        location.reload();
    });

    window.addEventListener("keydown", (e) => {
        if (keys.hasOwnProperty(e.key)) keys[e.key] = true;
        if (e.code === "Space" && canShoot) {
            shootBullet();
            canShoot = false;
            setTimeout(() => canShoot = true, 200); // fire rate limit
        }
    });

    animate();
}

function updateHighScore(score) {
    if (score > highScore) {
        highScore = score;
        localStorage.setItem("highScore", highScore);
        document.getElementById("highscore").textContent = "High Score: " + highScore;
    }
}

function shootBullet() {
    if (!ship) return;

    const bulletGeo = new THREE.SphereGeometry(0.15, 6, 6);
    const bulletMat = new THREE.MeshBasicMaterial({ color: "lime" });
    const bullet = new THREE.Mesh(bulletGeo, bulletMat);

    bullet.position.copy(ship.position);
    bullet.userData.speed = 0.6;
    bullet.userData.direction = new THREE.Vector3(0, 0, -1); 
    scene.add(bullet);
    shipBullets.push(bullet);
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

function resetObject(object) {
    object.position.set(
        Math.random() * 50 - 25,
        Math.random() * 50 - 25,
        -200
    );
}

function gameEnd() {
    gameOver = true;
    ship = null;
    document.getElementById("end").style.display = "block";
    if (score >= highScore) document.getElementById("highScoreMessage").style.display = "block";
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
        if (gameStarted == true) { rock.position.z += rock.userData.speed; }

        // Check if rock reached the ship/camera
        const dx = rock.position.x - ship.position.x;
        const dy = rock.position.y - ship.position.y;
        const dz = rock.position.z - ship.position.z;
        const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);

         // Ship is hit
        if (distance < rock.userData.radius) {
            shipHP -= 10;
            shipHP = Math.max(shipHP, 0);
            if (shipHP <= 0 && !gameOver) {
                gameEnd();
            }

            loss.textContent = `-10 HP`;  
            loss.style.display = "block";
            setTimeout(() => { loss.style.display = "none"; }, 500);

            document.getElementById("hp").textContent = `Ship HP: ${shipHP}`;  
            hitMessage.style.display = "block";
            setTimeout(() => { hitMessage.style.display = "none"; }, 500);

            resetObject(rock);

        } else if (rock.position.z > camera.position.z + 2) {
            resetObject(rock);
        }
    }

    // -- Drone Movements --
    if (gameStarted == true ) { droneBullets = updateObjects(ship, drones, droneBullets); }

    // Check bullet collisions with ship
    for (let i = droneBullets.length - 1; i >= 0; i--) {
        const b = droneBullets[i];
        const distance = b.position.distanceTo(ship.position);

        // Ship is hit
        if (distance < 1) {
            shipHP -= 5;
            shipHP = Math.max(shipHP, 0);
            if (shipHP <= 0 && !gameOver) {
                gameEnd();
            }

            loss.textContent = `-5 HP`;  
            loss.style.display = "block";
            setTimeout(() => { loss.style.display = "none"; }, 500);

            document.getElementById("hp").textContent = `Ship HP: ${shipHP}`;
            hitMessage.style.display = "block";
            setTimeout(() => { hitMessage.style.display = "none"; }, 150);

            scene.remove(b);
            droneBullets.splice(i, 1);
        }
    }

    for (let drone of drones) {
        // Check if drone reached the ship
        const dx = drone.position.x - ship.position.x;
        const dy = drone.position.y - ship.position.y;
        const dz = drone.position.z - ship.position.z;
        const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);

        // Ship is hit
        if (distance < shipHitRadius) {
            shipHP -= 20;
            shipHP = Math.max(shipHP, 0);
            if (shipHP <= 0 && !gameOver) {
                gameEnd();
            }

            loss.textContent = `-20 HP`;  
            loss.style.display = "block";
            setTimeout(() => { loss.style.display = "none"; }, 500);

            document.getElementById("hp").textContent = `Ship HP: ${shipHP}`;  
            hitMessage.style.display = "block";
            setTimeout(() => { hitMessage.style.display = "none"; }, 500);

            resetObject(drone);
        }
    }

    // -- Enemy ship movement --
    if (score >= 100 && !mediumShown) {
        difficulty.textContent = `Level: Medium`;  
        difficulty.style.display = "block";
        mediumShown = true;
        setTimeout(() => { difficulty.style.display = "none"; }, 3000);
    }

    if ( score >= 100 ) {
        if (gameStarted == true) { enemyBullets = updateObjects(ship, enemyShips, enemyBullets, 0.6, 20); }
        
        // Check bullet collisions with ship
        for (let i = enemyBullets.length - 1; i >= 0; i--) {
            const b = enemyBullets[i];
            const distance = b.position.distanceTo(ship.position);
            // Ship is hit
            if (distance < 1) {
                shipHP -= 15;
                shipHP = Math.max(shipHP, 0);
                if (shipHP <= 0 && !gameOver) {
                    gameEnd();
                }

                loss.textContent = `-15 HP`;  
                loss.style.display = "block";
                setTimeout(() => { loss.style.display = "none"; }, 500);

                document.getElementById("hp").textContent = `Ship HP: ${shipHP}`;
                hitMessage.style.display = "block";
                setTimeout(() => { hitMessage.style.display = "none"; }, 150);
                
                scene.remove(b);
                enemyBullets.splice(i, 1);
            }
        }
    }

    for (let enemyShip of enemyShips) {
        // Check if enemy ship reached the ship
        const dx = enemyShip.position.x - ship.position.x;
        const dy = enemyShip.position.y - ship.position.y;
        const dz = enemyShip.position.z - ship.position.z;
        const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);

        // Ship is hit
        if (distance < shipHitRadius) {
            shipHP -= 25;
            shipHP = Math.max(shipHP, 0);
            if (shipHP <= 0 && !gameOver) {
                gameEnd();
            }

            loss.textContent = `-20 HP`;  
            loss.style.display = "block";
            setTimeout(() => { loss.style.display = "none"; }, 500);

            document.getElementById("hp").textContent = `Ship HP: ${shipHP}`;  
            hitMessage.style.display = "block";
            setTimeout(() => { hitMessage.style.display = "none"; }, 500);

            resetObject(enemyShip);
        }
    }

    // -- UFO Movement --
    if (score >= 500 && !hardShown) {
        difficulty.textContent = `Level: Hard`;  
        difficulty.style.display = "block";
        mediumShown = true;
        setTimeout(() => { difficulty.style.display = "none"; }, 3000);
    }

    if ( score >= 300 ) {
        if (gameStarted == true) { laserBeams = updateUFOs(ship, ufos, laserBeams); }

        // Check laser collisions with ship
        for (let i = 0; i < ufos.length; i++) {
            const beam = ufos[i];

            const beamProjected = new THREE.Vector3(beam.position.x, beam.position.y, ship.position.z);
            const dist = ship.position.distanceTo(beamProjected);
    
            if (dist < 1.2 && !cooldownOn) {  
                shipHP -= 5; 
                shipHP = Math.max(0, shipHP);
    
                if (shipHP <= 0 && !gameOver) gameEnd();
    
                loss.textContent = `-5 HP`;  
                loss.style.display = "block";
                setTimeout(() => { loss.style.display = "none"; }, 500);

                document.getElementById("hp").textContent = `Ship HP: ${shipHP}`;
                hitMessage.style.display = "block";
                setTimeout(() => { hitMessage.style.display = "none"; }, 150);
                
                cooldownOn = true;
                setTimeout(() => { cooldownOn = false; }, 500);
                break;
            }
        }
    }

    // -- Ship Bullets Movement --
    for (let i = shipBullets.length - 1; i >= 0; i--) {
        const b = shipBullets[i];
    
        b.position.addScaledVector(b.userData.direction, b.userData.speed);
    
        // Remove far away bullets
        if (b.position.z < -190) {
            scene.remove(b);
            shipBullets.splice(i, 1);
            continue;
        }
    
        // Collision with drones
        for (let j = drones.length - 1; j >= 0; j--) {
            const d = drones[j];
            if (b.position.distanceTo(d.position) < 1) {
                scene.remove(b);
                shipBullets.splice(i, 1);
                resetObject(d);

                score += 10;
                updateHighScore(score);
                document.getElementById("score").textContent = `Score: ${score}`;
                gain.textContent = `+10 Points`;  
                gain.style.display = "block";
                setTimeout(() => { gain.style.display = "none"; }, 500);
                break;
            }
        }

        // Collision with enemy ships
        for (let j = enemyShips.length - 1; j >= 0; j--) {
            const es = enemyShips[j];
            if (b.position.distanceTo(es.position) < 1) {
                scene.remove(b);
                shipBullets.splice(i, 1);
                resetObject(es);

                score += 50;
                updateHighScore(score);
                document.getElementById("score").textContent = `Score: ${score}`;
                gain.textContent = `+50 Points`;  
                gain.style.display = "block";
                setTimeout(() => { gain.style.display = "none"; }, 500);
                break;
            }
        }
    }
    renderer.render(scene, camera);
}

init();
