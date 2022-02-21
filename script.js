// ************************* SETUP *************************
const canvas = document.getElementById('canvas');
const c = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight; 

// ************************* GLOBALS *************************
var frameCount = 0;
var blockSize = 48; // size of all general tiles
var level = 0;
var loadTime = 0;
const pxSize = 4;

// camera positions
var camX;
var camY;

// used to store levels
var levels;

var players = [];
var enemys = [];
var grounds = [];
var grasses = [];
var lavas = [];
var ports = [];

var objects = [players, grounds, grasses, enemys];

// used to detect collision betwen two objects
function collide(obj1, obj2) {
    return obj1.x - obj2.x < obj2.width && obj2.x - obj1.x < obj1.width && obj1.y - obj2.y < obj2.height && obj2.y - obj1.y < obj1.height;
}

// store key presses
const keys = {
    right: {
        pressed: false
    },
    left: {
        pressed: false
    },
    up: {
        pressed: false
    },
    down: {
        pressed: false
    },
    shoot: {
        pressed: true
    },
    strike: {
        pressed: false
    }
}

// ************************* OBJECT CLASSES *************************

// player
var Player = function(x, y, width, height) {
    this.x = x; // x position
    this.y = y; // y position
    this.width = width; // width
    this.height = height; // height
    this.xVel = 0; // x velocity
    this.yVel = 0; // y velocity
    this.acceleration = 0.5; // x acceleration
    this.friction = 0.95;
    this.maxSpeed = 8; // maximum x speed
    this.gravity = 1; // gravity
    this.jumpHeight = 16.5; // max jump height (higher number, the higher the player can jump)
    this.canJump = false; // determines whether the player can jump at a certain instance
    this.dead = false; // determines whether the player is dead or not
    this.playerImg = new Image(); // create new image instance
    this.playerImg.src = 'assets/Player.png';  // assign the source  (https://i.ibb.co/HCnbKHC/rabbit.png)
    this.currentSprite = this.playerImg; // create a current sprite that can be changed
    this.index = 4; // sprite loop index 
    this.line = 1; // y crop on the sprite
    this.slide = 7; // wall slide index
    this.wallJump = true; // used in wall jump, determines whether player can, in fact, wall jump, or not.
    this.kickBack = 4; // used in wall jumping, how far the player can kick off of the wall
    this.runLength = 8; // length of run loop for sprite
    this.loopSpeed = 4; // speed images loop at (the larger the number, the slower the loop)
    this.direction = 1; // direction player is facing (1 || -1)
    this.imgWidth = 32; // image width (used for crop)
    this.imgHeight = 38; // image height (used for crop)
    this.scaledSize = 3; // used to rescale the sprite
    this.attacking = false; // attacking or not
    this.longJumpTime = 0;
    this.animate = false; // whether the program loops through sprites or not

};
Player.prototype.update = function() {
    if (!this.dead) {
        // move along the x if key events are true
        if (keys.left.pressed) {
            if (this.xVel > -this.maxSpeed) {
                this.xVel -= this.acceleration;
            }
            this.direction = -1;
            this.line = 0;
        }else if (keys.right.pressed) {
            if (this.xVel < this.maxSpeed) {
                this.xVel += this.acceleration
            }
            this.direction = 1;
            this.line = 0;
        }else { 
            this.xVel *= 0.7;
            if (this.xVel > -0.0005 && this.xVel < 0.0005) {
                this.xVel = 0;
            }
            this.line = 1;
        }

        // jump
        if (keys.up.pressed && this.canJump ) {
            this.index = 1;
            this.yVel = -this.jumpHeight;
            this.canJump = false;
        }

        // change sprites when jumping/falling
        if (!this.canJump && !this.wallJump ) {
            if (this.yVel > -16 && this.yVel < -15) {
                this.index = 1;
            }else if (this.yVel > -12 && this.yVel <= -10) { 
                this.index = 2;
            }else if (this.yVel > -10 && this.yVel <= -8) { 
                this.index = 3;
            }else if (this.yVel > -2 && this.yVel <= 2) { 
                this.index = 4;
            }else if (this.yVel > 2 && this.yVel <= 4) { 
                this.index = 5;
            }else if (this.yVel > 6 && this.yVel <= 8) { 
                this.index = 6;
            }else if (this.yVel > 8 && this.yVel <= 15) { 
                this.index = 7;
            }
        
            // // clamp test
            // if (frameCount % 10 === 0) {
            //     this.index = Math.floor(Math.min(Math.max((this.yVel * -1) / 1.5, 0), 8));
            // 
            if (this.xVel === 0) {
                this.line = 2;
            }else {
                this.line = 3;
            }
        }else {
            // animate sprites
            if (frameCount % this.loopSpeed === 0) {
                this.index = (this.index + 1) % this.runLength;
            }
        }
        
        if (this.yVel > 1 && this.canJump) {
            this.line = 4;
            this.loopSpeed = 2;
        }else {
            this.loopSpeed = 4;
        }

        this.x += this.xVel; // update x by x velocity
        this.collide(grounds, this.xVel, 0); // y collisions
    }
    this.y += this.yVel; //update y by y velocity
    this.collide(grounds, 0, this.yVel); // y collisions
    this.yVel += this.gravity; // update y velocity by gravity

    // for long jump wall-kicking
    if (this.longJumpTime > 0) {
        this.longJumpTime --;
    }else {
        this.kickBack = 4;
    }

    if (this.longJumpTime > 0 && this.direction === 1 && this.xVel > 0 && keys.up.pressed) {
        this.kickBack = 10;
        this.xVel = this.kickBack;
        this.yVel = -this.jumpHeight + 2;
        this.longJumpTime = 0;
        this.kickBack = 4;
    }else if (this.longJumpTime > 0 && this.direction === -1 && this.xVel < 0 && keys.up.pressed) {
        this.kickBack = -10;
        this.xVel = this.kickBack;
        this.yVel = -this.jumpHeight + 2;
        this.longJumpTime = 0;
    }

    if (this.xVel > this.maxSpeed || this.xVel < -this.maxSpeed) {
        this.xVel *= this.friction;
    }

    console.log(this.xVel)
};
Player.prototype.collide = function(obj, xVel, yVel) {
    for (var i = 0; i < obj.length; i ++) {
        if (collide(this, obj[i]) && this.dead === false) {
            if (xVel < 0) {
                // this.kickBack = 4;
                this.longJumpTime = 10;
                this.xVel = 0;
                this.x = obj[i].x + obj[i].width;
                
                if (keys.up.pressed && this.wallJump) {
                    this.line = 5;   
                    this.yVel = -this.jumpHeight + 2;
                    this.xVel = this.kickBack * -this.direction;
                    this.wallJump = false;
                }
                if (!keys.up.pressed) {   
                    this.wallJump = true;
                    if (this.xVel >= 0 && !this.canJump) {
                        this.runLength = 7;
                        this.line = 5;
                        if (frameCount % this.loopSpeed === 0) {
                            this.index = (this.index + 1) % this.runLength;
                        }
                    }else this.canJump = false; this.runLength = 8;

                    this.yVel = 2;
                }
            }
            if (xVel > 0) {
                // this.kickBack = 4;
                this.longJumpTime = 10;
                this.xVel = 0;
                this.x = obj[i].x - this.width;
                
                if (keys.up.pressed && this.wallJump) {   
                    this.line = 5;   
                    this.yVel = -this.jumpHeight + 2;
                    this.xVel = this.kickBack * -this.direction;
                    this.wallJump = false;
                }
                if (!keys.up.pressed) {   
                    this.wallJump = true;
                    if (this.xVel >= 0 && !this.canJump) {
                        this.line = 5;
                        this.runLength = 7;
                        if (frameCount % this.loopSpeed === 0) {
                            this.index = (this.index + 1) % this.runLength;
                        }
                    }else this.canJump = false; this.runLength = 8;

                    this.yVel = 2;
                }
               
            }
            if (yVel < 0) {
                this.yVel = 0;
                this.canJump = false;
                this.y = obj[i].y + obj[i].height;
            }else {
                this.canJump = false;
            }
            if (yVel > 0) {
                // landing pose when player makes contact with ground.
                if (this.yVel > 0.1 && this.line === 2) {
                    this.index = 0;
                    this.line = 2;
                }
                this.longJumpTime = 0;
                this.kickBack = 4;
                this.yVel = 0;
                this.canJump = true;
                this.wallJump = false;
                this.y = obj[i].y - this.height;
                
            }
        }
    }
};
Player.prototype.draw = function() {
    // hitboxes
    // c.fillStyle = 'red';
    // c.fillRect(this.x, this.y, this.width, this.height);
    // c.fillStyle = 'green';
    // c.fillRect(this.x, this.y + blockSize / 2, this.width, blockSize / 2);
    c.save();
    c.translate(this.x + this.imgWidth / 2 - pxSize, this.y - pxSize - (this.imgHeight * this.scaledSize) / 1.85);
    c.scale(-this.direction, 1)
    c.drawImage(this.currentSprite, this.index * this.imgWidth, this.line * this.imgHeight, this.imgWidth, this.imgHeight, -(this.imgWidth * this.scaledSize) / 2, blockSize, this.imgWidth * this.scaledSize, this.imgHeight * this.scaledSize);
    c.restore();
};

players.add = function(x, y, w, h) {
    this.push(new Player(x, y, w, h));
};
players.create = function() {
    for (var i = 0; i < this.length; i ++) {
        this[i].update();
        this[i].draw();
    }
};

// solid ground
var Ground = function(x, y, width, height, type) {
    this.collisionOffset = 5;
    this.x = x + this.collisionOffset;
    this.y = y;
    this.width = width - this.collisionOffset;
    this.height = height;
    this.type = type;
    this.image = new Image();
    this.image.src = 'assets/tileset2.png';
    this.index = type; // tile index
    this.scaledSize = 3;
};  
Ground.prototype.draw = function() {
    c.save();
    c.translate(this.x - this.collisionOffset / 2, this.y)
    c.scale(this.scaledSize, this.scaledSize);

    // tile
    c.drawImage(this.image, this.index * 16, 0, 16, 16, 0, 0, 16, 16);

    c.restore();
};

grounds.add = function(x, y, w, h, t) {
    this.push(new Ground(x, y, w, h, t));
};
grounds.create = function() {
    for (var i = 0; i < this.length; i ++) {
        this[i].draw();
    }
};

// grass
var Grass = function(x, y, width, height, type) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.type = type;
    this.image = new Image();
    this.image.src = 'assets/tileset2.png';
    this.index = type; // tile index
    this.scaledSize = 3;
};  
Grass.prototype.draw = function() {
    c.save();
    c.translate(this.x, this.y)
    c.scale(Math.floor(this.scaledSize), Math.floor(this.scaledSize));
    c.drawImage(this.image, this.index * 16, 0, 16, 16, 0, 0, 15, 15);
    c.restore();
};

grasses.add = function(x, y, w, h, t) {
    this.push(new Grass(x, y, w, h, t));
};
grasses.create = function() {
    for (var i = 0; i < this.length; i ++) {
        this[i].draw();
    }
};

// enemy
var Enemy = function(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.xVel = 0;
    this.yVel = 0;
    this.acceleration = 0.4;
    this.moveToLeft = true;
    this.direction = -1;
    this.gravity = 0.5;
    this.life = 3;
    this.dead = false;
    this.maxSpeed = 3;
    this.index = 0;
    this.loopSpeed = 4;
    this.img = new Image();
    this.img.src = 'assets/fox.png'
    this.imgWidth = 13;
    this.imgHeight = 16;
    this.scaledSize = 3;
};
Enemy.prototype.update = function() {
    if (!this.dead) {
        if (this.moveToLeft) {
            this.direction = -1;
            this.xVel -= this.acceleration;
        }else if (!this.moveToLeft) {
            this.direction = 1;
            this.xVel += this.acceleration;
        }
        if (frameCount % this.loopSpeed === 0) {
            this.index = (this.index + 1) % 4;
        }

        if (this.xVel > this.maxSpeed) {
            this.xVel = this.maxSpeed;
        }else if (this.xVel < -this.maxSpeed) {
            this.xVel = -this.maxSpeed;
        }

        this.x += this.xVel; // update x by x velocity
        this.collide(grounds, this.xVel, 0); // x collision with solid objects

        // check for collision with player[s]
        for (var i = 0; i < players.length; i ++) {
            if (collide(this, players[i]) && !players[i].dead) {    
                if (!players[i].attacking) {
                    players[i].yVel = -7;
                }
                if (players[i].attacking) {
                    if (players[i].index === 2) {
                        this.life --;
                    }
                }
            }
        }
    }
    if (this.life <= 0) {
        this.dead = true;
    }
    this.y += this.yVel; // update y by y velocity
    this.yVel += this.gravity; // update y velocity by gravity
    this.collide(grounds, 0, this.yVel);
};
Enemy.prototype.collide = function(obj, xVel, yVel) {
    for (var i = 0; i < obj.length; i ++) {
        if (collide(this, obj[i]) && this.dead === false) {
            if (xVel < 0) {
                this.xVel = 0;
                this.x = obj[i].x + obj[i].width;
                this.moveToLeft = false;
                this.yVel = -3;
            }
            if (xVel > 0) {
                this.xVel = 0;
                this.x = obj[i].x - this.width;
                this.moveToLeft = true;
                this.yVel = -3;
            }
            if (yVel < 0) {
                this.yVel = 0;
                this.canJump = false;
                this.y = obj[i].y + obj[i].height;
            }
            if (yVel > 0) {
                this.yVel = 0;
                this.canJump = true;
                this.y = obj[i].y - this.height;
            }
        }
    }
};
Enemy.prototype.draw = function() {
    c.save();
    c.translate(this.x - 20 * this.direction, this.y - this.scaledSize);
    c.scale(this.direction, 1)
    c.drawImage(this.img, this.index * this.imgWidth, 0, this.imgWidth, this.imgHeight, 20 * this.direction, 0, this.imgWidth * this.scaledSize, this.imgHeight * this.scaledSize);
    c.restore();
};

enemys.add = function(x, y, w, h) {
    this.push(new Enemy(x, y, w, h));
};
enemys.create = function() {
    for (var i = 0; i < this.length; i ++) {
        this[i].update();
        this[i].draw();
    }
};

// ************************* LEVEL DATA *************************
levels = [
    [
        "..........................................................................................",
        "...................................................-......................................",
        "...................................................-......................................",
        ".-.......-......-------------------...---....--....-......................................",
        ".-.......-.......----------------.........................................................",
        ".-.......-...............................................-................................",
        ".-.......-...............................................-................................",
        ".-.......-...............................................-................................",
        ".-.......-...............................................-................................",
        ".-.......-................................................................................",
        ".-.......-................................................................................",
        ".-.......-................................................................................",
        ".-.......-...................................................-............................",
        ".-.......-...................................................-............................",
        ".-.......-...................................................-............................",
        ".-.......-...................................................-............................",
        ".-.......-................................................................................",
        ".-.......-......................................................-.........................",
        ".-.......-......................................................-.........................",
        ".-.......-......................................................-.........................",
        ".-.......-......................................................-------------------------.",
        ".-.......-.............................................................--........--.......",
        ".-.......-.............................................................--........--.......",
        ".-.......-.............................................................--........--.......",
        ".-.......-.............................................................--........--.......",
        ".-.......-.............................................................--........--.......",
        ".-.......-.............................................................--........--.......",
        ".-.......-.............................................................--.................",
        ".-.......-.............................................................--.................",
        ".-.......-.............................................................--.................",
        ".-.......-.........-----...............................................--........--.......",
        ".-.......-.........-----...............................................--........--.......",
        ".-.................-------.............................................--........--.......",
        ".-........p.......--------.........................-----.....----....----........--.......",
        ".---------------------------------...----------------------------...-------......--------.",
        ".---------------------------------...-----------------------------..-------......--------.",
        ".----------------------------------...--.....---------------------....-----......--------.",
        ".----------------------------------...........--------------------.....----......--------.",
        ".----------------------------------............------------------...-------......--------.",
        ".------------------------------------.........-------------------...--------....---------.",
        ".----------------------------------------------------------------...--------....---------.",
        ".----------------------------------------------------------------...-------.....---------.",
        ".----------------------------------------------------------------..............----------.",
        ".----------------------------------------------------------------..............----------.",
        ".----------------------------------------------------------------..............----------.",
        ".-----------------------------------------------------------------............-----------.",
        ".----------------------------------------------------------------------------------------.",
        ".----------------------------------------------------------------------------------------.",
        "..........................................................................................",
    ],    
];

// apply keys to objects and define them + image selection algorithim
var loadLevels = function() {
    for (var i = 0; i < levels[level].length; i ++) {
        for (var j = 0; j < levels[level][i].length; j ++) {
            // associate specific keys to specific objects
            if (levels[level][i][j] === 'p') {
                players.add(j * blockSize, i * blockSize, blockSize - 25, blockSize * 2);
            } 
            if (levels[level][i][j] === 'e') {
                enemys.add(j * blockSize, i * blockSize, blockSize, blockSize);
            } 
            if (levels[level][i][j] === '-') {
                // select image relative to other blocks
                if (levels[level][i][j + 1] === '-' && levels[level][i][j - 1] === '-' && levels[level][i - (i === 0 ? 0 : 1)][j] !== '-' && levels[level][i + (i === levels[level].length ? 0 : 1)][j] === '-') {
                    grounds.add(j * blockSize, i * blockSize, blockSize - 10, blockSize, 1);
                }else if (levels[level][i][j + 1] === '-' && levels[level][i][j - 1] === '-' && levels[level][i - (i === 0 ? 0 : 1)][j] !== '-' && levels[level][i + (i === levels[level].length ? 0 : 1)][j] !== '-') {
                    grounds.add(j * blockSize, i * blockSize, blockSize, blockSize, 12);
                }else if (levels[level][i][j + 1] === '-' && levels[level][i][j - 1] === '-' && levels[level][i - (i === 0 ? 0 : 1)][j] === '-' && levels[level][i + (i === levels[level].length - 1 ? 0 : 1)][j] !== '-') {
                    grounds.add(j * blockSize, i * blockSize, blockSize, blockSize, 7);
                }else if (levels[level][i][j - 1] !== '-' && levels[level][i][j + 1] === '-' && levels[level][i - (i === 0 ? 0 : 1)][j] !== '-' && levels[level][i + (i === levels[level].length ? 0 : 1)][j] === '-') {
                    grounds.add(j * blockSize, i * blockSize, blockSize, blockSize, 0);
                }else if (levels[level][i][j - 1] === '-' && levels[level][i][j + 1] !== '-' && levels[level][i - (i === 0 ? 0 : 1)][j] !== '-' && levels[level][i + (i === levels[level].length ? 0 : 1)][j] === '-') {
                    grounds.add(j * blockSize, i * blockSize, blockSize, blockSize, 2);
                }else if (levels[level][i][j - 1] !== '-' && levels[level][i][j + 1] !== '-' && levels[level][i - (i === 0 ? 0 : 1)][j] !== '-' && levels[level][i + (i === levels[level].length ? 0 : 1)][j] !== '-') {
                    grounds.add(j * blockSize, i * blockSize, blockSize, blockSize, 11);
                }else if (levels[level][i][j - 1] !== '-' && levels[level][i][j + 1] !== '-' && levels[level][i - (i === 0 ? 0 : 1)][j] === '-' && levels[level][i + (i === levels[level].length ? 0 : 1)][j] === '-') {
                    grounds.add(j * blockSize, i * blockSize, blockSize, blockSize, 10);
                }else if (levels[level][i][j + 1] !== '-' && levels[level][i][j - 1] !== '-' && levels[level][i - (i === 0 ? 0 : 1)][j] !== '-' && levels[level][i + (i === levels[level].length ? 0 : 1)][j] === '-') {
                    grounds.add(j * blockSize, i * blockSize, blockSize, blockSize, 15);
                }else if (levels[level][i][j + 1] !== '-' && levels[level][i][j - 1] === '-' && levels[level][i - (i === 0 ? 0 : 1)][j] === '-' && levels[level][i + (i === levels[level].length ? 0 : 1)][j] !== '-') {
                    grounds.add(j * blockSize, i * blockSize, blockSize, blockSize, 8);
                }else if (levels[level][i][j + 1] === '-' && levels[level][i][j - 1] !== '-' && levels[level][i - (i === 0 ? 0 : 1)][j] === '-' && levels[level][i + (i === levels[level].length ? 0 : 1)][j] !== '-') {
                    grounds.add(j * blockSize, i * blockSize, blockSize, blockSize, 6);
                }else if (levels[level][i][j + 1] === '-' && levels[level][i][j - 1] !== '-' && levels[level][i - (i === 0 ? 0 : 1)][j] === '-' && levels[level][i + (i === levels[level].length ? 0 : 1)][j] === '-') {
                    grounds.add(j * blockSize, i * blockSize, blockSize, blockSize, 3);
                }else if (levels[level][i][j + 1] !== '-' && levels[level][i][j - 1] === '-' && levels[level][i - (i === 0 ? 0 : 1)][j] === '-' && levels[level][i + (i === levels[level].length ? 0 : 1)][j] === '-') {
                    grounds.add(j * blockSize, i * blockSize, blockSize, blockSize, 5);
                }else if (levels[level][i][j + 1] === '-' && levels[level][i][j - 1] === '-' && levels[level][i - (i === 0 ? 0 : 1)][j] === '-' && levels[level][i + (i === levels[level].length - 1 ? 0 : 1)][j] === '-') {
                    grounds.add(j * blockSize, i * blockSize, blockSize, blockSize, 16);
                }else if (levels[level][i][j + 1] !== '-' && levels[level][i][j - 1] === '-' && levels[level][i - (i === 0 ? 0 : 1)][j] !== '-' && levels[level][i + (i === levels[level].length ? 0 : 1)][j] !== '-') {
                    grounds.add(j * blockSize, i * blockSize, blockSize, blockSize, 13);
                }else if (levels[level][i][j + 1] === '-' && levels[level][i][j - 1] !== '-' && levels[level][i - (i === 0 ? 0 : 1)][j] !== '-' && levels[level][i + (i === levels[level].length ? 0 : 1)][j] !== '-') {
                    grounds.add(j * blockSize, i * blockSize, blockSize, blockSize, 14);
                }else if (levels[level][i][j + 1] !== '-' && levels[level][i][j - 1] !== '-' && levels[level][i - (i === 0 ? 0 : 1)][j] === '-' && levels[level][i + (i === levels[level].length ? 0 : 1)][j] !== '-') {
                    grounds.add(j * blockSize, i * blockSize, blockSize, blockSize, 9);
                }
            }
        }
    }
};

// create all game objects
function createObjects() {
    grasses.create();
    grounds.create();
    enemys.create();
    players.create();
};

// used to delete all objects on map
objects.delete = function() {
    for (var i = 0; i < objects.length; i ++) {
        for (var j = 0; j < objects[i].length; j ++) {
            objects[i].splice(j, objects[i].length);
        }
    }
};

// ************************* ANIMATION LOOP *************************
function draw() {
    c.clearRect(0, 0, canvas.width, canvas.height)

    c.imageSmoothingEnabled = false;

    loadTime ++;

    if (loadTime === 1) {
        loadLevels();
    }

    //remove dead enemies
    for (var i = 0; i < enemys.length; i ++) {
        if (enemys.dead) {
            enemys.splice(i, 1);
        }
    }

    c.save(); // save current canvas matrix
    
    var player = players[0]; // save variable that selects first player spawned

    camX = -player.x + canvas.width / 2; // set camera x
    camY = -player.y + canvas.height / 2 + 150; // set camera y

    // CONSTRAIN CAMERA

    // left side
    if ((camX * -1) - blockSize < 0) {
        camX = -blockSize;
    }
    
    // right side
    for (var i = 0; i < levels[level].length - 1; i ++) {
        if ((camX * -1) > (levels[level][i].length - 1) * blockSize - canvas.width) {
            camX = ((levels[level][i].length - 1) * blockSize - canvas.width) * -1;
        }
    }

    // top
    if ((camY * -1) + blockSize < 0) {
        camY = 0 + blockSize;
    }
    
    // bottom
    if ((camY * -1) > (levels[level].length - 1) * blockSize - canvas.height) {
        camY = ((levels[level].length - 1) * blockSize - canvas.height) * -1;
    }

    // keep player in screen

    // left side
    if (player.x < blockSize) {
        player.x = blockSize;
    }
    // right side
    for (var i = 0; i < levels[level].length - 2; i ++) {
        if (player.x > (levels[level][i].length - 2) * blockSize) {
            player.x = ((levels[level][i].length - 2) * blockSize);
        }
    }

    c.translate(Math.floor(camX), Math.floor(camY)); // translate tile map by camera positions

    createObjects(); // call create obj's function

    c.restore(); // reset saved canvas matrix

    // fake frame rate        
    frameCount = (frameCount + 1) % 60;

    requestAnimationFrame(draw);
}

draw(); // call draw loop

// ************************* EVENT LISTENERS *************************
addEventListener('keydown', ({ key }) => {
    switch(key) {
        case 'ArrowRight':
            keys.right.pressed = true;
            break;
        case 'ArrowLeft':
            keys.left.pressed = true;
            break;
        case 'ArrowUp':
            keys.up.pressed = true;
            break;
        case 'ArrowDown':
            keys.down.pressed = true;
            break;
        case ' ':
            keys.shoot.pressed = true;
            break;
        case 'x':
            keys.strike.pressed = true;
            break;
    }
})
addEventListener('keyup', ({ key }) => {
    switch(key) {
        case 'ArrowRight':
            keys.right.pressed = false;
            break;
        case 'ArrowLeft':
            keys.left.pressed = false;
            break;
        case 'ArrowUp':
            keys.up.pressed = false;
            break;
        case 'ArrowDown':
            keys.down.pressed = false;
            break;
        case ' ':
            keys.shoot.pressed = false;
            break;
        case 'x':
            keys.strike.pressed = false;
            break;
    }
})