/**
 * main.js — RAMANEON Cyberpunk & Gamer HUD Portfolio
 * ─────────────────────────────────────────────────────────────
 * FEATURES:
 *  ✓ Three.js 3D WebGL cyber core (wireframe icosahedron + particle constellation)
 *  ✓ Dynamic cursor with hover labels & smooth lerp
 *  ✓ Web Audio API synthesized cyberpunk audio SFX
 *  ✓ Typewriter / role cycler
 *  ✓ 3D tilt cards with specular reflections
 *  ✓ Interactive CLI Terminal with custom commands & matrix effect
 *  ✓ Project filter tabs (Security, AI, Tools)
 *  ✓ Scroll progress tracker
 *  ✓ Mobile navigation drawer
 */

'use strict';

/* ─── GLOBAL UTILITIES ───────────────────────────────────────── */
const lerp = (a, b, t) => a + (b - a) * t;
const isTouch = window.matchMedia('(pointer: coarse)').matches;

/* ─── WEB AUDIO API CYBER SFX ────────────────────────────────── */
let audioCtx = null;
let sfxEnabled = false;

function initAudio() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) audioCtx = new AudioContext();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playCyberBeep(freq = 880, duration = 0.08, type = 'sine') {
  if (!sfxEnabled || !audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, audioCtx.currentTime + duration);

    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) {
    // audio fallback silent
  }
}

// SFX Toggle Handler
const sfxToggleBtn = document.getElementById('sfx-toggle');
if (sfxToggleBtn) {
  sfxToggleBtn.addEventListener('click', () => {
    initAudio();
    sfxEnabled = !sfxEnabled;
    sfxToggleBtn.style.color = sfxEnabled ? '#facc15' : '';
    sfxToggleBtn.style.borderColor = sfxEnabled ? 'rgba(250, 204, 21, 0.4)' : '';
    if (sfxEnabled) playCyberBeep(1200, 0.15, 'triangle');
  });
}

// Trigger sound on any interactable elements if enabled
document.querySelectorAll('a, button, .tilt-card').forEach(el => {
  el.addEventListener('mouseenter', () => {
    if (sfxEnabled) playCyberBeep(950, 0.05, 'sine');
  });
  el.addEventListener('click', () => {
    initAudio();
    if (sfxEnabled) playCyberBeep(1400, 0.08, 'triangle');
  });
});

/* ─── THREE.JS 3D WEBGL INTERACTIVE CANVAS ───────────────────── */
function initThreeWebGL() {
  const canvas = document.getElementById('bg-webgl-canvas');
  if (!canvas || !window.THREE) return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 35;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // 1. Central 3D Cyber Wireframe Icosahedron
  const icoGeo = new THREE.IcosahedronGeometry(9, 1);
  const icoMat = new THREE.MeshBasicMaterial({
    color: 0xfacc15,
    wireframe: true,
    transparent: true,
    opacity: 0.28,
  });
  const cyberIco = new THREE.Mesh(icoGeo, icoMat);
  scene.add(cyberIco);

  // Inner Core Glowing Mesh
  const coreGeo = new THREE.OctahedronGeometry(4.5, 0);
  const coreMat = new THREE.MeshBasicMaterial({
    color: 0x00f0ff,
    wireframe: true,
    transparent: true,
    opacity: 0.45,
  });
  const cyberCore = new THREE.Mesh(coreGeo, coreMat);
  scene.add(cyberCore);

  // 2. Surrounding Cyber Orbital Ring
  const torusGeo = new THREE.TorusGeometry(16, 0.08, 16, 100);
  const torusMat = new THREE.MeshBasicMaterial({
    color: 0xfacc15,
    transparent: true,
    opacity: 0.22,
  });
  const torusRing = new THREE.Mesh(torusGeo, torusMat);
  torusRing.rotation.x = Math.PI / 3;
  scene.add(torusRing);

  // 3. Cyber Particles Nebula
  const particleCount = 900;
  const particleGeo = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);

  const colorYellow = new THREE.Color(0xfacc15);
  const colorCyan = new THREE.Color(0x00f0ff);
  const colorWhite = new THREE.Color(0xffffff);

  for (let i = 0; i < particleCount * 3; i += 3) {
    positions[i] = (Math.random() - 0.5) * 90;
    positions[i + 1] = (Math.random() - 0.5) * 90;
    positions[i + 2] = (Math.random() - 0.5) * 70;

    const r = Math.random();
    const c = r > 0.6 ? colorYellow : r > 0.2 ? colorCyan : colorWhite;
    colors[i] = c.r;
    colors[i + 1] = c.g;
    colors[i + 2] = c.b;
  }

  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const particleMat = new THREE.PointsMaterial({
    size: 0.5,
    vertexColors: true,
    transparent: true,
    opacity: 0.65,
  });

  const particleSystem = new THREE.Points(particleGeo, particleMat);
  scene.add(particleSystem);

  // Mouse reaction
  let targetX = 0;
  let targetY = 0;
  let mouseX = 0;
  let mouseY = 0;

  window.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  // Render loop
  function animate() {
    requestAnimationFrame(animate);

    targetX = lerp(targetX, mouseX, 0.05);
    targetY = lerp(targetY, mouseY, 0.05);

    cyberIco.rotation.x += 0.003;
    cyberIco.rotation.y += 0.005;

    cyberCore.rotation.x -= 0.006;
    cyberCore.rotation.y -= 0.004;

    torusRing.rotation.z += 0.002;
    torusRing.rotation.x = Math.PI / 3 + targetY * 0.4;
    torusRing.rotation.y = targetX * 0.4;

    particleSystem.rotation.y += 0.0008;

    scene.rotation.y = targetX * 0.35;
    scene.rotation.x = -targetY * 0.25;

    renderer.render(scene, camera);
  }

  animate();

  // Resize handler
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

/* ─── HUD CURSOR LOGIC ───────────────────────────────────────── */
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
    ringX = lerp(ringX, mouseX, 0.18);
    ringY = lerp(ringY, mouseY, 0.18);
    ring.style.transform = `translate(${ringX - 16}px, ${ringY - 16}px)`;
    label.style.transform = `translate(${ringX + 18}px, ${ringY + 14}px)`;
    requestAnimationFrame(renderRing);
  }
  renderRing();

  // Hover target data-cursor labels
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

/* ─── HERO ROLE CYCLER ───────────────────────────────────────── */
function initRoleCycler() {
  const el = document.getElementById('cycler-text');
  if (!el) return;

  const roles = [
    'Security Researcher',
    'Full-Stack Developer',
    'APK Decompiler & Auditor',
    'Autonomous AI Architect',
    'Creator @Techivibe'
  ];

  let currentIdx = 0;
  let charIdx = 0;
  let isDeleting = false;
  let typingSpeed = 90;

  function typeTick() {
    const currentWord = roles[currentIdx];

    if (isDeleting) {
      el.textContent = currentWord.substring(0, charIdx - 1);
      charIdx--;
      typingSpeed = 40;
    } else {
      el.textContent = currentWord.substring(0, charIdx + 1);
      charIdx++;
      typingSpeed = 90;
    }

    if (!isDeleting && charIdx === currentWord.length) {
      isDeleting = true;
      typingSpeed = 1600; // Pause at end of word
    } else if (isDeleting && charIdx === 0) {
      isDeleting = false;
      currentIdx = (currentIdx + 1) % roles.length;
      typingSpeed = 400; // Pause before typing new word
    }

    setTimeout(typeTick, typingSpeed);
  }

  typeTick();
}

/* ─── 3D TILT EFFECT ON CARDS ────────────────────────────────── */
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

      const rotateX = ((y - centerY) / centerY) * -7;
      const rotateY = ((x - centerX) / centerX) * 7;

      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
    });
  });
}

/* ─── SCROLL PROGRESS TRACKER ────────────────────────────────── */
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
  const filterBtns = document.querySelectorAll('.filter-btn');
  const projectCards = document.querySelectorAll('.projects-grid .project-card');

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
  const input = document.getElementById('term-input');
  const history = document.getElementById('term-history');
  const body = document.getElementById('term-body');
  if (!input || !history || !body) return;

  const commands = {
    help: `Available commands:
  • <span class="text-yellow">projects</span>   - View highlighted open-source tools
  • <span class="text-yellow">skills</span>     - Inspect operator abilities & ratings
  • <span class="text-yellow">whoami</span>     - System operator bio & coordinates
  • <span class="text-yellow">matrix</span>     - Run real-time cypher stream
  • <span class="text-yellow">contact</span>    - Show transmission frequencies
  • <span class="text-yellow">streak</span>     - Check current GitHub commit streak
  • <span class="text-yellow">clear</span>      - Clean console window
  • <span class="text-yellow">echo [msg]</span> - Print raw argument to terminal`,

    projects: `[SYSTEM::REPOSITORIES]
  1. <a href="https://github.com/ramaneon/socneon" target="_blank" class="text-yellow">socneon</a>              - 100% client-side MITRE ATT&CK SOC analyzer
  2. <a href="https://github.com/ramaneon/apk-decompiler" target="_blank" class="text-yellow">apk-decompiler</a>       - Android bug bounty secret & Firebase scanner
  3. <a href="https://github.com/ramaneon/jarvisV2" target="_blank" class="text-yellow">jarvisV2</a>             - Zero-API offline autonomous PC controller
  4. <a href="https://github.com/ramaneon/drive-analyzer" target="_blank" class="text-yellow">drive-analyzer</a>       - Browser-based storage & junk visualization
  5. <a href="https://github.com/ramaneon/routine" target="_blank" class="text-yellow">routine</a>              - Native Kotlin Android automation package`,

    skills: `[OPERATOR::SKILL_MATRIX]
  - Python / AsyncIO / Automation       : [PWR 96/100]
  - C / C++ & Win32 APIs / Telemetry    : [PWR 92/100]
  - JavaScript / TypeScript / Three.js   : [PWR 95/100]
  - Android APK Security & Decompilation : [PWR 94/100]
  - SOC Correlation & MITRE ATT&CK       : [PWR 90/100]
  - Autonomous Agents & JARVIS Systems   : [PWR 93/100]`,

    whoami: `Operator   : Raman Kumar (ramaneon)
Class      : Full-Stack Security & System Architect
Mission    : Engineering high-voltage software, breaking APK binaries, building neural agents.
Handle     : @ramaneon (GitHub) | @Techivibe (YouTube)
Status     : LEVEL 99 · ALL CIRCUITS LIVE`,

    contact: `[TRANSMISSION::FREQUENCIES]
  • GitHub    : https://github.com/ramaneon
  • TryHackMe : https://tryhackme.com/p/ramaneon
  • YouTube   : https://www.youtube.com/@Techivibe
  • LinkedIn  : https://www.linkedin.com/in/raman-kumar-036320395/
  • Instagram : https://www.instagram.com/techivibe/`,

    streak: `[GIT::STREAK_TELEMETRY]
  Current Streak : 45+ days active commits
  Total Commits  : 500+ across security, AI & web platforms
  Status         : UNBROKEN`,

    sudo: `Permission denied: operator already possesses root privileges.`,
  };

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const raw = input.value.trim();
      input.value = '';
      if (!raw) return;

      const args = raw.split(' ');
      const cmd = args[0].toLowerCase();

      if (cmd === 'clear') {
        history.innerHTML = '';
        return;
      }

      const block = document.createElement('div');
      block.className = 'term-output-block';

      let response = '';
      if (cmd === 'matrix') {
        response = '<span class="text-green">WAKE UP, NEO... THE MATRIX HAS YOU. 01001111 01010110 01000101 01010010 01000100 01010010 01001001 01010110 01000101</span>';
      } else if (cmd === 'echo') {
        response = args.slice(1).join(' ');
      } else if (commands[cmd]) {
        response = commands[cmd];
      } else {
        response = `Command not recognized: '${cmd}'. Type <span class="text-yellow">help</span> for assistance.`;
      }

      block.innerHTML = `
        <div class="term-out-cmd">ramaneon@core:~$ ${raw}</div>
        <div class="term-out-resp">${response}</div>
      `;

      history.appendChild(block);
      body.scrollTop = body.scrollHeight;
    }
  });
}

/* ─── COPY EMAIL DIRECT TRANSMISSION ─────────────────────────── */
function initCopyEmail() {
  const btn = document.getElementById('copy-email-btn');
  const label = document.getElementById('copy-email-label');
  if (!btn || !label) return;

  btn.addEventListener('click', () => {
    const email = 'ramankumar.official@outlook.com'; // User direct contact fallback
    navigator.clipboard.writeText(email).then(() => {
      const orig = label.textContent;
      label.textContent = 'COPIED TO CLIPBOARD! [✓]';
      label.style.color = '#facc15';
      setTimeout(() => {
        label.textContent = orig;
        label.style.color = '';
      }, 2500);
    }).catch(() => {
      window.location.href = 'mailto:ramankumar.official@outlook.com';
    });
  });
}

/* ─── MOBILE DRAWER LOGIC ────────────────────────────────────── */
function initMobileDrawer() {
  const burger = document.getElementById('burger-btn');
  const drawer = document.getElementById('mobile-drawer');
  const closeBtn = document.getElementById('close-drawer-btn');
  const bg = document.getElementById('mobile-drawer-bg');
  const links = document.querySelectorAll('.mn-item');

  function open() { drawer?.classList.add('open'); }
  function close() { drawer?.classList.remove('open'); }

  burger?.addEventListener('click', open);
  closeBtn?.addEventListener('click', close);
  bg?.addEventListener('click', close);

  links.forEach(l => l.addEventListener('click', close));
}

/* ─── GSAP SCROLL REVEALS ────────────────────────────────────── */
function initScrollReveals() {
  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);

    document.querySelectorAll('[data-reveal]').forEach(el => {
      gsap.fromTo(el, 
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 85%',
            toggleActions: 'play none none none'
          }
        }
      );
    });
  } else {
    // Fallback IntersectionObserver
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    document.querySelectorAll('[data-reveal]').forEach(el => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(30px)';
      el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
      observer.observe(el);
    });
  }
}

/* ─── INITIALIZATION ON DOM READY ────────────────────────────── */
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
  initScrollReveals();
});
