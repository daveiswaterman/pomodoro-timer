// ===============================
// CONFIG (Pomodoro ist veränderbar)
// ===============================
const DURATIONS = {
  pomodoro: 25,  // wird via Settings geändert
  short: 5,
  long: 10
};

// Lade gespeicherte Pomodoro-Minuten (wenn vorhanden)
const savedPomodoro = Number(localStorage.getItem("pomodoroMinutes"));
if ([25, 45, 60].includes(savedPomodoro)) DURATIONS.pomodoro = savedPomodoro;

// ===============================
// STATE (zeitbasiert)
// ===============================
let mode = "pomodoro";
let running = false;

let endAtMs = null;
let remainingMs = DURATIONS[mode] * 60 * 1000;

let tickId = null;

// Alarm-Modus
let alarmActive = false;

// ===============================
// DOM
// ===============================
const timeDisplay = document.getElementById("timeDisplay");
const startBtn = document.getElementById("startBtn");
const resetBtn = document.getElementById("resetBtn");

const btnPomodoro = document.getElementById("modePomodoro");
const btnShort = document.getElementById("modeShort");
const btnLong = document.getElementById("modeLong");

// Settings UI
const settingsBtn = document.getElementById("settingsBtn");
const settingsBackdrop = document.getElementById("settingsBackdrop");
const closeSettingsBtn = document.getElementById("closeSettingsBtn");

const preset25 = document.getElementById("preset25");
const preset45 = document.getElementById("preset45");
const preset60 = document.getElementById("preset60");
const presetButtons = [preset25, preset45, preset60];

// ===============================
// SOUND (iPhone unlock)
// ===============================
const bellSound = new Audio("./sounds/bells_alarm.mp3");
bellSound.preload = "auto";
bellSound.playsInline = true;

let audioUnlocked = false;

async function unlockAudioOnce() {
  if (audioUnlocked) return;
  try {
    bellSound.muted = true;
    await bellSound.play();
    bellSound.pause();
    bellSound.currentTime = 0;
    bellSound.muted = false;
    audioUnlocked = true;
  } catch (_) {}
}

function startAlarmLoop() {
  alarmActive = true;
  bellSound.pause();
  bellSound.currentTime = 0;
  bellSound.loop = true;
  bellSound.muted = false;
  bellSound.volume = 1.0;
  bellSound.play().catch(() => {});
}

function stopAlarm() {
  alarmActive = false;
  bellSound.loop = false;
  bellSound.pause();
  bellSound.currentTime = 0;
}

// ===============================
// NOTIFICATIONS (optional)
// ===============================
async function ensureNotificationPermission() {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const p = await Notification.requestPermission();
  return p === "granted";
}

function notifyDone() {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  const title = "⏰ Zeit vorbei";
  const body = mode === "pomodoro" ? "Pomodoro fertig." : "Pause fertig.";
  new Notification(title, { body });
}

// ===============================
// HELPERS
// ===============================
function formatTimeFromMs(ms) {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
}

function render() {
  timeDisplay.textContent = formatTimeFromMs(remainingMs);

  if (alarmActive) startBtn.textContent = "stop";
  else startBtn.textContent = running ? "pause" : "start";

  // Preset-UI aktualisieren
  presetButtons.forEach((b) => b.classList.remove("active"));
  const current = DURATIONS.pomodoro;
  if (current === 25) preset25.classList.add("active");
  if (current === 45) preset45.classList.add("active");
  if (current === 60) preset60.classList.add("active");
}

function stopTick() {
  if (tickId) clearInterval(tickId);
  tickId = null;
}

function computeRemaining() {
  if (!running || endAtMs === null) return;
  remainingMs = endAtMs - Date.now();
  if (remainingMs <= 0) {
    remainingMs = 0;
    finish();
  }
}

// ===============================
// TIMER CORE
// ===============================
function startTick() {
  stopTick();
  tickId = setInterval(() => {
    computeRemaining();
    render();
  }, 250);
}

async function startTimer() {
  await unlockAudioOnce();
  await ensureNotificationPermission();

  if (running || alarmActive) return;

  running = true;
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

function finish() {
  stopTick();
  running = false;
  endAtMs = null;

  notifyDone();

  // Ton nur wenn sichtbar (iPhone Web kann kein Audio im Hintergrund)
  if (document.visibilityState === "visible") {
    startAlarmLoop();
  } else {
    alarmActive = true; // "fällig", wird beim Zurückkommen gestartet
  }

  render();
}

function stopFromAlarmAndReset() {
  stopAlarm();
  remainingMs = DURATIONS[mode] * 60 * 1000; // zurücksetzen auf Modus-Ursprung
  render();
}

// ===============================
// UI ACTIONS
// ===============================
function toggleStartPauseOrStop() {
  unlockAudioOnce();

  // Wenn Alarm aktiv -> stoppt Alarm + reset
  if (alarmActive) {
    stopFromAlarmAndReset();
    return;
  }

  running ? pauseTimer() : startTimer();
}

function resetCurrent() {
  stopAlarm();
  pauseTimer();
  remainingMs = DURATIONS[mode] * 60 * 1000;
  render();
}

function setMode(newMode) {
  stopAlarm();
  pauseTimer();

  mode = newMode;
  remainingMs = DURATIONS[mode] * 60 * 1000;

  [btnPomodoro, btnShort, btnLong].forEach((b) => b.classList.remove("active"));
  if (mode === "pomodoro") btnPomodoro.classList.add("active");
  if (mode === "short") btnShort.classList.add("active");
  if (mode === "long") btnLong.classList.add("active");

  render();
}

// ===============================
// SETTINGS
// ===============================
function openSettings() {
  settingsBackdrop.classList.add("open");
  settingsBackdrop.setAttribute("aria-hidden", "false");
  render();
}

function closeSettings() {
  settingsBackdrop.classList.remove("open");
  settingsBackdrop.setAttribute("aria-hidden", "true");
}

function setPomodoroMinutes(min) {
  DURATIONS.pomodoro = min;
  localStorage.setItem("pomodoroMinutes", String(min));

  // Wenn wir gerade im Pomodoro-Modus sind und NICHT laufen & kein Alarm:
  // sofort auf neue Dauer setzen.
  if (mode === "pomodoro" && !running && !alarmActive) {
    remainingMs = DURATIONS.pomodoro * 60 * 1000;
  }

  render();
}

presetButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const min = Number(btn.dataset.min);
    if ([25, 45, 60].includes(min)) setPomodoroMinutes(min);
  });
});

// Klick auf Backdrop schließt (nur außerhalb der Box)
settingsBackdrop.addEventListener("click", (e) => {
  if (e.target === settingsBackdrop) closeSettings();
});

// Escape schließt (Desktop)
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeSettings();
});

// Wenn du zurückkommst und Alarm war fällig -> starte Alarmloop
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && alarmActive) {
    startAlarmLoop();
    render();
  }
});

// ===============================
// EVENTS
// ===============================
startBtn.addEventListener("click", toggleStartPauseOrStop);
resetBtn.addEventListener("click", resetCurrent);

btnPomodoro.addEventListener("click", () => setMode("pomodoro"));
btnShort.addEventListener("click", () => setMode("short"));
btnLong.addEventListener("click", () => setMode("long"));

settingsBtn.addEventListener("click", openSettings);
closeSettingsBtn.addEventListener("click", closeSettings);

// INIT
render();
