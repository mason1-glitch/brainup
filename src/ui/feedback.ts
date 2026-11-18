// Rückmeldung zu einer Antwort: kurzer Ton (WebAudio) und Vibration – beides einzeln abschaltbar.

interface Options {
  sound: boolean;
  haptics: boolean;
}

let options: Options = { sound: false, haptics: true };
let context: AudioContext | null = null;

export function configureFeedback(next: Options): void {
  options = { sound: next.sound, haptics: next.haptics };
}

/** Muss aus einer Nutzeraktion heraus aufgerufen werden: iOS startet Audio erst danach. */
export function unlockAudio(): void {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    context ??= new Ctx();
    if (context.state === 'suspended') void context.resume();
  } catch {
    // Ohne Audio bleibt es still.
  }
}

function tone(ctx: AudioContext, hz: number, seconds: number): void {
  const volume = 0.08;
  const fade = 0.01;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const t = ctx.currentTime;
  osc.type = 'sine';
  osc.frequency.value = hz;
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(volume, t + fade);
  gain.gain.setValueAtTime(volume, t + seconds - fade);
  gain.gain.linearRampToValueAtTime(0, t + seconds);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + seconds);
}

export function signal(correct: boolean): void {
  try {
    if (options.sound && context) tone(context, correct ? 880 : 196, correct ? 0.07 : 0.14);
    if (options.haptics && typeof navigator.vibrate === 'function') navigator.vibrate(correct ? 10 : [20, 40, 20]);
  } catch {
    // Rückmeldung darf nie den Ablauf stören.
  }
}
