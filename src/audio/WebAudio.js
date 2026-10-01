class VitalisAudioEngine {
  constructor() {
    this.audioContext = null;
    this.masterGain = null;
    this.isMuted = false;
  }

  init() {
    if (!this.audioContext) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioCtx();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
      this.masterGain.connect(this.audioContext.destination);
    }

    if (this.audioContext.state === "suspended") {
      this.audioContext.resume();
    }
  }

  playInterfaceClick() {
    this.init();
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(800, this.audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, this.audioContext.currentTime + 0.05);

    gain.gain.setValueAtTime(0.2, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.audioContext.currentTime + 0.05);
  }

  playHeartbeatPulse() {
    this.init();
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

  toggleMute() {
    if (!this.masterGain) return this.isMuted;
    this.isMuted = !this.isMuted;
    this.masterGain.gain.setValueAtTime(
      this.isMuted ? 0 : 0.3,
      this.audioContext.currentTime
    );
    return this.isMuted;
  }
}

export const webAudio = new VitalisAudioEngine();
