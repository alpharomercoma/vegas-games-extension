// ========================================
// LAS VEGAS GAMES - ROULETTE
// European & American Roulette
// ========================================

(function() {
  'use strict';

  const RED_NUMBERS = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];

  let rouletteType = 'european';
  let bets = {}; // { betKey: amount }
  let lastBets = {}; // for repeat bet
  let chipValue = 5;
  let spinning = false;
  let history = [];
  let lastWinNumber = null;

  function getNumbers() {
    if (rouletteType === 'american') {
      return [0, 37, ...Array.from({length: 36}, (_, i) => i + 1)]; // 37 = 00
    }
    return [0, ...Array.from({length: 36}, (_, i) => i + 1)];
  }

  function isRed(n) {
    return RED_NUMBERS.includes(n);
  }

  function getColor(n) {
    if (n === 0 || n === 37) return 'green';
    return isRed(n) ? 'red' : 'black';
  }

  function displayNumber(n) {
    if (n === 37) return '00';
    return String(n);
  }

  function totalBet() {
    return Object.values(bets).reduce((a, b) => a + b, 0);
  }

  // --- Board Rendering ---
  function renderBoard() {
    const board = document.getElementById('roulette-board');
    board.innerHTML = '';
    const isAmerican = rouletteType === 'american';

    // Zero(s)
    const zeroCell = createCell('0', 'rb-green rb-zero', 'straight_0');
    board.appendChild(zeroCell);

    if (isAmerican) {
      // In American roulette, we need a different layout
      // For simplicity, show 00 as a separate cell
    }

    // Number grid: 3 rows x 12 columns
    // Numbers go: 1,2,3 in first column; 4,5,6 in second; etc.
    // Row 1 (top): 3,6,9,...,36
    // Row 2 (mid): 2,5,8,...,35
    // Row 3 (bot): 1,4,7,...,34

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 12; col++) {
        const num = col * 3 + (3 - row);
        const color = getColor(num);
        const cls = color === 'red' ? 'rb-red' : (color === 'black' ? 'rb-black' : 'rb-green');
        const cell = createCell(String(num), cls, 'straight_' + num);
        board.appendChild(cell);
      }
    }

    // Add 00 for American (below the zero)
    if (isAmerican) {
      const ooCell = createCell('00', 'rb-green', 'straight_37');
      board.appendChild(ooCell);
    }

    // Column bets
    const colLabels = ['2:1', '2:1', '2:1'];
    for (let i = 0; i < 3; i++) {
      const cell = createCell(colLabels[i], 'rb-outside rb-col', 'column_' + (3 - i));
      board.appendChild(cell);
    }

    // Outside bets row 1: 1st 12, 2nd 12, 3rd 12
    const dozens = [
      { label: '1st 12', key: 'dozen_1' },
      { label: '2nd 12', key: 'dozen_2' },
      { label: '3rd 12', key: 'dozen_3' }
    ];
    for (const d of dozens) {
      const cell = createCell(d.label, 'rb-outside rb-wide', d.key);
      board.appendChild(cell);
    }

    // Outside bets row 2
    const outsides = [
      { label: '1-18', key: 'low' },
      { label: 'EVEN', key: 'even' },
      { label: 'RED', key: 'red', cls: 'rb-red' },
      { label: 'BLK', key: 'black', cls: 'rb-black' },
      { label: 'ODD', key: 'odd' },
      { label: '19-36', key: 'high' }
    ];
    for (const o of outsides) {
      const colSpan = 'grid-column: span 2';
      const cell = createCell(o.label, 'rb-outside ' + (o.cls || ''), o.key);
      cell.style.cssText = colSpan;
      board.appendChild(cell);
    }

    // Fix grid to handle the zero spanning
    board.style.gridTemplateColumns = `minmax(20px, 0.7fr) repeat(12, 1fr) auto`;
    board.style.gridTemplateRows = 'repeat(3, 1fr) auto auto';

    // Position zero to span 3 rows
    const zeroEl = board.querySelector('[data-bet="straight_0"]');
    if (zeroEl) {
      zeroEl.style.gridRow = '1 / 4';
      zeroEl.style.gridColumn = '1';
    }

    // Position number cells in grid
    const numberCells = board.querySelectorAll('[data-bet^="straight_"]');
    numberCells.forEach(cell => {
      const key = cell.dataset.bet;
      if (key === 'straight_0' || key === 'straight_37') return;
      const num = parseInt(key.split('_')[1]);
      const col = Math.floor((num - 1) / 3) + 2;
      const row = 3 - ((num - 1) % 3);
      cell.style.gridRow = String(row);
      cell.style.gridColumn = String(col);
    });

    // Position column bets
    const colCells = board.querySelectorAll('[data-bet^="column_"]');
    colCells.forEach((cell, i) => {
      cell.style.gridRow = String(i + 1);
      cell.style.gridColumn = '14';
    });

    // Position dozen bets
    const dozenCells = board.querySelectorAll('[data-bet^="dozen_"]');
    dozenCells.forEach((cell, i) => {
      cell.style.gridRow = '4';
      cell.style.gridColumn = `${2 + i * 4} / ${6 + i * 4}`;
    });

    // Position outside bets
    const outsideBetKeys = ['low', 'even', 'red', 'black', 'odd', 'high'];
    outsideBetKeys.forEach((key, i) => {
      const cell = board.querySelector(`[data-bet="${key}"]`);
      if (cell) {
        cell.style.gridRow = '5';
        cell.style.gridColumn = `${2 + i * 2} / ${4 + i * 2}`;
      }
    });

    // American 00
    if (isAmerican) {
      const ooEl = board.querySelector('[data-bet="straight_37"]');
      if (ooEl) {
        ooEl.style.gridRow = '4';
        ooEl.style.gridColumn = '1';
      }
      if (zeroEl) {
        zeroEl.style.gridRow = '1 / 4';
      }
    }
  }

  function createCell(label, cls, betKey) {
    const cell = document.createElement('div');
    cell.className = 'rb-cell ' + cls;
    cell.textContent = label;
    cell.dataset.bet = betKey;
    cell.onclick = () => placeBet(betKey, cell);
    return cell;
  }

  function placeBet(betKey, cell) {
    if (spinning) return;
    const balance = window.VegasMain.getBalance();
    if (totalBet() + chipValue > balance) return;

    bets[betKey] = (bets[betKey] || 0) + chipValue;
    updateBetChips();
    VegasAudio.SFX.chipPlace();
  }

  function updateBetChips() {
    // Clear old bet indicators
    document.querySelectorAll('.cell-bet').forEach(el => el.remove());
    document.querySelectorAll('.rb-cell').forEach(el => el.classList.remove('has-bet'));

    for (const [key, amount] of Object.entries(bets)) {
      const cell = document.querySelector(`[data-bet="${key}"]`);
      if (cell && amount > 0) {
        cell.classList.add('has-bet');
        const chipEl = document.createElement('span');
        chipEl.className = 'cell-bet';
        chipEl.textContent = '$' + amount;
        cell.appendChild(chipEl);
      }
    }

    document.getElementById('roulette-total-bet').textContent = totalBet();
  }

  // --- Bet Resolution ---
  function getWinningBets(number) {
    const winning = new Set();

    // Straight bet
    winning.add('straight_' + number);

    if (number === 0 || number === 37) {
      return winning;
    }

    // Color
    if (isRed(number)) winning.add('red');
    else winning.add('black');

    // Even/Odd
    if (number % 2 === 0) winning.add('even');
    else winning.add('odd');

    // Low/High
    if (number >= 1 && number <= 18) winning.add('low');
    else winning.add('high');

    // Dozens
    if (number >= 1 && number <= 12) winning.add('dozen_1');
    else if (number >= 13 && number <= 24) winning.add('dozen_2');
    else winning.add('dozen_3');

    // Columns
    const colNum = ((number - 1) % 3) + 1;
    winning.add('column_' + colNum);

    return winning;
  }

  function getPayoutMultiplier(betKey) {
    if (betKey.startsWith('straight_')) return 35;
    if (betKey.startsWith('dozen_') || betKey.startsWith('column_')) return 2;
    // red, black, even, odd, low, high
    return 1;
  }

  async function spinWheel() {
    if (spinning) return;
    if (totalBet() === 0) return;
    if (totalBet() > window.VegasMain.getBalance()) return;

    spinning = true;
    window.VegasMain.adjustBalance(-totalBet());
    window.VegasMain.updateBalanceDisplay();

    document.getElementById('roulette-spin').disabled = true;
    document.getElementById('roulette-result').textContent = '';
    document.querySelectorAll('.rb-cell').forEach(el => el.classList.remove('winning-cell'));

    VegasAudio.SFX.rouletteSpin();

    // Animate wheel
    const wheelInner = document.getElementById('wheel-inner');
    wheelInner.classList.add('spinning');
    wheelInner.className = 'wheel-inner spinning';
    wheelInner.textContent = '';

    // Determine result
    const numbers = getNumbers();
    const winNumber = numbers[Math.floor(Math.random() * numbers.length)];
    const winColor = getColor(winNumber);

    // Spin animation duration
    await delay(2000 + Math.random() * 1000);

    VegasAudio.SFX.rouletteBall();
    wheelInner.classList.remove('spinning');
    wheelInner.textContent = displayNumber(winNumber);
    wheelInner.className = 'wheel-inner num-' + winColor;

    // Calculate winnings
    const winningBetKeys = getWinningBets(winNumber);
    let totalWin = 0;

    for (const [key, amount] of Object.entries(bets)) {
      if (winningBetKeys.has(key)) {
        const multiplier = getPayoutMultiplier(key);
        totalWin += amount * (multiplier + 1); // bet back + payout
      }
    }

    // Highlight winning cells
    for (const key of winningBetKeys) {
      const cell = document.querySelector(`[data-bet="${key}"]`);
      if (cell) cell.classList.add('winning-cell');
    }

    // Update history
    history.push(winNumber);
    renderHistory();

    // Show result
    const resultEl = document.getElementById('roulette-result');
    const net = totalWin - totalBet();
    if (totalWin > 0) {
      resultEl.textContent = displayNumber(winNumber) + ' ' + winColor.toUpperCase() + ' — Win +$' + net;
      resultEl.style.color = '#d4af37';
      window.VegasMain.adjustBalance(totalWin);
      VegasAudio.SFX.win();
    } else {
      resultEl.textContent = displayNumber(winNumber) + ' ' + winColor.toUpperCase() + ' — No win';
      resultEl.style.color = '#ff6b6b';
      VegasAudio.SFX.lose();
    }

    window.VegasMain.updateBalanceDisplay();
    lastWinNumber = winNumber;

    // Save bets for repeat, then clear
    lastBets = { ...bets };
    bets = {};
    updateBetChips();

    spinning = false;
    document.getElementById('roulette-spin').disabled = false;
  }

  function renderHistory() {
    const el = document.getElementById('roulette-history');
    el.innerHTML = history.slice(-15).map(n => {
      const color = getColor(n);
      return `<span class="history-num h-${color}">${displayNumber(n)}</span>`;
    }).join('');
  }

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function init(settings) {
    rouletteType = settings.rouletteType || 'european';
    bets = {};
    history = [];
    spinning = false;

    renderBoard();
    renderHistory();
    updateBetChips();

    document.getElementById('wheel-inner').textContent = '';
    document.getElementById('wheel-inner').className = 'wheel-inner';
    document.getElementById('roulette-result').textContent = '';

    // Chip selector
    document.querySelectorAll('#screen-roulette .chip-btn').forEach(btn => {
      btn.onclick = () => {
        chipValue = parseInt(btn.dataset.value);
        document.querySelectorAll('#screen-roulette .chip-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      };
    });

    // Set default active chip
    const defaultChip = document.querySelector('#screen-roulette .chip-btn[data-value="5"]');
    if (defaultChip) defaultChip.classList.add('active');

    document.getElementById('roulette-clear').onclick = () => {
      bets = {};
      updateBetChips();
    };

    document.getElementById('roulette-spin').onclick = spinWheel;
  }

  window.VegasRoulette = { init };
})();
