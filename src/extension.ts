import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  const sidebarProvider = new CasinoWebviewProvider(context, 'sidebar');

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('vegasCasinoGames.sidebar', sidebarProvider, {
      webviewOptions: { retainContextWhenHidden: true }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('vegasCasinoGames.openPanel', () => {
      const panel = vscode.window.createWebviewPanel(
        'vegasCasinoGames.panel',
        'Vegas Casino Games',
        vscode.ViewColumn.One,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
          localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')]
        }
      );
      panel.iconPath = vscode.Uri.joinPath(context.extensionUri, 'media', 'icons', 'casino.svg');
      panel.webview.html = getWebviewContent(panel.webview, context.extensionUri, context);
      setupWebviewMessageHandler(panel.webview, context);
    })
  );
}

class CasinoWebviewProvider implements vscode.WebviewViewProvider {
  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly viewType: string
  ) {}

  resolveWebviewView(webviewView: vscode.WebviewView) {
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'media')]
    };
    webviewView.webview.html = getWebviewContent(webviewView.webview, this.context.extensionUri, this.context);
    setupWebviewMessageHandler(webviewView.webview, this.context);
  }
}

function setupWebviewMessageHandler(webview: vscode.Webview, context: vscode.ExtensionContext) {
  webview.onDidReceiveMessage(async (message) => {
    switch (message.type) {
      case 'getSettings': {
        const config = vscode.workspace.getConfiguration('vegasCasinoGames');
        webview.postMessage({
          type: 'settings',
          data: {
            soundEnabled: config.get('soundEnabled', true),
            musicEnabled: config.get('musicEnabled', false),
            volume: config.get('volume', 50),
            startingBalance: config.get('startingBalance', 1000),
            rouletteType: config.get('rouletteType', 'european'),
            blackjackDecks: config.get('blackjackDecks', 6),
            pokerDifficulty: config.get('pokerDifficulty', 'normal'),
            theme: config.get('theme', 'classic'),
            autoSaveBalance: config.get('autoSaveBalance', true)
          }
        });
        break;
      }
      case 'saveBalance': {
        await context.globalState.update('vegasCasinoGames.balance', message.data);
        break;
      }
      case 'getBalance': {
        const balance = context.globalState.get<number>('vegasCasinoGames.balance');
        const config = vscode.workspace.getConfiguration('vegasCasinoGames');
        webview.postMessage({
          type: 'balance',
          data: balance ?? config.get('startingBalance', 1000)
        });
        break;
      }
      case 'resetBalance': {
        const config = vscode.workspace.getConfiguration('vegasCasinoGames');
        const starting = config.get('startingBalance', 1000);
        await context.globalState.update('vegasCasinoGames.balance', starting);
        webview.postMessage({ type: 'balance', data: starting });
        break;
      }
      case 'showInfo': {
        vscode.window.showInformationMessage(message.data);
        break;
      }
    }
  });
}

function getNonce(): string {
  let text = '';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return text;
}

function getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri, context: vscode.ExtensionContext): string {
  const nonce = getNonce();
  const cssUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'css', 'main.css'));
  const audioUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'js', 'audio.js'));
  const blackjackUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'js', 'blackjack.js'));
  const pokerUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'js', 'poker.js'));
  const baccaratUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'js', 'baccarat.js'));
  const slotsUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'js', 'slots.js'));
  const rouletteUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'js', 'roulette.js'));
  const paigowUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'js', 'paigow.js'));
  const mainUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'js', 'main.js'));

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; font-src ${webview.cspSource}; img-src ${webview.cspSource} data:;">
  <link rel="stylesheet" href="${cssUri}">
  <title>Vegas Casino Games</title>
</head>
<body>
  <!-- LOBBY -->
  <div id="screen-lobby" class="screen active">
    <div class="lobby-header">
      <h1 class="lobby-title">VEGAS CASINO</h1>
      <p class="lobby-subtitle">GAMES</p>
      <div class="balance-display" id="lobby-balance">
        <span class="balance-label">CHIPS</span>
        <span class="balance-amount" id="balance-amount">$1,000</span>
      </div>
    </div>
    <div class="game-grid">
      <button class="game-card" data-game="blackjack">
        <div class="game-card-icon">&#9824;</div>
        <div class="game-card-title">Blackjack</div>
        <div class="game-card-desc">Beat the dealer to 21</div>
      </button>
      <button class="game-card" data-game="poker">
        <div class="game-card-icon">&#9829;</div>
        <div class="game-card-title">Texas Hold'em</div>
        <div class="game-card-desc">No-limit poker</div>
      </button>
      <button class="game-card" data-game="baccarat">
        <div class="game-card-icon">&#9830;</div>
        <div class="game-card-title">Baccarat</div>
        <div class="game-card-desc">Player vs Banker</div>
      </button>
      <button class="game-card" data-game="slots">
        <div class="game-card-icon">&#127920;</div>
        <div class="game-card-title">Slots</div>
        <div class="game-card-desc">Spin to win</div>
      </button>
      <button class="game-card" data-game="roulette">
        <div class="game-card-icon">&#9898;</div>
        <div class="game-card-title">Roulette</div>
        <div class="game-card-desc">Place your bets</div>
      </button>
      <button class="game-card" data-game="paigow">
        <div class="game-card-icon">&#127136;</div>
        <div class="game-card-title">Pai Gow Poker</div>
        <div class="game-card-desc">Face Up 7-card split</div>
      </button>
    </div>
    <div class="lobby-footer">
      <button class="btn-settings" id="btn-settings" title="Settings">&#9881; Settings</button>
      <button class="btn-reset" id="btn-reset-balance" title="Reset Balance">&#8635; Reset Chips</button>
    </div>
    <div class="disclaimer">For entertainment only. No real money.</div>
  </div>

  <!-- SETTINGS PANEL -->
  <div id="screen-settings" class="screen">
    <div class="screen-header">
      <button class="btn-back" data-target="lobby">&#8592; Back</button>
      <h2>Settings</h2>
    </div>
    <div class="settings-content">
      <div class="setting-group">
        <label class="setting-label">Sound Effects</label>
        <label class="toggle"><input type="checkbox" id="setting-sound" checked><span class="toggle-slider"></span></label>
      </div>
      <div class="setting-group">
        <label class="setting-label">Background Music</label>
        <label class="toggle"><input type="checkbox" id="setting-music"><span class="toggle-slider"></span></label>
      </div>
      <div class="setting-group">
        <label class="setting-label">Volume: <span id="volume-value">50</span>%</label>
        <input type="range" id="setting-volume" min="0" max="100" value="50" class="setting-range">
      </div>
      <div class="setting-group">
        <label class="setting-label">Theme</label>
        <select id="setting-theme" class="setting-select">
          <option value="classic">Classic Casino</option>
          <option value="neon">Neon Vegas</option>
          <option value="dark">Dark Luxury</option>
        </select>
      </div>
      <div class="setting-group">
        <label class="setting-label">Roulette Type</label>
        <select id="setting-roulette-type" class="setting-select">
          <option value="european">European (Single Zero)</option>
          <option value="american">American (Double Zero)</option>
        </select>
      </div>
      <div class="setting-group">
        <label class="setting-label">Blackjack Decks</label>
        <select id="setting-bj-decks" class="setting-select">
          <option value="1">1 Deck</option>
          <option value="2">2 Decks</option>
          <option value="4">4 Decks</option>
          <option value="6" selected>6 Decks</option>
          <option value="8">8 Decks</option>
        </select>
      </div>
      <div class="setting-group">
        <label class="setting-label">Poker AI Difficulty</label>
        <select id="setting-poker-diff" class="setting-select">
          <option value="easy">Easy</option>
          <option value="normal" selected>Normal</option>
          <option value="hard">Hard</option>
        </select>
      </div>
    </div>
  </div>

  <!-- BLACKJACK SCREEN -->
  <div id="screen-blackjack" class="screen game-screen">
    <div class="screen-header">
      <button class="btn-back" data-target="lobby">&#8592; Lobby</button>
      <h2>Blackjack</h2>
      <div class="header-balance">$<span class="hb-amount">1000</span></div>
    </div>
    <div class="blackjack-table">
      <div class="dealer-area">
        <div class="hand-label">DEALER <span id="bj-dealer-score"></span></div>
        <div class="card-hand" id="bj-dealer-hand"></div>
      </div>
      <div class="bj-status" id="bj-status"></div>
      <div class="player-area">
        <div class="hand-label">YOU <span id="bj-player-score"></span></div>
        <div class="card-hand" id="bj-player-hand"></div>
      </div>
      <div class="bj-controls">
        <div class="bet-controls" id="bj-bet-controls">
          <div class="chip-selector">
            <button class="chip-btn" data-value="5"><span class="chip chip-5">5</span></button>
            <button class="chip-btn" data-value="25"><span class="chip chip-25">25</span></button>
            <button class="chip-btn" data-value="100"><span class="chip chip-100">100</span></button>
            <button class="chip-btn" data-value="500"><span class="chip chip-500">500</span></button>
          </div>
          <div class="bet-display">Bet: $<span id="bj-bet-amount">0</span></div>
          <div class="bet-actions">
            <button class="btn-action btn-clear" id="bj-clear-bet">Clear</button>
            <button class="btn-action btn-deal" id="bj-deal">Deal</button>
          </div>
        </div>
        <div class="play-controls hidden" id="bj-play-controls">
          <button class="btn-action btn-hit" id="bj-hit">Hit</button>
          <button class="btn-action btn-stand" id="bj-stand">Stand</button>
          <button class="btn-action btn-double" id="bj-double">Double</button>
          <button class="btn-action btn-split" id="bj-split">Split</button>
        </div>
        <div class="result-controls hidden" id="bj-result-controls">
          <button class="btn-action btn-deal" id="bj-new-hand">New Hand</button>
        </div>
      </div>
    </div>
  </div>

  <!-- POKER SCREEN -->
  <div id="screen-poker" class="screen game-screen">
    <div class="screen-header">
      <button class="btn-back" data-target="lobby">&#8592; Lobby</button>
      <h2>Texas Hold'em</h2>
      <div class="header-balance">$<span class="hb-amount">1000</span></div>
    </div>
    <div class="poker-table">
      <div class="poker-opponents">
        <div class="poker-seat opponent" id="poker-opp-0">
          <div class="seat-name">Player 2</div>
          <div class="seat-cards"></div>
          <div class="seat-chips">$500</div>
          <div class="seat-action"></div>
        </div>
        <div class="poker-seat opponent" id="poker-opp-1">
          <div class="seat-name">Player 3</div>
          <div class="seat-cards"></div>
          <div class="seat-chips">$500</div>
          <div class="seat-action"></div>
        </div>
        <div class="poker-seat opponent" id="poker-opp-2">
          <div class="seat-name">Player 4</div>
          <div class="seat-cards"></div>
          <div class="seat-chips">$500</div>
          <div class="seat-action"></div>
        </div>
      </div>
      <div class="poker-community">
        <div class="poker-pot">Pot: $<span id="poker-pot">0</span></div>
        <div class="card-hand" id="poker-community-cards"></div>
      </div>
      <div class="poker-player-area">
        <div class="poker-seat player" id="poker-player">
          <div class="seat-name">You</div>
          <div class="card-hand" id="poker-player-cards"></div>
          <div class="seat-chips">$<span id="poker-player-chips">1000</span></div>
        </div>
        <div class="poker-hand-rank" id="poker-hand-rank"></div>
      </div>
      <div class="poker-controls">
        <div class="poker-prestart" id="poker-prestart">
          <div class="poker-blinds-info">Blinds: $5 / $10</div>
          <button class="btn-action btn-deal" id="poker-start">Start Hand</button>
        </div>
        <div class="poker-actions hidden" id="poker-actions">
          <button class="btn-action btn-fold" id="poker-fold">Fold</button>
          <button class="btn-action btn-check" id="poker-check">Check</button>
          <button class="btn-action btn-call" id="poker-call">Call $<span id="poker-call-amount">0</span></button>
          <button class="btn-action btn-raise" id="poker-raise">Raise</button>
          <button class="btn-action btn-allin" id="poker-allin">All In</button>
        </div>
        <div class="poker-raise-controls hidden" id="poker-raise-controls">
          <input type="range" id="poker-raise-slider" min="0" max="1000" class="setting-range">
          <span id="poker-raise-value">$20</span>
          <button class="btn-action btn-raise" id="poker-raise-confirm">Raise</button>
          <button class="btn-action btn-clear" id="poker-raise-cancel">Cancel</button>
        </div>
        <div class="poker-result hidden" id="poker-result">
          <div id="poker-result-text"></div>
          <button class="btn-action btn-deal" id="poker-next-hand">Next Hand</button>
        </div>
      </div>
    </div>
  </div>

  <!-- BACCARAT SCREEN -->
  <div id="screen-baccarat" class="screen game-screen">
    <div class="screen-header">
      <button class="btn-back" data-target="lobby">&#8592; Lobby</button>
      <h2>Baccarat</h2>
      <div class="header-balance">$<span class="hb-amount">1000</span></div>
    </div>
    <div class="baccarat-table">
      <div class="bacc-hands">
        <div class="bacc-hand-area">
          <div class="hand-label bacc-banker-label">BANKER <span id="bacc-banker-score"></span></div>
          <div class="card-hand" id="bacc-banker-hand"></div>
        </div>
        <div class="bacc-vs">VS</div>
        <div class="bacc-hand-area">
          <div class="hand-label bacc-player-label">PLAYER <span id="bacc-player-score"></span></div>
          <div class="card-hand" id="bacc-player-hand"></div>
        </div>
      </div>
      <div class="bacc-status" id="bacc-status"></div>
      <div class="bacc-betting">
        <div class="bacc-bet-zones" id="bacc-bet-zones">
          <button class="bacc-zone" data-bet="player">
            <div class="zone-label">PLAYER</div>
            <div class="zone-odds">1:1</div>
            <div class="zone-amount" id="bacc-player-bet">$0</div>
          </button>
          <button class="bacc-zone zone-tie" data-bet="tie">
            <div class="zone-label">TIE</div>
            <div class="zone-odds">8:1</div>
            <div class="zone-amount" id="bacc-tie-bet">$0</div>
          </button>
          <button class="bacc-zone" data-bet="banker">
            <div class="zone-label">BANKER</div>
            <div class="zone-odds">0.95:1</div>
            <div class="zone-amount" id="bacc-banker-bet">$0</div>
          </button>
        </div>
        <div class="chip-selector">
          <button class="chip-btn" data-value="5"><span class="chip chip-5">5</span></button>
          <button class="chip-btn" data-value="25"><span class="chip chip-25">25</span></button>
          <button class="chip-btn" data-value="100"><span class="chip chip-100">100</span></button>
          <button class="chip-btn" data-value="500"><span class="chip chip-500">500</span></button>
        </div>
        <div class="bet-actions">
          <button class="btn-action btn-clear" id="bacc-clear">Clear</button>
          <button class="btn-action btn-deal" id="bacc-deal">Deal</button>
        </div>
      </div>
      <div class="bacc-result-controls hidden" id="bacc-result-controls">
        <button class="btn-action btn-deal" id="bacc-new-hand">New Hand</button>
      </div>
      <div class="bacc-history">
        <div class="history-label">History</div>
        <div class="history-dots" id="bacc-history"></div>
      </div>
    </div>
  </div>

  <!-- SLOTS SCREEN -->
  <div id="screen-slots" class="screen game-screen">
    <div class="screen-header">
      <button class="btn-back" data-target="lobby">&#8592; Lobby</button>
      <h2>Lucky Sevens Slots</h2>
      <div class="header-balance">$<span class="hb-amount">1000</span></div>
    </div>
    <div class="slots-machine">
      <div class="slots-marquee">
        <span class="marquee-text">&#9733; LUCKY SEVENS &#9733;</span>
      </div>
      <div class="slots-reels-container">
        <div class="slots-reel-window">
          <div class="slots-reel" id="slots-reel-0"><div class="reel-strip"></div></div>
          <div class="slots-reel" id="slots-reel-1"><div class="reel-strip"></div></div>
          <div class="slots-reel" id="slots-reel-2"><div class="reel-strip"></div></div>
          <div class="slots-reel" id="slots-reel-3"><div class="reel-strip"></div></div>
          <div class="slots-reel" id="slots-reel-4"><div class="reel-strip"></div></div>
        </div>
        <div class="slots-payline"></div>
        <div class="slots-payline-label">CENTER LINE PAYS</div>
      </div>
      <div class="slots-info">
        <div class="slots-win-display" id="slots-win-display"></div>
      </div>
      <div class="slots-controls">
        <div class="slots-bet-controls">
          <button class="btn-action btn-clear" id="slots-bet-down">-</button>
          <div class="slots-bet-display">Bet: $<span id="slots-bet">1</span></div>
          <button class="btn-action btn-deal" id="slots-bet-up">+</button>
        </div>
        <button class="btn-spin" id="slots-spin">SPIN</button>
      </div>
      <div class="slots-paytable">
        <div class="paytable-title">Paytable</div>
        <div class="paytable-entries" id="slots-paytable"></div>
      </div>
    </div>
  </div>

  <!-- ROULETTE SCREEN -->
  <div id="screen-roulette" class="screen game-screen">
    <div class="screen-header">
      <button class="btn-back" data-target="lobby">&#8592; Lobby</button>
      <h2>Roulette</h2>
      <div class="header-balance">$<span class="hb-amount">1000</span></div>
    </div>
    <div class="roulette-table">
      <div class="roulette-wheel-area">
        <div class="roulette-wheel" id="roulette-wheel">
          <div class="wheel-inner" id="wheel-inner"></div>
          <div class="wheel-ball" id="wheel-ball"></div>
        </div>
        <div class="roulette-result" id="roulette-result"></div>
        <div class="roulette-history">
          <div class="history-label">Last Numbers</div>
          <div class="history-numbers" id="roulette-history"></div>
        </div>
      </div>
      <div class="roulette-board" id="roulette-board"></div>
      <div class="roulette-controls">
        <div class="chip-selector">
          <button class="chip-btn active" data-value="5"><span class="chip chip-5">5</span></button>
          <button class="chip-btn" data-value="25"><span class="chip chip-25">25</span></button>
          <button class="chip-btn" data-value="100"><span class="chip chip-100">100</span></button>
          <button class="chip-btn" data-value="500"><span class="chip chip-500">500</span></button>
        </div>
        <div class="roulette-bet-info">Total Bet: $<span id="roulette-total-bet">0</span></div>
        <div class="bet-actions">
          <button class="btn-action btn-clear" id="roulette-clear">Clear</button>
          <button class="btn-action btn-deal" id="roulette-spin">Spin</button>
        </div>
      </div>
    </div>
  </div>

  <!-- PAI GOW POKER SCREEN -->
  <div id="screen-paigow" class="screen game-screen">
    <div class="screen-header">
      <button class="btn-back" data-target="lobby">&#8592; Lobby</button>
      <h2>Face Up Pai Gow</h2>
      <div class="header-balance">$<span class="hb-amount">1000</span></div>
    </div>
    <div class="paigow-table">
      <div class="pg-dealer-area">
        <div class="pg-hand-section" id="pg-dealer-high"></div>
        <div class="pg-hand-section" id="pg-dealer-low"></div>
      </div>
      <div class="pg-status" id="pg-status"></div>
      <div class="pg-player-area">
        <div class="pg-your-cards">
          <div class="hand-label">YOUR 7 CARDS — Select 2 for Low Hand</div>
          <div class="card-hand pg-card-grid" id="pg-player-cards"></div>
        </div>
        <div class="pg-split-preview">
          <div class="pg-hand-section" id="pg-player-high"></div>
          <div class="pg-hand-section" id="pg-player-low"></div>
        </div>
      </div>
      <div class="pg-controls">
        <div id="pg-bet-controls">
          <div class="chip-selector">
            <button class="chip-btn" data-value="5"><span class="chip chip-5">5</span></button>
            <button class="chip-btn" data-value="25"><span class="chip chip-25">25</span></button>
            <button class="chip-btn" data-value="100"><span class="chip chip-100">100</span></button>
            <button class="chip-btn" data-value="500"><span class="chip chip-500">500</span></button>
          </div>
          <div class="bet-display">Bet: $<span id="pg-bet-amount">0</span></div>
          <div class="bet-actions">
            <button class="btn-action btn-clear" id="pg-clear">Clear</button>
            <button class="btn-action btn-deal" id="pg-deal">Deal</button>
          </div>
        </div>
        <div class="hidden" id="pg-set-controls">
          <div class="bet-actions">
            <button class="btn-action btn-check" id="pg-auto-set">House Way</button>
            <button class="btn-action btn-deal" id="pg-set-confirm" disabled>Confirm</button>
          </div>
        </div>
        <div class="hidden" id="pg-result-controls">
          <button class="btn-action btn-deal" id="pg-new-hand">New Hand</button>
        </div>
      </div>
    </div>
  </div>

  <script nonce="${nonce}" src="${audioUri}"></script>
  <script nonce="${nonce}" src="${blackjackUri}"></script>
  <script nonce="${nonce}" src="${pokerUri}"></script>
  <script nonce="${nonce}" src="${baccaratUri}"></script>
  <script nonce="${nonce}" src="${slotsUri}"></script>
  <script nonce="${nonce}" src="${rouletteUri}"></script>
  <script nonce="${nonce}" src="${paigowUri}"></script>
  <script nonce="${nonce}" src="${mainUri}"></script>
</body>
</html>`;
}

export function deactivate() {}
