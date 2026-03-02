// NPC sprite class for Stream King — HD sprite support with procedural fallback

class NPC extends Phaser.GameObjects.Container {
    constructor(scene, x, y, config) {
        super(scene, x, y);
        scene.add.existing(this);

        this.scene = scene;
        this.spawnX = x;
        this.spawnY = y;
        this.config = config;
        this.isSpecial = !!config.id;

        // Speed
        this.speed = config.speed || 40;

        // State machine
        this.state = 'idle';
        this.stateTimer = 0;

        // Patrol
        this.patrolType = config.patrol || 'stand';
        this.patrolRange = config.range || 0;
        this.patrolDir = 1;
        this.patrolOriginX = x;
        this.patrolOriginY = y;

        // Reactions
        this.chatBubble = null;
        this.chatTimer = 0;
        this.kickTimer = 0;
        this.reactionCooldown = 0;

        // Appearance — either from special config or randomized
        if (config.appearance) {
            this.isMale = config.appearance.isMale;
            this.clothingColor = config.appearance.clothingColor;
            const group = NPC_CONFIG.skinToneGroups.find(g => g.id === config.appearance.skinGroup);
            this.skinColor = group ? group.hex : 0xFFDBAC;
            this.hairColor = config.appearance.hairColor;
            this.hairStyle = config.appearance.hairStyle || 'normal';
            this.accessory = config.appearance.accessory || null;
            this.hairColors = group ? group.hairColors : [0x222222];
        } else {
            this.isMale = Math.random() > 0.5;
            const group = Phaser.Utils.Array.GetRandom(NPC_CONFIG.skinToneGroups);
            this.skinColor = group.hex;
            this.hairColors = group.hairColors;
            this.hairColor = Phaser.Utils.Array.GetRandom(group.hairColors);
            this.clothingColor = Phaser.Utils.Array.GetRandom(NPC_CONFIG.clothingColors);
            this.hairStyle = 'normal';
            this.accessory = null;
        }

        this.pantsColor = this.isMale
            ? Phaser.Utils.Array.GetRandom(NPC_CONFIG.pantsColors)
            : this.clothingColor;

        // Special NPC behavior
        this.specialBehavior = config.behavior || null;
        this.idleBubble = config.idleBubble || null;
        this.boxingTimer = 0;
        this.smugTimer = 0;
        this.frozenByPee = false;
        this.holyWaterActive = false;
        this.cupGraphic = null;

        // Indoor behavior flags
        this.isIndoorNPC = ['sitting_couch', 'eating', 'sleeping', 'on_toilet'].includes(this.specialBehavior);

        // Direction tracking for sprites
        this.facing = 'down';

        // Determine sprite type and check availability
        this.spriteType = this.determineSpriteType();
        this.useSprites = scene.textures.exists(`npc_${this.spriteType}_down_idle`);

        if (this.useSprites) {
            this.createSpriteBody();
        } else {
            this.createProceduralBody();
        }

        // Apply indoor pose after body is built
        if (this.isIndoorNPC) {
            this.applyIndoorPose();
        }

        // Physics body
        scene.physics.world.enable(this);
        this.body.setSize(24, 36);
        this.body.setOffset(-12, -18);
        this.body.setCollideWorldBounds(true);

        this.setDepth(5);

        // Start patrol if configured
        if (this.patrolType !== 'stand') {
            this.state = 'patrol';
        }

        // Show idle chat bubble for certain special NPCs
        if (this.idleBubble) {
            this.scene.time.delayedCall(500, () => {
                if (this.state === 'idle' || this.state === 'patrol') {
                    this.showChatBubble(this.idleBubble);
                    this.chatTimer = 999999;
                }
            });
        }

        // Backdrop (e.g. Ukraine flag wall for Putin)
        if (config.backdrop === 'ukraine_flag') {
            this.createBackdrop();
        }
    }

    // ==================== SPRITE TYPE DETERMINATION ====================

    determineSpriteType() {
        // Special NPCs have dedicated sprite sets
        if (this.isSpecial) {
            return NPC.SPECIAL_SPRITE_MAP[this.config.id] || 'male_casual';
        }

        // Indoor NPCs use generic type
        // Generic NPCs: determine type from gender + random formal/casual
        if (this.isMale) {
            return Math.random() > 0.5 ? 'male_formal' : 'male_casual';
        }
        return Math.random() > 0.5 ? 'female_formal' : 'female_casual';
    }

    // ==================== SPRITE RENDERING ====================

    createSpriteBody() {
        // Check for indoor pose texture first
        if (this.isIndoorNPC) {
            const poseKey = `npc_${this.spriteType}_${this.specialBehavior}`;
            if (this.scene.textures.exists(poseKey)) {
                this.bodySprite = this.scene.add.sprite(0, 0, poseKey);
                this.add(this.bodySprite);
                this.setupSpriteOverlays();
                return;
            }
        }

        const key = `npc_${this.spriteType}_down_idle`;
        this.bodySprite = this.scene.add.sprite(0, 0, key);

        // Tint generic NPCs for variety (skip for special NPCs with baked appearance)
        if (!this.isSpecial) {
            this.bodySprite.setTint(this.clothingColor);
        }

        this.add(this.bodySprite);

        // Walk animation state
        this._isWalking = false;
        this.walkFrame = false;
        this.walkTimer = 0;
        this.walkInterval = 200;

        this.setupSpriteOverlays();
    }

    setupSpriteOverlays() {
        // Fallen state overlay (hidden)
        this.fallenX = this.scene.add.text(0, 0, 'X   X', {
            fontSize: '8px', color: '#000000', fontFamily: 'Arial',
        }).setOrigin(0.5);
        this.fallenX.setVisible(false);
        this.add(this.fallenX);
    }

    getSpriteKey(action) {
        const prefix = `npc_${this.spriteType}`;

        if (action === 'fallen') return `${prefix}_fallen`;
        if (action === 'flee') return `${prefix}_flee`;
        if (action === 'kick') return `${prefix}_kick`;

        const dir = this.facing === 'right' ? 'left' : this.facing;
        const frame = this.walkFrame ? 'walk' : 'idle';
        return `${prefix}_${dir}_${frame}`;
    }

    updateSpriteTexture(action) {
        if (!this.bodySprite) return;
        const key = this.getSpriteKey(action);
        if (this.scene.textures.exists(key)) {
            this.bodySprite.setTexture(key);
        }
        this.bodySprite.setFlipX(this.facing === 'right');
    }

    updateFacingFromVelocity() {
        if (!this.body) return;
        const vx = this.body.velocity.x;
        const vy = this.body.velocity.y;
        if (Math.abs(vx) < 5 && Math.abs(vy) < 5) return;

        if (Math.abs(vx) > Math.abs(vy)) {
            this.facing = vx > 0 ? 'right' : 'left';
        } else {
            this.facing = vy > 0 ? 'down' : 'up';
        }
    }

    // ==================== PROCEDURAL FALLBACK ====================

    createProceduralBody() {
        const torsoW = 20;
        const torsoH = this.isMale ? 20 : 18;

        // Arms (behind torso)
        this.leftArm = this.scene.add.rectangle(-13, 2, 6, 14, this.skinColor);
        this.leftArm.setStrokeStyle(1, 0x000000);
        this.rightArm = this.scene.add.rectangle(13, 2, 6, 14, this.skinColor);
        this.rightArm.setStrokeStyle(1, 0x000000);
        this.add(this.leftArm);
        this.add(this.rightArm);

        // Legs
        this.leftLeg = this.scene.add.rectangle(-5, 18, 8, 14, this.pantsColor);
        this.leftLeg.setStrokeStyle(1, 0x000000);
        this.rightLeg = this.scene.add.rectangle(5, 18, 8, 14, this.pantsColor);
        this.rightLeg.setStrokeStyle(1, 0x000000);
        this.add(this.leftLeg);
        this.add(this.rightLeg);

        // Shoes
        this.leftShoe = this.scene.add.rectangle(-5, 26, 9, 4, 0x333333);
        this.rightShoe = this.scene.add.rectangle(5, 26, 9, 4, 0x333333);
        this.add(this.leftShoe);
        this.add(this.rightShoe);

        // Torso
        this.torso = this.scene.add.rectangle(0, 2, torsoW, torsoH, this.clothingColor);
        this.torso.setStrokeStyle(2, 0x000000);
        this.add(this.torso);

        // Suit jacket overlay
        if (this.accessory === 'suit') {
            const jacket = this.scene.add.rectangle(0, 2, torsoW + 2, torsoH, this.clothingColor);
            jacket.setStrokeStyle(2, 0x000000);
            this.add(jacket);
            const gfx = this.scene.add.graphics();
            gfx.lineStyle(1, 0xFFFFFF, 0.4);
            gfx.lineBetween(0, -6, -4, 4);
            gfx.lineBetween(0, -6, 4, 4);
            this.add(gfx);
        }

        // Skirt for females
        if (!this.isMale) {
            const skirt = this.scene.add.triangle(0, 16, -10, 0, 10, 0, 0, 10, this.clothingColor);
            skirt.setStrokeStyle(1, 0x000000);
            this.add(skirt);
        }

        // Head
        this.head = this.scene.add.circle(0, -14, 9, this.skinColor);
        this.head.setStrokeStyle(2, 0x000000);
        this.add(this.head);

        // Hair
        this.drawHair();

        // Eyes
        this.leftEye = this.scene.add.circle(-3, -15, 1.5, 0x000000);
        this.rightEye = this.scene.add.circle(3, -15, 1.5, 0x000000);
        this.add(this.leftEye);
        this.add(this.rightEye);

        // Mouth
        const mouth = this.scene.add.rectangle(0, -10, 4, 1, 0x000000);
        this.add(mouth);

        // Special accessories
        this.drawAccessories();

        if (this.accessory === 'walker') {
            this.drawWalker();
        }

        if (this.specialBehavior === 'smug') {
            mouth.setSize(5, 1);
            mouth.x = 1;
            const brow = this.scene.add.rectangle(3, -17, 4, 1, 0x000000);
            brow.setAngle(-10);
            this.add(brow);
        }

        // Fallen state overlay (hidden)
        this.fallenX = this.scene.add.text(0, 0, 'X   X', {
            fontSize: '8px', color: '#000000', fontFamily: 'Arial',
        }).setOrigin(0.5);
        this.fallenX.setVisible(false);
        this.add(this.fallenX);
    }

    drawHair() {
        switch (this.hairStyle) {
            case 'bun': {
                const base = this.scene.add.ellipse(0, -19, 18, 10, this.hairColor);
                base.setStrokeStyle(1, 0x000000);
                this.add(base);
                const bun = this.scene.add.circle(0, -24, 5, this.hairColor);
                bun.setStrokeStyle(1, 0x000000);
                this.add(bun);
                break;
            }
            case 'cap': {
                const cap = this.scene.add.ellipse(0, -21, 14, 8, 0xF5F5F0);
                cap.setStrokeStyle(1, 0xCCCCCC);
                this.add(cap);
                break;
            }
            case 'balding': {
                const left = this.scene.add.ellipse(-7, -17, 6, 6, this.hairColor);
                left.setStrokeStyle(1, 0x000000);
                const right = this.scene.add.ellipse(7, -17, 6, 6, this.hairColor);
                right.setStrokeStyle(1, 0x000000);
                this.add(left);
                this.add(right);
                break;
            }
            case 'mustache': {
                const hair = this.scene.add.ellipse(0, -19, 18, 10, this.hairColor);
                hair.setStrokeStyle(1, 0x000000);
                this.add(hair);
                const stache = this.scene.add.ellipse(0, -11, 10, 4, this.hairColor);
                stache.setStrokeStyle(1, 0x000000);
                this.add(stache);
                break;
            }
            case 'receding': {
                const hair = this.scene.add.ellipse(0, -20, 16, 6, this.hairColor);
                hair.setStrokeStyle(1, 0x000000);
                this.add(hair);
                break;
            }
            case 'pompadour': {
                const base = this.scene.add.ellipse(0, -19, 18, 10, this.hairColor);
                base.setStrokeStyle(1, 0x000000);
                this.add(base);
                const top = this.scene.add.ellipse(0, -24, 14, 8, this.hairColor);
                top.setStrokeStyle(1, 0x000000);
                this.add(top);
                break;
            }
            default: {
                const hair = this.scene.add.ellipse(0, -19, 18, 10, this.hairColor);
                hair.setStrokeStyle(1, 0x000000);
                this.add(hair);
                if (!this.isMale) {
                    const leftHair = this.scene.add.ellipse(-8, -13, 5, 12, this.hairColor);
                    leftHair.setStrokeStyle(1, 0x000000);
                    const rightHair = this.scene.add.ellipse(8, -13, 5, 12, this.hairColor);
                    rightHair.setStrokeStyle(1, 0x000000);
                    this.add(leftHair);
                    this.add(rightHair);
                }
                break;
            }
        }
    }

    drawAccessories() {
        if (this.accessory === 'glasses') {
            const gfx = this.scene.add.graphics();
            gfx.lineStyle(1.5, 0x000000);
            gfx.strokeCircle(-3, -15, 3);
            gfx.strokeCircle(3, -15, 3);
            gfx.lineBetween(0, -15, 0, -15);
            gfx.lineBetween(-6, -15, -8, -14);
            gfx.lineBetween(6, -15, 8, -14);
            this.add(gfx);
        }
        if (this.accessory === 'hat_tall') {
            const gfx = this.scene.add.graphics();
            gfx.fillStyle(0xF5F5F0);
            gfx.lineStyle(1.5, 0xCCAA44);
            gfx.fillRect(-6, -32, 12, 14);
            gfx.strokeRect(-6, -32, 12, 14);
            gfx.fillTriangle(-6, -32, 0, -40, 6, -32);
            gfx.strokeTriangle(-6, -32, 0, -40, 6, -32);
            gfx.fillStyle(0xCCAA44);
            gfx.fillRect(-6, -20, 12, 3);
            this.add(gfx);
        }
    }

    drawWalker() {
        const gfx = this.scene.add.graphics();
        gfx.lineStyle(2, 0x999999);
        gfx.strokeRect(-14, 8, 28, 20);
        gfx.lineBetween(-14, 28, -14, 34);
        gfx.lineBetween(14, 28, 14, 34);
        gfx.lineBetween(-14, 8, -14, 14);
        gfx.lineBetween(14, 8, 14, 14);
        gfx.fillStyle(0xCCFF00);
        gfx.fillCircle(-14, 34, 3);
        gfx.fillCircle(14, 34, 3);
        this.add(gfx);
        this.walkerGfx = gfx;
    }

    createBackdrop() {
        // Check for decoration image first
        if (this.scene.textures.exists('deco_ukraine_flag')) {
            const flag = this.scene.add.image(this.x, this.y - 20, 'deco_ukraine_flag');
            flag.setDepth(3);
            this.backdrop = flag;
            return;
        }

        // Procedural fallback
        const gfx = this.scene.add.graphics();
        gfx.setDepth(3);
        const bx = this.x - 40;
        const by = this.y - 50;
        const bw = 80;
        const bh = 60;
        gfx.fillStyle(0x8D6E63);
        gfx.fillRect(bx, by, bw, bh);
        gfx.lineStyle(1, 0x6D4C41);
        gfx.strokeRect(bx, by, bw, bh);
        gfx.fillStyle(0x0057B7);
        gfx.fillRect(bx + 5, by + 5, bw - 10, (bh - 10) / 2);
        gfx.fillStyle(0xFFD700);
        gfx.fillRect(bx + 5, by + 5 + (bh - 10) / 2, bw - 10, (bh - 10) / 2);
        gfx.lineStyle(1, 0x6D4C41, 0.3);
        for (let row = 0; row < 4; row++) {
            const ry = by + row * 15;
            gfx.lineBetween(bx, ry, bx + bw, ry);
            const offset = row % 2 === 0 ? 0 : 20;
            for (let col = 0; col < 4; col++) {
                gfx.lineBetween(bx + offset + col * 24, ry, bx + offset + col * 24, ry + 15);
            }
        }
        this.backdrop = gfx;
    }

    // ==================== SHARED METHODS ====================

    applyIndoorPose() {
        if (this.useSprites) {
            // Sprite mode: pose is already handled by the pose texture
            // Just add ZZZ for sleeping
            if (this.specialBehavior === 'sleeping') {
                this.sleepZzz = this.scene.add.text(8, -25, 'Zzz', {
                    fontSize: '10px', fontFamily: 'Arial', color: '#6666FF',
                    fontStyle: 'italic',
                }).setOrigin(0.5);
                this.add(this.sleepZzz);
            }
            return;
        }

        // Procedural indoor poses
        switch (this.specialBehavior) {
            case 'sitting_couch':
                this.leftLeg.setVisible(false);
                this.rightLeg.setVisible(false);
                this.leftShoe.y = 18;
                this.rightShoe.y = 18;
                this.torso.y = 6;
                break;
            case 'eating':
                this.leftArm.y = -2;
                this.leftArm.x = -10;
                this.rightArm.y = -2;
                this.rightArm.x = 10;
                break;
            case 'sleeping':
                this.setAngle(90);
                this.leftEye.setVisible(false);
                this.rightEye.setVisible(false);
                this.sleepZzz = this.scene.add.text(8, -25, 'Zzz', {
                    fontSize: '10px', fontFamily: 'Arial', color: '#6666FF',
                    fontStyle: 'italic',
                }).setOrigin(0.5);
                this.add(this.sleepZzz);
                break;
            case 'on_toilet':
                this.leftLeg.setVisible(false);
                this.rightLeg.setVisible(false);
                this.leftShoe.y = 14;
                this.rightShoe.y = 14;
                this.leftShoe.x = -7;
                this.rightShoe.x = 7;
                this.torso.y = 4;
                break;
        }
    }

    showChatBubble(text) {
        this.clearChatBubble();

        const padding = 8;
        const maxWidth = 160;

        const chatText = this.scene.add.text(0, -42, text, {
            fontSize: '11px',
            fontFamily: 'Arial',
            color: '#000000',
            align: 'center',
            wordWrap: { width: maxWidth - padding * 2 },
        }).setOrigin(0.5, 1);

        const bounds = chatText.getBounds();
        const bgWidth = Math.max(bounds.width + padding * 2, 40);
        const bgHeight = bounds.height + padding * 2;

        const bg = this.scene.add.graphics();
        bg.fillStyle(0xFFFFFF, 0.95);
        bg.lineStyle(2, 0x000000);
        bg.fillRoundedRect(-bgWidth / 2, -42 - bgHeight, bgWidth, bgHeight, 8);
        bg.strokeRoundedRect(-bgWidth / 2, -42 - bgHeight, bgWidth, bgHeight, 8);
        bg.fillStyle(0xFFFFFF, 0.95);
        bg.fillTriangle(0, -38, -6, -42, 6, -42);
        bg.lineStyle(2, 0x000000);
        bg.lineBetween(0, -38, -6, -42);
        bg.lineBetween(0, -38, 6, -42);

        this.add(bg);
        this.add(chatText);

        this.chatBubble = { bg, text: chatText };
        this.chatTimer = 2000;
    }

    clearChatBubble() {
        if (this.chatBubble) {
            this.chatBubble.bg.destroy();
            this.chatBubble.text.destroy();
            this.chatBubble = null;
        }
    }

    setFallen() {
        if (this.useSprites) {
            this.updateSpriteTexture('fallen');
        } else {
            this.setAngle(90);
            this.leftEye.setVisible(false);
            this.rightEye.setVisible(false);
        }
        this.fallenX.setVisible(true);
        this.fallenX.y = -15;
    }

    setStanding() {
        if (this.useSprites) {
            this.updateSpriteTexture();
        } else {
            this.setAngle(0);
            this.leftEye.setVisible(true);
            this.rightEye.setVisible(true);
        }
        this.fallenX.setVisible(false);
    }

    reactPositive() {
        if (this.state === 'attacked' || this.state === 'fleeing' || this.state === 'leaving') return;
        if (this.reactionCooldown > 0) return;
        if (this.specialBehavior === 'holy_water') return;

        if (this.specialBehavior === 'stops_when_peed_on') {
            this.frozenByPee = true;
            this.body.setVelocity(0, 0);
        }

        this.state = 'positive';
        this.body.setVelocity(0, 0);
        const msg = Phaser.Utils.Array.GetRandom(NPC_CONFIG.positiveReactions);
        this.showChatBubble(msg);
        this.reactionCooldown = 1500;
    }

    reactAngry() {
        if (this.state === 'attacked' || this.state === 'fleeing' || this.state === 'leaving') return;
        if (this.reactionCooldown > 0) return;
        if (this.specialBehavior === 'holy_water') return;

        this.frozenByPee = false;
        this.state = 'angry';
        this.body.setVelocity(0, 0);
        const msg = Phaser.Utils.Array.GetRandom(NPC_CONFIG.angryReactions);
        this.showChatBubble(msg);
        this.reactionCooldown = 1000;
    }

    startHolyWater() {
        if (this.state === 'attacked' || this.state === 'fleeing' || this.state === 'leaving') return;
        if (this.holyWaterActive) return;

        this.holyWaterActive = true;
        this.state = 'positive';
        this.body.setVelocity(0, 0);
        this.showChatBubble("Holy Water!");
        this.chatTimer = 999999;

        if (!this.cupGraphic) {
            const cup = this.scene.add.graphics();
            cup.fillStyle(0xDDDDDD);
            cup.fillRect(14, -2, 8, 12);
            cup.lineStyle(1.5, 0x999999);
            cup.strokeRect(14, -2, 8, 12);
            cup.lineStyle(1.5, 0x999999);
            cup.strokeCircle(24, 4, 4);
            cup.fillStyle(0xFFE066, 0.7);
            cup.fillRect(15, 2, 6, 7);
            this.add(cup);
            this.cupGraphic = cup;
        }
        this.cupGraphic.setVisible(true);
    }

    stopHolyWater() {
        if (!this.holyWaterActive) return;
        this.holyWaterActive = false;
        this.clearChatBubble();
        if (this.cupGraphic) {
            this.cupGraphic.setVisible(false);
        }
        this.state = 'idle';
    }

    startKicking(dogX, dogY) {
        if (this.state === 'attacked' || this.state === 'fleeing' || this.state === 'leaving') return;
        this.state = 'kicking';
        this.kickTimer = 800;

        const angle = Phaser.Math.Angle.Between(this.x, this.y, dogX, dogY);
        this.body.setVelocity(
            Math.cos(angle) * 80,
            Math.sin(angle) * 80
        );

        if (this.useSprites) {
            this.updateSpriteTexture('kick');
        }
    }

    flee(fromX, fromY) {
        if (this.state === 'attacked' || this.state === 'leaving') return;

        this.state = 'fleeing';
        this.frozenByPee = false;
        this.clearChatBubble();

        const angle = Phaser.Math.Angle.Between(fromX, fromY, this.x, this.y);
        const spread = (Math.random() - 0.5) * 0.8;
        this.body.setVelocity(
            Math.cos(angle + spread) * 200,
            Math.sin(angle + spread) * 200
        );

        this.showChatBubble("AHHH!");

        if (this.useSprites) {
            this.updateSpriteTexture('flee');
        }

        this.scene.time.delayedCall(3000, () => {
            if (this.state === 'fleeing') {
                this.despawn();
            }
        });
    }

    getAttacked() {
        this.state = 'attacked';
        this.frozenByPee = false;
        this.body.setVelocity(0, 0);
        this.setFallen();
        this.showAttackedReaction();
    }

    showAttackedReaction() {
        if (this.state !== 'attacked') return;
        const msg = Phaser.Utils.Array.GetRandom(NPC_CONFIG.attackedReactions);
        this.showChatBubble(msg);
        this.attackedReactionTimer = this.scene.time.delayedCall(1500, () => {
            this.showAttackedReaction();
        });
    }

    leaveAfterAttack(dogX, dogY) {
        this.state = 'leaving';
        this.setStanding();
        this.clearChatBubble();
        if (this.attackedReactionTimer) {
            this.attackedReactionTimer.remove();
        }

        const angle = Phaser.Math.Angle.Between(dogX, dogY, this.x, this.y);
        this.body.setVelocity(
            Math.cos(angle) * 60,
            Math.sin(angle) * 60
        );

        this.scene.time.delayedCall(4000, () => {
            this.despawn();
        });
    }

    despawn() {
        this.clearChatBubble();
        if (this.attackedReactionTimer) {
            this.attackedReactionTimer.remove();
        }
        if (this.backdrop) {
            this.backdrop.destroy();
        }

        const spawnX = this.spawnX;
        const spawnY = this.spawnY;
        const config = this.config;
        const scene = this.scene;

        this.destroy();

        scene.time.delayedCall(8000 + Math.random() * 5000, () => {
            if (scene.scene.isActive()) {
                scene.spawnNPC(spawnX, spawnY, config);
            }
        });
    }

    update(time, delta) {
        // Update timers
        if (this.chatTimer > 0 && this.chatTimer < 999990) {
            this.chatTimer -= delta;
            if (this.chatTimer <= 0) {
                this.clearChatBubble();
            }
        }

        if (this.reactionCooldown > 0) {
            this.reactionCooldown -= delta;
        }

        if (this.kickTimer > 0) {
            this.kickTimer -= delta;
            if (this.kickTimer <= 0 && this.state === 'kicking') {
                this.state = 'angry';
                this.body.setVelocity(0, 0);
            }
        }

        // Patrol behavior (skip if frozen)
        if ((this.state === 'idle' || this.state === 'patrol') && !this.frozenByPee) {
            this.updatePatrol(delta);
        }

        // Direction + walk animation (sprite mode)
        if (this.useSprites && this.state !== 'attacked') {
            const isMoving = this.body && (Math.abs(this.body.velocity.x) > 5 || Math.abs(this.body.velocity.y) > 5);

            if (isMoving && this.state !== 'fleeing') {
                this.updateFacingFromVelocity();
                this.walkTimer += delta;
                if (this.walkTimer >= this.walkInterval) {
                    this.walkTimer = 0;
                    this.walkFrame = !this.walkFrame;
                }
                this.updateSpriteTexture();
            } else if (!isMoving && this.state !== 'fleeing') {
                this.walkFrame = false;
                this.walkTimer = 0;
                if (this.state !== 'kicking') {
                    this.updateSpriteTexture();
                }
            }
        }

        // Special behavior animations (procedural mode)
        if (!this.useSprites) {
            this.updateSpecialBehavior(time, delta);

            // Procedural walk animation
            if (this.body && (Math.abs(this.body.velocity.x) > 5 || Math.abs(this.body.velocity.y) > 5)) {
                const bobAmount = Math.sin(time * 0.01) * 2;
                this.leftLeg.y = 18 + bobAmount;
                this.rightLeg.y = 18 - bobAmount;
                this.leftShoe.y = 26 + bobAmount;
                this.rightShoe.y = 26 - bobAmount;
            }
        }

        // Sleep ZZZ animation (both modes)
        if (this.sleepZzz && (this.state === 'idle' || this.state === 'patrol')) {
            this.sleepZzz.y = -25 + Math.sin(time * 0.003) * 3;
            this.sleepZzz.alpha = 0.5 + Math.sin(time * 0.002) * 0.5;
        }
    }

    updateSpecialBehavior(time, delta) {
        if (this.state === 'attacked' || this.state === 'fleeing' || this.state === 'leaving') return;

        switch (this.specialBehavior) {
            case 'boxing': {
                if (this.state === 'patrol' || this.state === 'idle') {
                    this.boxingTimer += delta;
                    const punch = Math.sin(this.boxingTimer * 0.008) * 8;
                    this.leftArm.y = 2 + punch;
                    this.rightArm.y = 2 - punch;
                    this.leftArm.x = -13 - Math.abs(punch) * 0.5;
                    this.rightArm.x = 13 + Math.abs(punch) * 0.5;
                }
                break;
            }
            case 'authoritative': {
                if (this.state === 'idle') {
                    this.leftArm.x = -15;
                    this.rightArm.x = 15;
                    this.leftArm.y = 6;
                    this.rightArm.y = 6;
                }
                break;
            }
            case 'smug': {
                this.smugTimer += delta;
                if (this.state === 'idle') {
                    this.head.x = Math.sin(this.smugTimer * 0.001) * 1;
                }
                break;
            }
            case 'eating': {
                if (this.state === 'idle') {
                    const eat = Math.sin(time * 0.005) * 2;
                    this.rightArm.y = -2 + eat;
                }
                break;
            }
        }
    }

    updatePatrol(delta) {
        if (this.patrolType === 'stand') return;

        if (this.patrolType === 'horizontal') {
            const targetX = this.patrolOriginX + (this.patrolDir * this.patrolRange);
            if (Math.abs(this.x - targetX) < 5) {
                this.patrolDir *= -1;
                this.body.setVelocity(0, 0);
                this.state = 'idle';
                this.scene.time.delayedCall(1000 + Math.random() * 1000, () => {
                    if ((this.state === 'idle') && this.active && !this.frozenByPee) {
                        this.state = 'patrol';
                    }
                });
            } else {
                this.body.setVelocityX(this.patrolDir * this.speed);
            }
        } else if (this.patrolType === 'vertical') {
            const targetY = this.patrolOriginY + (this.patrolDir * this.patrolRange);
            if (Math.abs(this.y - targetY) < 5) {
                this.patrolDir *= -1;
                this.body.setVelocity(0, 0);
                this.state = 'idle';
                this.scene.time.delayedCall(1000 + Math.random() * 1000, () => {
                    if ((this.state === 'idle') && this.active && !this.frozenByPee) {
                        this.state = 'patrol';
                    }
                });
            } else {
                this.body.setVelocityY(this.patrolDir * this.speed);
            }
        }
    }
}

// Special NPC ID to sprite type mapping
NPC.SPECIAL_SPRITE_MAP = {
    'old_lady': 'old_lady',
    'pope_guy': 'pope',
    'prince_andy': 'prince',
    'teddy_r': 'teddy',
    'vlad': 'vlad',
    'dear_leader': 'dear_leader',
};
