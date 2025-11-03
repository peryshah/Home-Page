let runs = 0;
let wickets = 0;
let balls = 0;
const maxWickets = 2;
const maxOvers = 2;
const ballsPerOver = 6;
let gameOver = false;

function play(playerChoice) {
    if(gameOver) return;

    const options = [0,1,2,3,4,6];
    const computerChoice = options[Math.floor(Math.random() * options.length)];

    // Animate ball falling
    const ball = document.getElementById("ball");
    ball.style.top = "0px"; // start from top
    setTimeout(() => {
        ball.style.top = "350px"; // move to bat
    }, 50);

    document.getElementById("computerChoice").innerText = `Ball Number: ${computerChoice}`;

    balls++;
    if(playerChoice === computerChoice) {
        wickets++;
        document.getElementById("message").innerText = "You lost a wicket!";
    } else {
        runs += playerChoice;
        document.getElementById("message").innerText = "Nice hit!";
    }

    const currentOver = Math.floor(balls / ballsPerOver);
    const currentBall = balls % ballsPerOver;
    document.getElementById("overs").innerText = `Overs: ${currentOver}.${currentBall}/${maxOvers}`;
    document.getElementById("runs").innerText = `Runs: ${runs}`;
    document.getElementById("wickets").innerText = `Wickets: ${wickets}`;

    if(wickets >= maxWickets || balls >= maxOvers * ballsPerOver) {
        gameOver = true;
        document.getElementById("message").innerText = `Match Over! Total Runs: ${runs}`;
        document.getElementById("restart").style.display = "inline-block";
    }
}

function restartGame() {
    runs = 0;
    wickets = 0;
    balls = 0;
    gameOver = false;
    document.getElementById("runs").innerText = `Runs: ${runs}`;
    document.getElementById("wickets").innerText = `Wickets: ${wickets}`;
    document.getElementById("overs").innerText = `Overs: 0/${maxOvers}`;
    document.getElementById("computerChoice").innerText = `Ball Number: -`;
    document.getElementById("message").innerText = "";
    document.getElementById("restart").style.display = "none";

    const ball = document.getElementById("ball");
    ball.style.top = "0px";
}
