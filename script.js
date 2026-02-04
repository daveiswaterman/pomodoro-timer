// ===============================
// CONFIG
// ===============================
const DURATIONS = {
  pomodoro: 25,
  short: 5,
  long: 10
};

// ===============================
// STATE
// ===============================
let mode = "pomodoro";
let totalSeconds = DURATIONS[mode] * 60;
let timerId = null;
let running = false;

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
// SOUND
// ===============================
const bellSound = new Audio("./sounds/bell.mp3");
bellSound.preload = "auto";

function playBell(){
  bellSound.currentTime = 0;
  bellSound.play().catch(() => {});
}

// ===============================
// HELPERS
// ===============================
function formatTime(sec){
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return String(m).padStart(2,"0") + ":" + String(s).padStart(2,"0");
}

function render(){
  timeDisplay.textContent = formatTime(totalSeconds);
  startBtn.textContent = running ? "pause" : "start";
}

// ===============================
// TIMER
// ===============================
function stopTimer(){
  clearInterval(timerId);
  timerId = null;
  running = false;
  render();
}

function startTimer(){
  if(running) return;
  running = true;
  render();

  timerId = setInterval(() => {
    totalSeconds--;

    if(totalSeconds <= 0){
      totalSeconds = 0;
      stopTimer();
      playBell();
    }
    render();
  }, 1000);
}

function toggleStart(){
  running ? stopTimer() : startTimer();
}

function resetTimer(){
  stopTimer();
  totalSeconds = DURATIONS[mode] * 60;
  render();
}

function setMode(newMode){
  stopTimer();
  mode = newMode;
  totalSeconds = DURATIONS[mode] * 60;

  [btnPomodoro, btnShort, btnLong].forEach(b => b.classList.remove("active"));
  if(mode === "pomodoro") btnPomodoro.classList.add("active");
  if(mode === "short") btnShort.classList.add("active");
  if(mode === "long") btnLong.classList.add("active");

  render();
}

// ===============================
// EVENTS
// ===============================
startBtn.addEventListener("click", toggleStart);
resetBtn.addEventListener("click", resetTimer);

btnPomodoro.addEventListener("click", () => setMode("pomodoro"));
btnShort.addEventListener("click", () => setMode("short"));
btnLong.addEventListener("click", () => setMode("long"));

// INIT
render();

