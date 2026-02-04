// ===============================
// CONFIG
// ===============================
const DURATIONS = { pomodoro: 25, short: 5, long: 10 };

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

// ===============================
// SOUND (iPhone unlock)
// ===============================
const bellSound = new Audio("./sounds/bells_alarm.mp3"); // ✅ funktionierende Datei
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
  } catch (_) {
    // iOS kann hier blocken (z.B. In-App Browser / Lautlos)
  }
}

function startAlarmLoop() {
  alarmActive = true;
  bellSound.pause();
  bellSound.currentTime = 0;
  bellSound.loop = true;
  bellSound.muted = false;
  bellSound.volume = 1.0;

  bellSound.play().catch(() => {
    // Wenn iOS blockt, kann Audio nicht starten
  });
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

  if (alarmActive) {
    startBtn.textContent = "stop"; // ✅ Stop erscheint nur im Alarm
  } else {
    startBtn.textContent = running ? "pause" : "start";
  }
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
// CORE TIMER
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

// Wenn Zeit abläuft: Alarm starten (loop), Timer steht auf 0
function finish() {
  stopTick();
  running = false;
  endAtMs = null;

  notifyDone();

  // iPhone: Ton nur zuverlässig, wenn Seite sichtbar ist
  if (document.visibilityState === "visible") {
    startAlarmLoop();
  } else {
    // Wenn im Hintergrund: kein Audio möglich. Beim Zurückkommen starten wir ihn.
    alarmActive = true; // merkt sich: Alarm ist „fällig“
  }

  render();
}

// ===============================
// STOP (nur im Alarm-Modus)
// ===============================
function stopFromAlarmAndReset() {
  stopAlarm();

  // ✅ Reset auf Ursprung des aktuellen Modus
  remainingMs = DURATIONS[mode] * 60 * 1000;
  render();
}

// ===============================
// UI ACTIONS
// ===============================
function toggleStartPauseOrStop() {
  // 1) Wenn Alarm läuft/fällig ist -> STOP beendet Alarm + Reset
  if (alarmActive) {
    stopFromAlarmAndReset();
    return;
  }

  // 2) Normalbetrieb: Start/Pause
  running ? pauseTimer() : startTimer();
}

function resetCurrent() {
  // Reset stoppt immer alles inkl. Alarm
  stopAlarm();
  pauseTimer();
  remainingMs = DURATIONS[mode] * 60 * 1000;
  render();
}

function setMode(newMode) {
  // Moduswechsel stoppt alles inkl. Alarm
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

// Wenn du zurückkommst und Alarm war fällig -> starte Alarm loop jetzt
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && alarmActive) {
    // Alarm war fällig, iOS hat im Hintergrund geblockt:
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

// INIT
render();
