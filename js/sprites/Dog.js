// Dog sprite class for Stream King — HD sprite support with procedural fallback

class Dog extends Phaser.GameObjects.Container {
    constructor(scene, x, y, dogConfig) {
        super(scene, x, y);
        scene.add.existing(this);

        this.scene = scene;

        // Load breed config (fallback to golden retriever defaults)
        dogConfig = dogConfig || { breedId: 'golden_retriever', colorId: 'gold', sizeId: 'medium', patternId: 'solid' };
        this.breed = getBreedById(dogConfig.breedId) || DOG_BREEDS.breeds[0];
        this.coatColor = getColorById(dogConfig.colorId) || DOG_BREEDS.colors[4];
        this.sizeConfig = getSizeById(dogConfig.sizeId) || DOG_BREEDS.sizes[1];
        this.pattern = this.breed.patterns.find(p => p.id === dogConfig.patternId) || this.breed.patterns[0];

        this.speed = this.sizeConfig.speed;
        this.isPeeing = false;
        this.isAttacking = false;
        this.attackCooldown = false;
        this.facing = 'down';
        this.knockbackTimer = 0;

        // Scaled dimensions (used for physics body regardless of render mode)
        const s = this.sizeConfig.scale;
        this.bodyWidth = this.breed.bodyWidth * s;
        this.bodyHeight = this.breed.bodyHeight * s;
        this.mainColor = this.coatColor.hex;
        this.accentColor = this.coatColor.accent;

        // Map breed ID to sprite key prefix
        this.spriteBreed = Dog.BREED_SPRITE_MAP[this.breed.id] || 'golden';

        // Check if HD sprites are available
        this.useSprites = scene.textures.exists(`dog_${this.spriteBreed}_down_idle`);

        if (this.useSprites) {
            this.createSpriteBody();
        } else {
            this.patternColors = this.computePatternColors();
            this.createProceduralBody();
            this.createProceduralAnimations();
        }

        // Physics body
        scene.physics.world.enable(this);
        this.body.setSize(this.bodyWidth, this.bodyHeight);
        this.body.setOffset(-this.bodyWidth / 2, -this.bodyHeight / 2);
        this.body.setCollideWorldBounds(true);

        this.setDepth(10);
    }

    // ==================== SPRITE RENDERING ====================

    createSpriteBody() {
        const s = this.sizeConfig.scale;
        const key = `dog_${this.spriteBreed}_down_idle`;

        this.bodySprite = this.scene.add.sprite(0, 0, key);
        this.bodySprite.setScale(s);

        // Tint if not using breed's default color
        this.applyCoatTint();

        this.add(this.bodySprite);

        // Walk animation state
        this._isWalking = false;
        this.walkFrame = false; // false = idle, true = walk
        this.walkTimer = 0;
        this.walkInterval = 150;

        // Attack indicator
        this.attackIndicator = this.scene.add.text(0, -30 * s, '!', {
            fontSize: `${Math.round(18 * s)}px`,
            fontFamily: 'Arial Black',
            color: '#FF0000',
            stroke: '#000000',
            strokeThickness: 3,
        }).setOrigin(0.5);
        this.attackIndicator.setVisible(false);
        this.add(this.attackIndicator);
    }

    applyCoatTint() {
        if (!this.bodySprite) return;
        if (this.coatColor.id !== this.breed.defaultColor) {
            this.bodySprite.setTint(this.coatColor.hex);
        } else {
            this.bodySprite.clearTint();
        }
    }

    getSpriteKey(action) {
        const prefix = `dog_${this.spriteBreed}`;
        if (action === 'pee') return `${prefix}_pee`;
        if (action === 'attack') return `${prefix}_attack`;

        const dir = this.facing === 'right' ? 'left' : this.facing;
        const frame = this.walkFrame ? 'walk' : 'idle';
        return `${prefix}_${dir}_${frame}`;
    }

    updateSpriteTexture(action) {
        const key = this.getSpriteKey(action);
        if (this.scene.textures.exists(key)) {
            this.bodySprite.setTexture(key);
        }
        this.bodySprite.setFlipX(this.facing === 'right');
    }

    // ==================== PROCEDURAL FALLBACK ====================

    createProceduralBody() {
        const s = this.sizeConfig.scale;
        const bw = this.bodyWidth;
        const bh = this.bodyHeight;
        const pc = this.patternColors;

        // Legs (4 small rects, drawn first so body overlaps)
        this.legs = [];
        const legH = this.breed.legHeight * s;
        const legW = this.breed.legWidth * s;
        const legSpreadX = bw * 0.35;
        const legPositions = [
            { x: -legSpreadX, y: -bh * 0.15 },
            { x: legSpreadX, y: -bh * 0.15 },
            { x: -legSpreadX, y: bh * 0.25 },
            { x: legSpreadX, y: bh * 0.25 },
        ];
        this.legBaseY = legPositions.map(p => p.y);

        for (const pos of legPositions) {
            const leg = this.scene.add.rectangle(pos.x, pos.y, legW, legH, pc.legs);
            leg.setStrokeStyle(1, 0x000000);
            this.add(leg);
            this.legs.push(leg);
        }

        // Main body
        if (this.breed.fluffy) {
            this.bodySprite = this.scene.add.ellipse(0, 0, bw + 4, bh + 4, pc.body);
        } else {
            this.bodySprite = this.scene.add.rectangle(0, 0, bw, bh, pc.body);
        }
        this.bodySprite.setStrokeStyle(2, 0x000000);
        this.add(this.bodySprite);

        // Pattern overlays
        if (pc.belly) {
            const belly = this.scene.add.rectangle(0, bh * 0.15, bw * 0.65, bh * 0.35, pc.belly);
            belly.setAlpha(0.7);
            this.add(belly);
        }
        if (pc.back) {
            const back = this.scene.add.rectangle(0, -bh * 0.2, bw * 0.85, bh * 0.25, pc.back);
            back.setAlpha(0.6);
            this.add(back);
        }

        // Brindle stripes
        if (pc.brindle) {
            const gfx = this.scene.add.graphics();
            const stripeColor = this.adjustColor(pc.body, -60);
            gfx.lineStyle(2, stripeColor, 0.5);
            for (let i = 0; i < 5; i++) {
                const sx = -bw * 0.3 + i * bw * 0.15;
                gfx.lineBetween(sx, -bh * 0.3, sx + 2, bh * 0.3);
            }
            this.add(gfx);
        }

        // Dalmatian spots
        if (pc.spots) {
            const gfx = this.scene.add.graphics();
            gfx.fillStyle(0x111111);
            const seed = this.breed.id.length * 7;
            for (let i = 0; i < pc.spots; i++) {
                const a = Math.sin(seed + i * 3.7) * 0.5;
                const b = Math.cos(seed + i * 2.3) * 0.5;
                gfx.fillCircle(a * bw * 0.7, b * bh * 0.7, 2 + Math.abs(Math.sin(i * 1.3)) * 3);
            }
            this.add(gfx);
        }

        // Head
        const hr = this.breed.headRadius * s;
        const headY = -bh / 2 - hr * 0.4;

        // Ears (behind head)
        this.drawEars(hr, headY, s, pc);

        if (this.breed.fluffy || this.breed.poodleCut) {
            this.headSprite = this.scene.add.circle(0, headY, hr + 3, pc.head);
            this.headSprite.setStrokeStyle(2, 0x000000);
            this.add(this.headSprite);
            if (this.breed.poodleCut) {
                const poof = this.scene.add.circle(0, headY - hr * 0.6, hr * 0.6, pc.head);
                poof.setStrokeStyle(1, 0x000000);
                this.add(poof);
            }
        } else {
            this.headSprite = this.scene.add.circle(0, headY, hr, pc.head);
            this.headSprite.setStrokeStyle(2, 0x000000);
            this.add(this.headSprite);
        }

        // Snout
        const snoutLen = this.breed.snoutLength === 'long' ? 5 : this.breed.snoutLength === 'short' ? 2.5 : 3.5;
        const snout = this.scene.add.ellipse(0, headY + hr * 0.35, hr * 0.65, snoutLen * s, pc.head);
        this.add(snout);

        // Eyes
        const eyeSpread = hr * 0.4;
        this.leftEye = this.scene.add.circle(-eyeSpread, headY - hr * 0.15, 2 * s, 0x000000);
        this.rightEye = this.scene.add.circle(eyeSpread, headY - hr * 0.15, 2 * s, 0x000000);
        this.add(this.leftEye);
        this.add(this.rightEye);

        // Nose
        this.nose = this.scene.add.circle(0, headY + hr * 0.2, 2 * s, 0x222222);
        this.add(this.nose);

        // Tail
        this.drawTail(bw, bh, s, pc);

        // Pee leg indicator (hidden by default)
        this.peeLeg = this.scene.add.rectangle(legSpreadX + legW, bh * 0.2, legW + 2, legH * 0.6, pc.legs);
        this.peeLeg.setStrokeStyle(1, 0x000000);
        this.peeLeg.setVisible(false);
        this.peeLeg.setAngle(-30);
        this.add(this.peeLeg);

        // Attack indicator
        this.attackIndicator = this.scene.add.text(0, headY - hr - 10, '!', {
            fontSize: `${Math.round(18 * s)}px`,
            fontFamily: 'Arial Black',
            color: '#FF0000',
            stroke: '#000000',
            strokeThickness: 3,
        }).setOrigin(0.5);
        this.attackIndicator.setVisible(false);
        this.add(this.attackIndicator);
    }

    drawEars(hr, headY, s, colors) {
        const earColor = colors.head;
        switch (this.breed.earType) {
            case 'pointy': {
                const gfx = this.scene.add.graphics();
                gfx.fillStyle(earColor);
                gfx.lineStyle(2, 0x000000);
                gfx.fillTriangle(-hr * 0.7, headY - hr * 0.3, -hr * 0.4, headY - hr * 1.1, -hr * 0.1, headY - hr * 0.3);
                gfx.strokeTriangle(-hr * 0.7, headY - hr * 0.3, -hr * 0.4, headY - hr * 1.1, -hr * 0.1, headY - hr * 0.3);
                gfx.fillTriangle(hr * 0.1, headY - hr * 0.3, hr * 0.4, headY - hr * 1.1, hr * 0.7, headY - hr * 0.3);
                gfx.strokeTriangle(hr * 0.1, headY - hr * 0.3, hr * 0.4, headY - hr * 1.1, hr * 0.7, headY - hr * 0.3);
                this.add(gfx);
                break;
            }
            case 'floppy': {
                const le = this.scene.add.ellipse(-hr * 0.8, headY + hr * 0.1, 6 * s, 10 * s, earColor);
                le.setStrokeStyle(1, 0x000000);
                const re = this.scene.add.ellipse(hr * 0.8, headY + hr * 0.1, 6 * s, 10 * s, earColor);
                re.setStrokeStyle(1, 0x000000);
                this.add(le);
                this.add(re);
                break;
            }
            case 'small': {
                const le = this.scene.add.ellipse(-hr * 0.5, headY - hr * 0.6, 5 * s, 6 * s, earColor);
                le.setStrokeStyle(1, 0x000000);
                const re = this.scene.add.ellipse(hr * 0.5, headY - hr * 0.6, 5 * s, 6 * s, earColor);
                re.setStrokeStyle(1, 0x000000);
                this.add(le);
                this.add(re);
                break;
            }
        }
    }

    drawTail(bw, bh, s, colors) {
        const tailColor = colors.body;
        const tailX = bw * 0.3;
        const tailY = bh * 0.4;

        switch (this.breed.tailType) {
            case 'long':
                this.tail = this.scene.add.rectangle(tailX, tailY, 4 * s, 14 * s, tailColor);
                this.tail.setStrokeStyle(1, 0x000000);
                break;
            case 'short':
                this.tail = this.scene.add.rectangle(tailX, tailY - 2, 4 * s, 8 * s, tailColor);
                this.tail.setStrokeStyle(1, 0x000000);
                break;
            case 'curly':
                this.tail = this.scene.add.circle(tailX + 2, tailY, 5 * s, tailColor);
                this.tail.setStrokeStyle(1, 0x000000);
                break;
            case 'stub':
                this.tail = this.scene.add.circle(0, bh * 0.48, 3 * s, tailColor);
                this.tail.setStrokeStyle(1, 0x000000);
                break;
        }
        this.add(this.tail);
    }

    createProceduralAnimations() {
        this.walkTween = null;
        this.tailWag = this.scene.tweens.add({
            targets: this.tail,
            angle: { from: -15, to: 15 },
            duration: 200,
            yoyo: true,
            repeat: -1,
        });
    }

    computePatternColors() {
        const main = this.mainColor;
        const accent = this.accentColor;
        const lighter = this.adjustColor(main, 40);
        const darker = this.adjustColor(main, -50);

        switch (this.pattern.applyFn) {
            case 'solid':
                return { body: main, head: main, legs: accent, belly: null, back: null };
            case 'lighterBelly':
                return { body: main, head: main, legs: accent, belly: lighter, back: null };
            case 'darkerBack':
                return { body: main, head: main, legs: accent, belly: null, back: darker };
            case 'blackAndTan':
                return { body: 0x222222, head: main, legs: main, belly: main, back: null };
            case 'sable':
                return { body: main, head: main, legs: accent, belly: null, back: 0x333333 };
            case 'allBlack':
                return { body: 0x222222, head: 0x222222, legs: 0x333333, belly: null, back: null };
            case 'tricolor':
                return { body: main, head: main, legs: 0xF5F5F0, belly: 0xF5F5F0, back: 0x222222 };
            case 'chestPatch':
                return { body: main, head: main, legs: accent, belly: 0xF5F5F0, back: null };
            case 'brindle':
                return { body: main, head: main, legs: accent, belly: null, back: null, brindle: true };
            case 'dalmatianSpots':
                return { body: 0xF5F5F0, head: 0xF5F5F0, legs: 0xE8E8E0, belly: null, back: null, spots: 7 };
            case 'dalmatianHeavy':
                return { body: 0xF5F5F0, head: 0xF5F5F0, legs: 0xE8E8E0, belly: null, back: null, spots: 12 };
            default:
                return { body: main, head: main, legs: accent, belly: null, back: null };
        }
    }

    adjustColor(color, amount) {
        let r = Math.max(0, Math.min(255, ((color >> 16) & 0xFF) + amount));
        let g = Math.max(0, Math.min(255, ((color >> 8) & 0xFF) + amount));
        let b = Math.max(0, Math.min(255, (color & 0xFF) + amount));
        return (r << 16) | (g << 8) | b;
    }

    // ==================== SHARED METHODS ====================

    updateFacing(vx, vy) {
        if (Math.abs(vx) > Math.abs(vy)) {
            this.facing = vx > 0 ? 'right' : 'left';
        } else if (vy !== 0) {
            this.facing = vy > 0 ? 'down' : 'up';
        }

        if (this.useSprites) {
            this.updateSpriteTexture();
        } else {
            switch (this.facing) {
                case 'up': this.setAngle(0); break;
                case 'down': this.setAngle(180); break;
                case 'left': this.setAngle(90); break;
                case 'right': this.setAngle(-90); break;
            }
        }
    }

    startWalking() {
        if (this.useSprites) {
            this._isWalking = true;
        } else {
            if (this.walkTween) return;
            this.walkTween = this.scene.tweens.add({
                targets: this.legs,
                y: (target, key, value, index) => {
                    const base = this.legBaseY[index];
                    return base + (index % 2 === 0 ? 4 : -4);
                },
                duration: 150,
                yoyo: true,
                repeat: -1,
            });
        }
    }

    stopWalking() {
        if (this.useSprites) {
            this._isWalking = false;
            this.walkFrame = false;
            this.updateSpriteTexture();
        } else {
            if (this.walkTween) {
                this.walkTween.stop();
                this.walkTween = null;
                for (let i = 0; i < this.legs.length; i++) {
                    this.legs[i].y = this.legBaseY[i];
                }
            }
        }
    }

    startPeeing() {
        if (this.isAttacking) return;
        this.isPeeing = true;
        this.body.setVelocity(0, 0);
        this.stopWalking();

        if (this.useSprites) {
            this.updateSpriteTexture('pee');
        } else {
            this.peeLeg.setVisible(true);
            this.legs[3].setVisible(false);
        }
    }

    stopPeeing() {
        this.isPeeing = false;

        if (this.useSprites) {
            this.updateSpriteTexture();
        } else {
            this.peeLeg.setVisible(false);
            this.legs[3].setVisible(true);
        }
    }

    startAttack() {
        if (this.attackCooldown || this.isPeeing) return;
        this.isAttacking = true;
        this.attackCooldown = true;
        soundManager.playBark();
        this.attackIndicator.setVisible(true);

        let lungeX = 0, lungeY = 0;
        const lungeForce = 300;
        switch (this.facing) {
            case 'up': lungeY = -lungeForce; break;
            case 'down': lungeY = lungeForce; break;
            case 'left': lungeX = -lungeForce; break;
            case 'right': lungeX = lungeForce; break;
        }
        this.body.setVelocity(lungeX, lungeY);

        if (this.useSprites) {
            this.updateSpriteTexture('attack');
            this.bodySprite.setTint(0xFF6633);
        } else {
            this.bodySprite.setFillStyle(0xFF6633);
        }

        this.scene.time.delayedCall(300, () => {
            this.isAttacking = false;
            this.attackIndicator.setVisible(false);
            if (this.useSprites) {
                this.applyCoatTint();
                this.updateSpriteTexture();
            } else {
                this.bodySprite.setFillStyle(this.patternColors.body);
            }
            this.body.setVelocity(0, 0);
        });

        this.scene.time.delayedCall(500, () => {
            this.attackCooldown = false;
        });
    }

    applyKnockback(fromX, fromY) {
        const angle = Phaser.Math.Angle.Between(fromX, fromY, this.x, this.y);
        const force = NPC_CONFIG.kickForce;
        this.body.setVelocity(Math.cos(angle) * force, Math.sin(angle) * force);
        this.knockbackTimer = 300;

        if (this.useSprites) {
            this.bodySprite.setTint(0xFF9999);
            this.scene.time.delayedCall(200, () => this.applyCoatTint());
        } else {
            const origColor = this.patternColors.body;
            this.bodySprite.setFillStyle(0xFF9999);
            this.scene.time.delayedCall(200, () => {
                this.bodySprite.setFillStyle(origColor);
            });
        }
    }

    getAttackHitbox() {
        const range = 40;
        let hx = this.x, hy = this.y;
        switch (this.facing) {
            case 'up': hy -= range; break;
            case 'down': hy += range; break;
            case 'left': hx -= range; break;
            case 'right': hx += range; break;
        }
        return { x: hx, y: hy, radius: 30 };
    }

    getPeePosition() {
        let px = this.x, py = this.y;
        switch (this.facing) {
            case 'up': px += 18; break;
            case 'down': px -= 18; break;
            case 'left': py -= 18; break;
            case 'right': py += 18; break;
        }
        return { x: px, y: py };
    }

    update(time, delta) {
        // Walk animation timer (sprite mode)
        if (this.useSprites && this._isWalking && !this.isPeeing && !this.isAttacking) {
            this.walkTimer += delta;
            if (this.walkTimer >= this.walkInterval) {
                this.walkTimer = 0;
                this.walkFrame = !this.walkFrame;
                this.updateSpriteTexture();
            }
        }

        if (this.knockbackTimer > 0) {
            this.knockbackTimer -= delta;
            if (this.knockbackTimer <= 0) {
                this.body.setVelocity(0, 0);
            }
        }
    }
}

// Breed ID to sprite filename prefix mapping
Dog.BREED_SPRITE_MAP = {
    'golden_retriever': 'golden',
    'german_shepherd': 'shepherd',
    'corgi': 'corgi',
    'pitbull': 'pitbull',
    'dalmatian': 'dalmatian',
    'cockapoo': 'cockapoo',
    'toy_poodle': 'poodle',
};
