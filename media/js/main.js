// ========================================
// LAS VEGAS GAMES - MAIN CONTROLLER
// Navigation, State Management, Settings
// ========================================

(function() {
  'use strict';

  const vscode = acquireVsCodeApi();
  let balance = 1000;
  let settings = {};
  let currentGame = null;

  // --- State Persistence ---
  function saveState() {
    vscode.setState({ balance, currentGame });
    vscode.postMessage({ type: 'saveBalance', data: balance });
  }

  function restoreState() {
    const state = vscode.getState();
    if (state) {
      balance = state.balance || 1000;
      currentGame = state.currentGame || null;
    }
  }

  // --- Balance Management ---
  function getBalance() { return balance; }

  function setBalance(val) {
    balance = Math.max(0, Math.round(val));
    updateBalanceDisplay();
    saveState();
  }

  function adjustBalance(amount) {
    balance = Math.max(0, Math.round(balance + amount));
    updateBalanceDisplay();
    saveState();
  }

  function updateBalanceDisplay() {
    const formatted = '$' + balance.toLocaleString();
    const lobbyAmount = document.getElementById('balance-amount');
    if (lobbyAmount) lobbyAmount.textContent = formatted;

    document.querySelectorAll('.hb-amount').forEach(el => {
      el.textContent = balance.toLocaleString();
    });
  }

  // --- Navigation ---
  function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const screen = document.getElementById('screen-' + screenId);
    if (screen) {
      screen.classList.add('active');
    }
    currentGame = screenId === 'lobby' ? null : screenId;
    saveState();
  }

  function initGame(gameId) {
    updateBalanceDisplay();
    switch(gameId) {
      case 'blackjack':
        window.VegasBlackjack.init(settings);
        break;
      case 'poker':
        window.VegasPoker.init(settings);
        break;
      case 'baccarat':
        window.VegasBaccarat.init(settings);
        break;
      case 'slots':
        window.VegasSlots.init(settings);
        break;
      case 'roulette':
        window.VegasRoulette.init(settings);
        break;
      case 'paigow':
        window.VegasPaiGow.init(settings);
        break;
    }
  }

  // --- Theme ---
  function applyTheme(theme) {
    document.body.className = '';
    if (theme && theme !== 'classic') {
      document.body.classList.add('theme-' + theme);
    }
  }

  // --- Event Listeners ---
  function setupEventListeners() {
    // Game cards
    document.querySelectorAll('.game-card').forEach(card => {
      card.addEventListener('click', () => {
        const game = card.dataset.game;
        VegasAudio.SFX.buttonClick();
        showScreen(game);
        initGame(game);
      });
    });

    // Back buttons
    document.querySelectorAll('.btn-back').forEach(btn => {
      btn.addEventListener('click', () => {
        // Cash out of poker if leaving poker screen
        if (currentGame === 'poker' && window.VegasPoker && window.VegasPoker.cashOut) {
          window.VegasPoker.cashOut();
        }
        VegasAudio.SFX.buttonClick();
        showScreen(btn.dataset.target);
        updateBalanceDisplay();
      });
    });

    // Settings button
    document.getElementById('btn-settings').addEventListener('click', () => {
      VegasAudio.SFX.buttonClick();
      showScreen('settings');
    });

    // Reset balance
    document.getElementById('btn-reset-balance').addEventListener('click', () => {
      vscode.postMessage({ type: 'resetBalance' });
    });

    // Settings controls
    document.getElementById('setting-sound').addEventListener('change', function() {
      settings.soundEnabled = this.checked;
      VegasAudio.updateSettings({ soundEnabled: this.checked });
    });

    document.getElementById('setting-music').addEventListener('change', function() {
      settings.musicEnabled = this.checked;
      VegasAudio.updateSettings({ musicEnabled: this.checked });
    });

    document.getElementById('setting-volume').addEventListener('input', function() {
      const vol = parseInt(this.value);
      document.getElementById('volume-value').textContent = vol;
      settings.volume = vol;
      VegasAudio.updateSettings({ volume: vol / 100 });
    });

    document.getElementById('setting-theme').addEventListener('change', function() {
      settings.theme = this.value;
      applyTheme(this.value);
    });

    document.getElementById('setting-roulette-type').addEventListener('change', function() {
      settings.rouletteType = this.value;
    });

    document.getElementById('setting-bj-decks').addEventListener('change', function() {
      settings.blackjackDecks = parseInt(this.value);
    });

    document.getElementById('setting-poker-diff').addEventListener('change', function() {
      settings.pokerDifficulty = this.value;
    });
  }

  // --- Message Handler ---
  window.addEventListener('message', (event) => {
    const message = event.data;
    switch(message.type) {
      case 'settings':
        settings = message.data;
        applyTheme(settings.theme);
        VegasAudio.updateSettings({
          soundEnabled: settings.soundEnabled,
          musicEnabled: settings.musicEnabled,
          volume: settings.volume / 100
        });

        // Update settings UI
        document.getElementById('setting-sound').checked = settings.soundEnabled;
        document.getElementById('setting-music').checked = settings.musicEnabled;
        document.getElementById('setting-volume').value = settings.volume;
        document.getElementById('volume-value').textContent = settings.volume;
        document.getElementById('setting-theme').value = settings.theme;
        document.getElementById('setting-roulette-type').value = settings.rouletteType;
        document.getElementById('setting-bj-decks').value = settings.blackjackDecks;
        document.getElementById('setting-poker-diff').value = settings.pokerDifficulty;
        break;

      case 'balance':
        balance = message.data;
        updateBalanceDisplay();
        break;
    }
  });

  // --- Init ---
  function init() {
    restoreState();
    VegasAudio.init();
    setupEventListeners();
    updateBalanceDisplay();

    // Request settings and balance from extension
    vscode.postMessage({ type: 'getSettings' });
    vscode.postMessage({ type: 'getBalance' });

    // Show lobby or restore last game
    if (currentGame) {
      showScreen(currentGame);
      initGame(currentGame);
    } else {
      showScreen('lobby');
    }
  }

  // --- Public API ---
  window.VegasMain = {
    getBalance,
    setBalance,
    adjustBalance,
    updateBalanceDisplay
  };

  // Start
  init();
})();
