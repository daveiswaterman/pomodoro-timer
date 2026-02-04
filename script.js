const DURATIONS = { pomodoro:25, short:5, long:10 };

const saved = Number(localStorage.getItem("pomodoroMinutes"));
if ([25,45,60].includes(saved)) DURATIONS.pomodoro = saved;

let mode="pomodoro", running=false, alarmActive=false;
let endAt=null, remaining=DURATIONS[mode]*60000, tick=null;

const timeDisplay=document.getElementById("timeDisplay");
const startBtn=document.getElementById("startBtn");
const resetBtn=document.getElementById("resetBtn");

const btnPomodoro=document.getElementById("modePomodoro");
const btnShort=document.getElementById("modeShort");
const btnLong=document.getElementById("modeLong");

const settingsBtn=document.getElementById("settingsBtn");
const settingsBackdrop=document.getElementById("settingsBackdrop");
const closeSettingsBtn=document.getElementById("closeSettingsBtn");

const preset25=document.getElementById("preset25");
const preset45=document.getElementById("preset45");
const preset60=document.getElementById("preset60");
const presets=[preset25,preset45,preset60];

const bell=new Audio("./sounds/bells_alarm.mp3");
bell.loop=true; bell.preload="auto"; bell.playsInline=true;
let audioUnlocked=false;

function unlockAudio(){
  if(audioUnlocked) return;
  bell.muted=true;
  bell.play().then(()=>{
    bell.pause(); bell.currentTime=0; bell.muted=false; audioUnlocked=true;
  }).catch(()=>{});
}

function format(ms){
  const s=Math.max(0,Math.ceil(ms/1000));
  return String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0");
}

function render(){
  timeDisplay.textContent=format(remaining);
  startBtn.textContent=alarmActive?"stop":running?"pause":"start";
  presets.forEach(p=>p.classList.remove("active"));
  if(DURATIONS.pomodoro===25) preset25.classList.add("active");
  if(DURATIONS.pomodoro===45) preset45.classList.add("active");
  if(DURATIONS.pomodoro===60) preset60.classList.add("active");
}

function start(){
  unlockAudio();
  if(running||alarmActive) return;
  running=true;
  endAt=Date.now()+remaining;
  tick=setInterval(()=>{
    remaining=endAt-Date.now();
    if(remaining<=0){remaining=0;finish();}
    render();
  },250);
}

function pause(){
  if(!running) return;
  remaining=endAt-Date.now();
  running=false; endAt=null;
  clearInterval(tick); render();
}

function finish(){
  clearInterval(tick);
  running=false; endAt=null; alarmActive=true;
  if(document.visibilityState==="visible"){bell.currentTime=0;bell.play();}
  render();
}

function stopAlarm(){
  alarmActive=false;
  bell.pause(); bell.currentTime=0;
  remaining=DURATIONS[mode]*60000;
  render();
}

function setMode(m){
  stopAlarm(); pause();
  mode=m; remaining=DURATIONS[m]*60000;
  [btnPomodoro,btnShort,btnLong].forEach(b=>b.classList.remove("active"));
  if(m==="pomodoro") btnPomodoro.classList.add("active");
  if(m==="short") btnShort.classList.add("active");
  if(m==="long") btnLong.classList.add("active");
  render();
}

startBtn.onclick=()=> alarmActive?stopAlarm():running?pause():start();
resetBtn.onclick=()=>{stopAlarm();pause();remaining=DURATIONS[mode]*60000;render();};

btnPomodoro.onclick=()=>setMode("pomodoro");
btnShort.onclick=()=>setMode("short");
btnLong.onclick=()=>setMode("long");

settingsBtn.onclick=()=>settingsBackdrop.classList.add("open");
closeSettingsBtn.onclick=()=>settingsBackdrop.classList.remove("open");

presets.forEach(p=>p.onclick=()=>{
  const min=Number(p.dataset.min);
  DURATIONS.pomodoro=min;
  localStorage.setItem("pomodoroMinutes",min);
  if(mode==="pomodoro"&&!running&&!alarmActive) remaining=min*60000;
  render();
});

document.addEventListener("visibilitychange",()=>{
  if(document.visibilityState==="visible"&&alarmActive){
    bell.currentTime=0; bell.play();
  }
});

render();
