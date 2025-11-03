/* Cricket Scoreboard SPA — frontend-only (localStorage) */
/* Save these three files together and open index.html in a modern browser */

(() => {
  const STORAGE_KEY = 'cricket_scoreboard_spa_v1';

  // --- State & persistence
  let state = loadState();

  function defaultState() {
    return {
      teams: [],       // {id,name}
      players: [],     // {id,name,teamId,role,stats:{runs,balls,4s,6s,wickets}}
      matches: [],     // {id,title,teamA,teamB,venue,date,overs,format,status,innings:[],events:[],createdAt}
      activeMatchId: null
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : defaultState();
    } catch (e) {
      console.error('load failed', e);
      return defaultState();
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    renderAll();
  }

  function uid(prefix='id'){ return prefix + '_' + Math.random().toString(36).slice(2,9); }

  // --- Helpers to find
  function findTeam(id){ return state.teams.find(t=>t.id===id) || {id:'',name:'--'}; }
  function findPlayer(id){ return state.players.find(p=>p.id===id) || {id:'',name:'--',role:''}; }
  function findMatch(id){ return state.matches.find(m=>m.id===id); }
  function activeMatch(){ return findMatch(state.activeMatchId); }

  // --- DOM refs
  const tabs = document.querySelectorAll('.tab');
  const panels = document.querySelectorAll('.panel');

  // setup
  const teamName = document.getElementById('teamName');
  const addTeamBtn = document.getElementById('addTeam');
  const teamForPlayer = document.getElementById('teamForPlayer');
  const playerName = document.getElementById('playerName');
  const playerRole = document.getElementById('playerRole');
  const addPlayerBtn = document.getElementById('addPlayer');
  const teamsList = document.getElementById('teamsList');

  const matchTeamA = document.getElementById('matchTeamA');
  const matchTeamB = document.getElementById('matchTeamB');
  const matchTitle = document.getElementById('matchTitle');
  const venue = document.getElementById('venue');
  const matchDate = document.getElementById('matchDate');
  const oversPerInnings = document.getElementById('oversPerInnings');
  const matchFormat = document.getElementById('matchFormat');
  const createMatchBtn = document.getElementById('createMatch');
  const matchesList = document.getElementById('matchesList');

  // scorer
  const activeMatchInfo = document.getElementById('activeMatchInfo');
  const selectStriker = document.getElementById('selectStriker');
  const selectNonStriker = document.getElementById('selectNonStriker');
  const selectBowler = document.getElementById('selectBowler');
  const selectNextBowler = document.getElementById('selectNextBowler');
  const runButtons = document.querySelectorAll('.run');
  const extrasButtons = document.querySelectorAll('.extra');
  const wicketOutSelect = document.getElementById('wicketOutSelect');
  const wicketType = document.getElementById('wicketType');
  const recordWicketBtn = document.getElementById('recordWicket');
  const endInningsBtn = document.getElementById('endInnings');
  const finishMatchBtn = document.getElementById('finishMatch');
  const undoBtn = document.getElementById('undo');

  const liveSummary = document.getElementById('liveSummary');
  const bowlingTableBody = document.querySelector('#bowlingTable tbody');
  const commentary = document.getElementById('commentary');

  // live
  const liveMatchTitle = document.getElementById('liveMatchTitle');
  const liveScoreBig = document.getElementById('liveScoreBig');
  const liveOvers = document.getElementById('liveOvers');
  const liveMeta = document.getElementById('liveMeta');
  const liveStatus = document.getElementById('liveStatus');
  const battingTableBody = document.querySelector('#battingTable tbody');
  const recentEvents = document.getElementById('recentEvents');
  const pastMatches = document.getElementById('pastMatches');

  // export/import
  const exportBtn = document.getElementById('exportBtn');
  const importBtn = document.getElementById('importBtn');
  const fileInput = document.getElementById('fileInput');

  // --- Tab navigation
  tabs.forEach(t => t.addEventListener('click', ()=>{
    tabs.forEach(x=>x.classList.remove('active'));
    t.classList.add('active');
    panels.forEach(p=>p.classList.remove('active-panel'));
    const id = t.dataset.tab;
    document.getElementById(id).classList.add('active-panel');
    // when switching to live, re-render
    renderAll();
  }));

  // --- Initial render
  renderAll();

  // --- Event listeners (setup)
  addTeamBtn.addEventListener('click', ()=>{
    const name = teamName.value.trim();
    if(!name) return alert('Enter team name');
    state.teams.push({id: uid('team'), name});
    teamName.value = '';
    saveState();
  });

  addPlayerBtn.addEventListener('click', ()=>{
    const t = teamForPlayer.value;
    const name = playerName.value.trim();
    const role = playerRole.value;
    if(!t) return alert('Select team');
    if(!name) return alert('Player name required');
    state.players.push({id: uid('player'), name, teamId: t, role, stats:{runs:0,balls:0,fours:0,sixes:0,wickets:0}});
    playerName.value = '';
    saveState();
  });

  createMatchBtn.addEventListener('click', ()=>{
    const a = matchTeamA.value;
    const b = matchTeamB.value;
    if(!a || !b) return alert('Choose two teams');
    if(a===b) return alert('Teams must be different');
    const title = matchTitle.value.trim() || `${findTeam(a).name} vs ${findTeam(b).name}`;
    const m = {
      id: uid('match'),
      title,
      teamA: a, teamB: b,
      venue: venue.value.trim(),
      date: matchDate.value || '',
      overs: parseInt(oversPerInnings.value)||20,
      format: matchFormat.value,
      status: 'live',
      innings: [], // each innings: {id,battingTeam,overs,balls,runs,wickets,battingOrder,ballEvents,scoreboard,bowlingFigures}
      events: [],
      createdAt: Date.now()
    };
    // create first innings
    const battingOrder = state.players.filter(p=>p.teamId===a).slice(0,11).map(p=>p.id);
    const innings = newInnings(m.id, a, battingOrder);
    m.innings.push(innings);
    m.activeInningsId = innings.id;
    state.matches.push(m);
    state.activeMatchId = m.id;
    saveState();
  });

  // scorer handlers
  runButtons.forEach(btn=>{
    btn.addEventListener('click', ()=> {
      const r = parseInt(btn.dataset.run);
      handleRun(r);
    });
  });

  extrasButtons.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const kind = btn.dataset.extra; handleExtra(kind);
    });
  });

  recordWicketBtn.addEventListener('click', ()=>{
    handleWicket(wicketOutSelect.value, wicketType.value);
  });

  endInningsBtn.addEventListener('click', ()=>{
    if(!activeMatch()) return alert('No active match');
    const m = activeMatch(); const inn = currentInnings(m);
    if(!inn) return alert('No innings');
    inn.completed = true;
    // if second innings not created and match not finished, create next innings with other team
    if(m.innings.length===1){
      const nextBatting = (inn.battingTeam === m.teamA) ? m.teamB : m.teamA;
      const battingOrder = state.players.filter(p=>p.teamId===nextBatting).slice(0,11).map(p=>p.id);
      const newInn = newInnings(m.id, nextBatting, battingOrder);
      m.innings.push(newInn);
      m.activeInningsId = newInn.id;
      m.status = 'live';
    } else {
      // innings >1 -> match status update
      // if both innings completed -> finished
      if(m.innings.every(i=>i.completed)) m.status = 'complete';
    }
    saveState();
  });

  finishMatchBtn.addEventListener('click', ()=>{
    const m = activeMatch();
    if(!m) return alert('No active match');
    if(!confirm('Finish match and mark complete?')) return;
    m.status = 'complete';
    state.activeMatchId = null;
    saveState();
  });

  undoBtn.addEventListener('click', ()=>{
    const m = activeMatch();
    if(!m) return;
    const inn = currentInnings(m);
    if(!inn) return;
    const ev = inn.ballEvents.pop();
    if(!ev) return alert('No events to undo');
    // revert event
    revertEvent(m, inn, ev);
    saveState();
  });

  // export/import
  exportBtn.addEventListener('click', ()=>{
    const blob = new Blob([JSON.stringify(state, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'scoreboard_export.json'; a.click(); URL.revokeObjectURL(url);
  });

  importBtn.addEventListener('click', ()=> fileInput.click());
  fileInput.addEventListener('change', (e)=>{
    const f = e.target.files[0]; if(!f) return;
    const reader = new FileReader();
    reader.onload = ()=> {
      try{
        const obj = JSON.parse(reader.result);
        if(confirm('Replace current data with imported data?')) { state = obj; saveState(); }
      }catch(err){ alert('Invalid JSON'); }
    };
    reader.readAsText(f);
  });

  // --- Core functions: innings + events

  function newInnings(matchId, battingTeam, battingOrder=[]){
    return {
      id: uid('inn'),
      matchId,
      battingTeam,
      overs: 0,
      balls: 0,
      runs: 0,
      wickets: 0,
      battingOrder: battingOrder.slice(),
      nextBatsmanIdx: 2, // 0 and 1 are assumed openers when assigned
      striker: battingOrder[0] || null,
      nonStriker: battingOrder[1] || null,
      currentBowler: null,
      bowlingFigures: {}, // bowlerId -> {balls,runs,wickets,maidens}
      ballEvents: [],
      scoreboardSnap: [],
      completed: false
    };
  }

  function currentInnings(match){
    if(!match) return null;
    return match.innings.find(i=>i.id===match.activeInningsId) || match.innings[match.innings.length-1];
  }

  function handleRun(runs){
    const m = activeMatch(); if(!m) return alert('No active match');
    const inn = currentInnings(m); if(!inn) return alert('No innings');
    // require striker and bowler
    if(!inn.striker || !inn.currentBowler) return alert('Select striker and bowler in scoring panel');
    const event = {
      id: uid('ev'),
      type: 'run',
      runs,
      extra: 0,
      legal: true,
      batsman: inn.striker,
      bowler: inn.currentBowler,
      desc: `${findPlayer(inn.striker).name} to ${findPlayer(inn.currentBowler).name} — ${runs}`,
      time: Date.now()
    };
    applyEvent(m, inn, event);
  }

  function handleExtra(kind){
    const m = activeMatch(); if(!m) return alert('No active match');
    const inn = currentInnings(m); if(!inn) return alert('No innings');
    if(!inn.currentBowler) return alert('Select bowler first');
    if(kind === 'byes' || kind === 'legbyes') {
      const n = parseInt(prompt('Enter runs for byes/leg byes','1')||'0');
      if(isNaN(n) || n < 0) return;
      const event = {
        id: uid('ev'),
        type: 'extra',
        kind,
        runs: n,
        legal: true,
        batsman: null,
        bowler: inn.currentBowler,
        desc: `${n} ${kind}`,
        time: Date.now()
      };
      applyEvent(m, inn, event);
    } else if(kind === 'wide' || kind === 'noball') {
      // wide and noball: usually not a legal delivery (ball not counted). We add 1 run by default but allow prompt
      const n = parseInt(prompt('Enter runs for this extra (total, default 1)', '1') || '1');
      if(isNaN(n) || n < 0) return;
      const event = {
        id: uid('ev'),
        type: 'extra',
        kind,
        runs: n,
        legal: false, // ball not counted
        batsman: null,
        bowler: inn.currentBowler,
        desc: `${n} ${kind}`,
        time: Date.now()
      };
      applyEvent(m, inn, event);
    }
  }

  function handleWicket(outPlayerId, outType){
    const m = activeMatch(); if(!m) return alert('No active match');
    const inn = currentInnings(m); if(!inn) return alert('No innings');
    if(!outPlayerId) return alert('Select player out');
    const newBatsmanId = prompt('Enter new batsman ID (or choose from team players list): (leave blank to auto pick next)') || '';
    let incoming = newBatsmanId.trim() || null;
    if(!incoming){
      // auto pick next from battingOrder using nextBatsmanIdx
      incoming = inn.battingOrder[inn.nextBatsmanIdx] || null;
      inn.nextBatsmanIdx++;
    }
    const event = {
      id: uid('ev'),
      type: 'wicket',
      wicketType: outType,
      outPlayer: outPlayerId,
      incoming: incoming,
      legal: true,
      batsman: outPlayerId,
      bowler: inn.currentBowler,
      desc: `${findPlayer(outPlayerId).name} — ${outType}`,
      time: Date.now()
    };
    applyEvent(m, inn, event);
  }

  // Apply an event (run/extra/wicket) and update aggregates; push to ballEvents
  function applyEvent(match, inn, ev){
    // update ball counting: legal deliveries increment ball count
    if(ev.legal) {
      inn.balls += 1;
      if(inn.balls === 6) {
        inn.overs += 1;
        inn.balls = 0;
        // end of over: swap striker/non-striker
        const tmp = inn.striker; inn.striker = inn.nonStriker; inn.nonStriker = tmp;
      }
    }
    // apply based on type
    if(ev.type === 'run'){
      inn.runs += ev.runs;
      // update batsman stats
      const batsman = findPlayer(ev.batsman);
      if(batsman) {
        // mutate player stats in state
        const ps = state.players.find(p=>p.id===batsman.id);
        if(ps){
          ps.stats.runs += ev.runs;
          ps.stats.balls += ev.legal ? 1 : 0;
          if(ev.runs === 4) ps.stats.fours = (ps.stats.fours||0) + 1;
          if(ev.runs === 6) ps.stats.sixes = (ps.stats.sixes||0) + 1;
        }
      }
      // bowler figures
      registerBowlerEvent(inn, ev.bowler, ev.runs, 0, ev.legal);
      // strike rotation on odd runs
      if(ev.legal && (ev.runs % 2 === 1)) {
        const tmp = inn.striker; inn.striker = inn.nonStriker; inn.nonStriker = tmp;
      }
    } else if(ev.type === 'extra'){
      inn.runs += ev.runs;
      // extras do not add to batsman's stats (except on no-ball sometimes) - we keep simple
      registerBowlerEvent(inn, ev.bowler, ev.runs, 0, ev.legal);
    } else if(ev.type === 'wicket'){
      inn.wickets += 1;
      // add bowler wicket
      if(ev.bowler){
        registerBowlerEvent(inn, ev.bowler, 0, 1, ev.legal);
      }
      // mark batsman out (no complex dismissal bookkeeping: we just move striker if out is striker)
      if(inn.striker === ev.outPlayer){
        // incoming becomes striker
        if(ev.incoming){ inn.striker = ev.incoming; }
        else { inn.striker = null; }
      } else if(inn.nonStriker === ev.outPlayer){
        if(ev.incoming){ inn.nonStriker = ev.incoming; }
        else { inn.nonStriker = null; }
      }
      // increment batsman stats: count ball faced if legal
      const p = state.players.find(pp=>pp.id===ev.outPlayer);
      if(p && ev.legal) p.stats.balls = (p.stats.balls||0) + 1;
      // wicket credited to bowler already above
    }

    // store event
    inn.ballEvents.push(ev);

    // Save snapshot for scoreboard if needed
    inn.scoreboardSnap = {runs: inn.runs, wickets: inn.wickets, overs: inn.overs, balls: inn.balls};

    // if overs completed -> mark innings complete if overs limit hit
    if(inn.overs >= match.overs && inn.balls === 0){
      inn.completed = true;
      // auto create next innings if needed
      if(match.innings.length === 1){
        const nextBatting = (inn.battingTeam === match.teamA) ? match.teamB : match.teamA;
        const battingOrder = state.players.filter(p=>p.teamId===nextBatting).slice(0,11).map(p=>p.id);
        const newInn = newInnings(match.id, nextBatting, battingOrder);
        match.innings.push(newInn);
        match.activeInningsId = newInn.id;
      } else {
        if(match.innings.every(i=>i.completed)) match.status = 'complete';
      }
    }

    // push to match events for history
    match.events.push(ev);
    saveState();
  }

  // revert an event (undo)
  function revertEvent(match, inn, ev){
    // reverse counts
    // reverse ball counting
    if(ev.legal){
      // if balls is 0 and overs>0, roll back over
      if(inn.balls === 0 && inn.overs > 0){
        inn.overs -= 1;
        inn.balls = 5;
        // swap striker back since we swapped at over end
        const tmp = inn.striker; inn.striker = inn.nonStriker; inn.nonStriker = tmp;
      } else if(inn.balls > 0){
        inn.balls -= 1;
      }
    }
    if(ev.type === 'run'){
      inn.runs -= ev.runs;
      // update batsman stats
      const ps = state.players.find(p=>p.id===ev.batsman);
      if(ps){
        ps.stats.runs -= ev.runs;
        if(ev.legal) ps.stats.balls = Math.max(0, (ps.stats.balls||0) - 1);
        if(ev.runs === 4) ps.stats.fours = Math.max(0,(ps.stats.fours||0) -1);
        if(ev.runs === 6) ps.stats.sixes = Math.max(0,(ps.stats.sixes||0) -1);
      }
      // adjust bowler figures
      adjustBowlerOnRevert(inn, ev.bowler, ev.runs, 0, ev.legal);
      // reverse strike rotation if odd
      if(ev.legal && (ev.runs % 2 === 1)){
        const tmp = inn.striker; inn.striker = inn.nonStriker; inn.nonStriker = tmp;
      }
    } else if(ev.type === 'extra'){
      inn.runs -= ev.runs;
      adjustBowlerOnRevert(inn, ev.bowler, ev.runs, 0, ev.legal);
    } else if(ev.type === 'wicket'){
      inn.wickets = Math.max(0, inn.wickets - 1);
      adjustBowlerOnRevert(inn, ev.bowler, 0, 1, ev.legal);
      // restore out player to previous slot: if incoming was assigned earlier, try to revert
      // (simplify) push the out player back to striker if that makes sense
      if(ev.outPlayer){
        inn.striker = ev.outPlayer;
      }
      // reduce balls faced for out player if legal
      const p = state.players.find(pp=>pp.id===ev.outPlayer);
      if(p && ev.legal) p.stats.balls = Math.max(0, (p.stats.balls||0) - 1);
    }

    // also remove from match events
    match.events = match.events.filter(x=>x.id !== ev.id);
  }

  function registerBowlerEvent(inn, bowlerId, runs, wkts, legal) {
    if(!bowlerId) return;
    if(!inn.bowlingFigures[bowlerId]) inn.bowlingFigures[bowlerId] = {balls:0,runs:0,wickets:0,maidens:0};
    const b = inn.bowlingFigures[bowlerId];
    if(legal) {
      b.balls += 1;
      // check maidens: tough to compute here; skip maidens counting for simplicity
    }
    b.runs += runs;
    b.wickets += wkts;
    // assign currentBowler if not set
    inn.currentBowler = bowlerId;
  }

  function adjustBowlerOnRevert(inn, bowlerId, runs, wkts, legal) {
    if(!bowlerId) return;
    const b = inn.bowlingFigures[bowlerId];
    if(!b) return;
    if(legal) b.balls = Math.max(0, b.balls - 1);
    b.runs = Math.max(0, b.runs - runs);
    b.wickets = Math.max(0, b.wickets - wkts);
  }

  // --- UI rendering functions
  function renderAll(){
    populateTeamSelectors();
    renderTeamsList();
    renderMatchesList();
    renderActiveMatchPanel();
    renderScorerSelectors();
    renderLiveViews();
  }

  function populateTeamSelectors(){
    // multiple selects: teamForPlayer, matchTeamA, matchTeamB
    const sels = [teamForPlayer, matchTeamA, matchTeamB];
    sels.forEach(s => {
      const cur = s.value;
      s.innerHTML = '<option value="">-- select --</option>';
      state.teams.forEach(t => {
        const opt = document.createElement('option'); opt.value = t.id; opt.textContent = t.name;
        s.appendChild(opt);
      });
      s.value = cur;
    });
  }

  function renderTeamsList(){
    teamsList.innerHTML = '';
    state.teams.forEach(t=>{
      const div = document.createElement('div'); div.className = 'item';
      div.innerHTML = `<div><strong>${t.name}</strong><div class="muted">${state.players.filter(p=>p.teamId===t.id).length} players</div></div>
        <div>
          <button class="ghost btn-sm" data-team="${t.id}" data-act="view">View</button>
          <button class="ghost btn-sm" data-team="${t.id}" data-act="del">Delete</button>
        </div>`;
      teamsList.appendChild(div);
    });
    // attach actions
    teamsList.querySelectorAll('[data-act]').forEach(btn=>{
      btn.addEventListener('click', e=>{
        const teamId = btn.dataset.team;
        const act = btn.dataset.act;
        if(act === 'view'){
          const players = state.players.filter(p=>p.teamId===teamId);
          alert(`Players for ${findTeam(teamId).name}:\n` + players.map(p=>`${p.name} — ${p.role}`).join('\n'));
        } else if(act === 'del'){
          if(!confirm('Delete team and its players?')) return;
          state.players = state.players.filter(p=>p.teamId!==teamId);
          state.teams = state.teams.filter(t=>t.id!==teamId);
          saveState();
        }
      });
    });
  }

  function renderMatchesList(){
    matchesList.innerHTML = '';
    state.matches.slice().reverse().forEach(m=>{
      const a = findTeam(m.teamA).name, b = findTeam(m.teamB).name;
      const div = document.createElement('div'); div.className = 'item';
      div.innerHTML = `<div><strong>${m.title}</strong><div class="muted">${a} vs ${b} • ${m.venue||'—'} • ${m.date || ''}</div></div>
        <div>
          <button class="ghost" data-id="${m.id}" data-act="open">Open</button>
          <button class="ghost" data-id="${m.id}" data-act="end">${m.status==='complete'?'Remove':'Finish'}</button>
        </div>`;
      matchesList.appendChild(div);
    });
    matchesList.querySelectorAll('button').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const id = btn.dataset.id, act = btn.dataset.act;
        if(act==='open'){ state.activeMatchId = id; saveState(); tabs.forEach(t=>t.classList.remove('active')); document.querySelector('.tab[data-tab=\"scorer\"]').classList.add('active'); panels.forEach(p=>p.classList.remove('active-panel')); document.getElementById('scorer').classList.add('active-panel'); renderAll(); }
        if(act==='end'){
          const m = findMatch(id);
          if(!m) return;
          if(m.status === 'complete'){ if(confirm('Remove match from list?')){ state.matches = state.matches.filter(x=>x.id!==id); if(state.activeMatchId===id) state.activeMatchId=null; saveState(); } }
          else {
            if(confirm('Finish match?')){ m.status='complete'; state.activeMatchId = null; saveState(); }
          }
        }
      });
    });
  }

  function renderActiveMatchPanel(){
    const m = activeMatch();
    if(!m){ activeMatchInfo.textContent = 'No active match'; return; }
    activeMatchInfo.textContent = `${m.title} • ${findTeam(m.teamA).name} vs ${findTeam(m.teamB).name} • ${m.format} • Overs: ${m.overs}`;
    const inn = currentInnings(m);
    // show quick summary
    liveSummary.innerHTML = `Innings: ${findTeam(inn.battingTeam).name} — ${inn.runs}/${inn.wickets} (${inn.overs}.${inn.balls})`;
    // commentary
    commentary.innerHTML = '';
    (inn.ballEvents.slice().reverse()).forEach(ev=>{
      const d = document.createElement('div'); d.className='evt'; d.textContent = `${new Date(ev.time).toLocaleTimeString()} — ${ev.desc}`; commentary.appendChild(d);
    });
  }

  function renderScorerSelectors(){
    // Fill striker/non-striker/bowler select options using players of both teams
    [selectStriker, selectNonStriker, selectBowler, selectNextBowler, wicketOutSelect].forEach(s=>s.innerHTML = '<option value=\"\">--</option>');
    state.players.forEach(p=>{
      const tname = findTeam(p.teamId).name;
      const label = `${p.name} (${tname})`;
      [selectStriker, selectNonStriker, wicketOutSelect].forEach(s=> {
        const o = document.createElement('option'); o.value = p.id; o.textContent = label; s.appendChild(o);
      });
      // bowlers (any player allowed)
      const ob = document.createElement('option'); ob.value = p.id; ob.textContent = label; selectBowler.appendChild(ob);
      const on = ob.cloneNode(true); selectNextBowler.appendChild(on);
    });

    // if active innings exists, set selects to innings values
    const m = activeMatch();
    if(m){
      const inn = currentInnings(m);
      if(inn){
        if(inn.striker) selectStriker.value = inn.striker;
        if(inn.nonStriker) selectNonStriker.value = inn.nonStriker;
        if(inn.currentBowler) selectBowler.value = inn.currentBowler;
      }
    }

    // when user changes striker/non-striker selection, assign to innings instantly
    selectStriker.addEventListener('change', ()=>{ const m = activeMatch(); if(!m) return; const inn = currentInnings(m); inn.striker = selectStriker.value || null; saveState();});
    selectNonStriker.addEventListener('change', ()=>{ const m = activeMatch(); if(!m) return; const inn = currentInnings(m); inn.nonStriker = selectNonStriker.value || null; saveState();});
    selectBowler.addEventListener('change', ()=>{ const m = activeMatch(); if(!m) return; const inn = currentInnings(m); inn.currentBowler = selectBowler.value || null; saveState();});
    selectNextBowler.addEventListener('change', ()=>{/* no-op for now */});
  }

  function renderLiveViews(){
    const m = activeMatch();
    if(!m){
      liveMatchTitle.textContent = 'No match';
      liveScoreBig.textContent = '0/0';
      liveOvers.textContent = '0.0 overs • RR: 0.00';
      liveMeta.textContent = '—';
      liveStatus.textContent = 'Status: Idle';
    } else {
      const inn = currentInnings(m);
      liveMatchTitle.textContent = m.title;
      liveScoreBig.textContent = `${inn.runs}/${inn.wickets}`;
      const oversText = `${inn.overs}.${inn.balls}`;
      const oversFloat = inn.overs + inn.balls / 6;
      const rr = oversFloat > 0 ? (inn.runs / oversFloat) : 0;
      liveOvers.textContent = `${oversText} overs • RR: ${rr.toFixed(2)}`;
      liveMeta.textContent = `${findTeam(m.teamA).name} vs ${findTeam(m.teamB).name} • ${m.venue || '—'}`;
      liveStatus.textContent = `Status: ${m.status}`;

      // batting table for innings battingTeam
      const batPlayers = state.players.filter(p => p.teamId === inn.battingTeam);
      battingTableBody.innerHTML = '';
      // show battingOrder stats
      const order = inn.battingOrder || [];
      const shown = order.concat(batPlayers.map(p=>p.id)).filter((v,i,arr)=>arr.indexOf(v)===i);
      shown.forEach(pid=>{
        const p = findPlayer(pid);
        const tr = document.createElement('tr');
        const runs = p ? (p.stats.runs||0) : 0;
        const balls = p ? (p.stats.balls||0) : 0;
        const fours = p ? (p.stats.fours||0) : 0;
        const sixes = p ? (p.stats.sixes||0) : 0;
        const sr = balls>0 ? ((runs/balls)*100).toFixed(1) : '0.0';
        tr.innerHTML = `<td>${p.name}${(inn.striker===p.id? ' ▶':'')}${(inn.nonStriker===p.id? ' ◀':'')}</td><td>${runs}</td><td>${balls}</td><td>${fours}</td><td>${sixes}</td><td>${sr}</td>`;
        battingTableBody.appendChild(tr);
      });

      // bowling table
      bowlingTableBody.innerHTML = '';
      Object.keys(inn.bowlingFigures).forEach(bid=>{
        const b = inn.bowlingFigures[bid];
        const overs = Math.floor(b.balls/6) + '.' + (b.balls%6);
        const eco = (b.balls>0) ? ((b.runs / (b.balls/6)) || 0).toFixed(2) : '0.00';
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${findPlayer(bid).name}</td><td>${overs}</td><td>0</td><td>${b.runs}</td><td>${b.wickets}</td><td>${eco}</td>`;
        bowlingTableBody.appendChild(tr);
      });

      // recent events
      recentEvents.innerHTML = '';
      const evs = inn.ballEvents.slice().reverse().slice(0,30);
      evs.forEach(ev=>{
        const d = document.createElement('div'); d.className='evt'; d.textContent = `${ev.desc} ${ev.legal ? '' : '(extra)'} ${new Date(ev.time).toLocaleTimeString()}`;
        recentEvents.appendChild(d);
      });

      // past matches list
      pastMatches.innerHTML = '';
      state.matches.filter(mm=>mm.id!==m.id && mm.status==='complete').slice().reverse().forEach(mm=>{
        const div = document.createElement('div'); div.className = 'item';
        div.innerHTML = `<div><strong>${mm.title}</strong><div class='muted'>${findTeam(mm.teamA).name} vs ${findTeam(mm.teamB).name}</div></div>`;
        pastMatches.appendChild(div);
      });
    }

    // summary and commentary in scorer panel
    renderActiveMatchPanel();
  }

  // --- Utility: set current striker/nonStriker/bowler from selects (if user chooses)
  // also handle striker/non-striker change done earlier by event listeners in renderScorerSelectors

  // --- Start state filler for quick testing (only if no data)
  if(state.teams.length === 0 && state.players.length === 0 && state.matches.length === 0){
    // add sample teams & players for first use
    const t1 = {id: uid('team'), name: 'Alpha XI'};
    const t2 = {id: uid('team'), name: 'Beta CC'};
    state.teams.push(t1,t2);
    for(let i=1;i<=11;i++){
      state.players.push({id:uid('player'),name:`Alpha Player ${i}`,teamId:t1.id,role:'batsman',stats:{runs:0,balls:0,fours:0,sixes:0,wickets:0}});
      state.players.push({id:uid('player'),name:`Beta Player ${i}`,teamId:t2.id,role:'batsman',stats:{runs:0,balls:0,fours:0,sixes:0,wickets:0}});
    }
    saveState();
  }

  // --- utility: create initials and quick UI update
  function renderActiveMatchPanel(){
    const m = activeMatch();
    if(!m){ activeMatchInfo.textContent = 'No active match'; liveSummary.textContent = 'No match'; commentary.innerHTML=''; return; }
    const inn = currentInnings(m);
    activeMatchInfo.textContent = `${m.title} • ${findTeam(m.teamA).name} vs ${findTeam(m.teamB).name} • Overs: ${m.overs}`;
    liveSummary.textContent = `${findTeam(inn.battingTeam).name} — ${inn.runs}/${inn.wickets} (${inn.overs}.${inn.balls})`;
    // commentary listing
    commentary.innerHTML = '';
    inn.ballEvents.slice().reverse().forEach(ev=>{
      const d = document.createElement('div'); d.className='evt'; d.textContent = `${ev.desc} ${new Date(ev.time).toLocaleTimeString()}`; commentary.appendChild(d);
    });
  }

  // attach some dynamic behaviors: when user picks striker/ non-striker from selects -> update innings
  // (renderScorerSelectors already sets change handlers)

  // final render
  renderAll();

})();
