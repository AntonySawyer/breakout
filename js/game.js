const game = new Phaser.Game(480, 320, Phaser.CANVAS, null, {
      preload: preload, create: create, update: update
    });

    var ball;
    var paddle;
    var bricks;
    var extra;
    var newBrick;
    let lvl = 1;
    var brickInfo;
    var scoreText = '💰 0';
    var score = 0;
    let lives = 3;
    var livesText = '❤ '+lives;
    var lifeLostText;
    var playing = false;
    var startBtn;
    var nextLvlText;
    const startVelocity = 130;

    function preload() {
        game.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
        game.scale.pageAlignHorizontally = true;
        game.scale.pageAlignVertically = true;
        game.stage.backgroundColor = '#eee';
        game.load.spritesheet('button', 'img/button.png', 120, 40);
    }

    function create() {
        game.physics.startSystem(Phaser.Physics.ARCADE);
        game.physics.arcade.checkCollision.down = false;
        ball = getCircle(game.world.width*0.5, game.world.height-25, 5, 'red');

        ball.anchor.set(0.5);
        game.physics.enable(ball, Phaser.Physics.ARCADE);
        ball.body.collideWorldBounds = true;
        ball.body.bounce.set(1);
        ball.checkWorldBounds = true;
        ball.events.onOutOfBounds.add(ballLeaveScreen, this);

        paddle = getRect(game.world.width*0.5, game.world.height-5, 50, 5, 'black');
        paddle.anchor.set(0.5,1);
        game.physics.enable(paddle, Phaser.Physics.ARCADE);
        paddle.body.immovable = true;

        scoreText = textRenderer(5, 5, scoreText, 'orange');
        livesText = textRenderer(game.world.width-5, 5, livesText, 'red', [1, 0]);
        lifeLostText = textRenderer(game.world.width*0.5, game.world.height*0.5, 'Life lost, click to continue', 'red', [0.5, 0]);
        lifeLostText.visible = false;
        startBtn = game.add.button(game.world.width*0.5, game.world.height*0.5, 'button', startGame, this, 1, 0, 2);
        startBtn.anchor.set(0.5);
    }

    function update() {
        game.physics.arcade.collide(ball, paddle, ballHitPaddle);
        game.physics.arcade.collide(extra, paddle, extraHitPaddle);
        game.physics.arcade.collide(ball, bricks, ballHitBrick);
        if(playing) {
            paddle.x = game.input.x || game.world.width*0.5;
        }
    }

    function textRenderer(x, y, text, color, anchor) {
        const textStyle = { font: '18px Arial', fill: color };
        const result = game.add.text(x, y, text, textStyle);
        if (anchor) {
            result.anchor.set(anchor[0], anchor[1]);
        }
        return result;
    }

    function initBricks() {
        brickInfo = levels[`level_${lvl}`];
        bricks = game.add.group();
        let usedExtra = 0;
        let usedEmpty = 0;
        let doubleWidth = 0;
        for(r=0; r<brickInfo.count.row; r++) {
            for(c=0; c<brickInfo.count.col; c++) {
                const useEmpty = Math.round(Math.random());
                if (useEmpty && usedEmpty < brickInfo.empty) {
                    usedEmpty++;
                    doubleWidth++;
                } else {
                    let xPlace = brickInfo.width+brickInfo.padding;
                    if (doubleWidth === 0) {
                        doubleWidth = 0;
                        xPlace *=2;
                    }
                    var brickX = (c*xPlace)+brickInfo.offset.left;
                    var brickY = (r*(brickInfo.height+brickInfo.padding))+brickInfo.offset.top;
    
                    const useExtra = Math.round(Math.random());
                    let color = brickInfo.color;
                    if (useExtra && usedExtra < brickInfo.extra) {
                        usedExtra++;
                        color ="lightgreen"
                    }
                    switch (brickInfo.type) {
                        case 'rect':
                            newBrick = getRect(brickX, brickY, brickInfo.width, brickInfo.height, color, useExtra);                
                            break;
                        case 'circle':
                            newBrick = getCircle(brickX, brickY, brickInfo.width/2, color);
                            break;
                        default:
                            break;
                    }
                    game.physics.enable(newBrick, Phaser.Physics.ARCADE);
                    newBrick.body.immovable = true;
                    newBrick.anchor.set(0.5);
                    bricks.add(newBrick);
                }
            }
        }
    }

    function killBrick(brick) {
        const getExtra = Math.round(Math.random()-0.15);
        if (getExtra) {
            extra = getCircle(brick.x, brick.y, 3, 'orange');
            game.physics.enable(extra, Phaser.Physics.ARCADE);
            extra.body.gravity.y = 80;
        }
        brick.kill();
        return;
    }

    function extraHitPaddle(extra) {
        const catchExtra = game.add.tween(extra);
        catchExtra.to({x: game.world.width*0.5, y: game.world.height}, 30, Phaser.Easing.Linear.None);
        catchExtra.onComplete.addOnce(() => extra.kill(), this);
        catchExtra.start();
        const oldPaddleWidth = paddle.width;
        paddle.width +=15;
        setTimeout(() => paddle.width = oldPaddleWidth, 3000);

    }

    function ballHitBrick(ball, brick) {
        paddle.width < game.world.width/2 ? paddle.width +=5 : paddle.width;
        const killTween = game.add.tween(brick);
        killTween.to({y: 0}, 200, Phaser.Easing.Cubic.None);
        killTween.onComplete.addOnce(() => killBrick(brick), this);
        killTween.start();
        score += 10;
        scoreText.setText('💰 '+score);
        let countAlive = 0;
        for (i = 0; i < bricks.children.length; i++) {
            if (bricks.children[i].alive == true) {
                countAlive++;
            }
        }
        if (countAlive === 1) {
            pause();
            console.log('lvl = ' + lvl);
            console.log(Object.keys(levels).length);
            if (lvl === Object.keys(levels).length) {
                textRenderer(game.world.width*0.5, game.world.height*0.3, 'You won the game, congratulations!', 'orange', [0.5, 1]);
                restartBtn();
            } else {
                lvl +=1;
                nextLvlText = textRenderer(game.world.width*0.5, game.world.height*0.3, 'You finish level, congratulations!', 'green', [0.5, 0]);
                nextLvlBtn = game.add.button(game.world.width*0.5, game.world.height*0.5, 'button', nextLevel, this, 1, 0, 2);
                nextLvlBtn.anchor.set(0.5);
            }
        }
    }

    function restartBtn() {
        restartBtn = game.add.button(game.world.width*0.5, game.world.height*0.5, 'button', () => location.reload(), this, 1, 0, 2);
        restartBtn.anchor.set(0.5);
    }

    function nextLevel() {
        nextLvlText.visible = false;
        nextLvlBtn.destroy();
        resetDynamic();
        startGame();
    }

    function resetDynamic() {
        ball.reset(game.world.width*0.5, game.world.height-25);
        paddle.reset(game.world.width*0.5, game.world.height-5);
    }

    function ballLeaveScreen() {
        lives--;
        if(lives) {
            livesText.setText('❤ '+lives);
            lifeLostText.visible = true;
            resetDynamic();
            game.input.onDown.addOnce(function(){
                lifeLostText.visible = false;
                setVelocity(startVelocity*(`1.${lvl*2}`));
            }, this);
        } else {
            textRenderer(game.world.width*0.5, game.world.height*0.7, 'You lost, game over!', 'red', [0.5, 1]);
            restartBtn();
        }
    }

    function ballHitPaddle(ball, paddle) {
        ball.animations.play('wobble');
        ball.body.velocity.x = -1*5*(paddle.x-ball.x);
        paddle.width > 20 ? paddle.width -=5 : paddle.width;
    }

    function startGame() {
        startBtn.destroy();
        initBricks();
        setVelocity(startVelocity*(`1.${lvl*2}`));
        playing = true;
    }

    function pause() {
        setVelocity(0);
        playing = false;
    }

    function setVelocity(num) {
        ball.body.velocity.set(num, -1*num);
        return;
    }

    function getCircle(x, y, radius, color) {
        circle = game.add.bitmapData(radius*2, radius*2);
        circle.ctx.beginPath();
        circle.ctx.arc(radius, radius, radius, 0, 2 * Math.PI);
        circle.ctx.fillStyle = color;
        circle.ctx.fill();
        return game.add.sprite(x, y, circle);
    }

    function getRect(x, y, width, height, color) {
        rect = game.add.bitmapData(width, height);
        rect.ctx.beginPath();
        rect.ctx.rect(0, 0, width, height);
        rect.ctx.fillStyle = color;
        rect.ctx.fill();
        return game.add.sprite(x, y, rect);
    }

const levels = {
    "level_1": {
        "width": 50,
        "height": 20,
        "color": "green",
        "type": "rect",
        "count": {
            "row": 3,
            "col": 7
        },
        "offset": {
            "top": 40,
            "left": 60
        },
        "padding": 11,
        "extra": 6,
        "empty": 4
    },
    "level_2": {
        "width": 35,
        "height": 40,
        "color": "yellow",
        "type": "circle",
        "count": {
            "row": 4,
            "col": 9
        },
        "offset": {
            "top": 45,
            "left": 80
        },
        "padding": 5,
        "extra": 6,
        "empty": 12
    },
    "level_3": {
        "width": 15,
        "height": 15,
        "color": "gray",
        "type": "rect",
        "count": {
            "row": 5,
            "col": 8
        },
        "offset": {
            "top": 45,
            "left": 80
        },
        "padding": 35,
        "empty": 7,
        "extra": 10
    }
};
