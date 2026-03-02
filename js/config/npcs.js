// NPC configuration for Stream King — Phase 3

const NPC_CONFIG = {
    positiveReactions: [
        "Aww!", "So cute!", "Pretty privilege!", "Good boy!",
        "What a sweetie!", "Adorable!", "Look at him!", "Precious!",
        "Who's a good boy?!", "Oh my gosh!",
    ],

    angryReactions: [
        "HEY!", "STOP THAT!", "BAD DOG!", "GROSS!", "DISGUSTING!",
        "What the...!", "NO! BAD!", "SECURITY!", "That's ENOUGH!",
        "Somebody call\nanimal control!",
    ],

    attackedReactions: [
        "I REGRET EVERYTHING!",
        "DOGS ARE THE BEST\nAND I DESERVED THIS!",
        "OH GOD THE PAIN!",
        "TELL MY FAMILY\nI LOVE THEM!",
        "WHY?! WHYYY?!",
        "I'M SO SORRY!",
        "THE HORROR!",
        "THIS IS FINE...\n*sobbing*",
        "I SHOULD HAVE\nBEEN A CAT PERSON!",
        "@#$%&!!",
        "AAAHHHHH!",
        "MY KNEE!\nMY BEAUTIFUL KNEE!",
        "I BLAME SOCIETY!",
        "NOT THE FACE!\nNOT THE FACE!",
    ],

    clothingColors: [
        0x3366CC, 0xCC3333, 0x33CC33, 0xCC33CC, 0xCCAA33, 0x33CCCC,
        0xFF6633, 0x666666, 0xDD6699, 0x336644, 0x8855AA, 0xCC8844,
    ],

    pantsColors: [0x334466, 0x222222, 0x555555, 0x6B4423, 0x445544],

    skinToneGroups: [
        { id: 'light', name: 'Light', hex: 0xFFDBAC, hairColors: [0x4A3222, 0x8B6914, 0xAA4422, 0xD4A060, 0x222222] },
        { id: 'dark', name: 'Dark', hex: 0x8D5524, hairColors: [0x111111, 0x222222, 0x1A1A1A, 0x333333] },
        { id: 'east_asian', name: 'East Asian', hex: 0xF1C27D, hairColors: [0x111111, 0x1A1A2E, 0x222222] },
        { id: 'latin', name: 'Latin American', hex: 0xD4A574, hairColors: [0x1A1A1A, 0x222222, 0x3D2B1F, 0x4A3222] },
    ],

    // --- OUTDOOR GENERIC NPCS ---
    spawnPoints: [
        // Park area
        { x: 6 * 64 + 32, y: 4 * 64 + 32, patrol: 'horizontal', range: 120 },
        { x: 10 * 64 + 32, y: 9 * 64 + 32, patrol: 'horizontal', range: 100 },
        { x: 4 * 64 + 32, y: 11 * 64 + 32, patrol: 'stand', range: 0 },
        // Sidewalks
        { x: 17 * 64 + 32, y: 13 * 64 + 32, patrol: 'horizontal', range: 180 },
        { x: 25 * 64 + 32, y: 13 * 64 + 32, patrol: 'horizontal', range: 120 },
        { x: 16 * 64 + 32, y: 5 * 64 + 32, patrol: 'vertical', range: 150 },
        { x: 29 * 64 + 32, y: 16 * 64 + 32, patrol: 'vertical', range: 100 },
        // Restaurant patio
        { x: 19 * 64 + 32, y: 20 * 64 + 32, patrol: 'stand', range: 0 },
        { x: 23 * 64 + 32, y: 20 * 64 + 32, patrol: 'stand', range: 0 },
        // Southern area
        { x: 10 * 64 + 32, y: 24 * 64 + 32, patrol: 'horizontal', range: 140 },
        { x: 20 * 64 + 32, y: 26 * 64 + 32, patrol: 'horizontal', range: 100 },
        { x: 38 * 64 + 32, y: 15 * 64 + 32, patrol: 'vertical', range: 120 },
    ],

    // --- INDOOR NPCS ---
    indoorNPCs: [
        // House 1 interiors (room starts at col 0, row 32)
        { x: 2 * 64 + 32, y: 37 * 64 + 32, patrol: 'stand', range: 0, behavior: 'sitting_couch' },
        { x: 4 * 64 + 48, y: 34 * 64 + 32, patrol: 'stand', range: 0, behavior: 'eating' },
        // House 2 interiors (room starts at col 11, row 32)
        { x: 13 * 64 + 32, y: 37 * 64 + 32, patrol: 'stand', range: 0, behavior: 'sitting_couch' },
        { x: 19 * 64 + 16, y: 38 * 64, patrol: 'stand', range: 0, behavior: 'on_toilet' },
        // House 3 interiors (room starts at col 22, row 32)
        { x: 25 * 64 + 32, y: 36 * 64 + 32, patrol: 'stand', range: 0, behavior: 'sleeping' },
        { x: 26 * 64 + 48, y: 34 * 64 + 32, patrol: 'stand', range: 0, behavior: 'eating' },
        // House 4 interiors (room starts at col 33, row 32)
        { x: 35 * 64 + 32, y: 37 * 64 + 32, patrol: 'stand', range: 0, behavior: 'sitting_couch' },
        { x: 37 * 64 + 32, y: 36 * 64 + 32, patrol: 'stand', range: 0, behavior: 'sleeping' },
        { x: 41 * 64 + 16, y: 38 * 64, patrol: 'stand', range: 0, behavior: 'on_toilet' },
    ],

    // --- SPECIAL NAMED NPCS ---
    specialNPCs: [
        {
            id: 'old_lady', name: 'Elderly Woman',
            x: 5 * 64 + 32, y: 8 * 64 + 32,
            patrol: 'horizontal', range: 80, speed: 15,
            appearance: {
                skinGroup: 'light', isMale: false, clothingColor: 0x9966AA,
                hairColor: 0xCCCCCC, hairStyle: 'bun', accessory: 'walker',
            },
            behavior: 'stops_when_peed_on',
        },
        {
            id: 'pope_guy', name: 'Holy Man',
            x: 20 * 64 + 32, y: 8 * 64 + 32,
            patrol: 'stand', range: 0,
            appearance: {
                skinGroup: 'light', isMale: true, clothingColor: 0xF5F5F0,
                hairColor: 0xF5F5F0, hairStyle: 'cap', accessory: 'hat_tall',
            },
            behavior: 'holy_water',
        },
        {
            id: 'prince_andy', name: 'Royal Fellow',
            x: 9 * 64 + 48, y: 4 * 64 + 32,
            patrol: 'stand', range: 0,
            appearance: {
                skinGroup: 'light', isMale: true, clothingColor: 0x2244AA,
                hairColor: 0x8B6914, hairStyle: 'balding', accessory: 'suit',
            },
            behavior: 'smug',
        },
        {
            id: 'teddy_r', name: 'The Rough Rider',
            x: 25 * 64 + 32, y: 23 * 64 + 32,
            patrol: 'horizontal', range: 250, speed: 55,
            appearance: {
                skinGroup: 'light', isMale: true, clothingColor: 0x6B5B3E,
                hairColor: 0x8B6914, hairStyle: 'mustache', accessory: 'glasses',
            },
            behavior: 'boxing',
        },
        {
            id: 'vlad', name: 'Strong Leader',
            x: 34 * 64 + 32, y: 9 * 64 + 32,
            patrol: 'stand', range: 0,
            appearance: {
                skinGroup: 'light', isMale: true, clothingColor: 0x222222,
                hairColor: 0xCCAA77, hairStyle: 'receding', accessory: 'suit',
            },
            behavior: 'authoritative',
            backdrop: 'ukraine_flag',
        },
        {
            id: 'dear_leader', name: 'Supreme Guy',
            x: 36 * 64 + 32, y: 21 * 64 + 32,
            patrol: 'stand', range: 0,
            appearance: {
                skinGroup: 'east_asian', isMale: true, clothingColor: 0x333333,
                hairColor: 0x111111, hairStyle: 'pompadour', accessory: 'suit',
            },
            behavior: 'authoritative',
        },
    ],

    puddlePositiveThreshold: 15,
    puddleAngryThreshold: 80,
    puddleMaxRadius: 120,

    reactionDistance: 150,
    kickDistance: 60,
    fleeDistance: 200,
    kickForce: 250,
};
