const API_BASE = 'https://blanch-worker-k8m4x2q9.rodionpytra.workers.dev';
    const SESSION_KEY = 'blanch-session';
    const THEME_KEY = 'blanch-v1-theme';
    const themes = ['chrome', 'blood', 'violet'];
    let themeIndex = themes.indexOf(localStorage.getItem(THEME_KEY));
    if (themeIndex < 0) themeIndex = 0;
    document.documentElement.dataset.theme = themes[themeIndex];

    function savedSession() {
      return localStorage.getItem(SESSION_KEY) || '';
    }

    function storeSession(session) {
      if (session) localStorage.setItem(SESSION_KEY, session);
    }

    async function apiFetch(path, options = {}) {
      const headers = new Headers(options.headers || {});
      const session = savedSession();
      if (session) headers.set('Authorization', 'Bearer ' + session);
      return fetch(API_BASE + path, { ...options, headers, credentials: 'include' });
    }

    function avatarUrl(user) {
      if (user && user.avatar) return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`;
      return 'https://cdn.discordapp.com/embed/avatars/0.png';
    }

    const loginBtn = document.getElementById('loginBtn');
    const gate = document.getElementById('loginGate');
    const gateLoginBtn = document.getElementById('gateLoginBtn');
    const profileBtn = document.getElementById('profileBtn');
    const profileMenu = document.getElementById('profileMenu');
    const avatar = document.getElementById('avatar');
    const username = document.getElementById('username');
    const toast = document.getElementById('toast');
    const cooldown = document.getElementById('cooldown');

    function setUser(user) {
      if (!user) {
        loginBtn.style.display = 'inline-flex';
        profileBtn.style.display = 'none';
        gate?.classList.remove('hidden');
        return;
      }
      avatar.src = avatarUrl(user);
      username.textContent = user.globalName || user.global_name || user.username || 'Discord';
      loginBtn.style.display = 'none';
      profileBtn.style.display = 'inline-flex';
      gate?.classList.add('hidden');
    }

    async function bootAuth() {
      const hash = new URLSearchParams(location.hash.slice(1));
      const session = hash.get('session');
      if (session) {
        storeSession(session);
        history.replaceState(null, '', location.pathname + '?login=ok');
      }
      if (!savedSession()) return setUser(null);
      try {
        const res = await apiFetch('/api/me');
        const data = await res.json();
        if (data.session) storeSession(data.session);
        setUser(data.user || null);
      } catch {
        localStorage.removeItem(SESSION_KEY);
        setUser(null);
      }
    }

    function startDiscordLogin() {
      const returnTo = location.origin + location.pathname;
      window.location.href = API_BASE + '/auth/discord?return_to=' + encodeURIComponent(returnTo);
    }

    loginBtn.addEventListener('click', startDiscordLogin);
    gateLoginBtn?.addEventListener('click', startDiscordLogin);

    profileBtn.addEventListener('click', () => profileMenu.classList.toggle('open'));
    document.addEventListener('click', (event) => {
      if (!event.target.closest('.account')) profileMenu.classList.remove('open');
    });

    document.querySelector('[data-logout]').addEventListener('click', () => {
      localStorage.removeItem(SESSION_KEY);
      profileMenu.classList.remove('open');
      setUser(null);
    });

    function showToast(text) {
      toast.textContent = text;
      toast.classList.add('show');
      clearTimeout(showToast.timer);
      showToast.timer = setTimeout(() => toast.classList.remove('show'), 4200);
    }

    function formatLeft(ms) {
      const total = Math.max(0, Math.ceil(ms / 1000));
      const m = Math.floor(total / 60);
      const s = total % 60;
      return `${m}:${String(s).padStart(2, '0')}`;
    }

    function updateCooldown(until) {
      if (!until) {
        cooldown.style.display = 'none';
        return;
      }
      const tick = () => {
        const left = new Date(until).getTime() - Date.now();
        if (left <= 0) {
          cooldown.style.display = 'none';
          clearInterval(updateCooldown.timer);
          return;
        }
        cooldown.style.display = 'block';
        cooldown.textContent = 'До следующей заявки: ' + formatLeft(left);
      };
      clearInterval(updateCooldown.timer);
      tick();
      updateCooldown.timer = setInterval(tick, 1000);
    }

    document.getElementById('applyForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const submit = form.querySelector('.submit-btn');
      const values = Object.fromEntries(new FormData(form).entries());
      submit.disabled = true;
      submit.textContent = 'Отправляю...';
      try {
        const res = await apiFetch('/api/apply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values)
        });
        const data = await res.json().catch(() => ({}));
        if (data.session) storeSession(data.session);
        if (!res.ok) {
          if (data.cooldownUntil) updateCooldown(data.cooldownUntil);
          throw new Error(data.error || 'Заявка не ушла');
        }
        if (data.cooldownUntil) updateCooldown(data.cooldownUntil);
        form.reset();
        showToast('Заявка подана. Ожидайте, пока с вами свяжутся.');
      } catch (error) {
        showToast(error.message || 'Ошибка отправки заявки');
      } finally {
        submit.disabled = false;
        submit.textContent = 'Отправить';
      }
    });

    document.querySelectorAll('.glass').forEach((card) => {
      card.addEventListener('pointermove', (event) => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--mx', ((event.clientX - rect.left) / rect.width * 100) + '%');
        card.style.setProperty('--my', ((event.clientY - rect.top) / rect.height * 100) + '%');
      });
    });

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: .12 });
    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

    (function initSpace() {
      const canvas = document.getElementById('space');
      if (!window.THREE || !canvas) return;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, .1, 1000);
      camera.position.z = 42;

      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
      renderer.setSize(window.innerWidth, window.innerHeight);

      const group = new THREE.Group();
      scene.add(group);

      const points = [];
      const geo = new THREE.BufferGeometry();
      for (let i = 0; i < 820; i++) {
        points.push((Math.random() - .5) * 130, (Math.random() - .5) * 86, (Math.random() - .5) * 120);
      }
      geo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
      const mat = new THREE.PointsMaterial({
        color: 0xf1f1ff,
        size: .075,
        transparent: true,
        opacity: .58
      });
      group.add(new THREE.Points(geo, mat));

      const redMat = new THREE.MeshBasicMaterial({ color: 0xff1737, wireframe: true, transparent: true, opacity: .17 });
      for (let i = 0; i < 9; i++) {
        const torus = new THREE.Mesh(new THREE.TorusGeometry(12 + i * 4.2, .02, 8, 140), redMat);
        torus.position.z = -50 + i * 12;
        torus.rotation.x = Math.PI / 2;
        torus.rotation.z = i * .22;
        group.add(torus);
      }

      const shardMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .18, wireframe: true });
      for (let i = 0; i < 38; i++) {
        const shard = new THREE.Mesh(new THREE.TetrahedronGeometry(Math.random() * 1.1 + .3), shardMat);
        shard.position.set((Math.random() - .5) * 100, (Math.random() - .5) * 62, (Math.random() - .5) * 100);
        shard.rotation.set(Math.random() * 4, Math.random() * 4, Math.random() * 4);
        group.add(shard);
      }

      const mouse = { x: 0, y: 0 };
      window.addEventListener('pointermove', (event) => {
        mouse.x = (event.clientX / window.innerWidth - .5) * 2;
        mouse.y = (event.clientY / window.innerHeight - .5) * 2;
      }, { passive: true });

      function animate() {
        requestAnimationFrame(animate);
        group.rotation.y += .0018;
        group.rotation.x += .0006;
        camera.position.x += (mouse.x * 2.8 - camera.position.x) * .025;
        camera.position.y += (-mouse.y * 1.8 - camera.position.y) * .025;
        camera.lookAt(0, 0, 0);
        renderer.render(scene, camera);
      }
      animate();

      window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      });
    })();

/* === BLANCH interactive card/theme fixes === */
(function setupThemeButton() {
  const themeBtn = document.querySelector('[data-theme-btn]');
  if (!themeBtn) return;

  function paintThemeButton() {
    const active = document.documentElement.dataset.theme || themes[0];
    const labels = { chrome: 'Тема: Chrome', blood: 'Тема: Blood', violet: 'Тема: Violet' };
    themeBtn.textContent = labels[active] || 'Сменить тему';
  }

  paintThemeButton();
  themeBtn.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    themeIndex = (themeIndex + 1) % themes.length;
    const next = themes[themeIndex];
    localStorage.setItem(THEME_KEY, next);
    document.documentElement.dataset.theme = next;
    paintThemeButton();
    profileMenu.classList.remove('open');
    showToast('Тема переключена: ' + next);
  });
})();

(function setupHeroTilt() {
  const card = document.querySelector('.hero-card');
  if (!card) return;

  card.addEventListener('pointermove', (event) => {
    const rect = card.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    const rotateY = (x - .5) * 18;
    const rotateX = (.5 - y) * 14;
    card.classList.add('is-tilting');
    card.style.setProperty('--tilt-x', rotateX.toFixed(2) + 'deg');
    card.style.setProperty('--tilt-y', rotateY.toFixed(2) + 'deg');
    card.style.setProperty('--mx', (x * 100).toFixed(2) + '%');
    card.style.setProperty('--my', (y * 100).toFixed(2) + '%');
    card.style.setProperty('--orb-x', ((x - .5) * 44).toFixed(2) + 'px');
    card.style.setProperty('--orb-y', ((y - .5) * 34).toFixed(2) + 'px');
  });

  card.addEventListener('pointerleave', () => {
    card.classList.remove('is-tilting');
    card.style.removeProperty('--tilt-x');
    card.style.removeProperty('--tilt-y');
    card.style.removeProperty('--mx');
    card.style.removeProperty('--my');
    card.style.removeProperty('--orb-x');
    card.style.removeProperty('--orb-y');
  });
})();

(function setupCrewCards() {
  document.querySelectorAll('.crew-card').forEach((card) => {
    card.addEventListener('pointermove', (event) => {
      const rect = card.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width * 100).toFixed(2) + '%';
      const y = ((event.clientY - rect.top) / rect.height * 100).toFixed(2) + '%';
      card.querySelectorAll('.crew-face').forEach((face) => {
        face.style.setProperty('--mx', x);
        face.style.setProperty('--my', y);
      });
    });
  });
})();
(function setupCrewPhotoSlots() {
  const formats = ['jpg', 'png', 'webp', 'jpeg'];
  document.querySelectorAll('.crew-photo[data-photo]').forEach((slot) => {
    const img = slot.querySelector('img');
    const base = slot.dataset.photo;
    if (!img || !base) return;

    let attempt = 0;
    const loadNext = () => {
      if (attempt >= formats.length) {
        slot.classList.add('is-empty');
        slot.classList.remove('has-photo');
        img.removeAttribute('src');
        return;
      }
      img.src = base + '.' + formats[attempt];
      attempt += 1;
    };

    img.addEventListener('load', () => {
      slot.classList.remove('is-empty');
      slot.classList.add('has-photo');
    });
    img.addEventListener('error', loadNext);
    loadNext();
  });
})();

/* === end BLANCH interactive card/theme fixes === */


    bootAuth();
