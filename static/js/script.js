let audioCtx = null;
let analyser = null;
let sourceNode = null;
let dataArray = null;

let hitsoundAudioBuffer = null;

let isPlaying = false;
let isCountingDown = false;
let isYouTubeMode = false;
let ytPlayer = null;

// Estado del juego y puntuaciones
let isMultiplayer = false;
let scoreP1 = 0, comboP1 = 0, multiplierP1 = 1;
let scoreP2 = 0, comboP2 = 0, multiplierP2 = 1;

let notes = [];
let noteSpeed = 7.5;
let currentFile = null;

let beatmap = [];
let songStartTime = 0;
let beatIndex = 0;
let hitsoundVolume = 0.7;

let selectedDensity = 'medium';

const activeKeys = [false, false, false, false, false, false, false, false];

// ESQUEMAS DE CONTROL (INCLUYENDO MODO SIMULTÁNEO WASD + FLECHAS)
const controlSchemes = {
    wasd: {
        keys: { 'a': 0, 'w': 1, 's': 2, 'd': 3 },
        labels: ['A', 'W', 'S', 'D'],
        text: 'WASD (A, W, S, D)'
    },
    arrows: {
        keys: { 'arrowleft': 0, 'arrowup': 1, 'arrowdown': 2, 'arrowright': 3 },
        labels: ['←', '↑', '↓', '→'],
        text: 'Flechas (←, ↑, ↓, →)'
    },
    both: {
        keys: {
            'a': 0, 'arrowleft': 0,
            'w': 1, 'arrowup': 1,
            's': 2, 'arrowdown': 2,
            'd': 3, 'arrowright': 3
        },
        labels: ['A / ←', 'W / ↑', 'S / ↓', 'D / →'],
        text: 'WASD + Flechas Simultáneo (A/←, W/↑, S/↓, D/→)'
    }
};

let currentScheme = controlSchemes.wasd;

let p1MultiKeys = { 'a': 0, 'w': 1, 's': 2, 'd': 3 };
let p2MultiKeys = { 'arrowleft': 4, 'arrowup': 5, 'arrowdown': 6, 'arrowright': 7 };

// DOM
const videoEl = document.getElementById('bg-video');
const overlayEl = document.getElementById('video-overlay');
const fileInput = document.getElementById('audio-file-input');
const fileInputModal = document.getElementById('audio-file-input-modal');
const fileInputFinish = document.getElementById('audio-file-input-finish');
const urlInput = document.getElementById('url-input');
const loadUrlBtn = document.getElementById('load-url-btn');

// Modales y Menús
const modeSelectModal = document.getElementById('mode-select-modal');
const btnModeSingle = document.getElementById('btn-mode-single');
const btnModeMulti = document.getElementById('btn-mode-multi');
const confirmModeBtn = document.getElementById('confirm-mode-btn');
const gameMainArea = document.getElementById('game-main-area');
const highwayP1 = document.getElementById('highway-p1');
const highwayP2 = document.getElementById('highway-p2');
const p1Title = document.getElementById('p1-title');
const p2ScorePanel = document.getElementById('p2-score-panel');
const changeModeBtn = document.getElementById('change-mode-btn');

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

// DISPLAYS DE PUNTUACIÓN
const scoreDisplayP1 = document.getElementById('score-display');
const finalScoreP1Label = document.getElementById('final-score-p1-label');
const finalScoreDisplayP1 = document.getElementById('final-score-display');
const comboDisplayP1 = document.getElementById('combo-display');
const multiplierDisplayP1 = document.getElementById('multiplier-display');

const scoreDisplayP2 = document.getElementById('score-display-p2');
const finalScoreDisplayP2 = document.getElementById('final-score-p2-display');
const comboDisplayP2 = document.getElementById('combo-display-p2');
const multiplierDisplayP2 = document.getElementById('multiplier-display-p2');
const finalScoreP2Box = document.getElementById('final-score-p2-box');

const trackNameDisplay = document.getElementById('track-name');
const hitFeedback = document.getElementById('hit-feedback');
const countdownDisplay = document.getElementById('countdown-display');

const keyBinds = [
    document.querySelector('#key-0 .key-bind'),
    document.querySelector('#key-1 .key-bind'),
    document.querySelector('#key-2 .key-bind'),
    document.querySelector('#key-3 .key-bind'),
    document.querySelector('#key-4 .key-bind'),
    document.querySelector('#key-5 .key-bind'),
    document.querySelector('#key-6 .key-bind'),
    document.querySelector('#key-7 .key-bind')
];

const tracks = [
    document.querySelector('[data-track="0"]'),
    document.querySelector('[data-track="1"]'),
    document.querySelector('[data-track="2"]'),
    document.querySelector('[data-track="3"]'),
    document.querySelector('[data-track="4"]'),
    document.querySelector('[data-track="5"]'),
    document.querySelector('[data-track="6"]'),
    document.querySelector('[data-track="7"]')
];

// YOUTUBE PLAYER INTEGRATION
function onYouTubeIframeAPIReady() {
    ytPlayer = new YT.Player('youtube-player', {
        height: '100%',
        width: '100%',
        playerVars: {
            'autoplay': 0,
            'controls': 0,
            'rel': 0,
            'playsinline': 1
        },
        events: {
            'onStateChange': onYouTubePlayerStateChange
        }
    });
}

function onYouTubePlayerStateChange(event) {
    if (event.data === 0) {
        handleGameOver();
    }
}

// SELECCIÓN DE MODO
btnModeSingle.addEventListener('click', () => {
    btnModeSingle.classList.add('active');
    btnModeMulti.classList.remove('active');
    isMultiplayer = false;
});

btnModeMulti.addEventListener('click', () => {
    btnModeMulti.classList.add('active');
    btnModeSingle.classList.remove('active');
    isMultiplayer = true;
});

confirmModeBtn.addEventListener('click', () => {
    modeSelectModal.classList.add('hidden');
    gameMainArea.classList.remove('hidden');
    applyControlLayout();
});

function applyControlLayout() {
    const p1SchemeVal = controlsSelect.value;

    if (isMultiplayer) {
        highwayP2.classList.remove('hidden');
        p2ScorePanel.classList.remove('hidden');
        finalScoreP2Box.classList.remove('hidden');
        p1Title.classList.remove('hidden');
        finalScoreP1Label.textContent = "PUNTAJE FINAL (P1)";

        if (p1SchemeVal === 'arrows') {
            p1MultiKeys = { 'arrowleft': 0, 'arrowup': 1, 'arrowdown': 2, 'arrowright': 3 };
            p2MultiKeys = { 'a': 4, 'w': 5, 's': 6, 'd': 7 };
            controlsText.innerHTML = `<strong>P1:</strong> ←, ↑, ↓, → | <strong>P2:</strong> A, W, S, D`;

            keyBinds[0].textContent = '←'; keyBinds[1].textContent = '↑';
            keyBinds[2].textContent = '↓'; keyBinds[3].textContent = '→';
            keyBinds[4].textContent = 'A'; keyBinds[5].textContent = 'W';
            keyBinds[6].textContent = 'S'; keyBinds[7].textContent = 'D';
        } else {
            p1MultiKeys = { 'a': 0, 'w': 1, 's': 2, 'd': 3 };
            p2MultiKeys = { 'arrowleft': 4, 'arrowup': 5, 'arrowdown': 6, 'arrowright': 7 };
            controlsText.innerHTML = `<strong>P1:</strong> A, W, S, D | <strong>P2:</strong> ←, ↑, ↓, →`;

            keyBinds[0].textContent = 'A'; keyBinds[1].textContent = 'W';
            keyBinds[2].textContent = 'S'; keyBinds[3].textContent = 'D';
            keyBinds[4].textContent = '←'; keyBinds[5].textContent = '↑';
            keyBinds[6].textContent = '↓'; keyBinds[7].textContent = '→';
        }
    } else {
        highwayP2.classList.add('hidden');
        p2ScorePanel.classList.add('hidden');
        finalScoreP2Box.classList.add('hidden');
        p1Title.classList.add('hidden');
        finalScoreP1Label.textContent = "PUNTAJE FINAL";

        currentScheme = controlSchemes[p1SchemeVal] || controlSchemes.wasd;
        controlsText.innerHTML = `Usa las teclas <strong>${currentScheme.text}</strong> o toca las casillas inferiores.`;
        keyBinds.slice(0, 4).forEach((bindEl, i) => bindEl.textContent = currentScheme.labels[i]);
    }
}

changeModeBtn.addEventListener('click', () => {
    pauseModal.classList.add('hidden');
    resetGameState();
    gameMainArea.classList.add('hidden');
    modeSelectModal.classList.remove('hidden');
});

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
    applyControlLayout();
});

videoEl.addEventListener('ended', handleGameOver);

function handleGameOver() {
    isPlaying = false;

    if (isYouTubeMode && ytPlayer && typeof ytPlayer.pauseVideo === 'function') {
        ytPlayer.pauseVideo();
    } else {
        videoEl.pause();
    }

    notes.forEach(note => note.element.remove());
    notes = [];

    finalScoreDisplayP1.textContent = scoreP1.toString().padStart(6, '0');
    if (isMultiplayer) {
        finalScoreDisplayP2.textContent = scoreP2.toString().padStart(6, '0');
    }
    gameOverModal.classList.remove('hidden');
    startBtn.disabled = false;
    pauseBtn.disabled = true;
}

controlsSelect.addEventListener('change', () => {
    applyControlLayout();
});

difficultySelect.addEventListener('change', updateSpeedByDifficulty);

function updateSpeedByDifficulty() {
    const diff = difficultySelect.value;
    let baseSpeed = 7.5;
    if (diff === 'easy') baseSpeed = 6.0;
    else if (diff === 'normal') baseSpeed = 7.5;
    else if (diff === 'hard') baseSpeed = 9.2;
    else if (diff === 'insane') baseSpeed = 11.0;
    else if (diff === 'god') baseSpeed = 13.0;

    noteSpeed = baseSpeed;
}

videoEl.volume = volumeSlider.value;
volumeSlider.addEventListener('input', (e) => {
    videoEl.volume = e.target.value;
    if (isYouTubeMode && ytPlayer && typeof ytPlayer.setVolume === 'function') {
        ytPlayer.setVolume(e.target.value * 100);
    }
});
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
    const ytIframe = document.getElementById('youtube-player');
    if (ytIframe) ytIframe.style.display = 'none';

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

        const ytIframe = document.getElementById('youtube-player');
        if (ytIframe) ytIframe.style.display = 'block';

        if (ytPlayer && typeof ytPlayer.loadVideoById === 'function') {
            ytPlayer.loadVideoById(ytId);
            ytPlayer.pauseVideo();
        }
        trackNameDisplay.textContent = "YouTube Video (" + ytId + ")";
    } else {
        isYouTubeMode = false;
        const ytIframe = document.getElementById('youtube-player');
        if (ytIframe) ytIframe.style.display = 'none';

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

async function analyzeAudioBeats() {
    analyzingDisplay.classList.remove('hidden');

    beatmap = [];
    beatIndex = 0;

    let songDuration = 180;
    if (isYouTubeMode && ytPlayer && typeof ytPlayer.getDuration === 'function') {
        songDuration = ytPlayer.getDuration() || 180;
    }

    if (isYouTubeMode || !currentFile) {
        generateMeasureBeatmap(128, songDuration);
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
        songDuration = audioBuffer.duration;

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
        if (selectedDensity === 'low') minDeltaTime = 0.45;
        else if (selectedDensity === 'medium') minDeltaTime = 0.28;
        else if (selectedDensity === 'high') minDeltaTime = 0.18;

        if (!isExtremeMode) {
            minDeltaTime = Math.max(minDeltaTime, 0.22);
        } else {
            minDeltaTime = Math.min(minDeltaTime, 0.14);
        }

        let peakThreshold = avgEnergy * 1.05;
        let lastTime = 0;

        for (let k = 0; k < energyHistory.length; k++) {
            let energy = energyHistory[k];
            let melodyVal = sustainedSustainMap[k];
            let time = timestamps[k];

            if (time >= songDuration - 0.2) break;

            if ((energy > peakThreshold || melodyVal > avgMelody) && (time - lastTime > minDeltaTime)) {
                let isLongNote = false;
                let noteLength = 0;

                if (melodyVal > avgMelody * 1.5 && (time - lastTime > 0.40) && (k % 6 === 0)) {
                    isLongNote = true;
                    noteLength = 90 + Math.random() * 80;
                }

                beatmap.push({
                    time: time,
                    isStrong: energy > (avgEnergy * 1.75),
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
    for (let t = 0.4; t < duration - 0.3; t += measureInterval) {
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

    if (isYouTubeMode && ytPlayer && typeof ytPlayer.pauseVideo === 'function') {
        ytPlayer.pauseVideo();
    } else {
        videoEl.pause();
    }

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
    if (isYouTubeMode && ytPlayer && typeof ytPlayer.seekTo === 'function') {
        ytPlayer.seekTo(0);
    } else {
        videoEl.currentTime = 0;
    }
    startCountdown();
}

function resetGameState() {
    isPlaying = false;
    isCountingDown = false;

    if (isYouTubeMode && ytPlayer && typeof ytPlayer.pauseVideo === 'function') {
        ytPlayer.pauseVideo();
    } else {
        videoEl.pause();
    }

    notes.forEach(note => note.element.remove());
    notes = [];
    beatIndex = 0;

    scoreP1 = 0; comboP1 = 0; multiplierP1 = 1;
    scoreP2 = 0; comboP2 = 0; multiplierP2 = 1;

    scoreDisplayP1.textContent = '000000';
    comboDisplayP1.textContent = '0';
    multiplierDisplayP1.textContent = 'x1';

    scoreDisplayP2.textContent = '000000';
    comboDisplayP2.textContent = '0';
    multiplierDisplayP2.textContent = 'x1';

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
        if (isYouTubeMode && ytPlayer && typeof ytPlayer.playVideo === 'function') {
            ytPlayer.playVideo();
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

function getCurrentTrackTime() {
    if (isYouTubeMode && ytPlayer && typeof ytPlayer.getCurrentTime === 'function') {
        return ytPlayer.getCurrentTime();
    }
    return videoEl.currentTime || (performance.now() - songStartTime) / 1000;
}

function processBeatmap() {
    if (!isPlaying) return;

    const currentTime = getCurrentTrackTime();
    const advanceTime = 1.2;

    while (beatIndex < beatmap.length && beatmap[beatIndex].time <= currentTime + advanceTime) {
        const beat = beatmap[beatIndex];
        generateNotesFromBeat(beat);
        beatIndex++;
    }
}

// GENERACIÓN INTELIGENTE: NOTAS DOBLES EN BEATS FUERTES SOLO EN DIFICULTAD DIFÍCIL EN ADELANTE
function generateNotesFromBeat(beat) {
    const diff = difficultySelect.value;
    let count = 1;

    // Fácil y Normal -> 1 nota a la vez
    // Hard, Insane, God -> 2 notas simultáneas en beats fuertes
    const allowDoubleNotes = (diff === 'hard' || diff === 'insane' || diff === 'god');

    if (allowDoubleNotes && beat.isStrong) {
        count = 2;
    } else {
        count = 1;
    }

    // P1
    const availableTracksP1 = [0, 1, 2, 3];
    for (let i = 0; i < count; i++) {
        const randomIndex = Math.floor(Math.random() * availableTracksP1.length);
        const trackIndex = availableTracksP1.splice(randomIndex, 1)[0];
        createNote(trackIndex, beat.isLongNote, beat.noteLength, 1);
    }

    // P2 (Multijugador)
    if (isMultiplayer) {
        const availableTracksP2 = [4, 5, 6, 7];
        for (let i = 0; i < count; i++) {
            const randomIndex = Math.floor(Math.random() * availableTracksP2.length);
            const trackIndex = availableTracksP2.splice(randomIndex, 1)[0];
            createNote(trackIndex, beat.isLongNote, beat.noteLength, 2);
        }
    }
}

function createNote(trackIndex, isLongNote = false, noteLength = 0, player = 1) {
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
        player: player,
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
            note.height -= noteSpeed * 0.85;
            note.element.style.height = Math.max(26, note.height) + 'px';
            addScore(5, note.player);

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
            resetCombo(note.player);
            note.element.remove();
            notes.splice(i, 1);
        }
    }
}

function spawnParticles(trackIndex) {
    const trackEl = tracks[trackIndex];
    const colors = ['#ff2a75', '#00f0ff', '#9d4edd', '#ffb703', '#ff2a75', '#00f0ff', '#9d4edd', '#ffb703'];
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

// MANEJO DE TECLAS DUALES (WASD + FLECHAS SIMULTÁNEO)
window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();

    if (key === 'escape' || key === 'p') {
        if (isPlaying) pauseGame();
        else if (!pauseModal.classList.contains('hidden')) resumeGame();
    }

    if (isMultiplayer) {
        if (p1MultiKeys.hasOwnProperty(key)) {
            const trackIdx = p1MultiKeys[key];
            if (!activeKeys[trackIdx]) {
                activeKeys[trackIdx] = true;
                triggerHit(trackIdx);
            }
        } else if (p2MultiKeys.hasOwnProperty(key)) {
            const trackIdx = p2MultiKeys[key];
            if (!activeKeys[trackIdx]) {
                activeKeys[trackIdx] = true;
                triggerHit(trackIdx);
            }
        }
    } else {
        if (currentScheme.keys.hasOwnProperty(key)) {
            const trackIdx = currentScheme.keys[key];
            if (!activeKeys[trackIdx]) {
                activeKeys[trackIdx] = true;
                triggerHit(trackIdx);
            }
        }
    }
});

window.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    if (isMultiplayer) {
        if (p1MultiKeys.hasOwnProperty(key)) {
            activeKeys[p1MultiKeys[key]] = false;
        } else if (p2MultiKeys.hasOwnProperty(key)) {
            activeKeys[p2MultiKeys[key]] = false;
        }
    } else {
        if (currentScheme.keys.hasOwnProperty(key)) {
            activeKeys[currentScheme.keys[key]] = false;
        }
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

        note.element.classList.add('hit-flash');

        if (note.isLong) {
            note.holding = true;
            playHitsound();
            spawnParticles(trackIndex);
        } else {
            if (distance < 22) {
                addScore(300, note.player);
                showFeedback('PERFECT!', 'perfect');
            } else {
                addScore(100, note.player);
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

function addScore(basePoints, player = 1) {
    if (player === 1) {
        comboP1++;
        if (comboP1 % 10 === 0 && multiplierP1 < 4) multiplierP1++;
        scoreP1 += basePoints * multiplierP1;
        scoreDisplayP1.textContent = scoreP1.toString().padStart(6, '0');
        comboDisplayP1.textContent = comboP1;
        multiplierDisplayP1.textContent = `x${multiplierP1}`;
    } else {
        comboP2++;
        if (comboP2 % 10 === 0 && multiplierP2 < 4) multiplierP2++;
        scoreP2 += basePoints * multiplierP2;
        scoreDisplayP2.textContent = scoreP2.toString().padStart(6, '0');
        comboDisplayP2.textContent = comboP2;
        multiplierDisplayP2.textContent = `x${multiplierP2}`;
    }
}

function resetCombo(player = 1) {
    if (player === 1) {
        comboP1 = 0; multiplierP1 = 1;
        comboDisplayP1.textContent = comboP1;
        multiplierDisplayP1.textContent = `x${multiplierP1}`;
    } else {
        comboP2 = 0; multiplierP2 = 1;
        comboDisplayP2.textContent = comboP2;
        multiplierDisplayP2.textContent = `x${multiplierP2}`;
    }
}

function showFeedback(text, type) {
    hitFeedback.textContent = text;
    hitFeedback.className = `hit-feedback show ${type}`;
    setTimeout(() => hitFeedback.classList.remove('show'), 300);
}