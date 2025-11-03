const board = document.getElementById("board");
const timerDisplay = document.getElementById("timer");
const newGameButton = document.getElementById("new-game");
const numberPad = document.getElementById("number-pad");
let timer;
let time = 0;
let boardData = [];
let difficulty = "easy";
let selectedCell = null;

// Difficulty levels: number of cells to remove
const difficulties = {
  easy: 30,
  medium: 45,
  hard: 60,
};

// Generate a solved Sudoku board
function generateSolvedBoard() {
  const grid = Array.from({ length: 9 }, () => Array(9).fill(0));
  fillGrid(grid);
  return grid;
}

// Fill the grid using backtracking
function fillGrid(grid) {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (grid[row][col] === 0) {
        const numbers = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        for (let num of numbers) {
          if (isValid(grid, row, col, num)) {
            grid[row][col] = num;
            if (fillGrid(grid)) return true;
            grid[row][col] = 0;
          }
        }
        return false;
      }
    }
  }
  return true;
}

// Check if a number is valid in a given position
function isValid(grid, row, col, num) {
  for (let i = 0; i < 9; i++) {
    if (grid[row][i] === num || grid[i][col] === num) return false;
  }
  const startRow = Math.floor(row / 3) * 3;
  const startCol = Math.floor(col / 3) * 3;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (grid[startRow + i][startCol + j] === num) return false;
    }
  }
  return true;
}

// Shuffle an array
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Create the game board
function createBoard() {
  board.innerHTML = "";
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const cell = document.createElement("div");
      cell.dataset.row = row;
      cell.dataset.col = col;
      if (boardData[row][col] !== 0) {
        cell.textContent = boardData[row][col];
        cell.classList.add("fixed");
      } else {
        cell.addEventListener("click", () => {
          selectedCell = cell;
          numberPad.classList.remove("hidden");
        });
      }
      board.appendChild(cell);
    }
  }
}

// Handle number pad clicks
numberPad.addEventListener("click", (e) => {
  if (e.target.classList.contains("number")) {
    const number = e.target.dataset.number;
    if (selectedCell) {
      if (number === "0") {
        selectedCell.textContent = "";
        boardData[selectedCell.dataset.row][selectedCell.dataset.col] = 0;
      } else {
        selectedCell.textContent = number;
        boardData[selectedCell.dataset.row][selectedCell.dataset.col] = Number(number);
      }
      selectedCell = null;
      numberPad.classList.add("hidden");
    }
  }
});

// Start a new game
function startGame() {
  const solvedBoard = generateSolvedBoard();
  boardData = JSON.parse(JSON.stringify(solvedBoard)); // Deep copy
  const cellsToRemove = difficulties[difficulty];
  let removed = 0;
  while (removed < cellsToRemove) {
    const row = Math.floor(Math.random() * 9);
    const col = Math.floor(Math.random() * 9);
    if (boardData[row][col] !== 0) {
      boardData[row][col] = 0;
      removed++;
    }
  }
  createBoard();
  startTimer();
}

// Start the timer
function startTimer() {
  time = 0;
  timerDisplay.textContent = "00:00";
  clearInterval(timer);
  timer = setInterval(() => {
    time++;
    const minutes = Math.floor(time / 60).toString().padStart(2, "0");
    const seconds = (time % 60).toString().padStart(2, "0");
    timerDisplay.textContent = `${minutes}:${seconds}`;
  }, 1000);
}

// Reset the game
function resetGame() {
  clearInterval(timer);
  timerDisplay.textContent = "00:00";
  boardData = [];
  board.innerHTML = "";
  numberPad.classList.add("hidden");
}

// Event listeners for difficulty buttons
document.getElementById("easy").addEventListener("click", () => {
  difficulty = "easy";
  resetGame();
  startGame();
});

document.getElementById("medium").addEventListener("click", () => {
  difficulty = "medium";
  resetGame();
  startGame();
});

document.getElementById("hard").addEventListener("click", () => {
  difficulty = "hard";
  resetGame();
  startGame();
});

// Event listener for new game button
newGameButton.addEventListener("click", () => {
  resetGame();
  startGame();
});