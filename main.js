/**
 * main.js — Raman Kumar (ramaneon)
 * Silky Smooth, Human & Interactive System
 * ─────────────────────────────────────────────────────────────
 */

'use strict';

const lerp = (a, b, t) => a + (b - a) * t;
const isTouch = window.matchMedia('(pointer: coarse)').matches;

/* ─── CONTINUOUS ROMANTIC PIANO & VIOLIN AMBIENT ENGINE ─────── */
let audioCtx = null;
let musicPlaying = false;
let musicSchedulerTimer = null;
let currentChordIndex = 0;
let nextChordTime = 0;
let masterMusicGain = null;
let rainSourceNode = null;
let rainGainNode = null;

// Warm Pentatonic Scale for gentle droplet accents
const PENTATONIC_SCALE = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50];
let lastHoverTime = 0;
let lastNoteIdx = 0;

/**
 * Initializes and unlocks AudioContext reliably across all browsers
 */
async function ensureAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return false;
    audioCtx = new AudioContextClass();

    masterMusicGain = audioCtx.createGain();
    masterMusicGain.gain.setValueAtTime(0.85, audioCtx.currentTime);
    masterMusicGain.connect(audioCtx.destination);

    initRainAmbient();
  }

  if (audioCtx.state === 'suspended') {
    try {
      await audioCtx.resume();
    } catch (err) {
      console.warn('AudioContext resume deferred:', err);
    }
  }

  return audioCtx && audioCtx.state === 'running';
}

/**
 * Generates continuous soft rain texture using filtered pink noise buffer
 */
function initRainAmbient() {
  if (!audioCtx || rainSourceNode) return;
  try {
    const bufferSize = audioCtx.sampleRate * 2;
    const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
      b6 = white * 0.115926;
    }

    rainSourceNode = audioCtx.createBufferSource();
    rainSourceNode.buffer = noiseBuffer;
    rainSourceNode.loop = true;

    const rainFilter = audioCtx.createBiquadFilter();
    rainFilter.type = 'bandpass';
    rainFilter.frequency.setValueAtTime(850, audioCtx.currentTime);
    rainFilter.Q.setValueAtTime(0.8, audioCtx.currentTime);

    rainGainNode = audioCtx.createGain();
    rainGainNode.gain.setValueAtTime(0, audioCtx.currentTime);

    rainSourceNode.connect(rainFilter);
    rainFilter.connect(rainGainNode);
    rainGainNode.connect(masterMusicGain);

    rainSourceNode.start(0);
  } catch (e) {
    // Rain fallback
  }
}

/**
 * Romantic Chord Progressions & Melodies (Cmaj9 → Am9 → Fmaj7 → Gsus4)
 * Emotional, rich, reminiscent of Yiruma & Joe Hisaishi
 */
const ROMANTIC_CHORDS = [
  {
    name: 'Cmaj9',
    bass: 130.81, // C3
    arpeggio: [130.81, 196.00, 246.94, 293.66, 329.63, 392.00, 493.88, 587.33], // C3, G3, B3, D4, E4, G4, B4, D5
    violinNote: 392.00, // G4
    violinNext: 587.33, // D5
  },
  {
    name: 'Am9',
    bass: 110.00, // A2
    arpeggio: [110.00, 164.81, 220.00, 246.94, 261.63, 329.63, 392.00, 440.00], // A2, E3, A3, B3, C4, E4, G4, A4
    violinNote: 523.25, // C5
    violinNext: 440.00, // A4
  },
  {
    name: 'Fmaj7',
    bass: 87.31, // F2
    arpeggio: [87.31, 130.81, 174.61, 220.00, 261.63, 329.63, 349.23, 440.00], // F2, C3, F3, A3, C4, E4, F4, A4
    violinNote: 440.00, // A4
    violinNext: 392.00, // G4
  },
  {
    name: 'Gsus4',
    bass: 98.00, // G2
    arpeggio: [98.00, 146.83, 196.00, 261.63, 293.66, 392.00, 493.88, 587.33], // G2, D3, G3, C4, D4, G4, B4, D5
    violinNote: 587.33, // D5
    violinNext: 392.00, // G4
  }
];

/**
 * Rich Acoustic Piano Note Synthesizer
 * Uses multi-harmonic synthesis (sine + triangle + ping) with audible gain
 */
function playPianoNote(freq, startTime, duration = 1.6, velocity = 0.28) {
  if (!audioCtx || !masterMusicGain) return;
  try {
    const oscFund = audioCtx.createOscillator();
    const oscHarm = audioCtx.createOscillator();
    const oscPing = audioCtx.createOscillator();
    const noteGain = audioCtx.createGain();
    const noteFilter = audioCtx.createBiquadFilter();

    // Dynamic low-pass filter (hammer impact brightness decaying warm)
    noteFilter.type = 'lowpass';
    noteFilter.frequency.setValueAtTime(Math.min(freq * 4.5, 4500), startTime);
    noteFilter.frequency.exponentialRampToValueAtTime(Math.max(freq * 1.5, 280), startTime + duration * 0.8);

    // 1. Fundamental warm sine
    oscFund.type = 'sine';
    oscFund.frequency.setValueAtTime(freq, startTime);

    // 2. Harmonic body triangle (octave)
    oscHarm.type = 'triangle';
    oscHarm.frequency.setValueAtTime(freq * 2, startTime);

    // 3. Crisp hammer attack sparkle (3rd harmonic)
    oscPing.type = 'sine';
    oscPing.frequency.setValueAtTime(freq * 3, startTime);

    const pingGain = audioCtx.createGain();
    pingGain.gain.setValueAtTime(0.35, startTime);
    pingGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.09);
    oscPing.connect(pingGain);
    pingGain.connect(noteFilter);

    // Natural piano ADSR envelope
    noteGain.gain.setValueAtTime(0.001, startTime);
    noteGain.gain.linearRampToValueAtTime(velocity, startTime + 0.005);
    noteGain.gain.exponentialRampToValueAtTime(velocity * 0.45, startTime + 0.22);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    oscFund.connect(noteFilter);
    oscHarm.connect(noteFilter);
    noteFilter.connect(noteGain);
    noteGain.connect(masterMusicGain);

    oscFund.start(startTime);
    oscHarm.start(startTime);
    oscPing.start(startTime);

    oscFund.stop(startTime + duration);
    oscHarm.stop(startTime + duration);
    oscPing.stop(startTime + 0.1);
  } catch (e) {
    // ignore
  }
}

/**
 * Rich, Singing Romantic Violin / Cello Legato Voice
 * Dual detuned oscillators with expressive vibrato and singing tone
 */
function playViolinVoice(freq, startTime, duration = 3.6, targetFreqNext = null) {
  if (!audioCtx || !masterMusicGain) return;
  try {
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const lfo = audioCtx.createOscillator();
    const lfoGain = audioCtx.createGain();
    const violinGain = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();

    // Warm resonant string filter
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1900, startTime);
    filter.Q.setValueAtTime(2.2, startTime);

    // Dual rich oscillators with subtle detuning
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(freq, startTime);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 1.003, startTime);

    // Portamento glide toward the next melodic phrase
    if (targetFreqNext) {
      osc1.frequency.linearRampToValueAtTime(targetFreqNext, startTime + duration);
      osc2.frequency.linearRampToValueAtTime(targetFreqNext * 1.003, startTime + duration);
    }

    // Expressive 4.8Hz vibrato LFO
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(4.8, startTime);
    lfoGain.gain.setValueAtTime(freq * 0.016, startTime); // ~1.6% pitch vibrato
    lfo.connect(lfoGain);
    lfoGain.connect(osc1.frequency);
    lfoGain.connect(osc2.frequency);

    // Violin Bowing Envelope: expressive 0.3s swell, rich sustain, gentle release
    const violinPeakGain = 0.22;
    violinGain.gain.setValueAtTime(0.001, startTime);
    violinGain.gain.linearRampToValueAtTime(violinPeakGain, startTime + 0.35);
    violinGain.gain.setValueAtTime(violinPeakGain * 0.9, startTime + duration - 0.5);
    violinGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(violinGain);
    violinGain.connect(masterMusicGain);

    lfo.start(startTime);
    osc1.start(startTime);
    osc2.start(startTime);

    lfo.stop(startTime + duration);
    osc1.stop(startTime + duration);
    osc2.stop(startTime + duration);
  } catch (e) {
    // ignore
  }
}

/**
 * Immediate Romantic Chime on Click (Instant acoustic feedback)
 */
function playWelcomeChime(startTime) {
  const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
  notes.forEach((n, i) => {
    playPianoNote(n, startTime + i * 0.09, 1.4, 0.32);
  });
}

/**
 * Organic Raindrop Droplet Ping
 */
function playRainDroplet(freq = null) {
  if (!audioCtx || !masterMusicGain) return;
  try {
    const now = audioCtx.currentTime;
    const baseFreq = freq || PENTATONIC_SCALE[Math.floor(Math.random() * PENTATONIC_SCALE.length)];

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(baseFreq * 2.8, now);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq * 1.06, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq, now + 0.03);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.98, now + 0.16);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(masterMusicGain);

    osc.start(now);
    osc.stop(now + 0.29);
  } catch (e) {
    // ignore
  }
}

/**
 * Continuous Romantic Music Scheduler Loop
 * Automatically schedules arpeggiated piano & soaring violin countermelodies
 */
function scheduleRomanticTune() {
  if (!musicPlaying || !audioCtx || audioCtx.state !== 'running') return;

  const now = audioCtx.currentTime;
  const chordDuration = 3.6; // ~66 BPM emotional cadence

  // Guarantee we don't fall behind or schedule in the past
  if (nextChordTime < now) {
    nextChordTime = now + 0.05;
  }

  if (nextChordTime < now + 0.4) {
    const chord = ROMANTIC_CHORDS[currentChordIndex];
    const measureStart = nextChordTime;

    // 1. Soaring Violin Legato Melody
    playViolinVoice(chord.violinNote, measureStart, chordDuration * 0.96, chord.violinNext);

    // 2. Resonant Deep Piano Bass Note (Beat 1)
    playPianoNote(chord.bass, measureStart, 2.6, 0.38);

    // 3. Flowing Acoustic Piano Arpeggio
    const arpCount = chord.arpeggio.length;
    chord.arpeggio.forEach((note, idx) => {
      const noteDelay = (idx / arpCount) * (chordDuration * 0.88);
      const noteVel = 0.22 + (idx % 2 === 0 ? 0.06 : 0.02);
      playPianoNote(note, measureStart + noteDelay, 1.4, noteVel);
    });

    // 4. Subtle occasional high raindrop harmonic
    if (currentChordIndex % 2 === 0) {
      setTimeout(() => {
        if (musicPlaying) playRainDroplet(PENTATONIC_SCALE[Math.floor(Math.random() * PENTATONIC_SCALE.length)]);
      }, 1500);
    }

    currentChordIndex = (currentChordIndex + 1) % ROMANTIC_CHORDS.length;
    nextChordTime = measureStart + chordDuration;
  }

  musicSchedulerTimer = setTimeout(scheduleRomanticTune, 100);
}

/**
 * Smoothly Starts Romantic Ambient Melody
 */
async function startRomanticMelody() {
  const isRunning = await ensureAudioContext();
  if (!isRunning) {
    console.warn('Waiting for user gesture to activate AudioContext');
    return;
  }

  if (musicPlaying) return;
  musicPlaying = true;

  const now = audioCtx.currentTime;

  // Master Gain Fade-in
  masterMusicGain.gain.cancelScheduledValues(now);
  masterMusicGain.gain.setValueAtTime(0.001, now);
  masterMusicGain.gain.linearRampToValueAtTime(0.85, now + 0.6);

  // Soft background rain texture fade-in
  if (rainGainNode) {
    rainGainNode.gain.cancelScheduledValues(now);
    rainGainNode.gain.setValueAtTime(0.001, now);
    rainGainNode.gain.linearRampToValueAtTime(0.06, now + 1.2);
  }

  currentChordIndex = 0;
  nextChordTime = now + 0.08;

  // Play immediate sweet chime so visitor receives instant sound confirmation
  playWelcomeChime(now + 0.02);

  scheduleRomanticTune();
  updateMusicUI(true);
}

/**
 * Smoothly Stops Romantic Ambient Melody
 */
function stopRomanticMelody() {
  if (!musicPlaying) return;

  musicPlaying = false;
  clearTimeout(musicSchedulerTimer);

  if (masterMusicGain && audioCtx) {
    const now = audioCtx.currentTime;
    masterMusicGain.gain.cancelScheduledValues(now);
    masterMusicGain.gain.setValueAtTime(masterMusicGain.gain.value, now);
    masterMusicGain.gain.linearRampToValueAtTime(0.0001, now + 0.4);

    if (rainGainNode) {
      rainGainNode.gain.cancelScheduledValues(now);
      rainGainNode.gain.setValueAtTime(rainGainNode.gain.value, now);
      rainGainNode.gain.linearRampToValueAtTime(0.0001, now + 0.4);
    }
  }

  updateMusicUI(false);
}

/**
 * Synchronizes header toggle and hero widget UI states
 */
function updateMusicUI(isPlaying) {
  const headerBtn = document.getElementById('sfx-toggle');
  const headerStatus = document.getElementById('music-pill-status');
  const heroWidget = document.getElementById('hero-music-widget');
  const heroChip = document.getElementById('hero-music-chip');
  const heroSub = document.getElementById('hero-music-sub');

  if (headerBtn) {
    headerBtn.classList.toggle('playing', isPlaying);
  }
  if (headerStatus) {
    headerStatus.textContent = isPlaying ? 'Melody: Playing ♫' : 'Melody: Off';
  }

  if (heroWidget) {
    heroWidget.classList.toggle('playing', isPlaying);
  }
  if (heroChip) {
    heroChip.textContent = isPlaying ? 'Playing ♫' : 'Play ♫';
  }
  if (heroSub) {
    heroSub.textContent = isPlaying ? 'Continuous romantic piano & violin · Playing' : 'Gentle rain texture · Click to listen';
  }
}

// Header Music Toggle Button
const sfxToggleBtn = document.getElementById('sfx-toggle');
if (sfxToggleBtn) {
  sfxToggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (musicPlaying) {
      stopRomanticMelody();
    } else {
      startRomanticMelody();
    }
  });
}

// Hero Music Widget Click Handler
const heroMusicWidget = document.getElementById('hero-music-widget');
if (heroMusicWidget) {
  heroMusicWidget.addEventListener('click', (e) => {
    e.stopPropagation();
    if (musicPlaying) {
      stopRomanticMelody();
    } else {
      startRomanticMelody();
    }
  });
}

// Selective & throttled hover sounds (gentle raindrop)
const KEY_SOUND_TARGETS = '.primary-btn, .launch-btn, .nav-link, .pill-btn, .copy-email-btn, .music-pill-toggle';
document.querySelectorAll(KEY_SOUND_TARGETS).forEach(el => {
  el.addEventListener('mouseenter', () => {
    const now = Date.now();
    // 850ms cooldown so it stays soothing and occasional
    if (now - lastHoverTime > 850) {
      lastHoverTime = now;
      lastNoteIdx = (lastNoteIdx + 1) % PENTATONIC_SCALE.length;
      if (musicPlaying) {
        playRainDroplet(PENTATONIC_SCALE[lastNoteIdx]);
      }
    }
  });
});

// Auto-start prompt on first visitor interaction (compliant with browser autoplay policy)
function handleFirstVisitorInteraction() {
  if (!musicPlaying) {
    startRomanticMelody();
  }
  window.removeEventListener('click', handleFirstVisitorInteraction);
  window.removeEventListener('touchstart', handleFirstVisitorInteraction);
  window.removeEventListener('keydown', handleFirstVisitorInteraction);
}

// Listen for first interaction across the page to smoothly start the romantic tune
window.addEventListener('click', handleFirstVisitorInteraction, { once: true });
window.addEventListener('touchstart', handleFirstVisitorInteraction, { once: true });
window.addEventListener('keydown', handleFirstVisitorInteraction, { once: true });

/* ─── THREE.JS 3D WEBGL AMBIENT BACKGROUND ──────────────────── */
function initThreeWebGL() {
  const canvas = document.getElementById('bg-webgl-canvas');
  if (!canvas || !window.THREE) return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 32;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // 1. Floating Outer Geometric Wireframe (Soft Amber)
  const outerGeo = new THREE.IcosahedronGeometry(8, 1);
  const outerMat = new THREE.MeshBasicMaterial({
    color: 0xfbbf24,
    wireframe: true,
    transparent: true,
    opacity: 0.18,
  });
  const outerMesh = new THREE.Mesh(outerGeo, outerMat);
  scene.add(outerMesh);

  // 2. Inner Glowing Core (Cyan Accent)
  const coreGeo = new THREE.OctahedronGeometry(4, 0);
  const coreMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    wireframe: true,
    transparent: true,
    opacity: 0.32,
  });
  const coreMesh = new THREE.Mesh(coreGeo, coreMat);
  scene.add(coreMesh);

  // 3. Delicate Ambient Orbiting Ring
  const ringGeo = new THREE.TorusGeometry(14, 0.05, 16, 100);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xfbbf24,
    transparent: true,
    opacity: 0.15,
  });
  const orbitRing = new THREE.Mesh(ringGeo, ringMat);
  orbitRing.rotation.x = Math.PI / 3;
  scene.add(orbitRing);

  // 4. Stardust Particle System
  const particleCount = 700;
  const particleGeo = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);

  const colGold = new THREE.Color(0xfbbf24);
  const colCyan = new THREE.Color(0x38bdf8);
  const colWhite = new THREE.Color(0xffffff);

  for (let i = 0; i < particleCount * 3; i += 3) {
    positions[i] = (Math.random() - 0.5) * 80;
    positions[i + 1] = (Math.random() - 0.5) * 80;
    positions[i + 2] = (Math.random() - 0.5) * 60;

    const r = Math.random();
    const c = r > 0.65 ? colGold : r > 0.3 ? colCyan : colWhite;
    colors[i] = c.r;
    colors[i + 1] = c.g;
    colors[i + 2] = c.b;
  }

  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const particleMat = new THREE.PointsMaterial({
    size: 0.45,
    vertexColors: true,
    transparent: true,
    opacity: 0.5,
  });

  const particles = new THREE.Points(particleGeo, particleMat);
  scene.add(particles);

  // Smooth mouse tilt
  let targetX = 0, targetY = 0;
  let mouseX = 0, mouseY = 0;

  window.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  function animate() {
    requestAnimationFrame(animate);

    targetX = lerp(targetX, mouseX, 0.04);
    targetY = lerp(targetY, mouseY, 0.04);

    outerMesh.rotation.x += 0.002;
    outerMesh.rotation.y += 0.003;

    coreMesh.rotation.x -= 0.004;
    coreMesh.rotation.y -= 0.003;

    orbitRing.rotation.z += 0.0015;
    orbitRing.rotation.x = Math.PI / 3 + targetY * 0.3;
    orbitRing.rotation.y = targetX * 0.3;

    particles.rotation.y += 0.0006;

    scene.rotation.y = targetX * 0.25;
    scene.rotation.x = -targetY * 0.18;

    renderer.render(scene, camera);
  }

  animate();

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

/* ─── SMOOTH CURSOR ──────────────────────────────────────────── */
function initCursor() {
  if (isTouch) return;

  const dot = document.getElementById('cursor-dot');
  const ring = document.getElementById('cursor-ring');
  const label = document.getElementById('cursor-label');
  if (!dot || !ring || !label) return;

  let mouseX = -100, mouseY = -100;
  let ringX = -100, ringY = -100;

  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    dot.style.transform = `translate(${mouseX - 3}px, ${mouseY - 3}px)`;
  });

  function renderRing() {
    ringX = lerp(ringX, mouseX, 0.2);
    ringY = lerp(ringY, mouseY, 0.2);
    ring.style.transform = `translate(${ringX - 16}px, ${ringY - 16}px)`;
    label.style.transform = `translate(${ringX + 16}px, ${ringY + 12}px)`;
    requestAnimationFrame(renderRing);
  }
  renderRing();

  document.querySelectorAll('[data-cursor]').forEach(item => {
    item.addEventListener('mouseenter', () => {
      const txt = item.getAttribute('data-cursor');
      if (txt) {
        label.textContent = txt;
        label.classList.add('active');
        ring.classList.add('active');
      }
    });
    item.addEventListener('mouseleave', () => {
      label.classList.remove('active');
      ring.classList.remove('active');
    });
  });
}

/* ─── ROLE TYPEWRITER / CYCLER ───────────────────────────────── */
function initRoleCycler() {
  const el = document.getElementById('role-cycler');
  if (!el) return;

  const roles = [
    'Security Research',
    'Full-Stack Development',
    'Android APK Audits',
    'Autonomous AI Systems',
    'Tech Content Creation'
  ];

  let currentIdx = 0;
  let charIdx = 0;
  let isDeleting = false;
  let typingSpeed = 80;

  function tick() {
    const currentWord = roles[currentIdx];

    if (isDeleting) {
      el.textContent = currentWord.substring(0, charIdx - 1);
      charIdx--;
      typingSpeed = 35;
    } else {
      el.textContent = currentWord.substring(0, charIdx + 1);
      charIdx++;
      typingSpeed = 75;
    }

    if (!isDeleting && charIdx === currentWord.length) {
      isDeleting = true;
      typingSpeed = 1800; // Pause at word completion
    } else if (isDeleting && charIdx === 0) {
      isDeleting = false;
      currentIdx = (currentIdx + 1) % roles.length;
      typingSpeed = 400; // Pause before typing next word
    }

    setTimeout(tick, typingSpeed);
  }

  tick();
}

/* ─── 3D TILT EFFECT ─────────────────────────────────────────── */
function init3DTilt() {
  if (isTouch) return;

  const cards = document.querySelectorAll('.tilt-card');
  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = ((y - centerY) / centerY) * -5;
      const rotateY = ((x - centerX) / centerX) * 5;

      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0)';
    });
  });
}

/* ─── SCROLL TRACKER ─────────────────────────────────────────── */
function initScrollTracker() {
  const tracker = document.getElementById('scroll-tracker');
  if (!tracker) return;

  window.addEventListener('scroll', () => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const percent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    tracker.style.width = `${percent}%`;
  });
}

/* ─── PROJECT FILTER TABS ────────────────────────────────────── */
function initProjectFilters() {
  const filterBtns = document.querySelectorAll('.pill-btn');
  const projectCards = document.querySelectorAll('.project-cards-grid .project-tile');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.getAttribute('data-filter');

      projectCards.forEach(card => {
        const cat = card.getAttribute('data-category');
        if (filter === 'all' || cat === filter) {
          card.style.display = 'flex';
          card.style.opacity = '1';
        } else {
          card.style.display = 'none';
          card.style.opacity = '0';
        }
      });
    });
  });
}

/* ─── INTERACTIVE BASH TERMINAL ──────────────────────────────── */
function initTerminal() {
  const input = document.getElementById('terminal-input');
  const logs = document.getElementById('terminal-logs');
  const screen = document.getElementById('terminal-screen');
  if (!input || !logs || !screen) return;

  const commands = {
    help: `Available commands:
  • <span class="text-accent">projects</span> - Highlights of featured open-source work
  • <span class="text-accent">skills</span>   - Key abilities, stacks & tools
  • <span class="text-accent">about</span>    - A quick overview of who I am
  • <span class="text-accent">contact</span>  - Direct links and transmission channels
  • <span class="text-accent">matrix</span>   - Trigger a digital stream
  • <span class="text-accent">clear</span>    - Clear current terminal history`,

    projects: `Featured Projects:
  1. <a href="https://github.com/ramaneon/socneon" target="_blank" class="text-accent">socneon</a>        - Client-side MITRE ATT&CK SOC analyzer
  2. <a href="https://github.com/ramaneon/apk-decompiler" target="_blank" class="text-accent">apk-decompiler</a> - Browser-based Android secret scanner
  3. <a href="https://github.com/ramaneon/jarvisV2" target="_blank" class="text-accent">jarvisV2</a>       - Native offline PC controller & autonomous assistant
  4. <a href="https://github.com/ramaneon/drive-analyzer" target="_blank" class="text-accent">drive-analyzer</a> - Private local storage junk visualization
  5. <a href="https://github.com/ramaneon/routine" target="_blank" class="text-accent">routine</a>        - Lightweight Kotlin Android utility`,

    skills: `Core Tech Stack:
  • Languages   : Python, JavaScript/TypeScript, C/C++, Kotlin, Bash
  • Security    : Android APK Decompilation, Ghidra, Burp Suite, SOC Logs
  • Web & UI    : React, Node.js, WebSockets, Three.js WebGL
  • AI Systems  : Autonomous Agents, Local LLMs, OCR Pipelines`,

    about: `Raman Kumar (ramaneon)
Full-Stack Developer & Security Researcher.
I enjoy building fast, private, and resilient web tools that run right in your browser.
Creator at @Techivibe on YouTube.`,

    contact: `Channels:
  • GitHub    : https://github.com/ramaneon
  • TryHackMe : https://tryhackme.com/p/ramaneon
  • YouTube   : https://www.youtube.com/@Techivibe
  • LinkedIn  : https://www.linkedin.com/in/raman-kumar-036320395/`,

    matrix: `<span class="text-green">Follow the white rabbit... 01000110 01010101 01001100 01001100 00100000 01010011 01010100 01000001 01000011 01001011</span>`
  };

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const raw = input.value.trim();
      input.value = '';
      if (!raw) return;

      const cmd = raw.toLowerCase();

      if (cmd === 'clear') {
        logs.innerHTML = '';
        return;
      }

      const entry = document.createElement('div');
      entry.className = 'terminal-log-entry';

      let reply = '';
      if (commands[cmd]) {
        reply = commands[cmd];
      } else {
        reply = `Command '${cmd}' not recognized. Type <span class="text-accent">help</span> to view commands.`;
      }

      entry.innerHTML = `
        <div class="terminal-cmd-echo">guest@ramaneon:~$ ${raw}</div>
        <div class="terminal-cmd-res">${reply}</div>
      `;

      logs.appendChild(entry);
      screen.scrollTop = screen.scrollHeight;
    }
  });
}

/* ─── COPY EMAIL ─────────────────────────────────────────────── */
function initCopyEmail() {
  const btn = document.getElementById('copy-email-btn');
  const label = document.getElementById('copy-email-text');
  if (!btn || !label) return;

  btn.addEventListener('click', () => {
    const email = 'ramankumar.official@outlook.com';
    navigator.clipboard.writeText(email).then(() => {
      const original = label.textContent;
      label.textContent = 'Copied to clipboard! ✓';
      label.style.color = '#fbbf24';
      setTimeout(() => {
        label.textContent = original;
        label.style.color = '';
      }, 2500);
    }).catch(() => {
      window.location.href = `mailto:${email}`;
    });
  });
}

/* ─── MOBILE DRAWER ──────────────────────────────────────────── */
function initMobileDrawer() {
  const toggle = document.getElementById('mobile-toggle');
  const menu = document.getElementById('mobile-menu');
  const close = document.getElementById('mobile-close');
  const backdrop = document.getElementById('mobile-backdrop');
  const links = document.querySelectorAll('.mob-link');

  function openMenu() {
    menu?.classList.add('open');
    backdrop?.classList.add('open');
  }

  function closeMenu() {
    menu?.classList.remove('open');
    backdrop?.classList.remove('open');
  }

  toggle?.addEventListener('click', openMenu);
  close?.addEventListener('click', closeMenu);
  backdrop?.addEventListener('click', closeMenu);

  links.forEach(l => l.addEventListener('click', closeMenu));
}

/* ─── GSAP SCROLL ENHANCEMENTS ───────────────────────────────── */
function initScrollAnimations() {
  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);

    gsap.utils.toArray('.smooth-card').forEach(card => {
      gsap.fromTo(card,
        { opacity: 0, y: 25 },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: card,
            start: 'top 88%',
            toggleActions: 'play none none none'
          }
        }
      );
    });
  }
}

/* ─── DOM INITIALIZATION ─────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initThreeWebGL();
  initCursor();
  initRoleCycler();
  init3DTilt();
  initScrollTracker();
  initProjectFilters();
  initTerminal();
  initCopyEmail();
  initMobileDrawer();
  initScrollAnimations();
});
