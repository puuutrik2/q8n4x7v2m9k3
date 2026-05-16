const canvas = document.querySelector("#noiseField");
const ctx = canvas.getContext("2d");
const cursorGlow = document.querySelector("#cursorGlow");
const joinForm = document.querySelector("#joinForm");
const formStatus = document.querySelector("#formStatus");
const cooldownText = document.querySelector("#cooldownText");
const userButton = document.querySelector("#userButton");
const userDropdown = document.querySelector("#userDropdown");
const userAvatar = document.querySelector("#userAvatar");
const userNameElement = document.querySelector("#userName");
const settingsButton = document.querySelector("#settingsButton");
const logoutButton = document.querySelector("#logoutButton");
const settingsScreen = document.querySelector("#settingsScreen");
const backToMain = document.querySelector("#backToMain");
const mainScreen = document.querySelector("#top");
const footer = document.querySelector(".site-footer");
const photoModal = document.querySelector("#photoModal");
const photoViewerImage = document.querySelector("#photoViewerImage");
const photoViewerTitle = document.querySelector("#photoViewerTitle");
const photoViewerCount = document.querySelector("#photoViewerCount");
const photoPrev = document.querySelector("#photoPrev");
const photoNext = document.querySelector("#photoNext");
const photoCards = Array.from(document.querySelectorAll(".photo-card"));
const loginLink = document.querySelector(".login-screen a[href='/auth/discord']");
const defaultApiBase = "https://blanch-worker-k8m4x2q9.rodionpytra.workers.dev";
const searchParams = new URLSearchParams(window.location.search);
const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
const apiParam = searchParams.get("api");
const sessionParam = hashParams.get("session");

if (apiParam) {
  localStorage.setItem("blanch-api-base", apiParam.replace(/\/$/, ""));
}

if (sessionParam) {
  localStorage.setItem("blanch-session", sessionParam);
  window.history.replaceState(null, "", `${window.location.pathname}?login=ok`);
}

const apiBase = (localStorage.getItem("blanch-api-base") || defaultApiBase).replace(/\/$/, "");
const savedSession = () => localStorage.getItem("blanch-session") || "";

function apiUrl(path) {
  return `${apiBase}${path}`;
}

function apiFetch(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const session = savedSession();
  if (session) headers.set("Authorization", `Bearer ${session}`);
  return fetch(apiUrl(path), { credentials: "include", ...options, headers });
}

if (loginLink) {
  loginLink.href = apiUrl("/auth/discord");
}

let width = 0;
let height = 0;
let particles = [];
let currentUser = null;
let cooldownLeftMs = 0;
let currentView = "main";
let currentPhotoIndex = 0;

function applyTheme(theme) {
  document.body.dataset.theme = theme;
  localStorage.setItem("blanch-theme", theme);
  document.querySelectorAll(".theme-card").forEach((card) => {
    card.classList.toggle("is-active", card.dataset.theme === theme);
  });
}

applyTheme(localStorage.getItem("blanch-theme") || "chrome");

function resizeCanvas() {
  const scale = window.devicePixelRatio || 1;
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = width * scale;
  canvas.height = height * scale;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);

  const amount = Math.min(130, Math.floor((width * height) / 13000));
  particles = Array.from({ length: amount }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    speed: 0.25 + Math.random() * 0.7,
    length: 18 + Math.random() * 70,
    alpha: 0.08 + Math.random() * 0.24,
  }));
}

function drawParticles() {
  ctx.clearRect(0, 0, width, height);
  ctx.globalCompositeOperation = "lighter";

  for (const particle of particles) {
    const gradient = ctx.createLinearGradient(particle.x, particle.y, particle.x, particle.y + particle.length);
    gradient.addColorStop(0, "rgba(255,255,255,0)");
    gradient.addColorStop(0.5, `rgba(255,255,255,${particle.alpha})`);
    gradient.addColorStop(1, "rgba(167,15,24,0)");

    ctx.strokeStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(particle.x, particle.y);
    ctx.lineTo(particle.x, particle.y + particle.length);
    ctx.stroke();

    particle.y += particle.speed;
    particle.x += Math.sin(particle.y * 0.01) * 0.08;

    if (particle.y > height + particle.length) {
      particle.y = -particle.length;
      particle.x = Math.random() * width;
    }
  }

  requestAnimationFrame(drawParticles);
}

function displayName(user) {
  return user?.globalName || user?.username || "Discord";
}

function avatarUrl(user) {
  if (!user?.avatar) {
    const index = Number(BigInt(user?.id || 0) % 5n);
    return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
  }
  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=80`;
}

function formatCooldown(ms) {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function setFormDisabled(disabled) {
  if (!joinForm) return;
  joinForm.querySelectorAll("input, textarea, button").forEach((element) => {
    element.disabled = disabled;
  });
}

function showMain() {
  currentView = "main";
  if (mainScreen) mainScreen.hidden = false;
  if (footer) footer.hidden = false;
  if (settingsScreen) settingsScreen.hidden = true;
  if (backToMain) backToMain.hidden = true;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showSettings() {
  currentView = "settings";
  if (mainScreen) mainScreen.hidden = true;
  if (footer) footer.hidden = true;
  if (settingsScreen) settingsScreen.hidden = false;
  if (backToMain) backToMain.hidden = false;
  if (userDropdown) userDropdown.classList.remove("is-open");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function updateAuthUi() {
  const loggedIn = Boolean(currentUser);
  document.body.classList.toggle("is-authenticated", loggedIn);
  document.querySelectorAll(".app-shell").forEach((element) => {
    if (!loggedIn) element.hidden = true;
  });

  if (!loggedIn) {
    if (settingsScreen) settingsScreen.hidden = true;
    setFormDisabled(true);
    return;
  }

  document.querySelector(".site-header").hidden = false;
  if (currentView === "settings") {
    if (mainScreen) mainScreen.hidden = true;
    if (footer) footer.hidden = true;
    if (settingsScreen) settingsScreen.hidden = false;
    if (backToMain) backToMain.hidden = false;
  } else {
    if (mainScreen) mainScreen.hidden = false;
    if (footer) footer.hidden = false;
    if (settingsScreen) settingsScreen.hidden = true;
    if (backToMain) backToMain.hidden = true;
  }

  if (userNameElement) userNameElement.textContent = displayName(currentUser);
  if (userAvatar) userAvatar.src = avatarUrl(currentUser);

  const onCooldown = cooldownLeftMs > 0;
  setFormDisabled(onCooldown);
  if (cooldownText) {
    cooldownText.textContent = onCooldown
      ? `Повторную заявку можно отправить через ${formatCooldown(cooldownLeftMs)}.`
      : "";
  }
}

async function loadAuth() {
  try {
    const response = await apiFetch("/api/me");
    const result = await response.json();
    currentUser = result.user;
    cooldownLeftMs = result.cooldownLeft || 0;
  } catch {
    currentUser = null;
    cooldownLeftMs = 0;
  }
  updateAuthUi();
}

function tickCooldown() {
  if (cooldownLeftMs > 0) {
    cooldownLeftMs = Math.max(0, cooldownLeftMs - 1000);
    updateAuthUi();
  }
}

function showToast(message) {
  const oldToast = document.querySelector(".toast");
  if (oldToast) oldToast.remove();

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.append(toast);

  requestAnimationFrame(() => toast.classList.add("is-visible"));
  window.setTimeout(() => {
    toast.classList.remove("is-visible");
    window.setTimeout(() => toast.remove(), 260);
  }, 5200);
}

function playSuccessSound() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;

  const audio = new AudioContext();
  const master = audio.createGain();
  master.gain.setValueAtTime(0.0001, audio.currentTime);
  master.gain.exponentialRampToValueAtTime(0.16, audio.currentTime + 0.02);
  master.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.62);
  master.connect(audio.destination);

  [392, 523.25, 659.25].forEach((frequency, index) => {
    const start = audio.currentTime + index * 0.08;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();

    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.35, start + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.28);

    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(start);
    oscillator.stop(start + 0.3);
  });
}

function fallbackPhoto(card) {
  const img = card.querySelector("img");
  if (!img) return;

  img.removeAttribute("src");
  img.alt = `${card.dataset.title} placeholder`;
}

function openPhoto(index) {
  if (!photoModal || !photoViewerImage || !photoViewerTitle || !photoViewerCount) return;

  currentPhotoIndex = (index + photoCards.length) % photoCards.length;
  const card = photoCards[currentPhotoIndex];
  const img = card.querySelector("img");
  const title = card.dataset.title || `BLANCH ${currentPhotoIndex + 1}`;
  const src = img?.getAttribute("src") || card.dataset.src;

  photoViewerImage.src = src;
  photoViewerImage.alt = title;
  photoViewerTitle.textContent = title;
  photoViewerCount.textContent = `${currentPhotoIndex + 1} / ${photoCards.length}`;
  photoModal.hidden = false;
}

function closePhoto() {
  if (photoModal) photoModal.hidden = true;
}

function stepPhoto(step) {
  openPhoto(currentPhotoIndex + step);
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();
drawParticles();
loadAuth();
setInterval(tickCooldown, 1000);

window.addEventListener("pointermove", (event) => {
  cursorGlow.style.setProperty("--x", `${event.clientX}px`);
  cursorGlow.style.setProperty("--y", `${event.clientY}px`);
});

const observer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) entry.target.classList.add("is-visible");
    }
  },
  { threshold: 0.18 },
);

document.querySelectorAll(".reveal").forEach((element) => observer.observe(element));

if (userButton && userDropdown) {
  userButton.addEventListener("click", () => {
    userDropdown.classList.toggle("is-open");
  });
}

document.addEventListener("click", (event) => {
  if (!userButton?.contains(event.target) && !userDropdown?.contains(event.target)) {
    if (userDropdown) userDropdown.classList.remove("is-open");
  }
});

if (settingsButton) settingsButton.addEventListener("click", showSettings);
if (backToMain) backToMain.addEventListener("click", showMain);

if (logoutButton) {
  logoutButton.addEventListener("click", async () => {
    await apiFetch("/auth/logout", { method: "POST" });
    localStorage.removeItem("blanch-session");
    currentUser = null;
    cooldownLeftMs = 0;
    updateAuthUi();
  });
}

document.querySelectorAll(".theme-card").forEach((card) => {
  card.addEventListener("click", () => applyTheme(card.dataset.theme));
});

photoCards.forEach((card, index) => {
  const img = card.querySelector("img");
  if (img) img.addEventListener("error", () => fallbackPhoto(card), { once: true });
  card.addEventListener("click", () => openPhoto(index));
});

document.querySelectorAll("[data-close-photo]").forEach((element) => {
  element.addEventListener("click", closePhoto);
});

if (photoPrev) photoPrev.addEventListener("click", () => stepPhoto(-1));
if (photoNext) photoNext.addEventListener("click", () => stepPhoto(1));

document.addEventListener("keydown", (event) => {
  if (!photoModal || photoModal.hidden) return;
  if (event.key === "Escape") closePhoto();
  if (event.key === "ArrowLeft") stepPhoto(-1);
  if (event.key === "ArrowRight") stepPhoto(1);
});

if (joinForm && formStatus) {
  joinForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const submitButton = joinForm.querySelector('button[type="submit"]');
    const payload = Object.fromEntries(new FormData(joinForm).entries());

    formStatus.className = "form-status";
    formStatus.textContent = "Отправка заявки...";
    submitButton.disabled = true;

    try {
      const response = await apiFetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const contentType = response.headers.get("content-type") || "";
      const result = contentType.includes("application/json")
        ? await response.json()
        : { ok: false, message: "Заявки работают только через Node-сервер." };

      if (!response.ok || !result.ok) throw new Error(result.message || "Не удалось отправить заявку.");

      formStatus.classList.add("is-success");
      formStatus.textContent = "";
      joinForm.reset();
      cooldownLeftMs = result.cooldownLeft || 30 * 60 * 1000;
      updateAuthUi();
      playSuccessSound();
      showToast("Заявка подана. Ожидайте, пока с вами свяжутся.");
    } catch (error) {
      formStatus.classList.add("is-error");
      formStatus.textContent = error.message;
      updateAuthUi();
    } finally {
      if (currentUser && cooldownLeftMs <= 0) submitButton.disabled = false;
    }
  });
}

document.querySelectorAll(".magnetic").forEach((button) => {
  button.addEventListener("pointermove", (event) => {
    const rect = button.getBoundingClientRect();
    const x = event.clientX - rect.left - rect.width / 2;
    const y = event.clientY - rect.top - rect.height / 2;
    button.style.transform = `translate(${x * 0.08}px, ${y * 0.16}px)`;
  });

  button.addEventListener("pointerleave", () => {
    button.style.transform = "";
  });
});
