// ========================================
// LAS VEGAS GAMES - BLACKJACK
// Standard Las Vegas Blackjack Rules
// ========================================

(function() {
  'use strict';

  const SUITS = ['♠','♥','♦','♣'];
  const RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
  const SUIT_COLORS = { '♠': 'black', '♥': 'red', '♦': 'red', '♣': 'black' };

  let deck = [];
  let playerHands = [[]]; // support for splits
  let activeHandIdx = 0;
  let dealerHand = [];
  let bet = 0;
  let bets = [0]; // per hand bets for splits
  let splitFromAces = [false]; // track if hand was split from aces
  let numDecks = 6;
  let gameState = 'betting'; // betting, playing, dealer-turn, result

  function createDeck(n) {
    const d = [];
    for (let i = 0; i < n; i++) {
      for (const suit of SUITS) {
        for (const rank of RANKS) {
          d.push({ rank, suit });
        }
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

  function drawCard() {
    if (deck.length < 20) {
      deck = createDeck(numDecks);
    }
    return deck.pop();
  }

  function cardValue(card) {
    if (['J','Q','K'].includes(card.rank)) return 10;
    if (card.rank === 'A') return 11;
    return parseInt(card.rank);
  }

  function handValue(hand) {
    let total = 0;
    let aces = 0;
    for (const card of hand) {
      total += cardValue(card);
      if (card.rank === 'A') aces++;
    }
    while (total > 21 && aces > 0) {
      total -= 10;
      aces--;
    }
    return total;
  }

  function isSoft(hand) {
    let total = 0;
    let aces = 0;
    for (const card of hand) {
      total += cardValue(card);
      if (card.rank === 'A') aces++;
    }
    while (total > 21 && aces > 0) {
      total -= 10;
      aces--;
    }
    return aces > 0 && total <= 21;
  }

  function isBlackjack(hand) {
    return hand.length === 2 && handValue(hand) === 21;
  }

  function canSplit(hand) {
    return hand.length === 2 && cardValue(hand[0]) === cardValue(hand[1]) && playerHands.length < 4;
  }

  function canDouble(hand) {
    return hand.length === 2;
  }

  function renderCard(card, faceDown) {
    if (faceDown) {
      return '<div class="playing-card face-down dealing"><span class="card-rank"></span><span class="card-suit"></span></div>';
    }
    const color = SUIT_COLORS[card.suit];
    return `<div class="playing-card card-${color} dealing">
      <span class="card-corner">${card.rank}<br>${card.suit}</span>
      <span class="card-rank">${card.rank}</span>
      <span class="card-suit">${card.suit}</span>
      <span class="card-corner-br">${card.rank}<br>${card.suit}</span>
    </div>`;
  }

  function renderHand(hand, containerId, hideFirst) {
    const el = document.getElementById(containerId);
    el.innerHTML = hand.map((card, i) => renderCard(card, hideFirst && i === 0)).join('');
  }

  function renderAllPlayerHands() {
    const container = document.getElementById('bj-player-hand');
    if (playerHands.length <= 1) {
      renderHand(playerHands[0] || [], 'bj-player-hand');
      return;
    }
    container.innerHTML = playerHands.map((hand, idx) => {
      const isActive = idx === activeHandIdx && gameState === 'playing';
      const label = 'Hand ' + (idx + 1);
      const cards = hand.map(c => renderCard(c, false)).join('');
      const val = hand.length > 0 ? handValue(hand) : 0;
      const scoreText = hand.length > 0 ? '(' + val + ')' : '';
      return `<div class="split-hand ${isActive ? 'split-active' : ''}" style="border:1px solid ${isActive ? '#d4af37' : 'rgba(255,255,255,0.15)'};border-radius:6px;padding:4px;margin:2px;${isActive ? 'box-shadow:0 0 8px rgba(212,175,55,0.4);' : 'opacity:0.7;'}">
        <div style="font-size:9px;text-align:center;color:${isActive ? '#d4af37' : '#888'};margin-bottom:2px;">${label} ${scoreText}</div>
        <div style="display:flex;gap:2px;justify-content:center;">${cards}</div>
      </div>`;
    }).join('');
  }

  function updateScores() {
    const dScore = document.getElementById('bj-dealer-score');
    const pScore = document.getElementById('bj-player-score');
    const hand = playerHands[activeHandIdx];

    if (gameState === 'playing' || gameState === 'betting') {
      if (dealerHand.length > 0) {
        dScore.textContent = '(' + cardValue(dealerHand[1]) + ')';
      } else {
        dScore.textContent = '';
      }
    } else {
      dScore.textContent = dealerHand.length > 0 ? '(' + handValue(dealerHand) + ')' : '';
    }

    if (hand && hand.length > 0) {
      const val = handValue(hand);
      pScore.textContent = '(' + val + (isSoft(hand) ? ' soft' : '') + ')';
    } else {
      pScore.textContent = '';
    }
  }

  function showControls(state) {
    document.getElementById('bj-bet-controls').classList.toggle('hidden', state !== 'betting');
    document.getElementById('bj-play-controls').classList.toggle('hidden', state !== 'playing');
    document.getElementById('bj-result-controls').classList.toggle('hidden', state !== 'result');
  }

  function updatePlayButtons() {
    const hand = playerHands[activeHandIdx];
    const balance = window.VegasMain.getBalance();
    document.getElementById('bj-double').disabled = !canDouble(hand) || balance < bets[activeHandIdx];
    document.getElementById('bj-split').disabled = !canSplit(hand) || balance < bets[activeHandIdx];
  }

  function setStatus(text, cls) {
    const el = document.getElementById('bj-status');
    el.textContent = text;
    el.className = 'bj-status ' + (cls || '');
  }

  function deal() {
    const balance = window.VegasMain.getBalance();
    if (bet <= 0 || bet > balance) return;

    window.VegasMain.adjustBalance(-bet);
    bets = [bet];
    playerHands = [[]];
    activeHandIdx = 0;
    dealerHand = [];
    gameState = 'playing';
    setStatus('');

    deck = deck.length > 52 ? deck : createDeck(numDecks);

    // Deal cards with delays
    setTimeout(() => {
      playerHands[0].push(drawCard());
      renderHand(playerHands[0], 'bj-player-hand');
      VegasAudio.SFX.cardDeal();
    }, 100);

    setTimeout(() => {
      dealerHand.push(drawCard());
      renderHand(dealerHand, 'bj-dealer-hand', true);
      VegasAudio.SFX.cardDeal();
    }, 300);

    setTimeout(() => {
      playerHands[0].push(drawCard());
      renderHand(playerHands[0], 'bj-player-hand');
      VegasAudio.SFX.cardDeal();
    }, 500);

    setTimeout(() => {
      dealerHand.push(drawCard());
      renderHand(dealerHand, 'bj-dealer-hand', true);
      VegasAudio.SFX.cardDeal();
      updateScores();

      // Check for naturals
      if (isBlackjack(playerHands[0]) && isBlackjack(dealerHand)) {
        revealDealer();
        setStatus('Push - Both Blackjack!', 'push');
        window.VegasMain.adjustBalance(bet);
        VegasAudio.SFX.push();
        endRound();
        return;
      }
      if (isBlackjack(playerHands[0])) {
        revealDealer();
        const winAmount = Math.floor(bet * 2.5);
        setStatus('BLACKJACK! +$' + (winAmount - bet), 'blackjack');
        window.VegasMain.adjustBalance(winAmount);
        VegasAudio.SFX.blackjack();
        endRound();
        return;
      }
      if (isBlackjack(dealerHand)) {
        revealDealer();
        setStatus('Dealer Blackjack!', 'lose');
        VegasAudio.SFX.lose();
        endRound();
        return;
      }

      showControls('playing');
      updatePlayButtons();
    }, 700);

    showControls('');
  }

  function hit() {
    const hand = playerHands[activeHandIdx];
    hand.push(drawCard());
    if (playerHands.length > 1) renderAllPlayerHands();
    else renderHand(hand, 'bj-player-hand');
    updateScores();
    VegasAudio.SFX.cardDeal();

    if (handValue(hand) > 21) {
      setStatus('Bust! -$' + bets[activeHandIdx], 'lose');
      VegasAudio.SFX.bust();
      nextHand();
    } else if (handValue(hand) === 21) {
      stand();
    } else {
      updatePlayButtons();
    }
  }

  function stand() {
    nextHand();
  }

  function doubleDown() {
    const hand = playerHands[activeHandIdx];
    if (!canDouble(hand)) return;
    const extraBet = bets[activeHandIdx];
    if (window.VegasMain.getBalance() < extraBet) return;

    window.VegasMain.adjustBalance(-extraBet);
    bets[activeHandIdx] *= 2;
    document.getElementById('bj-bet-amount').textContent = bets.reduce((a,b) => a+b, 0);

    hand.push(drawCard());
    if (playerHands.length > 1) renderAllPlayerHands();
    else renderHand(hand, 'bj-player-hand');
    updateScores();
    VegasAudio.SFX.cardDeal();
    document.getElementById('bj-bet-amount').textContent = bets.reduce((a,b) => a+b, 0);

    if (handValue(hand) > 21) {
      setStatus('Bust! -$' + bets[activeHandIdx], 'lose');
      VegasAudio.SFX.bust();
    }
    nextHand();
  }

  function split() {
    const hand = playerHands[activeHandIdx];
    if (!canSplit(hand)) return;
    const extraBet = bets[activeHandIdx];
    if (window.VegasMain.getBalance() < extraBet) return;

    const isAces = hand[0].rank === 'A';

    window.VegasMain.adjustBalance(-extraBet);
    const card = hand.pop();
    const newHand = [card];
    bets.splice(activeHandIdx + 1, 0, extraBet);
    playerHands.splice(activeHandIdx + 1, 0, newHand);
    splitFromAces.splice(activeHandIdx + 1, 0, isAces);
    splitFromAces[activeHandIdx] = isAces;

    hand.push(drawCard());
    newHand.push(drawCard());
    VegasAudio.SFX.cardDeal();

    document.getElementById('bj-bet-amount').textContent = bets.reduce((a,b) => a+b, 0);
    renderAllPlayerHands();
    updateScores();

    // Split aces: each hand gets one card only, then auto-stand
    if (isAces) {
      // Move through all split-ace hands
      let allDone = true;
      for (let i = activeHandIdx; i < playerHands.length; i++) {
        if (splitFromAces[i] && playerHands[i].length === 2) {
          // Already dealt one card, auto-stand
        }
      }
      // Skip to dealer turn since split aces auto-stand
      dealerTurn();
      return;
    }

    updatePlayButtons();
  }

  function nextHand() {
    if (activeHandIdx < playerHands.length - 1) {
      activeHandIdx++;
      renderAllPlayerHands();
      updateScores();
      // If split from aces, auto-stand this hand too
      if (splitFromAces[activeHandIdx]) {
        nextHand();
        return;
      }
      updatePlayButtons();
      setStatus('Hand ' + (activeHandIdx + 1) + ' of ' + playerHands.length, '');
      return;
    }
    dealerTurn();
  }

  function revealDealer() {
    renderHand(dealerHand, 'bj-dealer-hand', false);
    updateScores();
  }

  function dealerTurn() {
    gameState = 'dealer-turn';
    showControls('');
    revealDealer();

    // Check if all player hands busted
    const allBusted = playerHands.every(h => handValue(h) > 21);
    if (allBusted) {
      resolveRound();
      return;
    }

    function dealerDraw() {
      if (handValue(dealerHand) < 17 || (handValue(dealerHand) === 17 && isSoft(dealerHand))) {
        setTimeout(() => {
          dealerHand.push(drawCard());
          renderHand(dealerHand, 'bj-dealer-hand', false);
          updateScores();
          VegasAudio.SFX.cardDeal();
          dealerDraw();
        }, 400);
      } else {
        resolveRound();
      }
    }
    dealerDraw();
  }

  function resolveRound() {
    gameState = 'result';
    const dealerVal = handValue(dealerHand);
    const dealerBust = dealerVal > 21;
    let totalWin = 0;
    let totalBet = 0;
    const results = [];

    for (let i = 0; i < playerHands.length; i++) {
      const pVal = handValue(playerHands[i]);
      const pBet = bets[i];
      totalBet += pBet;

      if (pVal > 21) {
        results.push('lose');
      } else if (dealerBust || pVal > dealerVal) {
        const win = pBet * 2;
        totalWin += win;
        results.push('win');
      } else if (pVal === dealerVal) {
        totalWin += pBet;
        results.push('push');
      } else {
        results.push('lose');
      }
    }

    window.VegasMain.adjustBalance(totalWin);

    const netResult = totalWin - totalBet;
    if (netResult > 0) {
      setStatus('You Win +$' + netResult + '!', 'win');
      VegasAudio.SFX.win();
    } else if (netResult === 0) {
      setStatus('Push', 'push');
      VegasAudio.SFX.push();
    } else {
      setStatus('You Lose -$' + Math.abs(netResult), 'lose');
      VegasAudio.SFX.lose();
    }

    endRound();
  }

  function endRound() {
    gameState = 'result';
    showControls('result');
    window.VegasMain.updateBalanceDisplay();
  }

  function resetBet() {
    bet = 0;
    document.getElementById('bj-bet-amount').textContent = '0';
  }

  function init(settings) {
    numDecks = settings.blackjackDecks || 6;
    deck = createDeck(numDecks);
    gameState = 'betting';
    bet = 0;
    playerHands = [[]];
    splitFromAces = [false];
    dealerHand = [];

    document.getElementById('bj-dealer-hand').innerHTML = '';
    document.getElementById('bj-player-hand').innerHTML = '';
    document.getElementById('bj-dealer-score').textContent = '';
    document.getElementById('bj-player-score').textContent = '';
    setStatus('');
    showControls('betting');
    resetBet();

    // Chip buttons
    document.querySelectorAll('#screen-blackjack .chip-btn').forEach(btn => {
      btn.onclick = () => {
        const val = parseInt(btn.dataset.value);
        if (bet + val <= window.VegasMain.getBalance()) {
          bet += val;
          document.getElementById('bj-bet-amount').textContent = bet;
          VegasAudio.SFX.chipPlace();
        }
      };
    });

    document.getElementById('bj-clear-bet').onclick = () => { resetBet(); };
    document.getElementById('bj-deal').onclick = deal;
    document.getElementById('bj-hit').onclick = hit;
    document.getElementById('bj-stand').onclick = stand;
    document.getElementById('bj-double').onclick = doubleDown;
    document.getElementById('bj-split').onclick = split;
    document.getElementById('bj-new-hand').onclick = () => {
      gameState = 'betting';
      playerHands = [[]];
      splitFromAces = [false];
      dealerHand = [];
      activeHandIdx = 0;
      document.getElementById('bj-dealer-hand').innerHTML = '';
      document.getElementById('bj-player-hand').innerHTML = '';
      document.getElementById('bj-dealer-score').textContent = '';
      document.getElementById('bj-player-score').textContent = '';
      setStatus('');
      showControls('betting');
      resetBet();
    };
  }

  window.VegasBlackjack = { init };
})();
