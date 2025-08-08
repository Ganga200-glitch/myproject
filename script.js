// Game Configuration
const CONFIG = {
    beeCount: 25,
    honeycombRows: 5,
    honeycombCols: 5,
    gameDuration: 180, // 3 minutes in seconds
};

// Game State
let gameState = {
    bees: [],
    holes: [],
    matchedBees: 0,
    timeRemaining: CONFIG.gameDuration,
    gameStarted: false,
    gameEnded: false,
    slingshotActive: false,
    slingshotTimer: null
};

// Audio Elements
const audio = {
    background: new Audio('./assets/sounds/background_buzz.mp3'),
    vibration: new Audio('./assets/sounds/bee_vibration.mp3'),
    flyAway: new Audio('./assets/sounds/fly_away.mp3'),
    slingshot: new Audio('./assets/sounds/slingshot.mp3')
};

// DOM Elements
const elements = {
    modal: document.getElementById('disclaimerModal'),
    acceptBtn: document.getElementById('acceptBtn'),
    gameContainer: document.getElementById('gameContainer'),
    gameArea: document.getElementById('gameArea'),
    honeycombContainer: document.getElementById('honeycombContainer'),
    beesContainer: document.getElementById('beesContainer'),
    timer: document.getElementById('timer'),
    escapeBtn: document.getElementById('escapeBtn'),
    endScreen: document.getElementById('end-screen'),
    endScreenContent: document.querySelector('#end-screen .end-screen-content p'),
    slingshot: null,
    stone: null
};

// Initialize Game
function initGame() {
    elements.acceptBtn.addEventListener('click', startGame);
    elements.escapeBtn.addEventListener('click', endGame);
    // Hide escape button initially
    elements.escapeBtn.classList.add('hidden');
}

// Start Game
async function startGame() {
    elements.modal.classList.add('hidden');
    elements.gameContainer.classList.remove('hidden');

    createHoneycomb();
    createBees();
    startTimer();
    playBackgroundSound();

    gameState.gameStarted = true;
    startSlingshotTimer();
}

// Create Honeycomb
function createHoneycomb() {
    elements.honeycombContainer.innerHTML = '';
    const totalCells = CONFIG.honeycombRows * CONFIG.honeycombCols;

    for (let i = 0; i < totalCells; i++) {
        const cell = document.createElement('div');
        cell.className = 'honeycomb-cell';
        cell.dataset.id = i;

        elements.honeycombContainer.appendChild(cell);
        gameState.holes.push(cell);
    }
}

// Create Bees
function createBees() {
    for (let i = 0; i < CONFIG.beeCount; i++) {
        const bee = createBee(i);
        elements.beesContainer.appendChild(bee);
        gameState.bees.push(bee);
        animateBee(bee);
    }
}

// Create Individual Bee
function createBee(id) {
    const bee = document.createElement('div');
    bee.className = 'bee';
    bee.dataset.id = id;
    bee.dataset.holeId = -1; // -1 for not in a hole yet

    // Create bee structure with emotions
    const emotions = ['happy', 'angry', 'excited', 'sleepy', 'curious'];
    const emotion = emotions[Math.floor(Math.random() * emotions.length)];
    bee.dataset.emotion = emotion;

    let message = '';
    switch (emotion) {
        case 'happy':
            message = 'Hooray!';
            break;
        case 'angry':
            message = '<b>Leave me alone!</b>';
            break;
        case 'excited':
            message = 'Let\'s go!';
            break;
        case 'sleepy':
            message = 'zzzz...';
            break;
        case 'curious':
            message = 'What\'s this?';
            break;
    }

    bee.innerHTML = `
        <div class="bee-message">${message}</div>
        <div class="bee-body ${emotion === 'angry' ? 'angry' : ''} bee-${emotion}">
            <div class="bee-face">
                <div class="bee-eyes">
                    <div class="bee-eye left"></div>
                    <div class="bee-eye right"></div>
                </div>
                <div class="bee-mouth"></div>
            </div>
            <div class="bee-stripes"></div>
        </div>
        <div class="bee-wings">
            <div class="bee-wing left"></div>
            <div class="bee-wing right"></div>
        </div>
    `;

    // Position bee randomly on the screen
    gsap.set(bee, {
        x: Math.random() * (window.innerWidth - 100) + 50,
        y: Math.random() * (window.innerHeight - 200) + 50
    });

    // Make draggable
    makeDraggable(bee);

    return bee;
}

// Animate Bee Movement
function animateBee(bee) {
    if (bee.dataset.state === 'inserted' || bee.dataset.state === 'flyingAway') return;

    const duration = Math.random() * 5 + 5; // 5-10 seconds
    const endX = Math.random() * window.innerWidth;
    const endY = Math.random() * (window.innerHeight - 200) + 50; // Avoid honeycomb area

    gsap.to(bee, {
        duration: duration,
        x: endX,
        y: endY,
        ease: "power1.inOut",
        onComplete: () => {
            // Keep the bee on screen and animate it again
            animateBee(bee);
        }
    });
}

// Make Element Draggable
function makeDraggable(element) {
    let isDragging = false;
    let startX, startY;
    
    // Listen for mouse down or touch start
    element.addEventListener('mousedown', startDrag);
    element.addEventListener('touchstart', startDrag);
    
    function startDrag(e) {
        if (gameState.gameEnded || element.dataset.state === 'inserted') return;

        isDragging = true;
        element.classList.add('dragging');
        
        // Pause flying animation
        gsap.killTweensOf(element);

        // Update audio to reflect dragging
        audio.vibration.currentTime = 0;
        audio.vibration.play();
        audio.vibration.loop = true;
        
        const clientX = e.clientX || e.touches[0].clientX;
        const clientY = e.clientY || e.touches[0].clientY;
        
        // Store initial mouse/touch position
        startX = clientX;
        startY = clientY;
        
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', stopDrag);
        document.addEventListener('touchmove', drag);
        document.addEventListener('touchend', stopDrag);
    }
    
    function drag(e) {
        if (!isDragging) return;
        
        e.preventDefault();
        
        const clientX = e.clientX || e.touches[0].clientX;
        const clientY = e.clientY || e.touches[0].clientY;
        
        const deltaX = clientX - startX;
        const deltaY = clientY - startY;

        // Use GSAP to move the bee smoothly
        gsap.set(element, { x: `+=${deltaX}`, y: `+=${deltaY}` });

        // Update starting position for next drag event
        startX = clientX;
        startY = clientY;
    }
    
    function stopDrag() {
        if (!isDragging) return;
        
        isDragging = false;
        element.classList.remove('dragging');
        
        audio.vibration.pause();
        audio.vibration.loop = false;

        const rect = element.getBoundingClientRect();
        const beeCenterX = rect.left + rect.width / 2;
        const beeCenterY = rect.top + rect.height / 2;
        
        let targetHole = null;
        let minDistance = Infinity;

        gameState.holes.forEach(hole => {
            if (!hole.classList.contains('filled')) {
                const holeRect = hole.getBoundingClientRect();
                const distance = Math.sqrt(
                    Math.pow(beeCenterX - (holeRect.left + holeRect.width / 2), 2) + 
                    Math.pow(beeCenterY - (holeRect.top + holeRect.height / 2), 2)
                );

                if (distance < minDistance) {
                    minDistance = distance;
                    targetHole = hole;
                }
            }
        });

        if (targetHole && minDistance < 50) {
            insertBeeIntoHole(element, targetHole);
        } else {
            // Resume flying animation if not dropped in a hole
            animateBee(element);
        }
        
        document.removeEventListener('mousemove', drag);
        document.removeEventListener('mouseup', stopDrag);
        document.removeEventListener('touchmove', drag);
        document.removeEventListener('touchend', stopDrag);
    }
}

// Insert Bee into Hole
function insertBeeIntoHole(bee, hole) {
    bee.dataset.state = 'inserted';
    bee.dataset.holeId = hole.dataset.id;
    
    const holeRect = hole.getBoundingClientRect();
    const gameAreaRect = elements.gameArea.getBoundingClientRect();

    gsap.to(bee, {
        duration: 0.8,
        x: holeRect.left - gameAreaRect.left + (hole.offsetWidth / 2) - (bee.offsetWidth / 2),
        y: holeRect.top - gameAreaRect.top + (hole.offsetHeight / 2) - (bee.offsetHeight / 2),
        scale: 0.6,
        ease: "back.out(1.7)",
        onComplete: () => {
            navigator.vibrate && navigator.vibrate(100);
            audio.vibration.currentTime = 0;
            audio.vibration.play();
            
            hole.classList.add('filled');
            
            // To maintain a clean DOM, we remove the bee
            // but the bee object still exists in the gameState.bees array
            // It will be re-added if the slingshot hits it
            bee.remove();
            
            gameState.matchedBees++;
            if (gameState.matchedBees >= CONFIG.beeCount) {
                endGame();
            }
        }
    });
}

// Slingshot Logic
function startSlingshotTimer() {
    if (gameState.gameEnded) return;

    const randomTime = Math.random() * 15000 + 10000; // 10-25 seconds
    gameState.slingshotTimer = setTimeout(triggerSlingshot, randomTime);
}

function triggerSlingshot() {
    if (gameState.gameEnded || gameState.slingshotActive) return;

    const filledHoles = gameState.holes.filter(h => h.classList.contains('filled'));

    if (filledHoles.length > 0) {
        gameState.slingshotActive = true;
        createSlingshot();

        const targetHole = filledHoles[Math.floor(Math.random() * filledHoles.length)];
        throwStone(targetHole);
    } else {
        // If no bees are home, restart timer with a short delay
        gameState.slingshotActive = false;
        setTimeout(() => {
            if (!gameState.gameEnded) startSlingshotTimer();
        }, 5000);
    }
}

function createSlingshot() {
    elements.slingshot = document.createElement('div');
    elements.slingshot.className = 'slingshot';
    elements.gameArea.appendChild(elements.slingshot);

    gsap.fromTo(elements.slingshot, { opacity: 0, bottom: -150 }, {
        duration: 1,
        opacity: 1,
        bottom: 0,
        ease: "bounce.out"
    });
}

function throwStone(targetHole) {
    elements.stone = document.createElement('div');
    elements.stone.className = 'stone';
    elements.gameArea.appendChild(elements.stone);

    const slingshotRect = elements.slingshot.getBoundingClientRect();
    const targetRect = targetHole.getBoundingClientRect();

    gsap.set(elements.stone, {
        x: slingshotRect.left + (slingshotRect.width / 2),
        y: slingshotRect.top - 20
    });

    audio.slingshot.play();

    gsap.to(elements.stone, {
        duration: 0.8,
        x: targetRect.left + (targetRect.width / 2),
        y: targetRect.top + (targetRect.height / 2),
        scale: 0.5,
        rotation: 360,
        ease: "power1.in",
        onComplete: () => {
            elements.stone.remove();
            slingshotDamage(targetHole);
        }
    });
}

function slingshotDamage(hole) {
    hole.classList.remove('filled');
    
    // Find the bee object that was in this hole
    const bee = gameState.bees.find(b => parseInt(b.dataset.holeId) === parseInt(hole.dataset.id));

    if (bee) {
        flyAwayBee(bee);
        gameState.matchedBees--;
    }

    gsap.to(hole, {
        duration: 0.5,
        rotation: 10,
        yoyo: true,
        repeat: 3,
        ease: "power1.inOut",
        onComplete: () => {
            removeSlingshot();
            if (!gameState.gameEnded) startSlingshotTimer();
        }
    });
}

function flyAwayBee(bee) {
    if (!bee || bee.dataset.state === 'flyingAway') return;

    bee.dataset.state = 'flyingAway';
    elements.beesContainer.appendChild(bee); // Bring back to bee container

    audio.flyAway.play();

    gsap.to(bee, {
        duration: 2,
        x: window.innerWidth + 100,
        y: '-=100',
        rotation: 360,
        opacity: 0,
        ease: "power1.in",
        onComplete: () => {
            // Remove the old bee from the state array and add a new one
            const beeIndex = gameState.bees.findIndex(b => b.dataset.id === bee.dataset.id);
            if (beeIndex !== -1) {
                gameState.bees.splice(beeIndex, 1);
            }
            bee.remove();

            const newBee = createBee(Math.floor(Math.random() * 1000)); // New random ID
            elements.beesContainer.appendChild(newBee);
            gameState.bees.push(newBee);
            animateBee(newBee);
        }
    });
}

function removeSlingshot() {
    gsap.to(elements.slingshot, {
        duration: 1,
        bottom: -150,
        ease: "power1.in",
        onComplete: () => {
            if (elements.slingshot) {
                elements.slingshot.remove();
                elements.slingshot = null;
            }
            gameState.slingshotActive = false;
        }
    });
}

// Timer Functions
function startTimer() {
    const timerInterval = setInterval(() => {
        if (gameState.gameEnded) {
            clearInterval(timerInterval);
            return;
        }

        gameState.timeRemaining--;
        
        const minutes = Math.floor(gameState.timeRemaining / 60);
        const seconds = gameState.timeRemaining % 60;
        elements.timer.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        if (gameState.timeRemaining <= 0) {
            clearInterval(timerInterval);
            endGame();
        }
    }, 1000);
}

// Audio Functions
function playBackgroundSound() {
    audio.background.volume = 0.3;
    audio.background.loop = true;
    audio.background.play().catch(() => {
        // Autoplay policy might block the audio, so we add a listener to start it on user interaction.
        document.addEventListener('click', () => {
            audio.background.play();
        }, { once: true });
    });
}

// End Game
function endGame() {
    if (gameState.gameEnded) return;

    gameState.gameEnded = true;
    clearTimeout(gameState.slingshotTimer); // Stop the slingshot timer
    gsap.killTweensOf('*'); // Stop all animations
    
    audio.background.pause();
    
    elements.endScreen.classList.remove('hidden');
    elements.endScreenContent.innerHTML = `You matched <b>${gameState.matchedBees}</b> bees!`;
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initGame);