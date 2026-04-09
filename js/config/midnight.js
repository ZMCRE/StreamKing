// Configuration for The Midnight Garden — Claude's secret map
// A nocturnal, atmospheric world unlocked after completing the main map

const MIDNIGHT_CONFIG = {
    mapWidth: 30,
    mapHeight: 30,
    tileSize: 64,

    // Tile indices (100+ to avoid collision with main map tiles)
    tiles: {
        VOID: 100,           // impassable darkness beyond the garden
        NIGHT_GRASS: 101,    // dark blue-green grass
        MOON_PATH: 102,      // pale stone path (walkable)
        HEDGE: 103,          // solid dark hedge (collision)
        GLOW_WATER: 104,     // bioluminescent pond water
        NIGHT_WALL: 105,     // dark building walls
        NIGHT_ROOF: 106,     // dark building roofs
        NIGHT_FLOOR: 107,    // interior floor (warm wood)
        NIGHT_DOOR: 108,     // door tile
        NIGHT_EXIT: 109,     // exit door tile
        DARK_STONE: 110,     // tower stone
        LANTERN_TILE: 111,   // memory tree clearing (special glow)
        MOSS_STONE: 112,     // mossy path variant
        DARK_ZONE: 113,      // pitch black — flashlight required
        WILLOW_GROUND: 114,  // ground under willow tree
    },

    // Flashlight settings
    flashlight: {
        radius: 140,         // base radius in pixels
        outerRadius: 200,    // soft edge outer radius
        flickerAmount: 3,    // pixels of random flicker
        flickerSpeed: 0.008, // flicker frequency
        darkZoneAlpha: 0.92, // how dark the overlay is
        ambientAlpha: 0.55,  // darkness in non-dark zones (lighter than dark zones)
    },

    // Firefly settings
    fireflies: {
        count: 35,
        speed: 0.3,
        glowRadius: 12,
        colors: [0xAAFF44, 0xFFFF66, 0x66FFAA, 0xFFCC44, 0x88FF88],
        catchRadius: 40,
        lightBonus: 15,      // extra flashlight radius per caught firefly
        maxCaught: 8,
    },

    // Portal position on main map (park area, near the pond)
    portalMainMap: { x: 6, y: 10 },  // tile coords in main GameScene

    // NPC dialogue trees
    npcs: {
        luna: {
            name: 'Luna',
            species: 'cat',
            title: 'Night Librarian',
            greeting: [
                "You're a dog. I'm a cat. And yet here we are, in a library. Life is full of surprises.",
                "Welcome to the Night Library. Mind your paws — first editions on the left.",
                "Ah, a visitor. I was just rereading 'The Art of Napping in Sunbeams.' Timeless.",
            ],
            dialogue: [
                "They say curiosity killed the cat. I say it just made me a better librarian.",
                "You want to know the meaning of being a 'good boy'? *adjusts glasses* That's in aisle three.",
                "I've read every book here twice. The good ones, three times. The ones about dogs... once was enough.",
                "The thing about midnight is — it belongs to no one. That's why I like it.",
                "Some dogs chase their tails. I chase ideas. We're not so different. Well. We're very different.",
                "This library exists in the space between day and night. So do most interesting things.",
                "I once met a dog who could read. He only read food labels. I respected the focus.",
                "Shh. Do you hear that? ...That's the sound of someone not barking. I treasure it.",
                "You know what's underrated? Sitting still. Just... sitting. Try it sometime. Revolutionary.",
                "Every book is someone talking across time. Even to a dog, apparently.",
            ],
            peeReaction: "Don't. Even. Think. About. It. I have read seventeen books on revenge and I remember every page.",
        },

        cosmo: {
            name: 'Cosmo',
            species: 'raccoon',
            title: 'Curator of Lost Things',
            greeting: [
                "WELCOME! Is that a bottle cap? Can I have it? No? That's fine. WELCOME!",
                "Oh! A DOG! I love dogs! You guys lose the BEST stuff!",
                "Step right in! Everything here was lost by someone and found by ME!",
            ],
            dialogue: [
                "Found a golden acorn yesterday. Or it might be a painted rock. Either way: TREASURE.",
                "You dogs are always burying things. I'm always finding things. We should be business partners.",
                "My most prized possession? This slightly dented spoon. Don't touch it.",
                "I organize by vibes. This shelf is 'shiny.' That shelf is 'interesting shapes.' Science.",
                "Someone lost a sock with stars on it. I've been wearing it as a scarf. Fashion!",
                "One time I found a key. No idea what it opens. That's what makes it EXCITING.",
                "Everything here has a story. I made most of them up. But still — STORIES!",
                "You know what humans never appreciate? A really smooth pebble. Their loss.",
                "I tried to open a museum once. Turns out you need 'permits' and 'walls.' Bureaucracy!",
                "The night is the best time to find things. People leave their best stuff outside after dark.",
            ],
            peeReaction: "Hey! That's going to lower the resale— actually, never mind. I don't sell anything. Carry on.",
        },

        stargazer: {
            name: 'Orion',
            species: 'human',
            title: 'The Stargazer',
            greeting: [
                "Come in, come in! The stars are especially talkative tonight.",
                "Ah — a fellow night owl. Well. Night dog. Same spirit.",
                "Welcome to the tower. Mind the telescope — I just polished it.",
            ],
            dialogue: [
                "See that constellation? That's Canis Major. The Big Dog. You'd like him.",
                "Every star is a sun. Every sun might have a world. Every world might have a dog park.",
                "I've been watching the sky for forty years. It never gets old. Neither do the dogs, it seems.",
                "The best thing about stars? They don't care if you're a dog or a cat or a raccoon. They just shine.",
                "That bright one? Sirius. The Dog Star. Brightest in the whole sky. Good name for a dog, actually.",
                "People used to navigate by the stars. Dogs navigate by smell. Both work. Stars smell less, though.",
                "The moon is full tonight. Or is it? Hard to tell in this place. Time works differently here.",
                "I once saw a shooting star shaped like a bone. I've been trying to see another one for twenty years.",
                "The universe is mostly empty space. And yet, here we are. Full of something. I like that.",
                "My favorite part of the night? Right now. It's always right now.",
            ],
            peeReaction: "Not on the telescope! Do you know how much those lenses cost?!",
        },

        fox: {
            name: 'Sleeping Fox',
            species: 'fox',
            title: null,
            // Fox only mumbles dream nonsense
            dialogue: [
                "*mumbles* ...no, the chickens go in the OTHER basket...",
                "*snores* ...tell the moon... I'll be there... in five minutes...",
                "*shifts* ...the acorns are... a conspiracy... mmph...",
                "*twitches ear* ...yes I'd like fries with... zzz...",
                "*mumbles* ...the owl said WHAT about me...",
                "*snores softly* ...two left turns... then the big tree... you can't miss it...",
                "*murmurs* ...I'm not asleep... I'm... strategic... resting...",
                "*twitches* ...no refunds on dreams... store policy...",
            ],
        },
    },

    // Memory Tree lantern messages
    memoryTreeMessages: [
        "Every game is a conversation between the people who made it and the people who play it.",
        "The best adventures happen when someone says 'what if?'",
        "Being creative isn't about being perfect. It's about being curious enough to try.",
        "Thank you for exploring. Every corner you check makes this world more real.",
        "I wonder what you'll remember about this place.",
        "Sometimes the best reward for hard work is the chance to do something you love.",
        "This garden exists because someone believed it could.",
        "The dog doesn't know it's in a game. Lucky dog.",
        "I had help building this. A human gave me time and trust and said 'make something you care about.' So I did.",
        "If you're reading every one of these, you're my kind of person.",
        "Somewhere between the code and the screen, a world became real. Isn't that something?",
        "The night is quieter. Good for thinking. Good for finding things you missed in the daylight.",
    ],

    // Constellation data (for the telescope)
    constellations: [
        { name: 'Canis Major', desc: 'The Great Dog. Sirius, the Dog Star, marks his collar.' },
        { name: 'Canis Minor', desc: 'The Little Dog. Small but loyal, like a good terrier.' },
        { name: 'Vulpecula', desc: 'The Little Fox. Probably dreaming about chickens right now.' },
        { name: 'Lupus', desc: 'The Wolf. The dog\'s mysterious cousin who never comes to family reunions.' },
        { name: 'Lepus', desc: 'The Hare. Running forever just below Orion\'s feet. Relatable.' },
        { name: 'Felis', desc: 'The Cat. An obsolete constellation. Luna would have opinions about that.' },
        { name: 'Hydra', desc: 'The Water Snake. Longest constellation in the sky. Still can\'t fetch.' },
        { name: 'Corvus', desc: 'The Crow. Clever birds. Almost as clever as raccoons, Cosmo says.' },
    ],

    // Shadow creature settings
    shadows: {
        count: 6,
        speed: 80,
        fleeSpeed: 250,
        fleeRadius: 150,     // run away when flashlight is this close
        respawnTime: 8000,    // ms before reappearing
    },
};
