// Blackjack Multiplayer — responsive, with Split & Double Down, 3:2 Blackjack payout
// Flow: setup -> names -> betting (chips) -> deal -> player turns -> dealer -> settle -> next round

// ---------- State ----------
let players = []; // { name, balance, bets:[], hands:[], finishedFlags:[], doubledFlags:[] }
let dealer = { hand: [], reveal: false };
let deck = [];
let currentPlayer = 0;       // index of active player
let currentHandIndex = 0;    // index of hand for player when split exists
let roundActive = false;

// DOM
const el = id => document.getElementById(id);
const setupEl = el('setup'), namesEl = el('names'), bettingEl = el('betting'), gameEl = el('game');
const namesList = el('namesList'), bettingArea = el('bettingArea'), dealerHandEl = el('dealerHand');
const playersArea = el('playersArea'), dealerTotalEl = el('dealerTotal'), turnIndicator = el('turnIndicator');
const btnDeal = el('btnDeal'), btnHit = el('btnHit'), btnStand = el('btnStand');
const btnDouble = el('btnDouble'), btnSplit = el('btnSplit'), btnNextRound = el('btnNextRound');
const resultsEl = el('results'), resultsList = el('resultsList');


// ---------- Setup & Names ----------
el('btnToNames').addEventListener('click', () => {
  const n = Math.max(1, Math.min(10, parseInt(el('numPlayers').value || 0)));
  if (!n) return alert('Enter number 1–10');
  namesList.innerHTML = '';
  for (let i = 0; i < n; i++) {
    const input = document.createElement('input');
    input.id = `name-${i}`; input.placeholder = `Player ${i + 1}`; input.style.display = 'block'; input.style.margin = '6px 0';
    namesList.appendChild(input);
  }
  setupEl.classList.add('hidden');
  namesEl.classList.remove('hidden');
});
el('btnBackSetup').addEventListener('click', () => { namesEl.classList.add('hidden'); setupEl.classList.remove('hidden'); });

el('btnConfirmNames').addEventListener('click', () => {
  const inputs = namesList.querySelectorAll('input');
  players = [];
  inputs.forEach((inp, i) => {
    const nm = inp.value.trim() || `Player ${i + 1}`;
    players.push({
      name: nm,
      balance: 1000,
      bets: [0],      // one bet per hand; betting occurs only for initial hand
      hands: [[]],    // array of hands; start with 1 hand each
      finished: [false],
      doubled: [false]
    });
  });
  namesEl.classList.add('hidden');
  showBetting();
});

// ---------- Betting ----------
function showBetting() {
  bettingEl.classList.remove('hidden');
  gameEl.classList.add('hidden');
  resultsEl.classList.add('hidden');
  btnDeal.disabled = true;
  renderBettingArea();
}

function renderBettingArea() {
  bettingArea.innerHTML = '';
  players.forEach((p, idx) => {
    const card = document.createElement('div'); card.className = 'player-card';
    card.innerHTML = `
      <div class="header"><strong>${p.name}</strong> <span class="muted">Balance: $<span id="bal-${idx}">${p.balance}</span></span></div>
      <div class="muted">Current Bet: $<span id="bet-${idx}">${p.bets[0]}</span></div>
    `;
    // attach chip buttons but they will be global; clicking global chips will place for selected player
    const chooseDiv = document.createElement('div'); chooseDiv.style.marginTop = '8px';
    const selectBtn = document.createElement('button'); selectBtn.className = 'btn'; selectBtn.innerText = 'Select to Bet';
    selectBtn.addEventListener('click', () => { selectBetPlayer(idx); });
    chooseDiv.appendChild(selectBtn);
    card.appendChild(chooseDiv);
    bettingArea.appendChild(card);
  });
  // by default select first player
  selectBetPlayer(0);
}

let selectedBetPlayer = 0;
function selectBetPlayer(idx) {
  selectedBetPlayer = idx;
  // highlight visually
  const nodes = bettingArea.querySelectorAll('.player-card');
  nodes.forEach((n, i) => { n.style.boxShadow = i === idx ? '0 0 0 4px rgba(255,209,102,0.08) inset' : 'none'; });
}

// chip clicks: global chips present in DOM; attach listeners
document.querySelectorAll('.chip').forEach(btn => {
  btn.addEventListener('click', () => {
    const v = parseInt(btn.dataset.value, 10);
    placeChipBet(selectedBetPlayer, v);
  });
});

function placeChipBet(playerIdx, amount) {
  const p = players[playerIdx];
  if (p.balance < amount) return alert(`${p.name} has insufficient balance`);
  p.balance -= amount;
  p.bets[0] += amount;
  el(`bal-${playerIdx}`).innerText = p.balance;
  el(`bet-${playerIdx}`).innerText = p.bets[0];
  checkDealEnabled();
}

function checkDealEnabled() {
  const allBet = players.every(p => p.bets[0] > 0);
  btnDeal.disabled = !allBet;
}

btnDeal.addEventListener('click', () => {
  if (players.some(p => p.bets[0] <= 0)) return alert('All players must place a bet');
  bettingEl.classList.add('hidden');
  startRound();
});

// ---------- Deck helpers ----------
function createDeck() {
  const suits = ['♠', '♥', '♦', '♣'];
  const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const d = [];
  for (const s of suits) for (const r of ranks) d.push({ name: r, suit: s, value: rankValue(r) });
  return shuffle(d);
}
function rankValue(r) { if (['J', 'Q', 'K'].includes(r)) return 10; if (r === 'A') return 11; return parseInt(r, 10); }
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; } return a; }
function calcHandTotal(cards) {
  let total = cards.reduce((s, c) => s + c.value, 0);
  let aces = cards.filter(c => c.name === 'A').length;
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
}
function draw() { return deck.pop(); }

// ---------- Round start / deal ----------
function startRound() {
  deck = createDeck();
  dealer = { hand: [], reveal: false };
  // clear player hands & flags; bets already set and deducted
  players.forEach(p => {
    p.hands = [[]];
    p.finished = [false];
    p.doubled = [false];
  });

  // initial deal: two cards each, dealer two
  for (let r = 0; r < 2; r++) {
    players.forEach(p => p.hands[0].push(draw()));
    dealer.hand.push(draw());
  }
  // set starting indices
  currentPlayer = 0; currentHandIndex = 0; roundActive = true; dealer.reveal = false;
  // render
  renderGame();
  beginPlayerTurns();
}

// ---------- Rendering ----------
function renderGame() {
  gameEl.classList.remove('hidden');
  // dealer
  dealerHandEl.innerHTML = '';
  dealer.hand.forEach((c, i) => {
    const cardEl = document.createElement('div'); cardEl.className = 'card-visual';
    if (i === 1 && !dealer.reveal) { cardEl.textContent = '🂠'; } else { cardEl.textContent = `${c.name}${c.suit}`; }
    dealerHandEl.appendChild(cardEl);
  });
  dealerTotalEl.textContent = dealer.reveal ? `Total: ${calcHandTotal(dealer.hand)}` : '';

  // players
  playersArea.innerHTML = '';
  players.forEach((p, pi) => {
    const card = document.createElement('div'); card.className = 'player-card';
    // header
    const header = document.createElement('div'); header.className = 'header';
    header.innerHTML = `<div><strong>${p.name}</strong></div><div class="muted">Balance: $<span id="balval-${pi}">${p.balance}</span></div>`;
    card.appendChild(header);

    // For each hand show its cards
    p.hands.forEach((hand, hi) => {
      const handWrap = document.createElement('div'); handWrap.style.marginTop = '8px';
      const handTitle = document.createElement('div'); handTitle.className = 'muted';
      handTitle.textContent = `Hand ${hi + 1} — Bet: $${p.bets[hi] || 0} ${p.doubled[hi] ? '(Doubled)' : ''}`;
      handWrap.appendChild(handTitle);
      const handArea = document.createElement('div'); handArea.className = 'hand';
      hand.forEach(cardObj => {
        const c = document.createElement('div'); c.className = 'card-visual'; c.textContent = `${cardObj.name}${cardObj.suit}`;
        handArea.appendChild(c);
      });
      handWrap.appendChild(handArea);
      const total = document.createElement('div'); total.className = 'muted'; total.textContent = `Total: ${calcHandTotal(hand)}`;
      handWrap.appendChild(total);
      // mark active hand
      if (pi === currentPlayer && hi === currentHandIndex && !p.finished[hi] && roundActive) {
        card.classList.add('active');
      }
      card.appendChild(handWrap);
    });

    playersArea.appendChild(card);
  });
}

// ---------- Player turns flow ----------
function beginPlayerTurns() {
  // find next player/hand to play
  currentPlayer = findNextPlayer(0);
  currentHandIndex = 0;
  if (currentPlayer === null) { // no players with active hands
    dealerPlay();
    return;
  }
  updateTurnUI();
}

function findNextPlayer(startIdx) {
  for (let i = startIdx; i < players.length; i++) {
    const p = players[i];
    if (!p.hands) continue;
    for (let hi = 0; hi < p.hands.length; hi++) {
      if (!p.finished[hi]) return i;
    }
  }
  // search from beginning
  for (let i = 0; i < startIdx; i++) {
    const p = players[i];
    for (let hi = 0; hi < p.hands.length; hi++) {
      if (!p.finished[hi]) return i;
    }
  }
  return null;
}

function updateTurnUI() {
  // ensure currentHandIndex points to first unfinished hand of currentPlayer
  const p = players[currentPlayer];
  let hi = p.hands.findIndex((h, i) => !p.finished[i]);
  if (hi === -1) { // this player done -> move to next player
    const next = findNextPlayer(currentPlayer + 1);
    if (next === null) { dealerPlay(); return; }
    currentPlayer = next; updateTurnUI(); return;
  }
  currentHandIndex = hi;
  // set turn indicator
  turnIndicator.textContent = `${p.name} — playing Hand ${currentHandIndex + 1}`;
  renderGame();
  // enable/disable controls based on hand status and rules
  enableControlsForCurrentHand();
}

function enableControlsForCurrentHand() {
  const p = players[currentPlayer];
  const hand = p.hands[currentHandIndex];
  // basics
  btnHit.disabled = false;
  btnStand.disabled = false;

  // Double Down: only allowed if hand length == 2 and player has enough balance to match that hand's bet
  const bet = p.bets[currentHandIndex] || 0;
  btnDouble.disabled = !(hand.length === 2 && p.balance >= bet && !p.doubled[currentHandIndex]);

  // Split: allowed if length==2 and same rank and balance has enough for another equal bet and player currently has only one hand (but allow multiple splits optional)
  let canSplit = false;
  if (hand.length === 2) {
    const a = hand[0].name, b = hand[1].name;
    if (a === b && p.balance >= bet) canSplit = true;
  }
  btnSplit.disabled = !canSplit;
}

// ---------- Player actions ----------
btnHit.addEventListener('click', () => {
  const p = players[currentPlayer];
  const hand = p.hands[currentHandIndex];
  hand.push(draw());
  if (calcHandTotal(hand) > 21) {
    // bust
    p.finished[currentHandIndex] = true;
    // move to next player/hand
    const next = findNextPlayer(currentPlayer + 1);
    if (next === null) dealerPlay(); else { currentPlayer = next; updateTurnUI(); }
  } else {
    renderGame();
    enableControlsForCurrentHand();
  }
});

btnStand.addEventListener('click', () => {
  players[currentPlayer].finished[currentHandIndex] = true;
  const next = findNextPlayer(currentPlayer + 1);
  if (next === null) dealerPlay(); else { currentPlayer = next; updateTurnUI(); }
});

btnDouble.addEventListener('click', () => {
  const p = players[currentPlayer];
  const bet = p.bets[currentHandIndex] || 0;
  if (p.balance < bet) return alert('Not enough balance to double');
  p.balance -= bet;
  p.bets[currentHandIndex] = bet * 2;
  p.doubled[currentHandIndex] = true;
  // draw exactly one card and stand
  p.hands[currentHandIndex].push(draw());
  p.finished[currentHandIndex] = true;
  renderGame();
  const next = findNextPlayer(currentPlayer + 1);
  if (next === null) dealerPlay(); else { currentPlayer = next; updateTurnUI(); }
});

btnSplit.addEventListener('click', () => {
  const p = players[currentPlayer];
  const hand = p.hands[currentHandIndex];
  const bet = p.bets[currentHandIndex] || 0;
  if (hand.length !== 2 || hand[0].name !== hand[1].name) return alert('Split not allowed');
  if (p.balance < bet) return alert('Not enough balance to split');

  // perform split: create two hands, move second card to new hand, draw one card for each hand
  const cardA = hand[0];
  const cardB = hand[1];
  // reduce current hand to single
  p.hands[currentHandIndex] = [cardA];
  // add new hand with second card
  p.hands.splice(currentHandIndex + 1, 0, [cardB]);
  // duplicate bet
  p.balance -= bet;
  p.bets.splice(currentHandIndex + 1, 0, bet);
  // set finished & doubled flags for new hand
  p.finished.splice(currentHandIndex + 1, 0, false);
  p.doubled.splice(currentHandIndex + 1, 0, false);
  // draw one card for each hand
  p.hands[currentHandIndex].push(draw());
  p.hands[currentHandIndex + 1].push(draw());
  renderGame();
  // continue playing current player's first hand (currentHandIndex unchanged)
  enableControlsForCurrentHand();
});

// ---------- Dealer play & settlement ----------
async function dealerPlay() {
  // reveal dealer hole card, then draw until 17+
  dealer.reveal = true;
  renderGame();
  // ensure dealer has initial two cards already
  while (calcHandTotal(dealer.hand) < 17) {
    await sleep(600);
    dealer.hand.push(draw());
    renderGame();
  }
  settleRound();
}

function settleRound() {
  roundActive = false;
  resultsList.innerHTML = '';
  const dealerTotal = calcHandTotal(dealer.hand);

  players.forEach((p, pi) => {
    // each hand settlement
    p.hands.forEach((hand, hi) => {
      const bet = p.bets[hi] || 0;
      const total = calcHandTotal(hand);
      let msg = '', payout = 0;
      // natural blackjack (two cards and total==21)
      if (hand.length === 2 && total === 21) {
        // blackjack 3:2 => pay 2.5 * bet (we deducted bets at betting time), add that amount
        payout = Math.floor(bet * 2.5);
        p.balance += payout;
        msg = `Hand ${hi + 1}: Blackjack! Payout: $${payout} (bet ${bet})`;
      } else if (total > 21) {
        msg = `Hand ${hi + 1}: Busted (lost $${bet})`;
        // no payout
      } else if (dealerTotal > 21 || total > dealerTotal) {
        payout = bet * 2;
        p.balance += payout;
        msg = `Hand ${hi + 1}: Win! Payout: $${payout} (bet ${bet})`;
      } else if (total === dealerTotal) {
        payout = bet;
        p.balance += payout;
        msg = `Hand ${hi + 1}: Push (bet returned $${payout})`;
      } else {
        msg = `Hand ${hi + 1}: Lose (lost $${bet})`;
      }
      const line = document.createElement('div');
      line.innerHTML = `<strong>${p.name}:</strong> ${msg} (Hand total: ${total})`;
      resultsList.appendChild(line);
      // reset bet for that hand for next round (we will reset full p.bets after loop)
    });
    // ensure UI balance update
    const balEl = el(`balval-${pi}`);
    if (balEl) balEl.innerText = p.balance;
  });

  // show results and enable next round
  resultsEl.classList.remove('hidden');
  btnNextRound.classList.remove('hidden');
  btnNextRound.onclick = startNextRound;
}

function startNextRound() {
  // cleanup per-round items, but keep balances. Reset bets/hands arrays to initial shape.
  players.forEach(p => {
    p.bets = [0];
    p.hands = [[]];
    p.finished = [false];
    p.doubled = [false];
  });
  dealer = { hand: [], reveal: false };
  btnNextRound.classList.add('hidden');
  resultsEl.classList.add('hidden');
  renderBettingArea();
  bettingEl.classList.remove('hidden');
  gameEl.classList.add('hidden');
  // auto-select first player for betting
  selectBetPlayer(0);
}

// small helper
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ---------- Utility: render initially invisible elements and wire controls ----------
function initControls() {
  btnHit.disabled = false; btnStand.disabled = false; btnDouble.disabled = false; btnSplit.disabled = false;
  // initial hide until round starts
  gameEl.classList.add('hidden');
  resultsEl.classList.add('hidden');
  btnNextRound.classList.add('hidden');
  // Wire control button functions already set by listeners above
}
initControls();
