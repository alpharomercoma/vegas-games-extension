// ========================================
// LAS VEGAS GAMES - SLOTS
// 5-Reel Video Slot Machine
// ========================================

(function() {
  'use strict';

  const SYMBOLS = [
    { id: 'seven',   emoji: '7️⃣',  name: '7',       weight: 2,  payout5: 500, payout4: 100, payout3: 25 },
    { id: 'diamond', emoji: '💎', name: 'Diamond', weight: 3,  payout5: 250, payout4: 50,  payout3: 15 },
    { id: 'bell',    emoji: '🔔', name: 'Bell',    weight: 5,  payout5: 100, payout4: 25,  payout3: 10 },
    { id: 'bar',     emoji: '🎰', name: 'BAR',     weight: 6,  payout5: 75,  payout4: 20,  payout3: 8 },
    { id: 'cherry',  emoji: '🍒', name: 'Cherry',  weight: 8,  payout5: 50,  payout4: 15,  payout3: 5 },
    { id: 'lemon',   emoji: '🍋', name: 'Lemon',   weight: 10, payout5: 25,  payout4: 10,  payout3: 3 },
    { id: 'orange',  emoji: '🍊', name: 'Orange',  weight: 10, payout5: 25,  payout4: 10,  payout3: 3 },
    { id: 'grape',   emoji: '🍇', name: 'Grape',   weight: 10, payout5: 20,  payout4: 8,   payout3: 2 },
    { id: 'melon',   emoji: '🍉', name: 'Melon',   weight: 8,  payout5: 30,  payout4: 12,  payout3: 4 },
    { id: 'star',    emoji: '⭐', name: 'Star',    weight: 4,  payout5: 150, payout4: 40,  payout3: 12 },
    { id: 'wild',    emoji: '🃏', name: 'WILD',    weight: 2,  payout5: 1000,payout4: 200, payout3: 50, isWild: true }
  ];

  const NUM_REELS = 5;
  const VISIBLE_ROWS = 3;
  const REEL_LENGTH = 30;
  const BET_LEVELS = [1, 2, 5, 10, 25, 50, 100];

  let reelStrips = [];
  let currentPositions = [0, 0, 0, 0, 0];
  let targetPositions = [0, 0, 0, 0, 0];
  let spinning = false;
  let bet = 1;
  let betIndex = 0;

  function buildWeightedPool() {
    const pool = [];
    for (const sym of SYMBOLS) {
      for (let i = 0; i < sym.weight; i++) {
        pool.push(sym);
      }
    }
    return pool;
  }

  function generateReelStrip() {
    const pool = buildWeightedPool();
    const strip = [];
    for (let i = 0; i < REEL_LENGTH; i++) {
      strip.push(pool[Math.floor(Math.random() * pool.length)]);
    }
    return strip;
  }

  function initReels() {
    reelStrips = [];
    for (let r = 0; r < NUM_REELS; r++) {
      reelStrips.push(generateReelStrip());
    }
    currentPositions = reelStrips.map(() => Math.floor(Math.random() * REEL_LENGTH));
  }

  function getVisibleSymbols(reelIdx, pos) {
    const strip = reelStrips[reelIdx];
    const symbols = [];
    for (let i = -1; i <= 1; i++) {
      const idx = ((pos + i) % REEL_LENGTH + REEL_LENGTH) % REEL_LENGTH;
      symbols.push(strip[idx]);
    }
    return symbols;
  }

  function renderReels() {
    for (let r = 0; r < NUM_REELS; r++) {
      const reelEl = document.getElementById('slots-reel-' + r);
      const stripEl = reelEl.querySelector('.reel-strip');
      const visible = getVisibleSymbols(r, currentPositions[r]);

      stripEl.innerHTML = visible.map(sym =>
        `<div class="reel-symbol">${sym.emoji}</div>`
      ).join('');
    }
  }

  function getMiddleRow() {
    // Return the middle symbol of each reel
    return currentPositions.map((pos, r) => {
      const strip = reelStrips[r];
      return strip[pos % REEL_LENGTH];
    });
  }

  function checkWin() {
    const middleRow = getMiddleRow();

    // Check for consecutive matching symbols from left to right (with wilds)
    const firstSymbol = middleRow[0];
    let matchCount = 1;
    let matchSymbol = firstSymbol;

    // If first is wild, we need to find the first non-wild to determine match
    if (firstSymbol.isWild) {
      for (let i = 1; i < NUM_REELS; i++) {
        if (!middleRow[i].isWild) {
          matchSymbol = middleRow[i];
          break;
        }
      }
      // All wilds
      if (matchSymbol.isWild) {
        return { symbol: SYMBOLS.find(s => s.isWild), count: 5 };
      }
    }

    for (let i = 1; i < NUM_REELS; i++) {
      if (middleRow[i].id === matchSymbol.id || middleRow[i].isWild) {
        matchCount++;
      } else {
        break;
      }
    }

    if (matchCount >= 3) {
      return { symbol: matchSymbol, count: matchCount };
    }

    return null;
  }

  function calculatePayout(result) {
    if (!result) return 0;
    const sym = result.symbol;
    switch (result.count) {
      case 5: return sym.payout5 * bet;
      case 4: return sym.payout4 * bet;
      case 3: return sym.payout3 * bet;
      default: return 0;
    }
  }

  async function spin() {
    if (spinning) return;
    if (bet > window.VegasMain.getBalance()) return;

    spinning = true;
    window.VegasMain.adjustBalance(-bet);
    window.VegasMain.updateBalanceDisplay();

    const spinBtn = document.getElementById('slots-spin');
    spinBtn.disabled = true;
    spinBtn.classList.add('spinning');
    document.getElementById('slots-win-display').textContent = '';
    document.getElementById('slots-win-display').classList.remove('big-win');

    VegasAudio.SFX.slotSpin();

    // Generate new positions for each reel
    targetPositions = reelStrips.map(() =>
      Math.floor(Math.random() * REEL_LENGTH)
    );

    // Animate each reel stopping sequentially
    for (let r = 0; r < NUM_REELS; r++) {
      const spinCycles = 8 + r * 4; // More spins for later reels
      const totalSteps = spinCycles + targetPositions[r];

      await animateReel(r, totalSteps);
      VegasAudio.SFX.slotStop();
      await delay(150);
    }

    currentPositions = [...targetPositions];

    // Check for wins
    const result = checkWin();
    const payout = calculatePayout(result);

    if (payout > 0) {
      window.VegasMain.adjustBalance(payout);
      const winEl = document.getElementById('slots-win-display');

      if (payout >= bet * 100) {
        winEl.textContent = '🎉 JACKPOT! +$' + payout + ' 🎉';
        winEl.classList.add('big-win');
        VegasAudio.SFX.slotJackpot();
      } else if (payout >= bet * 20) {
        winEl.textContent = '🌟 BIG WIN! +$' + payout + ' 🌟';
        winEl.classList.add('big-win');
        VegasAudio.SFX.bigWin();
      } else {
        winEl.textContent = 'WIN +$' + payout;
        VegasAudio.SFX.slotWin();
      }
    }

    window.VegasMain.updateBalanceDisplay();
    spinning = false;
    spinBtn.disabled = false;
    spinBtn.classList.remove('spinning');
  }

  function animateReel(reelIdx, totalSteps) {
    return new Promise(resolve => {
      let step = 0;
      function tick() {
        currentPositions[reelIdx] = (currentPositions[reelIdx] + 1) % REEL_LENGTH;
        renderReels();
        step++;
        if (step >= totalSteps) {
          currentPositions[reelIdx] = targetPositions[reelIdx];
          renderReels();
          resolve();
        } else {
          // Decelerate near the end: last 5 steps slow down progressively
          const remaining = totalSteps - step;
          const baseDelay = 50;
          const slowdown = remaining <= 5 ? (6 - remaining) * 30 : 0;
          setTimeout(tick, baseDelay + slowdown);
        }
      }
      tick();
    });
  }

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function updateBetDisplay() {
    document.getElementById('slots-bet').textContent = bet;
  }

  function renderPaytable() {
    const el = document.getElementById('slots-paytable');
    el.innerHTML = SYMBOLS.filter(s => !s.isWild).slice(0, 6).map(sym =>
      `<div class="paytable-entry">
        <span class="paytable-symbols">${sym.emoji}x5</span>
        <span class="paytable-payout">${sym.payout5}x</span>
      </div>
      <div class="paytable-entry">
        <span class="paytable-symbols">${sym.emoji}x3</span>
        <span class="paytable-payout">${sym.payout3}x</span>
      </div>`
    ).join('') + `<div class="paytable-entry">
      <span class="paytable-symbols">🃏 WILD</span>
      <span class="paytable-payout">Subs any</span>
    </div>`;
  }

  function init() {
    initReels();
    renderReels();
    updateBetDisplay();
    renderPaytable();
    document.getElementById('slots-win-display').textContent = '';

    document.getElementById('slots-spin').onclick = spin;

    document.getElementById('slots-bet-up').onclick = () => {
      betIndex = Math.min(betIndex + 1, BET_LEVELS.length - 1);
      bet = BET_LEVELS[betIndex];
      updateBetDisplay();
      VegasAudio.SFX.chipPlace();
    };

    document.getElementById('slots-bet-down').onclick = () => {
      betIndex = Math.max(betIndex - 1, 0);
      bet = BET_LEVELS[betIndex];
      updateBetDisplay();
      VegasAudio.SFX.chipPlace();
    };
  }

  window.VegasSlots = { init };
})();
