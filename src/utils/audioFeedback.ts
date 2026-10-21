// Web Audio API tone generator for voting counter feedback

class AudioFeedbackService {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  private lastVoteSoundTime = 0;

  playVoteIncrement() {
    const nowMs = Date.now();
    // Strict 500ms debounce: guarantees only ONE beep can ever sound within half a second
    if (nowMs - this.lastVoteSoundTime < 500) {
      return;
    }
    this.lastVoteSoundTime = nowMs;

    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Crisp, clean, pleasant single beep tone (880 Hz pure tone, no frequency slide or chirp)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);

      // Smooth anti-click envelope: 5ms attack, 60ms sustain, 15ms decay to zero
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.005);
      gain.gain.setValueAtTime(0.18, now + 0.065);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.085);
    } catch {
      // Audio not permitted or failed
    }
  }

  playVoteCorrection() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, ctx.currentTime); // A4
      osc.frequency.exponentialRampToValueAtTime(329.63, ctx.currentTime + 0.15); // E4

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.16);
    } catch {
      // Audio not permitted
    }
  }

  playSignatureSuccess() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);
        gain.gain.setValueAtTime(0.1, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.18);
      });
    } catch {
      // Silent fallback
    }
  }

  playScanSuccess() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      // High crisp double-tone chime
      [880, 1174.66].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);
        gain.gain.setValueAtTime(0.14, now + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.14);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.14);
      });
    } catch {
      // Silent fallback
    }
  }

  playDuplicateWarning() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      // Low dual buzzing alarm tone
      [220, 185, 220].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);
        gain.gain.setValueAtTime(0.2, now + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.12);
      });
    } catch {
      // Silent fallback
    }
  }

  playNotFoundWarning() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      // Attention inquiry tone
      [440, 554.37].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.09);
        gain.gain.setValueAtTime(0.15, now + idx * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.09);
        osc.stop(now + idx * 0.09 + 0.15);
      });
    } catch {
      // Silent fallback
    }
  }

  playVoterCheckin() {
    this.playScanSuccess();
  }

  playVoteCast() {
    this.playVoteIncrement();
  }

  playCandidateSelect() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
    } catch {
      // ignore
    }
  }

  playWarning() {
    this.playNotFoundWarning();
  }

  playClick() {
    this.playCandidateSelect();
  }
}

export const audioFeedback = new AudioFeedbackService();
