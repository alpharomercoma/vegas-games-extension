// ========================================
// LAS VEGAS GAMES - FACE UP PAI GOW POKER
// 53-card deck (standard + Joker)
// ========================================

(function() {
  'use strict';

  const SUITS = ['♠','♥','♦','♣'];
  const RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
  const RANK_VALUES = { '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,'J':11,'Q':12,'K':13,'A':14 };
  const SUIT_COLORS = { '♠':'black','♥':'red','♦':'red','♣':'black' };

  let deck = [];
  let playerCards = [];
  let dealerCards = [];
  let playerHigh = []; // 5-card hand
  let playerLow = [];  // 2-card hand
  let dealerHigh = [];
  let dealerLow = [];
  let bet = 0;
  let chipValue = 25;
  let gameState = 'betting'; // betting, setting, result
  let selectedCards = [];    // indices of cards selected for low hand

  function createDeck() {
    const d = [];
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        d.push({ rank, suit, isJoker: false });
      }
    }
    d.push({ rank: 'JOKER', suit: '★', isJoker: true });
    return shuffle(d);
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function drawCards(n) {
    if (deck.length < n + 10) deck = createDeck();
    const cards = [];
    for (let i = 0; i < n; i++) cards.push(deck.pop());
    return cards;
  }

  // --- Card Rendering ---
  function renderCard(card, small) {
    if (card.isJoker) {
      return `<div class="playing-card card-joker${small ? ' card-small' : ''} dealing">
        <span class="card-corner">★<br>J</span>
        <span class="card-rank">★</span>
        <span class="card-suit">JOKER</span>
        <span class="card-corner-br">★<br>J</span>
      </div>`;
    }
    const color = SUIT_COLORS[card.suit];
    return `<div class="playing-card card-${color}${small ? ' card-small' : ''} dealing">
      <span class="card-corner">${card.rank}<br>${card.suit}</span>
      <span class="card-rank">${card.rank}</span>
      <span class="card-suit">${card.suit}</span>
      <span class="card-corner-br">${card.rank}<br>${card.suit}</span>
    </div>`;
  }

  // --- Hand Evaluation ---
  // The Joker can be: Ace, or complete a straight, flush, or straight flush

  function getRankValue(rank) {
    return RANK_VALUES[rank] || 0;
  }

  function evaluateHand(hand) {
    if (hand.length === 2) return evaluate2Card(hand);
    if (hand.length === 5) return evaluate5Card(hand);
    return { rank: 0, name: 'Invalid', tiebreaker: [] };
  }

  function evaluate2Card(hand) {
    // Joker is always Ace in 2-card hand
    const vals = hand.map(c => c.isJoker ? 14 : getRankValue(c.rank)).sort((a, b) => b - a);
    const isPair = vals[0] === vals[1]; // Joker(14) + A(14) = pair, Joker(14) + 7(7) = not pair

    if (isPair) {
      const hasJoker = hand.some(c => c.isJoker);
      if (hasJoker) {
        return { rank: 1, name: 'Pair of Aces', tiebreaker: [14, 14] };
      }
      return { rank: 1, name: 'Pair of ' + hand[0].rank + 's', tiebreaker: [vals[0], vals[0]] };
    }
    return { rank: 0, name: 'High Card', tiebreaker: vals };
  }

  function evaluate5Card(hand) {
    // Resolve joker first
    const hasJoker = hand.some(c => c.isJoker);
    const nonJokerCards = hand.filter(c => !c.isJoker);

    // Get best possible hand considering joker substitution
    if (hasJoker) {
      return evaluateWithJoker(nonJokerCards);
    }

    return evaluateRegular(hand);
  }

  function evaluateRegular(cards) {
    const vals = cards.map(c => getRankValue(c.rank)).sort((a, b) => b - a);
    const suits = cards.map(c => c.suit);
    const isFlush = suits.every(s => s === suits[0]);
    const isStraight = checkStraight(vals);
    const isWheel = checkWheel(vals);

    const groups = groupByRank(vals);
    const sortedGroups = Object.entries(groups).sort((a, b) => b[1] - a[1] || parseInt(b[0]) - parseInt(a[0]));

    // Royal Flush
    if (isFlush && isStraight && vals[0] === 14) {
      return { rank: 9, name: 'Royal Flush', tiebreaker: vals };
    }
    // Straight Flush
    if (isFlush && (isStraight || isWheel)) {
      return { rank: 8, name: 'Straight Flush', tiebreaker: isWheel ? [5,4,3,2,1] : vals };
    }
    // Four of a Kind
    if (sortedGroups[0][1] === 4) {
      const quadVal = parseInt(sortedGroups[0][0]);
      const kicker = vals.find(v => v !== quadVal);
      return { rank: 7, name: 'Four of a Kind', tiebreaker: [quadVal, kicker] };
    }
    // Full House
    if (sortedGroups[0][1] === 3 && sortedGroups[1] && sortedGroups[1][1] === 2) {
      return { rank: 6, name: 'Full House', tiebreaker: [parseInt(sortedGroups[0][0]), parseInt(sortedGroups[1][0])] };
    }
    // Flush
    if (isFlush) {
      return { rank: 5, name: 'Flush', tiebreaker: vals };
    }
    // Straight
    if (isStraight || isWheel) {
      return { rank: 4, name: 'Straight', tiebreaker: isWheel ? [5,4,3,2,1] : vals };
    }
    // Three of a Kind
    if (sortedGroups[0][1] === 3) {
      const tripVal = parseInt(sortedGroups[0][0]);
      const kickers = vals.filter(v => v !== tripVal).sort((a,b) => b-a);
      return { rank: 3, name: 'Three of a Kind', tiebreaker: [tripVal, ...kickers] };
    }
    // Two Pair
    if (sortedGroups[0][1] === 2 && sortedGroups[1] && sortedGroups[1][1] === 2) {
      const p1 = parseInt(sortedGroups[0][0]);
      const p2 = parseInt(sortedGroups[1][0]);
      const high = Math.max(p1, p2);
      const low = Math.min(p1, p2);
      const kicker = vals.find(v => v !== p1 && v !== p2);
      return { rank: 2, name: 'Two Pair', tiebreaker: [high, low, kicker] };
    }
    // One Pair
    if (sortedGroups[0][1] === 2) {
      const pairVal = parseInt(sortedGroups[0][0]);
      const kickers = vals.filter(v => v !== pairVal).sort((a,b) => b-a);
      return { rank: 1, name: 'Pair', tiebreaker: [pairVal, ...kickers] };
    }
    // High Card
    return { rank: 0, name: 'High Card', tiebreaker: vals };
  }

  function evaluateWithJoker(nonJokerCards) {
    // Try joker as ace first, then try completing straights/flushes
    const suits = nonJokerCards.map(c => c.suit);
    const vals = nonJokerCards.map(c => getRankValue(c.rank)).sort((a, b) => b - a);

    // Check if joker can complete a flush
    const suitCounts = {};
    suits.forEach(s => suitCounts[s] = (suitCounts[s] || 0) + 1);
    const flushSuit = Object.entries(suitCounts).find(([s, c]) => c === 4);
    const canFlush = !!flushSuit;

    // Check if joker can complete a straight
    let bestStraightVal = findBestStraightFill(vals);

    // Check if joker can complete a straight flush
    if (canFlush) {
      const flushCards = nonJokerCards.filter(c => c.suit === flushSuit[0]);
      const flushVals = flushCards.map(c => getRankValue(c.rank)).sort((a,b) => b-a);
      const sfFill = findBestStraightFill(flushVals);
      if (sfFill > 0) {
        const allVals = [...flushVals, sfFill].sort((a,b) => b-a);
        if (allVals[0] === 14 && checkStraight(allVals)) {
          return { rank: 9, name: 'Royal Flush', tiebreaker: allVals };
        }
        return { rank: 8, name: 'Straight Flush', tiebreaker: allVals };
      }
    }

    // Try joker completing a flush (use ace as fill)
    if (canFlush) {
      const allVals = [...vals, 14].sort((a,b) => b-a);
      return { rank: 5, name: 'Flush', tiebreaker: allVals };
    }

    // Try joker completing a straight
    if (bestStraightVal > 0) {
      const allVals = [...vals, bestStraightVal].sort((a,b) => b-a);
      const isWheel = checkWheel(allVals);
      return { rank: 4, name: 'Straight', tiebreaker: isWheel ? [5,4,3,2,1] : allVals };
    }

    // Default: joker is ace
    const allVals = [...vals, 14].sort((a,b) => b-a);
    const groups = groupByRank(allVals);
    const sortedGroups = Object.entries(groups).sort((a, b) => b[1] - a[1] || parseInt(b[0]) - parseInt(a[0]));

    if (sortedGroups[0][1] === 4) {
      const quadVal = parseInt(sortedGroups[0][0]);
      const kicker = allVals.find(v => v !== quadVal);
      return { rank: 7, name: 'Four of a Kind', tiebreaker: [quadVal, kicker] };
    }
    if (sortedGroups[0][1] === 3 && sortedGroups[1] && sortedGroups[1][1] === 2) {
      return { rank: 6, name: 'Full House', tiebreaker: [parseInt(sortedGroups[0][0]), parseInt(sortedGroups[1][0])] };
    }
    if (sortedGroups[0][1] === 3) {
      const tripVal = parseInt(sortedGroups[0][0]);
      const kickers = allVals.filter(v => v !== tripVal).sort((a,b) => b-a);
      return { rank: 3, name: 'Three of a Kind', tiebreaker: [tripVal, ...kickers] };
    }
    if (sortedGroups[0][1] === 2 && sortedGroups[1] && sortedGroups[1][1] === 2) {
      const p1 = parseInt(sortedGroups[0][0]);
      const p2 = parseInt(sortedGroups[1][0]);
      const high = Math.max(p1, p2);
      const low = Math.min(p1, p2);
      const kicker = allVals.find(v => v !== p1 && v !== p2);
      return { rank: 2, name: 'Two Pair', tiebreaker: [high, low, kicker] };
    }
    if (sortedGroups[0][1] === 2) {
      const pairVal = parseInt(sortedGroups[0][0]);
      const kickers = allVals.filter(v => v !== pairVal).sort((a,b) => b-a);
      return { rank: 1, name: 'Pair', tiebreaker: [pairVal, ...kickers] };
    }
    return { rank: 0, name: 'High Card', tiebreaker: allVals };
  }

  function findBestStraightFill(vals) {
    // Given 4 cards, find value that makes a 5-card straight
    // Try each possible value 2-14
    for (let v = 14; v >= 2; v--) {
      const test = [...vals, v].sort((a,b) => b-a);
      if (test.length === 5 && (checkStraight(test) || checkWheel(test))) {
        if (!vals.includes(v)) return v;
      }
    }
    return 0;
  }

  function checkStraight(sorted) {
    if (sorted.length !== 5) return false;
    for (let i = 0; i < 4; i++) {
      if (sorted[i] - sorted[i+1] !== 1) return false;
    }
    return true;
  }

  function checkWheel(sorted) {
    // A-2-3-4-5 (ace low)
    if (sorted.length !== 5) return false;
    const s = [...sorted].sort((a,b) => a-b);
    return s[0] === 2 && s[1] === 3 && s[2] === 4 && s[3] === 5 && s[4] === 14;
  }

  function groupByRank(vals) {
    const groups = {};
    vals.forEach(v => groups[v] = (groups[v] || 0) + 1);
    return groups;
  }

  function compareHands(h1, h2) {
    // Returns positive if h1 wins, negative if h2 wins, 0 for tie
    const e1 = evaluateHand(h1);
    const e2 = evaluateHand(h2);
    if (e1.rank !== e2.rank) return e1.rank - e2.rank;
    for (let i = 0; i < Math.min(e1.tiebreaker.length, e2.tiebreaker.length); i++) {
      if (e1.tiebreaker[i] !== e2.tiebreaker[i]) return e1.tiebreaker[i] - e2.tiebreaker[i];
    }
    return 0;
  }

  // --- House Way (Dealer hand setting) ---
  function setHouseWay(cards) {
    // Generate all possible splits of 7 cards into 5-card high + 2-card low
    // Pick the split where the low hand is maximized, subject to high > low
    let bestHigh = null;
    let bestLow = null;
    let bestScore = -Infinity;

    const combos = getCombinations(7, 2); // indices for low hand
    for (const lowIdx of combos) {
      const low = lowIdx.map(i => cards[i]);
      const high = cards.filter((_, i) => !lowIdx.includes(i));

      const lowEval = evaluateHand(low);
      const highEval = evaluateHand(high);

      // High hand must beat low hand
      if (compareHands(high, low) <= 0) continue;

      // Score: prioritize strongest low hand, then strongest high hand
      const score = lowEval.rank * 10000 +
        lowEval.tiebreaker.reduce((s, v, i) => s + v * Math.pow(15, 4-i), 0) +
        highEval.rank * 0.01 +
        highEval.tiebreaker.reduce((s, v, i) => s + v * Math.pow(15, -(i+1)), 0) * 0.01;

      if (score > bestScore) {
        bestScore = score;
        bestHigh = high;
        bestLow = low;
      }
    }

    // Fallback: if no valid split found, put 2 lowest in low
    if (!bestHigh) {
      const sorted = [...cards].sort((a, b) => {
        const va = a.isJoker ? 14 : getRankValue(a.rank);
        const vb = b.isJoker ? 14 : getRankValue(b.rank);
        return va - vb;
      });
      bestLow = [sorted[0], sorted[1]];
      bestHigh = sorted.slice(2);
    }

    return { high: bestHigh, low: bestLow };
  }

  function getCombinations(n, k) {
    const result = [];
    function backtrack(start, combo) {
      if (combo.length === k) {
        result.push([...combo]);
        return;
      }
      for (let i = start; i < n; i++) {
        combo.push(i);
        backtrack(i + 1, combo);
        combo.pop();
      }
    }
    backtrack(0, []);
    return result;
  }

  // --- Game Flow ---
  function placeBet(amount) {
    if (gameState !== 'betting') return;
    const balance = window.VegasMain.getBalance();
    if (bet + amount > balance) return;
    bet += amount;
    updateBetDisplay();
    VegasAudio.SFX.chipPlace();
  }

  function clearBet() {
    bet = 0;
    updateBetDisplay();
  }

  function updateBetDisplay() {
    document.getElementById('pg-bet-amount').textContent = bet;
  }

  async function deal() {
    if (bet === 0) return;
    if (bet > window.VegasMain.getBalance()) return;

    window.VegasMain.adjustBalance(-bet);
    gameState = 'setting';

    deck = createDeck();
    playerCards = drawCards(7);
    dealerCards = drawCards(7);

    // Sort player cards by rank for display
    playerCards.sort((a, b) => {
      const va = a.isJoker ? 15 : getRankValue(a.rank);
      const vb = b.isJoker ? 15 : getRankValue(b.rank);
      return vb - va;
    });

    selectedCards = [];

    // Show dealer cards face up (Face Up Pai Gow!)
    const dealerSet = setHouseWay(dealerCards);
    dealerHigh = dealerSet.high;
    dealerLow = dealerSet.low;

    // Animate dealing
    document.getElementById('pg-dealer-high').innerHTML = '';
    document.getElementById('pg-dealer-low').innerHTML = '';
    document.getElementById('pg-player-cards').innerHTML = '';
    document.getElementById('pg-player-high').innerHTML = '';
    document.getElementById('pg-player-low').innerHTML = '';
    document.getElementById('pg-status').textContent = '';

    document.getElementById('pg-bet-controls').classList.add('hidden');
    document.getElementById('pg-set-controls').classList.remove('hidden');
    document.getElementById('pg-result-controls').classList.add('hidden');
    document.getElementById('pg-set-confirm').disabled = true;

    // Deal player cards one at a time
    for (let i = 0; i < 7; i++) {
      await delay(200);
      VegasAudio.SFX.cardDeal();
      renderPlayerCardsPartial(i + 1);
    }

    // Show dealer cards
    await delay(300);
    renderDealerHands();

    // Check ace-high push rule
    const dealerHighEval = evaluateHand(dealerHigh);
    if (dealerHighEval.rank === 0) {
      // Dealer's best hand is no-pair (high card)
      const hasAce = dealerHigh.some(c => c.rank === 'A' || c.isJoker);
      if (hasAce) {
        await delay(500);
        document.getElementById('pg-status').textContent = 'Dealer has Ace-High — Automatic Push!';
        document.getElementById('pg-status').style.color = '#aaa';
        window.VegasMain.adjustBalance(bet);
        window.VegasMain.updateBalanceDisplay();
        endHand();
        return;
      }
    }

    document.getElementById('pg-status').textContent = 'Select 2 cards for your LOW hand';
    document.getElementById('pg-status').style.color = '#f0d060';

    // Make player cards clickable
    setupCardSelection();
  }

  function setupCardSelection() {
    const container = document.getElementById('pg-player-cards');
    const cardEls = container.querySelectorAll('.playing-card');
    cardEls.forEach((el, i) => {
      el.style.cursor = 'pointer';
      el.onclick = () => toggleCardSelection(i);
    });
  }

  function toggleCardSelection(idx) {
    if (gameState !== 'setting') return;

    const pos = selectedCards.indexOf(idx);
    if (pos >= 0) {
      selectedCards.splice(pos, 1);
    } else if (selectedCards.length < 2) {
      selectedCards.push(idx);
    }

    renderPlayerCards();
    setupCardSelection();

    // Enable confirm when 2 cards selected
    const confirmBtn = document.getElementById('pg-set-confirm');
    confirmBtn.disabled = selectedCards.length !== 2;

    // Preview low and high hands
    if (selectedCards.length === 2) {
      const low = selectedCards.map(i => playerCards[i]);
      const high = playerCards.filter((_, i) => !selectedCards.includes(i));
      const lowEval = evaluateHand(low);
      const highEval = evaluateHand(high);

      document.getElementById('pg-player-high').innerHTML =
        '<div class="hand-label">HIGH: ' + highEval.name + '</div>' +
        '<div class="card-hand">' + high.map(c => renderCard(c, true)).join('') + '</div>';
      document.getElementById('pg-player-low').innerHTML =
        '<div class="hand-label">LOW: ' + lowEval.name + '</div>' +
        '<div class="card-hand">' + low.map(c => renderCard(c, true)).join('') + '</div>';
    } else {
      document.getElementById('pg-player-high').innerHTML = '';
      document.getElementById('pg-player-low').innerHTML = '';
    }
  }

  function renderPlayerCards() {
    renderPlayerCardsPartial(playerCards.length);
  }

  function renderPlayerCardsPartial(count) {
    const container = document.getElementById('pg-player-cards');
    container.innerHTML = playerCards.slice(0, count).map((card, i) => {
      const selected = selectedCards.includes(i);
      const html = renderCard(card, false);
      if (selected) {
        return html.replace('class="playing-card', 'class="playing-card pg-selected');
      }
      return html;
    }).join('');
  }

  function renderDealerHands() {
    document.getElementById('pg-dealer-high').innerHTML =
      '<div class="hand-label">DEALER HIGH: ' + evaluateHand(dealerHigh).name + '</div>' +
      '<div class="card-hand">' + dealerHigh.map(c => renderCard(c, true)).join('') + '</div>';
    document.getElementById('pg-dealer-low').innerHTML =
      '<div class="hand-label">DEALER LOW: ' + evaluateHand(dealerLow).name + '</div>' +
      '<div class="card-hand">' + dealerLow.map(c => renderCard(c, true)).join('') + '</div>';
  }

  function autoSet() {
    // Use house way to set player's hand
    const result = setHouseWay(playerCards);
    selectedCards = [];
    result.low.forEach(lowCard => {
      const idx = playerCards.findIndex((c, i) =>
        !selectedCards.includes(i) &&
        c.rank === lowCard.rank && c.suit === lowCard.suit && c.isJoker === lowCard.isJoker
      );
      if (idx >= 0) selectedCards.push(idx);
    });
    // Clear and re-toggle to trigger full UI update with preview
    const indices = [...selectedCards];
    selectedCards = [];
    indices.forEach(i => toggleCardSelection(i));
  }

  async function confirmSet() {
    if (selectedCards.length !== 2) return;

    playerLow = selectedCards.map(i => playerCards[i]);
    playerHigh = playerCards.filter((_, i) => !selectedCards.includes(i));

    // Validate: high hand must outrank low hand
    if (compareHands(playerHigh, playerLow) <= 0) {
      document.getElementById('pg-status').textContent = 'HIGH hand must outrank LOW hand! Re-arrange.';
      document.getElementById('pg-status').style.color = '#ff6b6b';
      return;
    }

    gameState = 'result';
    document.getElementById('pg-set-controls').classList.add('hidden');

    // Show final hands
    document.getElementById('pg-player-cards').innerHTML = '';
    document.getElementById('pg-player-high').innerHTML =
      '<div class="hand-label">YOUR HIGH: ' + evaluateHand(playerHigh).name + '</div>' +
      '<div class="card-hand">' + playerHigh.map(c => renderCard(c, false)).join('') + '</div>';
    document.getElementById('pg-player-low').innerHTML =
      '<div class="hand-label">YOUR LOW: ' + evaluateHand(playerLow).name + '</div>' +
      '<div class="card-hand">' + playerLow.map(c => renderCard(c, false)).join('') + '</div>';

    await delay(500);

    // Compare hands
    const highResult = compareHands(playerHigh, dealerHigh);
    const lowResult = compareHands(playerLow, dealerLow);

    // Ties go to dealer in standard rules
    const playerWinsHigh = highResult > 0;
    const playerWinsLow = lowResult > 0;

    const statusEl = document.getElementById('pg-status');

    if (playerWinsHigh && playerWinsLow) {
      // Player wins both - pays 1:1, no commission in Face Up
      const winAmount = bet * 2;
      window.VegasMain.adjustBalance(winAmount);
      statusEl.textContent = 'YOU WIN! +$' + bet;
      statusEl.style.color = '#f0d060';
      VegasAudio.SFX.win();
    } else if (!playerWinsHigh && !playerWinsLow) {
      // Dealer wins both
      statusEl.textContent = 'Dealer wins both hands';
      statusEl.style.color = '#ff6b6b';
      VegasAudio.SFX.lose();
    } else {
      // Push - one win each
      window.VegasMain.adjustBalance(bet);
      statusEl.textContent = 'PUSH — Split hands';
      statusEl.style.color = '#aaa';
      VegasAudio.SFX.push();
    }

    window.VegasMain.updateBalanceDisplay();
    endHand();
  }

  function endHand() {
    document.getElementById('pg-set-controls').classList.add('hidden');
    document.getElementById('pg-result-controls').classList.remove('hidden');
    document.getElementById('pg-bet-controls').classList.add('hidden');
  }

  function newHand() {
    gameState = 'betting';
    bet = 0;
    playerCards = [];
    dealerCards = [];
    playerHigh = [];
    playerLow = [];
    dealerHigh = [];
    dealerLow = [];
    selectedCards = [];

    document.getElementById('pg-dealer-high').innerHTML = '';
    document.getElementById('pg-dealer-low').innerHTML = '';
    document.getElementById('pg-player-cards').innerHTML = '';
    document.getElementById('pg-player-high').innerHTML = '';
    document.getElementById('pg-player-low').innerHTML = '';
    document.getElementById('pg-status').textContent = '';
    document.getElementById('pg-bet-controls').classList.remove('hidden');
    document.getElementById('pg-set-controls').classList.add('hidden');
    document.getElementById('pg-result-controls').classList.add('hidden');
    updateBetDisplay();
    window.VegasMain.updateBalanceDisplay();
  }

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function init(settings) {
    deck = createDeck();
    gameState = 'betting';
    bet = 0;
    selectedCards = [];
    playerCards = [];
    dealerCards = [];
    playerHigh = [];
    playerLow = [];
    dealerHigh = [];
    dealerLow = [];

    document.getElementById('pg-dealer-high').innerHTML = '';
    document.getElementById('pg-dealer-low').innerHTML = '';
    document.getElementById('pg-player-cards').innerHTML = '';
    document.getElementById('pg-player-high').innerHTML = '';
    document.getElementById('pg-player-low').innerHTML = '';
    document.getElementById('pg-status').textContent = '';
    document.getElementById('pg-bet-controls').classList.remove('hidden');
    document.getElementById('pg-set-controls').classList.add('hidden');
    document.getElementById('pg-result-controls').classList.add('hidden');

    // Chip buttons
    document.querySelectorAll('#screen-paigow .chip-btn').forEach(btn => {
      btn.onclick = () => {
        chipValue = parseInt(btn.dataset.value);
        placeBet(chipValue);
      };
    });

    document.getElementById('pg-clear').onclick = clearBet;
    document.getElementById('pg-deal').onclick = deal;
    document.getElementById('pg-set-confirm').onclick = confirmSet;
    document.getElementById('pg-auto-set').onclick = autoSet;
    document.getElementById('pg-new-hand').onclick = newHand;
    updateBetDisplay();
  }

  window.VegasPaiGow = { init };
})();
