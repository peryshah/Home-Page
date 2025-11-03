// script.js - full working roulette logic matched to the HTML/CSS you provided
document.addEventListener('DOMContentLoaded', () => {
    // DOM refs (these IDs/classes are from your HTML)
    const toNamesBtn = document.getElementById('toNames');
    const backToSetupBtn = document.getElementById('backToSetup');
    const confirmNamesBtn = document.getElementById('confirmNames');
    const playerCountInput = document.getElementById('playerCount');
    const namesList = document.getElementById('namesList');

    const tableArea = document.getElementById('tableArea');
    const rouletteMat = document.getElementById('roulette-mat');
    const playersList = document.getElementById('playersList');
    const activePlayerEl = document.getElementById('activePlayer');

    const chipButtons = document.querySelectorAll('.chip');
    const customChipInput = document.getElementById('customChip');
    const setCustomBtn = document.getElementById('setCustom');
    const confirmPlayerBetsBtn = document.getElementById('confirmPlayerBets');

    const winningNumberInput = document.getElementById('winningNumber');
    const resolveBtn = document.getElementById('resolveBtn');
    const resultsSection = document.getElementById('roundResults');
    const resultsList = document.getElementById('resultsList');
    const nextRoundBtn = document.getElementById('nextRoundBtn');

    // config
    const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
    const PLAYER_COLORS = ['#ff7f50', '#6a5acd', '#20b2aa', '#ff6b6b', '#f09a16', '#8dd1b2', '#f05a9f', '#56ccf2', '#ffd166', '#b39ddb'];

    // state
    let players = []; // { id, name, balance, color, bets: Map(betKey->amount) }
    let activePlayerIndex = 0;
    let currentChipValue = 10;
    let placingEnabled = false;

    // ---------- UI helpers ----------
    function createNameInputs(count) {
        namesList.innerHTML = '';
        for (let i = 0; i < count; i++) {
            const wrapper = document.createElement('div');
            wrapper.style.marginBottom = '8px';
            wrapper.innerHTML = `
        <input id="pname-${i}" placeholder="Player ${i + 1}" />
        <input id="pbank-${i}" type="number" placeholder="Bankroll" min="1" style="width:120px; margin-left:6px;" />
      `;
            namesList.appendChild(wrapper);
        }
    }

    function updatePlayersPanel() {
        playersList.innerHTML = '';
        players.forEach((p, i) => {
            const item = document.createElement('div');
            item.className = 'players-list-item';
            const betsSummary = Array.from(p.bets.entries()).map(([k, v]) => `${k}: $${v}`).join(' • ') || 'No bets';
            item.innerHTML = `
        <div>
          <div class="player-name">${p.name}</div>
          <div class="player-balance">Bankroll: $<span id="bal-${p.id}">${p.balance}</span></div>
          <div class="player-bets"></div>
        </div>
        <div>${i === activePlayerIndex && placingEnabled ? '<div class="muted">ACTIVE</div>' : ''}</div>
      `;
            const betsDiv = item.querySelector('.player-bets');
            // create hover badges for each bet so user can highlight mat cell
            if (p.bets.size === 0) betsDiv.textContent = 'No bets';
            else {
                p.bets.forEach((amt, betKey) => {
                    const b = document.createElement('span');
                    b.className = 'bet-badge';
                    b.textContent = `${betKey}: $${amt}`;
                    b.dataset.bet = betKey;
                    b.addEventListener('mouseenter', () => {
                        const cell = findCellByBet(betKey);
                        if (cell) cell.classList.add('selected');
                    });
                    b.addEventListener('mouseleave', () => {
                        const cell = findCellByBet(betKey);
                        if (cell) cell.classList.remove('selected');
                    });
                    betsDiv.appendChild(b);
                });
            }
            playersList.appendChild(item);
        });
        activePlayerEl.textContent = players[activePlayerIndex] ? players[activePlayerIndex].name : '—';
    }

    function compact(n) {
        if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
        if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
        return String(n);
    }

    // ---------- building & finding cells ----------
    function appendChipsContainer(cell) {
        if (!cell.querySelector('.chips-container')) {
            const cont = document.createElement('div');
            cont.className = 'chips-container';
            cell.appendChild(cont);
        }
    }

    function findCellByBet(betKey) {
        // exact match by data-bet
        return rouletteMat.querySelector(`.cell[data-bet='${betKey}']`);
    }

    // ---------- build mat (0 and numbers) ----------
    function buildMat() {
        // clear mat
        rouletteMat.innerHTML = '';

        // ZERO (left column spanning the 3 number rows)
        const zero = document.createElement('div');
        zero.className = 'cell zero';
        zero.textContent = '0';
        zero.dataset.bet = '0';
        appendChipsContainer(zero);
        rouletteMat.appendChild(zero);

        // Numbers in the requested layout (top, middle, bottom)
        const layout = [
            [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36], // top
            [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35], // middle
            [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34]  // bottom
        ];
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 12; c++) {
                const num = layout[r][c];
                const cell = document.createElement('div');
                cell.className = 'cell ' + (RED_NUMBERS.has(num) ? 'red' : 'black');
                cell.textContent = num;
                cell.dataset.bet = String(num);
                appendChipsContainer(cell);
                // bind click once
                if (!cell.dataset.bound) {
                    cell.addEventListener('click', () => {
                        if (placingEnabled) placeBetForActivePlayer(String(num));
                        else cell.classList.toggle('selected');
                    });
                    cell.dataset.bound = '1';
                }
                rouletteMat.appendChild(cell);
            }
        }

        // Dozens: if HTML already contains .dozens inside the mat we don't recreate; else create
        let dozens = rouletteMat.querySelector('.dozens');
        if (!dozens) {
            dozens = document.createElement('div');
            dozens.className = 'dozens';
            dozens.innerHTML = `
        <div class="cell dozen" data-bet="1st12">1ST 12</div>
        <div class="cell dozen" data-bet="2nd12">2ND 12</div>
        <div class="cell dozen" data-bet="3rd12">3RD 12</div>
      `;
            rouletteMat.appendChild(dozens);
        }
        // bottom bets
        let bottom = rouletteMat.querySelector('.bottom-bets');
        if (!bottom) {
            bottom = document.createElement('div');
            bottom.className = 'bottom-bets';
            bottom.innerHTML = `
        <div class="cell bottom" data-bet="1to18">1 TO 18</div>
        <div class="cell bottom" data-bet="even">EVEN</div>
        <div class="cell bottom red" data-bet="red">RED</div>
        <div class="cell bottom black" data-bet="black">BLACK</div>
        <div class="cell bottom" data-bet="odd">ODD</div>
        <div class="cell bottom" data-bet="19to36">19 TO 36</div>
      `;
            rouletteMat.appendChild(bottom);
        }

        // Column bets: create if not present (and place by data-bet so CSS can position)
        for (let i = 1; i <= 3; i++) {
            let colEl = rouletteMat.querySelector(`.cell.column[data-bet="col${i}"]`);
            if (!colEl) {
                colEl = document.createElement('div');
                colEl.className = 'cell column';
                colEl.dataset.bet = `col${i}`;
                colEl.textContent = '2 TO 1';
                rouletteMat.appendChild(colEl);
            }
        }

        // Ensure all .cell elements have a chips-container and are bound only once
        rouletteMat.querySelectorAll('.cell').forEach(cell => {
            appendChipsContainer(cell);
            if (!cell.dataset.bound) {
                // If not already bound, bind click. (Some elements were bound earlier.)
                cell.addEventListener('click', () => {
                    if (placingEnabled && cell.dataset.bet) placeBetForActivePlayer(cell.dataset.bet);
                });
                cell.dataset.bound = '1';
            }
        });

        // If dozens/bottom/columns were created in HTML they might not have event bound yet; bind them only once too.
        const outsideSelector = '.dozens .cell, .bottom-bets .cell, .cell.column';
        rouletteMat.querySelectorAll(outsideSelector).forEach(el => {
            appendChipsContainer(el);
            if (!el.dataset.bound) {
                el.addEventListener('click', () => {
                    if (placingEnabled && el.dataset.bet) placeBetForActivePlayer(el.dataset.bet);
                });
                el.dataset.bound = '1';
            }
        });
    }

    // ---------- placing & UI updates ----------
    function placeBetForActivePlayer(betKey) {
        if (!placingEnabled) return;
        const player = players[activePlayerIndex];
        if (!player) return;
        const chip = currentChipValue;
        if (player.balance < chip) {
            alert(`${player.name} has insufficient balance`);
            return;
        }
        // deduct and record
        player.balance -= chip;
        const prev = player.bets.get(betKey) || 0;
        player.bets.set(betKey, prev + chip);

        // update players panel and cell markers
        updatePlayersPanel();
        updateCellMarkers(betKey);
        // enable confirm (players can place multiple bets; Confirm moves to next player)
        confirmPlayerBetsBtn.disabled = false;
    }

    function updateCellMarkers(betKey) {
        // rebuild one cell from all players
        const cell = findCellByBet(betKey);
        if (!cell) return;
        const cont = cell.querySelector('.chips-container');
        cont.innerHTML = '';
        players.forEach(p => {
            const amt = p.bets.get(betKey) || 0;
            if (amt > 0) {
                const chip = document.createElement('div');
                chip.className = 'player-chip';
                chip.style.background = p.color;
                chip.dataset.player = p.id;
                chip.textContent = compact(amt);
                cont.appendChild(chip);
            }
        });
    }

    function updateAllCellMarkers() {
        // iterate all cells with data-bet and rebuild their chips-container
        rouletteMat.querySelectorAll('.cell[data-bet]').forEach(cell => {
            const betKey = cell.dataset.bet;
            const cont = cell.querySelector('.chips-container');
            if (!cont) return;
            cont.innerHTML = '';
            players.forEach(p => {
                const amt = p.bets.get(betKey) || 0;
                if (amt > 0) {
                    const chip = document.createElement('div');
                    chip.className = 'player-chip';
                    chip.style.background = p.color;
                    chip.dataset.player = p.id;
                    chip.textContent = compact(amt);
                    cont.appendChild(chip);
                }
            });
        });
    }

    // ---------- confirm player bets (move to next player) ----------
    confirmPlayerBetsBtn.addEventListener('click', () => {
        // allow confirming even if player placed zero bets (some casinos allow)
        if (activePlayerIndex < players.length - 1) {
            activePlayerIndex++;
            updatePlayersPanel();
            confirmPlayerBetsBtn.disabled = true; // disable until they place bets
        } else {
            // last player confirmed -> stop placing
            placingEnabled = false;
            confirmPlayerBetsBtn.disabled = true;
            activePlayerEl.textContent = 'All players finished. Dealer, enter winning number.';
        }
        updatePlayersPanel();
    });

    // ---------- chips UI ----------
    chipButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            chipButtons.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            currentChipValue = parseInt(btn.dataset.value, 10);
        });
    });
    setCustomBtn.addEventListener('click', () => {
        const v = parseInt(customChipInput.value, 10);
        if (!v || v <= 0) return alert('Enter a positive custom chip value');
        currentChipValue = v;
        chipButtons.forEach(b => b.classList.remove('selected'));
        customChipInput.value = '';
    });

    // ---------- resolve round ----------
    resolveBtn.addEventListener('click', () => {
        const n = parseInt(winningNumberInput.value, 10);
        if (Number.isNaN(n) || n < 0 || n > 36) return alert('Enter winning number 0–36');
        resolveRound(n);
    });

    function resolveRound(winNumber) {
        // clear prior winner highlights
        rouletteMat.querySelectorAll('.cell').forEach(c => c.classList.remove('winner', 'selected'));

        const isZero = (winNumber === 0);
        const isRed = RED_NUMBERS.has(winNumber);
        const isBlack = !isZero && !isRed;
        const isOdd = !isZero && (winNumber % 2 === 1);
        const isEven = !isZero && (winNumber % 2 === 0);
        const in1to18 = !isZero && winNumber >= 1 && winNumber <= 18;
        const in19to36 = !isZero && winNumber >= 19 && winNumber <= 36;
        const in1st12 = winNumber >= 1 && winNumber <= 12;
        const in2nd12 = winNumber >= 13 && winNumber <= 24;
        const in3rd12 = winNumber >= 25 && winNumber <= 36;
        const inCol1 = !isZero && [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34].includes(winNumber);
        const inCol2 = !isZero && [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35].includes(winNumber);
        const inCol3 = !isZero && [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36].includes(winNumber);

        // highlight winners on mat
        const straightCell = findCellByBet(String(winNumber));
        if (straightCell) straightCell.classList.add('winner');
        if (in1st12) findCellByBet('1st12')?.classList.add('winner');
        if (in2nd12) findCellByBet('2nd12')?.classList.add('winner');
        if (in3rd12) findCellByBet('3rd12')?.classList.add('winner');
        if (inCol1) findCellByBet('col1')?.classList.add('winner');
        if (inCol2) findCellByBet('col2')?.classList.add('winner');
        if (inCol3) findCellByBet('col3')?.classList.add('winner');
        if (isRed) findCellByBet('red')?.classList.add('winner');
        if (isBlack) findCellByBet('black')?.classList.add('winner');
        if (isOdd) findCellByBet('odd')?.classList.add('winner');
        if (isEven) findCellByBet('even')?.classList.add('winner');
        if (in1to18) findCellByBet('1to18')?.classList.add('winner');
        if (in19to36) findCellByBet('19to36')?.classList.add('winner');

        // process payouts
        const results = [];
        players.forEach(p => {
            let netChange = 0;
            const betsArray = Array.from(p.bets.entries());
            const details = [];
            betsArray.forEach(([betKey, amount]) => {
                let win = false, multiplier = 0;
                if (/^\d+$/.test(betKey)) {
                    if (parseInt(betKey, 10) === winNumber) { win = true; multiplier = 35; }
                } else if (betKey === '1st12' && in1st12) { win = true; multiplier = 2; }
                else if (betKey === '2nd12' && in2nd12) { win = true; multiplier = 2; }
                else if (betKey === '3rd12' && in3rd12) { win = true; multiplier = 2; }
                else if (betKey === 'col1' && inCol1) { win = true; multiplier = 2; }
                else if (betKey === 'col2' && inCol2) { win = true; multiplier = 2; }
                else if (betKey === 'col3' && inCol3) { win = true; multiplier = 2; }
                else if (betKey === 'red' && isRed) { win = true; multiplier = 1; }
                else if (betKey === 'black' && isBlack) { win = true; multiplier = 1; }
                else if (betKey === 'odd' && isOdd) { win = true; multiplier = 1; }
                else if (betKey === 'even' && isEven) { win = true; multiplier = 1; }
                else if (betKey === '1to18' && in1to18) { win = true; multiplier = 1; }
                else if (betKey === '19to36' && in19to36) { win = true; multiplier = 1; }

                if (win) {
                    // add original stake + winnings
                    const payout = amount * (multiplier + 1);
                    netChange += payout;
                    details.push({ betKey, amount, win: true, payout });
                } else {
                    details.push({ betKey, amount, win: false, payout: 0 });
                }
            });
            p.balance += netChange;
            results.push({ name: p.name, details, netChange, balance: p.balance });
        });

        // show results
        resultsList.innerHTML = `<div class="muted">Winning number: <strong>${winNumber}</strong></div>`;
        results.forEach(r => {
            const out = document.createElement('div');
            out.style.marginTop = '8px';
            out.innerHTML = `<strong>${r.name}</strong> — Net: $${r.netChange} — Balance: $${r.balance}`;
            r.details.forEach(d => {
                const dline = document.createElement('div');
                dline.className = 'muted';
                dline.style.marginLeft = '8px';
                dline.textContent = `${d.betKey}: $${d.amount} → ${d.win ? ('WIN $' + d.payout) : 'LOSE'}`;
                out.appendChild(dline);
            });
            resultsList.appendChild(out);
        });

        // update UI and show next round control
        updatePlayersPanel();
        updateAllCellMarkers();
        resultsSection.classList.remove('hidden');
        nextRoundBtn.classList.remove('hidden');

        // stop placing until next round
        placingEnabled = false;
        confirmPlayerBetsBtn.disabled = true;
        activePlayerEl.textContent = 'Round resolved';
    }

    // ---------- next round cleanup ----------
    nextRoundBtn.addEventListener('click', () => {
        // clear chips on table
        rouletteMat.querySelectorAll('.chips-container').forEach(c => c.innerHTML = '');
        // clear winner highlight
        rouletteMat.querySelectorAll('.cell').forEach(c => c.classList.remove('winner', 'selected'));
        // reset player bets
        players.forEach(p => p.bets = new Map());
        // hide results
        resultsSection.classList.add('hidden');
        nextRoundBtn.classList.add('hidden');
        // reset controls for next round
        activePlayerIndex = 0;
        placingEnabled = true;
        confirmPlayerBetsBtn.disabled = false;
        updatePlayersPanel();
        updateAllCellMarkers();
    });

    // ---------- start / setup buttons ----------
    toNamesBtn.addEventListener('click', () => {
        const count = Math.max(1, Math.min(10, parseInt(playerCountInput.value || 0)));
        if (!count) return alert('Enter 1–10 players');
        createNameInputs(count);
        document.getElementById('setup').classList.add('hidden');
        document.getElementById('names').classList.remove('hidden');
    });

    backToSetupBtn.addEventListener('click', () => {
        document.getElementById('names').classList.add('hidden');
        document.getElementById('setup').classList.remove('hidden');
    });

    function createNameInputs(count) {
        namesList.innerHTML = '';
        for (let i = 0; i < count; i++) {
            const div = document.createElement('div');
            div.style.marginBottom = '8px';
            div.innerHTML = `
        <input id="pname-${i}" placeholder="Player ${i + 1}" />
        <input id="pbank-${i}" type="number" placeholder="Bankroll" min="1" style="width:120px; margin-left:6px;" />
      `;
            namesList.appendChild(div);
        }
    }

    confirmNamesBtn.addEventListener('click', () => {
        const count = Math.max(1, Math.min(10, parseInt(playerCountInput.value || 0)));
        players = [];
        for (let i = 0; i < count; i++) {
            const nameEl = document.getElementById(`pname-${i}`);
            const bankEl = document.getElementById(`pbank-${i}`);
            const name = nameEl && nameEl.value.trim() ? nameEl.value.trim() : `Player ${i + 1}`;
            const bank = bankEl && +bankEl.value > 0 ? +bankEl.value : 1000;
            players.push({ id: i, name, color: PLAYER_COLORS[i % PLAYER_COLORS.length], balance: bank, bets: new Map() });
        }
        // hide setup, show table
        document.getElementById('names').classList.add('hidden');
        tableArea.classList.remove('hidden');
        buildMat();
        updatePlayersPanel();
        placingEnabled = true;
        confirmPlayerBetsBtn.disabled = true; // no confirm until they place something
    });

    // ---------- end DOMContentLoaded setup ----------
    // select default chip UI if present
    if (chipButtons && chipButtons.length) {
        chipButtons.forEach(b => b.classList.remove('selected'));
        const first = chipButtons[0];
        if (first) {
            first.classList.add('selected');
            currentChipValue = parseInt(first.dataset.value, 10);
        }
    }
});
