// The Midnight Garden — Claude's secret map
// A nocturnal, atmospheric world with unique mechanics

class MidnightGardenScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MidnightGardenScene' });
    }

    init(data) {
        this.dogConfig = data ? data.dogConfig : null;
        this.caughtFireflies = 0;
    }

    create() {
        const C = MIDNIGHT_CONFIG;
        this.C = C;
        this.tileSize = C.tileSize;
        this.mapWidth = C.mapWidth;
        this.mapHeight = C.mapHeight;
        this.worldWidth = this.mapWidth * this.tileSize;
        this.worldHeight = this.mapHeight * this.tileSize;

        this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);

        // State
        this.isIndoors = false;
        this.currentRoom = null;
        this.doors = [];
        this.roomBounds = {};
        this.doorCooldown = 0;
        this.dialogueActive = false;
        this.dialogueBox = null;
        this.dialogueText = null;
        this.telescopeActive = false;

        // Build world
        this.buildMap();
        this.renderMap();
        this.wallBodies = this.physics.add.staticGroup();
        this.furnitureBodies = this.physics.add.staticGroup();
        this.buildCollision();
        this.buildBuildings();
        this.buildMemoryTree();
        this.buildDecorations();

        // Spawn dog
        this.dogStartX = 15 * 64 + 32;
        this.dogStartY = 27 * 64 + 32;
        this.dog = new Dog(this, this.dogStartX, this.dogStartY, this.dogConfig);

        // Spawn NPCs
        this.npcs = [];
        this.spawnMidnightNPCs();

        // Collisions
        this.physics.add.collider(this.dog, this.wallBodies);
        this.physics.add.collider(this.dog, this.furnitureBodies);

        // Camera
        this.cameras.main.startFollow(this.dog, true, 0.08, 0.08);
        this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
        this.cameras.main.setZoom(1.5);
        this.cameras.main.setBackgroundColor('#0a0a1a');

        // Input
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D,
        });
        this.peeKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.attackKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F);
        this.interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);

        // Launch UI
        this.scene.launch('UIScene');

        // Pee / puddle system (glow puddles in midnight garden)
        this.puddles = [];
        this.activePuddle = null;
        this.peeStreamGraphics = this.add.graphics();
        this.peeStreamGraphics.setDepth(11);
        this.footstepTimer = 0;

        // Grass tiles for pee detection
        this.grassTiles = new Set();
        this.buildGrassTileSet();

        // === ATMOSPHERE ===
        this.buildStarfield();
        this.buildMoon();
        this.buildFireflies();
        this.buildShadowCreatures();
        this.buildFlashlightSystem();

        // Ambient cricket sounds (reuse existing sound system if available)
        this.ambientTimer = 0;

        // HUD
        this.buildHUD();

        // Portal back to main map (at the entry arch)
        this.portalBack = { x: 15, y: 28 };

        // Interaction prompt
        this.interactPrompt = this.add.text(0, 0, '', {
            fontSize: '11px', fontFamily: 'Arial Black', color: '#FFE082',
            stroke: '#000000', strokeThickness: 3,
        }).setOrigin(0.5).setDepth(50).setVisible(false);

        // Door prompt
        this.doorPrompt = this.add.text(0, 0, '\u25BC Enter', {
            fontSize: '11px', fontFamily: 'Arial Black', color: '#FFFFFF',
            stroke: '#000000', strokeThickness: 3,
        }).setOrigin(0.5).setDepth(10).setVisible(false);
    }

    // ==================== MAP BUILDING ====================

    buildMap() {
        const T = this.C.tiles;
        this.mapData = [];
        for (let y = 0; y < this.mapHeight; y++) {
            this.mapData[y] = [];
            for (let x = 0; x < this.mapWidth; x++) {
                this.mapData[y][x] = T.VOID;
            }
        }

        // Fill interior with night grass
        for (let y = 2; y < 28; y++) {
            for (let x = 2; x < 28; x++) {
                this.mapData[y][x] = T.NIGHT_GRASS;
            }
        }

        // Hedge border (1 tile thick)
        for (let x = 1; x < 29; x++) {
            this.mapData[1][x] = T.HEDGE;
            this.mapData[28][x] = T.HEDGE;
        }
        for (let y = 1; y < 29; y++) {
            this.mapData[y][1] = T.HEDGE;
            this.mapData[y][28] = T.HEDGE;
        }
        // Entry gap in bottom hedge
        this.mapData[28][14] = T.MOON_PATH;
        this.mapData[28][15] = T.MOON_PATH;

        // === MAIN PATHS ===
        // Central path (bottom entry to center)
        for (let y = 22; y < 29; y++) {
            this.mapData[y][14] = T.MOON_PATH;
            this.mapData[y][15] = T.MOON_PATH;
        }
        // Cross path (east-west through center)
        for (let x = 4; x < 26; x++) {
            this.mapData[14][x] = T.MOON_PATH;
            this.mapData[15][x] = T.MOON_PATH;
        }
        // Path north from center to tower
        for (let y = 4; y < 15; y++) {
            this.mapData[y][14] = T.MOON_PATH;
            this.mapData[y][15] = T.MOON_PATH;
        }
        // Path west to library
        for (let x = 4; x < 10; x++) {
            this.mapData[14][x] = T.MOON_PATH;
            this.mapData[15][x] = T.MOON_PATH;
        }
        // Path east to lost & found
        for (let x = 20; x < 26; x++) {
            this.mapData[14][x] = T.MOON_PATH;
            this.mapData[15][x] = T.MOON_PATH;
        }

        // === MEMORY TREE CLEARING (center, 12-17 x 12-17) ===
        for (let y = 11; y < 18; y++) {
            for (let x = 11; x < 19; x++) {
                this.mapData[y][x] = T.LANTERN_TILE;
            }
        }

        // === BIOLUMINESCENT POND (NE area, 20-25 x 4-8) ===
        for (let y = 5; y < 9; y++) {
            for (let x = 20; x < 25; x++) {
                this.mapData[y][x] = T.GLOW_WATER;
            }
        }
        // Softer edges
        this.mapData[5][20] = T.NIGHT_GRASS;
        this.mapData[5][24] = T.NIGHT_GRASS;
        this.mapData[8][20] = T.NIGHT_GRASS;
        this.mapData[8][24] = T.NIGHT_GRASS;

        // === DARK ZONE (SW area, 3-9 x 20-26) ===
        for (let y = 20; y < 26; y++) {
            for (let x = 3; x < 9; x++) {
                this.mapData[y][x] = T.DARK_ZONE;
            }
        }
        // Path through dark zone
        this.mapData[23][5] = T.MOSS_STONE;
        this.mapData[23][6] = T.MOSS_STONE;
        this.mapData[22][6] = T.MOSS_STONE;
        this.mapData[21][6] = T.MOSS_STONE;
        this.mapData[21][7] = T.MOSS_STONE;

        // === WILLOW TREE AREA (SE corner, 22-26 x 20-25) ===
        for (let y = 21; y < 25; y++) {
            for (let x = 22; x < 26; x++) {
                this.mapData[y][x] = T.WILLOW_GROUND;
            }
        }

        // === BUILDINGS ===
        // Night Library (left, 4-9 x 8-12)
        this.addBuilding(4, 8, 6, 5, T.NIGHT_WALL, T.NIGHT_ROOF);
        this.mapData[12][7] = T.NIGHT_DOOR;
        this.doors.push({
            outside: { x: 7, y: 12 }, outsideReturn: { x: 7, y: 13 },
            inside: { x: 10, y: 38 }, buildingId: 'library',
        });

        // Stargazer's Tower (top center, 13-16 x 2-6)
        this.addBuilding(13, 2, 4, 5, T.DARK_STONE, T.NIGHT_ROOF);
        this.mapData[6][14] = T.NIGHT_DOOR;
        this.doors.push({
            outside: { x: 14, y: 6 }, outsideReturn: { x: 14, y: 7 },
            inside: { x: 3, y: 38 }, buildingId: 'tower',
        });

        // Lost & Found (right, 21-26 x 11-15)
        this.addBuilding(21, 11, 6, 5, T.NIGHT_WALL, T.NIGHT_ROOF);
        this.mapData[15][24] = T.NIGHT_DOOR;
        this.doors.push({
            outside: { x: 24, y: 15 }, outsideReturn: { x: 24, y: 16 },
            inside: { x: 18, y: 38 }, buildingId: 'lostfound',
        });

        // === BUILDING INTERIORS (below visible map, row 32+) ===
        this.interiorStartRow = 32;

        // Tower interior (0-5 x 32-39)
        this.buildInteriorRoom(0, this.interiorStartRow, 6, 8, T.DARK_STONE);
        // Library interior (6-13 x 32-39)
        this.buildInteriorRoom(6, this.interiorStartRow, 8, 8, T.NIGHT_FLOOR);
        // Lost & Found interior (14-21 x 32-39)
        this.buildInteriorRoom(14, this.interiorStartRow, 8, 8, T.NIGHT_FLOOR);
    }

    addBuilding(sx, sy, w, h, wallTile, roofTile) {
        for (let y = sy; y < sy + h; y++) {
            for (let x = sx; x < sx + w; x++) {
                if (y === sy) {
                    this.mapData[y][x] = roofTile;
                } else {
                    this.mapData[y][x] = wallTile;
                }
            }
        }
    }

    buildInteriorRoom(sx, sy, w, h, floorTile) {
        // Ensure mapData is tall enough
        while (this.mapData.length <= sy + h) {
            this.mapData.push(new Array(this.mapWidth).fill(this.C.tiles.VOID));
        }

        const T = this.C.tiles;
        for (let y = sy; y < sy + h; y++) {
            for (let x = sx; x < sx + w; x++) {
                if (y === sy || y === sy + h - 1 || x === sx || x === sx + w - 1) {
                    this.mapData[y][x] = T.NIGHT_WALL;
                } else {
                    this.mapData[y][x] = floorTile;
                }
            }
        }
        // Exit door at bottom center
        const doorX = sx + Math.floor(w / 2);
        this.mapData[sy + h - 1][doorX] = T.NIGHT_EXIT;

        const roomId = sx === 0 ? 'tower' : sx === 6 ? 'library' : 'lostfound';
        this.roomBounds[roomId] = {
            x: (sx + 1) * 64, y: (sy + 1) * 64,
            width: (w - 2) * 64, height: (h - 2) * 64,
            fullX: sx * 64, fullY: sy * 64,
            fullWidth: w * 64, fullHeight: h * 64,
        };

        const link = this.doors.find(d => d.buildingId === roomId);
        if (link) {
            link.insideExit = { x: doorX, y: sy + h - 1 };
        }
    }

    renderMap() {
        const T = this.C.tiles;
        const tileRenderers = {
            [T.VOID]: (g) => { g.fillStyle(0x050510); g.fillRect(0, 0, 64, 64); },
            [T.NIGHT_GRASS]: (g) => {
                g.fillStyle(0x1a2e1a); g.fillRect(0, 0, 64, 64);
                g.fillStyle(0x1e331e, 0.4);
                for (let i = 0; i < 6; i++) g.fillRect(Math.random() * 58, Math.random() * 58, 3, 3);
            },
            [T.MOON_PATH]: (g) => {
                g.fillStyle(0x8899AA); g.fillRect(0, 0, 64, 64);
                g.lineStyle(1, 0x6B7B8B);
                g.strokeRect(0, 0, 32, 32); g.strokeRect(32, 0, 32, 32);
                g.strokeRect(16, 32, 32, 32);
            },
            [T.HEDGE]: (g) => {
                g.fillStyle(0x1B3B1B); g.fillRect(0, 0, 64, 64);
                g.fillStyle(0x0D2B0D); for (let i = 0; i < 8; i++) g.fillCircle(8 + Math.random() * 48, 8 + Math.random() * 48, 6);
            },
            [T.GLOW_WATER]: (g) => {
                g.fillStyle(0x0A2A3A); g.fillRect(0, 0, 64, 64);
                g.fillStyle(0x00DDFF, 0.15);
                g.fillCircle(32, 32, 20);
                g.fillStyle(0x00FFCC, 0.1);
                for (let i = 0; i < 3; i++) g.fillCircle(10 + Math.random() * 44, 10 + Math.random() * 44, 4);
            },
            [T.NIGHT_WALL]: (g) => {
                g.fillStyle(0x2A2A3A); g.fillRect(0, 0, 64, 64);
                g.lineStyle(1, 0x1F1F2F);
                for (let row = 0; row < 4; row++) {
                    const off = row % 2 === 0 ? 0 : 16;
                    for (let c = 0; c < 3; c++) g.strokeRect(off + c * 24, row * 16, 22, 14);
                }
            },
            [T.NIGHT_ROOF]: (g) => {
                g.fillStyle(0x1A1A2A); g.fillRect(0, 0, 64, 64);
                g.lineStyle(1, 0x151525);
                g.lineBetween(0, 16, 64, 16); g.lineBetween(0, 32, 64, 32); g.lineBetween(0, 48, 64, 48);
            },
            [T.NIGHT_FLOOR]: (g) => {
                g.fillStyle(0x3D2E1E); g.fillRect(0, 0, 64, 64);
                g.lineStyle(1, 0x4A3828, 0.5);
                g.lineBetween(0, 32, 64, 32); g.lineBetween(32, 0, 32, 64);
            },
            [T.NIGHT_DOOR]: (g) => {
                g.fillStyle(0x5D4037); g.fillRect(8, 0, 48, 64);
                g.lineStyle(2, 0x4E342E); g.strokeRect(8, 0, 48, 64);
                g.fillStyle(0xD4A017); g.fillCircle(44, 36, 3);
            },
            [T.NIGHT_EXIT]: (g) => {
                g.fillStyle(0x5D4037); g.fillRect(8, 0, 48, 64);
                g.lineStyle(2, 0x4E342E); g.strokeRect(8, 0, 48, 64);
                g.fillStyle(0x00DDFF, 0.3); g.fillRect(16, 8, 32, 48);
            },
            [T.DARK_STONE]: (g) => {
                g.fillStyle(0x3A3A4A); g.fillRect(0, 0, 64, 64);
                g.lineStyle(1, 0x2A2A3A);
                g.strokeRect(0, 0, 32, 32); g.strokeRect(32, 0, 32, 32);
                g.strokeRect(16, 32, 32, 32);
            },
            [T.LANTERN_TILE]: (g) => {
                g.fillStyle(0x1E2E1E); g.fillRect(0, 0, 64, 64);
                g.fillStyle(0xFFAA33, 0.06); g.fillCircle(32, 32, 28);
            },
            [T.MOSS_STONE]: (g) => {
                g.fillStyle(0x556B55); g.fillRect(0, 0, 64, 64);
                g.lineStyle(1, 0x4A5F4A);
                g.strokeRect(0, 0, 32, 32); g.strokeRect(32, 32, 32, 32);
                g.fillStyle(0x3A5B3A, 0.4);
                for (let i = 0; i < 4; i++) g.fillCircle(Math.random() * 60, Math.random() * 60, 3);
            },
            [T.DARK_ZONE]: (g) => {
                g.fillStyle(0x0A0A10); g.fillRect(0, 0, 64, 64);
            },
            [T.WILLOW_GROUND]: (g) => {
                g.fillStyle(0x1A2E1A); g.fillRect(0, 0, 64, 64);
                g.fillStyle(0x2A4A2A, 0.3);
                for (let i = 0; i < 4; i++) g.fillRect(Math.random() * 56, Math.random() * 56, 8, 2);
            },
        };

        // Generate tile textures
        for (const [tileId, renderer] of Object.entries(tileRenderers)) {
            const key = `midnight_tile_${tileId}`;
            if (!this.textures.exists(key)) {
                const g = this.make.graphics({ x: 0, y: 0, add: false });
                renderer(g);
                g.generateTexture(key, 64, 64);
                g.destroy();
            }
        }

        // Render map
        const actualHeight = this.mapData.length;
        for (let y = 0; y < actualHeight; y++) {
            for (let x = 0; x < this.mapWidth; x++) {
                const tile = this.mapData[y][x];
                const key = `midnight_tile_${tile}`;
                if (this.textures.exists(key)) {
                    this.add.image(x * 64 + 32, y * 64 + 32, key).setDepth(0);
                }
            }
        }
    }

    buildCollision() {
        const T = this.C.tiles;
        const solidTiles = new Set([T.VOID, T.HEDGE, T.GLOW_WATER, T.NIGHT_WALL, T.NIGHT_ROOF, T.DARK_STONE]);

        const actualHeight = this.mapData.length;
        for (let y = 0; y < actualHeight; y++) {
            for (let x = 0; x < this.mapWidth; x++) {
                if (solidTiles.has(this.mapData[y][x])) {
                    const body = this.physics.add.staticImage(x * 64 + 32, y * 64 + 32, null);
                    body.setVisible(false);
                    body.body.setSize(64, 64);
                    body.refreshBody();
                    this.wallBodies.add(body);
                }
            }
        }
    }

    // ==================== BUILDINGS & INTERIORS ====================

    buildBuildings() {
        const gfx = this.add.graphics();
        gfx.setDepth(2);

        // === NIGHT LIBRARY exterior details ===
        // Sign
        this.add.text(7 * 64, 8 * 64 + 8, 'THE NIGHT LIBRARY', {
            fontSize: '7px', fontFamily: 'Arial Black', color: '#B0BEC5',
            stroke: '#000000', strokeThickness: 2,
        }).setOrigin(0.5).setDepth(3);
        // Warm window glow
        gfx.fillStyle(0xFFAA33, 0.3);
        gfx.fillRect(5 * 64 + 8, 10 * 64 + 8, 48, 32);
        gfx.fillRect(7 * 64 + 8, 10 * 64 + 8, 48, 32);
        // Window frames
        gfx.lineStyle(2, 0x3A3A4A);
        gfx.strokeRect(5 * 64 + 8, 10 * 64 + 8, 48, 32);
        gfx.strokeRect(7 * 64 + 8, 10 * 64 + 8, 48, 32);

        // === STARGAZER'S TOWER exterior ===
        // Tall spire
        const towerCX = 14.5 * 64;
        gfx.fillStyle(0x3A3A4A);
        gfx.fillTriangle(towerCX, 2 * 64 - 48, towerCX - 40, 2 * 64, towerCX + 40, 2 * 64);
        gfx.lineStyle(1, 0x2A2A3A);
        gfx.strokeTriangle(towerCX, 2 * 64 - 48, towerCX - 40, 2 * 64, towerCX + 40, 2 * 64);
        // Telescope dome
        gfx.fillStyle(0x4A4A5A);
        gfx.fillCircle(towerCX, 2 * 64 - 46, 16);
        // Star symbol on tower
        gfx.fillStyle(0xFFDD44, 0.6);
        this.drawStar(gfx, towerCX, 2 * 64 - 46, 8, 4, 5);
        // Sign
        this.add.text(14.5 * 64, 6 * 64 + 48, "STARGAZER'S TOWER", {
            fontSize: '6px', fontFamily: 'Arial Black', color: '#B0BEC5',
            stroke: '#000000', strokeThickness: 2,
        }).setOrigin(0.5).setDepth(3);
        // Window (warm glow)
        gfx.fillStyle(0xFFAA33, 0.25);
        gfx.fillRect(14 * 64 + 12, 4 * 64 + 8, 40, 32);
        gfx.lineStyle(2, 0x3A3A4A);
        gfx.strokeRect(14 * 64 + 12, 4 * 64 + 8, 40, 32);

        // === LOST & FOUND exterior ===
        this.add.text(24 * 64, 11 * 64 + 8, "COSMO'S LOST & FOUND", {
            fontSize: '6px', fontFamily: 'Arial Black', color: '#CE93D8',
            stroke: '#000000', strokeThickness: 2,
        }).setOrigin(0.5).setDepth(3);
        // Warm glow windows
        gfx.fillStyle(0xFFAA33, 0.25);
        gfx.fillRect(22 * 64 + 8, 13 * 64 + 8, 48, 32);
        gfx.fillRect(24 * 64 + 8, 13 * 64 + 8, 48, 32);
        gfx.lineStyle(2, 0x3A3A4A);
        gfx.strokeRect(22 * 64 + 8, 13 * 64 + 8, 48, 32);
        gfx.strokeRect(24 * 64 + 8, 13 * 64 + 8, 48, 32);
        // Random "stuff" piled outside
        gfx.fillStyle(0x8D6E63);
        gfx.fillRect(21 * 64 + 10, 15 * 64 + 20, 20, 14);
        gfx.fillStyle(0xCC8833);
        gfx.fillRect(21 * 64 + 34, 15 * 64 + 16, 12, 18);
        gfx.fillStyle(0x607D8B);
        gfx.fillCircle(21 * 64 + 52, 15 * 64 + 28, 6);

        // === INTERIOR FURNITURE ===
        this.buildInteriorFurniture(gfx);

        // === ENTRY ARCH (bottom of map) ===
        gfx.fillStyle(0x4A4A5A);
        // Left pillar
        gfx.fillRect(13 * 64 + 16, 27 * 64, 32, 64);
        // Right pillar
        gfx.fillRect(16 * 64 + 16, 27 * 64, 32, 64);
        // Arch top
        gfx.fillStyle(0x5A5A6A);
        gfx.fillRect(13 * 64 + 16, 27 * 64 - 8, 3 * 64 + 32, 16);
        // Arch text
        this.add.text(15 * 64, 27 * 64 - 4, 'THE MIDNIGHT GARDEN', {
            fontSize: '8px', fontFamily: 'Arial Black', color: '#B0BEC5',
            stroke: '#111122', strokeThickness: 3,
        }).setOrigin(0.5).setDepth(3);
        // Glowing runes on pillars
        gfx.fillStyle(0x00DDFF, 0.3);
        gfx.fillCircle(13 * 64 + 32, 27 * 64 + 20, 4);
        gfx.fillCircle(13 * 64 + 32, 27 * 64 + 40, 4);
        gfx.fillCircle(16 * 64 + 32, 27 * 64 + 20, 4);
        gfx.fillCircle(16 * 64 + 32, 27 * 64 + 40, 4);
    }

    buildInteriorFurniture(gfx) {
        // === TOWER INTERIOR (0-5 x 32-39) ===
        const tox = 0, toy = this.interiorStartRow * 64;
        // Telescope (center)
        gfx.fillStyle(0x607D8B);
        gfx.fillRect(tox + 2.5 * 64, toy + 2 * 64, 12, 80);
        gfx.fillStyle(0x455A64);
        gfx.fillCircle(tox + 2.5 * 64 + 6, toy + 2 * 64, 16);
        // Star charts on wall (left)
        gfx.fillStyle(0x1A237E, 0.5);
        gfx.fillRect(tox + 1 * 64, toy + 1 * 64, 48, 36);
        gfx.fillStyle(0xFFDD44, 0.4);
        for (let i = 0; i < 5; i++) {
            gfx.fillCircle(tox + 1 * 64 + 10 + Math.random() * 28, toy + 1 * 64 + 8 + Math.random() * 20, 2);
        }
        // Warm rug
        gfx.fillStyle(0x8B4513, 0.4);
        gfx.fillRect(tox + 1.5 * 64, toy + 4 * 64, 3 * 64, 2 * 64);

        // === LIBRARY INTERIOR (6-13 x 32-39) ===
        const lox = 6 * 64, loy = this.interiorStartRow * 64;
        // Bookshelves along walls
        this.drawBookshelfWall(gfx, lox + 1 * 64, loy + 1 * 64, 5, false);  // top wall
        this.drawBookshelfWall(gfx, lox + 1 * 64, loy + 3 * 64, 3, false);  // middle row
        // Reading nook (bottom left) — couch + lamp
        gfx.fillStyle(0x5C3A21);
        gfx.fillRect(lox + 1.2 * 64, loy + 5 * 64, 80, 30);
        gfx.fillStyle(0x7B5B3A);
        gfx.fillRect(lox + 1.2 * 64 + 4, loy + 5 * 64 + 4, 72, 22);
        // Lamp
        gfx.fillStyle(0xFFAA33, 0.4);
        gfx.fillCircle(lox + 1 * 64 + 8, loy + 4.8 * 64, 20);
        gfx.fillStyle(0xD4A017);
        gfx.fillRect(lox + 1 * 64 + 4, loy + 4.5 * 64, 8, 18);
        gfx.fillStyle(0xFFCC66);
        gfx.fillCircle(lox + 1 * 64 + 8, loy + 4.5 * 64, 10);
        // Fireplace (right wall)
        gfx.fillStyle(0x5D4037);
        gfx.fillRect(lox + 5.5 * 64, loy + 5 * 64, 64, 48);
        gfx.fillStyle(0xFF6600, 0.5);
        gfx.fillRect(lox + 5.5 * 64 + 12, loy + 5 * 64 + 16, 40, 24);
        gfx.fillStyle(0xFFAA00, 0.4);
        gfx.fillRect(lox + 5.5 * 64 + 18, loy + 5 * 64 + 20, 28, 16);

        // === LOST & FOUND INTERIOR (14-21 x 32-39) ===
        const fox = 14 * 64, foy = this.interiorStartRow * 64;
        // Cluttered shelves everywhere
        for (let row = 0; row < 3; row++) {
            const sy = foy + (1.5 + row * 1.8) * 64;
            gfx.fillStyle(0x6D4C41);
            gfx.fillRect(fox + 1 * 64, sy, 4 * 64, 20);
            gfx.lineStyle(1, 0x4E342E);
            gfx.strokeRect(fox + 1 * 64, sy, 4 * 64, 20);
            // Random colorful items on shelves
            const itemColors = [0xFF6B6B, 0x4ECDC4, 0xFFD93D, 0xAE6BFF, 0xFF8ED4, 0x6BCB77];
            for (let i = 0; i < 8; i++) {
                gfx.fillStyle(itemColors[Math.floor(Math.random() * itemColors.length)]);
                const ix = fox + 1 * 64 + 8 + i * 28;
                const iy = sy - 4 - Math.random() * 8;
                if (Math.random() > 0.5) {
                    gfx.fillRect(ix, iy, 8 + Math.random() * 6, 10 + Math.random() * 4);
                } else {
                    gfx.fillCircle(ix + 4, iy + 4, 4 + Math.random() * 3);
                }
            }
        }
        // Cosmo's "special" display (a slightly dented spoon on a tiny pedestal)
        gfx.fillStyle(0x8D6E63);
        gfx.fillRect(fox + 5.5 * 64, foy + 2 * 64, 24, 28);
        gfx.fillStyle(0xC0C0C0);
        gfx.fillRect(fox + 5.5 * 64 + 8, foy + 2 * 64 - 4, 8, 16);
        gfx.fillCircle(fox + 5.5 * 64 + 12, foy + 2 * 64 - 6, 6);
        // Label
        this.add.text(fox + 5.5 * 64 + 12, foy + 2 * 64 + 32, 'THE SPOON', {
            fontSize: '5px', fontFamily: 'Arial Black', color: '#FFE082',
            stroke: '#000000', strokeThickness: 2,
        }).setOrigin(0.5).setDepth(3);
    }

    drawBookshelfWall(gfx, x, y, count, vertical) {
        for (let i = 0; i < count; i++) {
            const bx = x + i * 64;
            // Shelf back
            gfx.fillStyle(0x4E342E);
            gfx.fillRect(bx, y, 56, 48);
            gfx.lineStyle(1, 0x3E2723);
            gfx.strokeRect(bx, y, 56, 48);
            // Shelf divider
            gfx.fillStyle(0x5D4037);
            gfx.fillRect(bx, y + 22, 56, 3);
            // Books
            const colors = [0xC62828, 0x1565C0, 0x2E7D32, 0xF57F17, 0x6A1B9A, 0x00838F, 0xD84315, 0x4527A0];
            for (let row = 0; row < 2; row++) {
                let bxx = bx + 4;
                for (let b = 0; b < 6; b++) {
                    gfx.fillStyle(colors[(i * 6 + b + row * 3) % colors.length]);
                    const bw = 4 + Math.random() * 3;
                    gfx.fillRect(bxx, y + 3 + row * 25, bw, 18);
                    bxx += bw + 1;
                }
            }
        }
    }

    // ==================== MEMORY TREE ====================

    buildMemoryTree() {
        const gfx = this.add.graphics();
        gfx.setDepth(3);

        const cx = 15 * 64;
        const cy = 14 * 64;

        // Trunk
        gfx.fillStyle(0x4E342E);
        gfx.fillRect(cx - 20, cy - 40, 40, 80);
        gfx.lineStyle(2, 0x3E2723);
        gfx.strokeRect(cx - 20, cy - 40, 40, 80);
        // Bark texture
        gfx.lineStyle(1, 0x5D4037, 0.5);
        gfx.lineBetween(cx - 12, cy - 30, cx - 8, cy + 30);
        gfx.lineBetween(cx + 8, cy - 25, cx + 12, cy + 35);

        // Canopy (large, spreading)
        gfx.fillStyle(0x1B3B1B, 0.9);
        gfx.fillCircle(cx, cy - 60, 80);
        gfx.fillCircle(cx - 50, cy - 40, 55);
        gfx.fillCircle(cx + 50, cy - 40, 55);
        gfx.fillCircle(cx - 30, cy - 80, 50);
        gfx.fillCircle(cx + 30, cy - 80, 50);
        // Leaf highlights
        gfx.fillStyle(0x2A5A2A, 0.4);
        gfx.fillCircle(cx - 20, cy - 70, 30);
        gfx.fillCircle(cx + 30, cy - 50, 25);

        // Roots spreading out
        gfx.fillStyle(0x4E342E, 0.6);
        gfx.fillRect(cx - 60, cy + 30, 120, 12);
        gfx.fillRect(cx - 70, cy + 34, 20, 8);
        gfx.fillRect(cx + 50, cy + 34, 20, 8);

        // === HANGING LANTERNS ===
        this.lanterns = [];
        const messages = this.C.memoryTreeMessages;
        const lanternPositions = [
            { x: cx - 70, y: cy - 55 }, { x: cx + 65, y: cy - 50 },
            { x: cx - 40, y: cy - 85 }, { x: cx + 35, y: cy - 80 },
            { x: cx - 55, y: cy - 20 }, { x: cx + 55, y: cy - 25 },
            { x: cx, y: cy - 95 },      { x: cx - 20, y: cy - 35 },
            { x: cx + 20, y: cy - 40 }, { x: cx - 65, y: cy - 70 },
            { x: cx + 60, y: cy - 65 }, { x: cx, y: cy - 60 },
        ];

        for (let i = 0; i < Math.min(lanternPositions.length, messages.length); i++) {
            const lp = lanternPositions[i];
            const lantern = this.createLantern(gfx, lp.x, lp.y, messages[i], i);
            this.lanterns.push(lantern);
        }
    }

    createLantern(gfx, x, y, message, index) {
        // String
        gfx.lineStyle(1, 0x666666, 0.5);
        gfx.lineBetween(x, y - 20, x, y);

        // Lantern glow (ambient)
        const glowGfx = this.add.graphics();
        glowGfx.setDepth(2.5);
        glowGfx.fillStyle(0xFFAA33, 0.12);
        glowGfx.fillCircle(x, y, 24);

        // Lantern body
        gfx.fillStyle(0xD4A017, 0.8);
        gfx.fillRect(x - 5, y - 6, 10, 12);
        gfx.lineStyle(1, 0xAA8010);
        gfx.strokeRect(x - 5, y - 6, 10, 12);
        // Inner glow
        gfx.fillStyle(0xFFDD66, 0.6);
        gfx.fillRect(x - 3, y - 4, 6, 8);

        return { x, y, message, glowGfx, bobOffset: index * 0.7 };
    }

    // ==================== DECORATIONS ====================

    buildDecorations() {
        const gfx = this.add.graphics();
        gfx.setDepth(2);

        // === WILLOW TREE (SE corner) ===
        const wx = 24 * 64;
        const wy = 22 * 64;
        // Trunk
        gfx.fillStyle(0x5D4037);
        gfx.fillRect(wx - 12, wy - 30, 24, 60);
        // Hanging branches (long drooping lines)
        gfx.lineStyle(2, 0x2E5B2E, 0.6);
        for (let i = 0; i < 12; i++) {
            const bx = wx - 60 + i * 10 + Math.random() * 6;
            const startY = wy - 40 - Math.random() * 20;
            const endY = wy + 20 + Math.random() * 30;
            gfx.lineBetween(bx, startY, bx + (Math.random() - 0.5) * 8, endY);
        }
        // Canopy
        gfx.fillStyle(0x2E5B2E, 0.5);
        gfx.fillCircle(wx, wy - 50, 60);

        // Bench under willow (for sleeping fox)
        gfx.fillStyle(0x6D4C41);
        gfx.fillRect(wx - 20 - 64, wy + 10, 40, 12);
        gfx.lineStyle(2, 0x4E342E);
        gfx.strokeRect(wx - 20 - 64, wy + 10, 40, 12);
        gfx.fillRect(wx - 18 - 64, wy + 22, 4, 8);
        gfx.fillRect(wx + 14 - 64, wy + 22, 4, 8);

        // === POND DETAILS ===
        // Lily pads
        const pondGfx = this.add.graphics();
        pondGfx.setDepth(1.5);
        const lilyPositions = [
            { x: 21 * 64 + 20, y: 6 * 64 + 20 },
            { x: 23 * 64 + 10, y: 7 * 64 + 30 },
            { x: 22 * 64 + 40, y: 6 * 64 + 50 },
            { x: 24 * 64, y: 7 * 64 },
        ];
        for (const lily of lilyPositions) {
            pondGfx.fillStyle(0x2E7D32, 0.7);
            pondGfx.fillCircle(lily.x, lily.y, 10);
            // Notch
            pondGfx.fillStyle(0x0A2A3A);
            pondGfx.fillRect(lily.x - 1, lily.y - 10, 2, 10);
            // Flower on some
            if (Math.random() > 0.5) {
                pondGfx.fillStyle(0xF48FB1, 0.8);
                pondGfx.fillCircle(lily.x + 3, lily.y - 2, 4);
            }
        }

        // === LAMPPOSTS along paths ===
        this.lampposts = [];
        const lampPositions = [
            { x: 14.5, y: 20 }, { x: 14.5, y: 24 },  // south path
            { x: 8, y: 14.5 }, { x: 12, y: 14.5 },    // west path
            { x: 18, y: 14.5 }, { x: 22, y: 14.5 },   // east path
            { x: 14.5, y: 8 }, { x: 14.5, y: 10 },    // north path
        ];

        for (const lp of lampPositions) {
            const lx = lp.x * 64;
            const ly = lp.y * 64;
            // Post
            gfx.fillStyle(0x4A4A5A);
            gfx.fillRect(lx - 3, ly - 20, 6, 36);
            // Lamp head
            gfx.fillStyle(0x5A5A6A);
            gfx.fillRect(lx - 8, ly - 28, 16, 12);
            // Warm glow
            const glowG = this.add.graphics();
            glowG.setDepth(0.8);
            glowG.fillStyle(0xFFAA33, 0.1);
            glowG.fillCircle(lx, ly - 22, 60);
            glowG.fillStyle(0xFFCC55, 0.06);
            glowG.fillCircle(lx, ly - 22, 90);
            // Light bulb
            gfx.fillStyle(0xFFDD88, 0.8);
            gfx.fillCircle(lx, ly - 20, 4);
            this.lampposts.push({ x: lx, y: ly, glowGfx: glowG });
        }

        // === SCATTERED MUSHROOMS (bioluminescent) ===
        const mushroomPositions = [
            { x: 3, y: 5 }, { x: 5, y: 3 }, { x: 8, y: 6 },
            { x: 10, y: 19 }, { x: 4, y: 17 }, { x: 26, y: 18 },
            { x: 25, y: 23 }, { x: 18, y: 5 }, { x: 3, y: 12 },
        ];
        for (const mp of mushroomPositions) {
            const mx = mp.x * 64 + 20 + Math.random() * 24;
            const my = mp.y * 64 + 20 + Math.random() * 24;
            // Stem
            gfx.fillStyle(0xEEDDCC, 0.7);
            gfx.fillRect(mx - 2, my, 4, 8);
            // Cap (glowing)
            gfx.fillStyle(0x00DDFF, 0.5);
            gfx.fillCircle(mx, my - 1, 6);
            gfx.fillStyle(0x00FFCC, 0.3);
            gfx.fillCircle(mx, my - 2, 10);
        }

        // === BIOLUMINESCENT POND SHIMMER ===
        this.pondShimmer = this.add.graphics();
        this.pondShimmer.setDepth(1.8);

        // === PORTAL GLOW (at entry) ===
        const portalGfx = this.add.graphics();
        portalGfx.setDepth(1);
        this.portalGlow = portalGfx;
        this.portalGlowPhase = 0;
    }

    // ==================== ATMOSPHERE ====================

    buildStarfield() {
        const starGfx = this.add.graphics();
        starGfx.setDepth(0.1);
        starGfx.setScrollFactor(0.3); // parallax!

        for (let i = 0; i < 120; i++) {
            const sx = Math.random() * this.worldWidth * 1.5;
            const sy = Math.random() * this.worldHeight * 0.6;
            const brightness = 0.3 + Math.random() * 0.7;
            const size = 0.5 + Math.random() * 1.5;
            starGfx.fillStyle(0xFFFFFF, brightness);
            starGfx.fillCircle(sx, sy, size);
        }
        // A few colored stars
        const starColors = [0xAABBFF, 0xFFCCAA, 0xFFFFAA, 0xFFAACC];
        for (let i = 0; i < 8; i++) {
            starGfx.fillStyle(starColors[i % starColors.length], 0.5 + Math.random() * 0.3);
            starGfx.fillCircle(Math.random() * this.worldWidth * 1.5, Math.random() * this.worldHeight * 0.4, 1.5 + Math.random());
        }
    }

    buildMoon() {
        const moonGfx = this.add.graphics();
        moonGfx.setDepth(0.2);
        moonGfx.setScrollFactor(0.15); // very slow parallax

        const mx = this.worldWidth * 0.75;
        const my = 80;
        // Outer glow
        moonGfx.fillStyle(0xFFEECC, 0.04);
        moonGfx.fillCircle(mx, my, 80);
        moonGfx.fillStyle(0xFFEECC, 0.06);
        moonGfx.fillCircle(mx, my, 55);
        // Moon body
        moonGfx.fillStyle(0xF5F0E0);
        moonGfx.fillCircle(mx, my, 32);
        // Craters
        moonGfx.fillStyle(0xE0D8C8, 0.6);
        moonGfx.fillCircle(mx - 8, my - 10, 6);
        moonGfx.fillCircle(mx + 12, my + 5, 8);
        moonGfx.fillCircle(mx - 5, my + 12, 5);
        moonGfx.fillCircle(mx + 5, my - 5, 3);
    }

    buildFireflies() {
        this.fireflies = [];
        const C = this.C.fireflies;

        for (let i = 0; i < C.count; i++) {
            const fx = 3 * 64 + Math.random() * 24 * 64;
            const fy = 3 * 64 + Math.random() * 24 * 64;

            const gfx = this.add.graphics();
            gfx.setDepth(8);
            const color = C.colors[Math.floor(Math.random() * C.colors.length)];

            this.fireflies.push({
                gfx, x: fx, y: fy, homeX: fx, homeY: fy,
                color, angle: Math.random() * Math.PI * 2,
                speed: C.speed + Math.random() * 0.2,
                driftRadius: 30 + Math.random() * 50,
                phase: Math.random() * Math.PI * 2,
                brightness: 0.5 + Math.random() * 0.5,
                caught: false,
            });
        }
    }

    buildShadowCreatures() {
        this.shadowCreatures = [];
        const S = this.C.shadows;

        // Spawn in dark zone and scattered locations
        const spawnAreas = [
            { x: 4, y: 21, w: 4, h: 4 },   // dark zone
            { x: 3, y: 3, w: 5, h: 5 },     // NW corner
            { x: 24, y: 20, w: 3, h: 3 },   // near willow
        ];

        for (let i = 0; i < S.count; i++) {
            const area = spawnAreas[i % spawnAreas.length];
            const sx = (area.x + Math.random() * area.w) * 64;
            const sy = (area.y + Math.random() * area.h) * 64;

            const gfx = this.add.graphics();
            gfx.setDepth(7);

            this.shadowCreatures.push({
                gfx, x: sx, y: sy, homeX: sx, homeY: sy,
                vx: 0, vy: 0, fleeing: false, visible: true,
                respawnTimer: 0, wanderAngle: Math.random() * Math.PI * 2,
            });
        }
    }

    buildFlashlightSystem() {
        // Canvas-based lighting: draw directly on a canvas each frame
        // This is the most reliable approach in Phaser 3
        const cam = this.cameras.main;
        const w = cam.width;
        const h = cam.height;

        this.lightCanvas = this.textures.createCanvas('midnight_light', w, h);
        this.lightImage = this.add.image(0, 0, 'midnight_light');
        this.lightImage.setOrigin(0, 0);
        this.lightImage.setScrollFactor(0);
        this.lightImage.setDepth(20);

        this.flashlightOn = true;
    }

    // ==================== NPC SYSTEM ====================

    spawnMidnightNPCs() {
        // Luna the Cat (outside the library during night)
        this.lunaNPC = this.spawnSimpleNPC(7 * 64, 13 * 64, 'luna', 0x555577, 'cat');
        // Cosmo the Raccoon (outside the lost & found)
        this.cosmoNPC = this.spawnSimpleNPC(23 * 64, 16 * 64, 'cosmo', 0x666666, 'raccoon');
        // The Stargazer (outside the tower)
        this.stargazerNPC = this.spawnSimpleNPC(15 * 64, 7 * 64, 'stargazer', 0x6B5B73, 'human');
        // Sleeping Fox (under the willow)
        this.foxNPC = this.spawnSimpleNPC(23 * 64, 22.4 * 64, 'fox', 0xCC6633, 'fox');
    }

    spawnSimpleNPC(x, y, id, color, species) {
        const gfx = this.add.graphics();
        gfx.setDepth(5);

        // Draw a simple character shape based on species
        if (species === 'cat') {
            // Body
            gfx.fillStyle(color);
            gfx.fillCircle(0, 4, 12);
            gfx.fillRect(-8, 4, 16, 14);
            // Head
            gfx.fillCircle(0, -6, 10);
            // Ears (triangular, pointy)
            gfx.fillTriangle(-8, -14, -12, -6, -4, -6);
            gfx.fillTriangle(8, -14, 4, -6, 12, -6);
            // Inner ears
            gfx.fillStyle(0xFFCCCC, 0.4);
            gfx.fillTriangle(-7, -12, -10, -7, -5, -7);
            gfx.fillTriangle(7, -12, 5, -7, 10, -7);
            // Eyes (intelligent, slightly narrowed)
            gfx.fillStyle(0x66FF66);
            gfx.fillCircle(-4, -7, 3);
            gfx.fillCircle(4, -7, 3);
            gfx.fillStyle(0x000000);
            gfx.fillCircle(-4, -7, 1.5);
            gfx.fillCircle(4, -7, 1.5);
            // Glasses
            gfx.lineStyle(1, 0xCCCCCC, 0.7);
            gfx.strokeCircle(-4, -7, 4);
            gfx.strokeCircle(4, -7, 4);
            gfx.lineBetween(0, -7, 0, -7);
            // Tail
            gfx.lineStyle(3, color);
            gfx.lineBetween(8, 14, 16, 6);
            gfx.lineBetween(16, 6, 14, -2);
        } else if (species === 'raccoon') {
            // Body
            gfx.fillStyle(color);
            gfx.fillCircle(0, 4, 13);
            gfx.fillRect(-10, 4, 20, 14);
            // Head
            gfx.fillCircle(0, -6, 11);
            // Mask (dark raccoon eye mask)
            gfx.fillStyle(0x222222);
            gfx.fillRect(-10, -10, 20, 6);
            // Eyes (bright, excited)
            gfx.fillStyle(0xFFFFFF);
            gfx.fillCircle(-4, -8, 3.5);
            gfx.fillCircle(4, -8, 3.5);
            gfx.fillStyle(0x111111);
            gfx.fillCircle(-4, -8, 2);
            gfx.fillCircle(4, -8, 2);
            // Highlight (excited sparkle)
            gfx.fillStyle(0xFFFFFF);
            gfx.fillCircle(-3, -9, 1);
            gfx.fillCircle(5, -9, 1);
            // Ears
            gfx.fillStyle(color);
            gfx.fillCircle(-8, -14, 5);
            gfx.fillCircle(8, -14, 5);
            // Nose
            gfx.fillStyle(0x333333);
            gfx.fillCircle(0, -4, 2);
            // Tail (bushy, striped)
            gfx.fillStyle(color);
            gfx.fillRect(10, 8, 14, 8);
            gfx.fillStyle(0x333333);
            gfx.fillRect(14, 8, 4, 8);
            gfx.fillRect(20, 8, 4, 8);
        } else if (species === 'fox') {
            // Sleeping fox — curled up
            gfx.fillStyle(color);
            gfx.fillEllipse(0, 4, 30, 16);
            // Head tucked in
            gfx.fillCircle(-10, -2, 8);
            // Ear
            gfx.fillTriangle(-14, -8, -18, -2, -10, -2);
            gfx.fillStyle(0xFFDDCC, 0.4);
            gfx.fillTriangle(-13, -7, -16, -3, -11, -3);
            // Tail wrapping around
            gfx.fillStyle(color);
            gfx.fillEllipse(12, 0, 16, 8);
            // White tail tip
            gfx.fillStyle(0xFFEEDD);
            gfx.fillCircle(18, 0, 4);
            // Closed eyes (zzz)
            gfx.lineStyle(1, 0x333333);
            gfx.lineBetween(-13, -3, -8, -3);
        } else {
            // Human (stargazer — old, warm)
            gfx.fillStyle(color);
            gfx.fillRect(-10, 2, 20, 18);
            // Head
            gfx.fillStyle(0xFFDDCC);
            gfx.fillCircle(0, -6, 10);
            // Hair (wispy white)
            gfx.fillStyle(0xCCCCCC);
            gfx.fillRect(-8, -14, 16, 5);
            // Eyes (warm)
            gfx.fillStyle(0x4488AA);
            gfx.fillCircle(-4, -7, 2.5);
            gfx.fillCircle(4, -7, 2.5);
            gfx.fillStyle(0x000000);
            gfx.fillCircle(-4, -7, 1.2);
            gfx.fillCircle(4, -7, 1.2);
            // Smile
            gfx.lineStyle(1, 0x996666);
            gfx.beginPath();
            gfx.arc(0, -2, 5, 0.2, Math.PI - 0.2, false);
            gfx.strokePath();
            // Robe/coat
            gfx.fillStyle(0x3A3A6A);
            gfx.fillRect(-12, 2, 24, 18);
            // Star brooch
            gfx.fillStyle(0xFFDD44);
            this.drawStar(gfx, 0, 6, 4, 2, 5);
        }

        gfx.setPosition(x, y);

        // Name label above NPC
        const npcData = this.C.npcs[id];
        if (npcData.name && id !== 'fox') {
            const nameLabel = this.add.text(x, y - 28, npcData.name, {
                fontSize: '8px', fontFamily: 'Arial Black',
                color: species === 'cat' ? '#B0BEC5' : species === 'raccoon' ? '#CE93D8' : '#FFE082',
                stroke: '#000000', strokeThickness: 2,
            }).setOrigin(0.5).setDepth(6);
            // Subtle bob
            this.tweens.add({
                targets: nameLabel, y: nameLabel.y - 3,
                duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
            });
        } else if (id === 'fox') {
            // Zzz floating above
            const zzz = this.add.text(x + 10, y - 16, 'zzz', {
                fontSize: '10px', fontFamily: 'Arial', color: '#8888AA',
                stroke: '#000000', strokeThickness: 2,
            }).setOrigin(0.5).setDepth(6);
            this.tweens.add({
                targets: zzz, y: zzz.y - 8, alpha: 0.3,
                duration: 2500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
            });
        }

        return { gfx, x, y, id, species, dialogueIndex: 0, greeted: false };
    }

    // ==================== FLASHLIGHT ====================

    updateFlashlight() {
        if (this.isIndoors) {
            this.lightImage.setVisible(false);
            return;
        }
        this.lightImage.setVisible(true);

        const cam = this.cameras.main;
        const zoom = cam.zoom;
        const fl = this.C.flashlight;
        const time = this.time.now;
        const ctx = this.lightCanvas.context;
        const w = this.lightCanvas.width;
        const h = this.lightCanvas.height;

        // Check dark zone
        const dogTX = Math.floor(this.dog.x / 64);
        const dogTY = Math.floor(this.dog.y / 64);
        const inDarkZone = this.mapData[dogTY] && this.mapData[dogTY][dogTX] === this.C.tiles.DARK_ZONE;
        const alpha = inDarkZone ? fl.darkZoneAlpha : fl.ambientAlpha;

        // Fill with darkness
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = `rgba(5, 5, 16, ${alpha})`;
        ctx.fillRect(0, 0, w, h);

        // Flicker
        const flicker = Math.sin(time * fl.flickerSpeed) * fl.flickerAmount +
                         Math.sin(time * fl.flickerSpeed * 2.3) * fl.flickerAmount * 0.5;
        const bonusRadius = this.caughtFireflies * this.C.fireflies.lightBonus;
        const radius = (fl.radius + flicker + bonusRadius) * zoom;

        // Dog screen position
        const dogSX = (this.dog.x - cam.scrollX) * zoom;
        const dogSY = (this.dog.y - cam.scrollY) * zoom;

        // Punch circular light hole with radial gradient (cone/circle shape)
        ctx.globalCompositeOperation = 'destination-out';
        const grad = ctx.createRadialGradient(dogSX, dogSY, radius * 0.15, dogSX, dogSY, radius);
        grad.addColorStop(0, 'rgba(0, 0, 0, 1)');
        grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.8)');
        grad.addColorStop(0.8, 'rgba(0, 0, 0, 0.3)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(dogSX, dogSY, radius, 0, Math.PI * 2);
        ctx.fill();

        // Lamppost lights
        for (const lamp of this.lampposts) {
            const lsx = (lamp.x - cam.scrollX) * zoom;
            const lsy = ((lamp.y - 22) - cam.scrollY) * zoom;
            const lr = 80 * zoom;
            const lg = ctx.createRadialGradient(lsx, lsy, lr * 0.1, lsx, lsy, lr);
            lg.addColorStop(0, 'rgba(0, 0, 0, 0.9)');
            lg.addColorStop(0.6, 'rgba(0, 0, 0, 0.4)');
            lg.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = lg;
            ctx.beginPath();
            ctx.arc(lsx, lsy, lr, 0, Math.PI * 2);
            ctx.fill();
        }

        // Lantern lights (smaller)
        for (const lantern of this.lanterns) {
            const lsx = (lantern.x - cam.scrollX) * zoom;
            const lsy = (lantern.y - cam.scrollY) * zoom;
            const lr = 35 * zoom;
            const lg = ctx.createRadialGradient(lsx, lsy, 2, lsx, lsy, lr);
            lg.addColorStop(0, 'rgba(0, 0, 0, 0.7)');
            lg.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = lg;
            ctx.beginPath();
            ctx.arc(lsx, lsy, lr, 0, Math.PI * 2);
            ctx.fill();
        }

        // Glow puddles
        const allPuddles = [...this.puddles];
        if (this.activePuddle && this.activePuddle.radius > 3) allPuddles.push(this.activePuddle);
        for (const puddle of allPuddles) {
            if (puddle.radius > 3) {
                const psx = (puddle.x - cam.scrollX) * zoom;
                const psy = (puddle.y - cam.scrollY) * zoom;
                const pr = puddle.radius * zoom * 1.5;
                const pg = ctx.createRadialGradient(psx, psy, 2, psx, psy, pr);
                pg.addColorStop(0, 'rgba(0, 0, 0, 0.6)');
                pg.addColorStop(1, 'rgba(0, 0, 0, 0)');
                ctx.fillStyle = pg;
                ctx.beginPath();
                ctx.arc(psx, psy, pr, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Reset composite mode
        ctx.globalCompositeOperation = 'source-over';

        // Push to GPU
        this.lightCanvas.refresh();
    }

    // ==================== FIREFLY SYSTEM ====================

    updateFireflies(time, delta) {
        for (const ff of this.fireflies) {
            if (ff.caught) {
                ff.gfx.setVisible(false);
                continue;
            }

            // Drift in gentle patterns
            ff.angle += ff.speed * delta * 0.001;
            ff.phase += 0.003 * delta;

            ff.x = ff.homeX + Math.cos(ff.angle) * ff.driftRadius;
            ff.y = ff.homeY + Math.sin(ff.angle * 0.7) * ff.driftRadius * 0.6 +
                   Math.sin(ff.phase) * 8;

            // Pulse brightness
            const pulse = 0.4 + Math.sin(ff.phase * 2) * 0.4;
            const brightness = ff.brightness * pulse;

            ff.gfx.clear();
            // Outer glow
            ff.gfx.fillStyle(ff.color, brightness * 0.2);
            ff.gfx.fillCircle(ff.x, ff.y, 12);
            // Inner glow
            ff.gfx.fillStyle(ff.color, brightness * 0.5);
            ff.gfx.fillCircle(ff.x, ff.y, 6);
            // Core
            ff.gfx.fillStyle(0xFFFFFF, brightness);
            ff.gfx.fillCircle(ff.x, ff.y, 2);

            // Check if dog can catch it
            const dist = Phaser.Math.Distance.Between(this.dog.x, this.dog.y, ff.x, ff.y);
            if (dist < this.C.fireflies.catchRadius && this.caughtFireflies < this.C.fireflies.maxCaught) {
                if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
                    ff.caught = true;
                    this.caughtFireflies++;
                    this.updateFireflyCounter();
                    // Catch effect
                    this.cameras.main.flash(100, 200, 255, 100, false);
                    // Brief glow burst
                    const burst = this.add.graphics();
                    burst.setDepth(9);
                    burst.fillStyle(ff.color, 0.5);
                    burst.fillCircle(ff.x, ff.y, 20);
                    this.tweens.add({
                        targets: burst, alpha: 0, duration: 500,
                        onComplete: () => burst.destroy(),
                    });
                }
            }
        }
    }

    // ==================== SHADOW CREATURES ====================

    updateShadowCreatures(time, delta) {
        const S = this.C.shadows;

        for (const shadow of this.shadowCreatures) {
            if (!shadow.visible) {
                shadow.respawnTimer -= delta;
                if (shadow.respawnTimer <= 0) {
                    shadow.visible = true;
                    shadow.x = shadow.homeX;
                    shadow.y = shadow.homeY;
                    shadow.fleeing = false;
                }
                shadow.gfx.setVisible(false);
                continue;
            }

            // Check distance to dog's light
            const dist = Phaser.Math.Distance.Between(this.dog.x, this.dog.y, shadow.x, shadow.y);

            if (dist < S.fleeRadius && this.flashlightOn) {
                // Flee from light!
                shadow.fleeing = true;
                const angle = Math.atan2(shadow.y - this.dog.y, shadow.x - this.dog.x);
                shadow.vx = Math.cos(angle) * S.fleeSpeed;
                shadow.vy = Math.sin(angle) * S.fleeSpeed;
            } else if (!shadow.fleeing) {
                // Gentle wandering
                shadow.wanderAngle += (Math.random() - 0.5) * 0.1;
                shadow.vx = Math.cos(shadow.wanderAngle) * S.speed;
                shadow.vy = Math.sin(shadow.wanderAngle) * S.speed;
            }

            shadow.x += shadow.vx * delta * 0.001;
            shadow.y += shadow.vy * delta * 0.001;

            // If fled off map, hide and respawn
            if (shadow.x < 64 || shadow.x > (this.mapWidth - 2) * 64 ||
                shadow.y < 64 || shadow.y > (this.mapHeight - 2) * 64) {
                shadow.visible = false;
                shadow.respawnTimer = S.respawnTime;
                continue;
            }

            // Draw shadow creature (amorphous dark shape)
            shadow.gfx.clear();
            shadow.gfx.setVisible(true);
            const wobble = Math.sin(time * 0.005 + shadow.homeX) * 3;
            shadow.gfx.fillStyle(0x111122, 0.6);
            shadow.gfx.fillEllipse(shadow.x, shadow.y, 24 + wobble, 16 - wobble);
            shadow.gfx.fillStyle(0x111122, 0.4);
            shadow.gfx.fillEllipse(shadow.x, shadow.y - 6, 16, 12);
            // Tiny glowing eyes
            shadow.gfx.fillStyle(0x8888FF, 0.5);
            shadow.gfx.fillCircle(shadow.x - 4, shadow.y - 8, 2);
            shadow.gfx.fillCircle(shadow.x + 4, shadow.y - 8, 2);
        }
    }

    // ==================== HUD ====================

    buildHUD() {
        // Location label
        this.locationLabel = this.add.text(0, 8, 'The Midnight Garden', {
            fontSize: '14px', fontFamily: 'Arial Black', color: '#B0BEC5',
            stroke: '#000000', strokeThickness: 3,
        }).setScrollFactor(0).setDepth(100).setOrigin(0.5, 0);

        // Firefly counter
        this.fireflyCounter = this.add.text(0, 28, '', {
            fontSize: '10px', fontFamily: 'Arial Black', color: '#AAFF44',
            stroke: '#000000', strokeThickness: 2,
        }).setScrollFactor(0).setDepth(100).setOrigin(0.5, 0);
        this.updateFireflyCounter();

        // Hint text
        this.hintText = this.add.text(0, 0, '', {
            fontSize: '9px', fontFamily: 'Arial', color: '#8899AA',
            stroke: '#000000', strokeThickness: 2,
            wordWrap: { width: 300 },
        }).setScrollFactor(0).setDepth(100).setOrigin(0.5, 1).setVisible(false);
    }

    updateFireflyCounter() {
        if (this.caughtFireflies > 0) {
            this.fireflyCounter.setText(`Fireflies: ${this.caughtFireflies}/${this.C.fireflies.maxCaught}`);
        } else {
            this.fireflyCounter.setText('');
        }
    }

    // ==================== DIALOGUE SYSTEM ====================

    showDialogue(npcId) {
        const npcData = this.C.npcs[npcId];
        if (!npcData) return;

        const npc = [this.lunaNPC, this.cosmoNPC, this.stargazerNPC, this.foxNPC]
            .find(n => n.id === npcId);
        if (!npc) return;

        let text;
        if (npcId === 'fox') {
            // Fox always mumbles random dream stuff
            const idx = Math.floor(Math.random() * npcData.dialogue.length);
            text = npcData.dialogue[idx];
        } else if (!npc.greeted && npcData.greeting) {
            // First interaction — greeting
            const idx = Math.floor(Math.random() * npcData.greeting.length);
            text = npcData.greeting[idx];
            npc.greeted = true;
        } else {
            // Cycle through dialogue
            text = npcData.dialogue[npc.dialogueIndex % npcData.dialogue.length];
            npc.dialogueIndex++;
        }

        // Show dialogue box
        this.dialogueActive = true;
        const cam = this.cameras.main;

        if (this.dialogueBox) this.dialogueBox.destroy();
        if (this.dialogueText) this.dialogueText.destroy();
        if (this.dialogueName) this.dialogueName.destroy();

        const boxW = 320;
        const boxH = 60;
        const boxX = cam.width / 2 - boxW / 2;
        const boxY = cam.height - boxH - 20;

        this.dialogueBox = this.add.graphics();
        this.dialogueBox.setScrollFactor(0).setDepth(110);
        this.dialogueBox.fillStyle(0x111122, 0.9);
        this.dialogueBox.fillRoundedRect(boxX, boxY, boxW, boxH, 8);
        this.dialogueBox.lineStyle(2, 0x334466);
        this.dialogueBox.strokeRoundedRect(boxX, boxY, boxW, boxH, 8);

        const nameColor = npcId === 'luna' ? '#B0BEC5' :
                          npcId === 'cosmo' ? '#CE93D8' :
                          npcId === 'fox' ? '#FFAB91' : '#FFE082';

        this.dialogueName = this.add.text(boxX + 10, boxY + 6,
            npcData.title ? `${npcData.name} — ${npcData.title}` : npcData.name, {
            fontSize: '8px', fontFamily: 'Arial Black', color: nameColor,
        }).setScrollFactor(0).setDepth(111);

        this.dialogueText = this.add.text(boxX + 10, boxY + 20, text, {
            fontSize: '9px', fontFamily: 'Arial', color: '#CCCCDD',
            wordWrap: { width: boxW - 20 },
        }).setScrollFactor(0).setDepth(111);

        // Auto-dismiss after delay
        this.time.delayedCall(3500, () => this.dismissDialogue());
    }

    showLanternMessage(message) {
        this.dialogueActive = true;
        const cam = this.cameras.main;

        if (this.dialogueBox) this.dialogueBox.destroy();
        if (this.dialogueText) this.dialogueText.destroy();
        if (this.dialogueName) this.dialogueName.destroy();

        const boxW = 320;
        const boxH = 50;
        const boxX = cam.width / 2 - boxW / 2;
        const boxY = cam.height - boxH - 20;

        this.dialogueBox = this.add.graphics();
        this.dialogueBox.setScrollFactor(0).setDepth(110);
        this.dialogueBox.fillStyle(0x1A1500, 0.9);
        this.dialogueBox.fillRoundedRect(boxX, boxY, boxW, boxH, 8);
        this.dialogueBox.lineStyle(2, 0x665500);
        this.dialogueBox.strokeRoundedRect(boxX, boxY, boxW, boxH, 8);

        this.dialogueName = this.add.text(boxX + 10, boxY + 6, 'Memory Lantern', {
            fontSize: '8px', fontFamily: 'Arial Black', color: '#FFD54F',
        }).setScrollFactor(0).setDepth(111);

        this.dialogueText = this.add.text(boxX + 10, boxY + 20, `"${message}"`, {
            fontSize: '9px', fontFamily: 'Arial', color: '#FFE082',
            fontStyle: 'italic', wordWrap: { width: boxW - 20 },
        }).setScrollFactor(0).setDepth(111);

        this.time.delayedCall(4000, () => this.dismissDialogue());
    }

    dismissDialogue() {
        if (this.dialogueBox) { this.dialogueBox.destroy(); this.dialogueBox = null; }
        if (this.dialogueText) { this.dialogueText.destroy(); this.dialogueText = null; }
        if (this.dialogueName) { this.dialogueName.destroy(); this.dialogueName = null; }
        if (this.constellationGfx) { this.constellationGfx.destroy(); this.constellationGfx = null; }
        this.dialogueActive = false;
    }

    showConstellation() {
        if (!this.constellationIndex) this.constellationIndex = 0;
        const constellations = this.C.constellations;
        const c = constellations[this.constellationIndex % constellations.length];
        this.constellationIndex++;

        this.dialogueActive = true;
        const cam = this.cameras.main;

        if (this.dialogueBox) this.dialogueBox.destroy();
        if (this.dialogueText) this.dialogueText.destroy();
        if (this.dialogueName) this.dialogueName.destroy();
        if (this.constellationGfx) this.constellationGfx.destroy();

        // Star field background
        const starBgW = 320;
        const starBgH = 100;
        const boxX = cam.width / 2 - starBgW / 2;
        const boxY = cam.height / 2 - starBgH / 2 - 30;

        this.constellationGfx = this.add.graphics();
        this.constellationGfx.setScrollFactor(0).setDepth(112);
        // Dark sky bg
        this.constellationGfx.fillStyle(0x050520, 0.95);
        this.constellationGfx.fillRoundedRect(boxX, boxY, starBgW, starBgH, 8);
        this.constellationGfx.lineStyle(2, 0x223355);
        this.constellationGfx.strokeRoundedRect(boxX, boxY, starBgW, starBgH, 8);
        // Random stars
        for (let i = 0; i < 30; i++) {
            const sx = boxX + 10 + Math.random() * (starBgW - 20);
            const sy = boxY + 10 + Math.random() * (starBgH - 20);
            this.constellationGfx.fillStyle(0xFFFFFF, 0.3 + Math.random() * 0.5);
            this.constellationGfx.fillCircle(sx, sy, 0.5 + Math.random());
        }
        // "Constellation" — connected bright stars
        const numStars = 4 + Math.floor(Math.random() * 4);
        const cStars = [];
        for (let i = 0; i < numStars; i++) {
            cStars.push({
                x: boxX + 40 + (i / numStars) * (starBgW - 80) + (Math.random() - 0.5) * 40,
                y: boxY + 20 + Math.random() * (starBgH - 40),
            });
        }
        // Lines between stars
        this.constellationGfx.lineStyle(1, 0x4488CC, 0.5);
        for (let i = 0; i < cStars.length - 1; i++) {
            this.constellationGfx.lineBetween(cStars[i].x, cStars[i].y, cStars[i + 1].x, cStars[i + 1].y);
        }
        // Bright stars
        for (const s of cStars) {
            this.constellationGfx.fillStyle(0xFFFFFF, 0.8);
            this.constellationGfx.fillCircle(s.x, s.y, 2.5);
            this.constellationGfx.fillStyle(0x88BBFF, 0.3);
            this.constellationGfx.fillCircle(s.x, s.y, 6);
        }

        // Info box below
        const infoY = boxY + starBgH + 8;
        this.dialogueBox = this.add.graphics();
        this.dialogueBox.setScrollFactor(0).setDepth(110);
        this.dialogueBox.fillStyle(0x111122, 0.9);
        this.dialogueBox.fillRoundedRect(boxX, infoY, starBgW, 45, 8);
        this.dialogueBox.lineStyle(2, 0x334466);
        this.dialogueBox.strokeRoundedRect(boxX, infoY, starBgW, 45, 8);

        this.dialogueName = this.add.text(boxX + 10, infoY + 6, c.name, {
            fontSize: '10px', fontFamily: 'Arial Black', color: '#88BBFF',
        }).setScrollFactor(0).setDepth(111);

        this.dialogueText = this.add.text(boxX + 10, infoY + 22, c.desc, {
            fontSize: '8px', fontFamily: 'Arial', color: '#AABBCC',
            wordWrap: { width: starBgW - 20 },
        }).setScrollFactor(0).setDepth(111);

        this.time.delayedCall(5000, () => this.dismissDialogue());
    }

    // ==================== INTERACTION ====================

    checkInteractions() {
        if (this.dialogueActive) return;

        const dogX = this.dog.x;
        const dogY = this.dog.y;
        let showPrompt = false;

        // Check NPC proximity
        const npcsToCheck = [this.lunaNPC, this.cosmoNPC, this.stargazerNPC, this.foxNPC];
        for (const npc of npcsToCheck) {
            const dist = Phaser.Math.Distance.Between(dogX, dogY, npc.x, npc.y);
            if (dist < 80) {
                this.interactPrompt.setPosition(npc.x, npc.y - 40);
                this.interactPrompt.setText('[E] Talk');
                this.interactPrompt.setVisible(true);
                showPrompt = true;

                if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
                    this.showDialogue(npc.id);
                }
                break;
            }
        }

        // Check lantern proximity (large radius since lanterns hang above in tree canopy)
        if (!showPrompt) {
            for (const lantern of this.lanterns) {
                const dist = Phaser.Math.Distance.Between(dogX, dogY, lantern.x, lantern.y);
                if (dist < 140) {
                    this.interactPrompt.setPosition(lantern.x, lantern.y - 30);
                    this.interactPrompt.setText('[E] Read');
                    this.interactPrompt.setVisible(true);
                    showPrompt = true;

                    if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
                        this.showLanternMessage(lantern.message);
                    }
                    break;
                }
            }
        }

        // Check telescope (when inside the tower)
        if (!showPrompt && this.isIndoors && this.currentRoom === 'tower') {
            const telescopeX = 2.5 * 64;
            const telescopeY = this.interiorStartRow * 64 + 2.5 * 64;
            const tDist = Phaser.Math.Distance.Between(dogX, dogY, telescopeX, telescopeY);
            if (tDist < 80) {
                this.interactPrompt.setPosition(telescopeX, telescopeY - 40);
                this.interactPrompt.setText('[E] Look through telescope');
                this.interactPrompt.setVisible(true);
                showPrompt = true;

                if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
                    this.showConstellation();
                }
            }
        }

        // Check firefly proximity (for catching hint)
        if (!showPrompt) {
            for (const ff of this.fireflies) {
                if (ff.caught) continue;
                const dist = Phaser.Math.Distance.Between(dogX, dogY, ff.x, ff.y);
                if (dist < this.C.fireflies.catchRadius) {
                    this.interactPrompt.setPosition(ff.x, ff.y - 20);
                    this.interactPrompt.setText('[E] Catch');
                    this.interactPrompt.setVisible(true);
                    showPrompt = true;
                    break;
                }
            }
        }

        // Check portal back
        const portalDist = Phaser.Math.Distance.Between(
            dogX, dogY,
            this.portalBack.x * 64 + 32, this.portalBack.y * 64 + 32
        );
        if (portalDist < 64) {
            this.interactPrompt.setPosition(this.portalBack.x * 64 + 32, this.portalBack.y * 64 - 16);
            this.interactPrompt.setText('[E] Return');
            this.interactPrompt.setVisible(true);
            showPrompt = true;

            if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
                this.returnToMainMap();
            }
        }

        if (!showPrompt) {
            this.interactPrompt.setVisible(false);
        }
    }

    returnToMainMap() {
        this.scene.stop('UIScene');
        this.scene.start('GameScene', { dogConfig: this.dogConfig });
    }

    // ==================== DOOR SYSTEM ====================

    checkDoors() {
        if (this.doorCooldown > 0) return;

        const dogTX = Math.floor(this.dog.x / 64);
        const dogTY = Math.floor(this.dog.y / 64);

        for (const door of this.doors) {
            if (!this.isIndoors && dogTX === door.outside.x && dogTY === door.outside.y) {
                this.teleportDog(door.inside.x * 64 + 32, door.inside.y * 64 + 32);
                this.isIndoors = true;
                this.currentRoom = door.buildingId;
                this.enterRoom(door.buildingId);
                this.doorCooldown = 500;
                return;
            }

            if (this.isIndoors && door.insideExit &&
                dogTX === door.insideExit.x && dogTY === door.insideExit.y) {
                this.teleportDog(door.outsideReturn.x * 64 + 32, door.outsideReturn.y * 64 + 32);
                this.isIndoors = false;
                this.currentRoom = null;
                this.exitRoom();
                this.doorCooldown = 500;
                return;
            }
        }
    }

    enterRoom(roomId) {
        const bounds = this.roomBounds[roomId];
        if (!bounds) return;

        this.cameras.main.setBounds(bounds.fullX, bounds.fullY, bounds.fullWidth, bounds.fullHeight);
        // Extend bottom by 1 tile so the dog can reach the exit door on the wall row
        const pad = 8;
        this.dog.body.setBoundsRectangle(new Phaser.Geom.Rectangle(
            bounds.x + pad, bounds.y + pad,
            bounds.width - pad * 2, bounds.height - pad + 64
        ));

        // Update location label
        const names = { tower: "Stargazer's Tower", library: 'The Night Library', lostfound: "Cosmo's Lost & Found" };
        this.locationLabel.setText(names[roomId] || 'Indoors');
    }

    exitRoom() {
        this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
        this.dog.body.setBoundsRectangle(new Phaser.Geom.Rectangle(0, 0, this.worldWidth, this.worldHeight));
        this.locationLabel.setText('The Midnight Garden');
    }

    teleportDog(x, y) {
        this.dog.x = x;
        this.dog.y = y;
        this.dog.body.reset(x, y);
        this.cameras.main.flash(200, 0, 0, 30, false);
    }

    // ==================== PEE SYSTEM (GLOW PUDDLES) ====================

    buildGrassTileSet() {
        const T = this.C.tiles;
        for (let y = 0; y < this.mapHeight; y++) {
            for (let x = 0; x < this.mapWidth; x++) {
                const t = this.mapData[y][x];
                if (t === T.NIGHT_GRASS || t === T.DARK_ZONE || t === T.WILLOW_GROUND || t === T.LANTERN_TILE) {
                    this.grassTiles.add(`${x},${y}`);
                }
            }
        }
    }

    isOnGrass(worldX, worldY) {
        const tileX = Math.floor(worldX / 64);
        const tileY = Math.floor(worldY / 64);
        return this.grassTiles.has(`${tileX},${tileY}`);
    }

    startPuddle() {
        if (this.activePuddle) return;
        const pos = this.dog.getPeePosition();
        const visual = this.add.graphics();
        visual.setDepth(1);

        this.activePuddle = {
            graphics: visual, x: pos.x, y: pos.y, radius: 3,
            onGrass: this.isOnGrass(pos.x, pos.y),
        };
    }

    updatePeeing(time, delta) {
        if (!this.activePuddle || !this.dog.isPeeing) return;
        const puddle = this.activePuddle;
        puddle.radius = Math.min(puddle.radius + (30 * delta / 1000), 25);

        // Glow puddle instead of yellow!
        puddle.graphics.clear();
        // Outer glow
        puddle.graphics.fillStyle(0x00DDFF, 0.15);
        puddle.graphics.fillEllipse(puddle.x, puddle.y, puddle.radius * 3, puddle.radius * 2);
        // Inner glow
        puddle.graphics.fillStyle(0x00FFCC, 0.3);
        puddle.graphics.fillEllipse(puddle.x, puddle.y, puddle.radius * 2, puddle.radius * 1.4);
        // Core
        puddle.graphics.fillStyle(0x66FFDD, 0.5);
        puddle.graphics.fillEllipse(puddle.x, puddle.y, puddle.radius, puddle.radius * 0.7);

        // Check NPC reactions
        this.checkPeeReactions(puddle);
    }

    finishPuddle() {
        if (!this.activePuddle) return;
        this.puddles.push(this.activePuddle);
        this.activePuddle = null;
    }

    checkPeeReactions(puddle) {
        const npcsToCheck = [this.lunaNPC, this.cosmoNPC, this.stargazerNPC];
        for (const npc of npcsToCheck) {
            const dist = Phaser.Math.Distance.Between(puddle.x, puddle.y, npc.x, npc.y);
            if (dist < 80 && !this.dialogueActive) {
                const npcData = this.C.npcs[npc.id];
                if (npcData.peeReaction) {
                    this.showPeeReaction(npc.id, npcData.peeReaction);
                }
            }
        }
    }

    showPeeReaction(npcId, text) {
        this.dialogueActive = true;
        const cam = this.cameras.main;

        if (this.dialogueBox) this.dialogueBox.destroy();
        if (this.dialogueText) this.dialogueText.destroy();
        if (this.dialogueName) this.dialogueName.destroy();

        const boxW = 320;
        const boxH = 50;
        const boxX = cam.width / 2 - boxW / 2;
        const boxY = cam.height - boxH - 20;

        this.dialogueBox = this.add.graphics();
        this.dialogueBox.setScrollFactor(0).setDepth(110);
        this.dialogueBox.fillStyle(0x220000, 0.9);
        this.dialogueBox.fillRoundedRect(boxX, boxY, boxW, boxH, 8);
        this.dialogueBox.lineStyle(2, 0x663333);
        this.dialogueBox.strokeRoundedRect(boxX, boxY, boxW, boxH, 8);

        const npcData = this.C.npcs[npcId];
        this.dialogueName = this.add.text(boxX + 10, boxY + 6, npcData.name, {
            fontSize: '8px', fontFamily: 'Arial Black', color: '#FF6B6B',
        }).setScrollFactor(0).setDepth(111);

        this.dialogueText = this.add.text(boxX + 10, boxY + 20, text, {
            fontSize: '9px', fontFamily: 'Arial', color: '#FFAAAA',
            wordWrap: { width: boxW - 20 },
        }).setScrollFactor(0).setDepth(111);

        this.time.delayedCall(3000, () => this.dismissDialogue());
    }

    drawPeeStream() {
        this.peeStreamGraphics.clear();
        if (!this.dog.isPeeing || !this.activePuddle) return;

        const pos = this.dog.getPeePosition();
        this.peeStreamGraphics.lineStyle(2, 0x00DDFF, 0.6);
        this.peeStreamGraphics.lineBetween(
            pos.x, pos.y - 8,
            this.activePuddle.x, this.activePuddle.y
        );
    }

    // ==================== INPUT ====================

    handleInput(delta) {
        const uiScene = this.scene.get('UIScene');
        const peeHeld = this.peeKey.isDown || (uiScene && uiScene.peePressed);

        if (this.dog.isPeeing || this.dog.isAttacking || this.dog.knockbackTimer > 0) {
            if (this.dog.isPeeing && !peeHeld) {
                this.dog.stopPeeing();
                this.finishPuddle();
            }
            return;
        }

        if (this.dialogueActive) {
            this.dog.body.setVelocity(0, 0);
            this.dog.stopWalking();
            return;
        }

        let vx = 0, vy = 0;
        if (this.cursors.left.isDown || this.wasd.left.isDown) vx = -1;
        else if (this.cursors.right.isDown || this.wasd.right.isDown) vx = 1;
        if (this.cursors.up.isDown || this.wasd.up.isDown) vy = -1;
        else if (this.cursors.down.isDown || this.wasd.down.isDown) vy = 1;

        if (uiScene && uiScene.joystickVector) {
            const jv = uiScene.joystickVector;
            if (Math.abs(jv.x) > 0.1 || Math.abs(jv.y) > 0.1) { vx = jv.x; vy = jv.y; }
        }

        if (vx !== 0 && vy !== 0) {
            const len = Math.sqrt(vx * vx + vy * vy);
            vx /= len; vy /= len;
        }

        if (vx !== 0 || vy !== 0) {
            this.dog.body.setVelocity(vx * this.dog.speed, vy * this.dog.speed);
            this.dog.updateFacing(vx, vy);
            this.dog.startWalking();
            this.footstepTimer -= delta;
            if (this.footstepTimer <= 0) {
                soundManager.playFootstep();
                this.footstepTimer = 250;
            }
        } else {
            this.dog.body.setVelocity(0, 0);
            this.dog.stopWalking();
            this.footstepTimer = 0;
        }

        if (peeHeld) { this.dog.startPeeing(); this.startPuddle(); }

        if (Phaser.Input.Keyboard.JustDown(this.attackKey) || (uiScene && uiScene.attackJustPressed)) {
            this.dog.startAttack();
            if (uiScene) uiScene.attackJustPressed = false;
        }
    }

    // ==================== UPDATE LOOP ====================

    update(time, delta) {
        this.handleInput(delta);
        this.updatePeeing(time, delta);
        this.dog.update(time, delta);

        if (this.doorCooldown > 0) this.doorCooldown -= delta;
        this.checkDoors();
        this.checkInteractions();

        this.updateFireflies(time, delta);
        this.updateShadowCreatures(time, delta);
        this.updateFlashlight();

        // Update lantern bob
        for (const lantern of this.lanterns) {
            const bob = Math.sin(time * 0.002 + lantern.bobOffset) * 2;
            lantern.glowGfx.y = bob;
        }

        // HUD positioning
        const cam = this.cameras.main;
        this.locationLabel.setPosition(cam.width / 2, 8);
        this.fireflyCounter.setPosition(cam.width / 2, 28);
        this.hintText.setPosition(cam.width / 2, cam.height - 8);

        // Portal glow animation
        this.portalGlowPhase += 0.003 * delta;
        this.portalGlow.clear();
        const pa = 0.15 + Math.sin(this.portalGlowPhase) * 0.1;
        this.portalGlow.fillStyle(0x00DDFF, pa);
        this.portalGlow.fillCircle(15 * 64, 28 * 64, 40 + Math.sin(this.portalGlowPhase * 1.5) * 5);

        this.drawPeeStream();

        // Pond shimmer
        this.pondShimmer.clear();
        const shimPhase = time * 0.001;
        for (let i = 0; i < 5; i++) {
            const sx = 21 * 64 + Math.sin(shimPhase + i * 1.3) * 96 + 64;
            const sy = 6 * 64 + Math.cos(shimPhase * 0.7 + i * 0.9) * 64 + 32;
            const a = 0.15 + Math.sin(shimPhase * 2 + i) * 0.1;
            this.pondShimmer.fillStyle(0x00FFCC, a);
            this.pondShimmer.fillCircle(sx, sy, 6 + Math.sin(shimPhase + i) * 3);
        }

        // Show hint near entry when first starting
        if (time < 8000) {
            this.hintText.setText('Press [E] to interact with NPCs, lanterns, and fireflies');
            this.hintText.setVisible(true);
        } else if (time < 12000) {
            this.hintText.setAlpha((12000 - time) / 4000);
        } else {
            this.hintText.setVisible(false);
        }
    }

    // ==================== UTILITIES ====================

    drawStar(gfx, cx, cy, outerR, innerR, points) {
        const step = Math.PI / points;
        gfx.beginPath();
        for (let i = 0; i < points * 2; i++) {
            const r = i % 2 === 0 ? outerR : innerR;
            const angle = i * step - Math.PI / 2;
            const x = cx + Math.cos(angle) * r;
            const y = cy + Math.sin(angle) * r;
            if (i === 0) gfx.moveTo(x, y);
            else gfx.lineTo(x, y);
        }
        gfx.closePath();
        gfx.fillPath();
    }
}
