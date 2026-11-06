let audioCtx = null;
let analyser = null;
let sourceNode = null;
let dataArray = null;

let isPlaying = false;
let isCountingDown = false;
let score = 0;
let combo = 0;
let multiplier = 1;
let notes = [];
let noteSpeed = 5;
let lastBeatTime = 0;

const keyMap = { 'd': 0, 'f': 1, 'j': 2, 'k': 3 };

// Elementos DOM
const videoEl = document.getElementById('bg-video');
const overlayEl = document.getElementById('video-overlay');
const fileInput = document.getElementById('audio-file-input');
const fileInputModal = document.getElementById('audio-file-input-modal');
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const resumeBtn = document.getElementById('resume-btn');
const restartBtn = document.getElementById('restart-btn');
const pauseModal = document.getElementById('pause-modal');
const volumeSlider = document.getElementById('volume-slider');
const opacitySlider = document.getElementById('opacity-slider');
const scoreDisplay = document.getElementById('score-display');
const comboDisplay = document.getElementById('combo-display');
const multiplierDisplay = document.getElementById('multiplier-display');
const trackNameDisplay = document.getElementById('track-name');
const hitFeedback = document.getElementById('hit-feedback');
const countdownDisplay = document.getElementById('countdown-display');
const tracks = [
    document.querySelector('[data-track="0"]'),
    document.querySelector('[data-track="1"]'),
    document.querySelector('[data-track="2"]'),
    document.querySelector('[data-track="3"]')
];

// 1. Control de Volumen y Opacidad
videoEl.volume = volumeSlider.value;
volumeSlider.addEventListener('input', (e) => {
    videoEl.volume = e.target.value;
});

opacitySlider.addEventListener('input', (e) => {
    overlayEl.style.opacity = e.target.value;
});

// 2. Carga de archivo audiovisual por el usuario
function handleFileSelect(file) {
    if (!file) return;

    // Si hay un juego activo, pausar y limpiar estado anterior
    resetGameState();

    const url = URL.createObjectURL(file);
    trackNameDisplay.textContent = file.name;

    videoEl.src = url;
    videoEl.load();

    videoEl.onloadedmetadata = () => {
        videoEl.currentTime = 0.1;
    };

    if (file.type.startsWith('video/')) {
        videoEl.style.display = 'block';
    } else {
        videoEl.style.display = 'none';
    }

    pauseModal.classList.add('hidden');
}

fileInput.addEventListener('change', (e) => handleFileSelect(e.target.files[0]));
fileInputModal.addEventListener('change', (e) => handleFileSelect(e.target.files[0]));

// 3. Conexión Web Audio API
function setupAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    if (!sourceNode) {
        try {
            analyser = audioCtx.createAnalyser();
            analyser.fftSize = 128;
            sourceNode = audioCtx.createMediaElementSource(videoEl);
            sourceNode.connect(analyser);
            analyser.connect(audioCtx.destination);
            dataArray = new Uint8Array(analyser.frequencyBinCount);
        } catch (err) {
            console.log("Audio node ya inicializado:", err);
        }
    }
}

// 4. Iniciar / Pausar / Reanudar / Reiniciar
startBtn.addEventListener('click', () => {
    if (!videoEl.src) {
        alert("Por favor sube un archivo de audio o video primero.");
        return;
    }

    if (isPlaying || isCountingDown) return;

    setupAudio();
    startBtn.disabled = true;
    startCountdown();
});

pauseBtn.addEventListener('click', pauseGame);
resumeBtn.addEventListener('click', resumeGame);
restartBtn.addEventListener('click', restartGame);

function pauseGame() {
    if (!isPlaying) return;
    videoEl.pause();
    isPlaying = false;
    pauseModal.classList.remove('hidden');
    startBtn.disabled = false;
    pauseBtn.disabled = true;
}

function resumeGame() {
    pauseModal.classList.add('hidden');
    startCountdown();
}

function restartGame() {
    pauseModal.classList.add('hidden');
    resetGameState();
    videoEl.currentTime = 0;
    startCountdown();
}

function resetGameState() {
    isPlaying = false;
    isCountingDown = false;
    videoEl.pause();

    // Limpiar notas en pantalla
    notes.forEach(note => note.element.remove());
    notes = [];

    // Reset de puntaje y combos
    score = 0;
    combo = 0;
    multiplier = 1;
    scoreDisplay.textContent = '000000';
    comboDisplay.textContent = '0';
    multiplierDisplay.textContent = 'x1';

    startBtn.disabled = false;
    pauseBtn.disabled = true;
}

// 5. Cuenta Regresiva (3, 2, 1)
function startCountdown() {
    isCountingDown = true;
    let count = 3;

    countdownDisplay.textContent = count;
    countdownDisplay.classList.add('show');

    const interval = setInterval(() => {
        count--;

        if (count > 0) {
            countdownDisplay.textContent = count;
        } else if (count === 0) {
            countdownDisplay.textContent = '¡GO!';
        } else {
            clearInterval(interval);
            countdownDisplay.classList.remove('show');
            isCountingDown = false;
            startGameplay();
        }
    }, 1000);
}

// Iniciar Reproducción
async function startGameplay() {
    try {
        videoEl.muted = false;
        await videoEl.play();
        isPlaying = true;
        pauseBtn.disabled = false;
        startBtn.disabled = true;
        requestAnimationFrame(gameLoop);
    } catch (err) {
        console.error("Error al reproducir:", err);
        startBtn.disabled = false;
        alert("Haz clic e intenta iniciar nuevamente.");
    }
}

// 6. Analizador de Audio y Generación de Notas
function analyzeBeat() {
    if (!isPlaying) return;

    let isBeat = false;
    const now = performance.now();

    if (analyser && dataArray) {
        analyser.getByteFrequencyData(dataArray);

        let bassSum = 0;
        for (let i = 0; i < 6; i++) {
            bassSum += dataArray[i];
        }
        let bassAvg = bassSum / 6;

        if (bassAvg > 130 && (now - lastBeatTime > 350)) {
            isBeat = true;
        }
    }

    if (!isBeat && (now - lastBeatTime > 600)) {
        isBeat = true;
    }

    if (isBeat) {
        lastBeatTime = now;
        generateNotesPattern();
    }
}

function generateNotesPattern() {
    const diff = document.getElementById('difficulty-select').value;
    const maxNotes = (diff === 'easy') ? 1 : 2;
    const count = Math.floor(Math.random() * maxNotes) + 1;

    const availableTracks = [0, 1, 2, 3];
    for (let i = 0; i < count; i++) {
        const randomIndex = Math.floor(Math.random() * availableTracks.length);
        const trackIndex = availableTracks.splice(randomIndex, 1)[0];
        createNote(trackIndex);
    }
}

function createNote(trackIndex) {
    const noteEl = document.createElement('div');
    noteEl.className = `note track-${trackIndex}`;
    noteEl.style.top = '0px';

    tracks[trackIndex].appendChild(noteEl);

    notes.push({
        element: noteEl,
        track: trackIndex,
        y: 0,
        hit: false
    });
}

// 7. Bucle Principal
function gameLoop() {
    if (!isPlaying) return;

    analyzeBeat();
    updateNotes();

    requestAnimationFrame(gameLoop);
}

function updateNotes() {
    const highwayHeight = tracks[0].clientHeight;
    const hitZoneY = highwayHeight - 80;

    for (let i = notes.length - 1; i >= 0; i--) {
        const note = notes[i];
        note.y += noteSpeed;
        note.element.style.top = note.y + 'px';

        if (note.y > hitZoneY + 50 && !note.hit) {
            showFeedback('MISS', 'miss');
            resetCombo();
            note.element.remove();
            notes.splice(i, 1);
        }
    }
}

// 8. Eventos de Entrada
window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();

    if (key === 'escape' || key === 'p') {
        if (isPlaying) pauseGame();
        else if (!pauseModal.classList.contains('hidden')) resumeGame();
    }

    if (keyMap.hasOwnProperty(key)) {
        triggerHit(keyMap[key]);
    }
});

tracks.forEach((track, index) => {
    track.addEventListener('pointerdown', () => {
        triggerHit(index);
    });
});

function triggerHit(trackIndex) {
    if (!isPlaying) return;

    const hitZone = document.getElementById(`key-${trackIndex}`);
    hitZone.classList.add('active');
    setTimeout(() => hitZone.classList.remove('active'), 100);

    const highwayHeight = tracks[0].clientHeight;
    const hitZoneY = highwayHeight - 80;

    const noteIndex = notes.findIndex(n => n.track === trackIndex && !n.hit && Math.abs(n.y - hitZoneY) < 60);

    if (noteIndex !== -1) {
        const note = notes[noteIndex];
        const distance = Math.abs(note.y - hitZoneY);

        if (distance < 20) {
            addScore(300);
            showFeedback('PERFECT!', 'perfect');
        } else {
            addScore(100);
            showFeedback('GREAT', 'great');
        }

        note.hit = true;
        note.element.remove();
        notes.splice(noteIndex, 1);
    }
}

function addScore(basePoints) {
    combo++;
    if (combo % 10 === 0 && multiplier < 4) {
        multiplier++;
    }
    score += basePoints * multiplier;

    scoreDisplay.textContent = score.toString().padStart(6, '0');
    comboDisplay.textContent = combo;
    multiplierDisplay.textContent = `x${multiplier}`;
}

function resetCombo() {
    combo = 0;
    multiplier = 1;
    comboDisplay.textContent = combo;
    multiplierDisplay.textContent = `x${multiplier}`;
}

function showFeedback(text, type) {
    hitFeedback.textContent = text;
    hitFeedback.className = `hit-feedback show ${type}`;
    setTimeout(() => {
        hitFeedback.classList.remove('show');
    }, 300);
}