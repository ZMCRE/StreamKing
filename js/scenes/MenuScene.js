// Menu scene - title screen — HD sprite support with procedural fallback

class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    create() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Background
        if (this.textures.exists('ui_title_bg')) {
            this.add.image(width / 2, height / 2, 'ui_title_bg').setDisplaySize(width, height);
        } else {
            this.cameras.main.setBackgroundColor('#2B7A3D');
        }

        // Title
        const title = this.add.text(width / 2, height * 0.25, 'STREAM KING', {
            fontSize: '52px',
            fontFamily: 'Arial Black, Arial',
            color: '#FFD700',
            stroke: '#000000',
            strokeThickness: 6,
            shadow: {
                offsetX: 3,
                offsetY: 3,
                color: '#000000',
                blur: 5,
                fill: true,
            },
        }).setOrigin(0.5);

        // Pulsing title animation
        this.tweens.add({
            targets: title,
            scaleX: 1.05, scaleY: 1.05,
            duration: 1500, yoyo: true, repeat: -1,
            ease: 'Sine.easeInOut',
        });

        // Subtitle
        this.add.text(width / 2, height * 0.35, 'Every hydrant. Every leg. Every lawn.', {
            fontSize: '16px',
            fontFamily: 'Arial',
            color: '#FFFFFF',
            fontStyle: 'italic',
        }).setOrigin(0.5);

        // Dog mascot
        const cx = width / 2;
        const cy = height * 0.52;

        if (this.textures.exists('ui_mascot_dog')) {
            // HD mascot sprite
            const mascot = this.add.sprite(cx, cy, 'ui_mascot_dog');
            mascot.setScale(1.5);
        } else if (this.textures.exists('dog_golden_down_idle')) {
            // Use game dog sprite as mascot
            const mascot = this.add.sprite(cx, cy, 'dog_golden_down_idle');
            mascot.setScale(2);

            // Crown above dog
            this.drawCrown(cx, cy - 50);
        } else {
            // Procedural fallback dog
            this.drawProceduralDog(cx, cy);
        }

        // Play button
        if (this.textures.exists('ui_play_btn')) {
            const playImg = this.add.image(width / 2, height * 0.75, 'ui_play_btn').setInteractive();
            playImg.on('pointerover', () => {
                if (this.textures.exists('ui_play_btn_hover')) {
                    playImg.setTexture('ui_play_btn_hover');
                } else {
                    playImg.setTint(0xFFE44D);
                }
            });
            playImg.on('pointerout', () => {
                playImg.setTexture('ui_play_btn');
                playImg.clearTint();
            });
            playImg.on('pointerdown', () => {
                soundManager.init();
                soundManager.playMenuClick();
                soundManager.startMusic();
                this.scene.start('DogSelectScene');
            });
        } else {
            this.drawProceduralPlayButton(width, height);
        }

        // Controls info
        const isMobile = this.sys.game.device.input.touch && !this.sys.game.device.os.desktop;
        const controlsText = isMobile
            ? 'Joystick to move  |  PEE button  |  ATTACK button'
            : 'WASD / Arrows: Move  |  SPACE: Pee  |  F: Attack';

        this.add.text(width / 2, height * 0.85, controlsText, {
            fontSize: '13px',
            fontFamily: 'Arial',
            color: '#CCFFCC',
            align: 'center',
        }).setOrigin(0.5);

        // Settings & Credits buttons
        const settingsBtn = this.add.text(width / 2 - 70, height * 0.92, 'Settings', {
            fontSize: '14px', fontFamily: 'Arial', color: '#AADDAA',
        }).setOrigin(0.5).setInteractive();
        settingsBtn.on('pointerover', () => settingsBtn.setColor('#FFFFFF'));
        settingsBtn.on('pointerout', () => settingsBtn.setColor('#AADDAA'));
        settingsBtn.on('pointerdown', () => {
            soundManager.playMenuClick();
            this.scene.launch('SettingsScene');
        });

        const creditsBtn = this.add.text(width / 2 + 70, height * 0.92, 'Credits', {
            fontSize: '14px', fontFamily: 'Arial', color: '#AADDAA',
        }).setOrigin(0.5).setInteractive();
        creditsBtn.on('pointerover', () => creditsBtn.setColor('#FFFFFF'));
        creditsBtn.on('pointerout', () => creditsBtn.setColor('#AADDAA'));
        creditsBtn.on('pointerdown', () => {
            soundManager.playMenuClick();
            this.scene.start('CreditsScene');
        });

        // Version
        this.add.text(width / 2, height * 0.97, 'v1.0', {
            fontSize: '11px',
            fontFamily: 'Arial',
            color: '#88AA88',
        }).setOrigin(0.5);
    }

    drawCrown(cx, cy) {
        if (this.textures.exists('ui_crown')) {
            this.add.image(cx, cy - 5, 'ui_crown');
            return;
        }

        const crownGfx = this.add.graphics();
        crownGfx.fillStyle(0xFFD700);
        crownGfx.fillTriangle(cx - 12, cy, cx - 8, cy - 11, cx - 4, cy);
        crownGfx.fillTriangle(cx - 4, cy, cx, cy - 14, cx + 4, cy);
        crownGfx.fillTriangle(cx + 4, cy, cx + 8, cy - 11, cx + 12, cy);
        crownGfx.fillRect(cx - 12, cy, 24, 4);
        crownGfx.lineStyle(2, 0x000000);
        crownGfx.strokeRect(cx - 12, cy, 24, 4);
    }

    drawProceduralDog(cx, cy) {
        const dogPreview = this.add.graphics();

        // Body
        dogPreview.fillStyle(0xD4A96A);
        dogPreview.fillRect(cx - 20, cy - 20, 40, 50);
        dogPreview.lineStyle(3, 0x000000);
        dogPreview.strokeRect(cx - 20, cy - 20, 40, 50);

        // Head
        dogPreview.fillStyle(0xD4A96A);
        dogPreview.fillCircle(cx, cy - 30, 16);
        dogPreview.lineStyle(3, 0x000000);
        dogPreview.strokeCircle(cx, cy - 30, 16);

        // Eyes
        dogPreview.fillStyle(0x000000);
        dogPreview.fillCircle(cx - 6, cy - 33, 3);
        dogPreview.fillCircle(cx + 6, cy - 33, 3);

        // Nose
        dogPreview.fillStyle(0x333333);
        dogPreview.fillCircle(cx, cy - 26, 3);

        // Tongue (animated bob)
        const tongue = this.add.rectangle(cx, cy - 20, 6, 8, 0xFF6B8A);
        this.tweens.add({
            targets: tongue,
            y: cy - 17,
            duration: 500, yoyo: true, repeat: -1,
            ease: 'Sine.easeInOut',
        });

        // Tail (animated wag)
        const tail = this.add.rectangle(cx + 18, cy + 24, 6, 16, 0xC49555);
        tail.setStrokeStyle(2, 0x000000);
        this.tweens.add({
            targets: tail,
            angle: { from: -20, to: 20 },
            duration: 300, yoyo: true, repeat: -1,
            ease: 'Sine.easeInOut',
        });

        // Crown on dog
        this.drawCrown(cx, cy - 44);
    }

    drawProceduralPlayButton(width, height) {
        const playBtn = this.add.graphics();
        const btnX = width / 2 - 90;
        const btnY = height * 0.75 - 25;
        const btnW = 180;
        const btnH = 50;

        playBtn.fillStyle(0xFFD700);
        playBtn.fillRoundedRect(btnX, btnY, btnW, btnH, 12);
        playBtn.lineStyle(3, 0x000000);
        playBtn.strokeRoundedRect(btnX, btnY, btnW, btnH, 12);

        this.add.text(width / 2, height * 0.75, 'PLAY', {
            fontSize: '28px',
            fontFamily: 'Arial Black, Arial',
            color: '#000000',
        }).setOrigin(0.5);

        const hitZone = this.add.zone(width / 2, height * 0.75, btnW, btnH).setInteractive();

        hitZone.on('pointerover', () => {
            playBtn.clear();
            playBtn.fillStyle(0xFFE44D);
            playBtn.fillRoundedRect(btnX, btnY, btnW, btnH, 12);
            playBtn.lineStyle(3, 0x000000);
            playBtn.strokeRoundedRect(btnX, btnY, btnW, btnH, 12);
        });

        hitZone.on('pointerout', () => {
            playBtn.clear();
            playBtn.fillStyle(0xFFD700);
            playBtn.fillRoundedRect(btnX, btnY, btnW, btnH, 12);
            playBtn.lineStyle(3, 0x000000);
            playBtn.strokeRoundedRect(btnX, btnY, btnW, btnH, 12);
        });

        hitZone.on('pointerdown', () => {
            soundManager.init();
            soundManager.playMenuClick();
            soundManager.startMusic();
            this.scene.start('DogSelectScene');
        });
    }
}
