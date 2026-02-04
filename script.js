const DURATIONS = { pomodoro: 25, short: 5, long: 10 };

let mode = "pomodoro";
let running = false;

// Zeitbasiert
let endAtMs = null;       // Zeitpunkt wann 0 erreicht wird
let remainingMs = DURATIONS[mode] * 60 * 1000;

let tickId = null;
let alarmFired = false;

// DOM
const timeDisplay = document.getElementById("timeDisplay");
const startBtn = document.getElementById("startBtn");
const resetBtn = document.getElementById("resetBtn");
const btnPomodoro = document.getElementById("modePomodoro");
const btnShort = document.getElementById("modeShort");
const btnLong = document.getElementById("modeLong");

// Sound (nur wenn Seite aktiv ist erlaubt)
const bellSound = new Audio("./sounds/bells_alarm.mp3");
bellSound.preload = "auto";

function playBell() {
  bellSound.currentTime = 0;
  bellSound.play().catch(() => {});
}

// Notification
async function ensureNotificationPermission() {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;

  const p = await Notification.requestPermission();
  return p === "granted";
}

function notify(title, body) {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  // einfache Notification
  new Notification(title, { body });
}

function formatTimeFromMs(ms) {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
}

function render() {
  timeDisplay.textContent = formatTimeFromMs(remainingMs);
  startBtn.textContent = running ? "pause" : "start";
}

function computeRemaining() {
  if (!running || endAtMs === null) return;
  remainingMs = endAtMs - Date.now();
  if (remainingMs <= 0) {
    remainingMs = 0;
    finish();
  }
}

function finish() {
  stopTick();
  running = false;

  if (!alarmFired) {
    alarmFired = true;

    // Notification kann auch im Hintergrund kommen
    notify("⏰ Zeit vorbei", mode === "pomodoro" ? "Pomodoro fertig." : "Pause fertig.");

    // Sound nur, wenn Seite wieder aktiv / erlaubt
    // (iOS blockt Sound im Hintergrund)
    if (document.visibilityState === "visible") {
      playBell();
    }
  }

  render();
}

function startTick() {
  stopTick();
  tickId = setInterval(() => {
    computeRemaining();
    render();
  }, 250);
}

function stopTick() {
  if (tickId) clearInterval(tickId);
  tickId = null;
}

async function startTimer() {
  // Damit Notifications später funktionieren
  await ensureNotificationPermission();

  if (running) return;
  running = true;
  alarmFired = false;

  // Setze Endzeit aus verbleibender Zeit
  endAtMs = Date.now() + remainingMs;

  startTick();
  render();
}

function pauseTimer() {
  if (!running) return;

  computeRemaining();
  running = false;
  endAtMs = null;
  stopTick();
  render();
}

function toggleStartPause() {
  running ? pauseTimer() : startTimer();
}

function resetCurrent() {
  pauseTimer();
  remainingMs = DURATIONS[mode] * 60 * 1000;
  alarmFired = false;
  render();
}

function setMode(newMode) {
  pauseTimer();
  mode = newMode;
  remainingMs = DURATIONS[mode] * 60 * 1000;
  alarmFired = false;

  [btnPomodoro, btnShort, btnLong].forEach(b => b.classList.remove("active"));
  if (mode === "pomodoro") btnPomodoro.classList.add("active");
  if (mode === "short") btnShort.classList.add("active");
  if (mode === "long") btnLong.classList.add("active");

  render();
}

// Wenn du zurückkommst, sofort korrekt updaten + ggf. alarmen
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    computeRemaining();
    render();
    // Wenn im Hintergrund fertig geworden: beim Zurückkommen klingeln
    if (remainingMs === 0 && alarmFired) {
      playBell();
    }
  }
});

// Events
startBtn.addEventListener("click", toggleStartPause);
resetBtn.addEventListener("click", resetCurrent);
btnPomodoro.addEventListener("click", () => setMode("pomodoro"));
btnShort.addEventListener("click", () => setMode("short"));
btnLong.addEventListener("click", () => setMode("long"));

// Init
render();
