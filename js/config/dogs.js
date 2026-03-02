// Dog breed configuration for Stream King

const DOG_BREEDS = {
    breeds: [
        {
            id: 'golden_retriever',
            name: 'Golden Retriever',
            // Body shape proportions (relative to base size)
            bodyWidth: 28,
            bodyHeight: 36,
            headRadius: 10,
            earType: 'floppy',     // floppy, pointy, small, round
            tailType: 'long',      // long, short, curly, stub
            snoutLength: 'medium', // short, medium, long
            legHeight: 10,
            legWidth: 6,
            // Default coat
            defaultColor: 'gold',
            patterns: [
                { id: 'solid', name: 'Solid', applyFn: 'solid' },
                { id: 'lighter_belly', name: 'Light Belly', applyFn: 'lighterBelly' },
                { id: 'darker_back', name: 'Dark Back', applyFn: 'darkerBack' },
            ],
        },
        {
            id: 'german_shepherd',
            name: 'German Shepherd',
            bodyWidth: 30,
            bodyHeight: 38,
            headRadius: 11,
            earType: 'pointy',
            tailType: 'long',
            snoutLength: 'long',
            legHeight: 12,
            legWidth: 7,
            defaultColor: 'brown',
            patterns: [
                { id: 'black_tan', name: 'Black & Tan', applyFn: 'blackAndTan' },
                { id: 'sable', name: 'Sable', applyFn: 'sable' },
                { id: 'all_black', name: 'All Black', applyFn: 'allBlack' },
            ],
        },
        {
            id: 'corgi',
            name: 'Corgi',
            bodyWidth: 30,
            bodyHeight: 28,
            headRadius: 10,
            earType: 'pointy',
            tailType: 'stub',
            snoutLength: 'medium',
            legHeight: 6,
            legWidth: 6,
            defaultColor: 'gold',
            patterns: [
                { id: 'solid', name: 'Solid', applyFn: 'solid' },
                { id: 'lighter_belly', name: 'White Belly', applyFn: 'lighterBelly' },
                { id: 'tricolor', name: 'Tricolor', applyFn: 'tricolor' },
            ],
        },
        {
            id: 'pitbull',
            name: 'Pitbull',
            bodyWidth: 32,
            bodyHeight: 34,
            headRadius: 12,
            earType: 'small',
            tailType: 'short',
            snoutLength: 'short',
            legHeight: 10,
            legWidth: 8,
            defaultColor: 'brown',
            patterns: [
                { id: 'solid', name: 'Solid', applyFn: 'solid' },
                { id: 'chest_patch', name: 'Chest Patch', applyFn: 'chestPatch' },
                { id: 'brindle', name: 'Brindle', applyFn: 'brindle' },
            ],
        },
        {
            id: 'dalmatian',
            name: 'Dalmatian',
            bodyWidth: 28,
            bodyHeight: 36,
            headRadius: 10,
            earType: 'floppy',
            tailType: 'long',
            snoutLength: 'medium',
            legHeight: 12,
            legWidth: 6,
            defaultColor: 'white',
            forceColor: true, // Dalmatians are always white with spots
            patterns: [
                { id: 'classic_spots', name: 'Classic Spots', applyFn: 'dalmatianSpots' },
                { id: 'heavy_spots', name: 'Heavy Spots', applyFn: 'dalmatianHeavy' },
            ],
        },
        {
            id: 'cockapoo',
            name: 'Cockapoo',
            bodyWidth: 24,
            bodyHeight: 30,
            headRadius: 11,
            earType: 'floppy',
            tailType: 'curly',
            snoutLength: 'short',
            legHeight: 8,
            legWidth: 5,
            fluffy: true,
            defaultColor: 'gold',
            patterns: [
                { id: 'solid', name: 'Solid', applyFn: 'solid' },
                { id: 'lighter_belly', name: 'Light Belly', applyFn: 'lighterBelly' },
                { id: 'parti', name: 'Parti', applyFn: 'chestPatch' },
            ],
        },
        {
            id: 'toy_poodle',
            name: 'Toy Poodle',
            bodyWidth: 20,
            bodyHeight: 24,
            headRadius: 10,
            earType: 'floppy',
            tailType: 'short',
            snoutLength: 'medium',
            legHeight: 8,
            legWidth: 4,
            fluffy: true,
            poodleCut: true,
            defaultColor: 'white',
            patterns: [
                { id: 'solid', name: 'Solid', applyFn: 'solid' },
                { id: 'phantom', name: 'Phantom', applyFn: 'blackAndTan' },
                { id: 'tuxedo', name: 'Tuxedo', applyFn: 'chestPatch' },
            ],
        },
    ],

    // Coat color palette
    colors: [
        { id: 'black', name: 'Black', hex: 0x222222, accent: 0x333333 },
        { id: 'brown', name: 'Brown', hex: 0x8B4513, accent: 0xA0522D },
        { id: 'white', name: 'White', hex: 0xF5F5F0, accent: 0xE8E8E0 },
        { id: 'red', name: 'Red', hex: 0xB5451B, accent: 0xCC5533 },
        { id: 'gold', name: 'Gold', hex: 0xD4A96A, accent: 0xC49555 },
    ],

    // Size multipliers
    sizes: [
        { id: 'small', name: 'Small', scale: 0.7, speed: 180 },
        { id: 'medium', name: 'Medium', scale: 1.0, speed: 160 },
        { id: 'large', name: 'Large', scale: 1.3, speed: 140 },
    ],
};

// Utility to get breed/color/size by ID
function getBreedById(id) {
    return DOG_BREEDS.breeds.find(b => b.id === id);
}

function getColorById(id) {
    return DOG_BREEDS.colors.find(c => c.id === id);
}

function getSizeById(id) {
    return DOG_BREEDS.sizes.find(s => s.id === id);
}
