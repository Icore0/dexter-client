#!/usr/bin/env python3
"""Generates the original Dexter launcher sound set (pure Python, nothing from any other source).
Run: python3 tools/gen-sounds.py  -> app-electron/assets/sounds/*.wav (16-bit mono 44.1 kHz).

Design rules (the previous set was too bright and too busy):
- soft, round tones only: sine with a quiet second partial, smooth 10 ms attack, exponential decay. No noise, no shimmer,
  no long reverb (a tiny two-tap echo gives a little air, nothing metallic).
- everything is low-passed at about 2.2 kHz, so there is no hiss or ice-pick sharpness.
- one key (C major pentatonic: C D E G A) so every sound belongs to the same family.
- short: ticks 40-80 ms, tabs and switches 120-250 ms, chimes under 1 s. Peaks around -14 dBFS (the launcher also scales the
  volume with the Sound volume setting)."""
import math, os, struct, wave

SR = 44100
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'sounds')
F = {'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'G4': 392.00, 'A4': 440.00, 'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'G5': 783.99, 'A5': 880.00, 'C6': 1046.5}


def tone(freq, dur, vol=1.0, decay=None, attack=0.010, second=0.18, glide=0.0):
    """A round note: sine + a soft octave, smooth attack, exponential decay; glide = fractional pitch change over the note."""
    n = int(SR * dur); decay = decay or dur * 0.55; out = []; ph1 = ph2 = 0.0
    for i in range(n):
        t = i / SR; f = freq * (1 + glide * (t / dur))
        ph1 += 2 * math.pi * f / SR; ph2 += 2 * math.pi * f * 2 / SR
        a = min(1.0, t / attack) * math.exp(-t / decay) * min(1.0, (dur - t) / 0.025)
        out.append((math.sin(ph1) + second * math.sin(ph2) * math.exp(-t / (decay * 0.5))) * a * vol)
    return out


def shift(x, sec): return [0.0] * int(SR * sec) + x


def mix(*tracks):
    n = max(len(t) for t in tracks); out = [0.0] * n
    for t in tracks:
        for i, v in enumerate(t): out[i] += v
    return out


def lowpass(x, fc=2200.0):
    a = 1 - math.exp(-2 * math.pi * fc / SR); y = []; p = 0.0
    for v in x:
        p += a * (v - p); y.append(p)
    return y


def air(x, delay=0.085, gain=0.22, taps=2):
    """A tiny soft echo, not a reverb: two quiet repeats, each darker than the last."""
    n = len(x) + int(SR * delay * taps) + 200; out = x + [0.0] * (n - len(x)); cur = x
    for k in range(1, taps + 1):
        cur = lowpass(cur, 1500); off = int(SR * delay * k)
        for i, v in enumerate(cur): out[i + off] += v * gain ** k
    return out


def save(name, samples, peak=0.2):
    samples = lowpass(samples)
    m = max(abs(v) for v in samples) or 1.0; k = peak / m
    with wave.open(os.path.join(OUT, name + '.wav'), 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        n = len(samples); fade = int(SR * 0.006); frames = bytearray()
        for i, v in enumerate(samples):
            g = min(1.0, i / fade, (n - 1 - i) / fade)
            frames += struct.pack('<h', int(max(-1, min(1, v * k * g)) * 32767))
        w.writeframes(bytes(frames))
    print(name, round(len(samples) / SR, 2), 's')


os.makedirs(OUT, exist_ok=True)
# a click is a soft knock: one low round note that drops a little in pitch
save('click', tone(F['A5'], .05, 1.0, decay=.016, attack=.004, second=.08, glide=-.2), 0.18)
save('select', tone(F['C6'], .045, 1.0, decay=.014, attack=.004, second=.06, glide=-.1), 0.13)
# tabs: two soft notes, a small step up
save('tab', mix(tone(F['G4'], .13, 1.0, decay=.05), shift(tone(F['C5'], .15, .9, decay=.06), .055)), 0.20)
# switches: a gentle step up (on) or down (off)
save('toggle_on', mix(tone(F['E4'], .12, .8, decay=.05), shift(tone(F['A4'], .2, 1.0, decay=.09), .065)), 0.20)
save('toggle_off', mix(tone(F['A4'], .12, .8, decay=.05), shift(tone(F['E4'], .2, 1.0, decay=.09), .065)), 0.18)
# windows: a soft two-note rise to open, a fall to close
save('open', air(mix(tone(F['C5'], .2, .9, decay=.09), shift(tone(F['G5'], .26, 1.0, decay=.12), .07))), 0.20)
save('close', air(mix(tone(F['G5'], .16, .8, decay=.07), shift(tone(F['C5'], .24, 1.0, decay=.11), .06))), 0.18)
# launch: three rising notes, warm and calm
save('launch', air(mix(tone(F['C5'], .34, .9, decay=.15), shift(tone(F['E5'], .34, .9, decay=.15), .09), shift(tone(F['G5'], .55, 1.0, decay=.25), .18), tone(F['C4'], .6, .35, decay=.3, second=.05))), 0.22)
# start chime: four soft notes
save('launcher_start', air(mix(*[shift(tone(F[n], .6, .9, decay=.26), .16 * i) for i, n in enumerate(('C5', 'E5', 'G5', 'C6'))])), 0.20)
save('success', air(mix(tone(F['E5'], .14, .85, decay=.07), shift(tone(F['G5'], .16, .9, decay=.08), .08), shift(tone(F['C6'], .4, 1.0, decay=.18), .16))), 0.20)
save('error', mix(tone(F['A4'] * .5, .16, 1.0, decay=.07, second=.05), shift(tone(F['E4'] * .75, .24, .9, decay=.1, second=.05), .11)), 0.20)
save('notify', air(mix(tone(F['G5'], .14, .8, decay=.06), shift(tone(F['D5'] * 1.5, .3, .9, decay=.14), .1))), 0.17)
save('pixel', tone(F['E5'], .04, 1.0, decay=.012, attack=.003, second=.05), 0.13)
save('join', air(mix(tone(F['G4'], .13, .8, decay=.06), shift(tone(F['D5'], .22, 1.0, decay=.1), .07))), 0.18)
save('leave', air(mix(tone(F['D5'], .13, .8, decay=.06), shift(tone(F['G4'], .22, 1.0, decay=.1), .07))), 0.17)
