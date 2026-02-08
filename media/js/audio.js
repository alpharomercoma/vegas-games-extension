// ========================================
// LAS VEGAS GAMES - AUDIO SYSTEM
// Web Audio API Sound Effects & Music
// ========================================

(function() {
  'use strict';

  let audioCtx = null;
  let masterGain = null;
  let musicGain = null;
  let sfxGain = null;
  let musicPlaying = false;
  let musicOsc = null;

  const settings = {
    soundEnabled: true,
    musicEnabled: false,
    volume: 0.5
  };

  function getCtx() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = settings.volume;
      masterGain.connect(audioCtx.destination);

      sfxGain = audioCtx.createGain();
      sfxGain.gain.value = 1;
      sfxGain.connect(masterGain);

      musicGain = audioCtx.createGain();
      musicGain.gain.value = 0.15;
      musicGain.connect(masterGain);
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function playTone(freq, duration, type, gainVal, dest) {
    if (!settings.soundEnabled) return;
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(gainVal || 0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(dest || sfxGain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  }

  function playNoise(duration, gainVal) {
    if (!settings.soundEnabled) return;
    const ctx = getCtx();
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.5;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 2000;
    gain.gain.setValueAtTime(gainVal || 0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(sfxGain);
    source.start();
  }

  function playMelody(notes, tempo) {
    if (!settings.soundEnabled) return;
    const ctx = getCtx();
    const noteLen = tempo || 0.12;
    notes.forEach((note, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = note;
      gain.gain.setValueAtTime(0.12, ctx.currentTime + i * noteLen);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * noteLen + noteLen * 0.9);
      osc.connect(gain);
      gain.connect(sfxGain);
      osc.start(ctx.currentTime + i * noteLen);
      osc.stop(ctx.currentTime + i * noteLen + noteLen);
    });
  }

  // --- Sound Effects ---

  const SFX = {
    cardDeal() {
      playNoise(0.06, 0.12);
    },

    cardFlip() {
      playNoise(0.08, 0.15);
      setTimeout(() => playTone(800, 0.05, 'sine', 0.05), 30);
    },

    chipPlace() {
      playTone(1200, 0.04, 'sine', 0.1);
      setTimeout(() => playTone(1800, 0.03, 'sine', 0.06), 20);
    },

    chipCollect() {
      for (let i = 0; i < 4; i++) {
        setTimeout(() => playTone(1000 + i * 200, 0.05, 'sine', 0.06), i * 30);
      }
    },

    win() {
      playMelody([523, 659, 784, 1047], 0.12);
    },

    bigWin() {
      playMelody([523, 659, 784, 1047, 1319, 1568], 0.1);
      setTimeout(() => SFX.chipCollect(), 600);
    },

    blackjack() {
      playMelody([784, 988, 1175, 1568], 0.15);
      setTimeout(() => playMelody([1568, 1568], 0.08), 600);
    },

    lose() {
      playMelody([400, 350, 300, 250], 0.15);
    },

    bust() {
      playTone(200, 0.3, 'sawtooth', 0.1);
      setTimeout(() => playTone(150, 0.4, 'sawtooth', 0.08), 150);
    },

    push() {
      playTone(440, 0.2, 'sine', 0.08);
    },

    buttonClick() {
      playTone(600, 0.03, 'sine', 0.06);
    },

    slotSpin() {
      if (!settings.soundEnabled) return;
      const ctx = getCtx();
      const duration = 0.1;
      for (let i = 0; i < 20; i++) {
        setTimeout(() => {
          playTone(300 + Math.random() * 200, 0.04, 'square', 0.03);
        }, i * 50);
      }
    },

    slotStop() {
      playTone(400, 0.08, 'square', 0.1);
      playNoise(0.05, 0.08);
    },

    slotWin() {
      playMelody([523, 659, 784, 659, 784, 1047], 0.08);
    },

    slotJackpot() {
      const notes = [523, 659, 784, 1047, 784, 1047, 1319, 1568];
      playMelody(notes, 0.1);
      setTimeout(() => {
        playMelody([1568, 1319, 1568, 1319, 1568], 0.08);
      }, 800);
      setTimeout(() => SFX.chipCollect(), 400);
      setTimeout(() => SFX.chipCollect(), 700);
    },

    rouletteSpin() {
      if (!settings.soundEnabled) return;
      const ctx = getCtx();
      for (let i = 0; i < 30; i++) {
        setTimeout(() => {
          const speed = 1 - (i / 30) * 0.7;
          playTone(500 + Math.random() * 300, 0.02 * speed, 'sine', 0.03 * speed);
        }, i * (40 + i * 3));
      }
    },

    rouletteBall() {
      playTone(1000, 0.05, 'sine', 0.1);
      setTimeout(() => playTone(900, 0.04, 'sine', 0.07), 50);
      setTimeout(() => playTone(800, 0.06, 'sine', 0.05), 100);
    },

    fold() {
      playNoise(0.04, 0.06);
    },

    check() {
      playTone(500, 0.04, 'sine', 0.08);
    },

    allIn() {
      playMelody([400, 500, 600, 800], 0.06);
      setTimeout(() => SFX.chipCollect(), 250);
    },

    paiGowSet() {
      playTone(700, 0.06, 'sine', 0.08);
      setTimeout(() => playTone(900, 0.04, 'sine', 0.06), 40);
    },

    paiGowReveal() {
      playNoise(0.05, 0.1);
      setTimeout(() => playTone(600, 0.08, 'triangle', 0.08), 30);
      setTimeout(() => playTone(800, 0.06, 'triangle', 0.06), 80);
    }
  };

  // --- Background Music ---

  function startMusic() {
    if (musicPlaying || !settings.musicEnabled) return;
    const ctx = getCtx();
    musicPlaying = true;

    function playLoop() {
      if (!musicPlaying || !settings.musicEnabled) return;
      const chords = [
        [261, 329, 392],
        [293, 369, 440],
        [329, 415, 493],
        [261, 329, 392]
      ];
      const now = ctx.currentTime;
      chords.forEach((chord, ci) => {
        chord.forEach(freq => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0.03, now + ci * 2);
          gain.gain.setValueAtTime(0.03, now + ci * 2 + 1.8);
          gain.gain.linearRampToValueAtTime(0, now + ci * 2 + 2);
          osc.connect(gain);
          gain.connect(musicGain);
          osc.start(now + ci * 2);
          osc.stop(now + ci * 2 + 2);
        });
      });
      setTimeout(playLoop, 8000);
    }
    playLoop();
  }

  function stopMusic() {
    musicPlaying = false;
  }

  // --- Public API ---

  window.VegasAudio = {
    SFX,
    updateSettings(s) {
      if (s.soundEnabled !== undefined) settings.soundEnabled = s.soundEnabled;
      if (s.musicEnabled !== undefined) {
        settings.musicEnabled = s.musicEnabled;
        if (s.musicEnabled) startMusic();
        else stopMusic();
      }
      if (s.volume !== undefined) {
        settings.volume = s.volume;
        if (masterGain) masterGain.gain.value = s.volume;
      }
    },
    init() {
      // Defer context creation until user interaction
      document.addEventListener('click', () => getCtx(), { once: true });
    }
  };
})();
