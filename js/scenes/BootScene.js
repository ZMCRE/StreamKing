// Boot scene - loads HD art assets with procedural fallbacks

class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
        this.failedTiles = new Set();
    }

    preload() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        this.add.text(width / 2, height / 2, 'Loading...', {
            fontSize: '24px', fontFamily: 'Arial', color: '#FFFFFF',
        }).setOrigin(0.5);

        // Tile texture names (order matches tile indices 0-15)
        this.tileNames = [
            'grass', 'sidewalk', 'road', 'wall', 'roof', 'darkgrass',
            'water', 'woodfloor', 'door', 'churchwall', 'churchroof',
            'intwall', 'tilefloor', 'carpet', 'patio', 'exitdoor'
        ];

        // Attempt to load HD tile textures
        for (const name of this.tileNames) {
            this.load.image(name, `assets/tiles/${name}.png`);
        }

        // Track load failures so we can generate procedural fallbacks
        this.load.on('filefailed', (key) => {
            this.failedTiles.add(key);
        });

        // Load dog sprites (Phase 2)
        this.loadDogSprites();

        // Load NPC sprites (Phase 3)
        this.loadNPCSprites();

        // Load decoration images (Phase 4)
        this.loadDecorations();

        // Load UI images (Phase 5)
        this.loadUIAssets();
    }

    create() {
        // Generate procedural fallbacks for any tiles that failed to load
        if (this.failedTiles.size > 0) {
            this.generateFallbackTiles();
        }

        this.scene.start('MenuScene');
    }

    // --- Phase 2: Dog sprite loading ---
    loadDogSprites() {
        const breeds = ['golden', 'shepherd', 'corgi', 'pitbull', 'dalmatian', 'cockapoo', 'poodle'];
        const frames = ['down_idle', 'down_walk', 'up_idle', 'up_walk', 'left_idle', 'left_walk', 'pee', 'attack'];

        for (const breed of breeds) {
            for (const frame of frames) {
                this.load.image(`dog_${breed}_${frame}`, `assets/sprites/dogs/${breed}_${frame}.png`);
            }
        }
    }

    // --- Phase 3: NPC sprite loading ---
    loadNPCSprites() {
        // Generic NPC types
        const genericTypes = ['male_casual', 'male_formal', 'female_casual', 'female_formal'];
        const npcFrames = ['down_idle', 'down_walk', 'up_idle', 'up_walk', 'left_idle', 'left_walk', 'fallen', 'flee', 'kick'];

        for (const type of genericTypes) {
            for (const frame of npcFrames) {
                this.load.image(`npc_${type}_${frame}`, `assets/sprites/npcs/${type}_${frame}.png`);
            }
        }

        // Special NPCs
        const specialNPCs = ['old_lady', 'pope', 'prince', 'teddy', 'dear_leader'];
        for (const npc of specialNPCs) {
            for (const frame of npcFrames) {
                this.load.image(`npc_${npc}_${frame}`, `assets/sprites/npcs/${npc}_${frame}.png`);
            }
        }

        // Indoor pose frames
        const poses = ['sitting_couch', 'eating', 'sleeping', 'on_toilet'];
        for (const type of genericTypes) {
            for (const pose of poses) {
                this.load.image(`npc_${type}_${pose}`, `assets/sprites/npcs/${type}_${pose}.png`);
            }
        }
    }

    // --- Phase 4: Decoration loading ---
    loadDecorations() {
        const decorations = [
            'bench', 'outdoor_table', 'church_cross', 'duck',
            'window_small', 'window_tall', 'couch', 'dining_table',
            'kitchen_counter', 'fridge', 'toilet', 'rug',
            'cafe_sign'
        ];

        for (const name of decorations) {
            this.load.image(`deco_${name}`, `assets/decorations/${name}.png`);
        }
    }

    // --- Phase 5: UI asset loading ---
    loadUIAssets() {
        const uiAssets = [
            'title_bg', 'mascot_dog', 'play_btn', 'play_btn_hover',
            'select_bg', 'crown', 'btn_pee', 'btn_attack',
            'joystick_base', 'joystick_knob', 'gear', 'puddle'
        ];

        for (const name of uiAssets) {
            this.load.image(`ui_${name}`, `assets/ui/${name}.png`);
        }
    }

    // --- Procedural fallback tile generation ---
    generateFallbackTiles() {
        const fallbacks = {
            grass: (g) => {
                g.fillStyle(0x4CAF50);
                g.fillRect(0, 0, 64, 64);
                const patchColors = [0x3D9B44, 0x56B85E, 0x48A34D, 0x5DBF65];
                for (let i = 0; i < 12; i++) {
                    g.fillStyle(patchColors[i % patchColors.length], 0.4);
                    g.fillRect(Math.random() * 56, Math.random() * 56, 8 + Math.random() * 12, 8 + Math.random() * 12);
                }
                for (let i = 0; i < 6; i++) {
                    g.fillStyle(0x3A7D2E, 0.35);
                    g.fillRect(Math.random() * 62, Math.random() * 62, 2, 2);
                }
                const bladeColors = [0x66BB6A, 0x7BCC80, 0x5AAF5E, 0x81D485, 0x4E9E52];
                for (let i = 0; i < 22; i++) {
                    g.fillStyle(bladeColors[i % bladeColors.length], 0.7 + Math.random() * 0.3);
                    g.fillRect(Math.random() * 62 + 1, Math.random() * 62 + 1, 1 + Math.random() * 1.5, 3 + Math.random() * 6);
                }
                for (let i = 0; i < 8; i++) {
                    g.fillStyle(0xA5D6A7, 0.5);
                    g.fillRect(Math.random() * 62 + 1, Math.random() * 62 + 1, 1, 2);
                }
            },
            sidewalk: (g) => {
                g.fillStyle(0xBDBDBD);
                g.fillRect(0, 0, 64, 64);
                g.lineStyle(1, 0x9E9E9E);
                g.strokeRect(1, 1, 62, 62);
                g.lineBetween(32, 0, 32, 64);
                g.lineBetween(0, 32, 64, 32);
            },
            road: (g) => {
                g.fillStyle(0x424242);
                g.fillRect(0, 0, 64, 64);
            },
            wall: (g) => {
                g.fillStyle(0x8D6E63);
                g.fillRect(0, 0, 64, 64);
                g.lineStyle(1, 0x6D4C41);
                for (let row = 0; row < 4; row++) {
                    const offset = row % 2 === 0 ? 0 : 16;
                    for (let col = 0; col < 3; col++) {
                        g.strokeRect(offset + col * 24, row * 16, 22, 14);
                    }
                }
            },
            roof: (g) => {
                g.fillStyle(0xC62828);
                g.fillRect(0, 0, 64, 64);
                g.lineStyle(1, 0xB71C1C);
                g.lineBetween(0, 16, 64, 16);
                g.lineBetween(0, 32, 64, 32);
                g.lineBetween(0, 48, 64, 48);
            },
            darkgrass: (g) => {
                g.fillStyle(0x388E3C);
                g.fillRect(0, 0, 64, 64);
                const patchColors = [0x2E7D32, 0x337A36, 0x2C6E2F, 0x3B8A3E];
                for (let i = 0; i < 10; i++) {
                    g.fillStyle(patchColors[i % patchColors.length], 0.45);
                    g.fillRect(Math.random() * 54, Math.random() * 54, 8 + Math.random() * 14, 8 + Math.random() * 14);
                }
                for (let i = 0; i < 8; i++) {
                    g.fillStyle(0x1B5E20, 0.3);
                    g.fillRect(Math.random() * 62, Math.random() * 62, 2, 3);
                }
                const bladeColors = [0x2E7D32, 0x43A047, 0x388E3C, 0x4CAF50, 0x357A38];
                for (let i = 0; i < 20; i++) {
                    g.fillStyle(bladeColors[i % bladeColors.length], 0.7 + Math.random() * 0.3);
                    g.fillRect(Math.random() * 60 + 2, Math.random() * 58 + 3, 1.5 + Math.random() * 1.5, 5 + Math.random() * 8);
                }
                for (let i = 0; i < 6; i++) {
                    g.fillStyle(0x66BB6A, 0.35);
                    g.fillRect(Math.random() * 60 + 2, Math.random() * 60 + 2, 1, 2);
                }
            },
            water: (g) => {
                g.fillStyle(0x1E88E5);
                g.fillRect(0, 0, 64, 64);
                g.fillStyle(0x42A5F5, 0.5);
                g.fillRect(10, 10, 20, 4);
                g.fillRect(34, 30, 20, 4);
            },
            woodfloor: (g) => {
                g.fillStyle(0xBC8F5E);
                g.fillRect(0, 0, 64, 64);
                g.lineStyle(1, 0xA67B4B, 0.5);
                for (let i = 0; i < 4; i++) g.lineBetween(0, i * 16, 64, i * 16);
                g.lineStyle(1, 0xD4A96A, 0.3);
                g.lineBetween(32, 0, 32, 64);
            },
            door: (g) => {
                g.fillStyle(0xBDBDBD);
                g.fillRect(0, 0, 64, 64);
                g.fillStyle(0x6D4C41);
                g.fillRect(12, 4, 40, 56);
                g.lineStyle(2, 0x4E342E);
                g.strokeRect(12, 4, 40, 56);
                g.fillStyle(0xCCAA44);
                g.fillCircle(44, 34, 4);
                g.fillStyle(0xFFFFFF, 0.6);
                g.fillTriangle(32, 50, 26, 58, 38, 58);
            },
            churchwall: (g) => {
                g.fillStyle(0x9E9E9E);
                g.fillRect(0, 0, 64, 64);
                g.lineStyle(1, 0x757575);
                for (let row = 0; row < 4; row++) {
                    const offset = row % 2 === 0 ? 0 : 16;
                    for (let col = 0; col < 3; col++) {
                        g.strokeRect(offset + col * 24, row * 16, 22, 14);
                    }
                }
            },
            churchroof: (g) => {
                g.fillStyle(0x5D4037);
                g.fillRect(0, 0, 64, 64);
                g.lineStyle(1, 0x4E342E);
                g.lineBetween(0, 16, 64, 16);
                g.lineBetween(0, 32, 64, 32);
                g.lineBetween(0, 48, 64, 48);
            },
            intwall: (g) => {
                g.fillStyle(0xE8DCC8);
                g.fillRect(0, 0, 64, 64);
                g.lineStyle(1, 0xD4C8B0, 0.4);
                g.strokeRect(1, 1, 62, 62);
            },
            tilefloor: (g) => {
                g.fillStyle(0xE0E0E0);
                g.fillRect(0, 0, 64, 64);
                g.lineStyle(1, 0xBBBBBB);
                g.strokeRect(0, 0, 32, 32);
                g.strokeRect(32, 0, 32, 32);
                g.strokeRect(0, 32, 32, 32);
                g.strokeRect(32, 32, 32, 32);
            },
            carpet: (g) => {
                g.fillStyle(0x7B5B3A);
                g.fillRect(0, 0, 64, 64);
                g.fillStyle(0x8B6B4A, 0.3);
                for (let i = 0; i < 10; i++) g.fillRect(Math.random() * 60, Math.random() * 60, 4, 4);
            },
            patio: (g) => {
                g.fillStyle(0xCC9966);
                g.fillRect(0, 0, 64, 64);
                g.lineStyle(1, 0xBB8855);
                g.strokeRect(0, 0, 32, 32);
                g.strokeRect(32, 0, 32, 32);
                g.strokeRect(0, 32, 32, 32);
                g.strokeRect(32, 32, 32, 32);
            },
            exitdoor: (g) => {
                g.fillStyle(0xBC8F5E);
                g.fillRect(0, 0, 64, 64);
                g.fillStyle(0x6D4C41);
                g.fillRect(12, 4, 40, 56);
                g.lineStyle(2, 0x4E342E);
                g.strokeRect(12, 4, 40, 56);
                g.fillStyle(0xCCAA44);
                g.fillCircle(44, 34, 4);
                g.fillStyle(0xFF4444, 0.8);
                g.fillTriangle(32, 14, 26, 6, 38, 6);
            }
        };

        for (const name of this.failedTiles) {
            if (fallbacks[name]) {
                const g = this.add.graphics();
                fallbacks[name](g);
                g.generateTexture(name, 64, 64);
                g.destroy();
            }
        }
    }
}
