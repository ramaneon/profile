/**
 * main.js — Raman Kumar (ramaneon)
 * Silky Smooth, Human & Interactive System
 * ─────────────────────────────────────────────────────────────
 */

'use strict';

const lerp = (a, b, t) => a + (b - a) * t;
const isTouch = window.matchMedia('(pointer: coarse)').matches;

/* ─── WEB AUDIO API: CUTE RAINDROP & VIOLIN CHIME ENGINE ───── */
let audioCtx = null;
let sfxEnabled = false;

// Pentatonic warm notes (C Major Pentatonic: C5, D5, E5, G5, A5, C6)
const PENTATONIC_SCALE = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50];
let lastHoverTime = 0;
let lastNoteIdx = 0;

function initAudio() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) audioCtx = new AudioContext();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

/**
 * Plays a gentle, organic raindrop droplet sound.
 * Uses a soft sine wave with quick pitch modulation & exponential decay.
 */
function playRainDroplet(freq = null) {
  if (!sfxEnabled || !audioCtx) return;
  try {
    const now = audioCtx.currentTime;
    const baseFreq = freq || PENTATONIC_SCALE[Math.floor(Math.random() * PENTATONIC_SCALE.length)];

    // Primary Droplet Oscillator
    const osc = audioCtx.createOscillator();
    const oscHarmonic = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();

    // Warm filter to round off harsh edges
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(baseFreq * 2.8, now);

    osc.type = 'sine';
    // Gentle water drop pitch flick
    osc.frequency.setValueAtTime(baseFreq * 1.06, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq, now + 0.03);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.98, now + 0.18);

    // Warm overtone for violin-like acoustic pluck resonance
    oscHarmonic.type = 'triangle';
    oscHarmonic.frequency.setValueAtTime(baseFreq * 2, now);

    // Very soft volume envelope
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.028, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

    osc.connect(filter);
    oscHarmonic.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    oscHarmonic.start(now);
    osc.stop(now + 0.23);
    oscHarmonic.stop(now + 0.23);
  } catch (e) {
    // audio fallback
  }
}

/**
 * Plays a cute, serene 3-note melodic rain arpeggio (like a music box or gentle violin pizzicato)
 */
function playMelodyChime() {
  if (!sfxEnabled || !audioCtx) return;
  // Notes: E5 (659Hz) -> G5 (784Hz) -> C6 (1046Hz)
  const melodyNotes = [659.25, 783.99, 1046.50];
  melodyNotes.forEach((note, idx) => {
    setTimeout(() => {
      playRainDroplet(note);
    }, idx * 110);
  });
}

// SFX Toggle with melodic confirmation
const sfxToggleBtn = document.getElementById('sfx-toggle');
if (sfxToggleBtn) {
  sfxToggleBtn.addEventListener('click', () => {
    initAudio();
    sfxEnabled = !sfxEnabled;
    sfxToggleBtn.style.color = sfxEnabled ? '#fbbf24' : '';
    sfxToggleBtn.style.borderColor = sfxEnabled ? 'rgba(251, 191, 36, 0.4)' : '';
    sfxToggleBtn.style.background = sfxEnabled ? 'rgba(251, 191, 36, 0.1)' : '';
    if (sfxEnabled) {
      playMelodyChime();
    }
  });
}

// Selective & throttled sound triggers:
// ONLY primary buttons and main nav links, with at least 850ms cooldown so it never spams
const KEY_SOUND_TARGETS = '.primary-btn, .launch-btn, .nav-link, .pill-btn, .copy-email-btn';

document.querySelectorAll(KEY_SOUND_TARGETS).forEach(el => {
  el.addEventListener('mouseenter', () => {
    const now = Date.now();
    // 850ms throttle so it only plays occasional, gentle droplets
    if (now - lastHoverTime > 850) {
      lastHoverTime = now;
      lastNoteIdx = (lastNoteIdx + 1) % PENTATONIC_SCALE.length;
      playRainDroplet(PENTATONIC_SCALE[lastNoteIdx]);
    }
  });

  el.addEventListener('click', () => {
    initAudio();
    if (sfxEnabled) {
      playMelodyChime();
    }
  });
});

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
