const States = {
    STARTUP: 'startup',
    START_SCREEN: 'start_screen',
    INIT_GAME: 'init_game',
    GAME: 'game',
    INIT_GAME_OVER: 'init_game_over',
    GAME_OVER: 'game_over'
};

const PADDLE_ACCEL = 50; // per second per second
const PADDLE_DECEL = 200; // per second per second
const PADDLE_MAX = 200; // per second
const BALL_START = 200;
const BALL_ACCEL = 100;
const BALL_BOOST = 100;
const BALL_MAX = 1000;

const WINNING_SCORE = 10;

class PongGame extends Engine {
    constructor(selector) {
        super(selector, States.STARTUP);
        this.fps = 120;
        this.paddle1Speed = 0;
        this.paddle2Speed = 0;
        this.score1 = 0;
        this.score2 = 0;
        this.initializing = false;
    }

    onTick(time) {
        switch (this.state) {
            case States.STARTUP:
                !this.initializing && this.initStartScreen();
                this.initializing = true;
                break;
            case States.START_SCREEN:
                this.initializing = false;
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

    initGameOver() {
        this.empty();
        let text = new TextSprite('Winner: ' + (this.score1 > this.score2 ? 'Player 1' : 'Player 2'), this.width / 2, this.height / 2);
        text.align = 'center';
        text.size = '200px';
        this.addChild(text);

        let button = new TextButtonSprite('Play Again', this.width / 2 - 100, this.height - 100, 300, 80);
        button.text.size = '40px';
        button.onClick = () => this.changeState(States.INIT_GAME);
        button.fill = '#6CF';
        this.addChild(button);
    }

    tickGame(time) {
        this.score1Sprite.text = this.score1;
        this.score2Sprite.text = this.score2;
        this.paddle1Speed = this.movePaddle(this.paddle1, this.paddle1Speed, this.keys.KeyW ? -1 : this.keys.KeyS ? 1 : 0, time);
        this.paddle2Speed = this.movePaddle(this.paddle2, this.paddle2Speed, this.keys.ArrowUp ? -1 : this.keys.ArrowDown ? 1 : 0, time);
        this.moveBall(time);
        this.checkCollisions();

        if (this.score1 >= WINNING_SCORE || this.score2 >= WINNING_SCORE) {
            this.changeState(States.INIT_GAME_OVER);
        }
    }

    initStartScreen() {
        this.empty();
        let title = new TextSprite('Pong', this.width / 2, this.height / 2 - 30);
        title.size = '400px';
        title.align = 'center';
        this.addChild(title);

        ImageSprite.create('start').then(startButton => {
            startButton.x = (this.width - startButton.width) / 2;
            startButton.y = this.height - startButton.height - 50;
            startButton.onClick = () => this.changeState(States.INIT_GAME);
            this.addChild(startButton);
            this.changeState(States.START_SCREEN);
        });
    }

    checkCollisions() {
        if (this.paddle1.hitRect(this.ball).width > 0
            || this.paddle2.hitRect(this.ball).width > 0) {
            this.ballXSpeed *= -1;
            let angle = Math.atan2(this.ballYSpeed, this.ballXSpeed);
            this.ballXSpeed += Math.cos(angle) * BALL_BOOST;
            this.ballYSpeed += Math.sin(angle) * BALL_BOOST;
        }
    }

    movePaddle(paddle, speed, direction, time) {
        time /= 1000;
        const maxY = this.height - paddle.height,
            decel = (speed > 0 ? -1 : 1) * PADDLE_DECEL * time;

        speed += direction != 0 ? direction * PADDLE_ACCEL * time
            : Math.abs(decel) > Math.abs(speed) ? -speed : decel;

        paddle.y = Math.max(0, Math.min(paddle.y + speed, maxY));
        return paddle.y == 0 || paddle.y == maxY ? 0 : speed;
    }

    resetBall(direction = 0) {
        let starts = [Math.PI / 12, 45 * Math.PI / 12, 9 * Math.PI / 12, 13 * Math.PI / 12],
            size = Math.PI / 6,
            index = Math.floor(Math.random() * (direction == 0 ? 4 : 2) + (direction == 1 ? 2 : 0)),
            angle = starts[index] + size * Math.random();
            
        this.ballXSpeed = Math.cos(angle) * BALL_START;
        this.ballYSpeed = -Math.sin(angle) * BALL_START;

        this.ball.x = Math.floor((this.width - this.ball.width) / 2);
        this.ball.y = Math.floor((this.height - this.ball.height) / 2);
    }

    moveBall(time) {
        time /= 1000;

        let angle = Math.atan2(this.ballYSpeed, this.ballXSpeed);
        this.ballXSpeed += Math.cos(angle) * BALL_ACCEL * time;
        this.ballYSpeed += Math.sin(angle) * BALL_ACCEL * time;

        this.ball.x = Math.max(0, Math.min(this.ball.x + this.ballXSpeed * time, this.width - this.ball.width));
        this.ball.y = Math.max(0, Math.min(this.ball.y + this.ballYSpeed * time, this.height - this.ball.height));      

        if (this.ball.x >= this.width - this.ball.width) {
            this.score2++;
            this.resetBall(-1);
        } else if(this.ball.x <= 0) {
            this.score1++;
            this.resetBall(1);
        }

        if (this.ball.y >= this.height - this.ball.height || this.ball.y <= 0) {
            this.ballYSpeed *= -1;
        }
    }

    initGame() {
        this.empty();
        this.score1 = 0;
        this.score2 = 0;

        Promise.all([
            ImageSprite.create('paddle').then(paddle1 => {
                paddle1.x = Math.floor(this.width * .02);
                paddle1.y = Math.floor((this.height - paddle1.height) / 2);
                return this.paddle1 = paddle1;
            }),
            ImageSprite.create('paddle').then(paddle2 => {
                paddle2.x = Math.floor(this.width - this.width * .02 - paddle2.width);
                paddle2.y = Math.floor((this.height - paddle2.height) / 2);
                return this.paddle2 = paddle2;
            }),
            ImageSprite.create('ball').then(ball => {
                this.ball = ball;
                this.resetBall();
                return this.ball;
            })
        ]).then((children) => {
            children.forEach(this.addChild.bind(this));
            this.changeState(States.GAME);
        });

        this.score1Sprite = new TextSprite();
        this.score1Sprite.x = 10;
        this.score1Sprite.y = 10;
        this.score1Sprite.baseline = 'top';
        this.addChild(this.score1Sprite);

        this.score2Sprite = new TextSprite();
        this.score2Sprite.align = 'right';
        this.score2Sprite.baseline = 'top';
        this.score2Sprite.x = this.width - 10;
        this.score2Sprite.y = 10;
        this.addChild(this.score2Sprite);
    }
}

ready(() => {
    new PongGame('#game', States.STARTUP);
});