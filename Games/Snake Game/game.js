const gameContainer = document.getElementById("game-container");
const snake = document.getElementById("snake");
const food = document.getElementById("food");
const scoreEl = document.getElementById("score");

let snakeX = 0;
let snakeY = 0;
let foodX;
let foodY;
let score = 0;
let intervalId;
let direction = "right";
const snakeBody = [];
const blockSize = 20;
let speed = 100;

function init() {
    snakeX = 0;
    snakeY = 0;
    score = 0;
    direction = "right";
    snakeBody.length = 0;
    scoreEl.textContent = "Score: 0";

    // Remove any previous snake parts
    document.querySelectorAll(".snake-part").forEach(part => part.remove());

    drawSnake();
    drawFood();
    clearInterval(intervalId);
    intervalId = setInterval(moveSnake, speed);
    document.addEventListener("keydown", changeDirection);
}

function drawSnake() {
    snake.style.left = snakeX + "px";
    snake.style.top = snakeY + "px";

    for (let i = 0; i < snakeBody.length; i++) {
        const snakePart = snakeBody[i];
        snakePart.element.style.left = snakePart.x + "px";
        snakePart.element.style.top = snakePart.y + "px";
    }
}

function drawFood() {
    foodX = Math.floor(Math.random() * (gameContainer.offsetWidth / blockSize)) * blockSize;
    foodY = Math.floor(Math.random() * (gameContainer.offsetHeight / blockSize)) * blockSize;
    food.style.left = foodX + "px";
    food.style.top = foodY + "px";
}

function moveSnake() {
    let newX = snakeX;
    let newY = snakeY;

    // Move the tail to the front
    if (snakeBody.length > 0) {
        const tail = snakeBody.pop();
        tail.x = snakeX;
        tail.y = snakeY;
        snakeBody.unshift(tail);
    }

    // Update snake position
    switch (direction) {
        case "up": newY -= blockSize; break;
        case "down": newY += blockSize; break;
        case "left": newX -= blockSize; break;
        case "right": newX += blockSize; break;
    }

    // Check wall collision
    if (newX < 0 || newX >= gameContainer.offsetWidth || newY < 0 || newY >= gameContainer.offsetHeight) {
        gameOver();
        return;
    }

    // Check self-collision
    for (let i = 0; i < snakeBody.length; i++) {
        if (newX === snakeBody[i].x && newY === snakeBody[i].y) {
            gameOver();
            return;
        }
    }

    // Check food collision
    if (newX === foodX && newY === foodY) {
        score++;
        scoreEl.textContent = "Score: " + score;
        drawFood();
        growSnake();

        if (score % 7 === 0 && speed > 20) {
            speed -= 10; // Increase speed
            clearInterval(intervalId);
            intervalId = setInterval(moveSnake, speed);
        }
    }

    snakeX = newX;
    snakeY = newY;
    drawSnake();
}

function growSnake() {
    const newPart = document.createElement("div");
    newPart.className = "snake-part";
    gameContainer.appendChild(newPart);
    snakeBody.push({ element: newPart, x: snakeX, y: snakeY });
}

function changeDirection(event) {
    const key = event.keyCode;
    if (key === 37 && direction !== "right") direction = "left";
    else if (key === 38 && direction !== "down") direction = "up";
    else if (key === 39 && direction !== "left") direction = "right";
    else if (key === 40 && direction !== "up") direction = "down";
}

function gameOver() {
    clearInterval(intervalId);
    alert("Game Over! Your score: " + score);
    init();
}

// Start game
init();
