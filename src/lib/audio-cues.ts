/**
 * Industrial Web Audio API Sound Synthesizer
 * 100% Client-Side, Zero External MP3 Assets, Zero Bandwidth, Edge & SSR Safe.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioCtx) {
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    void audioCtx.resume();
  }
  return audioCtx;
}

export function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem('dynamo-sound') !== 'muted';
}

export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('dynamo-sound', enabled ? 'enabled' : 'muted');
}

/** Crisp optical barcode scanner beep (1800Hz / 50ms) */
export function playBarcodeBeep(): void {
  if (!isSoundEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1800, ctx.currentTime);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.05);
  } catch {
    // Ignore audio errors on unsupported browsers
  }
}

/** Positive confirmation chime (C6 -> E6 harmonic) */
export function playSuccessChime(): void {
  if (!isSoundEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const playTone = (freq: number, start: number, dur: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.06, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + dur);
    };

    playTone(1046.5, now, 0.08); // C6
    playTone(1318.5, now + 0.07, 0.12); // E6
  } catch {
    // Ignore audio errors
  }
}

/** Warning cue for overdue or critical alert (440Hz -> 350Hz) */
export function playWarningBeep(): void {
  if (!isSoundEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(350, ctx.currentTime + 0.14);

    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.14);
  } catch {
    // Ignore audio errors
  }
}

export type AudioCueType = 'beep' | 'success' | 'warning';

/** Unified sound dispatcher for MES actions */
export function playAudioCue(type: AudioCueType): void {
  if (type === 'beep') {
    playBarcodeBeep();
  } else if (type === 'success') {
    playSuccessChime();
  } else if (type === 'warning') {
    playWarningBeep();
  }
}

