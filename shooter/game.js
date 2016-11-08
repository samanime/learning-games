const States = {
    STARTUP: 'startup',
    START_SCREEN: 'start_screen',
    INIT_GAME: 'init_game',
    GAME: 'game',
    INIT_GAME_OVER: 'init_game_over',
    GAME_OVER: 'game_over'
};

const MAX_LIVES = 10;
const START_LIVES = 5;
const SHIP_SPEED = 300; // per second
const MAX_RATE_OF_FIRE = 10; // per second
const START_RATE_OF_FIRE = 2;
const BULLET_SPEED = 1000; // per second
const ENEMY1_SPEED = 100; // per second
const ENEMY2_SPEED = 800; // per second
const ENEMY1_CHANCE = .2; // 20% per second
const ENEMY2_CHANCE = .8; // 80% per second
const ENEMY_SPAWN_DISTANCE = 200;
const HEALTH_CHANCE = .1; // 10% per second
const AMMO_CHANCE = .1; // 10% per second
const ENEMY1_HEALTH = 5;
const ENEMY2_HEALTH = 1;
const PICKUP_SPEED = 600;

class Game extends Engine {
    constructor(selector) {
        super(selector, States.STARTUP);
        this.fps = 20;
        this.initializing = false;
    }

    onTick(time) {
        switch(this.state) {
            case States.STARTUP:
                this.initializing = true;
                this.initStartScreen();
                break;
            case States.START_SCREEN:
                break;
            case States.INIT_GAME:
                !this.initializing && this.initGame();
                this.initializing = true;
                break;
            case States.GAME:
                this.initializing = false;
                this.tickGame(time);
                break;
            case States.INIT_GAME_OVER:
                !this.initializing && this.initGameOver();
                this.initializing = true;
                break;
            case States.GAME_OVER:
                this.initializing = false;
                break;
        }
    }

    initStartScreen() {
        this.empty();
        let title = new TextSprite('Space Shooter', this.width / 2, this.height / 2 - 200);
        title.size = '100px';
        title.align = 'center';
        this.addChild(title);

        let button = new TextButtonSprite('Start', this.width / 2 - 150, this.height - 120, 300, 80);
        button.text.size = '40px';
        button.fill = '#3CF';
        button.onClick = () => this.changeState(States.INIT_GAME);
        this.addChild(button);

        this.changeState(States.START_SCREEN);
    }

    initGame() {
        this.lives = START_LIVES;
        this.score = 0;
        this.rateOfFire = START_RATE_OF_FIRE;
        this.sinceLastShot = 0;
        this.shootReleased = true;

        this.shots = [];
        this.enemies = [];
        this.pickups = [];

        this.empty();

        this.loadingMessage = new TextSprite('Loading', this.width / 2, this.height / 2);
        this.loadingMessage.size = '80px';
        this.loadingMessage.align = 'center';
        this.addChild(this.loadingMessage);

        this.scoreText = new TextSprite('', this.width / 2, 25);
        this.scoreText.align = 'center';
        this.scoreText.color = '#FFFFFF';
        this.scoreText.size = '30px';

        Promise.all([
            ImageSprite.create('starfield').then(background => {
                this.background = background;
            }),
            ImageSprite.create('ship').then(ship => {
                ship.x = 20;
                ship.y = (this.height - ship.height) / 2;
                this.ship = ship;
            }),
            ImageSprite.create('enemy1').then(enemy1 => {
                this.enemy1 = enemy1;
            }),
            ImageSprite.create('enemy2').then(enemy2 => {
                this.enemy2 = enemy2;
            }),
            ImageSprite.create('health').then(health => {
                this.health = health;
            }),
            ImageSprite.create('heart').then(heart => {
                this.heart = heart;
            }),
            ImageSprite.create('ammo').then(ammo => {
                this.ammo = ammo;
            }),
            ImageSprite.create('bullet').then(bullet => {
                bullet.scale = .5;
                this.bullet = bullet;
            })
        ]).then(() => {
            this.addChild(this.background);

            this.hearts = [];
            for (let i = 0; i < MAX_LIVES; i++) {
                let heart = this.heart.clone();
                heart.x = this.width + i * (this.heart.width + 10) - (this.heart.width + 10) * MAX_LIVES - 20;
                heart.y = 10;
                this.addChild(heart);
                this.hearts.push(heart);
            }

            this.addChild(this.ship);
            this.addChild(this.scoreText);
            this.removeChild(this.loadingMessage);
            this.changeState(States.GAME);
        });
    }

    initGameOver() {
        this.empty();
        let gameOverText = new TextSprite('Game Over', this.width / 2, this.height / 2 - 200);
        gameOverText.size = '100px';
        gameOverText.align = 'center';
        this.addChild(gameOverText);

        let scoreText = new TextSprite('Final Score: ' + this.score, this.width / 2, this.height - 200);
        scoreText.size = '40px';
        scoreText.align = 'center';
        this.addChild(scoreText);

        let button = new TextButtonSprite('Play Again', this.width / 2 - 150, this.height - 120, 300, 80);
        button.text.size = '40px';
        button.fill = '#3CF';
        button.onClick = () => this.changeState(States.INIT_GAME);
        this.addChild(button);

        this.changeState(States.GAME_OVER);
    }

    tickGame(time) {
        let timeInSeconds = time / 1000;
        if (this.keys.ArrowUp) {
            this.ship.y = Math.max(0, this.ship.y - SHIP_SPEED * timeInSeconds);
        } 
        
        if (this.keys.ArrowDown) {
            this.ship.y = Math.min(this.height - this.ship.height, this.ship.y + SHIP_SPEED * timeInSeconds);
        }

        this.shoot(time);

        this.scoreText.text = 'Score: ' + this.score;

        this.hearts.forEach(heart => heart.hide = false);
        this.hearts.slice(0, MAX_LIVES - this.lives).forEach(heart => heart.hide = true);

        if (Math.random() < ENEMY1_CHANCE * timeInSeconds) {
            this.spawnEnemy(this.enemy1);
        }

        if (Math.random() < ENEMY2_CHANCE * timeInSeconds) {
            this.spawnEnemy(this.enemy2);
        }

        if (Math.random() < HEALTH_CHANCE * timeInSeconds) {
            this.spawnPickup(this.health);
        }

        if (Math.random() < AMMO_CHANCE * timeInSeconds) {
            this.spawnPickup(this.ammo);
        }

        this.moveShots(time);
        this.moveEnemies(time);
        this.movePickups(time);

        this.checkBulletEnemyCollisions();
        this.checkShipEnemyCollisions();
        this.checkShipPickupCollisions();

        this.cleanBullets();
        this.cleanEnemies();
        this.cleanPickups();

        if (this.lives <= 0) {
            this.changeState(States.INIT_GAME_OVER);
        }
    }

    shoot(time) {
        let rapidFire = this.rateOfFire >= 4;
        this.sinceLastShot += time;
        if (this.keys.Space && (rapidFire || this.shootReleased) && this.sinceLastShot >= 1000 / this.rateOfFire) {
            let shot = this.bullet.clone();
            shot.x = this.ship.x + this.ship.width / 2;
            shot.y = this.ship.y + (this.ship.height - shot.height) / 2;
            this.insertBefore(shot, this.ship);
            this.shots.push(shot);
            this.sinceLastShot = 0;
            this.shootReleased = false;
        } else if (!this.keys.Space) {
            this.shootReleased = true;
        }
    }

    spawnEnemy(type) {
        let enemy = type.clone();
        enemy.x = this.width + Math.random() * ENEMY_SPAWN_DISTANCE;
        enemy.y = Math.random() * (this.height - enemy.height);
        enemy.health = enemy.imageName == 'enemy1' ? ENEMY1_HEALTH : ENEMY2_HEALTH;
        this.addChild(enemy);
        this.enemies.push(enemy);
    }

    spawnPickup(type) {
        let pickup = type.clone();
        pickup.x = this.width;
        pickup.y = Math.random() * (this.height - pickup.height);
        this.addChild(pickup);
        this.pickups.push(pickup);
    }

    moveShots(time) {
        this.shots.forEach(shot => shot.x += BULLET_SPEED * time / 1000);
    }

    moveEnemies(time) {
        this.enemies.forEach(enemy => enemy.x -= (enemy.imageName == 'enemy1' ? ENEMY1_SPEED : ENEMY2_SPEED) * time / 1000);
    }

    movePickups(time) {
        this.pickups.forEach(pickup => pickup.x -= PICKUP_SPEED * time / 1000);
    }

    checkBulletEnemyCollisions() {
        let shotsToRemove = [],
            enemiesToRemove = [];

        this.shots.forEach(shot => {
            this.enemies.forEach(enemy => {
                if (enemy.health > 0 && shot.hitRect(enemy).width > 0) {
                    enemy.health--;
                    shotsToRemove.push(shot);
                    this.removeChild(shot);

                    if (enemy.health == 0) {
                        enemiesToRemove.push(enemy);
                        this.removeChild(enemy);
                        this.score += enemy.imageName === 'enemy1' ? 10 : 1;
                    }
                }
            });
        });

        this.shots = this.shots.filter(shot => shotsToRemove.indexOf(shot) === -1);
        this.enemies = this.enemies.filter(enemy => enemiesToRemove.indexOf(enemy) === -1);
    }

    checkShipEnemyCollisions() {
        let enemiesToRemove = [];

        this.enemies.forEach(enemy => {
            if (enemy.hitRect(this.ship).width > 0) {
                enemiesToRemove.push(enemy);
                this.lives -= enemy.imageName === 'enemy1' ? 3 : 1;
                this.removeChild(enemy);
            }
        });

        this.enemies = this.enemies.filter(enemy => enemiesToRemove.indexOf(enemy) === -1);
    }

    checkShipPickupCollisions() {
        let pickupsToRemove = [];

        this.pickups.forEach(pickup => {
            if (pickup.hitRect(this.ship).width > 0) {
                pickupsToRemove.push(pickup);
                this.removeChild(pickup);

                switch (pickup.imageName) {
                    case 'health':
                        this.lives = Math.min(MAX_LIVES, this.lives + 1);
                        break;
                    case 'ammo':
                        this.rateOfFire = Math.min(MAX_RATE_OF_FIRE, this.rateOfFire + 1);
                        break;
                }
            }
        });

        this.pickups = this.pickups.filter(pickup => pickupsToRemove.indexOf(pickup) === -1);
    }

    cleanBullets() {
        const check = shot => shot.x >= this.width;
        this.shots.forEach(shot => check(shot) && this.removeChild(shot));
        this.shots = this.shots.filter(shot => !check(shot));
    }

    cleanEnemies() {
        const check = enemy => enemy.x + enemy.width <= 0;
        this.enemies.forEach(enemy => check(enemy) && this.removeChild(enemy));
        this.enemies = this.enemies.filter(enemy => !check(enemy));
    }

    cleanPickups() {
        const check = pickup => pickup.x + pickup.width <= 0;
        this.pickups.forEach(pickup => check(pickup) && this.removeChild(pickup));
        this.pickups = this.pickups.filter(pickup => !check(pickup));
    }
}

new Game('#game');