let audioCtx = null;
let analyser = null;
let sourceNode = null;
let dataArray = null;

let hitsoundAudioBuffer = null;

let isPlaying = false;
let isCountingDown = false;
let isYouTubeMode = false;
let score = 0;
let combo = 0;
let multiplier = 1;
let notes = [];
let noteSpeed = 7.5; // Velocidad estándar ajustada a flujo normal agilizado
let currentFile = null;

let beatmap = [];
let songStartTime = 0;
let beatIndex = 0;
let hitsoundVolume = 0.7;

let selectedDensity = 'medium';

// Registro de teclas activas para mantener notas largas
const activeKeys = [false, false, false, false];

const controlSchemes = {
    arrows: {
        keys: { 'arrowleft': 0, 'arrowup': 1, 'arrowdown': 2, 'arrowright': 3 },
        labels: ['←', '↑', '↓', '→'],
        text: 'Flechas (←, ↑, ↓, →)'
    },
    wasd: {
        keys: { 'a': 0, 'w': 1, 's': 2, 'd': 3 },
        labels: ['A', 'W', 'S', 'D'],
        text: 'WASD (A, W, S, D)'
    }
};

let currentScheme = controlSchemes.arrows;

// Elementos DOM
const videoEl = document.getElementById('bg-video');
const ytFrame = document.getElementById('youtube-frame');
const overlayEl = document.getElementById('video-overlay');
const fileInput = document.getElementById('audio-file-input');
const fileInputModal = document.getElementById('audio-file-input-modal');
const fileInputFinish = document.getElementById('audio-file-input-finish');
const urlInput = document.getElementById('url-input');
const loadUrlBtn = document.getElementById('load-url-btn');

const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const closeSettingsBtn = document.getElementById('close-settings-btn');

const densityModal = document.getElementById('density-modal');
const densityBtns = document.querySelectorAll('.density-btn');
const confirmDensityBtn = document.getElementById('confirm-density-btn');

const controlsSelect = document.getElementById('controls-select');
const difficultySelect = document.getElementById('difficulty-select');
const controlsText = document.getElementById('controls-text');
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const resumeBtn = document.getElementById('resume-btn');
const restartBtn = document.getElementById('restart-btn');
const replayBtn = document.getElementById('replay-btn');
const pauseModal = document.getElementById('pause-modal');
const gameOverModal = document.getElementById('game-over-modal');
const analyzingDisplay = document.getElementById('analyzing-display');
const volumeSlider = document.getElementById('volume-slider');
const hitsoundVolumeSlider = document.getElementById('hitsound-volume-slider');
const opacitySlider = document.getElementById('opacity-slider');
const scoreDisplay = document.getElementById('score-display');
const finalScoreDisplay = document.getElementById('final-score-display');
const comboDisplay = document.getElementById('combo-display');
const multiplierDisplay = document.getElementById('multiplier-display');
const trackNameDisplay = document.getElementById('track-name');
const hitFeedback = document.getElementById('hit-feedback');
const countdownDisplay = document.getElementById('countdown-display');
const keyBinds = [
    document.querySelector('#key-0 .key-bind'),
    document.querySelector('#key-1 .key-bind'),
    document.querySelector('#key-2 .key-bind'),
    document.querySelector('#key-3 .key-bind')
];
const tracks = [
    document.querySelector('[data-track="0"]'),
    document.querySelector('[data-track="1"]'),
    document.querySelector('[data-track="2"]'),
    document.querySelector('[data-track="3"]')
];

function initAudioEngine() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    if (!hitsoundAudioBuffer) {
        prerenderHitsoundBuffer();
    }
}

function prerenderHitsoundBuffer() {
    const sampleRate = audioCtx.sampleRate;
    const duration = 0.08;
    const numSamples = Math.floor(sampleRate * duration);
    hitsoundAudioBuffer = audioCtx.createBuffer(1, numSamples, sampleRate);
    const data = hitsoundAudioBuffer.getChannelData(0);

    for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        const freq = 800 * Math.exp(-t * 24);
        const env = Math.exp(-t * 35);
        data[i] = Math.sin(2 * Math.PI * freq * t) * env;
    }
}

function playHitsound() {
    if (hitsoundVolume <= 0 || !hitsoundAudioBuffer) return;

    try {
        const source = audioCtx.createBufferSource();
        const gainNode = audioCtx.createGain();

        source.buffer = hitsoundAudioBuffer;
        gainNode.gain.value = hitsoundVolume * 0.7;

        source.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        source.start(0);
    } catch (err) {
        console.log("Error en hitsound:", err);
    }
}

densityBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        densityBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedDensity = btn.getAttribute('data-density');
    });
});

settingsBtn.addEventListener('click', () => {
    initAudioEngine();
    if (isPlaying) pauseGame();
    settingsModal.classList.remove('hidden');
});

closeSettingsBtn.addEventListener('click', () => {
    settingsModal.classList.add('hidden');
});

videoEl.addEventListener('ended', handleGameOver);

function handleGameOver() {
    isPlaying = false;
    finalScoreDisplay.textContent = score.toString().padStart(6, '0');
    gameOverModal.classList.remove('hidden');
    startBtn.disabled = false;
    pauseBtn.disabled = true;
}

controlsSelect.addEventListener('change', (e) => {
    currentScheme = controlSchemes[e.target.value];
    keyBinds.forEach((bindEl, i) => bindEl.textContent = currentScheme.labels[i]);
    controlsText.innerHTML = `Usa las teclas <strong>${currentScheme.text}</strong> o toca las casillas inferiores.`;
});

difficultySelect.addEventListener('change', updateSpeedByDifficulty);

// AJUSTE DE VELOCIDADES DE CAÍDA NORMALIZADAS Y ÁGILES
function updateSpeedByDifficulty() {
    const diff = difficultySelect.value;
    let baseSpeed = 7.5; // Normalización más rápida
    if (diff === 'easy') baseSpeed = 6.0;
    else if (diff === 'normal') baseSpeed = 7.5;
    else if (diff === 'hard') baseSpeed = 9.2;
    else if (diff === 'insane') baseSpeed = 11.0;
    else if (diff === 'god') baseSpeed = 13.0;

    noteSpeed = baseSpeed;
}

videoEl.volume = volumeSlider.value;
volumeSlider.addEventListener('input', (e) => videoEl.volume = e.target.value);
hitsoundVolumeSlider.addEventListener('input', (e) => hitsoundVolume = parseFloat(e.target.value));
opacitySlider.addEventListener('input', (e) => overlayEl.style.opacity = e.target.value);

function getYouTubeId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

function handleFileSelect(file) {
    if (!file) return;

    currentFile = file;
    resetGameState();
    isYouTubeMode = false;
    ytFrame.style.display = 'none';
    ytFrame.src = '';

    const url = URL.createObjectURL(file);
    trackNameDisplay.textContent = file.name;

    videoEl.crossOrigin = "anonymous";
    videoEl.src = url;
    videoEl.load();

    videoEl.onloadedmetadata = () => videoEl.currentTime = 0.1;
    videoEl.style.display = file.type.startsWith('video/') ? 'block' : 'none';

    pauseModal.classList.add('hidden');
    gameOverModal.classList.add('hidden');
}

fileInput.addEventListener('change', (e) => handleFileSelect(e.target.files[0]));
fileInputModal.addEventListener('change', (e) => handleFileSelect(e.target.files[0]));
fileInputFinish.addEventListener('change', (e) => handleFileSelect(e.target.files[0]));

loadUrlBtn.addEventListener('click', () => {
    const url = urlInput.value.trim();
    if (!url) {
        alert("Por favor ingresa una URL válida.");
        return;
    }

    currentFile = null;
    resetGameState();
    const ytId = getYouTubeId(url);

    if (ytId) {
        isYouTubeMode = true;
        videoEl.pause();
        videoEl.src = "";
        videoEl.style.display = 'none';

        ytFrame.src = `https://www.youtube.com/embed/${ytId}?enablejsapi=1&autoplay=0`;
        ytFrame.style.display = 'block';
        trackNameDisplay.textContent = "YouTube Video (" + ytId + ")";
    } else {
        isYouTubeMode = false;
        ytFrame.style.display = 'none';
        ytFrame.src = '';

        trackNameDisplay.textContent = "Pista Externa";
        videoEl.crossOrigin = "anonymous";
        videoEl.src = url;
        videoEl.load();
        videoEl.style.display = 'block';
    }

    pauseModal.classList.add('hidden');
    gameOverModal.classList.add('hidden');
});

startBtn.addEventListener('click', () => {
    if (!videoEl.src && !isYouTubeMode) {
        alert("Por favor sube un archivo o ingresa un enlace primero.");
        return;
    }
    if (isPlaying || isCountingDown) return;

    initAudioEngine();
    densityModal.classList.remove('hidden');
});

confirmDensityBtn.addEventListener('click', async () => {
    densityModal.classList.add('hidden');
    startBtn.disabled = true;
    await analyzeAudioBeats();
    updateSpeedByDifficulty();
    startCountdown();
});

// ANÁLISIS DE AUDIO Y DISTRIBUCIÓN INTELIGENTE DE NOTAS LARGAS
async function analyzeAudioBeats() {
    analyzingDisplay.classList.remove('hidden');

    beatmap = [];
    beatIndex = 0;

    if (isYouTubeMode || !currentFile) {
        generateMeasureBeatmap(128, 180);
        await new Promise(r => setTimeout(r, 800));
        analyzingDisplay.classList.add('hidden');
        return;
    }

    try {
        const arrayBuffer = await currentFile.arrayBuffer();
        const offlineCtx = new (window.AudioContext || window.webkitAudioContext)();
        const audioBuffer = await offlineCtx.decodeAudioData(arrayBuffer);

        const channelData = audioBuffer.getChannelData(0);
        const sampleRate = audioBuffer.sampleRate;
        const bufferSize = 512;
        const totalSamples = channelData.length;
        const songDuration = audioBuffer.duration;

        let energyHistory = [];
        let sustainedSustainMap = [];
        let timestamps = [];
        let previousFrame = new Float32Array(bufferSize / 2);

        for (let i = 0; i < totalSamples; i += bufferSize) {
            let currentFrame = new Float32Array(bufferSize / 2);
            let diffSum = 0;
            let midHighEnergy = 0;

            for (let j = 0; j < bufferSize / 2 && (i + j) < totalSamples; j++) {
                currentFrame[j] = Math.abs(channelData[i + j]);
                let diff = currentFrame[j] - previousFrame[j];
                if (diff > 0) diffSum += diff;

                // Frecuencias medias-altas para detectar melodías/voces
                if (j > bufferSize / 8) {
                    midHighEnergy += currentFrame[j];
                }
            }

            energyHistory.push(diffSum);
            sustainedSustainMap.push(midHighEnergy / (bufferSize / 8));
            timestamps.push(i / sampleRate);
            previousFrame = currentFrame;
        }

        let avgEnergy = energyHistory.reduce((a, b) => a + b, 0) / energyHistory.length;
        let avgMelody = sustainedSustainMap.reduce((a, b) => a + b, 0) / sustainedSustainMap.length;

        const diffSetting = difficultySelect.value;
        const isExtremeMode = (diffSetting === 'hard' || diffSetting === 'insane' || diffSetting === 'god');

        let minDeltaTime = 0.28;
        if (selectedDensity === 'low') minDeltaTime = 0.42;
        else if (selectedDensity === 'medium') minDeltaTime = 0.28;
        else if (selectedDensity === 'high' || selectedDensity === 'high') minDeltaTime = 0.18;

        if (!isExtremeMode) {
            minDeltaTime = Math.max(minDeltaTime, 0.24);
        } else {
            minDeltaTime = Math.min(minDeltaTime, 0.14);
        }

        let peakThreshold = avgEnergy * 1.25;
        let lastTime = 0;

        for (let k = 0; k < energyHistory.length; k++) {
            let energy = energyHistory[k];
            let melodyVal = sustainedSustainMap[k];
            let time = timestamps[k];

            if (energy > peakThreshold && (time - lastTime > minDeltaTime)) {
                // Detección cuidadosa de Notas Largas solo si hay notas sostenidas vocales/melódicas
                let isLongNote = false;
                let noteLength = 0;

                if (melodyVal > avgMelody * 1.6 && (time - lastTime > 0.45) && (k % 7 === 0)) {
                    isLongNote = true;
                    noteLength = 90 + Math.random() * 80; // Altura de la nota sostenida
                }

                beatmap.push({
                    time: time,
                    isStrong: energy > (avgEnergy * 1.9),
                    isLongNote: isLongNote,
                    noteLength: noteLength
                });
                lastTime = time;
            }
        }

        if (beatmap.length < (songDuration * 1.2)) {
            generateMeasureBeatmap(128, songDuration);
        }

    } catch (e) {
        console.log("Error en análisis espectral:", e);
        generateMeasureBeatmap(128, 180);
    }

    analyzingDisplay.classList.add('hidden');
}

function generateMeasureBeatmap(bpm, duration) {
    let measureInterval = (60 / bpm);
    if (selectedDensity === 'low') measureInterval *= 1.2;
    else if (selectedDensity === 'high') measureInterval *= 0.6;

    beatmap = [];
    for (let t = 0.4; t < duration; t += measureInterval) {
        beatmap.push({
            time: t,
            isStrong: (Math.floor(t / measureInterval) % 4 === 0),
            isLongNote: false,
            noteLength: 0
        });
    }
}

pauseBtn.addEventListener('click', pauseGame);
resumeBtn.addEventListener('click', resumeGame);
restartBtn.addEventListener('click', restartGame);
replayBtn.addEventListener('click', () => {
    gameOverModal.classList.add('hidden');
    restartGame();
});

function pauseGame() {
    if (!isPlaying) return;
    if (!isYouTubeMode) videoEl.pause();
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
    if (!isYouTubeMode) videoEl.currentTime = 0;
    startCountdown();
}

function resetGameState() {
    isPlaying = false;
    isCountingDown = false;
    if (!isYouTubeMode) videoEl.pause();

    notes.forEach(note => note.element.remove());
    notes = [];
    beatIndex = 0;

    score = 0;
    combo = 0;
    multiplier = 1;
    scoreDisplay.textContent = '000000';
    comboDisplay.textContent = '0';
    multiplierDisplay.textContent = 'x1';

    startBtn.disabled = false;
    pauseBtn.disabled = true;
}

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

async function startGameplay() {
    try {
        if (isYouTubeMode) {
            ytFrame.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
        } else {
            videoEl.muted = false;
            await videoEl.play();
        }

        songStartTime = performance.now();
        isPlaying = true;
        pauseBtn.disabled = false;
        startBtn.disabled = true;
        requestAnimationFrame(gameLoop);
    } catch (err) {
        console.error("Error reproduciendo:", err);
        startBtn.disabled = false;
    }
}

function processBeatmap() {
    if (!isPlaying) return;

    const currentTime = !isYouTubeMode ? videoEl.currentTime : (performance.now() - songStartTime) / 1000;
    const advanceTime = 1.2;

    while (beatIndex < beatmap.length && beatmap[beatIndex].time <= currentTime + advanceTime) {
        const beat = beatmap[beatIndex];
        generateNotesFromBeat(beat);
        beatIndex++;
    }
}

function generateNotesFromBeat(beat) {
    const diff = difficultySelect.value;
    let count = 1;

    if (beat.isStrong && (diff === 'insane' || diff === 'god' || selectedDensity === 'high')) {
        count = 2;
    }

    const availableTracks = [0, 1, 2, 3];
    for (let i = 0; i < count; i++) {
        const randomIndex = Math.floor(Math.random() * availableTracks.length);
        const trackIndex = availableTracks.splice(randomIndex, 1)[0];
        createNote(trackIndex, beat.isLongNote, beat.noteLength);
    }
}

function createNote(trackIndex, isLongNote = false, noteLength = 0) {
    const noteEl = document.createElement('div');
    let className = `note track-${trackIndex}`;
    if (isLongNote) className += ' sustain-note';

    noteEl.className = className;
    noteEl.style.top = '0px';

    if (isLongNote) {
        noteEl.style.height = (26 + noteLength) + 'px';
    }

    tracks[trackIndex].appendChild(noteEl);

    notes.push({
        element: noteEl,
        track: trackIndex,
        y: 0,
        height: isLongNote ? (26 + noteLength) : 26,
        isLong: isLongNote,
        holding: false,
        hit: false
    });
}

function gameLoop() {
    if (!isPlaying) return;

    processBeatmap();
    updateNotes();

    requestAnimationFrame(gameLoop);
}

function updateNotes() {
    const highwayHeight = tracks[0].clientHeight;
    const hitZoneY = highwayHeight - 80;

    for (let i = notes.length - 1; i >= 0; i--) {
        const note = notes[i];

        if (!note.holding) {
            note.y += noteSpeed;
            note.element.style.top = note.y + 'px';
        } else {
            // Si la nota larga está manteniéndose presionada, se va reduciendo
            note.height -= noteSpeed * 0.85;
            note.element.style.height = Math.max(26, note.height) + 'px';
            addScore(5); // Puntos continuos al mantener

            if (note.height <= 26 || !activeKeys[note.track]) {
                showFeedback('PERFECT!', 'perfect');
                spawnParticles(note.track);
                note.element.remove();
                notes.splice(i, 1);
                continue;
            }
        }

        if (note.y > hitZoneY + 55 && !note.hit && !note.holding) {
            showFeedback('MISS', 'miss');
            resetCombo();
            note.element.remove();
            notes.splice(i, 1);
        }
    }
}

function spawnParticles(trackIndex) {
    const trackEl = tracks[trackIndex];
    const colors = ['#ff2a75', '#00f0ff', '#9d4edd', '#ffb703'];
    const particleColor = colors[trackIndex];

    for (let i = 0; i < 8; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        p.style.backgroundColor = particleColor;
        p.style.boxShadow = `0 0 6px ${particleColor}`;
        p.style.bottom = '40px';
        p.style.left = '50%';

        const angle = Math.random() * Math.PI * 2;
        const distance = 30 + Math.random() * 50;
        const dx = Math.cos(angle) * distance + 'px';
        const dy = Math.sin(angle) * distance + 'px';

        p.style.setProperty('--dx', dx);
        p.style.setProperty('--dy', dy);

        trackEl.appendChild(p);

        setTimeout(() => p.remove(), 400);
    }
}

// EVENTOS DE TECLADO (KEYDOWN / KEYUP PARA NOTAS LARGAS)
window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();

    if (key === 'escape' || key === 'p') {
        if (isPlaying) pauseGame();
        else if (!pauseModal.classList.contains('hidden')) resumeGame();
    }

    if (currentScheme.keys.hasOwnProperty(key)) {
        const trackIdx = currentScheme.keys[key];
        if (!activeKeys[trackIdx]) {
            activeKeys[trackIdx] = true;
            triggerHit(trackIdx);
        }
    }
});

window.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    if (currentScheme.keys.hasOwnProperty(key)) {
        const trackIdx = currentScheme.keys[key];
        activeKeys[trackIdx] = false;
    }
});

tracks.forEach((track, index) => {
    track.addEventListener('pointerdown', () => {
        activeKeys[index] = true;
        triggerHit(index);
    });
    track.addEventListener('pointerup', () => {
        activeKeys[index] = false;
    });
});

function triggerHit(trackIndex) {
    if (!isPlaying) return;

    const hitZone = document.getElementById(`key-${trackIndex}`);
    hitZone.classList.add('active', `hit-glow-${trackIndex}`);
    setTimeout(() => hitZone.classList.remove('active', `hit-glow-${trackIndex}`), 100);

    const highwayHeight = tracks[0].clientHeight;
    const hitZoneY = highwayHeight - 80;

    const noteIndex = notes.findIndex(n => n.track === trackIndex && !n.hit && Math.abs(n.y - hitZoneY) < 65);

    if (noteIndex !== -1) {
        const note = notes[noteIndex];
        const distance = Math.abs(note.y - hitZoneY);

        // Efecto de Brillo Fluorescente (Flash) al acertar
        note.element.classList.add('hit-flash');

        if (note.isLong) {
            note.holding = true;
            playHitsound();
            spawnParticles(trackIndex);
        } else {
            if (distance < 22) {
                addScore(300);
                showFeedback('PERFECT!', 'perfect');
            } else {
                addScore(100);
                showFeedback('GREAT', 'great');
            }

            playHitsound();
            spawnParticles(trackIndex);

            note.hit = true;
            setTimeout(() => {
                note.element.remove();
                const idx = notes.indexOf(note);
                if (idx !== -1) notes.splice(idx, 1);
            }, 50);
        }
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
    setTimeout(() => hitFeedback.classList.remove('show'), 300);
}