# Vegas Games

A VS Code extension that lets you play classic Vegas games right in your editor. For entertainment purposes only — no real money involved.

## Games

- **Blackjack** — Beat the dealer to 21. Supports hit, stand, double down, and split.
- **Texas Hold'em Poker** — No-limit poker against AI opponents with configurable difficulty.
- **Baccarat** — Bet on Player, Banker, or Tie with standard third-card rules.
- **Slots** — 5-reel slot machine with adjustable bet size and paytable display.
- **Roulette** — European or American roulette with a full betting board.
- **Pai Gow Poker** — Face-up 7-card split against the dealer with House Way option.

## Getting Started

1. Install the extension in VS Code.
2. Click the games icon in the Activity Bar to open the sidebar, or run the command **Vegas Games: Open Vegas Games** from the Command Palette (`Ctrl+Shift+P`).
3. Pick a game from the lobby and start playing.

Your chip balance persists across sessions automatically.

## Settings

Open VS Code Settings and search for "Vegas Games" to configure:

| Setting | Default | Description |
|---------|---------|-------------|
| Sound Effects | On | Enable/disable sound effects |
| Background Music | Off | Enable/disable background music |
| Volume | 50 | Master volume (0-100) |
| Starting Balance | 1000 | Chip balance for new games |
| Roulette Type | European | European (single zero) or American (double zero) |
| Blackjack Decks | 6 | Number of decks (1, 2, 4, 6, or 8) |
| Poker AI Difficulty | Normal | Easy, Normal, or Hard |
| Theme | Classic | Classic green felt, Neon Vegas, or Dark Luxury |
| Auto-Save Balance | On | Save chip balance between sessions |

## Development

### Prerequisites

- Node.js
- VS Code ^1.74.0

### Build

```bash
npm install
npx tsc -p ./
```

### Run

Press `F5` in VS Code to launch an Extension Development Host with the extension loaded.

### Project Structure

```
src/extension.ts        Extension entry point and webview setup
media/js/blackjack.js   Blackjack game logic
media/js/poker.js       Texas Hold'em game logic
media/js/baccarat.js    Baccarat game logic
media/js/slots.js       Slots game logic
media/js/roulette.js    Roulette game logic
media/js/paigow.js      Pai Gow Poker game logic
media/js/audio.js       Sound effects (Web Audio API)
media/js/main.js        Lobby, navigation, and balance management
media/css/main.css      All styles
```

## Author

**Alpha Romer Coma** — [alpharomercoma@proton.me](mailto:alpharomercoma@proton.me)

## License

[MIT](LICENSE)

For fun only. No real money gambling.
