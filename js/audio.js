const storageKey = "vitalis-sound";
const level = 0.3;

function readPreference() {
  try {
    return localStorage.getItem(storageKey) === "on";
  } catch {
    return false;
  }
}

function writePreference(enabled) {
  try {
    localStorage.setItem(storageKey, enabled ? "on" : "off");
  } catch {
    return;
  }
}

class VitalisAudioEngine {
  constructor() {
    this.audioContext = null;
    this.masterGain = null;
    this.enabled = readPreference();
  }

  init() {
    if (!this.audioContext) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return false;
      this.audioContext = new AudioCtx();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.setValueAtTime(this.enabled ? level : 0, this.audioContext.currentTime);
      this.masterGain.connect(this.audioContext.destination);
    }

    if (this.audioContext.state === "suspended") {
      this.audioContext.resume();
    }
    return true;
  }

  playInterfaceClick() {
    if (!this.enabled || !this.init()) return;
    const now = this.audioContext.currentTime;
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  playHeartbeatPulse() {
    if (!this.enabled || !this.init()) return;
    const now = this.audioContext.currentTime;

    const playThump = (time, freq) => {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, time);
      osc.frequency.exponentialRampToValueAtTime(30, time + 0.12);

      gain.gain.setValueAtTime(0.8, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(time);
      osc.stop(time + 0.12);
    };

    playThump(now, 120);
    playThump(now + 0.18, 90);
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    writePreference(enabled);
    if (enabled && this.init()) {
      this.masterGain.gain.setValueAtTime(level, this.audioContext.currentTime);
    } else if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(0, this.audioContext.currentTime);
    }
    return this.enabled;
  }
}

export const webAudio = new VitalisAudioEngine();
