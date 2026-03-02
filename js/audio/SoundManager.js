// Procedural audio engine for Stream King — all sounds synthesized via Web Audio API

class SoundManager {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.musicGain = null;
        this.sfxGain = null;
        this.musicPlaying = false;
        this.musicScheduler = null;
        this.musicNodes = [];
        this.noiseBuffer = null;
        this.activePeeStream = null;
        this.loadSettings();
    }

    // Must be called from a user gesture (click/tap)
    init() {
        if (this.ctx) {
            if (this.ctx.state === 'suspended') this.ctx.resume();
            return;
        }
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();

        this.masterGain = this.ctx.createGain();
        this.masterGain.connect(this.ctx.destination);

        this.musicGain = this.ctx.createGain();
        this.musicGain.connect(this.masterGain);

        this.sfxGain = this.ctx.createGain();
        this.sfxGain.connect(this.masterGain);

        this.applyVolumes();
        this.generateNoiseBuffer();
    }

    generateNoiseBuffer() {
        const length = this.ctx.sampleRate * 2;
        this.noiseBuffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
        const data = this.noiseBuffer.getChannelData(0);
        for (let i = 0; i < length; i++) {
            data[i] = Math.random() * 2 - 1;
        }
    }

    // ==================== VOLUME CONTROLS ====================

    loadSettings() {
        try {
            const saved = localStorage.getItem('streamking_audio');
            if (saved) {
                const s = JSON.parse(saved);
                this.masterVolume = s.master ?? 0.7;
                this.musicVolume = s.music ?? 0.5;
                this.sfxVolume = s.sfx ?? 0.7;
                this.muted = s.muted ?? false;
            } else {
                this.setDefaults();
            }
        } catch {
            this.setDefaults();
        }
    }

    setDefaults() {
        this.masterVolume = 0.7;
        this.musicVolume = 0.5;
        this.sfxVolume = 0.7;
        this.muted = false;
    }

    saveSettings() {
        try {
            localStorage.setItem('streamking_audio', JSON.stringify({
                master: this.masterVolume,
                music: this.musicVolume,
                sfx: this.sfxVolume,
                muted: this.muted,
            }));
        } catch { /* ignore */ }
    }

    applyVolumes() {
        if (!this.ctx) return;
        const m = this.muted ? 0 : this.masterVolume;
        this.masterGain.gain.setValueAtTime(m, this.ctx.currentTime);
        this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
        this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
    }

    setMasterVolume(v) {
        this.masterVolume = v;
        this.applyVolumes();
        this.saveSettings();
    }

    setMusicVolume(v) {
        this.musicVolume = v;
        this.applyVolumes();
        this.saveSettings();
    }

    setSfxVolume(v) {
        this.sfxVolume = v;
        this.applyVolumes();
        this.saveSettings();
    }

    toggleMute() {
        this.muted = !this.muted;
        this.applyVolumes();
        this.saveSettings();
    }

    // ==================== UTILITY ====================

    createNoise(duration) {
        if (!this.ctx || !this.noiseBuffer) return null;
        const source = this.ctx.createBufferSource();
        source.buffer = this.noiseBuffer;
        source.loop = true;
        return source;
    }

    createOsc(type, freq) {
        if (!this.ctx) return null;
        const osc = this.ctx.createOscillator();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        return osc;
    }

    createEnvelope(attack, decay, sustain, release, duration) {
        if (!this.ctx) return null;
        const gain = this.ctx.createGain();
        const t = this.ctx.currentTime;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(1, t + attack);
        gain.gain.linearRampToValueAtTime(sustain, t + attack + decay);
        gain.gain.setValueAtTime(sustain, t + duration - release);
        gain.gain.linearRampToValueAtTime(0, t + duration);
        return gain;
    }

    // ==================== SOUND EFFECTS ====================

    playMenuClick() {
        if (!this.ctx) return;
        const osc = this.createOsc('sine', 1000);
        const gain = this.ctx.createGain();
        const t = this.ctx.currentTime;
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.08);
    }

    playBark() {
        if (!this.ctx) return;
        const t = this.ctx.currentTime;

        // First chirp
        const osc1 = this.createOsc('square', 420);
        const gain1 = this.ctx.createGain();
        gain1.gain.setValueAtTime(0.25, t);
        gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        osc1.frequency.setValueAtTime(420, t);
        osc1.frequency.linearRampToValueAtTime(320, t + 0.06);
        osc1.connect(gain1);
        gain1.connect(this.sfxGain);
        osc1.start(t);
        osc1.stop(t + 0.08);

        // Second chirp
        const osc2 = this.createOsc('square', 380);
        const gain2 = this.ctx.createGain();
        gain2.gain.setValueAtTime(0.3, t + 0.1);
        gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
        osc2.frequency.setValueAtTime(380, t + 0.1);
        osc2.frequency.linearRampToValueAtTime(260, t + 0.18);
        osc2.connect(gain2);
        gain2.connect(this.sfxGain);
        osc2.start(t + 0.1);
        osc2.stop(t + 0.22);
    }

    playPeeStream() {
        if (!this.ctx || this.activePeeStream) return;
        const noise = this.createNoise();
        if (!noise) return;

        const bandpass = this.ctx.createBiquadFilter();
        bandpass.type = 'bandpass';
        bandpass.frequency.setValueAtTime(800, this.ctx.currentTime);
        bandpass.Q.setValueAtTime(2, this.ctx.currentTime);

        const lowpass = this.ctx.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.setValueAtTime(1200, this.ctx.currentTime);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.15, this.ctx.currentTime + 0.1);

        noise.connect(bandpass);
        bandpass.connect(lowpass);
        lowpass.connect(gain);
        gain.connect(this.sfxGain);
        noise.start();

        this.activePeeStream = { noise, gain };
    }

    stopPeeStream() {
        if (!this.ctx || !this.activePeeStream) return;
        const { noise, gain } = this.activePeeStream;
        const t = this.ctx.currentTime;
        gain.gain.linearRampToValueAtTime(0, t + 0.08);
        noise.stop(t + 0.1);
        this.activePeeStream = null;
    }

    playPuddleSplash() {
        if (!this.ctx) return;
        const noise = this.createNoise();
        if (!noise) return;
        const t = this.ctx.currentTime;

        const bandpass = this.ctx.createBiquadFilter();
        bandpass.type = 'bandpass';
        bandpass.frequency.setValueAtTime(1000, t);
        bandpass.Q.setValueAtTime(1.5, t);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

        noise.connect(bandpass);
        bandpass.connect(gain);
        gain.connect(this.sfxGain);
        noise.start(t);
        noise.stop(t + 0.15);
    }

    playPositiveReaction() {
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        // Happy ascending two-tone chime
        const osc = this.createOsc('sine', 523);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.setValueAtTime(0.2, t + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        osc.frequency.setValueAtTime(523, t);        // C5
        osc.frequency.setValueAtTime(659, t + 0.12); // E5
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.35);
    }

    playAngryReaction() {
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        // Harsh buzzer
        const osc1 = this.createOsc('sawtooth', 150);
        const osc2 = this.createOsc('sawtooth', 155); // slight detune for roughness
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.setValueAtTime(0.2, t + 0.2);
        gain.gain.linearRampToValueAtTime(0, t + 0.3);
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.sfxGain);
        osc1.start(t);
        osc2.start(t);
        osc1.stop(t + 0.3);
        osc2.stop(t + 0.3);
    }

    playAttackedScream() {
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        // Descending warble
        const osc1 = this.createOsc('sine', 800);
        const osc2 = this.createOsc('sine', 810); // slight detune for warble
        osc1.frequency.linearRampToValueAtTime(200, t + 0.5);
        osc2.frequency.linearRampToValueAtTime(195, t + 0.5);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.25, t);
        gain.gain.linearRampToValueAtTime(0, t + 0.5);
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.sfxGain);
        osc1.start(t);
        osc2.start(t);
        osc1.stop(t + 0.5);
        osc2.stop(t + 0.5);
    }

    playFootstep() {
        if (!this.ctx) return;
        const noise = this.createNoise();
        if (!noise) return;
        const t = this.ctx.currentTime;

        const highpass = this.ctx.createBiquadFilter();
        highpass.type = 'highpass';
        highpass.frequency.setValueAtTime(2000, t);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.08, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

        noise.connect(highpass);
        highpass.connect(gain);
        gain.connect(this.sfxGain);
        noise.start(t);
        noise.stop(t + 0.04);
    }

    playDoorTransition() {
        if (!this.ctx) return;
        const noise = this.createNoise();
        if (!noise) return;
        const t = this.ctx.currentTime;

        const bandpass = this.ctx.createBiquadFilter();
        bandpass.type = 'bandpass';
        bandpass.frequency.setValueAtTime(500, t);
        bandpass.frequency.linearRampToValueAtTime(2000, t + 0.3);
        bandpass.Q.setValueAtTime(1, t);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.2, t + 0.1);
        gain.gain.linearRampToValueAtTime(0, t + 0.3);

        noise.connect(bandpass);
        bandpass.connect(gain);
        gain.connect(this.sfxGain);
        noise.start(t);
        noise.stop(t + 0.35);
    }

    playDuckScatter() {
        if (!this.ctx) return;
        // 3 rapid quacks with slight delays
        for (let i = 0; i < 3; i++) {
            const delay = i * 0.1;
            const t = this.ctx.currentTime + delay;
            const freq = 700 + Math.random() * 300;

            const osc = this.ctx.createOscillator();
            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, t);
            osc.frequency.linearRampToValueAtTime(freq * 0.6, t + 0.08);

            // Vibrato LFO
            const lfo = this.ctx.createOscillator();
            lfo.frequency.setValueAtTime(25, t);
            const lfoGain = this.ctx.createGain();
            lfoGain.gain.setValueAtTime(150, t);
            lfo.connect(lfoGain);
            lfoGain.connect(osc.frequency);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.15, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(t);
            lfo.start(t);
            osc.stop(t + 0.12);
            lfo.stop(t + 0.12);
        }
    }

    playAttackHit() {
        if (!this.ctx) return;
        const t = this.ctx.currentTime;

        // Low thump
        const osc = this.createOsc('sine', 80);
        const oscGain = this.ctx.createGain();
        oscGain.gain.setValueAtTime(0.4, t);
        oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        osc.connect(oscGain);
        oscGain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.12);

        // Noise impact layer
        const noise = this.createNoise();
        if (!noise) return;
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.15, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
        noise.connect(noiseGain);
        noiseGain.connect(this.sfxGain);
        noise.start(t);
        noise.stop(t + 0.07);
    }

    // ==================== BACKGROUND MUSIC ====================

    startMusic() {
        if (!this.ctx || this.musicPlaying) return;
        this.musicPlaying = true;

        // Note frequencies
        const N = {
            C4: 261.63, D4: 293.66, E4: 329.63, G4: 392.00, A4: 440.00,
            C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99,
            C3: 130.81, D3: 146.83, E3: 164.81, G3: 196.00, A3: 220.00,
        };

        // Bouncy pentatonic melody (8 bars at 120 BPM = 16 seconds)
        const beat = 0.5; // 120 BPM
        this.melody = [
            // Bar 1
            { f: N.C4, d: beat }, { f: N.E4, d: beat },
            { f: N.G4, d: beat }, { f: N.A4, d: beat },
            // Bar 2
            { f: N.G4, d: beat * 2 }, { f: N.E4, d: beat * 2 },
            // Bar 3
            { f: N.D4, d: beat }, { f: N.E4, d: beat },
            { f: N.G4, d: beat }, { f: N.E4, d: beat },
            // Bar 4
            { f: N.C4, d: beat * 2 }, { f: 0, d: beat * 2 }, // rest
            // Bar 5
            { f: N.E4, d: beat }, { f: N.G4, d: beat },
            { f: N.A4, d: beat }, { f: N.C5, d: beat },
            // Bar 6
            { f: N.A4, d: beat * 2 }, { f: N.G4, d: beat * 2 },
            // Bar 7
            { f: N.E4, d: beat }, { f: N.D4, d: beat },
            { f: N.C4, d: beat }, { f: N.D4, d: beat },
            // Bar 8
            { f: N.C4, d: beat * 3 }, { f: 0, d: beat }, // rest
        ];

        // Bass line (root notes, whole notes)
        this.bassLine = [
            { f: N.C3, d: beat * 4 },
            { f: N.C3, d: beat * 4 },
            { f: N.G3, d: beat * 4 },
            { f: N.C3, d: beat * 4 },
            { f: N.A3, d: beat * 4 },
            { f: N.E3, d: beat * 4 },
            { f: N.G3, d: beat * 4 },
            { f: N.C3, d: beat * 4 },
        ];

        this.melodyIndex = 0;
        this.bassIndex = 0;
        this.nextMelodyTime = this.ctx.currentTime + 0.1;
        this.nextBassTime = this.ctx.currentTime + 0.1;

        this.scheduleMusicAhead();
        this.musicScheduler = setInterval(() => this.scheduleMusicAhead(), 25);
    }

    scheduleMusicAhead() {
        if (!this.ctx || !this.musicPlaying) return;
        const lookAhead = 0.1; // schedule 100ms ahead

        while (this.nextMelodyTime < this.ctx.currentTime + lookAhead) {
            const note = this.melody[this.melodyIndex];
            if (note.f > 0) {
                this.scheduleNote('square', note.f, this.nextMelodyTime, note.d, 0.08);
            }
            this.nextMelodyTime += note.d;
            this.melodyIndex = (this.melodyIndex + 1) % this.melody.length;
        }

        while (this.nextBassTime < this.ctx.currentTime + lookAhead) {
            const note = this.bassLine[this.bassIndex];
            if (note.f > 0) {
                this.scheduleNote('triangle', note.f, this.nextBassTime, note.d, 0.12);
            }
            this.nextBassTime += note.d;
            this.bassIndex = (this.bassIndex + 1) % this.bassLine.length;
        }
    }

    scheduleNote(type, freq, time, duration, volume) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, time);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(volume, time + 0.01);
        gain.gain.setValueAtTime(volume, time + duration - 0.02);
        gain.gain.linearRampToValueAtTime(0, time + duration);

        osc.connect(gain);
        gain.connect(this.musicGain);
        osc.start(time);
        osc.stop(time + duration);
    }

    stopMusic() {
        this.musicPlaying = false;
        if (this.musicScheduler) {
            clearInterval(this.musicScheduler);
            this.musicScheduler = null;
        }
    }
}

// Global instance
const soundManager = new SoundManager();
