// Main gameplay scene — Phase 3 with expanded map and interiors

class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    init(data) {
        this.dogConfig = data ? data.dogConfig : null;
    }

    create() {
        this.tileSize = 64;
        // Outdoor: 45 wide x 30 tall, Interior zone: 45 wide x 18 tall (below, row 31+)
        this.mapWidth = 45;
        this.mapHeight = 50;
        this.worldWidth = this.mapWidth * this.tileSize;
        this.worldHeight = this.mapHeight * this.tileSize;
        this.outdoorRows = 30;
        this.interiorStartRow = 32;

        this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);

        // Track which zone the dog is in
        this.isIndoors = false;

        // Door links: { outsideTile: {x,y}, insideTile: {x,y}, buildingId }
        this.doors = [];

        // Room bounds for camera/physics restriction when indoors
        this.roomBounds = {};
        this.currentRoom = null;
        this.indoorOverlay = null;

        this.buildMap();
        this.buildInteriors();
        this.renderMap();
        this.buildFurniture();
        this.buildOutdoorDecorations();

        this.puddles = [];
        this.activePuddle = null;

        // Spawn dog in the park area
        this.dog = new Dog(this, 10 * 64 + 32, 6 * 64 + 32, this.dogConfig);

        // Create NPCs
        this.npcs = [];
        for (const spawn of NPC_CONFIG.spawnPoints) {
            this.spawnNPC(spawn.x, spawn.y, spawn);
        }
        for (const special of NPC_CONFIG.specialNPCs) {
            this.spawnNPC(special.x, special.y, special);
        }
        // Indoor NPCs
        for (const indoor of NPC_CONFIG.indoorNPCs) {
            this.spawnNPC(indoor.x, indoor.y, indoor);
        }

        this.physics.add.collider(this.dog, this.wallBodies);

        this.cameras.main.startFollow(this.dog, true, 0.08, 0.08);
        this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
        this.cameras.main.setZoom(1.5);

        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D,
        });
        this.peeKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.attackKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F);

        this.scene.launch('UIScene');

        this.grassTiles = new Set();
        this.buildGrassTileSet();

        this.peeStreamGraphics = this.add.graphics();
        this.peeStreamGraphics.setDepth(9);

        // Door cooldown to prevent rapid teleporting
        this.doorCooldown = 0;

        // Audio tracking
        this.footstepTimer = 0;
        this.lastReactionSoundTime = 0;

        // Location label
        this.locationLabel = this.add.text(0, 0, '', {
            fontSize: '14px', fontFamily: 'Arial Black', color: '#FFFFFF',
            stroke: '#000000', strokeThickness: 3,
        }).setScrollFactor(0).setDepth(100).setOrigin(0.5, 0);
    }

    // ==================== MAP BUILDING ====================

    buildMap() {
        // Tile legend:
        // 0=grass 1=sidewalk 2=road 3=wall 4=roof 5=darkgrass 6=water
        // 7=woodfloor 8=door 9=churchwall 10=churchroof 11=intwall
        // 12=tilefloor 13=carpet 14=patio 15=exitdoor
        const T = this.tileSize;
        this.mapData = [];
        for (let y = 0; y < this.mapHeight; y++) {
            this.mapData[y] = [];
            for (let x = 0; x < this.mapWidth; x++) {
                if (y >= this.outdoorRows && y < this.interiorStartRow) {
                    this.mapData[y][x] = 3; // wall barrier between outdoor/indoor
                } else if (y >= this.interiorStartRow) {
                    this.mapData[y][x] = 11; // interior wall by default (will be overwritten)
                } else {
                    this.mapData[y][x] = 0; // grass
                }
            }
        }

        // ---- PARK (top-left, 1-12 x 1-12) ----
        for (let y = 1; y < 13; y++) {
            for (let x = 1; x < 13; x++) {
                if (y === 1 || y === 12 || x === 1 || x === 12) {
                    this.mapData[y][x] = 5;
                }
            }
        }
        // Pond
        for (let y = 3; y < 6; y++) {
            for (let x = 3; x < 6; x++) {
                this.mapData[y][x] = 6;
            }
        }
        // Park paths (sidewalk)
        for (let x = 2; x < 12; x++) this.mapData[7][x] = 1;
        for (let y = 2; y < 12; y++) this.mapData[y][7] = 1;

        // ---- ROADS ----
        // Horizontal road row 14
        for (let x = 0; x < this.mapWidth; x++) this.mapData[14][x] = 2;
        // Horizontal road row 22
        for (let x = 0; x < this.mapWidth; x++) this.mapData[22][x] = 2;
        // Vertical road col 15
        for (let y = 0; y < this.outdoorRows; y++) this.mapData[y][15] = 2;
        // Vertical road col 30
        for (let y = 0; y < this.outdoorRows; y++) this.mapData[y][30] = 2;

        // ---- SIDEWALKS along roads ----
        for (let x = 0; x < this.mapWidth; x++) {
            if (this.mapData[13][x] === 0) this.mapData[13][x] = 1;
            if (this.mapData[15][x] === 2) continue;
            if (this.mapData[15][x] === 0) this.mapData[15][x] = 1;
        }
        for (let x = 0; x < this.mapWidth; x++) {
            if (this.mapData[21][x] === 0) this.mapData[21][x] = 1;
            if (this.mapData[23][x] === 0) this.mapData[23][x] = 1;
        }
        for (let y = 0; y < this.outdoorRows; y++) {
            if (this.mapData[y][14] === 0) this.mapData[y][14] = 1;
            if (this.mapData[y][16] === 0) this.mapData[y][16] = 1;
            if (this.mapData[y][29] === 0) this.mapData[y][29] = 1;
            if (this.mapData[y][31] === 0) this.mapData[y][31] = 1;
        }

        // ---- CHURCH (top-right, 18-24 x 2-8) ----
        this.addBuilding(18, 2, 7, 6, 9, 10); // church uses stone walls, dark roof
        // Cross on top (just a decoration drawn later)

        // ---- HOUSE 1 (left of south road, 2-7 x 17-20) ----
        this.addBuilding(2, 17, 5, 4, 3, 4);
        this.mapData[20][4] = 8; // door
        this.doors.push({
            outside: { x: 4, y: 20 }, outsideReturn: { x: 4, y: 21 },
            inside: { x: 5, y: 38 }, buildingId: 'house1',
        });

        // ---- HOUSE 2 (right of south road, 8-13 x 17-20) ----
        this.addBuilding(8, 17, 5, 4, 3, 4);
        this.mapData[20][10] = 8; // door
        this.doors.push({
            outside: { x: 10, y: 20 }, outsideReturn: { x: 10, y: 21 },
            inside: { x: 16, y: 38 }, buildingId: 'house2',
        });

        // ---- HOUSE 3 (bottom area, 2-7 x 25-28) ----
        this.addBuilding(2, 25, 5, 4, 3, 4);
        this.mapData[28][4] = 8; // door
        this.doors.push({
            outside: { x: 4, y: 28 }, outsideReturn: { x: 4, y: 29 },
            inside: { x: 27, y: 38 }, buildingId: 'house3',
        });

        // ---- HOUSE 4 (bottom right, 32-37 x 25-28) ----
        this.addBuilding(32, 25, 5, 4, 3, 4);
        this.mapData[28][34] = 8; // door
        this.doors.push({
            outside: { x: 34, y: 28 }, outsideReturn: { x: 34, y: 29 },
            inside: { x: 38, y: 38 }, buildingId: 'house4',
        });

        // ---- RESTAURANT / CAFE (18-25 x 17-20) ----
        this.addBuilding(18, 17, 7, 4, 3, 4);
        // Outdoor patio in front
        for (let y = 20; y < 22; y++) {
            for (let x = 18; x < 25; x++) {
                if (this.mapData[y][x] === 0 || this.mapData[y][x] === 1) {
                    this.mapData[y][x] = 14;
                }
            }
        }

        // ---- BUSINESS with brick wall (32-38 x 5-9) — for Ukraine flag ----
        this.addBuilding(32, 5, 6, 5, 3, 4);

        // ---- Additional buildings for variety ----
        // Shop (32-38 x 17-20)
        this.addBuilding(32, 17, 6, 4, 3, 4);

        // Tall building (38-43 x 2-10)
        this.addBuilding(38, 2, 5, 8, 3, 4);

        // Road markings
        this.roadMarkingsGfx = this.add.graphics();
        this.roadMarkingsGfx.setDepth(1);
        this.roadMarkingsGfx.fillStyle(0xFFFF00, 0.6);
        for (let x = 0; x < this.worldWidth; x += 48) {
            this.roadMarkingsGfx.fillRect(x, 14 * 64 + 30, 24, 4);
            this.roadMarkingsGfx.fillRect(x, 22 * 64 + 30, 24, 4);
        }
        for (let y = 0; y < this.outdoorRows * 64; y += 48) {
            this.roadMarkingsGfx.fillRect(15 * 64 + 30, y, 4, 24);
            this.roadMarkingsGfx.fillRect(30 * 64 + 30, y, 4, 24);
        }

    }

    renderMap() {
        const textureMap = [
            'grass', 'sidewalk', 'road', 'wall', 'roof', 'darkgrass', 'water',
            'woodfloor', 'door', 'churchwall', 'churchroof', 'intwall',
            'tilefloor', 'carpet', 'patio', 'exitdoor',
        ];
        for (let y = 0; y < this.mapHeight; y++) {
            for (let x = 0; x < this.mapWidth; x++) {
                const t = this.mapData[y][x];
                this.add.image(x * 64 + 32, y * 64 + 32, textureMap[t]).setDepth(0);
            }
        }

        // Collision for solid tiles
        this.wallBodies = this.physics.add.staticGroup();
        const solidTiles = new Set([3, 4, 6, 9, 10, 11]);
        for (let y = 0; y < this.mapHeight; y++) {
            for (let x = 0; x < this.mapWidth; x++) {
                if (solidTiles.has(this.mapData[y][x])) {
                    const w = this.wallBodies.create(x * 64 + 32, y * 64 + 32, null);
                    w.setVisible(false);
                    w.body.setSize(64, 64);
                    w.refreshBody();
                }
            }
        }
    }

    addBuilding(tx, ty, w, h, wallTile, roofTile) {
        for (let y = ty; y < ty + h; y++) {
            for (let x = tx; x < tx + w; x++) {
                if (x < this.mapWidth && y < this.outdoorRows) {
                    this.mapData[y][x] = (y === ty) ? roofTile : wallTile;
                }
            }
        }
    }

    buildInteriors() {
        // Each interior room is 10 wide x 8 tall, starting at interiorStartRow
        // Layout per room: walls on perimeter, wood floor inside, door at bottom center
        const rooms = [
            { id: 'house1', startX: 0, startY: this.interiorStartRow },
            { id: 'house2', startX: 11, startY: this.interiorStartRow },
            { id: 'house3', startX: 22, startY: this.interiorStartRow },
            { id: 'house4', startX: 33, startY: this.interiorStartRow },
        ];

        for (const room of rooms) {
            const sx = room.startX;
            const sy = room.startY;
            const rw = 10;
            const rh = 8;

            // Store room pixel bounds (inner walkable area, 1 tile inset from walls)
            this.roomBounds[room.id] = {
                x: (sx + 1) * 64,
                y: (sy + 1) * 64,
                width: (rw - 2) * 64,
                height: (rh - 2) * 64,
                // Full room bounds including walls (for camera)
                fullX: sx * 64,
                fullY: sy * 64,
                fullWidth: rw * 64,
                fullHeight: rh * 64,
            };

            for (let y = sy; y < sy + rh; y++) {
                for (let x = sx; x < sx + rw; x++) {
                    if (x >= this.mapWidth || y >= this.mapHeight) continue;
                    if (y === sy || y === sy + rh - 1 || x === sx || x === sx + rw - 1) {
                        this.mapData[y][x] = 11; // interior wall
                    } else {
                        // Mix of floor types
                        if (x >= sx + 7 && y >= sy + 1 && y <= sy + 3) {
                            this.mapData[y][x] = 12; // tile floor (kitchen area)
                        } else if (x >= sx + 7 && y >= sy + 5) {
                            this.mapData[y][x] = 12; // tile floor (bathroom)
                        } else if (x <= sx + 4 && y >= sy + 4) {
                            this.mapData[y][x] = 13; // carpet (living room)
                        } else {
                            this.mapData[y][x] = 7; // wood floor
                        }
                    }
                }
            }

            // Exit door at bottom center of room
            const doorX = sx + 5;
            const doorY = sy + rh - 1;
            this.mapData[doorY][doorX] = 15; // exit door

            // Find matching door link and add inside->outside
            const link = this.doors.find(d => d.buildingId === room.id);
            if (link) {
                link.insideExit = { x: doorX, y: doorY };
            }
        }
    }

    buildFurniture() {
        const gfx = this.add.graphics();
        gfx.setDepth(2);

        const rooms = [
            { startX: 0, startY: this.interiorStartRow },
            { startX: 11, startY: this.interiorStartRow },
            { startX: 22, startY: this.interiorStartRow },
            { startX: 33, startY: this.interiorStartRow },
        ];

        for (const room of rooms) {
            const ox = room.startX * 64;
            const oy = room.startY * 64;

            // Couch (living room, bottom-left area)
            this.placeDecoration('deco_couch', ox + 2 * 64, oy + 5 * 64, 2,
                () => this.drawCouch(gfx, ox + 2 * 64, oy + 5 * 64));

            // Table with chairs (center)
            this.placeDecoration('deco_dining_table', ox + 4 * 64 + 32, oy + 2 * 64 + 32, 2,
                () => this.drawTable(gfx, ox + 4 * 64 + 32, oy + 2 * 64 + 32));

            // Kitchen counter (top-right)
            this.placeDecoration('deco_kitchen_counter', ox + 8 * 64 + 5, oy + 1.5 * 64, 2,
                () => this.drawKitchenCounter(gfx, ox + 8 * 64, oy + 1.5 * 64));

            // Fridge
            this.placeDecoration('deco_fridge', ox + 8 * 64 - 8, oy + 1.5 * 64 - 33, 2,
                () => this.drawFridge(gfx, ox + 8 * 64, oy + 1.5 * 64));

            // Toilet (bottom-right)
            this.placeDecoration('deco_toilet', ox + 8 * 64 + 16, oy + 6 * 64, 2,
                () => this.drawToilet(gfx, ox + 8 * 64 + 16, oy + 6 * 64));

            // Bathroom divider wall segment (visual only, stays procedural)
            gfx.fillStyle(0xE8DCC8);
            gfx.fillRect(ox + 7 * 64 - 4, oy + 4.5 * 64, 8, 64 * 2);
            gfx.lineStyle(2, 0xCCBBA0);
            gfx.strokeRect(ox + 7 * 64 - 4, oy + 4.5 * 64, 8, 64 * 2);

            // Rug in living room
            this.placeDecoration('deco_rug', ox + 3 * 64, oy + 5.5 * 64, 1, () => {
                gfx.fillStyle(0xAA3333, 0.3);
                gfx.fillRect(ox + 1.5 * 64, oy + 4.5 * 64, 3 * 64, 2 * 64);
                gfx.lineStyle(1, 0x882222, 0.4);
                gfx.strokeRect(ox + 1.5 * 64, oy + 4.5 * 64, 3 * 64, 2 * 64);
            });
        }
    }

    placeDecoration(textureKey, x, y, depth, fallbackFn) {
        if (this.textures.exists(textureKey)) {
            this.add.image(x, y, textureKey).setDepth(depth);
        } else {
            fallbackFn();
        }
    }

    drawCouch(gfx, x, y) {
        gfx.fillStyle(0x5B3A7A);
        gfx.fillRect(x - 40, y - 10, 80, 30);
        gfx.lineStyle(2, 0x000000);
        gfx.strokeRect(x - 40, y - 10, 80, 30);
        gfx.fillStyle(0x4A2D6A);
        gfx.fillRect(x - 40, y - 18, 80, 10);
        gfx.strokeRect(x - 40, y - 18, 80, 10);
        gfx.lineStyle(1, 0x000000, 0.3);
        gfx.lineBetween(x - 12, y - 10, x - 12, y + 20);
        gfx.lineBetween(x + 14, y - 10, x + 14, y + 20);
        gfx.fillStyle(0x7B5BAA, 0.5);
        gfx.fillCircle(x - 30, y, 8);
        gfx.fillCircle(x + 30, y, 8);
    }

    drawTable(gfx, x, y) {
        gfx.fillStyle(0x8D6E63);
        gfx.fillRect(x - 30, y - 20, 60, 40);
        gfx.lineStyle(2, 0x000000);
        gfx.strokeRect(x - 30, y - 20, 60, 40);
        gfx.fillStyle(0x6D4C41);
        const legPositions = [[-26, -16], [22, -16], [-26, 12], [22, 12]];
        for (const [lx, ly] of legPositions) {
            gfx.fillRect(x + lx, y + ly, 4, 4);
        }
        gfx.fillStyle(0x5D4037);
        gfx.fillRect(x - 14, y - 32, 12, 10);
        gfx.fillRect(x + 4, y - 32, 12, 10);
        gfx.fillRect(x - 14, y + 22, 12, 10);
        gfx.fillRect(x + 4, y + 22, 12, 10);
    }

    drawKitchenCounter(gfx, x, y) {
        gfx.fillStyle(0x9E9E9E);
        gfx.fillRect(x - 20, y - 16, 50, 32);
        gfx.lineStyle(2, 0x000000);
        gfx.strokeRect(x - 20, y - 16, 50, 32);
        gfx.lineStyle(1, 0x333333);
        gfx.strokeCircle(x - 4, y - 4, 6);
        gfx.strokeCircle(x + 14, y - 4, 6);
        gfx.strokeCircle(x - 4, y + 10, 6);
        gfx.strokeCircle(x + 14, y + 10, 6);
    }

    drawFridge(gfx, x, y) {
        gfx.fillStyle(0xCCCCCC);
        gfx.fillRect(x - 20, y - 48, 24, 30);
        gfx.lineStyle(2, 0x000000);
        gfx.strokeRect(x - 20, y - 48, 24, 30);
        gfx.lineBetween(x - 20, y - 34, x + 4, y - 34);
        gfx.fillStyle(0x999999);
        gfx.fillRect(x, y - 44, 2, 8);
    }

    drawToilet(gfx, x, y) {
        gfx.fillStyle(0xF5F5F5);
        gfx.fillEllipse(x, y + 6, 22, 28);
        gfx.lineStyle(2, 0x000000);
        gfx.strokeEllipse(x, y + 6, 22, 28);
        gfx.fillStyle(0xEEEEEE);
        gfx.fillRect(x - 10, y - 14, 20, 12);
        gfx.strokeRect(x - 10, y - 14, 20, 12);
        gfx.lineStyle(1, 0xBBBBBB);
        gfx.strokeEllipse(x, y + 6, 16, 20);
        gfx.fillStyle(0x999999);
        gfx.fillRect(x + 8, y - 10, 6, 3);
    }

    buildOutdoorDecorations() {
        const gfx = this.add.graphics();
        gfx.setDepth(2);

        // Pond ducks
        this.ducks = [];
        this.ducksFleeing = false;
        this.ducksGone = false;
        this.spawnDuck(3 * 64 + 40, 3 * 64 + 44);
        this.spawnDuck(4 * 64 + 50, 4 * 64 + 30);
        this.spawnDuck(5 * 64 + 20, 5 * 64 + 20);

        // Park benches
        this.addBench(gfx, 9 * 64 + 32, 4 * 64 + 32);
        this.addBench(gfx, 9 * 64 + 32, 10 * 64 + 32);
        this.addBench(gfx, 4 * 64 + 32, 10 * 64 + 32);

        // Restaurant outdoor tables
        for (let i = 0; i < 3; i++) {
            const tx = (19 + i * 2) * 64 + 32;
            const ty = 20 * 64 + 32;
            this.addOutdoorTable(gfx, tx, ty);
        }

        // Church cross
        const crossX = 21 * 64;
        const crossY = 2 * 64 - 8;
        this.placeDecoration('deco_church_cross', crossX, crossY - 10, 2, () => {
            gfx.fillStyle(0xCCAA44);
            gfx.fillRect(crossX - 3, crossY - 24, 6, 28);
            gfx.fillRect(crossX - 10, crossY - 18, 20, 6);
            gfx.lineStyle(1, 0x000000);
            gfx.strokeRect(crossX - 3, crossY - 24, 6, 28);
            gfx.strokeRect(crossX - 10, crossY - 18, 20, 6);
        });

        // Restaurant sign
        this.placeDecoration('deco_cafe_sign', 21.5 * 64, 17 * 64 + 4, 3, () => {
            gfx.fillStyle(0xCC3333);
            gfx.fillRect(19 * 64, 17 * 64 - 4, 5 * 64, 16);
            gfx.lineStyle(1, 0x000000);
            gfx.strokeRect(19 * 64, 17 * 64 - 4, 5 * 64, 16);
            this.add.text(21.5 * 64, 17 * 64 + 4, 'CAFE', {
                fontSize: '10px', fontFamily: 'Arial Black', color: '#FFFFFF',
            }).setOrigin(0.5).setDepth(3);
        });

        // Ukraine flag wall
        this.placeDecoration('deco_ukraine_flag', 35 * 64, 8 * 64 + 32, 2, () => {
            gfx.fillStyle(0x0057B7);
            gfx.fillRect(33 * 64, 8 * 64, 4 * 64, 32);
            gfx.fillStyle(0xFFD700);
            gfx.fillRect(33 * 64, 8 * 64 + 32, 4 * 64, 32);
        });

        // --- WINDOWS on buildings ---
        // House 1
        this.addWindow(gfx, 3, 19);
        this.addWindow(gfx, 5, 19);
        // House 2
        this.addWindow(gfx, 9, 19);
        this.addWindow(gfx, 11, 19);
        // House 3
        this.addWindow(gfx, 3, 27);
        this.addWindow(gfx, 5, 27);
        // House 4
        this.addWindow(gfx, 33, 27);
        this.addWindow(gfx, 35, 27);
        // Church windows
        this.addWindow(gfx, 18, 4, true);
        this.addWindow(gfx, 18, 6, true);
        this.addWindow(gfx, 24, 4, true);
        this.addWindow(gfx, 24, 6, true);
        // Cafe windows
        this.addWindow(gfx, 19, 19);
        this.addWindow(gfx, 21, 19);
        this.addWindow(gfx, 23, 19);
        // Shop windows
        this.addWindow(gfx, 33, 19);
        this.addWindow(gfx, 35, 19);
        // Business building windows
        this.addWindow(gfx, 33, 7);
        this.addWindow(gfx, 35, 7);
        this.addWindow(gfx, 37, 7);
        // Tall building windows
        this.addWindow(gfx, 39, 4);
        this.addWindow(gfx, 41, 4);
        this.addWindow(gfx, 39, 6);
        this.addWindow(gfx, 41, 6);
        this.addWindow(gfx, 39, 8);
        this.addWindow(gfx, 41, 8);
    }

    addBench(gfx, x, y) {
        if (this.textures.exists('deco_bench')) {
            this.add.image(x, y, 'deco_bench').setDepth(2);
            return;
        }
        gfx.fillStyle(0x6D4C41);
        gfx.fillRect(x - 20, y - 6, 40, 12);
        gfx.lineStyle(2, 0x000000);
        gfx.strokeRect(x - 20, y - 6, 40, 12);
        gfx.fillStyle(0x4E342E);
        gfx.fillRect(x - 18, y + 6, 4, 8);
        gfx.fillRect(x + 14, y + 6, 4, 8);
    }

    addOutdoorTable(gfx, x, y) {
        if (this.textures.exists('deco_outdoor_table')) {
            this.add.image(x, y, 'deco_outdoor_table').setDepth(2);
            return;
        }
        gfx.fillStyle(0x8D6E63);
        gfx.fillCircle(x, y, 14);
        gfx.lineStyle(2, 0x000000);
        gfx.strokeCircle(x, y, 14);
        gfx.fillStyle(0x5D4037);
        gfx.fillRect(x - 18, y - 6, 8, 12);
        gfx.fillRect(x + 10, y - 6, 8, 12);
    }

    addWindow(gfx, tileX, tileY, tall) {
        const cx = tileX * 64 + 32;
        const cy = tileY * 64 + 32;
        const key = tall ? 'deco_window_tall' : 'deco_window_small';

        if (this.textures.exists(key)) {
            this.add.image(cx, cy, key).setDepth(2);
            return;
        }

        const w = 24;
        const h = tall ? 36 : 28;
        gfx.fillStyle(0x5C4033);
        gfx.fillRect(cx - w / 2 - 2, cy - h / 2 - 2, w + 4, h + 4);
        gfx.fillStyle(0x87CEEB, 0.8);
        gfx.fillRect(cx - w / 2, cy - h / 2, w, h);
        gfx.lineStyle(2, 0x5C4033);
        gfx.lineBetween(cx, cy - h / 2, cx, cy + h / 2);
        gfx.lineBetween(cx - w / 2, cy, cx + w / 2, cy);
        gfx.fillStyle(0xFFFFFF, 0.25);
        gfx.fillRect(cx - w / 2 + 2, cy - h / 2 + 2, 8, 10);
    }

    spawnDuck(x, y) {
        let duckObj;

        if (this.textures.exists('deco_duck')) {
            duckObj = this.add.image(x, y, 'deco_duck').setDepth(3);
        } else {
            const gfx = this.add.graphics();
            gfx.setDepth(3);
            gfx.fillStyle(0xF5F5F0);
            gfx.fillEllipse(0, 0, 18, 12);
            gfx.fillStyle(0xDDDDD0);
            gfx.fillEllipse(2, -1, 10, 7);
            gfx.fillStyle(0x2E7D32);
            gfx.fillCircle(-8, -6, 6);
            gfx.fillStyle(0x000000);
            gfx.fillCircle(-10, -7, 1.5);
            gfx.fillStyle(0xFF8C00);
            gfx.fillRect(-16, -7, 6, 3);
            gfx.lineStyle(1, 0x90CAF9, 0.5);
            gfx.strokeEllipse(0, 3, 24, 10);
            gfx.x = x;
            gfx.y = y;
            duckObj = gfx;
        }

        const duck = {
            gfx: duckObj,
            homeX: x, homeY: y,
            angle: Math.random() * Math.PI * 2,
            driftSpeed: 0.15 + Math.random() * 0.15,
            driftRadius: 12 + Math.random() * 10,
            bobOffset: Math.random() * Math.PI * 2,
        };
        this.ducks.push(duck);
    }

    updateDucks(time, delta) {
        if (this.ducksFleeing) {
            // Animate ducks flying away
            let allGone = true;
            for (const duck of this.ducks) {
                if (!duck.gfx.visible) continue;
                // Fly upward and to a random direction
                duck.gfx.x += duck.fleeVX * delta / 1000;
                duck.gfx.y += duck.fleeVY * delta / 1000;
                // Shrink as they fly away
                const s = duck.gfx.scaleY - 0.4 * delta / 1000;
                duck.gfx.scaleY = s;
                duck.gfx.scaleX = duck.fleeVX < 0 ? -s : s;
                if (s <= 0) {
                    duck.gfx.visible = false;
                } else {
                    allGone = false;
                }
            }
            if (allGone) {
                this.ducksFleeing = false;
                this.ducksGone = true;
            }
            return;
        }

        if (this.ducksGone) {
            // Respawn when pond is off-camera
            const cam = this.cameras.main;
            const pondCX = 4.5 * 64;
            const pondCY = 4 * 64;
            const camL = cam.scrollX;
            const camR = cam.scrollX + cam.width / cam.zoom;
            const camT = cam.scrollY;
            const camB = cam.scrollY + cam.height / cam.zoom;
            if (pondCX < camL || pondCX > camR || pondCY < camT || pondCY > camB) {
                // Pond is off screen — respawn ducks
                for (const duck of this.ducks) {
                    duck.gfx.x = duck.homeX;
                    duck.gfx.y = duck.homeY;
                    duck.gfx.scaleX = 1;
                    duck.gfx.scaleY = 1;
                    duck.gfx.visible = true;
                    duck.angle = Math.random() * Math.PI * 2;
                }
                this.ducksGone = false;
            }
            return;
        }

        // Normal pond drifting
        const minX = 3 * 64 + 14;
        const maxX = 6 * 64 - 14;
        const minY = 3 * 64 + 10;
        const maxY = 6 * 64 - 10;

        for (const duck of this.ducks) {
            duck.angle += duck.driftSpeed * 0.016;
            let nx = duck.homeX + Math.cos(duck.angle) * duck.driftRadius;
            let ny = duck.homeY + Math.sin(duck.angle * 0.7) * duck.driftRadius * 0.5;
            nx = Phaser.Math.Clamp(nx, minX, maxX);
            ny = Phaser.Math.Clamp(ny, minY, maxY);
            const bob = Math.sin(time * 0.003 + duck.bobOffset) * 1.5;
            duck.gfx.x = nx;
            duck.gfx.y = ny + bob;
            duck.gfx.scaleX = Math.cos(duck.angle) < 0 ? -1 : 1;
        }
    }

    scareTheDucks() {
        this.ducksFleeing = true;
        soundManager.playDuckScatter();
        for (const duck of this.ducks) {
            // Each duck flies off in a random upward direction
            duck.fleeVX = (Math.random() - 0.5) * 200;
            duck.fleeVY = -150 - Math.random() * 100;
        }
    }

    addBench(gfx, x, y) {
        gfx.fillStyle(0x6D4C41);
        gfx.fillRect(x - 20, y - 6, 40, 12);
        gfx.lineStyle(2, 0x000000);
        gfx.strokeRect(x - 20, y - 6, 40, 12);
        gfx.fillStyle(0x4E342E);
        gfx.fillRect(x - 18, y + 6, 4, 8);
        gfx.fillRect(x + 14, y + 6, 4, 8);
    }

    drawOutdoorTable(gfx, x, y) {
        // Small round table
        gfx.fillStyle(0x8D6E63);
        gfx.fillCircle(x, y, 14);
        gfx.lineStyle(2, 0x000000);
        gfx.strokeCircle(x, y, 14);
        // Chairs
        gfx.fillStyle(0x5D4037);
        gfx.fillRect(x - 18, y - 6, 8, 12);
        gfx.fillRect(x + 10, y - 6, 8, 12);
    }

    buildGrassTileSet() {
        for (let y = 0; y < this.mapHeight; y++) {
            for (let x = 0; x < this.mapWidth; x++) {
                const t = this.mapData[y][x];
                if (t === 0 || t === 5) this.grassTiles.add(`${x},${y}`);
            }
        }
    }

    isOnGrass(worldX, worldY) {
        const tileX = Math.floor(worldX / 64);
        const tileY = Math.floor(worldY / 64);
        return this.grassTiles.has(`${tileX},${tileY}`);
    }

    spawnNPC(x, y, config) {
        const npc = new NPC(this, x, y, config);
        this.npcs.push(npc);
        this.physics.add.collider(npc, this.wallBodies);
        return npc;
    }

    // ==================== DOOR SYSTEM ====================

    checkDoors() {
        if (this.doorCooldown > 0) return;

        const dogTX = Math.floor(this.dog.x / 64);
        const dogTY = Math.floor(this.dog.y / 64);

        for (const door of this.doors) {
            // Check outside door -> inside
            if (dogTX === door.outside.x && dogTY === door.outside.y) {
                this.teleportDog(door.inside.x * 64 + 32, door.inside.y * 64 + 32);
                this.isIndoors = true;
                this.currentRoom = door.buildingId;
                this.enterRoom(door.buildingId);
                this.doorCooldown = 500;
                return;
            }
            // Check inside exit door -> outside
            if (door.insideExit && dogTX === door.insideExit.x && dogTY === door.insideExit.y) {
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

        // Restrict camera to this room
        this.cameras.main.setBounds(
            bounds.fullX, bounds.fullY, bounds.fullWidth, bounds.fullHeight
        );

        // Restrict dog physics to inner walkable area (prevents corner escape)
        // Extend bottom by 1 tile so the dog can reach the exit door on the wall row
        const pad = 8;
        this.dog.body.setBoundsRectangle(new Phaser.Geom.Rectangle(
            bounds.x + pad, bounds.y + pad,
            bounds.width - pad * 2, bounds.height - pad + 64
        ));

        // Dark overlay to hide everything outside the room
        if (this.indoorOverlay) this.indoorOverlay.destroy();
        this.indoorOverlay = this.add.graphics();
        this.indoorOverlay.setDepth(99);
        this.indoorOverlay.fillStyle(0x000000, 1);
        // Draw a huge rect, then cut out the room with a clear fill
        // Approach: draw 4 rects around the room
        const rx = bounds.fullX;
        const ry = bounds.fullY;
        const rw = bounds.fullWidth;
        const rh = bounds.fullHeight;
        // Top
        this.indoorOverlay.fillRect(0, 0, this.worldWidth, ry);
        // Bottom
        this.indoorOverlay.fillRect(0, ry + rh, this.worldWidth, this.worldHeight - ry - rh);
        // Left
        this.indoorOverlay.fillRect(0, ry, rx, rh);
        // Right
        this.indoorOverlay.fillRect(rx + rw, ry, this.worldWidth - rx - rw, rh);
    }

    exitRoom() {
        // Restore full world camera bounds
        this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);

        // Restore full world physics bounds for dog
        this.dog.body.setBoundsRectangle(new Phaser.Geom.Rectangle(
            0, 0, this.worldWidth, this.worldHeight
        ));

        // Remove indoor overlay
        if (this.indoorOverlay) {
            this.indoorOverlay.destroy();
            this.indoorOverlay = null;
        }
    }

    teleportDog(x, y) {
        this.dog.x = x;
        this.dog.y = y;
        this.dog.body.reset(x, y);
        this.cameras.main.flash(200, 0, 0, 0, false);
        soundManager.playDoorTransition();
    }

    // ==================== UPDATE LOOP ====================

    update(time, delta) {
        this.handleInput(delta);
        this.updatePeeing(time, delta);
        this.updateNPCBehavior(time, delta);
        this.dog.update(time, delta);

        if (this.doorCooldown > 0) this.doorCooldown -= delta;
        this.checkDoors();

        // Update location label
        this.updateLocationLabel();

        // Animate pond ducks
        this.updateDucks(time, delta);

        for (let i = this.npcs.length - 1; i >= 0; i--) {
            const npc = this.npcs[i];
            if (!npc.active) { this.npcs.splice(i, 1); continue; }
            npc.update(time, delta);
        }

        this.drawPeeStream();
    }

    updateLocationLabel() {
        const cam = this.cameras.main;
        this.locationLabel.setPosition(cam.width / 2, 8);

        const ty = Math.floor(this.dog.y / 64);
        const tx = Math.floor(this.dog.x / 64);

        if (ty >= this.interiorStartRow) {
            this.locationLabel.setText('Indoors');
        } else if (tx >= 1 && tx <= 12 && ty >= 1 && ty <= 12) {
            this.locationLabel.setText('Town Park');
        } else if (tx >= 18 && tx <= 25 && ty >= 17 && ty <= 21) {
            this.locationLabel.setText('Cafe');
        } else if (this.mapData[ty] && this.mapData[ty][tx] === 2) {
            this.locationLabel.setText('');
        } else if (this.mapData[ty] && this.mapData[ty][tx] === 1) {
            this.locationLabel.setText('');
        } else {
            this.locationLabel.setText('');
        }
    }

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
            // Footstep sounds
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
            this.handleAttack();
            if (uiScene) uiScene.attackJustPressed = false;
        }
    }

    startPuddle() {
        if (this.activePuddle) return;
        const pos = this.dog.getPeePosition();
        const useImage = this.textures.exists('ui_puddle');

        let visual;
        if (useImage) {
            visual = this.add.image(pos.x, pos.y, 'ui_puddle');
            visual.setDepth(1);
            visual.setScale(0.1); // Start tiny, scale up as puddle grows
            visual.setAlpha(0.7);
        } else {
            visual = this.add.graphics();
            visual.setDepth(1);
        }

        this.activePuddle = {
            graphics: visual, x: pos.x, y: pos.y, radius: 3,
            onGrass: this.isOnGrass(pos.x, pos.y),
            useImage: useImage,
        };
        soundManager.playPuddleSplash();
        soundManager.playPeeStream();
    }

    updatePeeing(time, delta) {
        if (!this.activePuddle || !this.dog.isPeeing) return;
        const puddle = this.activePuddle;
        puddle.radius = Math.min(puddle.radius + (30 * delta / 1000), NPC_CONFIG.puddleMaxRadius);

        if (puddle.useImage) {
            // Scale image based on puddle radius (64px image, scale to match radius)
            const scale = (puddle.radius * 2) / 64;
            puddle.graphics.setScale(scale, scale * 0.7);
        } else {
            puddle.graphics.clear();
            puddle.graphics.fillStyle(0xFFE066, 0.6);
            puddle.graphics.fillEllipse(puddle.x, puddle.y, puddle.radius * 2, puddle.radius * 1.4);
            puddle.graphics.lineStyle(1, 0xCCB833, 0.4);
            puddle.graphics.strokeEllipse(puddle.x, puddle.y, puddle.radius * 2, puddle.radius * 1.4);
            if (puddle.radius > 10) {
                puddle.graphics.fillStyle(0xFFD633, 0.4);
                puddle.graphics.fillEllipse(puddle.x, puddle.y, puddle.radius, puddle.radius * 0.7);
            }
        }
        this.checkPuddleReactions(puddle);

        // Easter egg: ducks fly off if you pee on the pond
        if (!this.ducksFleeing && this.ducks.length > 0) {
            const pondCX = 4.5 * 64;
            const pondCY = 4 * 64;
            const dist = Phaser.Math.Distance.Between(puddle.x, puddle.y, pondCX, pondCY);
            if (dist < puddle.radius + 80) {
                this.scareTheDucks();
            }
        }
    }

    checkPuddleReactions(puddle) {
        for (const npc of this.npcs) {
            if (!npc.active) continue;
            const dist = Phaser.Math.Distance.Between(puddle.x, puddle.y, npc.x, npc.y);

            // Holy Man: reacts with "Holy Water!" when dog pees within 3 tiles
            if (npc.specialBehavior === 'holy_water') {
                if (dist <= 192 + puddle.radius) {
                    npc.startHolyWater();
                }
                continue;
            }

            if (dist > NPC_CONFIG.reactionDistance + puddle.radius) continue;
            if (puddle.onGrass && puddle.radius < NPC_CONFIG.puddleAngryThreshold && dist > 80) continue;

            if (puddle.radius >= NPC_CONFIG.puddleAngryThreshold) {
                if (npc.state !== 'angry' && npc.state !== 'kicking' && this.time.now - this.lastReactionSoundTime > 400) {
                    soundManager.playAngryReaction();
                    this.lastReactionSoundTime = this.time.now;
                }
                npc.reactAngry();
                const dogDist = Phaser.Math.Distance.Between(this.dog.x, this.dog.y, npc.x, npc.y);
                if (dogDist < NPC_CONFIG.kickDistance + 20 && npc.state === 'angry') {
                    npc.startKicking(this.dog.x, this.dog.y);
                    this.dog.applyKnockback(npc.x, npc.y);
                } else if (npc.state === 'angry') {
                    npc.startKicking(this.dog.x, this.dog.y);
                }
            } else if (puddle.radius >= NPC_CONFIG.puddlePositiveThreshold) {
                if (npc.state !== 'positive' && this.time.now - this.lastReactionSoundTime > 400) {
                    soundManager.playPositiveReaction();
                    this.lastReactionSoundTime = this.time.now;
                }
                npc.reactPositive();
            }
        }
    }

    finishPuddle() {
        if (this.activePuddle) {
            const g = this.activePuddle.graphics;
            this.tweens.add({ targets: g, alpha: 0, duration: 15000, onComplete: () => g.destroy() });
            this.puddles.push(this.activePuddle);
            this.activePuddle = null;
            soundManager.stopPeeStream();

            // Deactivate Holy Man's cup when peeing stops
            for (const npc of this.npcs) {
                if (npc.active && npc.specialBehavior === 'holy_water') {
                    npc.stopHolyWater();
                }
            }
        }
    }

    drawPeeStream() {
        this.peeStreamGraphics.clear();
        if (!this.dog.isPeeing || !this.activePuddle) return;
        const pos = this.dog.getPeePosition();
        const p = this.activePuddle;
        this.peeStreamGraphics.lineStyle(2, 0xFFE066, 0.8);
        this.peeStreamGraphics.beginPath();
        this.peeStreamGraphics.moveTo(pos.x, pos.y);
        this.peeStreamGraphics.lineTo(p.x + Math.sin(this.time.now * 0.02) * 2, p.y);
        this.peeStreamGraphics.strokePath();
        if (Math.random() > 0.6) {
            const d = this.add.circle(
                p.x + (Math.random() - 0.5) * p.radius,
                p.y + (Math.random() - 0.5) * p.radius * 0.7,
                1.5, 0xFFE066, 0.7
            ).setDepth(2);
            this.tweens.add({ targets: d, alpha: 0, scale: 0, duration: 400, onComplete: () => d.destroy() });
        }
    }

    handleAttack() {
        const hitbox = this.dog.getAttackHitbox();
        let hitNPC = null;
        for (const npc of this.npcs) {
            if (!npc.active || npc.state === 'attacked' || npc.state === 'leaving') continue;
            if (Phaser.Math.Distance.Between(hitbox.x, hitbox.y, npc.x, npc.y) < hitbox.radius) {
                hitNPC = npc; break;
            }
        }
        if (hitNPC) {
            soundManager.playAttackHit();
            soundManager.playAttackedScream();
            hitNPC.getAttacked();
            for (const npc of this.npcs) {
                if (!npc.active || npc === hitNPC || npc.state === 'attacked' || npc.state === 'leaving') continue;
                if (Phaser.Math.Distance.Between(this.dog.x, this.dog.y, npc.x, npc.y) < NPC_CONFIG.fleeDistance) {
                    npc.flee(this.dog.x, this.dog.y);
                }
            }
            this.checkAttackedNPCDistance(hitNPC);
        }
    }

    checkAttackedNPCDistance(npc) {
        const checker = this.time.addEvent({
            delay: 500, loop: true,
            callback: () => {
                if (!npc.active || npc.state !== 'attacked') { checker.remove(); return; }
                if (Phaser.Math.Distance.Between(this.dog.x, this.dog.y, npc.x, npc.y) > 120) {
                    npc.leaveAfterAttack(this.dog.x, this.dog.y);
                    checker.remove();
                }
            },
        });
    }

    updateNPCBehavior(time, delta) {
        for (const npc of this.npcs) {
            if (!npc.active) continue;
            if (npc.state === 'kicking') {
                if (Phaser.Math.Distance.Between(this.dog.x, this.dog.y, npc.x, npc.y) < NPC_CONFIG.kickDistance) {
                    this.dog.applyKnockback(npc.x, npc.y);
                }
            }
        }
    }
}
