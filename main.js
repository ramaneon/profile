/**
 * main.js — Raman Kumar · ramaneon
 * ─────────────────────────────────────────────────────────────
 * FEATURES (all preserved + upgraded):
 *  ✓ Lenis ultra-smooth scroll (144hz)
 *  ✓ Two-ring lerp cursor with label
 *  ✓ Three.js WebGL particle field + ring geometry
 *  ✓ Scroll progress bar
 *  ✓ Nav sticky + mobile burger
 *  ✓ Hero entrance sequence (badge, name clip, role, tagline, CTAs, meta, scroll cue)
 *  ✓ Word-by-word name reveal
 *  ✓ Role ticker cycling
 *  ✓ GSAP ScrollTrigger section reveals
 *  ✓ IntersectionObserver g-reveal triggers
 *  ✓ 3D tilt cards (bento + plat rows)
 *  ✓ Magnetic buttons (lerp elastic)
 *  ✓ Avatar 3D mouse parallax
 *  ✓ Terminal typer
 *  ✓ Count-up numbers
 *  ✓ Orb + hero text scroll parallax
 *  ✓ Marquee speed bump on scroll
 */

'use strict';

/* ════════════════════════════════════════════════════════════════
   DEVICE DETECTION — one source of truth
   ════════════════════════════════════════════════════════════════ */
const IS_TOUCH  = window.matchMedia('(pointer: coarse)').matches;
const IS_MOBILE = window.innerWidth < 768 || IS_TOUCH;
const IS_LOW_END = IS_MOBILE && navigator.hardwareConcurrency <= 4;

/* ════════════════════════════════════════════════════════════════
   LERP HELPER
   ════════════════════════════════════════════════════════════════ */
const lerp = (a, b, t) => a + (b - a) * t;

/* ════════════════════════════════════════════════════════════════
   1. LENIS SMOOTH SCROLL
   ════════════════════════════════════════════════════════════════ */
let lenis;

function initLenis() {
  // Mobile: native scroll is GPU-accelerated — Lenis adds overhead, skip it
  if (!window.Lenis || IS_MOBILE) return;

  lenis = new Lenis({
    duration:   1.3,
    easing:     t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    direction:  'vertical',
    gestureDirection: 'vertical',
    smooth:     true,
    smoothTouch: false,
    touchMultiplier: 2,
  });

  // Integrate with GSAP ScrollTrigger
  if (window.ScrollTrigger) {
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(time => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  } else {
    // fallback RAF loop
    function lenisLoop(time) {
      lenis.raf(time);
      requestAnimationFrame(lenisLoop);
    }
    requestAnimationFrame(lenisLoop);
  }

  // Wire all anchor <a href="#..."> through Lenis
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = document.querySelector(a.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: -62, duration: 1.4 });
      // Close mobile menu
      document.getElementById('nav-mobile')?.classList.remove('open');
      document.getElementById('nav-burger')?.classList.remove('open');
    });
  });
}

/* ════════════════════════════════════════════════════════════════
   2. PREMIUM TWO-RING LERP CURSOR  (GPU-composited — zero layout cost)
   ════════════════════════════════════════════════════════════════ */

// Shared cursor state — read by the master RAF loop
const _cur = { mx: -200, my: -200, ox: -200, oy: -200, lx: -200, ly: -200, active: false };

function initCursor() {
  const dot   = document.getElementById('cur-dot');
  const outer = document.getElementById('cur-outer');
  const label = document.getElementById('cur-label');
  if (!dot || !matchMedia('(pointer:fine)').matches) return;

  _cur.active = true;
  _cur.mx = -200; _cur.my = -200;
  _cur.ox = -200; _cur.oy = -200;
  _cur.lx = -200; _cur.ly = -200;

  // Store raw coords only — NO DOM write here
  document.addEventListener('mousemove', e => {
    _cur.mx = e.clientX;
    _cur.my = e.clientY;
  }, { passive: true });

  // DOM writes happen in master RAF (see bottom of file)
  _cur.dot   = dot;
  _cur.outer = outer;
  _cur.label = label;

  // Hover: expand + label
  document.querySelectorAll('[data-cursor-label]').forEach(el => {
    el.addEventListener('mouseenter', () => {
      label.textContent = el.dataset.cursorLabel;
      document.body.classList.add('cur-hover');
    });
    el.addEventListener('mouseleave', () => {
      document.body.classList.remove('cur-hover');
      label.textContent = '';
    });
  });

  // Generic interactive expand
  document.querySelectorAll('a:not([data-cursor-label]), button:not([data-cursor-label]), .tilt-el').forEach(el => {
    el.addEventListener('mouseenter', () => document.body.classList.add('cur-hover'));
    el.addEventListener('mouseleave', () => document.body.classList.remove('cur-hover'));
  });

  // Visibility
  document.addEventListener('mouseleave', () => {
    dot.style.opacity   = '0';
    outer.style.opacity = '0';
  });
  document.addEventListener('mouseenter', () => {
    dot.style.opacity   = '1';
    outer.style.opacity = '1';
  });
}

/* ════════════════════════════════════════════════════════════════
   3. THREE.JS — WEBGL PARTICLE FIELD
   ════════════════════════════════════════════════════════════════ */
function initWebGL() {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas || !window.THREE) return;
  // Skip WebGL entirely on very low-end mobile — saves ~60ms paint + GPU pressure
  if (IS_LOW_END) { canvas.style.display = 'none'; return; }

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 6;

  /* Particle cloud */
  const COUNT = IS_MOBILE ? 300 : (window.innerWidth < 1200 ? 900 : 1600);
  const pos   = new Float32Array(COUNT * 3);
  const alpha = new Float32Array(COUNT);
  const speed = new Float32Array(COUNT);

  for (let i = 0; i < COUNT; i++) {
    pos[i*3]   = (Math.random() - 0.5) * 24;
    pos[i*3+1] = (Math.random() - 0.5) * 18;
    pos[i*3+2] = (Math.random() - 0.5) * 12;
    alpha[i]   = Math.random();
    speed[i]   = Math.random() * 0.5 + 0.2;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('alpha',    new THREE.BufferAttribute(alpha, 1));
  geo.setAttribute('speed',    new THREE.BufferAttribute(speed, 1));

  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: {
      uTime:  { value: 0 },
      uColor: { value: new THREE.Color(0xa78bfa) },
    },
    vertexShader: `
      attribute float alpha; attribute float speed;
      varying float vA;
      uniform float uTime;
      void main() {
        vA = alpha;
        vec3 p = position;
        p.y += sin(uTime * speed * 0.28 + position.x * 0.4) * 0.14;
        p.x += cos(uTime * speed * 0.18 + position.z * 0.3) * 0.09;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = (1.6 + alpha * 0.8) * (260.0 / -mv.z);
        gl_Position  = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      varying float vA;
      uniform vec3 uColor;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        if(d > 0.5) discard;
        gl_FragColor = vec4(uColor, smoothstep(0.5, 0.0, d) * vA * 0.5);
      }
    `,
  });

  const particles = new THREE.Points(geo, mat);
  scene.add(particles);

  /* Thin accent rings */
  const makeRing = (r, col, op, rx, ry, rz) => {
    const m = new THREE.Mesh(
      new THREE.TorusGeometry(r, 0.005, 16, 120),
      new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op })
    );
    m.rotation.set(rx, ry, rz);
    scene.add(m);
    return m;
  };
  const ring1 = makeRing(3.4, 0xa78bfa, 0.12, Math.PI/3,    0,          0);
  const ring2 = makeRing(5.0, 0x60a5fa, 0.06, -Math.PI/4,  Math.PI/5,  0);
  const ring3 = makeRing(2.1, 0x4ade80, 0.04,  Math.PI/2,  Math.PI/8,  0);

  /* Mouse parallax */
  let rmx = 0, rmy = 0;
  window.addEventListener('mousemove', e => {
    rmx = (e.clientX / window.innerWidth  - 0.5) * 2;
    rmy = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  /* Resize */
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  let cx = 0, cy = 0;
  let t  = 0;

  function glLoop() {
    requestAnimationFrame(glLoop);
    t += 0.004;
    mat.uniforms.uTime.value = t;

    cx = lerp(cx, rmx * 0.45, 0.03);
    cy = lerp(cy, -rmy * 0.3, 0.03);
    camera.position.x = cx;
    camera.position.y = cy;

    ring1.rotation.z += 0.0011;
    ring2.rotation.z -= 0.0007;
    ring3.rotation.y += 0.0009;
    particles.rotation.y += 0.00018;

    renderer.render(scene, camera);
  }
  glLoop();
}

/* ════════════════════════════════════════════════════════════════
   4. SCROLL PROGRESS BAR
   ════════════════════════════════════════════════════════════════ */
function initScrollProgress() {
  const bar = document.getElementById('scroll-prog');
  if (!bar) return;
  if (lenis) {
    lenis.on('scroll', ({ scroll, limit }) => {
      bar.style.width = (scroll / limit * 100) + '%';
    });
  } else {
    window.addEventListener('scroll', () => {
      const p = window.scrollY / (document.body.scrollHeight - window.innerHeight);
      bar.style.width = Math.min(p * 100, 100) + '%';
    }, { passive: true });
  }
}

/* ════════════════════════════════════════════════════════════════
   5. NAV — STICKY + MOBILE BURGER
   ════════════════════════════════════════════════════════════════ */
function initNav() {
  const nav    = document.getElementById('nav');
  const burger = document.getElementById('nav-burger');
  const mobile = document.getElementById('nav-mobile');

  const onScroll = () => nav?.classList.toggle('scrolled', window.scrollY > 50);
  window.addEventListener('scroll', onScroll, { passive: true });
  if (lenis) lenis.on('scroll', () => nav?.classList.toggle('scrolled', window.scrollY > 50));

  burger?.addEventListener('click', () => {
    burger.classList.toggle('open');
    mobile?.classList.toggle('open');
  });
}

/* ════════════════════════════════════════════════════════════════
   6. HERO ENTRANCE SEQUENCE
   ════════════════════════════════════════════════════════════════ */
function heroEntrance() {
  /* Badge */
  const badge = document.querySelector('.hero-badge');
  if (badge) {
    setTimeout(() => {
      badge.style.opacity   = '1';
      badge.style.transform = 'translateY(0)';
    }, 100);
  }

  /* Name words (clip reveal) */
  document.querySelectorAll('.hn-w').forEach((w, i) => {
    setTimeout(() => w.classList.add('in'), 200 + i * 140);
  });

  /* Role row */
  const role = document.querySelector('.hero-role');
  if (role) setTimeout(() => { role.style.opacity = '1'; role.style.transform = 'none'; }, 440);

  /* Tagline */
  const tag = document.querySelector('.hero-tagline');
  if (tag) setTimeout(() => { tag.style.opacity = '1'; tag.style.transform = 'none'; }, 560);

  /* Actions */
  const act = document.querySelector('.hero-actions');
  if (act) setTimeout(() => { act.style.opacity = '1'; act.style.transform = 'none'; }, 680);

  /* Meta stats */
  const meta = document.querySelector('.hero-meta');
  if (meta) setTimeout(() => { meta.style.opacity = '1'; meta.style.transform = 'none'; }, 820);

  /* Right avatar */
  const right = document.getElementById('h-right');
  if (right) setTimeout(() => right.classList.add('in'), 260);

  /* Scroll cue */
  const cue = document.getElementById('h-scroll-cue');
  if (cue) setTimeout(() => cue.classList.add('in'), 1200);
}

/* ════════════════════════════════════════════════════════════════
   7. ROLE CYCLER
   ════════════════════════════════════════════════════════════════ */
function initRoleCycler() {
  const words = document.querySelectorAll('.rc-word');
  if (!words.length) return;
  let idx = 0;
  words[0].classList.add('active');

  setInterval(() => {
    words[idx].classList.remove('active');
    idx = (idx + 1) % words.length;
    words[idx].classList.add('active');
  }, 2800);
}

/* ════════════════════════════════════════════════════════════════
   8. SCROLL REVEALS — IntersectionObserver + GSAP ScrollTrigger
   ════════════════════════════════════════════════════════════════ */
function initReveal() {
  /* Simple g-reveal elements */
  const els = document.querySelectorAll('.g-reveal, .g-reveal-r');
  const io  = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const delay = parseFloat(e.target.dataset.delay) || 0;
      setTimeout(() => e.target.classList.add('on'), delay);
      io.unobserve(e.target);
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -50px 0px' });
  els.forEach(el => io.observe(el));

  /* GSAP-powered section heading line reveals */
  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);

    // Bento cards stagger
    gsap.from('.bento-card', {
      scrollTrigger: { trigger: '.bento-grid', start: 'top 85%' },
      y: 60, opacity: 0, scale: 0.96, duration: 0.7,
      stagger: 0.1, ease: 'power3.out',
    });

    // Platform rows stagger
    gsap.from('.plat-row', {
      scrollTrigger: { trigger: '.plat-list', start: 'top 85%' },
      x: -40, opacity: 0, duration: 0.65,
      stagger: 0.1, ease: 'power3.out',
    });

    // Connect links
    gsap.from('.cl-item', {
      scrollTrigger: { trigger: '.connect-links', start: 'top 90%' },
      x: 30, opacity: 0, duration: 0.5,
      stagger: 0.08, ease: 'power3.out',
    });

    // Pill flow pills
    gsap.from('.pf-pill', {
      scrollTrigger: { trigger: '.pill-flow', start: 'top 88%' },
      y: 20, opacity: 0, scale: 0.88, duration: 0.4,
      stagger: 0.05, ease: 'back.out(1.6)',
    });

    // Tags
    gsap.from('.tag', {
      scrollTrigger: { trigger: '.about-tags', start: 'top 90%' },
      y: 16, opacity: 0, scale: 0.9, duration: 0.4,
      stagger: 0.07, ease: 'back.out(1.5)',
    });

    // Refresh ScrollTrigger with Lenis
    if (lenis) {
      lenis.on('scroll', ScrollTrigger.update);
    }
  }
}

/* ════════════════════════════════════════════════════════════════
   9. 3D TILT — desktop only (touch devices skip entirely)
   ════════════════════════════════════════════════════════════════ */
function initTilt() {
  if (IS_TOUCH) return; // tilt is meaningless + janky on touch
  document.querySelectorAll('.tilt-el').forEach(card => {
    const MAX = 7;
    let tx = 0, ty = 0;   // target
    let cx = 0, cy = 0;   // current (lerped)
    let raf = null;
    let inside = false;

    function animate() {
      cx = lerp(cx, tx, 0.1);
      cy = lerp(cy, ty, 0.1);
      card.style.transform = `perspective(900px) rotateX(${cy}deg) rotateY(${cx}deg) translateZ(6px)`;
      if (inside || Math.abs(cx) > 0.02 || Math.abs(cy) > 0.02) {
        raf = requestAnimationFrame(animate);
      } else {
        card.style.transform = 'perspective(900px) rotateX(0) rotateY(0) translateZ(0)';
        raf = null;
      }
    }

    card.addEventListener('mouseenter', () => {
      inside = true;
      if (!raf) raf = requestAnimationFrame(animate);
    });
    card.addEventListener('mousemove', e => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width  - 0.5;
      const y = (e.clientY - r.top)  / r.height - 0.5;
      tx =  x * MAX;
      ty = -y * MAX;
      // Glow spotlight
      card.style.setProperty('--gx', `${(x + 0.5) * 100}%`);
      card.style.setProperty('--gy', `${(y + 0.5) * 100}%`);
    });
    card.addEventListener('mouseleave', () => {
      inside = false;
      tx = 0; ty = 0;
      if (!raf) raf = requestAnimationFrame(animate);
    });
  });
}

/* ════════════════════════════════════════════════════════════════
   10. MAGNETIC BUTTONS — desktop only
   ════════════════════════════════════════════════════════════════ */
function initMagnetic() {
  if (IS_TOUCH) return; // magnetic pull on touch = broken UX
  document.querySelectorAll('.magnetic').forEach(btn => {
    const STRENGTH = 0.38;
    let bx = 0, by = 0;   // target offset
    let cx = 0, cy = 0;   // lerped offset
    let raf = null;
    let inside = false;

    function animMag() {
      cx = lerp(cx, bx, 0.1);
      cy = lerp(cy, by, 0.1);
      btn.style.transform = `translate(${cx}px, ${cy}px)`;
      if (inside || Math.abs(cx) > 0.05 || Math.abs(cy) > 0.05) {
        raf = requestAnimationFrame(animMag);
      } else {
        btn.style.transform = 'translate(0,0)';
        raf = null;
      }
    }

    btn.addEventListener('mouseenter', () => {
      inside = true;
      if (!raf) raf = requestAnimationFrame(animMag);
    });
    btn.addEventListener('mousemove', e => {
      const r = btn.getBoundingClientRect();
      bx = (e.clientX - r.left - r.width  / 2) * STRENGTH;
      by = (e.clientY - r.top  - r.height / 2) * STRENGTH;
    });
    btn.addEventListener('mouseleave', () => {
      inside = false;
      bx = 0; by = 0;
      if (!raf) raf = requestAnimationFrame(animMag);
    });
  });
}

/* ════════════════════════════════════════════════════════════════
   11. AVATAR — 3D MOUSE PARALLAX  (state stored, drawn in master RAF)
   ════════════════════════════════════════════════════════════════ */
const _av = { tx: 0, ty: 0, cx: 0, cy: 0, el: null };

function initAvatarParallax() {
  if (IS_TOUCH) return; // no mouse on touch — skip entirely
  const scene = document.getElementById('av-scene');
  if (!scene) return;
  _av.el = scene;

  window.addEventListener('mousemove', e => {
    const px = (e.clientX / window.innerWidth  - 0.5) * 2;
    const py = (e.clientY / window.innerHeight - 0.5) * 2;
    _av.tx =  px * 14;
    _av.ty = -py * 10;
  }, { passive: true });
}

/* ════════════════════════════════════════════════════════════════
   12. TERMINAL TYPER
   ════════════════════════════════════════════════════════════════ */
function initTerminal() {
  const body = document.getElementById('term-body');
  if (!body) return;

  const lines = [
    { type: 'cmd', text: 'whoami' },
    { type: 'out', text: 'raman_kumar  @  neon' },
    { type: 'br' },
    { type: 'cmd', text: 'cat about.txt' },
    { type: 'out', text: 'Engineer · Hacker · Creator' },
    { type: 'out', text: 'Based in India 🇮🇳' },
    { type: 'br' },
    { type: 'cmd', text: 'ls skills/' },
    { type: 'out', text: 'pentesting/   ctf/   webdev/   content/', cls: 't-c' },
    { type: 'br' },
    { type: 'cmd', text: 'cat links.txt' },
    { type: 'out', text: 'github.com/ramaneon', cls: 't-g' },
    { type: 'out', text: 'tryhackme.com/p/ramaneon', cls: 't-g' },
    { type: 'out', text: 'youtube.com/@Techivibe', cls: 't-g' },
    { type: 'br' },
    { type: 'cmd', text: 'cat motto.txt' },
    { type: 'out', text: '"just an engineer who can do anything"', cls: 't-c' },
    { type: 'cursor' },
  ];

  let li = 0;

  function next() {
    if (li >= lines.length) return;
    const l = lines[li++];

    if (l.type === 'br') {
      body.appendChild(document.createElement('br'));
      return setTimeout(next, 70);
    }
    if (l.type === 'cursor') {
      const s = document.createElement('span');
      s.innerHTML = '<span class="t-p">$</span> <span class="t-cur"></span>';
      body.appendChild(s);
      return;
    }

    const s = document.createElement('span');
    if (l.type === 'out') {
      s.className = 't-o' + (l.cls ? ' ' + l.cls : '');
    }
    if (l.type === 'cmd') {
      const p = document.createElement('span');
      p.className = 't-p'; p.textContent = '$ ';
      s.appendChild(p);
    }
    body.appendChild(s);

    typeText(l.text, l.type === 'cmd' ? 45 : 14, s, () => {
      setTimeout(next, l.type === 'cmd' ? 230 : 90);
    });
  }

  function typeText(text, speed, container, cb) {
    const node = document.createTextNode('');
    container.appendChild(node);
    let i = 0;
    function step() {
      if (i < text.length) {
        node.nodeValue += text[i++];
        body.scrollTop = body.scrollHeight;
        setTimeout(step, speed + Math.random() * 22);
      } else {
        cb?.();
      }
    }
    step();
  }

  const io = new IntersectionObserver(([e]) => {
    if (e.isIntersecting) { setTimeout(next, 400); io.disconnect(); }
  }, { threshold: 0.35 });
  io.observe(body);
}

/* ════════════════════════════════════════════════════════════════
   13. COUNT UP
   ════════════════════════════════════════════════════════════════ */
function initCountUp() {
  document.querySelectorAll('[data-target]').forEach(el => {
    const target = parseInt(el.dataset.target);
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      let n = 0;
      const duration = 1400;
      const steps    = 60;
      const inc      = target / steps;
      const interval = duration / steps;
      const t = setInterval(() => {
        n = Math.min(n + inc, target);
        el.textContent = Math.floor(n);
        if (n >= target) clearInterval(t);
      }, interval);
      io.disconnect();
    }, { threshold: 0.6 });
    io.observe(el);
  });
}

/* ════════════════════════════════════════════════════════════════
   14. SCROLL PARALLAX — orbs + hero text
   ════════════════════════════════════════════════════════════════ */
function initParallax() {
  // Skip parallax on mobile — native scroll already smooth, extra transforms cause jank
  if (IS_MOBILE) return;

  const heroName = document.querySelector('.hero-name');
  const orbs     = document.querySelectorAll('.orb');
  const badge    = document.querySelector('.hero-badge');

  const onScroll = () => {
    const s = window.scrollY;
    const h = window.innerHeight;
    if (s < h) {
      const pct = s / h;
      if (heroName) heroName.style.transform = `translateY(${s * 0.14}px)`;
      if (badge)    badge.style.transform    = `translateY(${s * 0.08}px)`;
      orbs.forEach((o, i) => {
        const sp = 0.03 + i * 0.02;
        o.style.transform = `translateY(${s * sp}px)`;
      });
    }
  };

  if (lenis) {
    lenis.on('scroll', ({ scroll }) => {
      const s = scroll;
      const h = window.innerHeight;
      if (s < h) {
        const pct = s / h;
        if (heroName) heroName.style.transform = `translateY(${s * 0.14}px)`;
        if (badge)    badge.style.transform    = `translateY(${s * 0.08}px)`;
        orbs.forEach((o, i) => {
          o.style.transform = `translateY(${s * (0.03 + i * 0.02)}px)`;
        });
      }
    });
  } else {
    window.addEventListener('scroll', onScroll, { passive: true });
  }
}

/* ════════════════════════════════════════════════════════════════
   15. MARQUEE — slow on scroll stop, speed up while scrolling
   ════════════════════════════════════════════════════════════════ */
const _mq = { tracks: [], vel: 0, lastScroll: 0 };

function initMarqueeVelocity() {
  _mq.tracks = Array.from(document.querySelectorAll('.marquee-inner'));
  if (!_mq.tracks.length) return;

  // On mobile skip velocity tweak — animation runs clean via CSS only
  if (IS_MOBILE) return;

  if (lenis) {
    lenis.on('scroll', ({ velocity }) => { _mq.vel = velocity * 60; });
  } else {
    window.addEventListener('scroll', () => {
      _mq.vel = window.scrollY - _mq.lastScroll;
      _mq.lastScroll = window.scrollY;
    }, { passive: true });
  }
  // Drawn in master RAF
}

/* ════════════════════════════════════════════════════════════════
   16. WILL-CHANGE HINTS (only while hovering, not always)
   ════════════════════════════════════════════════════════════════ */
function initWillChange() {
  document.querySelectorAll('.tilt-el, .magnetic, .btn-fill, .btn-ghost, .cl-item, .plat-row').forEach(el => {
    el.addEventListener('mouseenter', () => { el.style.willChange = 'transform'; });
    el.addEventListener('mouseleave', () => {
      setTimeout(() => { el.style.willChange = 'auto'; }, 600);
    });
  });
}

/* ════════════════════════════════════════════════════════════════
   17. PLATFORM ROWS — active line accent
   ════════════════════════════════════════════════════════════════ */
function initPlatRows() {
  document.querySelectorAll('.plat-row').forEach(row => {
    // The accent bar is CSS ::after — no extra JS needed,
    // but we can add a subtle background shimmer on hover via JS class
    row.addEventListener('mouseenter', () => row.setAttribute('data-active', '1'));
    row.addEventListener('mouseleave', () => row.removeAttribute('data-active'));
  });
}

/* ════════════════════════════════════════════════════════════════
   MASTER RAF — one unified animation loop, zero per-system loops
   ════════════════════════════════════════════════════════════════ */
function masterLoop() {
  // ── Cursor (GPU path: transform, no left/top) ──────────────────
  if (_cur.active) {
    _cur.ox = lerp(_cur.ox, _cur.mx, 0.12);
    _cur.oy = lerp(_cur.oy, _cur.my, 0.12);
    _cur.lx = lerp(_cur.lx, _cur.mx, 0.12);
    _cur.ly = lerp(_cur.ly, _cur.my, 0.12);

    // translate() is compositor-only — no layout, no paint
    // -4 centers the 8px dot, -20 centers the 40px ring
    _cur.dot.style.transform   = `translate(${_cur.mx - 4}px, ${_cur.my - 4}px)`;
    _cur.outer.style.transform = `translate(${_cur.ox - 20}px, ${_cur.oy - 20}px)`;
    _cur.label.style.transform = `translate(${_cur.lx + 18}px, ${_cur.ly - 26}px)`;
  }

  // ── Avatar parallax ────────────────────────────────────────────
  if (_av.el) {
    _av.cx = lerp(_av.cx, _av.tx, 0.06);
    _av.cy = lerp(_av.cy, _av.ty, 0.06);
    _av.el.style.transform = `rotateY(${_av.cx}deg) rotateX(${_av.cy}deg)`;
  }

  // ── Marquee velocity ───────────────────────────────────────────
  if (_mq.tracks.length) {
    _mq.vel *= 0.92;
    const dur = Math.max(8, 22 - Math.abs(_mq.vel) * 0.05);
    for (let i = 0; i < _mq.tracks.length; i++) {
      _mq.tracks[i].style.animationDuration = dur + 's';
    }
  }

  requestAnimationFrame(masterLoop);
}

/* ════════════════════════════════════════════════════════════════
   BOOT
   ════════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {

  /* Fade in body */
  document.body.style.opacity    = '0';
  document.body.style.transition = 'opacity .55s ease';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => { document.body.style.opacity = '1'; });
  });

  /* Init order matters */
  initLenis();        // 1. Smooth scroll first
  initWebGL();        // 2. Three.js (heavy, start early)
  initCursor();       // 3. Cursor
  initScrollProgress();
  initNav();
  initWillChange();
  initParallax();
  initMarqueeVelocity();

  /* Start the single master animation loop */
  masterLoop();

  /* Hero sequence after paint */
  setTimeout(() => {
    heroEntrance();
    initRoleCycler();
    initReveal();
    initTilt();
    initMagnetic();
    initAvatarParallax();
    initTerminal();
    initCountUp();
    initPlatRows();
  }, 80);

});
