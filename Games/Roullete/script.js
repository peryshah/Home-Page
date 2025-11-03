// ---- Data: European wheel order (0–36) ----
const pockets = [
  {num:0, color:"green"},
  {num:32,color:"red"},{num:15,color:"black"},{num:19,color:"red"},{num:4,color:"black"},
  {num:21,color:"red"},{num:2,color:"black"},{num:25,color:"red"},{num:17,color:"black"},
  {num:34,color:"red"},{num:6,color:"black"},{num:27,color:"red"},{num:13,color:"black"},
  {num:36,color:"red"},{num:11,color:"black"},{num:30,color:"red"},{num:8,color:"black"},
  {num:23,color:"red"},{num:10,color:"black"},{num:5,color:"red"},{num:24,color:"black"},
  {num:16,color:"red"},{num:33,color:"black"},{num:1,color:"red"},{num:20,color:"black"},
  {num:14,color:"red"},{num:31,color:"black"},{num:9,color:"red"},{num:22,color:"black"},
  {num:18,color:"red"},{num:29,color:"black"},{num:7,color:"red"},{num:28,color:"black"},
  {num:12,color:"red"},{num:35,color:"black"},{num:3,color:"red"},{num:26,color:"black"}
];
const SLICE = (2*Math.PI)/pockets.length;
const START_OFFSET = -Math.PI/2; // top (12 o'clock)

// ---- DOM ----
const stepCount  = document.getElementById('step-count');
const stepNames  = document.getElementById('step-names');
const stepBets   = document.getElementById('step-bets');

const playerCountInput = document.getElementById('playerCount');
const toNamesBtn = document.getElementById('toNames');
const backToCountBtn = document.getElementById('backToCount');
const toBetsBtn = document.getElementById('toBets');
const nameForm = document.getElementById('nameForm');

const betsDiv = document.getElementById('bets');
const spinBtn = document.getElementById('spinBtn');
const resultDiv = document.getElementById('result');
const historyList = document.getElementById('history');

const canvas = document.getElementById('wheel');
const ctx = canvas.getContext('2d');
const R = canvas.width/2 - 12; // outer radius (leave border)
let rotation = 0;               // current rotation angle (radians)
let animating = false;

let players = [];               // {name, bet: {type, value}}
let resultsHistory = [];

// ---- Step 1: player count -> Step 2 ----
toNamesBtn.addEventListener('click', () => {
  const n = clamp(parseInt(playerCountInput.value,10) || 0, 1, 10);
  playerCountInput.value = n;

  nameForm.innerHTML = '';
  for (let i=0;i<n;i++){
    const row = document.createElement('div');
    row.className = 'row';
    row.innerHTML = `
      <input id="pname-${i}" type="text" placeholder="Player ${i+1}" />
    `;
    nameForm.appendChild(row);
  }

  stepCount.classList.add('hidden');
  stepNames.classList.remove('hidden');
});
backToCountBtn.addEventListener('click', () => {
  stepNames.classList.add('hidden');
  stepCount.classList.remove('hidden');
});

// ---- Step 2: names -> Step 3 (bets) ----
toBetsBtn.addEventListener('click', () => {
  const n = clamp(parseInt(playerCountInput.value,10) || 0, 1, 10);
  players = [];
  for (let i=0;i<n;i++){
    const name = (document.getElementById(`pname-${i}`).value || `Player ${i+1}`).trim();
    players.push({ name, bet: null });
  }
  renderBetRows();
  spinBtn.disabled = true;

  stepNames.classList.add('hidden');
  stepBets.classList.remove('hidden');
  drawWheel(rotation); // initial draw
});

// ---- Betting UI ----
function renderBetRows(){
  betsDiv.innerHTML = '';
  players.forEach((p, idx) => {
    const row = document.createElement('div');
    row.className = 'row';
    row.style.alignItems = 'center';
    row.innerHTML = `
      <div style="min-width:130px;"><strong>${p.name}</strong></div>
      <select id="bet-type-${idx}">
        <option value="red">Red</option>
        <option value="black">Black</option>
        <option value="odd">Odd</option>
        <option value="even">Even</option>
        <option value="1-18">1-18</option>
        <option value="19-36">19-36</option>
        <option value="number">Number</option>
      </select>
      <input id="bet-num-${idx}" type="number" min="0" max="36" placeholder="0–36" class="hidden" />
      <button id="bet-save-${idx}" class="secondary">Save bet</button>
      <span id="bet-status-${idx}" class="muted"></span>
    `;
    betsDiv.appendChild(row);

    // handlers
    const typeSel = row.querySelector(`#bet-type-${idx}`);
    const numInput = row.querySelector(`#bet-num-${idx}`);
    const saveBtn = row.querySelector(`#bet-save-${idx}`);
    const status = row.querySelector(`#bet-status-${idx}`);

    typeSel.addEventListener('change', () => {
      if (typeSel.value === 'number') numInput.classList.remove('hidden');
      else { numInput.classList.add('hidden'); numInput.value=''; }
    });

    saveBtn.addEventListener('click', () => {
      const t = typeSel.value;
      if (t === 'number'){
        const val = parseInt(numInput.value,10);
        if (isNaN(val) || val<0 || val>36){ alert('Enter a number from 0 to 36'); return; }
        players[idx].bet = { type:'number', value: val };
        status.textContent = `Bet: number ${val}`;
      } else {
        players[idx].bet = { type: t, value: null };
        status.textContent = `Bet: ${t}`;
      }
      checkAllBetsPlaced();
    });
  });
}
function checkAllBetsPlaced(){
  const ready = players.every(p => p.bet !== null);
  spinBtn.disabled = !ready;
}

// ---- Wheel drawing ----
function drawWheel(a){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.save();
  ctx.translate(canvas.width/2, canvas.height/2);
  ctx.rotate(a);

  // slices
  for (let i=0;i<pockets.length;i++){
    const start = START_OFFSET + i*SLICE;
    const end = start + SLICE;

    ctx.beginPath();
    ctx.moveTo(0,0);
    ctx.arc(0,0,R, start, end, false);
    ctx.closePath();
    ctx.fillStyle = pockets[i].color;
    ctx.fill();

    // thin separators
    ctx.strokeStyle = '#0b1226';
    ctx.lineWidth = 2;
    ctx.stroke();

    // number text
    const mid = (start+end)/2;
    ctx.save();
    ctx.rotate(mid);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px system-ui, -apple-system, Segoe UI, Roboto, Arial';
    // keep text upright
    ctx.rotate(-mid);
    // position near rim
    const rText = R - 24;
    const x = rText * Math.cos(mid);
    const y = rText * Math.sin(mid);
    ctx.fillStyle = '#fff';
    ctx.fillText(String(pockets[i].num), x, y);
    ctx.restore();
  }

  // inner hub
  ctx.beginPath();
  ctx.arc(0,0, R*0.35, 0, 2*Math.PI);
  ctx.fillStyle = '#0e1731';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#24314f';
  ctx.stroke();

  ctx.restore();
}

// ---- Spin logic (spin to a chosen index exactly) ----
spinBtn.addEventListener('click', () => {
  if (animating) return;
  if (!players.every(p => p.bet)) { alert('All players must place a bet first.'); return; }

  // choose random winning pocket index
  const winIndex = Math.floor(Math.random()*pockets.length);

  // compute target rotation so center of winIndex aligns at pointer (top)
  const targetBase = - (winIndex + 0.5) * SLICE; // from derivation
  const currNorm = normalize(rotation);
  const targetNorm = normalize(targetBase);
  let delta = targetNorm - currNorm;
  if (delta < 0) delta += 2*Math.PI;

  const extraSpins = 4 + Math.floor(Math.random()*3); // 4..6 full spins
  const finalRotation = rotation + delta + extraSpins*2*Math.PI;

  animateRotation(rotation, finalRotation, 5200, () => {
    rotation = finalRotation;
    showOutcome(winIndex);
    // reset bets for next round
    players.forEach(p => p.bet = null);
    renderBetRows();
  });
});

// easing + RAF animation
function animateRotation(from, to, duration, onEnd){
  animating = true;
  const start = performance.now();
  (function frame(now){
    const t = Math.min(1, (now - start)/duration);
    const eased = easeOutCubic(t);
    const a = from + (to - from) * eased;
    drawWheel(a);
    if (t < 1) requestAnimationFrame(frame);
    else { animating = false; onEnd && onEnd(); }
  })(start);
}
function easeOutCubic(t){ return 1 - Math.pow(1 - t, 3); }
function normalize(a){ a = a % (2*Math.PI); return a < 0 ? a + 2*Math.PI : a; }
function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }

// ---- Outcome, winners, history ----
function showOutcome(idx){
  const win = pockets[idx];
  const details = winningDetails(win.num, win.color);

  // winners / losers
  let html = `<h3>Winning number: <span class="${win.color} chip">${win.num}</span></h3>
              <p>${details.color}, ${details.parity}, ${details.range}</p>
              <div class="stack">`;
  players.forEach(p => {
    const res = didWin(p.bet, win, details);
    const betLabel = p.bet.type === 'number' ? `number ${p.bet.value}` : p.bet.type;
    html += `<div>${p.name} — bet on <b>${betLabel}</b>: ${res ? '✅ WIN' : '❌ LOSE'}</div>`;
  });
  html += `</div>`;
  resultDiv.innerHTML = html;

  // history
  resultsHistory.unshift({ num: win.num, color: win.color, details });
  if (resultsHistory.length > 5) resultsHistory.pop();
  renderHistory();
}

function winningDetails(num, color){
  const parity = num === 0 ? '—' : (num % 2 === 0 ? 'Even' : 'Odd');
  const range  = num === 0 ? '—' : (num <= 18 ? '1-18' : '19-36');
  const colorLabel = color.charAt(0).toUpperCase() + color.slice(1);
  return { parity, range, color: colorLabel };
}

function didWin(bet, win, det){
  if (!bet) return false;
  if (bet.type === 'number') return win.num === bet.value;
  if (bet.type === 'red')   return win.color === 'red';
  if (bet.type === 'black') return win.color === 'black';
  if (bet.type === 'odd')   return win.num !== 0 && (win.num % 2 === 1);
  if (bet.type === 'even')  return win.num !== 0 && (win.num % 2 === 0);
  if (bet.type === '1-18')  return win.num >= 1 && win.num <= 18;
  if (bet.type === '19-36') return win.num >= 19 && win.num <= 36;
  return false;
}

function renderHistory(){
  historyList.innerHTML = '';
  resultsHistory.forEach(r => {
    const li = document.createElement('li');
    li.className = 'hist-item';
    const chip = document.createElement('span');
    chip.className = `chip ${r.color}`;
    chip.textContent = r.num;
    const text = document.createElement('span');
    text.textContent = `${r.details.color}, ${r.details.parity}, ${r.details.range}`;
    li.appendChild(chip); li.appendChild(text);
    historyList.appendChild(li);
  });
}

// first paint
drawWheel(rotation);
