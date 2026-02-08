// ========================================
// LAS VEGAS GAMES - TEXAS HOLD'EM POKER
// No-Limit Hold'em vs AI Opponents
// ========================================

(function() {
  'use strict';

  const SUITS = ['♠','♥','♦','♣'];
  const RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
  const SUIT_COLORS = { '♠': 'black', '♥': 'red', '♦': 'red', '♣': 'black' };
  const RANK_VALUES = {};
  RANKS.forEach((r, i) => RANK_VALUES[r] = i + 2);

  const SMALL_BLIND = 5;
  const BIG_BLIND = 10;
  const NUM_OPPONENTS = 3;

  let deck = [];
  let communityCards = [];
  let pot = 0;
  let currentBet = 0;
  let stage = 'prestart'; // prestart, preflop, flop, turn, river, showdown
  let players = [];
  let dealerIdx = 0;
  let currentPlayerIdx = 0;
  let difficulty = 'normal';
  let lastRaiser = -1;
  let minRaise = BIG_BLIND;
  let buyIn = 500;
  let sessionActive = false;

  function createDeck() {
    const d = [];
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        d.push({ rank, suit });
      }
    }
    return shuffle(d);
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function drawCard() { return deck.pop(); }

  function renderCard(card, faceDown, small) {
    if (faceDown) {
      return `<div class="playing-card face-down ${small ? 'card-small' : ''}"><span class="card-rank"></span><span class="card-suit"></span></div>`;
    }
    const color = SUIT_COLORS[card.suit];
    const cls = small ? 'card-small' : '';
    return `<div class="playing-card card-${color} ${cls}">
      <span class="card-corner">${card.rank}<br>${card.suit}</span>
      <span class="card-rank">${card.rank}</span>
      <span class="card-suit">${card.suit}</span>
      <span class="card-corner-br">${card.rank}<br>${card.suit}</span>
    </div>`;
  }

  // --- Hand Evaluation ---
  function evaluateHand(holeCards, community) {
    const allCards = [...holeCards, ...community];
    if (allCards.length < 5) return { rank: 0, name: '', values: [] };

    const combos = getCombinations(allCards, 5);
    let best = { rank: 0, name: 'High Card', values: [] };

    for (const combo of combos) {
      const result = evaluate5(combo);
      if (result.rank > best.rank || (result.rank === best.rank && compareValues(result.values, best.values) > 0)) {
        best = result;
      }
    }
    return best;
  }

  function getCombinations(arr, k) {
    if (k === 0) return [[]];
    if (arr.length === 0) return [];
    const result = [];
    const [first, ...rest] = arr;
    for (const combo of getCombinations(rest, k - 1)) {
      result.push([first, ...combo]);
    }
    for (const combo of getCombinations(rest, k)) {
      result.push(combo);
    }
    return result;
  }

  function evaluate5(cards) {
    const values = cards.map(c => RANK_VALUES[c.rank]).sort((a, b) => b - a);
    const suits = cards.map(c => c.suit);
    const isFlush = suits.every(s => s === suits[0]);

    // Check for straight
    let isStraight = false;
    let straightHigh = 0;
    const uniqueVals = [...new Set(values)].sort((a, b) => b - a);
    if (uniqueVals.length >= 5) {
      for (let i = 0; i <= uniqueVals.length - 5; i++) {
        if (uniqueVals[i] - uniqueVals[i + 4] === 4) {
          isStraight = true;
          straightHigh = uniqueVals[i];
          break;
        }
      }
      // Wheel (A-2-3-4-5)
      if (!isStraight && uniqueVals.includes(14) && uniqueVals.includes(2) &&
          uniqueVals.includes(3) && uniqueVals.includes(4) && uniqueVals.includes(5)) {
        isStraight = true;
        straightHigh = 5;
      }
    }

    // Count ranks
    const counts = {};
    values.forEach(v => counts[v] = (counts[v] || 0) + 1);
    const groups = Object.entries(counts).map(([v, c]) => ({ val: parseInt(v), count: c }));
    groups.sort((a, b) => b.count - a.count || b.val - a.val);

    if (isFlush && isStraight && straightHigh === 14) {
      return { rank: 10, name: 'Royal Flush', values: [14] };
    }
    if (isFlush && isStraight) {
      return { rank: 9, name: 'Straight Flush', values: [straightHigh] };
    }
    if (groups[0].count === 4) {
      return { rank: 8, name: 'Four of a Kind', values: [groups[0].val, groups[1].val] };
    }
    if (groups[0].count === 3 && groups[1].count === 2) {
      return { rank: 7, name: 'Full House', values: [groups[0].val, groups[1].val] };
    }
    if (isFlush) {
      return { rank: 6, name: 'Flush', values };
    }
    if (isStraight) {
      return { rank: 5, name: 'Straight', values: [straightHigh] };
    }
    if (groups[0].count === 3) {
      return { rank: 4, name: 'Three of a Kind', values: [groups[0].val, ...groups.slice(1).map(g => g.val)] };
    }
    if (groups[0].count === 2 && groups[1].count === 2) {
      const pairs = groups.filter(g => g.count === 2).map(g => g.val).sort((a,b) => b-a);
      const kicker = groups.find(g => g.count === 1);
      return { rank: 3, name: 'Two Pair', values: [...pairs, kicker ? kicker.val : 0] };
    }
    if (groups[0].count === 2) {
      return { rank: 2, name: 'One Pair', values: [groups[0].val, ...groups.slice(1).map(g => g.val).sort((a,b) => b-a)] };
    }
    return { rank: 1, name: 'High Card', values };
  }

  function compareValues(a, b) {
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      if (a[i] !== b[i]) return a[i] - b[i];
    }
    return 0;
  }

  // --- AI Logic ---
  function aiDecision(player) {
    const hand = evaluateHand(player.cards, communityCards);
    const handStrength = hand.rank;
    const callAmount = currentBet - player.currentBet;
    const potOdds = callAmount > 0 ? callAmount / (pot + callAmount) : 0;

    let aggressiveness = 0.5;
    if (difficulty === 'easy') aggressiveness = 0.3;
    if (difficulty === 'hard') aggressiveness = 0.7;

    // Pre-flop strategy
    if (stage === 'preflop') {
      const c1 = RANK_VALUES[player.cards[0].rank];
      const c2 = RANK_VALUES[player.cards[1].rank];
      const high = Math.max(c1, c2);
      const suited = player.cards[0].suit === player.cards[1].suit;
      const pair = c1 === c2;

      let strength = 0;
      if (pair) strength = 0.5 + (high / 28);
      else if (high >= 12 && Math.min(c1,c2) >= 10) strength = 0.7;
      else if (high >= 13) strength = 0.5;
      else if (suited && high >= 10) strength = 0.4;
      else strength = high / 28;

      if (strength < 0.25 * (1 / aggressiveness)) {
        return { action: 'fold' };
      }
      if (callAmount === 0) {
        if (strength > 0.6 && Math.random() < aggressiveness) {
          return { action: 'raise', amount: BIG_BLIND * (2 + Math.floor(strength * 3)) };
        }
        return { action: 'check' };
      }
      if (strength > 0.5 && Math.random() < aggressiveness * 1.2) {
        return { action: 'raise', amount: callAmount * 2 + BIG_BLIND };
      }
      if (strength > 0.3 || callAmount <= BIG_BLIND * 2) {
        return { action: 'call' };
      }
      return { action: 'fold' };
    }

    // Post-flop strategy
    if (handStrength >= 7) {
      // Monster hand
      if (Math.random() < 0.3 * aggressiveness) {
        return { action: 'allin' };
      }
      return { action: 'raise', amount: Math.max(pot * 0.75, minRaise) };
    }
    if (handStrength >= 5) {
      if (callAmount === 0) {
        return Math.random() < aggressiveness ?
          { action: 'raise', amount: Math.max(Math.floor(pot * 0.5), minRaise) } :
          { action: 'check' };
      }
      return { action: 'call' };
    }
    if (handStrength >= 3) {
      if (callAmount === 0) {
        return Math.random() < aggressiveness * 0.5 ?
          { action: 'raise', amount: minRaise } :
          { action: 'check' };
      }
      if (callAmount <= pot * 0.3) return { action: 'call' };
      return Math.random() < 0.3 ? { action: 'call' } : { action: 'fold' };
    }
    if (handStrength >= 2) {
      if (callAmount === 0) return { action: 'check' };
      if (callAmount <= BIG_BLIND * 2) return { action: 'call' };
      return Math.random() < 0.15 * aggressiveness ? { action: 'call' } : { action: 'fold' };
    }

    // Bluff chance
    if (callAmount === 0) {
      if (Math.random() < 0.15 * aggressiveness) {
        return { action: 'raise', amount: Math.max(Math.floor(pot * 0.5), minRaise) };
      }
      return { action: 'check' };
    }
    if (Math.random() < 0.1 * aggressiveness) return { action: 'call' };
    return { action: 'fold' };
  }

  // --- Rendering ---
  function renderUI() {
    // Opponents
    for (let i = 0; i < NUM_OPPONENTS; i++) {
      const opp = players[i + 1];
      const el = document.getElementById('poker-opp-' + i);
      if (!opp) { el.style.display = 'none'; continue; }
      el.style.display = '';
      el.classList.toggle('folded', opp.folded);
      el.classList.toggle('active-turn', currentPlayerIdx === i + 1 && stage !== 'prestart' && stage !== 'showdown');

      const nameEl = el.querySelector('.seat-name');
      nameEl.innerHTML = opp.name + (dealerIdx === i + 1 ? ' <span class="poker-dealer-btn">D</span>' : '');

      const cardsEl = el.querySelector('.seat-cards');
      if (opp.folded || stage === 'prestart') {
        cardsEl.innerHTML = '';
      } else if (stage === 'showdown' && !opp.folded) {
        cardsEl.innerHTML = opp.cards.map(c => renderCard(c, false, true)).join('');
      } else if (opp.cards.length > 0) {
        cardsEl.innerHTML = opp.cards.map(() => renderCard(null, true, true)).join('');
      }

      el.querySelector('.seat-chips').textContent = '$' + opp.chips;
      el.querySelector('.seat-action').textContent = opp.lastAction || '';
    }

    // Community cards
    const commEl = document.getElementById('poker-community-cards');
    commEl.innerHTML = communityCards.map(c => renderCard(c, false)).join('');

    // Pot
    document.getElementById('poker-pot').textContent = pot;

    // Player
    const player = players[0];
    const playerCardsEl = document.getElementById('poker-player-cards');
    if (player.cards.length > 0 && !player.folded) {
      playerCardsEl.innerHTML = player.cards.map(c => renderCard(c, false)).join('');
    } else {
      playerCardsEl.innerHTML = '';
    }
    document.getElementById('poker-player-chips').textContent = player.chips;

    const playerSeat = document.getElementById('poker-player');
    playerSeat.classList.toggle('folded', player.folded);
    playerSeat.classList.toggle('active-turn', currentPlayerIdx === 0 && stage !== 'prestart' && stage !== 'showdown');

    const nameSeat = playerSeat.querySelector('.seat-name');
    nameSeat.innerHTML = 'You' + (dealerIdx === 0 ? ' <span class="poker-dealer-btn">D</span>' : '');

    // Hand rank
    const rankEl = document.getElementById('poker-hand-rank');
    if (player.cards.length >= 2 && communityCards.length >= 3 && !player.folded) {
      const eval_ = evaluateHand(player.cards, communityCards);
      rankEl.textContent = eval_.name;
    } else {
      rankEl.textContent = '';
    }

    // Controls
    const isPlayerTurn = currentPlayerIdx === 0 && stage !== 'prestart' && stage !== 'showdown';
    const callAmount = currentBet - player.currentBet;

    document.getElementById('poker-actions').classList.toggle('hidden', !isPlayerTurn);
    document.getElementById('poker-prestart').classList.toggle('hidden', stage !== 'prestart');
    document.getElementById('poker-result').classList.toggle('hidden', stage !== 'showdown');

    if (isPlayerTurn) {
      document.getElementById('poker-check').classList.toggle('hidden', callAmount > 0);
      document.getElementById('poker-call').classList.toggle('hidden', callAmount === 0);
      document.getElementById('poker-call-amount').textContent = Math.min(callAmount, player.chips);
      document.getElementById('poker-fold').disabled = false;

      const raiseSlider = document.getElementById('poker-raise-slider');
      raiseSlider.min = currentBet + minRaise;
      raiseSlider.max = player.chips + player.currentBet;
      raiseSlider.value = Math.min(currentBet + minRaise * 2, player.chips + player.currentBet);
    }
  }

  // --- Game Flow ---
  function initPlayers() {
    const playerBalance = window.VegasMain.getBalance();
    buyIn = Math.min(playerBalance, 500);
    // Deduct buy-in from global balance
    window.VegasMain.adjustBalance(-buyIn);
    window.VegasMain.updateBalanceDisplay();
    sessionActive = true;
    players = [
      { name: 'You', chips: buyIn, cards: [], folded: false, currentBet: 0, lastAction: '', isAI: false, allIn: false }
    ];
    for (let i = 0; i < NUM_OPPONENTS; i++) {
      players.push({
        name: ['Alice', 'Bob', 'Charlie'][i],
        chips: buyIn,
        cards: [],
        folded: false,
        currentBet: 0,
        lastAction: '',
        isAI: true,
        allIn: false
      });
    }
  }

  function startHand() {
    // Remove busted players or rebuy
    for (let i = 1; i < players.length; i++) {
      if (players[i].chips <= 0) {
        players[i].chips = buyIn; // AI rebuy
      }
    }
    if (players[0].chips <= 0) {
      document.getElementById('poker-result-text').textContent = 'You are out of chips!';
      document.getElementById('poker-result').classList.remove('hidden');
      document.getElementById('poker-prestart').classList.add('hidden');
      return;
    }

    deck = createDeck();
    communityCards = [];
    pot = 0;
    currentBet = 0;
    minRaise = BIG_BLIND;
    lastRaiser = -1;

    players.forEach(p => {
      p.cards = [];
      p.folded = false;
      p.currentBet = 0;
      p.lastAction = '';
      p.allIn = false;
    });

    dealerIdx = (dealerIdx + 1) % players.length;

    // Post blinds
    const sbIdx = (dealerIdx + 1) % players.length;
    const bbIdx = (dealerIdx + 2) % players.length;
    postBlind(sbIdx, SMALL_BLIND);
    postBlind(bbIdx, BIG_BLIND);
    currentBet = BIG_BLIND;

    // Deal hole cards
    players.forEach(p => {
      p.cards.push(drawCard(), drawCard());
    });

    stage = 'preflop';
    currentPlayerIdx = (bbIdx + 1) % players.length;
    lastRaiser = bbIdx;

    renderUI();
    VegasAudio.SFX.cardDeal();

    if (players[currentPlayerIdx].isAI) {
      setTimeout(processAI, 600);
    }
  }

  function postBlind(idx, amount) {
    const p = players[idx];
    const actual = Math.min(amount, p.chips);
    p.chips -= actual;
    p.currentBet = actual;
    pot += actual;
    p.lastAction = amount === SMALL_BLIND ? 'SB' : 'BB';
  }

  function nextPlayer() {
    const activePlayers = players.filter(p => !p.folded && !p.allIn);
    if (activePlayers.length <= 1) {
      // Everyone folded or all-in
      finishHand();
      return;
    }

    let next = (currentPlayerIdx + 1) % players.length;
    let loopCount = 0;
    while ((players[next].folded || players[next].allIn) && loopCount < players.length) {
      next = (next + 1) % players.length;
      loopCount++;
    }

    if (next === lastRaiser || loopCount >= players.length) {
      // Round complete
      nextStage();
      return;
    }

    // Check if all active players have matched the bet
    const allMatched = players.every(p =>
      p.folded || p.allIn || p.currentBet === currentBet
    );
    if (allMatched && next === lastRaiser) {
      nextStage();
      return;
    }

    currentPlayerIdx = next;
    renderUI();

    if (players[currentPlayerIdx].isAI) {
      setTimeout(processAI, 600 + Math.random() * 400);
    }
  }

  function processAI() {
    const player = players[currentPlayerIdx];
    if (player.folded || player.allIn) {
      nextPlayer();
      return;
    }

    const decision = aiDecision(player);
    executeAction(currentPlayerIdx, decision.action, decision.amount);
  }

  function executeAction(idx, action, amount) {
    const player = players[idx];
    const callAmount = currentBet - player.currentBet;

    switch (action) {
      case 'fold':
        player.folded = true;
        player.lastAction = 'Fold';
        VegasAudio.SFX.fold();
        break;
      case 'check':
        player.lastAction = 'Check';
        VegasAudio.SFX.check();
        if (lastRaiser === -1) lastRaiser = idx;
        break;
      case 'call': {
        const actualCall = Math.min(callAmount, player.chips);
        player.chips -= actualCall;
        player.currentBet += actualCall;
        pot += actualCall;
        if (player.chips === 0) player.allIn = true;
        player.lastAction = player.allIn ? 'All In' : 'Call';
        VegasAudio.SFX.chipPlace();
        break;
      }
      case 'raise': {
        const raiseTotal = Math.min(amount || currentBet + minRaise, player.chips + player.currentBet);
        const raiseCost = raiseTotal - player.currentBet;
        const actualRaise = Math.min(raiseCost, player.chips);
        player.chips -= actualRaise;
        player.currentBet += actualRaise;
        pot += actualRaise;
        minRaise = Math.max(minRaise, player.currentBet - currentBet);
        currentBet = player.currentBet;
        lastRaiser = idx;
        if (player.chips === 0) player.allIn = true;
        player.lastAction = player.allIn ? 'All In' : 'Raise $' + currentBet;
        VegasAudio.SFX.chipPlace();
        break;
      }
      case 'allin': {
        const allInAmount = player.chips;
        player.currentBet += allInAmount;
        pot += allInAmount;
        player.chips = 0;
        player.allIn = true;
        if (player.currentBet > currentBet) {
          minRaise = Math.max(minRaise, player.currentBet - currentBet);
          currentBet = player.currentBet;
          lastRaiser = idx;
        }
        player.lastAction = 'All In';
        VegasAudio.SFX.allIn();
        break;
      }
    }

    renderUI();
    nextPlayer();
  }

  function nextStage() {
    players.forEach(p => { p.currentBet = 0; p.lastAction = ''; });
    currentBet = 0;
    lastRaiser = -1;
    minRaise = BIG_BLIND;

    switch (stage) {
      case 'preflop':
        communityCards.push(drawCard(), drawCard(), drawCard());
        stage = 'flop';
        VegasAudio.SFX.cardFlip();
        break;
      case 'flop':
        communityCards.push(drawCard());
        stage = 'turn';
        VegasAudio.SFX.cardFlip();
        break;
      case 'turn':
        communityCards.push(drawCard());
        stage = 'river';
        VegasAudio.SFX.cardFlip();
        break;
      case 'river':
        finishHand();
        return;
    }

    // Find first active player after dealer
    currentPlayerIdx = (dealerIdx + 1) % players.length;
    let lc = 0;
    while ((players[currentPlayerIdx].folded || players[currentPlayerIdx].allIn) && lc < players.length) {
      currentPlayerIdx = (currentPlayerIdx + 1) % players.length;
      lc++;
    }

    const activePlayers = players.filter(p => !p.folded && !p.allIn);
    if (activePlayers.length <= 1) {
      // Skip to showdown if only one non-allin player
      if (stage !== 'river') {
        // Deal remaining community cards
        while (communityCards.length < 5) {
          communityCards.push(drawCard());
        }
      }
      finishHand();
      return;
    }

    lastRaiser = currentPlayerIdx;
    renderUI();

    if (players[currentPlayerIdx].isAI) {
      setTimeout(processAI, 600);
    }
  }

  function finishHand() {
    stage = 'showdown';

    // Deal remaining community cards if needed
    while (communityCards.length < 5) {
      communityCards.push(drawCard());
    }

    const activePlayers = players.filter(p => !p.folded);

    if (activePlayers.length === 1) {
      const winner = activePlayers[0];
      winner.chips += pot;
      winner.lastAction = 'WINS $' + pot;

      document.getElementById('poker-result-text').textContent =
        winner === players[0] ? 'You win $' + pot + '!' : winner.name + ' wins $' + pot;
      document.getElementById('poker-result-text').style.color =
        winner === players[0] ? '#d4af37' : '#ff6b6b';

      if (winner === players[0]) {
        VegasAudio.SFX.win();
      } else {
        VegasAudio.SFX.lose();
      }
    } else {
      // Evaluate hands
      let bestRank = -1;
      let winners = [];

      for (const p of activePlayers) {
        const eval_ = evaluateHand(p.cards, communityCards);
        p.handEval = eval_;
        p.lastAction = eval_.name;

        if (eval_.rank > bestRank) {
          bestRank = eval_.rank;
          winners = [p];
        } else if (eval_.rank === bestRank) {
          const cmp = compareValues(eval_.values, winners[0].handEval.values);
          if (cmp > 0) {
            winners = [p];
          } else if (cmp === 0) {
            winners.push(p);
          }
        }
      }

      const share = Math.floor(pot / winners.length);
      const remainder = pot - share * winners.length;
      winners.forEach((w, i) => {
        w.chips += share + (i === 0 ? remainder : 0);
        w.lastAction = 'WINS $' + (share + (i === 0 ? remainder : 0)) + ' - ' + w.handEval.name;
      });

      const playerWon = winners.includes(players[0]);
      document.getElementById('poker-result-text').textContent = playerWon
        ? 'You win $' + share + ' with ' + players[0].handEval.name + '!'
        : winners[0].name + ' wins with ' + winners[0].handEval.name;
      document.getElementById('poker-result-text').style.color = playerWon ? '#d4af37' : '#ff6b6b';

      if (playerWon) VegasAudio.SFX.win();
      else VegasAudio.SFX.lose();
    }

    pot = 0;
    renderUI();
  }

  // --- Player Actions ---
  function playerFold() { executeAction(0, 'fold'); }
  function playerCheck() { executeAction(0, 'check'); }
  function playerCall() { executeAction(0, 'call'); }
  function playerAllIn() { executeAction(0, 'allin'); }

  function playerRaise() {
    document.getElementById('poker-actions').classList.add('hidden');
    document.getElementById('poker-raise-controls').classList.remove('hidden');
  }

  function confirmRaise() {
    const amount = parseInt(document.getElementById('poker-raise-slider').value);
    document.getElementById('poker-raise-controls').classList.add('hidden');
    executeAction(0, 'raise', amount);
  }

  function cancelRaise() {
    document.getElementById('poker-raise-controls').classList.add('hidden');
    document.getElementById('poker-actions').classList.remove('hidden');
  }

  function init(settings) {
    difficulty = settings.pokerDifficulty || 'normal';
    stage = 'prestart';
    initPlayers();
    renderUI();

    document.getElementById('poker-start').onclick = startHand;
    document.getElementById('poker-fold').onclick = playerFold;
    document.getElementById('poker-check').onclick = playerCheck;
    document.getElementById('poker-call').onclick = playerCall;
    document.getElementById('poker-raise').onclick = playerRaise;
    document.getElementById('poker-allin').onclick = playerAllIn;
    document.getElementById('poker-raise-confirm').onclick = confirmRaise;
    document.getElementById('poker-raise-cancel').onclick = cancelRaise;
    document.getElementById('poker-next-hand').onclick = () => {
      stage = 'prestart';
      renderUI();
      startHand();
    };

    document.getElementById('poker-raise-slider').oninput = function() {
      document.getElementById('poker-raise-value').textContent = '$' + this.value;
    };
  }

  function cashOut() {
    if (sessionActive && players.length > 0) {
      // Return remaining chips to global balance
      window.VegasMain.adjustBalance(players[0].chips);
      window.VegasMain.updateBalanceDisplay();
      sessionActive = false;
    }
  }

  window.VegasPoker = { init, cashOut };
})();
