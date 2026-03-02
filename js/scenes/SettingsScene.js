// Settings overlay scene — volume sliders, mute, controls reference

class SettingsScene extends Phaser.Scene {
    constructor() {
        super({ key: 'SettingsScene' });
    }

    create() {
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;

        // Semi-transparent dark background
        const bg = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.75);
        bg.setInteractive(); // blocks clicks to scenes below

        // Title
        this.add.text(w / 2, 40, 'SETTINGS', {
            fontSize: '32px', fontFamily: 'Arial Black', color: '#FFD700',
            stroke: '#000000', strokeThickness: 4,
        }).setOrigin(0.5);

        // Volume sliders
        this.createSlider(w / 2, 110, 'Master Volume', soundManager.masterVolume, (v) => {
            soundManager.setMasterVolume(v);
        });
        this.createSlider(w / 2, 180, 'Music Volume', soundManager.musicVolume, (v) => {
            soundManager.setMusicVolume(v);
        });
        this.createSlider(w / 2, 250, 'SFX Volume', soundManager.sfxVolume, (v) => {
            soundManager.setSfxVolume(v);
        });

        // Mute toggle
        this.muteBtn = this.add.text(w / 2, 310, '', {
            fontSize: '18px', fontFamily: 'Arial Black', color: '#FFFFFF',
            stroke: '#000000', strokeThickness: 2,
            backgroundColor: '#555555', padding: { x: 16, y: 8 },
        }).setOrigin(0.5).setInteractive();
        this.updateMuteLabel();

        this.muteBtn.on('pointerdown', () => {
            soundManager.toggleMute();
            this.updateMuteLabel();
            soundManager.playMenuClick();
        });

        // Controls reference
        this.add.text(w / 2, 375, 'CONTROLS', {
            fontSize: '16px', fontFamily: 'Arial Black', color: '#FFD700',
        }).setOrigin(0.5);

        const isMobile = this.sys.game.device.input.touch && !this.sys.game.device.os.desktop;
        const controlsText = isMobile
            ? 'Left Joystick: Move\nPEE Button (hold): Pee\nATK Button: Attack'
            : 'WASD / Arrows: Move\nSPACE (hold): Pee\nF: Attack';

        this.add.text(w / 2, 430, controlsText, {
            fontSize: '13px', fontFamily: 'Arial', color: '#CCCCCC',
            align: 'center', lineSpacing: 6,
        }).setOrigin(0.5);

        // Close button
        const closeBtn = this.add.text(w - 30, 20, 'X', {
            fontSize: '24px', fontFamily: 'Arial Black', color: '#FF4444',
            stroke: '#000000', strokeThickness: 2,
        }).setOrigin(0.5).setInteractive();

        closeBtn.on('pointerdown', () => {
            soundManager.playMenuClick();
            this.closeSettings();
        });

        // Also close with ESC
        this.input.keyboard.on('keydown-ESC', () => {
            this.closeSettings();
        });
    }

    updateMuteLabel() {
        this.muteBtn.setText(soundManager.muted ? 'UNMUTE' : 'MUTE');
    }

    closeSettings() {
        // Resume GameScene if it was paused
        if (this.scene.isPaused('GameScene')) {
            this.scene.resume('GameScene');
        }
        this.scene.stop('SettingsScene');
    }

    createSlider(cx, cy, label, initialValue, onChange) {
        const trackW = 200;
        const trackH = 8;
        const knobR = 12;
        const leftX = cx - trackW / 2;

        // Label
        this.add.text(cx, cy - 22, label, {
            fontSize: '14px', fontFamily: 'Arial', color: '#CCCCCC',
        }).setOrigin(0.5);

        // Track background
        const trackBg = this.add.rectangle(cx, cy, trackW, trackH, 0x444444);
        trackBg.setStrokeStyle(1, 0x666666);

        // Fill track
        const fill = this.add.rectangle(leftX, cy, trackW * initialValue, trackH, 0xFFD700);
        fill.setOrigin(0, 0.5);

        // Knob
        const knobX = leftX + trackW * initialValue;
        const knob = this.add.circle(knobX, cy, knobR, 0xFFD700);
        knob.setStrokeStyle(2, 0x000000);

        // Value text
        const valText = this.add.text(cx + trackW / 2 + 30, cy, Math.round(initialValue * 100) + '%', {
            fontSize: '13px', fontFamily: 'Arial', color: '#FFFFFF',
        }).setOrigin(0.5);

        // Interactive zone over full track
        const zone = this.add.zone(cx, cy, trackW + knobR * 2, knobR * 3).setInteractive();
        let dragging = false;

        const updateSlider = (pointerX) => {
            const pct = Phaser.Math.Clamp((pointerX - leftX) / trackW, 0, 1);
            knob.x = leftX + trackW * pct;
            fill.displayWidth = trackW * pct;
            valText.setText(Math.round(pct * 100) + '%');
            onChange(pct);
        };

        zone.on('pointerdown', (pointer) => {
            dragging = true;
            updateSlider(pointer.x);
        });

        this.input.on('pointermove', (pointer) => {
            if (dragging) updateSlider(pointer.x);
        });

        this.input.on('pointerup', () => {
            dragging = false;
        });
    }
}
