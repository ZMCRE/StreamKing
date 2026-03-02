// UI overlay scene - handles mobile controls and HUD — HD sprite support with procedural fallback

class UIScene extends Phaser.Scene {
    constructor() {
        super({ key: 'UIScene' });
    }

    create() {
        this.joystickVector = { x: 0, y: 0 };
        this.peePressed = false;
        this.attackJustPressed = false;

        // Detect if mobile/touch device
        this.isMobile = !this.sys.game.device.os.desktop;

        if (this.isMobile) {
            this.createMobileControls();
        }

        // HUD text
        this.controlsHint = this.add.text(10, 10, '', {
            fontSize: '12px',
            fontFamily: 'Arial',
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 2,
        }).setScrollFactor(0).setDepth(100);

        if (!this.isMobile) {
            this.controlsHint.setText('WASD: Move | SPACE: Pee (hold) | F: Attack');
        }

        // Fade out hint after a few seconds
        this.time.delayedCall(5000, () => {
            this.tweens.add({
                targets: this.controlsHint,
                alpha: 0,
                duration: 1000,
            });
        });

        // Settings/pause button (top-right)
        const width = this.cameras.main.width;

        if (this.textures.exists('ui_gear')) {
            const gearImg = this.add.image(width - 30, 20, 'ui_gear')
                .setScrollFactor(0).setDepth(100).setInteractive();
            gearImg.on('pointerover', () => gearImg.setTint(0xFFD700));
            gearImg.on('pointerout', () => gearImg.clearTint());
            gearImg.on('pointerdown', () => {
                soundManager.playMenuClick();
                this.scene.pause('GameScene');
                this.scene.launch('SettingsScene');
            });
        } else {
            const gearBtn = this.add.text(width - 30, 20, '\u2699', {
                fontSize: '28px', color: '#FFFFFF',
                stroke: '#000000', strokeThickness: 2,
            }).setOrigin(0.5).setScrollFactor(0).setDepth(100).setInteractive();

            gearBtn.on('pointerover', () => gearBtn.setColor('#FFD700'));
            gearBtn.on('pointerout', () => gearBtn.setColor('#FFFFFF'));
            gearBtn.on('pointerdown', () => {
                soundManager.playMenuClick();
                this.scene.pause('GameScene');
                this.scene.launch('SettingsScene');
            });
        }
    }

    createMobileControls() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // --- Virtual Joystick (bottom-left) ---
        const joyX = 90;
        const joyY = height - 90;
        const joyRadius = 60;
        const knobRadius = 25;

        // Joystick base
        if (this.textures.exists('ui_joystick_base')) {
            this.joyBase = this.add.image(joyX, joyY, 'ui_joystick_base')
                .setDisplaySize(joyRadius * 2, joyRadius * 2);
        } else {
            this.joyBase = this.add.circle(joyX, joyY, joyRadius, 0x000000, 0.3);
            this.joyBase.setStrokeStyle(2, 0xFFFFFF, 0.5);
        }
        this.joyBase.setScrollFactor(0).setDepth(100);

        // Joystick knob
        if (this.textures.exists('ui_joystick_knob')) {
            this.joyKnob = this.add.image(joyX, joyY, 'ui_joystick_knob')
                .setDisplaySize(knobRadius * 2, knobRadius * 2);
        } else {
            this.joyKnob = this.add.circle(joyX, joyY, knobRadius, 0xFFFFFF, 0.5);
        }
        this.joyKnob.setScrollFactor(0).setDepth(101);

        // Joystick touch zone (larger than visual)
        this.joyZone = this.add.zone(joyX, joyY, joyRadius * 3, joyRadius * 3)
            .setInteractive()
            .setScrollFactor(0)
            .setDepth(102);

        this.joyActive = false;

        this.joyZone.on('pointerdown', (pointer) => {
            this.joyActive = true;
            this.updateJoystick(pointer, joyX, joyY, joyRadius);
        });

        this.input.on('pointermove', (pointer) => {
            if (this.joyActive && pointer.isDown) {
                this.updateJoystick(pointer, joyX, joyY, joyRadius);
            }
        });

        this.input.on('pointerup', (pointer) => {
            // Check if this pointer was the joystick one
            if (this.joyActive) {
                this.joyActive = false;
                this.joyKnob.setPosition(joyX, joyY);
                this.joystickVector = { x: 0, y: 0 };
            }
        });

        // --- Pee Button (bottom-right, lower) ---
        const peeBtnX = width - 80;
        const peeBtnY = height - 70;
        const peeBtnR = 35;

        let peeBg;
        if (this.textures.exists('ui_btn_pee')) {
            peeBg = this.add.image(peeBtnX, peeBtnY, 'ui_btn_pee')
                .setDisplaySize(peeBtnR * 2, peeBtnR * 2);
            peeBg.setScrollFactor(0).setDepth(100);
        } else {
            peeBg = this.add.circle(peeBtnX, peeBtnY, peeBtnR, 0xFFE066, 0.7);
            peeBg.setStrokeStyle(3, 0x000000);
            peeBg.setScrollFactor(0).setDepth(100);

            this.add.text(peeBtnX, peeBtnY, 'PEE', {
                fontSize: '14px',
                fontFamily: 'Arial Black',
                color: '#000000',
            }).setOrigin(0.5).setScrollFactor(0).setDepth(101);
        }

        const usesPeeImage = this.textures.exists('ui_btn_pee');

        const peeZone = this.add.zone(peeBtnX, peeBtnY, peeBtnR * 2, peeBtnR * 2)
            .setInteractive()
            .setScrollFactor(0)
            .setDepth(102);

        peeZone.on('pointerdown', () => {
            this.peePressed = true;
            if (usesPeeImage) {
                peeBg.setTint(0xCCCC00);
            } else {
                peeBg.setFillStyle(0xFFCC00, 0.9);
            }
        });

        peeZone.on('pointerup', () => {
            this.peePressed = false;
            if (usesPeeImage) {
                peeBg.clearTint();
            } else {
                peeBg.setFillStyle(0xFFE066, 0.7);
            }
        });

        peeZone.on('pointerout', () => {
            this.peePressed = false;
            if (usesPeeImage) {
                peeBg.clearTint();
            } else {
                peeBg.setFillStyle(0xFFE066, 0.7);
            }
        });

        // --- Attack Button (bottom-right, upper) ---
        const atkBtnX = width - 80;
        const atkBtnY = height - 150;
        const atkBtnR = 30;

        let atkBg;
        if (this.textures.exists('ui_btn_attack')) {
            atkBg = this.add.image(atkBtnX, atkBtnY, 'ui_btn_attack')
                .setDisplaySize(atkBtnR * 2, atkBtnR * 2);
            atkBg.setScrollFactor(0).setDepth(100);
        } else {
            atkBg = this.add.circle(atkBtnX, atkBtnY, atkBtnR, 0xFF4444, 0.7);
            atkBg.setStrokeStyle(3, 0x000000);
            atkBg.setScrollFactor(0).setDepth(100);

            this.add.text(atkBtnX, atkBtnY, 'ATK', {
                fontSize: '13px',
                fontFamily: 'Arial Black',
                color: '#FFFFFF',
            }).setOrigin(0.5).setScrollFactor(0).setDepth(101);
        }

        const usesAtkImage = this.textures.exists('ui_btn_attack');

        const atkZone = this.add.zone(atkBtnX, atkBtnY, atkBtnR * 2, atkBtnR * 2)
            .setInteractive()
            .setScrollFactor(0)
            .setDepth(102);

        atkZone.on('pointerdown', () => {
            this.attackJustPressed = true;
            if (usesAtkImage) {
                atkBg.setTint(0xCC0000);
            } else {
                atkBg.setFillStyle(0xCC0000, 0.9);
            }
            // Reset after a frame so it behaves like "just pressed"
            this.time.delayedCall(100, () => {
                if (usesAtkImage) {
                    atkBg.clearTint();
                } else {
                    atkBg.setFillStyle(0xFF4444, 0.7);
                }
            });
        });
    }

    updateJoystick(pointer, baseX, baseY, maxRadius) {
        const dx = pointer.x - baseX;
        const dy = pointer.y - baseY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        let knobX, knobY;
        if (dist > maxRadius) {
            knobX = baseX + (dx / dist) * maxRadius;
            knobY = baseY + (dy / dist) * maxRadius;
        } else {
            knobX = pointer.x;
            knobY = pointer.y;
        }

        this.joyKnob.setPosition(knobX, knobY);

        // Normalize to -1..1
        const clampedDist = Math.min(dist, maxRadius);
        if (clampedDist > 10) { // deadzone
            this.joystickVector = {
                x: (dx / dist) * (clampedDist / maxRadius),
                y: (dy / dist) * (clampedDist / maxRadius),
            };
        } else {
            this.joystickVector = { x: 0, y: 0 };
        }
    }
}
