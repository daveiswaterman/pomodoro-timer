// ===============================
// CONFIG
// ===============================
const DURATIONS = { pomodoro: 25, short: 5, long: 10 };

// ===============================
// STATE (zeitbasiert)
// ===============================
let mode = "pomodoro";
let running = false;

let endAtMs = null; // Zeitpunkt, wann 0 erreicht wird
let remainingMs = DURATIONS[mode] * 60 * 1000;

let tickId = null;
let alarmFired = false;

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
// SOUND (iPhone-safe unlock)
// ===============================
const bellSound = new Audio("./sounds/bells_alarm.mp3"); // ✅ richtige Datei
bellSound.preload = "auto";
bellSound.playsInline = true;

let audioUnlocked = false;

async function unlockAudioOnce() {
  if (audioUnlocked) return;

  try {
    // iOS: Audio muss durch User-Interaktion "freigeschaltet" werden
    bellSound.muted = true;
    await bellSound.play();
    bellSound.pause();
    bellSound.currentTime = 0;
    bellSound.muted = false;
    audioUnlocked = true;
  } catch (e) {
    // Wenn das fehlschlägt, ist oft Silent-Mode aktiv oder iOS blockt im In-App Browser
    // (In Safari klappt es nach einem Klick normalerweise.)
  }
}

function playBell() {
  // Extra robust
  bellSound.muted = false;
  bellSound.volume = 1.0;
  bellSound.currentTime = 0;
  bellSound.play().catch(() => {});
}

// ===============================
// NOTIFICATIONS
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
  startBtn.textContent = running ? "pause" : "start";
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
// CORE
// ===============================
function startTick() {
  stopTick();
  tickId = setInterval(() => {
    computeRemaining();
    render();
  }, 250);
}

async function startTimer() {
  // iPhone: Unlock beim Start-Klick anstoßen
  await unlockAudioOnce();
  await ensureNotificationPermission();

  if (running) return;

  running = true;
  alarmFired = false;

  endAtMs = Date.now() + remainingMs;
  startTick();
  render();
}

function pauseTimer() {
  if (!running) return;

  computeRemaining(); // remainingMs aktualisieren
  running = false;
  endAtMs = null;
  stopTick();
  render();
}

function toggleStartPause() {
  // iPhone: Unlock auch hier versuchen (falls startTimer nicht awaited wird)
  unlockAudioOnce();
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

  [btnPomodoro, btnShort, btnLong].forEach((b) => b.classList.remove("active"));
  if (mode === "pomodoro") btnPomodoro.classList.add("active");
  if (mode === "short") btnShort.classList.add("active");
  if (mode === "long") btnLong.classList.add("active");

  render();
}

function finish() {
  stopTick();
  running = false;
  endAtMs = null;

  // 🔔/🔕 Alarm einmal auslösen
  if (!alarmFired) {
    alarmFired = true;

    // Notification kann auch im Hintergrund kommen
    notifyDone();

    // iPhone Web: MP3 nur, wenn Seite sichtbar
    if (document.visibilityState === "visible") {
      playBell();
    }
  }

  // ✅ Auto-Reset auf Ursprung des aktuellen Modus
  remainingMs = DURATIONS[mode] * 60 * 1000;

  render();
}

// Wenn du zurückkehrst: Zeit korrigieren und ggf. Bell nachholen
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    computeRemaining();
    render();

    // Wenn im Hintergrund abgelaufen: beim Zurückkommen einmal klingeln
    if (alarmFired) {
      // nur wenn gerade frisch abgelaufen war (remaining bereits auf Ursprung gesetzt),
      // deshalb prüfen wir: war es im Hintergrund abgelaufen? => endAtMs war null und alarmFired true
      // Wir klingeln genau einmal beim Sichtbarwerden nach Ablauf.
      playBell();
      alarmFired = false; // verhindert mehrfaches Nachklingeln
    }
  }
});

// ===============================
// EVENTS
// ===============================
startBtn.addEventListener("click", toggleStartPause);
resetBtn.addEventListener("click", resetCurrent);

btnPomodoro.addEventListener("click", () => setMode("pomodoro"));
btnShort.addEventListener("click", () => setMode("short"));
btnLong.addEventListener("click", () => setMode("long"));

// INIT
render();
