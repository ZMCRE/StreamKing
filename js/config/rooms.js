// Room layout configuration for Stream King — Phase 4 Unique Interiors
// All coordinates are in tile units relative to room origin (startX, startY)
// Tile indices: 7=woodfloor, 12=tilefloor, 13=carpet(sage), 15=exitdoor, 23=carpet_plum, 24=bathroom_tile

const ROOM_LAYOUTS = {
    house1: {
        name: 'Cozy Cottage',
        width: 10,
        height: 8,
        startX: 0,
        // startY set dynamically from interiorStartRow
        zones: [
            { name: 'living', tile: 13, x: 1, y: 4, w: 5, h: 3 },   // sage carpet living room
            { name: 'kitchen', tile: 12, x: 7, y: 1, w: 2, h: 3 },   // tile kitchen top-right
            { name: 'bathroom', tile: 24, x: 7, y: 5, w: 2, h: 2 },  // blue-tint bathroom bottom-right
            // top-left (x:1-4, y:1-3) stays woodfloor = bed nook
        ],
        furniture: [
            { type: 'bed', relX: 2, relY: 2, physics: { width: 54, height: 80 } },
            { type: 'couch', relX: 2.5, relY: 5.2, physics: { width: 80, height: 30 } },
            { type: 'rug', relX: 3.5, relY: 5.8, physics: null },
            { type: 'dining_table', relX: 5.5, relY: 2.5, physics: { width: 60, height: 40 } },
            { type: 'stove', relX: 8, relY: 1.5, physics: { width: 55, height: 40 } },
            { type: 'counter', relX: 7, relY: 1.5, physics: { width: 45, height: 40 } },
            { type: 'fridge', relX: 7.5, relY: 3, physics: { width: 40, height: 65 } },
            { type: 'toilet', relX: 8, relY: 6, physics: { width: 22, height: 28 } },
            { type: 'sink', relX: 7.5, relY: 5.5, physics: { width: 28, height: 20 } },
        ],
        // Interior walls as tile positions: [{x, y, w, h, gapX?, gapY?}] relative to room origin
        interiorWalls: [
            { x: 7, y: 4, h: 3, gapY: 5 },  // bathroom wall (vertical, gap at y=5 for doorway)
        ],
        dividers: [],
        npcs: [
            { relX: 2.5, relY: 5, patrol: 'stand', range: 0, behavior: 'sitting_couch' },
            { relX: 2, relY: 1.8, patrol: 'stand', range: 0, behavior: 'sleeping' },
        ],
        exitDoor: { relX: 5, relY: 7 },
    },

    house2: {
        name: 'Bachelor Pad',
        width: 10,
        height: 8,
        startX: 11,
        zones: [
            // All woodfloor except minimal bathroom
            { name: 'bathroom', tile: 24, x: 7, y: 5, w: 2, h: 2 },
        ],
        furniture: [
            { type: 'couch', relX: 2.5, relY: 4.2, physics: { width: 80, height: 30 } },
            { type: 'tv', relX: 2.5, relY: 2.5, physics: { width: 50, height: 10 } },
            { type: 'rug', relX: 3, relY: 5.2, physics: null },
            { type: 'fridge', relX: 6, relY: 2, physics: { width: 40, height: 65 } },
            { type: 'microwave', relX: 6, relY: 1.2, physics: { width: 28, height: 18 } },
            { type: 'toilet', relX: 8, relY: 6, physics: { width: 22, height: 28 } },
            { type: 'sink', relX: 7.5, relY: 5.5, physics: { width: 28, height: 20 } },
        ],
        interiorWalls: [
            { x: 7, y: 4, h: 3, gapY: 5 },  // bathroom wall
        ],
        dividers: [],
        npcs: [
            { relX: 2.5, relY: 4, patrol: 'stand', range: 0, behavior: 'sitting_couch' },
            { relX: 8, relY: 6, patrol: 'stand', range: 0, behavior: 'on_toilet' },
        ],
        exitDoor: { relX: 5, relY: 7 },
    },

    house3: {
        name: "Grandma's House",
        width: 10,
        height: 8,
        startX: 22,
        zones: [
            { name: 'living', tile: 23, x: 1, y: 3, w: 5, h: 4 },    // plum carpet living area
            { name: 'bedroom', tile: 23, x: 1, y: 1, w: 4, h: 2 },   // plum carpet bedroom top-left
            { name: 'kitchen', tile: 12, x: 6, y: 1, w: 3, h: 3 },   // tile kitchen top-right
            { name: 'bathroom', tile: 24, x: 7, y: 5, w: 2, h: 2 },  // blue-tint bathroom bottom-right
        ],
        furniture: [
            { type: 'bed', relX: 2, relY: 1.8, physics: { width: 54, height: 80 } },
            { type: 'bookshelf', relX: 5, relY: 1.5, physics: { width: 50, height: 24 } },
            { type: 'couch', relX: 2.5, relY: 5.2, physics: { width: 80, height: 30 } },
            { type: 'rug', relX: 3.5, relY: 5.8, physics: null },
            { type: 'dining_table', relX: 5, relY: 4.5, physics: { width: 60, height: 40 } },
            { type: 'stove', relX: 7, relY: 1.5, physics: { width: 55, height: 40 } },
            { type: 'counter', relX: 8, relY: 1.5, physics: { width: 45, height: 40 } },
            { type: 'sink', relX: 8, relY: 2.5, physics: { width: 28, height: 20 } },
            { type: 'fridge', relX: 7.5, relY: 3, physics: { width: 40, height: 65 } },
            { type: 'toilet', relX: 8, relY: 6, physics: { width: 22, height: 28 } },
        ],
        interiorWalls: [
            { x: 1, y: 3, w: 4, gapX: 4 },  // horizontal bedroom partition (gap at x=4 for doorway)
            { x: 7, y: 4, h: 3, gapY: 5 },  // bathroom wall
        ],
        dividers: [],
        npcs: [
            { relX: 2, relY: 1.8, patrol: 'stand', range: 0, behavior: 'sleeping' },
            { relX: 5, relY: 4.5, patrol: 'stand', range: 0, behavior: 'eating' },
        ],
        exitDoor: { relX: 5, relY: 7 },
    },

    house4: {
        name: 'Modern Apartment',
        width: 10,
        height: 8,
        startX: 33,
        zones: [
            // All tilefloor with blue-tint bathroom
            { name: 'main', tile: 12, x: 1, y: 1, w: 8, h: 6 },
            { name: 'bathroom', tile: 24, x: 7, y: 5, w: 2, h: 2 },
        ],
        furniture: [
            { type: 'bed', relX: 2, relY: 2, physics: { width: 54, height: 80 } },
            { type: 'couch', relX: 5, relY: 5.2, physics: { width: 80, height: 30 } },
            { type: 'tv', relX: 5, relY: 3.5, physics: { width: 50, height: 10 } },
            { type: 'counter', relX: 7.5, relY: 2, physics: { width: 45, height: 40 } },
            { type: 'stove', relX: 8.2, relY: 2, physics: { width: 55, height: 40 } },
            { type: 'fridge', relX: 8.2, relY: 1.2, physics: { width: 40, height: 65 } },
            { type: 'upper_cabinet', relX: 7.5, relY: 1.2, physics: null },
            { type: 'sink', relX: 8, relY: 5.5, physics: { width: 28, height: 20 } },
            { type: 'toilet', relX: 8, relY: 6.5, physics: { width: 22, height: 28 } },
        ],
        interiorWalls: [
            { x: 4, y: 1, h: 2 },            // bedroom partition (short vertical, gap below for walkthrough)
            { x: 7, y: 4, h: 3, gapY: 5 },   // bathroom wall
        ],
        dividers: [],
        npcs: [
            { relX: 5, relY: 5, patrol: 'stand', range: 0, behavior: 'sitting_couch' },
            { relX: 2, relY: 1.8, patrol: 'stand', range: 0, behavior: 'sleeping' },
            { relX: 8, relY: 6.5, patrol: 'stand', range: 0, behavior: 'on_toilet' },
        ],
        exitDoor: { relX: 5, relY: 7 },
    },
    // ==================== NEW ENTERABLE BUILDINGS (Phase 5) ====================

    church: {
        name: "St. Barkley's Church",
        width: 12,
        height: 8,
        startX: 0,
        startY: 41, // second row of interiors (below houses at row 32)
        zones: [
            { name: 'nave', tile: 21, x: 1, y: 1, w: 10, h: 6 },  // stonefloor throughout
        ],
        furniture: [
            // Altar at the far (top) end
            { type: 'altar', relX: 6, relY: 1.8, physics: { width: 64, height: 32 } },
            // Left pews (3 rows)
            { type: 'pew', relX: 3, relY: 3, physics: { width: 80, height: 20 } },
            { type: 'pew', relX: 3, relY: 4.2, physics: { width: 80, height: 20 } },
            { type: 'pew', relX: 3, relY: 5.4, physics: { width: 80, height: 20 } },
            // Right pews (3 rows)
            { type: 'pew', relX: 9, relY: 3, physics: { width: 80, height: 20 } },
            { type: 'pew', relX: 9, relY: 4.2, physics: { width: 80, height: 20 } },
            { type: 'pew', relX: 9, relY: 5.4, physics: { width: 80, height: 20 } },
        ],
        dividers: [],
        npcs: [
            { relX: 6, relY: 2.5, patrol: 'stand', range: 0, behavior: 'praying' },
            { relX: 3, relY: 3, patrol: 'stand', range: 0, behavior: 'sitting_pew' },
            { relX: 9, relY: 4.2, patrol: 'stand', range: 0, behavior: 'sitting_pew' },
        ],
        exitDoor: { relX: 6, relY: 7 },
    },

    cafe: {
        name: 'The Daily Grind Cafe',
        width: 12,
        height: 8,
        startX: 13,
        startY: 41,
        zones: [
            { name: 'dining', tile: 7, x: 1, y: 3, w: 7, h: 4 },    // wood dining area
            { name: 'kitchen', tile: 12, x: 8, y: 1, w: 3, h: 4 },   // tile kitchen
        ],
        furniture: [
            // Dining tables (4 small bistro tables)
            { type: 'dining_table', relX: 2.5, relY: 4, physics: { width: 60, height: 40 } },
            { type: 'dining_table', relX: 5.5, relY: 4, physics: { width: 60, height: 40 } },
            { type: 'dining_table', relX: 2.5, relY: 6, physics: { width: 60, height: 40 } },
            { type: 'dining_table', relX: 5.5, relY: 6, physics: { width: 60, height: 40 } },
            // L-shaped kitchen: horizontal arm (counter-stove-counter along top)
            { type: 'counter', relX: 8.5, relY: 1.5, physics: { width: 45, height: 40 } },
            { type: 'stove', relX: 9.5, relY: 1.5, physics: { width: 55, height: 40 } },
            { type: 'counter', relX: 10.5, relY: 1.5, physics: { width: 45, height: 40 } },
            // Vertical arm (counter-sink-counter along right)
            { type: 'counter', relX: 10.5, relY: 2.5, physics: { width: 45, height: 40 } },
            { type: 'sink', relX: 10.5, relY: 3.5, physics: { width: 40, height: 40 } },
            // Fridge alone in top-right corner
            { type: 'fridge', relX: 10, relY: 4.5, physics: { width: 40, height: 65 } },
            { type: 'dish_rack', relX: 8.5, relY: 2.5, physics: null },
        ],
        interiorWalls: [
            { x: 8, y: 1, h: 4, gapY: 3 },  // wall between dining and kitchen (gap at y=3 for entry)
        ],
        dividers: [],
        npcs: [
            { relX: 9, relY: 2.5, patrol: 'stand', range: 0, behavior: 'cooking' },
            { relX: 2.5, relY: 4, patrol: 'stand', range: 0, behavior: 'eating' },
            { relX: 5.5, relY: 6, patrol: 'stand', range: 0, behavior: 'eating' },
        ],
        exitDoor: { relX: 6, relY: 7 },
    },

    shop: {
        name: "Pete's Pet Shop",
        width: 10,
        height: 8,
        startX: 26,
        startY: 41,
        zones: [
            { name: 'floor', tile: 12, x: 1, y: 1, w: 8, h: 6 },  // tile floor throughout
        ],
        furniture: [
            // 3 shelf rows
            { type: 'shelf', relX: 2.5, relY: 2, physics: { width: 80, height: 24 } },
            { type: 'shelf', relX: 2.5, relY: 3.5, physics: { width: 80, height: 24 } },
            { type: 'shelf', relX: 2.5, relY: 5, physics: { width: 80, height: 24 } },
            // Checkout counter near door
            { type: 'checkout_counter', relX: 7.5, relY: 5.5, physics: { width: 56, height: 36 } },
            // Additional shelf on right wall
            { type: 'shelf', relX: 7.5, relY: 2, physics: { width: 80, height: 24 } },
        ],
        dividers: [],
        npcs: [
            { relX: 7.5, relY: 5.5, patrol: 'stand', range: 0, behavior: 'shopkeeper' },
            { relX: 3, relY: 3.5, patrol: 'wander', range: 2, behavior: 'shopping' },
        ],
        exitDoor: { relX: 5, relY: 7 },
    },
};

// Furniture draw function registry — maps type names to draw methods and texture keys
const FURNITURE_REGISTRY = {
    couch:            { texture: 'deco_couch',            draw: 'drawCouch' },
    dining_table:     { texture: 'deco_dining_table',     draw: 'drawTable' },
    kitchen_counter:  { texture: 'deco_kitchen_counter',  draw: 'drawKitchenCounter' },
    stove:            { texture: 'deco_stove',            draw: 'drawStove' },
    counter:          { texture: 'deco_counter',          draw: 'drawCounter' },
    upper_cabinet:    { texture: 'deco_upper_cabinet',    draw: 'drawUpperCabinet' },
    microwave:        { texture: 'deco_microwave',        draw: 'drawMicrowave' },
    dish_rack:        { texture: 'deco_dish_rack',        draw: 'drawDishRack' },
    fridge:           { texture: 'deco_fridge',           draw: 'drawFridge' },
    toilet:           { texture: 'deco_toilet',           draw: 'drawToilet' },
    rug:              { texture: 'deco_rug',              draw: 'drawRug' },
    bed:              { texture: 'deco_bed',              draw: 'drawBed' },
    tv:               { texture: 'deco_tv',               draw: 'drawTV' },
    sink:             { texture: 'deco_sink',             draw: 'drawSink' },
    bookshelf:        { texture: 'deco_bookshelf',        draw: 'drawBookshelf' },
    pew:              { texture: 'deco_pew',              draw: 'drawPew' },
    altar:            { texture: 'deco_altar',            draw: 'drawAltar' },
    shelf:            { texture: 'deco_shelf',            draw: 'drawShelf' },
    checkout_counter: { texture: 'deco_checkout_counter', draw: 'drawCheckoutCounter' },
};
