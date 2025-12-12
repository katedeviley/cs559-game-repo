// main.js
// @ts-check
import * as THREE from 'three';
import { loadPrototypeMode, drawBounds} from './prototype.js';
import { updateObjects, updateUFOs, loadFullMode, updateBounds, drawFragments, updateFragments, drawMusic, updateMusic} from './fullmode.js';
export let scene, camera, renderer;

// High score 
let highScore = parseInt(localStorage.getItem("highScore")) || 0;
document.getElementById("highscore").textContent = "High Score: " + highScore;

// Game state variables 
let fullMode = false;
let shipHP = 100;
let score = 0;
let gameOver = false;
let gameStarted = false;
let cooldownOn = false; 
const shipHitRadius = 1;

// Ship movement
let mouseX = 0, mouseY = 0;
const bound = 25;
const keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false };

// Game Elements
let ship, rocks, drones, enemyShips, ufos, boundsBox;
let enemyBullets = [], droneBullets = [], shipBullets = [], laserBeams = [];

// Messages
const hitMessage = document.getElementById("hitMessage");
const difficulty = document.getElementById("difficulty");
const loss = document.getElementById("pointLoss");
const gain = document.getElementById("pointGain");

// Level message
let mediumShown = false, hardShown = false;

// Audio 
let audioContext, analyser, dataArray;
let currentSourceNode = null;
let audioReady = false;
const checkbox1 = document.getElementById("checkbox1");
const checkbox2 = document.getElementById("checkbox2");
const checkbox3 = document.getElementById("checkbox3");

// Settings Tab
const ui = document.getElementById("ui");
const uiToggle = document.getElementById("uiToggle");

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
    ({ ship, rocks, drones, enemyShips, ufos, boundsBox } = loadPrototypeMode());
    updateCamera();

    // --- Lighting ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); 
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffEF, 1);
    directionalLight.position.set(0, 10, 10);
    directionalLight.lookAt(ship);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // -- Display Level & Instructions --
    difficulty.style.display = "block";
    setTimeout(() => { 
        difficulty.style.display = "none";
     }, 6000);

    // --- Mouse listener ---
    function blurActiveElement() {
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
    }
    window.addEventListener("keydown", (e) => {
        // Start the game when Space or Enter pressed (only if not started)
        if (!gameStarted && e.code === "Space") {
            const s = document.getElementById("arcadeStartScreen");
            if (s) s.style.display = "none";
            blurActiveElement();
            toggleSettings();
            return;
        }

        if (e.code === "Enter") {
            toggleSettings();
        }

        // Movement keys
        if (keys.hasOwnProperty(e.key)) keys[e.key] = true;

        // Shooting while game is started
        if (gameStarted && e.code === "Space" && canShoot) {
            shootBullet();
            canShoot = false;
            setTimeout(() => canShoot = true, 200); // fire rate limit
        }
    });

    window.addEventListener("keyup", (e) => {
        if (keys.hasOwnProperty(e.key)) keys[e.key] = false;
    });

    window.addEventListener("mousemove", (e) => {
        mouseX = -(e.clientX / window.innerWidth) * 2 + 1;
        mouseY = (e.clientY / window.innerHeight) * 2 - 1;
    });

    // -- Buttons -- 
    document.getElementById("restartButton").addEventListener("click", () => {
        location.reload();
    });

    document.getElementById("modeButton").addEventListener("click", () => {
        for (let i = scene.children.length - 1; i >= 0; i--) {
            const obj = scene.children[i];
            if (!(obj.isLight)) { 
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) {
                    if (Array.isArray(obj.material)) {
                        obj.material.forEach(mat => mat.dispose());
                    } else {
                        obj.material.dispose();
                    }
                }
                scene.remove(obj);
            }
        }

        fullMode = !fullMode;
    
        if (fullMode) {
            ({ ship, rocks, drones, enemyShips, ufos } = loadFullMode());
            boundsBox = drawBounds(25);
            document.getElementById("modeButton").textContent = "PROTOTYPE MODE";
            document.getElementById("modeButton").style.padding = "8px 8px";
            updateCamera();
        } else {
            ({ ship, rocks, drones, enemyShips, ufos, boundsBox } = loadPrototypeMode());
            document.getElementById("modeButton").textContent = "FULL MODE";
            document.getElementById("modeButton").style.padding = "8px 41px";
            updateCamera();
        }
    });

    uiToggle.addEventListener("click", toggleSettings);

    function toggleSettings() {
        ui.classList.toggle("open");
        uiToggle.classList.toggle("open");
        blurActiveElement(); 
        
        if (ui.classList.contains("open")) {
        uiToggle.textContent = "Settings ▼";
        gameStarted = false;
        } else {
        uiToggle.textContent = "Settings ▲";
        gameStarted = true;
        }
    }

    // -- Audio --
    document.getElementById("songPicker").addEventListener("change", async function(e) {
        checkbox1.checked = false;
        checkbox2.checked = false;
        checkbox3.checked = false;
        playAudio(e.target.files[0]); 
    });

    checkbox1.addEventListener('change', async function() {
        if (checkbox1.checked) {
            checkbox2.checked = false;
            checkbox3.checked = false;
            playAudio( await fetch('./assets/songs/song1.mp3')); 
        }  else {
            try { currentSourceNode.stop(); } catch (err) {}
            currentSourceNode = null;
            scene.remove(boundsBox);
            boundsBox = drawBounds(25);
        }
        audioReady = false; 
    });

    checkbox2.addEventListener('change', async function() {
        if (checkbox2.checked) {
            checkbox1.checked = false;
            checkbox3.checked = false;
            playAudio( await fetch('./assets/songs/song2.mp3')); 
        } else {
            try { currentSourceNode.stop(); } catch (err) {}
            currentSourceNode = null;
            scene.remove(boundsBox);
            boundsBox = drawBounds(25);
        }
        audioReady = false; 
    });

    checkbox3.addEventListener('change', async function() {
        if (checkbox3.checked) {
            checkbox2.checked = false;
            checkbox1.checked = false;
            playAudio( await fetch('./assets/songs/song3.mp3')); 
        } else {
            try { currentSourceNode.stop(); } catch (err) {}
            currentSourceNode = null;
            scene.remove(boundsBox);
            boundsBox = drawBounds(25);
        }
        audioReady = false; 
    });

    animate();
}

async function playAudio(file) {
    if (!file) return;

    if (currentSourceNode){
        try { currentSourceNode.stop(); } catch (err) { /* ignore */ }
        currentSourceNode = null;
        audioReady = false; 
    }
    audioContext = new AudioContext();
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const sourceNode = audioContext.createBufferSource();
    sourceNode.buffer = audioBuffer;
    currentSourceNode = sourceNode; 
    analyser = audioContext.createAnalyser(); 
    analyser.fftSize = 512;
    const bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);
    sourceNode.connect(analyser);
    analyser.connect(audioContext.destination);
    sourceNode.start();
    audioReady = true; 
}

function updateHighScore(s) {
    if (s > highScore) {
        highScore = s;
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

    const offsetDistance = 10;  
    const height = 0;         
    const sensitivity = 7;     

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
    let shipDistance = Math.sqrt(ship.position.x ** 2 + ship.position.y ** 2);
    if (gameStarted && audioReady && boundsBox && analyser && dataArray) {
        const edgeDistance = updateBounds(analyser, dataArray, boundsBox, bound);
        if (edgeDistance && ship && gameStarted) {

            if (shipDistance < edgeDistance) {
                // inside bounds
                if (keys.ArrowUp) ship.position.y += 0.2;
                if (keys.ArrowDown) ship.position.y -= 0.2;
                if (keys.ArrowLeft) ship.position.x -= 0.2;
                if (keys.ArrowRight) ship.position.x += 0.2;
            } else {
                // outside bounds
                boundsBox.material.color.setHSL(0, 1, 0.5);
                const scale = (edgeDistance - 2) / shipDistance;
                ship.position.x *= scale;
                ship.position.y *= scale;
            
                shipHP -= 5;
                shipHP = Math.max(shipHP, 0);
                loss.textContent = `-5 HP`;  
                loss.style.display = "block";
                setTimeout(() => { loss.style.display = "none"; }, 500);

                document.getElementById("hp").textContent = `Ship HP: ${shipHP}`;  
                hitMessage.textContent = "Out of Range";
                hitMessage.style.display = "block";
                setTimeout(() => { 
                    hitMessage.style.display = "none"; 
                    hitMessage.textContent = "Ship hit!";
                }, 500);
            }
        }
    }

    if (!audioReady && ship && gameStarted) {
         // inside bounds
        if (keys.ArrowUp && ship.position.y < bound) ship.position.y += 0.2;
        if (keys.ArrowDown && ship.position.y > -bound) ship.position.y -= 0.2;
        if (keys.ArrowLeft && ship.position.x > -bound) ship.position.x -= 0.2;
        if (keys.ArrowRight && ship.position.x < bound) ship.position.x += 0.2;
        // outside bounds
        if (ship.position.y >= bound|| ship.position.y <= -bound || 
            ship.position.x <= -bound || ship.position.x >= bound) { 
                const scale = (bound - 2) / shipDistance;
                ship.position.x = ship.position.x*scale;
                ship.position.y = ship.position.y*scale;
                boundsBox.material.color.setHSL(0, 1, 0.5);

                shipHP -= 5;
                shipHP = Math.max(shipHP, 0);
                loss.textContent = `-5 HP`;  
                loss.style.display = "block";
                setTimeout(() => { loss.style.display = "none"; }, 500);

                document.getElementById("hp").textContent = `Ship HP: ${shipHP}`;  
                hitMessage.textContent = "Out of Range";
                hitMessage.style.display = "block";
                setTimeout(() => { 
                    hitMessage.style.display = "none"; 
                    hitMessage.textContent = "Ship hit!";
                }, 500);
        } else boundsBox.material.color.setHSL(0.55, 0.0, 1.0);
    }

    if(audioReady && gameStarted) {
        drawMusic(ship);
        updateMusic();
    }

    // -- Camera --
    if( gameStarted == true) updateCamera();

    // -- Rock movement --
    for (let rock of rocks) {
        if (gameStarted == true) { rock.position.z += rock.userData.speed; }
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

            drawFragments(rock); // <-------------
            resetObject(rock);

        } else if (rock.position.z > camera.position.z + 2) {
            resetObject(rock);
        }
    }
    updateFragments(); 

    // -- Drone Movements --
    if (gameStarted == true) { droneBullets = updateObjects(ship, drones, droneBullets); }
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
        difficulty.textContent = `Level 2`;  
        difficulty.style.display = "block";
        mediumShown = true;
        setTimeout(() => { difficulty.style.display = "none"; }, 3000);
    }

    if ( score >= 100 ) {
        if (gameStarted == true) { enemyBullets = updateObjects(ship, enemyShips, enemyBullets, 0.6, 20); }
        for (let i = enemyBullets.length - 1; i >= 0; i--) {
            const b = enemyBullets[i];
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
                enemyBullets.splice(i, 1);
            }
        }
    }

    for (let enemyShip of enemyShips) {
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
    if (score >= 300 && !hardShown) {
        difficulty.textContent = `Level 3`;  
        difficulty.style.display = "block";
        hardShown = true;
        setTimeout(() => { difficulty.style.display = "none"; }, 3000);
    }

    if ( score >= 300 ) {
        if (gameStarted == true) { laserBeams = updateUFOs(ship, ufos, laserBeams); }

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
