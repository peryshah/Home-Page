const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

let deck = [];
let tableauPiles = document.querySelectorAll('.pile');

// Create deck
function createDeck() {
    deck = [];
    for (let suit of suits) {
        for (let value of values) {
            deck.push({ suit, value });
        }
    }
    shuffleDeck();
}

// Shuffle deck
function shuffleDeck() {
    for (let i = deck.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
}

function dealCards() {
    tableauPiles.forEach((pile, index) => {
        pile.innerHTML = ""; // Clear previous cards
        for (let j = 0; j <= index; j++) {
            let card = createCardElement(deck.pop(), j === index);
            card.style.setProperty('--index', j);  // Assign index for spacing
            pile.appendChild(card);
        }
    });
}


// Create a card element
function createCardElement(card, isTopCard) {
    let cardNames = { 'A': 'ace', 'J': 'jack', 'Q': 'queen', 'K': 'king' };
    let fileName = `${cardNames[card.value] || card.value}_of_${card.suit}.png`;

    let cardEl = document.createElement('div');
    cardEl.classList.add('card');
    if (!isTopCard) cardEl.classList.add('hidden');

    let img = document.createElement('img');
    img.src = `cards/${fileName}`;  // Use the correct filename format
    img.alt = `${card.value} of ${card.suit}`;
    img.draggable = true;

    cardEl.appendChild(img);
    cardEl.draggable = true;
    cardEl.dataset.suit = card.suit;
    cardEl.dataset.value = card.value;
    cardEl.addEventListener('dragstart', dragStart);
    cardEl.addEventListener('dragend', dragEnd);
    return cardEl;
}

// Drag-and-drop functions
let draggedCard = null;

function dragStart(event) {
    draggedCard = event.target;
}

function dragEnd(event) {
    draggedCard = null;
}

// Restart game
function restartGame() {
    document.querySelectorAll('.card').forEach(card => card.remove());
    createDeck();
    dealCards();
}

// Initialize game
createDeck();
dealCards();
