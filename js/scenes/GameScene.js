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
        this.furnitureBodies = this.physics.add.staticGroup();
        this.buildFurniture();
        this.buildOutdoorDecorations();

        this.puddles = [];
        this.activePuddle = null;

        // --- Level system ---
        this.playerLevel = 1;
        this.playerXP = 0;
        this.lastAttackedNPC = null; // Track last attacked NPC for XP reset
        this.dogStartX = 10 * 64 + 32;
        this.dogStartY = 6 * 64 + 32;
        this.wearingPopeHat = false;

        // XP thresholds: level 1->2 = 10, 2->3 = 20, 3->4 = 40, etc.
        this.xpForLevel = [0, 10, 20, 40, 80, 160, 320, 640, 1280, 2560];

        // Spawn dog in the park area
        this.dog = new Dog(this, this.dogStartX, this.dogStartY, this.dogConfig);

        // Create NPCs
        this.npcs = [];
        for (const spawn of NPC_CONFIG.spawnPoints) {
            this.spawnNPC(spawn.x, spawn.y, spawn);
        }
        for (const special of NPC_CONFIG.specialNPCs) {
            this.spawnNPC(special.x, special.y, special);
        }
        // Indoor NPCs (from ROOM_LAYOUTS config)
        for (const [roomId, layout] of Object.entries(ROOM_LAYOUTS)) {
            const ox = layout.startX * 64;
            const oy = (layout.startY || this.interiorStartRow) * 64;
            for (const npcDef of layout.npcs) {
                const nx = ox + npcDef.relX * 64;
                const ny = oy + npcDef.relY * 64;
                this.spawnNPC(nx, ny, npcDef);
            }
        }

        this.physics.add.collider(this.dog, this.wallBodies);
        this.physics.add.collider(this.dog, this.furnitureBodies);

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

        // Frogger-style cars
        this.cars = [];
        this.spawnCars();

        // Audio tracking
        this.footstepTimer = 0;
        this.lastReactionSoundTime = 0;

        // Location label
        this.locationLabel = this.add.text(0, 0, '', {
            fontSize: '14px', fontFamily: 'Arial Black', color: '#FFFFFF',
            stroke: '#000000', strokeThickness: 3,
        }).setScrollFactor(0).setDepth(100).setOrigin(0.5, 0);

        // Door approach prompt (floating "▼ Enter" near doors)
        this.doorPrompt = this.add.text(0, 0, '\u25BC Enter', {
            fontSize: '11px', fontFamily: 'Arial Black', color: '#FFFFFF',
            stroke: '#000000', strokeThickness: 3,
        }).setOrigin(0.5).setDepth(10).setVisible(false);
    }

    // ==================== MAP BUILDING ====================

    buildMap() {
        // Tile legend:
        // 0=grass 1=sidewalk 2=road 3=wall 4=roof 5=darkgrass 6=water
        // 7=woodfloor 8=door 9=churchwall 10=churchroof 11=intwall
        // 12=tilefloor 13=carpet 14=patio 15=exitdoor
        // 16=shopwall 17=shoproof 18=cafewall 19=caferoof
        // 20=brickwall 21=stonefloor 22=fence 24=bathroom_tile
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
        this.mapData[7][21] = 8; // church door (front-center)
        this.doors.push({
            outside: { x: 21, y: 7 }, outsideReturn: { x: 21, y: 8 },
            inside: { x: 6, y: 47 }, buildingId: 'church',
        });

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
        this.addBuilding(18, 17, 7, 4, 18, 19); // warm terracotta cafe tiles
        this.mapData[20][21] = 8; // cafe door
        this.doors.push({
            outside: { x: 21, y: 20 }, outsideReturn: { x: 21, y: 21 },
            inside: { x: 19, y: 47 }, buildingId: 'cafe',
        });
        // Outdoor patio in front
        for (let y = 20; y < 22; y++) {
            for (let x = 18; x < 25; x++) {
                if (this.mapData[y][x] === 0 || this.mapData[y][x] === 1) {
                    this.mapData[y][x] = 14;
                }
            }
        }

        // ---- Additional buildings for variety ----
        // Shop (32-38 x 17-20)
        this.addBuilding(32, 17, 6, 4, 16, 17); // blue-grey shop tiles
        this.mapData[20][35] = 8; // shop door
        this.doors.push({
            outside: { x: 35, y: 20 }, outsideReturn: { x: 35, y: 21 },
            inside: { x: 31, y: 47 }, buildingId: 'shop',
        });

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
            'shopwall', 'shoproof', 'cafewall', 'caferoof',
            'brickwall', 'stonefloor', 'fence', 'carpet_plum', 'bathroom_tile',
        ];
        for (let y = 0; y < this.mapHeight; y++) {
            for (let x = 0; x < this.mapWidth; x++) {
                const t = this.mapData[y][x];
                this.add.image(x * 64 + 32, y * 64 + 32, textureMap[t]).setDepth(0);
            }
        }

        // Collision for solid tiles
        this.wallBodies = this.physics.add.staticGroup();
        // Solid: wall(3), roof(4), water(6), churchwall(9), churchroof(10), intwall(11),
        // shopwall(16), shoproof(17), cafewall(18), caferoof(19), brickwall(20), fence(22)
        const solidTiles = new Set([3, 4, 6, 9, 10, 11, 16, 17, 18, 19, 20, 22]);
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
        // Build rooms from ROOM_LAYOUTS config (data-driven)
        for (const [roomId, layout] of Object.entries(ROOM_LAYOUTS)) {
            const sx = layout.startX;
            const sy = layout.startY || this.interiorStartRow;
            const rw = layout.width;
            const rh = layout.height;

            // Store room pixel bounds (inner walkable area, 1 tile inset from walls)
            this.roomBounds[roomId] = {
                x: (sx + 1) * 64,
                y: (sy + 1) * 64,
                width: (rw - 2) * 64,
                height: (rh - 2) * 64,
                fullX: sx * 64,
                fullY: sy * 64,
                fullWidth: rw * 64,
                fullHeight: rh * 64,
            };

            // Fill perimeter with interior walls, interior with wood floor
            for (let y = sy; y < sy + rh; y++) {
                for (let x = sx; x < sx + rw; x++) {
                    if (x >= this.mapWidth || y >= this.mapHeight) continue;
                    if (y === sy || y === sy + rh - 1 || x === sx || x === sx + rw - 1) {
                        this.mapData[y][x] = 11; // interior wall
                    } else {
                        this.mapData[y][x] = 7; // wood floor default
                    }
                }
            }

            // Apply zone floor tiles
            for (const zone of layout.zones) {
                for (let zy = zone.y; zy < zone.y + zone.h; zy++) {
                    for (let zx = zone.x; zx < zone.x + zone.w; zx++) {
                        const mapX = sx + zx;
                        const mapY = sy + zy;
                        if (mapX > sx && mapX < sx + rw - 1 && mapY > sy && mapY < sy + rh - 1) {
                            this.mapData[mapY][mapX] = zone.tile;
                        }
                    }
                }
            }

            // Place interior walls as real tiles (tile 11) with doorway gaps
            if (layout.interiorWalls) {
                for (const wall of layout.interiorWalls) {
                    if (wall.w) {
                        // Horizontal wall segment
                        for (let wx = wall.x; wx < wall.x + wall.w; wx++) {
                            if (wall.gapX !== undefined && wx === wall.gapX) continue; // doorway gap
                            const mapX = sx + wx;
                            const mapY = sy + wall.y;
                            if (mapX > sx && mapX < sx + rw - 1 && mapY > sy && mapY < sy + rh - 1) {
                                this.mapData[mapY][mapX] = 11;
                            }
                        }
                    }
                    if (wall.h) {
                        // Vertical wall segment
                        for (let wy = wall.y; wy < wall.y + wall.h; wy++) {
                            if (wall.gapY !== undefined && wy === wall.gapY) continue; // doorway gap
                            const mapX = sx + wall.x;
                            const mapY = sy + wy;
                            if (mapX > sx && mapX < sx + rw - 1 && mapY > sy && mapY < sy + rh - 1) {
                                this.mapData[mapY][mapX] = 11;
                            }
                        }
                    }
                }
            }

            // Exit door
            const doorX = sx + layout.exitDoor.relX;
            const doorY = sy + layout.exitDoor.relY;
            this.mapData[doorY][doorX] = 15;

            const link = this.doors.find(d => d.buildingId === roomId);
            if (link) {
                link.insideExit = { x: doorX, y: doorY };
            }
        }
    }

    buildFurniture() {
        const gfx = this.add.graphics();
        gfx.setDepth(2);

        for (const [roomId, layout] of Object.entries(ROOM_LAYOUTS)) {
            const ox = layout.startX * 64;
            const oy = (layout.startY || this.interiorStartRow) * 64;

            // Place furniture from config
            for (const f of layout.furniture) {
                const px = ox + f.relX * 64;
                const py = oy + f.relY * 64;
                const reg = FURNITURE_REGISTRY[f.type];
                if (!reg) continue;

                const drawFn = this.getFurnitureFallback(gfx, f.type, px, py, ox);
                this.placeDecoration(reg.texture, px, py, f.type === 'rug' ? 1 : 2,
                    drawFn, f.physics);
            }

            // Place dividers (visual + physics)
            for (const div of layout.dividers) {
                const dx = ox + div.relX * 64;
                const dy = oy + div.relY * 64;
                gfx.fillStyle(0xE8DCC8);
                gfx.fillRect(dx - 4, dy, div.width, div.height);
                gfx.lineStyle(2, 0xCCBBA0);
                gfx.strokeRect(dx - 4, dy, div.width, div.height);

                const divBody = this.physics.add.staticImage(dx, dy + div.height / 2, null);
                divBody.setVisible(false);
                divBody.body.setSize(div.width, div.height);
                divBody.refreshBody();
                this.furnitureBodies.add(divBody);
            }
        }
    }

    getFurnitureFallback(gfx, type, px, py, ox) {
        switch (type) {
            case 'couch': return () => this.drawCouch(gfx, px, py);
            case 'dining_table': return () => this.drawTable(gfx, px, py);
            case 'kitchen_counter': return () => this.drawKitchenCounter(gfx, px, py);
            case 'stove': return () => this.drawStove(gfx, px, py);
            case 'counter': return () => this.drawCounter(gfx, px, py);
            case 'upper_cabinet': return () => this.drawUpperCabinet(gfx, px, py);
            case 'microwave': return () => this.drawMicrowave(gfx, px, py);
            case 'dish_rack': return () => this.drawDishRack(gfx, px, py);
            case 'fridge': return () => this.drawFridge(gfx, px, py);
            case 'toilet': return () => this.drawToilet(gfx, px, py);
            case 'rug': return () => this.drawRug(gfx, px, py);
            case 'bed': return () => this.drawBed(gfx, px, py);
            case 'tv': return () => this.drawTV(gfx, px, py);
            case 'sink': return () => this.drawSink(gfx, px, py);
            case 'bookshelf': return () => this.drawBookshelf(gfx, px, py);
            case 'pew': return () => this.drawPew(gfx, px, py);
            case 'altar': return () => this.drawAltar(gfx, px, py);
            case 'shelf': return () => this.drawShelf(gfx, px, py);
            case 'checkout_counter': return () => this.drawCheckoutCounter(gfx, px, py);
            default: return () => {};
        }
    }

    drawRug(gfx, x, y) {
        gfx.fillStyle(0xAA3333, 0.65);
        gfx.fillRect(x - 1.5 * 64, y - 64, 3 * 64, 2 * 64);
        gfx.lineStyle(1, 0x882222, 0.7);
        gfx.strokeRect(x - 1.5 * 64, y - 64, 3 * 64, 2 * 64);
    }

    drawBed(gfx, x, y) {
        // Frame
        gfx.fillStyle(0x6D4C41);
        gfx.fillRect(x - 32, y - 48, 64, 96);
        gfx.lineStyle(1, 0x4E342E);
        gfx.strokeRect(x - 32, y - 48, 64, 96);
        // Sheets (blue)
        gfx.fillStyle(0x5C7FA8);
        gfx.fillRect(x - 28, y - 20, 56, 60);
        // Pillow
        gfx.fillStyle(0xF5F0EB);
        gfx.fillRect(x - 24, y - 44, 48, 18);
        gfx.lineStyle(1, 0xD4CFC8);
        gfx.strokeRect(x - 24, y - 44, 48, 18);
    }

    drawTV(gfx, x, y) {
        // Screen body
        gfx.fillStyle(0x1A1A1A);
        gfx.fillRect(x - 28, y - 6, 56, 12);
        // Screen glow
        gfx.fillStyle(0x1E3A5F);
        gfx.fillRect(x - 26, y - 5, 52, 10);
        // Power indicator
        gfx.fillStyle(0x44FF44);
        gfx.fillCircle(x + 22, y + 3, 1.5);
    }

    drawSink(gfx, x, y) {
        // Basin
        gfx.fillStyle(0xE8E8E8);
        gfx.fillRect(x - 16, y - 12, 32, 24);
        gfx.lineStyle(1, 0xBDBDBD);
        gfx.strokeRect(x - 16, y - 12, 32, 24);
        // Inner oval
        gfx.lineStyle(1, 0xAAAAAA);
        gfx.strokeEllipse(x, y + 2, 20, 14);
        // Faucet
        gfx.fillStyle(0x999999);
        gfx.fillRect(x - 2, y - 12, 4, 6);
    }

    drawBookshelf(gfx, x, y) {
        // Back panel
        gfx.fillStyle(0x6D4C41);
        gfx.fillRect(x - 28, y - 14, 56, 28);
        gfx.lineStyle(1, 0x4E342E);
        gfx.strokeRect(x - 28, y - 14, 56, 28);
        // Shelf divider
        gfx.fillStyle(0x8D6E63);
        gfx.fillRect(x - 28, y - 1, 56, 3);
        // Books (top row)
        const colors = [0xC62828, 0x1565C0, 0x2E7D32, 0xF57F17, 0x6A1B9A, 0x00838F];
        let bx = x - 24;
        for (let i = 0; i < 6; i++) {
            gfx.fillStyle(colors[i]);
            gfx.fillRect(bx, y - 12, 5, 10);
            bx += 7;
        }
        // Books (bottom row)
        bx = x - 24;
        for (let i = 0; i < 6; i++) {
            gfx.fillStyle(colors[(i + 3) % colors.length]);
            gfx.fillRect(bx, y + 3, 5, 10);
            bx += 7;
        }
    }

    drawPew(gfx, x, y) {
        // Wooden church pew — long bench with back rest
        // Seat
        gfx.fillStyle(0x6D4C41);
        gfx.fillRect(x - 40, y - 4, 80, 16);
        gfx.lineStyle(1, 0x4E342E);
        gfx.strokeRect(x - 40, y - 4, 80, 16);
        // Back rest
        gfx.fillStyle(0x5D4037);
        gfx.fillRect(x - 40, y - 10, 80, 8);
        gfx.lineStyle(1, 0x3E2723);
        gfx.strokeRect(x - 40, y - 10, 80, 8);
        // Arm rests (ends)
        gfx.fillStyle(0x4E342E);
        gfx.fillRect(x - 42, y - 10, 4, 22);
        gfx.fillRect(x + 38, y - 10, 4, 22);
    }

    drawAltar(gfx, x, y) {
        // Church altar — raised platform with cloth and cross
        // Base platform
        gfx.fillStyle(0x8D6E63);
        gfx.fillRect(x - 32, y - 8, 64, 28);
        gfx.lineStyle(2, 0x4E342E);
        gfx.strokeRect(x - 32, y - 8, 64, 28);
        // White cloth drape
        gfx.fillStyle(0xF5F0EB);
        gfx.fillRect(x - 30, y - 6, 60, 8);
        // Gold trim on cloth
        gfx.fillStyle(0xD4A017, 0.8);
        gfx.fillRect(x - 30, y + 1, 60, 2);
        // Small cross on top
        gfx.fillStyle(0xD4A017);
        gfx.fillRect(x - 2, y - 16, 4, 14);
        gfx.fillRect(x - 6, y - 12, 12, 4);
    }

    drawShelf(gfx, x, y) {
        // Shop shelf — long horizontal shelf with items
        // Back panel
        gfx.fillStyle(0x90A4AE);
        gfx.fillRect(x - 40, y - 12, 80, 24);
        gfx.lineStyle(1, 0x607D8B);
        gfx.strokeRect(x - 40, y - 12, 80, 24);
        // Shelf divider
        gfx.fillStyle(0x78909C);
        gfx.fillRect(x - 40, y - 1, 80, 2);
        // Items on top row (colored boxes — pet products)
        const topColors = [0xE53935, 0x43A047, 0x1E88E5, 0xFDD835, 0xE53935, 0x8E24AA];
        let bx = x - 36;
        for (let i = 0; i < 6; i++) {
            gfx.fillStyle(topColors[i]);
            gfx.fillRect(bx, y - 10, 8, 8);
            bx += 12;
        }
        // Items on bottom row
        bx = x - 36;
        for (let i = 0; i < 6; i++) {
            gfx.fillStyle(topColors[(i + 2) % topColors.length]);
            gfx.fillRect(bx, y + 2, 8, 8);
            bx += 12;
        }
    }

    drawCheckoutCounter(gfx, x, y) {
        // Shop checkout counter with register
        // Counter body
        gfx.fillStyle(0x6D4C41);
        gfx.fillRect(x - 28, y - 18, 56, 36);
        gfx.lineStyle(2, 0x4E342E);
        gfx.strokeRect(x - 28, y - 18, 56, 36);
        // Counter top (lighter)
        gfx.fillStyle(0x8D6E63);
        gfx.fillRect(x - 28, y - 18, 56, 8);
        // Cash register
        gfx.fillStyle(0x333333);
        gfx.fillRect(x - 10, y - 16, 20, 12);
        gfx.fillStyle(0x4CAF50);
        gfx.fillRect(x - 8, y - 14, 16, 6);
        // Register buttons
        gfx.fillStyle(0xFFFFFF);
        gfx.fillRect(x - 6, y - 6, 3, 3);
        gfx.fillRect(x, y - 6, 3, 3);
        gfx.fillRect(x + 6, y - 6, 3, 3);
    }

    placeDecoration(textureKey, x, y, depth, fallbackFn, physicsConfig) {
        if (this.textures.exists(textureKey)) {
            this.add.image(x, y, textureKey).setDepth(depth);
        } else {
            fallbackFn();
        }
        // Add invisible static body for furniture collision (dog only, not NPCs)
        if (physicsConfig && physicsConfig.width) {
            const body = this.physics.add.staticImage(
                physicsConfig.offsetX ? x + physicsConfig.offsetX : x,
                physicsConfig.offsetY ? y + physicsConfig.offsetY : y,
                null
            );
            body.setVisible(false);
            body.body.setSize(physicsConfig.width, physicsConfig.height);
            body.refreshBody();
            this.furnitureBodies.add(body);
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

    // Legacy kitchen counter (4 circles = stovetop everywhere) — kept for backwards compat
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

    // === MODULAR KITCHEN APPLIANCES ===

    drawStove(gfx, x, y) {
        // 55x40 — 2 burners (orange circles) + oven door below
        gfx.fillStyle(0x2A2A2A);
        gfx.fillRect(x - 27, y - 20, 55, 40);
        gfx.lineStyle(1, 0x1A1A1A);
        gfx.strokeRect(x - 27, y - 20, 55, 40);
        // Burners (orange rings)
        gfx.lineStyle(2, 0xE65100);
        gfx.strokeCircle(x - 10, y - 8, 7);
        gfx.strokeCircle(x + 12, y - 8, 7);
        // Burner centers
        gfx.fillStyle(0xFF6D00, 0.6);
        gfx.fillCircle(x - 10, y - 8, 3);
        gfx.fillCircle(x + 12, y - 8, 3);
        // Oven door
        gfx.fillStyle(0x333333);
        gfx.fillRect(x - 22, y + 4, 45, 14);
        gfx.lineStyle(1, 0x444444);
        gfx.strokeRect(x - 22, y + 4, 45, 14);
        // Oven handle
        gfx.fillStyle(0x666666);
        gfx.fillRect(x - 16, y + 6, 32, 3);
        // Knobs
        gfx.fillStyle(0x555555);
        gfx.fillCircle(x - 20, y - 16, 2.5);
        gfx.fillCircle(x - 12, y - 16, 2.5);
        gfx.fillCircle(x + 6, y - 16, 2.5);
        gfx.fillCircle(x + 14, y - 16, 2.5);
    }

    drawCounter(gfx, x, y) {
        // 45x40 — clean wood/stone workspace, no circles
        gfx.fillStyle(0xA1887F);
        gfx.fillRect(x - 22, y - 20, 45, 40);
        gfx.lineStyle(1, 0x8D6E63);
        gfx.strokeRect(x - 22, y - 20, 45, 40);
        // Wood grain lines
        gfx.lineStyle(1, 0x9C786C, 0.4);
        gfx.lineBetween(x - 18, y - 10, x + 18, y - 10);
        gfx.lineBetween(x - 18, y + 2, x + 18, y + 2);
        gfx.lineBetween(x - 18, y + 14, x + 18, y + 14);
        // Front panel line
        gfx.lineStyle(1, 0x795548);
        gfx.lineBetween(x - 22, y + 8, x + 23, y + 8);
        // Drawer handle
        gfx.fillStyle(0x6D4C41);
        gfx.fillRect(x - 6, y + 12, 12, 3);
    }

    drawUpperCabinet(gfx, x, y) {
        // 40x16 — wall-mounted, two-door panel
        gfx.fillStyle(0x8D6E63);
        gfx.fillRect(x - 20, y - 8, 40, 16);
        gfx.lineStyle(1, 0x6D4C41);
        gfx.strokeRect(x - 20, y - 8, 40, 16);
        // Center split
        gfx.lineBetween(x, y - 8, x, y + 8);
        // Door knobs
        gfx.fillStyle(0xD4A017);
        gfx.fillCircle(x - 3, y, 1.5);
        gfx.fillCircle(x + 3, y, 1.5);
    }

    drawMicrowave(gfx, x, y) {
        // 28x18 — dark screen + green power dot
        gfx.fillStyle(0x424242);
        gfx.fillRect(x - 14, y - 9, 28, 18);
        gfx.lineStyle(1, 0x333333);
        gfx.strokeRect(x - 14, y - 9, 28, 18);
        // Screen
        gfx.fillStyle(0x1B1B1B);
        gfx.fillRect(x - 11, y - 6, 16, 12);
        // Control panel (right side)
        gfx.fillStyle(0x555555);
        gfx.fillRect(x + 7, y - 6, 5, 12);
        // Green power dot
        gfx.fillStyle(0x00E676);
        gfx.fillCircle(x + 9, y + 3, 1.5);
        // Door handle
        gfx.fillStyle(0x666666);
        gfx.fillRect(x + 5, y - 4, 2, 8);
    }

    drawDishRack(gfx, x, y) {
        // 30x12 — wire rack for drying dishes
        gfx.fillStyle(0xB0BEC5, 0.3);
        gfx.fillRect(x - 15, y - 6, 30, 12);
        // Wire frame
        gfx.lineStyle(1, 0x78909C);
        gfx.strokeRect(x - 15, y - 6, 30, 12);
        // Vertical wire dividers (plates standing up)
        for (let i = 0; i < 5; i++) {
            const wx = x - 12 + i * 6;
            gfx.lineBetween(wx, y - 5, wx, y + 5);
        }
        // Base drip tray
        gfx.fillStyle(0x90A4AE, 0.5);
        gfx.fillRect(x - 14, y + 4, 28, 2);
    }

    drawFridge(gfx, x, y) {
        // 40x65 — tall, two-door, proper handles
        gfx.fillStyle(0xE0E0E0);
        gfx.fillRect(x - 20, y - 32, 40, 65);
        gfx.lineStyle(2, 0xBDBDBD);
        gfx.strokeRect(x - 20, y - 32, 40, 65);
        // Door split (freezer top, fridge bottom)
        gfx.lineStyle(2, 0x9E9E9E);
        gfx.lineBetween(x - 20, y - 8, x + 20, y - 8);
        // Freezer handle
        gfx.fillStyle(0x757575);
        gfx.fillRect(x + 12, y - 26, 3, 14);
        // Fridge handle
        gfx.fillRect(x + 12, y - 2, 3, 20);
        // Subtle brand badge
        gfx.fillStyle(0xBDBDBD);
        gfx.fillRect(x - 6, y - 30, 12, 3);
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

        // === BUILDING SHADOWS (depth 0.5, drawn before buildings) ===
        const shadowGfx = this.add.graphics();
        shadowGfx.setDepth(0.5);
        shadowGfx.fillStyle(0x000000, 0.18);
        // Church shadow (18-24 x 2-7, 7w x 6h)
        shadowGfx.fillRect(18 * 64 + 4, 2 * 64 + 4, 7 * 64, 6 * 64);
        // House 1 shadow (2-6 x 17-20, 5w x 4h)
        shadowGfx.fillRect(2 * 64 + 4, 17 * 64 + 4, 5 * 64, 4 * 64);
        // House 2 shadow (8-12 x 17-20)
        shadowGfx.fillRect(8 * 64 + 4, 17 * 64 + 4, 5 * 64, 4 * 64);
        // House 3 shadow (2-6 x 25-28)
        shadowGfx.fillRect(2 * 64 + 4, 25 * 64 + 4, 5 * 64, 4 * 64);
        // House 4 shadow (32-36 x 25-28)
        shadowGfx.fillRect(32 * 64 + 4, 25 * 64 + 4, 5 * 64, 4 * 64);
        // Cafe shadow (18-24 x 17-20)
        shadowGfx.fillRect(18 * 64 + 4, 17 * 64 + 4, 7 * 64, 4 * 64);
        // Shop shadow (32-37 x 17-20)
        shadowGfx.fillRect(32 * 64 + 4, 17 * 64 + 4, 6 * 64, 4 * 64);
        // Tall building shadow (38-42 x 2-9)
        shadowGfx.fillRect(38 * 64 + 4, 2 * 64 + 4, 5 * 64, 8 * 64);

        // === HOUSE COLOR TINTS (subtle overlays on houses 2-4) ===
        const tintGfx = this.add.graphics();
        tintGfx.setDepth(1.5);
        // House 2 — blue tint
        tintGfx.fillStyle(0x4488CC, 0.12);
        tintGfx.fillRect(8 * 64, 18 * 64, 5 * 64, 2 * 64); // walls only (skip roof)
        // House 3 — warm/yellow tint
        tintGfx.fillStyle(0xCCAA44, 0.12);
        tintGfx.fillRect(2 * 64, 26 * 64, 5 * 64, 2 * 64);
        // House 4 — green tint
        tintGfx.fillStyle(0x44AA66, 0.12);
        tintGfx.fillRect(32 * 64, 26 * 64, 5 * 64, 2 * 64);

        // === CHIMNEYS on houses 1 and 3 ===
        gfx.fillStyle(0x5D4037);
        // House 1 chimney (on roof, tile 2,17 area)
        gfx.fillRect(3 * 64 + 10, 17 * 64 - 12, 16, 20);
        gfx.fillStyle(0x4E342E);
        gfx.fillRect(3 * 64 + 8, 17 * 64 - 14, 20, 4);
        // House 3 chimney
        gfx.fillStyle(0x5D4037);
        gfx.fillRect(3 * 64 + 10, 25 * 64 - 12, 16, 20);
        gfx.fillStyle(0x4E342E);
        gfx.fillRect(3 * 64 + 8, 25 * 64 - 14, 20, 4);

        // === CHURCH STEEPLE (triangle above roof center) ===
        const steepleX = 21.5 * 64; // center of church (tiles 18-24)
        const steepleTopY = 2 * 64 - 40;
        const steepleBaseY = 2 * 64;
        gfx.fillStyle(0x5D4037);
        gfx.fillTriangle(
            steepleX, steepleTopY,
            steepleX - 40, steepleBaseY,
            steepleX + 40, steepleBaseY
        );
        gfx.lineStyle(2, 0x4E342E);
        gfx.strokeTriangle(
            steepleX, steepleTopY,
            steepleX - 40, steepleBaseY,
            steepleX + 40, steepleBaseY
        );

        // Church cross (larger, on top of steeple)
        const crossX = steepleX;
        const crossY = steepleTopY - 4;
        this.placeDecoration('deco_church_cross', crossX, crossY - 10, 2, () => {
            gfx.fillStyle(0xCCAA44);
            gfx.fillRect(crossX - 4, crossY - 32, 8, 36);
            gfx.fillRect(crossX - 14, crossY - 24, 28, 8);
            gfx.lineStyle(1, 0x000000);
            gfx.strokeRect(crossX - 4, crossY - 32, 8, 36);
            gfx.strokeRect(crossX - 14, crossY - 24, 28, 8);
        });

        // Church sign
        this.add.text(21.5 * 64, 7 * 64 + 48, "St. Barkley's", {
            fontSize: '8px', fontFamily: 'Arial Black', color: '#FFE082',
            stroke: '#000000', strokeThickness: 2,
        }).setOrigin(0.5).setDepth(3);

        // === CAFE SIGN (on wall face) ===
        this.placeDecoration('deco_cafe_sign', 21.5 * 64, 18 * 64 + 4, 3, () => {
            gfx.fillStyle(0xCC3333);
            gfx.fillRect(19 * 64, 18 * 64 - 4, 5 * 64, 16);
            gfx.lineStyle(1, 0x000000);
            gfx.strokeRect(19 * 64, 18 * 64 - 4, 5 * 64, 16);
            this.add.text(21.5 * 64, 18 * 64 + 4, 'The Daily Grind', {
                fontSize: '8px', fontFamily: 'Arial Black', color: '#FFFFFF',
            }).setOrigin(0.5).setDepth(3);
        });

        // === CAFE AWNING (striped red/white over patio) ===
        const awningGfx = this.add.graphics();
        awningGfx.setDepth(2.5);
        const awningY = 20 * 64 - 8;
        const awningW = 5 * 64;
        const awningH = 20;
        const stripeW = 20;
        for (let sx = 0; sx < awningW; sx += stripeW * 2) {
            awningGfx.fillStyle(0xCC3333, 0.85);
            awningGfx.fillRect(19 * 64 + sx, awningY, stripeW, awningH);
            awningGfx.fillStyle(0xFFFFFF, 0.85);
            awningGfx.fillRect(19 * 64 + sx + stripeW, awningY, stripeW, awningH);
        }
        awningGfx.lineStyle(1, 0x000000, 0.3);
        awningGfx.strokeRect(19 * 64, awningY, awningW, awningH);

        // === SHOP SIGN ===
        this.add.text(35 * 64, 18 * 64 + 4, "Pete's Pet Shop", {
            fontSize: '8px', fontFamily: 'Arial Black', color: '#90CAF9',
            stroke: '#000000', strokeThickness: 2,
        }).setOrigin(0.5).setDepth(3);

        // === TALL BUILDING SIGN ===
        this.add.text(40.5 * 64, 3 * 64 + 4, 'OFFICES', {
            fontSize: '9px', fontFamily: 'Arial Black', color: '#FFFFFF',
            stroke: '#000000', strokeThickness: 2,
        }).setOrigin(0.5).setDepth(3);

        // === HOUSE NUMBER SIGNS ===
        const houseSignStyle = {
            fontSize: '7px', fontFamily: 'Arial Black', color: '#FFE0B2',
            stroke: '#000000', strokeThickness: 2,
        };
        this.add.text(4 * 64 + 32, 20 * 64 + 48, 'No. 1', houseSignStyle).setOrigin(0.5).setDepth(3);
        this.add.text(10 * 64 + 32, 20 * 64 + 48, 'No. 2', houseSignStyle).setOrigin(0.5).setDepth(3);
        this.add.text(4 * 64 + 32, 28 * 64 + 48, 'No. 3', houseSignStyle).setOrigin(0.5).setDepth(3);
        this.add.text(34 * 64 + 32, 28 * 64 + 48, 'No. 4', houseSignStyle).setOrigin(0.5).setDepth(3);

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
        // Church windows (moved inward 1 tile from edges + front-facing)
        this.addWindow(gfx, 19, 4, true);
        this.addWindow(gfx, 19, 6, true);
        this.addWindow(gfx, 23, 4, true);
        this.addWindow(gfx, 23, 6, true);
        this.addWindow(gfx, 20, 7);  // front-facing left
        this.addWindow(gfx, 23, 7);  // front-facing right
        // Cafe windows
        this.addWindow(gfx, 19, 19);
        this.addWindow(gfx, 21, 19);
        this.addWindow(gfx, 23, 19);
        // Shop windows
        this.addWindow(gfx, 33, 19);
        this.addWindow(gfx, 35, 19);
        // Tall building windows
        this.addWindow(gfx, 39, 4);
        this.addWindow(gfx, 41, 4);
        this.addWindow(gfx, 39, 6);
        this.addWindow(gfx, 41, 6);
        this.addWindow(gfx, 39, 8);
        this.addWindow(gfx, 41, 8);

        // === FIRE HYDRANTS (pee targets!) ===
        const hydrantPositions = [
            { x: 1, y: 20 },   // near house 1
            { x: 7, y: 28 },   // near house 3
            { x: 31, y: 20 },  // near shop
            { x: 37, y: 28 },  // near house 4
            { x: 13, y: 14 },  // roadside
        ];
        for (const h of hydrantPositions) {
            this.drawFireHydrant(gfx, h.x * 64 + 32, h.y * 64 + 32);
        }

        // === FLOWER PATCHES ===
        const flowerGfx = this.add.graphics();
        flowerGfx.setDepth(1.2);
        const flowerColors = [0xFF6B6B, 0xFFD93D, 0x6BCB77, 0xAE6BFF, 0xFF8ED4, 0x4ECDC4];
        const flowerPatches = [
            { x: 26, y: 10 }, { x: 28, y: 11 }, { x: 27, y: 9 },  // NE open grass
            { x: 34, y: 12 }, { x: 36, y: 13 },                     // east of road
            { x: 10, y: 25 }, { x: 12, y: 26 },                     // south central
            { x: 25, y: 25 }, { x: 27, y: 26 }, { x: 26, y: 27 },  // south mid
            { x: 40, y: 15 }, { x: 42, y: 16 },                     // east side
        ];
        for (const fp of flowerPatches) {
            const cx = fp.x * 64 + 32;
            const cy = fp.y * 64 + 32;
            for (let i = 0; i < 6; i++) {
                const fx = cx + (Math.random() - 0.5) * 48;
                const fy = cy + (Math.random() - 0.5) * 48;
                const color = flowerColors[Math.floor(Math.random() * flowerColors.length)];
                flowerGfx.fillStyle(color, 0.9);
                flowerGfx.fillCircle(fx, fy, 3);
                flowerGfx.fillStyle(0x2E7D32, 0.7);
                flowerGfx.fillRect(fx - 0.5, fy + 3, 1, 5);
            }
        }

        // Extra benches removed — were causing "random party" confusion at (26,26), (10,26), (40,12)

        // === MIDNIGHT GARDEN PORTAL (park area, near pond) ===
        const portalX = 6 * 64 + 32;
        const portalY = 10 * 64 + 32;
        this.midnightPortal = { x: portalX, y: portalY };
        // Stone ring
        gfx.fillStyle(0x4A4A5A);
        gfx.strokeCircle(portalX, portalY, 28);
        gfx.lineStyle(3, 0x3A3A4A);
        gfx.strokeCircle(portalX, portalY, 32);
        // Inner glow (animated separately in update)
        this.portalGfx = this.add.graphics();
        this.portalGfx.setDepth(1.5);
        this.portalPhase = 0;
        // Label
        this.add.text(portalX, portalY - 40, '???', {
            fontSize: '8px', fontFamily: 'Arial Black', color: '#6688AA',
            stroke: '#000000', strokeThickness: 2,
        }).setOrigin(0.5).setDepth(3);
    }

    drawFireHydrant(gfx, x, y) {
        // Base
        gfx.fillStyle(0xCC2222);
        gfx.fillRect(x - 8, y - 2, 16, 18);
        gfx.lineStyle(1, 0x991111);
        gfx.strokeRect(x - 8, y - 2, 16, 18);
        // Top dome
        gfx.fillStyle(0xCC2222);
        gfx.fillRect(x - 6, y - 10, 12, 10);
        gfx.fillStyle(0xDD3333);
        gfx.fillRect(x - 4, y - 14, 8, 6);
        // Cap
        gfx.fillStyle(0xAA1111);
        gfx.fillRect(x - 5, y - 15, 10, 3);
        // Side nozzles
        gfx.fillStyle(0xBB2222);
        gfx.fillRect(x - 14, y - 2, 8, 6);
        gfx.fillRect(x + 6, y - 2, 8, 6);
        // Highlight
        gfx.fillStyle(0xFF6666, 0.4);
        gfx.fillRect(x - 2, y - 8, 3, 6);
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

    // Duplicate addBench removed — first definition at line 564 is used

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

    updateDoorPrompt(time) {
        if (this.isIndoors) {
            // Show prompt near exit door when indoors
            const link = this.doors.find(d => d.buildingId === this.currentRoom);
            if (link && link.insideExit) {
                const ex = link.insideExit.x * 64 + 32;
                const ey = link.insideExit.y * 64;
                const dist = Phaser.Math.Distance.Between(this.dog.x, this.dog.y, ex, ey + 32);
                if (dist < 128) {
                    const bob = Math.sin(time * 0.004) * 4;
                    this.doorPrompt.setText('\u25B2 Exit');
                    this.doorPrompt.setPosition(ex, ey - 12 + bob);
                    this.doorPrompt.setVisible(true);
                    return;
                }
            }
            this.doorPrompt.setVisible(false);
            return;
        }

        let closest = null;
        let closestDist = Infinity;
        for (const door of this.doors) {
            const dx = door.outside.x * 64 + 32;
            const dy = door.outside.y * 64 + 32;
            const dist = Phaser.Math.Distance.Between(this.dog.x, this.dog.y, dx, dy);
            if (dist < 128 && dist < closestDist) {
                closest = door;
                closestDist = dist;
            }
        }

        if (closest) {
            const dx = closest.outside.x * 64 + 32;
            const dy = closest.outside.y * 64;
            const bob = Math.sin(time * 0.004) * 4;
            this.doorPrompt.setText('\u25BC Enter');
            this.doorPrompt.setPosition(dx, dy - 12 + bob);
            this.doorPrompt.setVisible(true);
        } else {
            this.doorPrompt.setVisible(false);
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
        this.updateDoorPrompt(time);

        // Update location label
        this.updateLocationLabel();

        // Animate pond ducks
        this.updateDucks(time, delta);

        // Frogger cars
        this.updateCars();

        for (let i = this.npcs.length - 1; i >= 0; i--) {
            const npc = this.npcs[i];
            if (!npc.active) { this.npcs.splice(i, 1); continue; }
            npc.update(time, delta);
        }

        this.drawPeeStream();

        // Midnight Garden portal animation + check
        if (this.midnightPortal && this.portalGfx) {
            this.portalPhase += 0.003 * delta;
            this.portalGfx.clear();
            const pa = 0.12 + Math.sin(this.portalPhase) * 0.08;
            this.portalGfx.fillStyle(0x00AAFF, pa);
            this.portalGfx.fillCircle(this.midnightPortal.x, this.midnightPortal.y,
                22 + Math.sin(this.portalPhase * 1.5) * 4);
            this.portalGfx.fillStyle(0x00DDFF, pa * 0.6);
            this.portalGfx.fillCircle(this.midnightPortal.x, this.midnightPortal.y,
                12 + Math.sin(this.portalPhase * 2) * 3);

            // Check if dog is on portal
            const pdist = Phaser.Math.Distance.Between(
                this.dog.x, this.dog.y,
                this.midnightPortal.x, this.midnightPortal.y
            );
            if (pdist < 40 && !this.isIndoors) {
                this.scene.stop('UIScene');
                this.scene.start('MidnightGardenScene', { dogConfig: this.dogConfig });
            }
        }
    }

    updateLocationLabel() {
        const cam = this.cameras.main;
        this.locationLabel.setPosition(cam.width / 2, 8);

        const ty = Math.floor(this.dog.y / 64);
        const tx = Math.floor(this.dog.x / 64);

        if (this.isIndoors && this.currentRoom && ROOM_LAYOUTS[this.currentRoom]) {
            this.locationLabel.setText(ROOM_LAYOUTS[this.currentRoom].name);
        } else if (ty >= this.interiorStartRow) {
            this.locationLabel.setText('Indoors');
        } else if (tx >= 1 && tx <= 12 && ty >= 1 && ty <= 12) {
            this.locationLabel.setText('Town Park');
        } else if (tx >= 18 && tx <= 25 && ty >= 17 && ty <= 21) {
            this.locationLabel.setText('Cafe District');
        } else if (tx >= 18 && tx <= 24 && ty >= 1 && ty <= 8) {
            this.locationLabel.setText('Church');
        } else if (tx >= 32 && tx <= 37 && ty >= 17 && ty <= 21) {
            this.locationLabel.setText('Shop District');
        } else if (tx >= 38 && tx <= 42 && ty >= 2 && ty <= 10) {
            this.locationLabel.setText('Office District');
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
        puddle.radius = Math.min(puddle.radius + (30 * delta / 1000), this.getMaxPuddleRadius());

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

            // Award XP for completing a puddle
            this.gainXP(1);

            // Deactivate Holy Man's cup when peeing stops
            for (const npc of this.npcs) {
                if (npc.active && npc.specialBehavior === 'holy_water') {
                    npc.stopHolyWater();
                }
            }
        }
    }

    // --- Level system ---

    getMaxPuddleRadius() {
        // Base 60, increases by 10 per level (level 1 = 60, level 10 = 150)
        return 60 + (this.playerLevel - 1) * 10;
    }

    gainXP(amount) {
        if (this.playerLevel >= 10) return;
        this.playerXP += amount;

        const needed = this.xpForLevel[this.playerLevel]; // XP needed for next level
        if (this.playerXP >= needed) {
            this.playerXP -= needed;
            this.playerLevel++;

            // Level up effect
            const lvlText = this.add.text(this.dog.x, this.dog.y - 40, `LEVEL ${this.playerLevel}!`, {
                fontSize: '20px', fontFamily: 'Arial Black', color: '#FFD700',
                stroke: '#000000', strokeThickness: 3,
            }).setOrigin(0.5).setDepth(20);
            this.tweens.add({
                targets: lvlText, y: lvlText.y - 50, alpha: 0,
                duration: 1500, onComplete: () => lvlText.destroy(),
            });

            this.updateLevelHUD();
        } else {
            this.updateLevelHUD();
        }
    }

    updateLevelHUD() {
        const uiScene = this.scene.get('UIScene');
        if (uiScene && uiScene.levelText) {
            const needed = this.playerLevel >= 10 ? 'MAX' : this.xpForLevel[this.playerLevel];
            uiScene.levelText.setText(`Lv.${this.playerLevel}  XP: ${this.playerXP}/${needed}`);
        }
    }

    respawnDog() {
        this.dog.setPosition(this.dogStartX, this.dogStartY);
        this.dog.body.setVelocity(0, 0);
        if (this.isIndoors) {
            this.isIndoors = false;
            this.currentRoom = null;
            this.exitRoom();
        }
        // Flash effect
        this.tweens.add({
            targets: this.dog, alpha: 0.3,
            duration: 150, yoyo: true, repeat: 3,
        });
    }

    // --- Frogger-style cars ---

    generateCarTexture(name, color, horizontal) {
        const g = this.add.graphics();
        if (horizontal) {
            // Side-view car: 48x28
            const w = 48, h = 28;
            // Wheels
            g.fillStyle(0x222222);
            g.fillCircle(12, 24, 5);
            g.fillCircle(36, 24, 5);
            g.lineStyle(1, 0x000000);
            g.strokeCircle(12, 24, 5);
            g.strokeCircle(36, 24, 5);
            // Hubcaps
            g.fillStyle(0x888888);
            g.fillCircle(12, 24, 2);
            g.fillCircle(36, 24, 2);
            // Car body
            g.fillStyle(color);
            g.fillRoundedRect(2, 8, 44, 16, 4);
            g.lineStyle(2, 0x000000);
            g.strokeRoundedRect(2, 8, 44, 16, 4);
            // Cabin/roof
            g.fillStyle(color);
            g.fillRoundedRect(12, 1, 22, 10, 3);
            g.lineStyle(2, 0x000000);
            g.strokeRoundedRect(12, 1, 22, 10, 3);
            // Windows
            g.fillStyle(0x88CCFF);
            g.fillRect(14, 3, 8, 6);
            g.fillRect(24, 3, 8, 6);
            g.lineStyle(1, 0x000000);
            g.strokeRect(14, 3, 8, 6);
            g.strokeRect(24, 3, 8, 6);
            // Headlight
            g.fillStyle(0xFFFF88);
            g.fillRect(43, 12, 3, 4);
            // Taillight
            g.fillStyle(0xFF3333);
            g.fillRect(2, 12, 3, 4);
            g.generateTexture(name, w, h);
        } else {
            // Top-down car for vertical roads: 24x44
            const w = 24, h = 44;
            // Wheels
            g.fillStyle(0x222222);
            g.fillRect(1, 8, 4, 8);
            g.fillRect(19, 8, 4, 8);
            g.fillRect(1, 28, 4, 8);
            g.fillRect(19, 28, 4, 8);
            // Car body
            g.fillStyle(color);
            g.fillRoundedRect(4, 2, 16, 40, 4);
            g.lineStyle(2, 0x000000);
            g.strokeRoundedRect(4, 2, 16, 40, 4);
            // Windshield
            g.fillStyle(0x88CCFF);
            g.fillRoundedRect(6, 6, 12, 8, 2);
            g.lineStyle(1, 0x000000);
            g.strokeRoundedRect(6, 6, 12, 8, 2);
            // Rear window
            g.fillStyle(0x88CCFF);
            g.fillRoundedRect(6, 30, 12, 6, 2);
            g.lineStyle(1, 0x000000);
            g.strokeRoundedRect(6, 30, 12, 6, 2);
            // Headlights
            g.fillStyle(0xFFFF88);
            g.fillCircle(8, 3, 2);
            g.fillCircle(16, 3, 2);
            // Taillights
            g.fillStyle(0xFF3333);
            g.fillCircle(8, 41, 2);
            g.fillCircle(16, 41, 2);
            g.generateTexture(name, w, h);
        }
        g.destroy();
    }

    spawnCars() {
        const ts = this.tileSize;
        const carColors = [0xCC2222, 0x2255CC, 0x22AA22, 0xEEEE22, 0xCC6600];

        // Pre-generate car textures
        for (let i = 0; i < carColors.length; i++) {
            if (!this.textures.exists(`car_h_${i}`)) {
                this.generateCarTexture(`car_h_${i}`, carColors[i], true);
            }
            if (!this.textures.exists(`car_v_${i}`)) {
                this.generateCarTexture(`car_v_${i}`, carColors[i], false);
            }
        }

        // Horizontal roads: rows 14 and 22
        const hRoads = [
            { row: 14, dir: 1, speed: 120 },   // right
            { row: 22, dir: -1, speed: 100 },  // left
        ];

        for (const road of hRoads) {
            const y = road.row * ts + ts / 2;
            for (let i = 0; i < 5; i++) {
                const spacing = this.mapWidth * ts / 5;
                const x = i * spacing + Math.random() * spacing * 0.5;
                const car = this.add.image(x, y, `car_h_${i % carColors.length}`);
                car.setDepth(6);
                // Flip car to face direction of travel
                if (road.dir < 0) car.setFlipX(true);
                this.physics.add.existing(car);
                car.body.setVelocityX(road.speed * road.dir);
                car._roadDir = road.dir;
                car._speed = road.speed;
                car._horizontal = true;
                car._roadMin = 0;
                car._roadMax = this.mapWidth * ts;
                this.cars.push(car);
            }
        }

        // Vertical roads: cols 15 and 30
        const vRoads = [
            { col: 15, dir: 1, speed: 90 },    // down
            { col: 30, dir: -1, speed: 110 },   // up
        ];

        for (const road of vRoads) {
            const x = road.col * ts + ts / 2;
            for (let i = 0; i < 5; i++) {
                const spacing = this.outdoorRows * ts / 5;
                const y = i * spacing + Math.random() * spacing * 0.5;
                const car = this.add.image(x, y, `car_v_${i % carColors.length}`);
                car.setDepth(6);
                // Flip car to face direction of travel
                if (road.dir < 0) car.setFlipY(true);
                this.physics.add.existing(car);
                car.body.setVelocityY(road.speed * road.dir);
                car._roadDir = road.dir;
                car._speed = road.speed;
                car._horizontal = false;
                car._roadMin = 0;
                car._roadMax = this.outdoorRows * ts;
                this.cars.push(car);
            }
        }
    }

    updateCars() {
        if (this.isIndoors) return;

        for (const car of this.cars) {
            // Wrap around when off-screen
            if (car._horizontal) {
                if (car._roadDir > 0 && car.x > car._roadMax + 40) car.x = car._roadMin - 40;
                if (car._roadDir < 0 && car.x < car._roadMin - 40) car.x = car._roadMax + 40;
            } else {
                if (car._roadDir > 0 && car.y > car._roadMax + 40) car.y = car._roadMin - 40;
                if (car._roadDir < 0 && car.y < car._roadMin - 40) car.y = car._roadMax + 40;
            }

            // Check collision with dog
            const dist = Phaser.Math.Distance.Between(car.x, car.y, this.dog.x, this.dog.y);
            if (dist < 25) {
                this.respawnDog();
                break;
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
            if (!npc.active || npc.state === 'attacked' || npc.state === 'leaving' || npc.state === 'eaten') continue;
            if (Phaser.Math.Distance.Between(hitbox.x, hitbox.y, npc.x, npc.y) < hitbox.radius) {
                hitNPC = npc; break;
            }
        }
        if (hitNPC) {
            soundManager.playAttackHit();
            soundManager.playAttackedScream();

            // Award XP if this is a different NPC than last attacked
            if (hitNPC !== this.lastAttackedNPC) {
                this.gainXP(5);
                this.lastAttackedNPC = hitNPC;
            }

            // Pope hat easter egg
            if (hitNPC.config && hitNPC.config.id === 'pope_guy' && !this.wearingPopeHat) {
                this.wearingPopeHat = true;
                this.addPopeHatToDog();
            }

            // Level 10: eat NPCs
            if (this.playerLevel >= 10) {
                this.eatNPC(hitNPC);
            } else {
                hitNPC.getAttacked();
            }

            for (const npc of this.npcs) {
                if (!npc.active || npc === hitNPC || npc.state === 'attacked' || npc.state === 'leaving') continue;
                if (Phaser.Math.Distance.Between(this.dog.x, this.dog.y, npc.x, npc.y) < NPC_CONFIG.fleeDistance) {
                    npc.flee(this.dog.x, this.dog.y);
                }
            }
            if (hitNPC.state !== 'eaten') {
                this.checkAttackedNPCDistance(hitNPC);
            }
        }
    }

    eatNPC(npc) {
        const nx = npc.x;
        const ny = npc.y;
        npc.state = 'eaten';
        npc.setVisible(false);
        npc.body.setVelocity(0, 0);
        npc.body.enable = false;

        // Leave skull and crossbones
        const skull = this.add.text(nx, ny, '\u2620', {
            fontSize: '28px', color: '#FFFFFF',
            stroke: '#000000', strokeThickness: 2,
        }).setOrigin(0.5).setDepth(5);
        npc._skull = skull;

        // Regenerate when player walks far away
        npc._eatenCheck = this.time.addEvent({
            delay: 1000, loop: true,
            callback: () => {
                const dist = Phaser.Math.Distance.Between(this.dog.x, this.dog.y, nx, ny);
                if (dist > 400) {
                    skull.destroy();
                    npc.setVisible(true);
                    npc.body.enable = true;
                    npc.state = 'idle';
                    npc.setStanding();
                    npc._eatenCheck.remove();
                }
            },
        });
    }

    addPopeHatToDog() {
        const hat = this.add.text(0, -25, '\u26EA', {
            fontSize: '14px', color: '#FFFFFF',
        }).setOrigin(0.5);
        this.dog.add(hat);
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
