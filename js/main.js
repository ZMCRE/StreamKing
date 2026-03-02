// Stream King - Main game configuration

const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: 800,
    height: 600,
    backgroundColor: '#1a1a1a',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false,
        },
    },
    scene: [BootScene, MenuScene, DogSelectScene, GameScene, UIScene, SettingsScene, CreditsScene],
    input: {
        activePointers: 3, // Support multi-touch for mobile
    },
};

const game = new Phaser.Game(config);
