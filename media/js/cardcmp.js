// ========================================
// LAS VEGAS GAMES - BACCARAT
// Standard Punto Banco Rules
// ========================================

(function() {
  'use strict';

  const SUITS = ['♠','♥','♦','♣'];
  const RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
  const SUIT_COLORS = { '♠': 'black', '♥': 'red', '♦': 'red', '♣': 'black' };

  let deck = [];
  let playerHand = [];
  let bankerHand = [];
  let bets = { player: 0, banker: 0, tie: 0 };
  let selectedZone = 'player';
  let gameState = 'betting'; // betting, dealing, result
  let history = [];

  function createShoe() {
    const d = [];
    for (let s = 0; s < 8; s++) {
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
    if (deck.length < 20) deck = createShoe();
    return deck.pop();
  }

  function cardValue(card) {
    if (['10','J','Q','K'].includes(card.rank)) return 0;
    if (card.rank === 'A') return 1;
    return parseInt(card.rank);
  }

  function handTotal(hand) {
    return hand.reduce((sum, c) => sum + cardValue(c), 0) % 10;
  }

  function renderCard(card) {
    const color = SUIT_COLORS[card.suit];
    return `<div class="playing-card card-${color} dealing">
      <span class="card-corner">${card.rank}<br>${card.suit}</span>
      <span class="card-rank">${card.rank}</span>
      <span class="card-suit">${card.suit}</span>
      <span class="card-corner-br">${card.rank}<br>${card.suit}</span>
    </div>`;
  }

  function renderHand(hand, containerId) {
    document.getElementById(containerId).innerHTML = hand.map(c => renderCard(c)).join('');
  }

  function updateScores() {
    document.getElementById('bacc-player-score').textContent =
      playerHand.length > 0 ? '= ' + handTotal(playerHand) : '';
    document.getElementById('bacc-banker-score').textContent =
      bankerHand.length > 0 ? '= ' + handTotal(bankerHand) : '';
  }

  function updateBetDisplay() {
    document.getElementById('bacc-player-bet').textContent = '$' + bets.player;
    document.getElementById('bacc-banker-bet').textContent = '$' + bets.banker;
    document.getElementById('bacc-tie-bet').textContent = '$' + bets.tie;
  }

  function renderHistory() {
    const el = document.getElementById('bacc-history');
    el.innerHTML = history.slice(-20).map(r => {
      const cls = r === 'B' ? 'banker' : r === 'P' ? 'player' : 'tie';
      return `<span class="history-dot ${cls}">${r}</span>`;
    }).join('');
  }

  function totalBet() {
    return bets.player + bets.banker + bets.tie;
  }

  async function deal() {
    if (totalBet() === 0) return;
    if (totalBet() > window.VegasMain.getBalance()) return;

    window.VegasMain.adjustBalance(-totalBet());
    gameState = 'dealing';

    document.getElementById('bacc-bet-zones').style.pointerEvents = 'none';
    document.getElementById('bacc-deal').disabled = true;
    document.getElementById('bacc-clear').disabled = true;

    playerHand = [];
    bankerHand = [];
    document.getElementById('bacc-player-hand').innerHTML = '';
    document.getElementById('bacc-banker-hand').innerHTML = '';
    document.getElementById('bacc-status').textContent = '';

    // Deal initial 4 cards
    await delay(300);
    playerHand.push(drawCard());
    renderHand(playerHand, 'bacc-player-hand');
    updateScores();
    VegasAudio.SFX.cardDeal();

    await delay(300);
    bankerHand.push(drawCard());
    renderHand(bankerHand, 'bacc-banker-hand');
    updateScores();
    VegasAudio.SFX.cardDeal();

    await delay(300);
    playerHand.push(drawCard());
    renderHand(playerHand, 'bacc-player-hand');
    updateScores();
    VegasAudio.SFX.cardDeal();

    await delay(300);
    bankerHand.push(drawCard());
    renderHand(bankerHand, 'bacc-banker-hand');
    updateScores();
    VegasAudio.SFX.cardDeal();

    const pTotal = handTotal(playerHand);
    const bTotal = handTotal(bankerHand);

    // Natural check (8 or 9)
    if (pTotal >= 8 || bTotal >= 8) {
      await delay(400);
      resolve();
      return;
    }

    // Player third card rule
    let playerThirdCard = null;
    if (pTotal <= 5) {
      await delay(400);
      playerThirdCard = drawCard();
      playerHand.push(playerThirdCard);
      renderHand(playerHand, 'bacc-player-hand');
      updateScores();
      VegasAudio.SFX.cardDeal();
    }

    // Banker third card rule (Tableau)
    let bankerDraws = false;
    if (playerThirdCard === null) {
      // Player stood, banker draws on 0-5
      bankerDraws = bTotal <= 5;
    } else {
      const pThirdVal = cardValue(playerThirdCard);
      if (bTotal <= 2) {
        bankerDraws = true;
      } else if (bTotal === 3) {
        bankerDraws = pThirdVal !== 8;
      } else if (bTotal === 4) {
        bankerDraws = pThirdVal >= 2 && pThirdVal <= 7;
      } else if (bTotal === 5) {
        bankerDraws = pThirdVal >= 4 && pThirdVal <= 7;
      } else if (bTotal === 6) {
        bankerDraws = pThirdVal === 6 || pThirdVal === 7;
      }
      // bTotal === 7: banker stands
    }

    if (bankerDraws) {
      await delay(400);
      bankerHand.push(drawCard());
      renderHand(bankerHand, 'bacc-banker-hand');
      updateScores();
      VegasAudio.SFX.cardDeal();
    }

    await delay(500);
    resolve();
  }

  function resolve() {
    gameState = 'result';
    const pTotal = handTotal(playerHand);
    const bTotal = handTotal(bankerHand);

    let result;
    let winAmount = 0;
    const statusEl = document.getElementById('bacc-status');

    if (pTotal > bTotal) {
      result = 'P';
      winAmount += bets.player * 2;
      statusEl.textContent = 'PLAYER WINS! ' + pTotal + ' vs ' + bTotal;
    } else if (bTotal > pTotal) {
      result = 'B';
      // Banker pays 0.95:1 (5% commission)
      winAmount += bets.banker * 2 - Math.ceil(bets.banker * 0.05);
      statusEl.textContent = 'BANKER WINS! ' + bTotal + ' vs ' + pTotal;
    } else {
      result = 'T';
      winAmount += bets.tie * 9; // 8:1 payout + original bet
      winAmount += bets.player; // push
      winAmount += bets.banker; // push
      statusEl.textContent = 'TIE! ' + pTotal + ' - ' + bTotal;
    }

    // Return non-tie bets on ties (push)
    if (result === 'T') {
      // Already handled above
    }

    if (winAmount > 0) {
      window.VegasMain.adjustBalance(winAmount);
      statusEl.textContent += ' +$' + (winAmount - totalBet());
      VegasAudio.SFX.win();
    } else {
      VegasAudio.SFX.lose();
    }

    history.push(result);
    renderHistory();
    window.VegasMain.updateBalanceDisplay();

    document.getElementById('bacc-result-controls').classList.remove('hidden');
    document.getElementById('bacc-deal').disabled = true;
  }

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function newHand() {
    gameState = 'betting';
    bets = { player: 0, banker: 0, tie: 0 };
    playerHand = [];
    bankerHand = [];
    document.getElementById('bacc-player-hand').innerHTML = '';
    document.getElementById('bacc-banker-hand').innerHTML = '';
    document.getElementById('bacc-status').textContent = '';
    document.getElementById('bacc-player-score').textContent = '';
    document.getElementById('bacc-banker-score').textContent = '';
    document.getElementById('bacc-result-controls').classList.add('hidden');
    document.getElementById('bacc-bet-zones').style.pointerEvents = '';
    document.getElementById('bacc-deal').disabled = false;
    document.getElementById('bacc-clear').disabled = false;
    updateBetDisplay();
  }

  function init() {
    deck = createShoe();
    gameState = 'betting';
    history = [];
    bets = { player: 0, banker: 0, tie: 0 };
    selectedZone = 'player';
    renderHistory();
    updateBetDisplay();

    document.getElementById('bacc-player-hand').innerHTML = '';
    document.getElementById('bacc-banker-hand').innerHTML = '';
    document.getElementById('bacc-status').textContent = '';
    document.getElementById('bacc-result-controls').classList.add('hidden');

    // Zone selection
    document.querySelectorAll('.bacc-zone').forEach(zone => {
      zone.onclick = () => {
        selectedZone = zone.dataset.bet;
        document.querySelectorAll('.bacc-zone').forEach(z => z.classList.remove('selected'));
        zone.classList.add('selected');
      };
    });
    document.querySelector('.bacc-zone[data-bet="player"]').classList.add('selected');

    // Chip buttons
    document.querySelectorAll('#screen-baccarat .chip-btn').forEach(btn => {
      btn.onclick = () => {
        if (gameState !== 'betting') return;
        const val = parseInt(btn.dataset.value);
        if (totalBet() + val <= window.VegasMain.getBalance()) {
          bets[selectedZone] += val;
          updateBetDisplay();
          VegasAudio.SFX.chipPlace();
        }
      };
    });

    document.getElementById('bacc-clear').onclick = () => {
      bets = { player: 0, banker: 0, tie: 0 };
      updateBetDisplay();
    };

    document.getElementById('bacc-deal').onclick = deal;
    document.getElementById('bacc-new-hand').onclick = newHand;
  }

  window.VegasBaccarat = { init };
})();
