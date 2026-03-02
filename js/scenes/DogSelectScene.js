// Dog selection / customization scene — HD sprite support with procedural fallback

class DogSelectScene extends Phaser.Scene {
    constructor() {
        super({ key: 'DogSelectScene' });
    }

    create() {
        this.w = this.cameras.main.width;
        this.h = this.cameras.main.height;

        // Check if we have a background image
        if (this.textures.exists('ui_select_bg')) {
            this.add.image(this.w / 2, this.h / 2, 'ui_select_bg').setDisplaySize(this.w, this.h);
        } else {
            this.cameras.main.setBackgroundColor('#2E5A3E');
        }

        // Selection state
        this.selectedBreedIndex = 0;
        this.selectedColorIndex = 4; // gold
        this.selectedSizeIndex = 1;  // medium
        this.selectedPatternIndex = 0;

        this.buildUI();
        this.updatePreview();
    }

    buildUI() {
        // Title
        this.add.text(this.w / 2, 30, 'CHOOSE YOUR DOG', {
            fontSize: '28px',
            fontFamily: 'Arial Black, Arial',
            color: '#FFD700',
            stroke: '#000000',
            strokeThickness: 4,
        }).setOrigin(0.5);

        // --- Breed selector ---
        this.add.text(this.w / 2, 65, 'BREED', {
            fontSize: '14px', fontFamily: 'Arial', color: '#CCFFCC',
        }).setOrigin(0.5);

        this.breedLabel = this.add.text(this.w / 2, 88, '', {
            fontSize: '18px', fontFamily: 'Arial Black', color: '#FFFFFF',
            stroke: '#000000', strokeThickness: 2,
        }).setOrigin(0.5);

        this.makeArrowButtons(this.w / 2, 88, 120, () => {
            this.selectedBreedIndex = (this.selectedBreedIndex - 1 + DOG_BREEDS.breeds.length) % DOG_BREEDS.breeds.length;
            this.onBreedChanged();
        }, () => {
            this.selectedBreedIndex = (this.selectedBreedIndex + 1) % DOG_BREEDS.breeds.length;
            this.onBreedChanged();
        });

        // --- Preview area ---
        this.previewContainer = this.add.container(this.w / 2, 210);

        // Preview background circle
        const previewBg = this.add.circle(this.w / 2, 210, 70, 0x1A3D2A, 0.6);
        previewBg.setStrokeStyle(2, 0x44AA66);

        // --- Size selector ---
        this.add.text(this.w / 2, 310, 'SIZE', {
            fontSize: '14px', fontFamily: 'Arial', color: '#CCFFCC',
        }).setOrigin(0.5);

        this.sizeButtons = [];
        const sizeNames = ['S', 'M', 'L'];
        for (let i = 0; i < 3; i++) {
            const bx = this.w / 2 + (i - 1) * 60;
            const by = 338;

            const bg = this.add.circle(bx, by, 18, 0x44AA66);
            bg.setStrokeStyle(2, 0x000000);

            const label = this.add.text(bx, by, sizeNames[i], {
                fontSize: '16px', fontFamily: 'Arial Black', color: '#FFFFFF',
            }).setOrigin(0.5);

            const highlight = this.add.circle(bx, by, 22);
            highlight.setStrokeStyle(3, 0xFFD700);
            highlight.setVisible(i === this.selectedSizeIndex);

            const zone = this.add.zone(bx, by, 44, 44).setInteractive();
            zone.on('pointerdown', () => {
                soundManager.playMenuClick();
                this.selectedSizeIndex = i;
                this.updateSizeHighlights();
                this.updatePreview();
            });

            this.sizeButtons.push({ bg, label, highlight });
        }

        // --- GO button ---
        const goBtn = this.add.graphics();
        const goBtnX = this.w / 2 - 80;
        const goBtnY = this.h - 70;
        goBtn.fillStyle(0xFFD700);
        goBtn.fillRoundedRect(goBtnX, goBtnY, 160, 45, 12);
        goBtn.lineStyle(3, 0x000000);
        goBtn.strokeRoundedRect(goBtnX, goBtnY, 160, 45, 12);

        this.add.text(this.w / 2, this.h - 48, 'LET\'S GO!', {
            fontSize: '22px', fontFamily: 'Arial Black', color: '#000000',
        }).setOrigin(0.5);

        const goZone = this.add.zone(this.w / 2, this.h - 48, 160, 45).setInteractive();
        goZone.on('pointerover', () => {
            goBtn.clear();
            goBtn.fillStyle(0xFFE44D);
            goBtn.fillRoundedRect(goBtnX, goBtnY, 160, 45, 12);
            goBtn.lineStyle(3, 0x000000);
            goBtn.strokeRoundedRect(goBtnX, goBtnY, 160, 45, 12);
        });
        goZone.on('pointerout', () => {
            goBtn.clear();
            goBtn.fillStyle(0xFFD700);
            goBtn.fillRoundedRect(goBtnX, goBtnY, 160, 45, 12);
            goBtn.lineStyle(3, 0x000000);
            goBtn.strokeRoundedRect(goBtnX, goBtnY, 160, 45, 12);
        });
        goZone.on('pointerdown', () => {
            soundManager.playMenuClick();
            this.startGame();
        });

        // Back button
        const backZone = this.add.text(20, this.h - 30, '< Back', {
            fontSize: '14px', fontFamily: 'Arial', color: '#AADDAA',
        }).setInteractive();
        backZone.on('pointerdown', () => {
            soundManager.playMenuClick();
            this.scene.start('MenuScene');
        });

        // Initial highlights
        this.updateSizeHighlights();
    }

    makeArrowButtons(cx, cy, spread, onLeft, onRight) {
        const leftArrow = this.add.text(cx - spread, cy, '<', {
            fontSize: '24px', fontFamily: 'Arial Black', color: '#FFD700',
            stroke: '#000000', strokeThickness: 2,
        }).setOrigin(0.5).setInteractive();
        leftArrow.on('pointerdown', () => { soundManager.playMenuClick(); onLeft(); });

        const rightArrow = this.add.text(cx + spread, cy, '>', {
            fontSize: '24px', fontFamily: 'Arial Black', color: '#FFD700',
            stroke: '#000000', strokeThickness: 2,
        }).setOrigin(0.5).setInteractive();
        rightArrow.on('pointerdown', () => { soundManager.playMenuClick(); onRight(); });
    }

    onBreedChanged() {
        this.selectedPatternIndex = 0;
        this.updatePreview();
    }

    updateSizeHighlights() {
        for (let i = 0; i < this.sizeButtons.length; i++) {
            this.sizeButtons[i].highlight.setVisible(i === this.selectedSizeIndex);
        }
    }

    updatePreview() {
        const breed = DOG_BREEDS.breeds[this.selectedBreedIndex];
        const color = DOG_BREEDS.colors[this.selectedColorIndex];
        const size = DOG_BREEDS.sizes[this.selectedSizeIndex];
        const pattern = breed.patterns[this.selectedPatternIndex];

        // Update labels
        this.breedLabel.setText(breed.name);
        // Clear previous preview
        this.previewContainer.removeAll(true);

        // Check if HD sprites are available for this breed
        const spriteKey = Dog.BREED_SPRITE_MAP[breed.id] || 'golden';
        const textureKey = `dog_${spriteKey}_down_idle`;

        if (this.textures.exists(textureKey)) {
            // Show HD sprite preview scaled by size
            const sizeScales = { 0: 1.5, 1: 2.0, 2: 2.5 };
            const spriteScale = sizeScales[this.selectedSizeIndex] || 2.0;
            const sprite = this.add.sprite(0, 0, textureKey);
            sprite.setScale(spriteScale);
            this.previewContainer.add(sprite);
        } else {
            // Fallback to procedural preview
            this.drawProceduralPreview(breed, color, size, pattern);
        }
    }

    drawProceduralPreview(breed, color, size, pattern) {
        const scale = size.scale;
        const bw = breed.bodyWidth * scale;
        const bh = breed.bodyHeight * scale;
        const hr = breed.headRadius * scale;
        const lh = breed.legHeight * scale;
        const lw = breed.legWidth * scale;

        const mainColor = color.hex;
        const accentColor = color.accent;

        // Get pattern colors
        const patternColors = this.getPatternColors(pattern.applyFn, mainColor, accentColor);

        // Legs
        const legSpreadX = bw * 0.35;
        const legY = bh / 2;
        for (let i = 0; i < 4; i++) {
            const lx = (i % 2 === 0 ? -1 : 1) * legSpreadX;
            const ly = (i < 2 ? -bh * 0.15 : bh * 0.3) + legY * 0.2;
            const leg = this.add.rectangle(lx, ly, lw, lh, patternColors.legs);
            leg.setStrokeStyle(1, 0x000000);
            this.previewContainer.add(leg);
        }

        // Body
        if (breed.fluffy) {
            const body = this.add.ellipse(0, 0, bw + 4, bh + 4, patternColors.body);
            body.setStrokeStyle(2, 0x000000);
            this.previewContainer.add(body);
        } else {
            const body = this.add.rectangle(0, 0, bw, bh, patternColors.body);
            body.setStrokeStyle(2, 0x000000);
            this.previewContainer.add(body);
        }

        // Pattern overlay
        if (patternColors.overlay) {
            const overlay = this.add.rectangle(0, bh * 0.15, bw * 0.7, bh * 0.4, patternColors.overlay);
            overlay.setAlpha(0.7);
            this.previewContainer.add(overlay);
        }

        if (patternColors.backOverlay) {
            const back = this.add.rectangle(0, -bh * 0.2, bw * 0.9, bh * 0.3, patternColors.backOverlay);
            back.setAlpha(0.6);
            this.previewContainer.add(back);
        }

        // Spots for dalmatian
        if (pattern.applyFn === 'dalmatianSpots' || pattern.applyFn === 'dalmatianHeavy') {
            const spotCount = pattern.applyFn === 'dalmatianHeavy' ? 12 : 7;
            const gfx = this.add.graphics();
            gfx.fillStyle(0x111111);
            for (let i = 0; i < spotCount; i++) {
                const sx = (Math.random() - 0.5) * bw * 0.8;
                const sy = (Math.random() - 0.5) * bh * 0.8;
                const sr = 2 + Math.random() * 3;
                gfx.fillCircle(sx, sy, sr);
            }
            for (let i = 0; i < 3; i++) {
                const sx = (Math.random() - 0.5) * hr;
                const sy = -bh / 2 - hr * 0.5 + (Math.random() - 0.5) * hr * 0.8;
                gfx.fillCircle(sx, sy, 1.5 + Math.random() * 2);
            }
            this.previewContainer.add(gfx);
        }

        // Brindle stripes
        if (pattern.applyFn === 'brindle') {
            const gfx = this.add.graphics();
            gfx.lineStyle(2, Phaser.Display.Color.GetColor(
                Math.max(0, ((mainColor >> 16) & 0xFF) - 60),
                Math.max(0, ((mainColor >> 8) & 0xFF) - 60),
                Math.max(0, (mainColor & 0xFF) - 60)
            ), 0.5);
            for (let i = 0; i < 5; i++) {
                const sx = -bw * 0.3 + i * bw * 0.15;
                gfx.lineBetween(sx, -bh * 0.3, sx + 3, bh * 0.3);
            }
            this.previewContainer.add(gfx);
        }

        // Head
        const headY = -bh / 2 - hr * 0.4;
        if (breed.fluffy || breed.poodleCut) {
            const head = this.add.circle(0, headY, hr + 3, patternColors.head);
            head.setStrokeStyle(2, 0x000000);
            this.previewContainer.add(head);
            if (breed.poodleCut) {
                const poof = this.add.circle(0, headY - hr * 0.6, hr * 0.7, patternColors.head);
                poof.setStrokeStyle(1, 0x000000);
                this.previewContainer.add(poof);
            }
        } else {
            const head = this.add.circle(0, headY, hr, patternColors.head);
            head.setStrokeStyle(2, 0x000000);
            this.previewContainer.add(head);
        }

        // Ears
        this.drawEars(breed, hr, headY, scale, patternColors);

        // Snout
        const snoutLen = breed.snoutLength === 'long' ? 5 : breed.snoutLength === 'short' ? 2 : 3.5;
        const snout = this.add.ellipse(0, headY + hr * 0.4, hr * 0.7, snoutLen * scale, patternColors.head);
        this.previewContainer.add(snout);

        // Eyes
        const eyeSpread = hr * 0.4;
        const eyeY = headY - hr * 0.15;
        this.previewContainer.add(this.add.circle(-eyeSpread, eyeY, 2, 0x000000));
        this.previewContainer.add(this.add.circle(eyeSpread, eyeY, 2, 0x000000));

        // Nose
        this.previewContainer.add(this.add.circle(0, headY + hr * 0.25, 2, 0x222222));

        // Tongue
        const tongue = this.add.rectangle(0, headY + hr * 0.55, 4, 5 * scale, 0xFF6B8A);
        this.previewContainer.add(tongue);

        // Tail
        this.drawTail(breed, bw, bh, scale, patternColors);
    }

    drawEars(breed, hr, headY, scale, colors) {
        const earColor = colors.ears || colors.head;
        switch (breed.earType) {
            case 'pointy': {
                const gfx = this.add.graphics();
                gfx.fillStyle(earColor);
                gfx.lineStyle(2, 0x000000);
                gfx.fillTriangle(-hr * 0.7, headY - hr * 0.3, -hr * 0.4, headY - hr * 1.1, -hr * 0.1, headY - hr * 0.3);
                gfx.strokeTriangle(-hr * 0.7, headY - hr * 0.3, -hr * 0.4, headY - hr * 1.1, -hr * 0.1, headY - hr * 0.3);
                gfx.fillTriangle(hr * 0.1, headY - hr * 0.3, hr * 0.4, headY - hr * 1.1, hr * 0.7, headY - hr * 0.3);
                gfx.strokeTriangle(hr * 0.1, headY - hr * 0.3, hr * 0.4, headY - hr * 1.1, hr * 0.7, headY - hr * 0.3);
                this.previewContainer.add(gfx);
                break;
            }
            case 'floppy': {
                const leftEar = this.add.ellipse(-hr * 0.8, headY + hr * 0.1, 6 * scale, 10 * scale, earColor);
                leftEar.setStrokeStyle(1, 0x000000);
                const rightEar = this.add.ellipse(hr * 0.8, headY + hr * 0.1, 6 * scale, 10 * scale, earColor);
                rightEar.setStrokeStyle(1, 0x000000);
                this.previewContainer.add(leftEar);
                this.previewContainer.add(rightEar);
                break;
            }
            case 'small': {
                const leftEar = this.add.ellipse(-hr * 0.5, headY - hr * 0.6, 5 * scale, 6 * scale, earColor);
                leftEar.setStrokeStyle(1, 0x000000);
                const rightEar = this.add.ellipse(hr * 0.5, headY - hr * 0.6, 5 * scale, 6 * scale, earColor);
                rightEar.setStrokeStyle(1, 0x000000);
                this.previewContainer.add(leftEar);
                this.previewContainer.add(rightEar);
                break;
            }
        }
    }

    drawTail(breed, bw, bh, scale, colors) {
        const tailColor = colors.tail || colors.body;
        const tailX = bw * 0.3;
        const tailY = bh * 0.4;

        switch (breed.tailType) {
            case 'long': {
                const tail = this.add.rectangle(tailX, tailY, 4 * scale, 14 * scale, tailColor);
                tail.setStrokeStyle(1, 0x000000);
                tail.setAngle(15);
                this.previewContainer.add(tail);
                break;
            }
            case 'short': {
                const tail = this.add.rectangle(tailX, tailY - 2, 4 * scale, 8 * scale, tailColor);
                tail.setStrokeStyle(1, 0x000000);
                tail.setAngle(20);
                this.previewContainer.add(tail);
                break;
            }
            case 'curly': {
                const tail = this.add.circle(tailX + 2, tailY, 5 * scale, tailColor);
                tail.setStrokeStyle(1, 0x000000);
                this.previewContainer.add(tail);
                break;
            }
            case 'stub': {
                const tail = this.add.circle(0, bh * 0.5, 3 * scale, tailColor);
                tail.setStrokeStyle(1, 0x000000);
                this.previewContainer.add(tail);
                break;
            }
        }
    }

    getPatternColors(patternFn, mainColor, accentColor) {
        const lighterColor = this.lightenColor(mainColor, 40);
        const darkerColor = this.darkenColor(mainColor, 50);

        switch (patternFn) {
            case 'solid':
                return { body: mainColor, head: mainColor, legs: accentColor, ears: accentColor, tail: accentColor };
            case 'lighterBelly':
                return { body: mainColor, head: mainColor, legs: accentColor, ears: accentColor, tail: accentColor, overlay: lighterColor };
            case 'darkerBack':
                return { body: mainColor, head: mainColor, legs: accentColor, ears: darkerColor, tail: accentColor, backOverlay: darkerColor };
            case 'blackAndTan':
                return { body: 0x222222, head: mainColor, legs: mainColor, ears: 0x222222, tail: 0x222222, overlay: mainColor };
            case 'sable':
                return { body: mainColor, head: mainColor, legs: accentColor, ears: darkerColor, tail: darkerColor, backOverlay: 0x333333 };
            case 'allBlack':
                return { body: 0x222222, head: 0x222222, legs: 0x333333, ears: 0x222222, tail: 0x333333 };
            case 'tricolor':
                return { body: mainColor, head: mainColor, legs: 0xF5F5F0, ears: 0x222222, tail: accentColor, overlay: 0xF5F5F0, backOverlay: 0x222222 };
            case 'chestPatch':
                return { body: mainColor, head: mainColor, legs: accentColor, ears: accentColor, tail: accentColor, overlay: 0xF5F5F0 };
            case 'brindle':
                return { body: mainColor, head: mainColor, legs: accentColor, ears: accentColor, tail: accentColor };
            case 'dalmatianSpots':
            case 'dalmatianHeavy':
                return { body: 0xF5F5F0, head: 0xF5F5F0, legs: 0xE8E8E0, ears: 0xE8E8E0, tail: 0xF5F5F0 };
            default:
                return { body: mainColor, head: mainColor, legs: accentColor, ears: accentColor, tail: accentColor };
        }
    }

    lightenColor(color, amount) {
        let r = (color >> 16) & 0xFF;
        let g = (color >> 8) & 0xFF;
        let b = color & 0xFF;
        r = Math.min(255, r + amount);
        g = Math.min(255, g + amount);
        b = Math.min(255, b + amount);
        return (r << 16) | (g << 8) | b;
    }

    darkenColor(color, amount) {
        let r = (color >> 16) & 0xFF;
        let g = (color >> 8) & 0xFF;
        let b = color & 0xFF;
        r = Math.max(0, r - amount);
        g = Math.max(0, g - amount);
        b = Math.max(0, b - amount);
        return (r << 16) | (g << 8) | b;
    }

    startGame() {
        const breed = DOG_BREEDS.breeds[this.selectedBreedIndex];
        const color = DOG_BREEDS.colors[this.selectedColorIndex];
        const size = DOG_BREEDS.sizes[this.selectedSizeIndex];
        const pattern = breed.patterns[this.selectedPatternIndex];

        this.scene.start('GameScene', {
            dogConfig: {
                breedId: breed.id,
                colorId: color.id,
                sizeId: size.id,
                patternId: pattern.id,
            },
        });
    }
}
