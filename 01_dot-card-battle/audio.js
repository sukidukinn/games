// Web Audio tones adapted from borotoboro/src/sound.js. No audio files required.
const KEY = 'dotcardbattle.audio.v1';
const MELODY = [262, 330, 392, 330, 294, 349, 440, 349];

export class AudioManager {
  constructor() {
    this.bgmEnabled = true;
    this.seEnabled = true;
    this.context = null;
    this.timer = null;
    this.nextBeat = 0;
    this.beat = 0;
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
      this.bgmEnabled = saved.bgm !== false;
      this.seEnabled = saved.se !== false;
    } catch {}
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.pause();
      else if (this.context) void this.start();
    });
  }

  save() {
    try { localStorage.setItem(KEY, JSON.stringify({ bgm: this.bgmEnabled, se: this.seEnabled })); } catch {}
  }

  setBgmEnabled(enabled) {
    this.bgmEnabled = enabled;
    this.save();
    if (enabled) void this.start();
    else this.stopMusic();
  }

  setSeEnabled(enabled) {
    this.seEnabled = enabled;
    this.save();
    if (enabled) void this.start();
  }

  async start() {
    if (document.hidden || typeof AudioContext === 'undefined') return;
    try {
      this.context ??= new AudioContext();
      if (this.context.state !== 'running') await this.context.resume();
      if (this.bgmEnabled && this.timer === null) {
        this.nextBeat = this.context.currentTime + .05;
        this.timer = window.setInterval(() => this.scheduleMusic(), 150);
        this.scheduleMusic();
      }
    } catch {}
  }

  stopMusic() {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
  }

  pause() {
    this.stopMusic();
    void this.context?.suspend().catch(() => {});
  }

  play(cue) {
    if (!this.seEnabled) return;
    void this.start().then(() => {
      const now = this.context?.currentTime;
      if (now === undefined || this.context.state !== 'running') return;
      if (cue === 'select') this.tone(440, .075, now, .035, 'square');
      else if (cue === 'play') {
        this.tone(330, .10, now, .05, 'square');
        this.tone(494, .11, now + .075, .04, 'triangle');
      } else if (cue === 'clear') {
        this.tone(392, .12, now, .045, 'triangle', 196);
        this.tone(294, .16, now + .08, .03, 'triangle', 147);
      } else if (cue === 'pass') this.tone(220, .09, now, .04, 'square', 165);
      else if (cue === 'win') [392, 523, 659, 784].forEach((frequency, index) => this.tone(frequency, .18, now + index * .1, .05, 'triangle'));
      else [659, 784].forEach((frequency, index) => this.tone(frequency, .07, now + index * .07, .035, 'square'));
    });
  }

  scheduleMusic() {
    const context = this.context;
    if (!context || context.state !== 'running' || !this.bgmEnabled || document.hidden) return;
    while (this.nextBeat < context.currentTime + .4) {
      this.tone(MELODY[this.beat % MELODY.length], .2, this.nextBeat, .009, 'triangle');
      if (this.beat % 4 === 0) this.tone(this.beat % 8 === 0 ? 131 : 147, .38, this.nextBeat, .009, 'sine');
      this.nextBeat += .3;
      this.beat++;
    }
  }

  tone(frequency, duration, when, volume, type, endFrequency = frequency) {
    const context = this.context;
    if (!context) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, when);
    if (endFrequency !== frequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, when + duration);
    gain.gain.setValueAtTime(.001, when);
    gain.gain.linearRampToValueAtTime(volume, when + .01);
    gain.gain.exponentialRampToValueAtTime(.001, when + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(when);
    oscillator.stop(when + duration + .01);
  }
}
