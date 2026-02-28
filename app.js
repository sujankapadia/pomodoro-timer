// ── Segment map ─────────────────────────────────
// Segments: a(top), b(top-right), c(bottom-right), d(bottom), e(bottom-left), f(top-left), g(middle)
const SEGMENTS = {
  0: [1,1,1,1,1,1,0],
  1: [0,1,1,0,0,0,0],
  2: [1,1,0,1,1,0,1],
  3: [1,1,1,1,0,0,1],
  4: [0,1,1,0,0,1,1],
  5: [1,0,1,1,0,1,1],
  6: [1,0,1,1,1,1,1],
  7: [1,1,1,0,0,0,0],
  8: [1,1,1,1,1,1,1],
  9: [1,1,1,1,0,1,1],
};

// ── DOM refs ────────────────────────────────────
const digits = [
  document.getElementById('d0'),
  document.getElementById('d1'),
  document.getElementById('d2'),
  document.getElementById('d3'),
];
const colonEl = document.getElementById('colon');
const startPauseBtn = document.getElementById('startPause');
const resetBtn = document.getElementById('reset');
const presetBtns = document.querySelectorAll('.preset-btn');
const screen = document.querySelector('.screen');
const digitsContainer = document.querySelector('.digits');
const tickRingSvg = document.querySelector('.tick-ring');

// ── State ───────────────────────────────────────
let totalSeconds = 10 * 60;      // default preset
let remainingSeconds = totalSeconds;
let isRunning = false;
let startTimestamp = null;
let elapsedAtPause = 0;
let intervalId = null;
let isCompleted = false;

// ── Generate tick ring ──────────────────────────
function generateTicks() {
  const cx = 140, cy = 140;
  const r1 = 120, r2 = 136;   // inner / outer radius (longer ticks)
  for (let i = 0; i < 60; i++) {
    const angle = (i * 6 - 90) * (Math.PI / 180); // start at 12 o'clock
    const x1 = cx + r1 * Math.cos(angle);
    const y1 = cy + r1 * Math.sin(angle);
    const x2 = cx + r2 * Math.cos(angle);
    const y2 = cy + r2 * Math.sin(angle);
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1.toFixed(2));
    line.setAttribute('y1', y1.toFixed(2));
    line.setAttribute('x2', x2.toFixed(2));
    line.setAttribute('y2', y2.toFixed(2));
    line.classList.add('active');
    tickRingSvg.appendChild(line);
  }
}
generateTicks();

// ── Update 7-segment display ────────────────────
function setDigit(digitEl, num) {
  const segs = digitEl.querySelectorAll('.seg');
  const pattern = SEGMENTS[num];
  segs.forEach((seg, i) => {
    seg.classList.toggle('on', pattern[i] === 1);
  });
}

function updateDisplay(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const d0 = Math.floor(m / 10);
  const d1 = m % 10;
  const d2 = Math.floor(s / 10);
  const d3 = s % 10;
  setDigit(digits[0], d0);
  setDigit(digits[1], d1);
  setDigit(digits[2], d2);
  setDigit(digits[3], d3);

  // Update page title
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  document.title = `${mm}:${ss} — Pomodoro`;
}

// ── Update tick ring ────────────────────────────
function updateTickRing(remaining, total) {
  const ticks = tickRingSvg.querySelectorAll('line');
  // Map total seconds onto 60 ticks
  const ticksToLight = Math.ceil((remaining / total) * 60);
  // Ticks deplete counter-clockwise: starting from tick 59 (just before 12 o'clock)
  // going backwards (58, 57, ..., 1, 0). Tick 0 (12 o'clock) is last to deplete.
  ticks.forEach((tick, i) => {
    const isActive = i < ticksToLight;
    const isCurrent = isRunning && i === ticksToLight - 1 && ticksToLight > 0;
    tick.classList.toggle('active', isActive && !isCurrent);
    tick.classList.toggle('current', isCurrent);
    tick.classList.toggle('depleted', !isActive);
  });
}

// ── Timer core ──────────────────────────────────
function tick() {
  if (!isRunning) return;
  const elapsed = elapsedAtPause + (Date.now() - startTimestamp) / 1000;
  remainingSeconds = Math.max(0, Math.ceil(totalSeconds - elapsed));
  updateDisplay(remainingSeconds);
  updateTickRing(remainingSeconds, totalSeconds);

  if (remainingSeconds <= 0) {
    complete();
  }
}

function start() {
  if (isCompleted) resetTimer();
  isRunning = true;
  startTimestamp = Date.now();
  colonEl.classList.remove('blink');
  digitsContainer.classList.remove('done');
  screen.classList.remove('flash');
  startPauseBtn.textContent = 'Pause';
  if (!intervalId) {
    intervalId = setInterval(tick, 250);
  }
}

function pause() {
  isRunning = false;
  elapsedAtPause += (Date.now() - startTimestamp) / 1000;
  startTimestamp = null;
  colonEl.classList.add('blink');
  startPauseBtn.textContent = 'Start';
  clearInterval(intervalId);
  intervalId = null;
}

function resetTimer() {
  isRunning = false;
  isCompleted = false;
  elapsedAtPause = 0;
  startTimestamp = null;
  remainingSeconds = totalSeconds;
  clearInterval(intervalId);
  intervalId = null;
  colonEl.classList.remove('blink');
  digitsContainer.classList.remove('done');
  screen.classList.remove('flash');
  startPauseBtn.textContent = 'Start';
  updateDisplay(remainingSeconds);
  updateTickRing(remainingSeconds, totalSeconds);
}

function complete() {
  isRunning = false;
  isCompleted = true;
  clearInterval(intervalId);
  intervalId = null;
  remainingSeconds = 0;
  updateDisplay(0);
  updateTickRing(0, totalSeconds);
  startPauseBtn.textContent = 'Start';

  // Visual feedback
  screen.classList.add('flash');
  digitsContainer.classList.add('done');

  // Sound
  playAlarm();

  // Browser notification
  sendNotification();
}

// ── Alarm sound (Web Audio API) ─────────────────
function playAlarm() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const beepTimes = [0, 0.3, 0.6];
  beepTimes.forEach((offset) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime + offset);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + offset);
    osc.stop(ctx.currentTime + offset + 0.2);
  });
}

// ── Browser notification ────────────────────────
function sendNotification() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    new Notification('Pomodoro Complete', { body: 'Time is up! Take a break.' });
  }
}

let notificationRequested = false;
function requestNotificationPermission() {
  if (notificationRequested) return;
  if ('Notification' in window && Notification.permission === 'default') {
    notificationRequested = true;
    Notification.requestPermission();
  }
}

// ── Event listeners ─────────────────────────────
startPauseBtn.addEventListener('click', () => {
  requestNotificationPermission();
  if (isRunning) {
    pause();
  } else {
    start();
  }
});

resetBtn.addEventListener('click', resetTimer);

presetBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    presetBtns.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    totalSeconds = parseInt(btn.dataset.minutes, 10) * 60;
    resetTimer();
  });
});

// Space bar to start/pause
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && e.target === document.body) {
    e.preventDefault();
    requestNotificationPermission();
    if (isRunning) {
      pause();
    } else {
      start();
    }
  }
});

// ── Initial render ──────────────────────────────
updateDisplay(remainingSeconds);
updateTickRing(remainingSeconds, totalSeconds);
