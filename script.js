import { CHESS_SFX } from "./logic/ChessVariables.js";
import { getChessPieceImage, makeGlobal, setDebugMode, logicalToVisual, visualToLogical, generateGame, getMoves, movePiece, decodeMove, killPiece, checkServerStatus, getGameStatus, getChessPieceKey } from "./logic/util.js";
import { wrapGrid } from "https://esm.sh/animate-css-grid";

setDebugMode(true);

const cellHolder = document.querySelector(".cell-holder");
const pieceHolder = document.querySelector(".piece-holder");
wrapGrid(pieceHolder);

let splashText = document.createElement("div")
splashText.innerHTML = "Loading..."
splashText.classList.add("splash-text")
pieceHolder.append(splashText)

let gameID = ""

await checkServerStatus()

let board = await generateGame();

if(board) {
	gameID = board.game.gameID;
}

let cells = {}
let pieces = {}
let buttons = {}

let checkedCell = ""

makeGlobal('cells', cells);
makeGlobal('pieces', pieces);
makeGlobal('buttons', buttons);
makeGlobal('board', board);

makeGlobal("availableCell", availableCell)
makeGlobal('attackedCell', attackedCell)
makeGlobal('resetAllCells', resetAllCells)
makeGlobal('resetHoverEffect', resetHoverEffect)

makeGlobal('logicalToVisual', logicalToVisual)
makeGlobal('visualToLogical', visualToLogical)

for (let i = 8; i >= 1; i--) {
	for (let j = 1; j <= 8; j++) {
		var cell = document.createElement("div");
		cell.className = "cell f-" + String.fromCharCode(96 + j) + " r-" + i;
		cellHolder.appendChild(cell);

		cells[logicalToVisual({ x: j - 1, y: 8 - i })] = cell;
	}
}

if (board) {
	pieceHolder.style.gridTemplateColumns = "repeat(8, 1fr)"
	pieceHolder.style.gridTemplateRows = "repeat(8, 1fr)"

	splashText.remove()

	renderBoardPieces(board.game.positions)
	resetAllCells()
	resetHoverEffect()
} else
	splashText.innerHTML = "Cannot connect to the server."

function renderBoardPieces(positions) {
	for (let i = 0, k = 8; i < 8; i++, k--) {
		for (let j = 0; j < 8; j++) {

			let visualPos = logicalToVisual({ x: j, y: i })

			let button = document.createElement("div");
			button.style.gridArea = `${i + 1}/${j + 1}`;
			button.className = visualPos + " buttons";
			button.innerHTML = "<div class='fa-solid fa-xmark'></div><div class='fa-solid fa-circle'></div>";
			pieceHolder.appendChild(button);

			button.addEventListener("click", buttonOnClick)

			buttons[visualPos] = button

			if (!positions[i][j]) continue;

			let piece = document.createElement("img");

			piece.src = getChessPieceImage(positions[i][j]);
			piece.style.gridArea = `${i + 1}/${j + 1}`;
			piece.id = getChessPieceKey(positions[i][j]);

			pieceHolder.appendChild(piece);

			pieces[visualPos] = piece
		}
	}
};

function resetAllCells() {
	let altColor = "white";

	for (let i = 8; i >= 1; i--) {
		for (let j = 1; j <= 8; j++) {
			let pos = logicalToVisual({ x: j - 1, y: i - 1 })

			let cell = cells[pos]
			cell.classList.add(altColor);

			buttons[pos].children[0].style.transform = "scale(0)"
			buttons[pos].children[1].style.transform = "scale(0)"

			if (altColor == "black")
				cell.style.boxShadow = "inset 0 0 10px 0px black";

			if (j == 8) continue;

			if (altColor != "white") {
				altColor = "white";
			} else
				altColor = "black";
		}
	}
};

function resetHoverEffect() {
	for (let button of Object.values(buttons)) {
		button.addEventListener('mouseover', () => {
			button.style.border = "3px solid hsla(0, 0%, 80%, 1)";
			button.style.borderRadius = "10%";
		})
		button.addEventListener('mouseout', () => {
			button.style.border = "0px solid hsla(0, 0%, 80%, 1)";
		})
	}
}

let lastClickedPosition = ""
let lastClickedPiece = ""
let availableMoves = []
let attackingMoves = []

function resetState() {
	lastClickedPosition = "";
	lastClickedPiece = "";
	availableMoves = [];
	attackingMoves = [];

	resetAllCells();
	resetHoverEffect();
}

async function buttonOnClick(event) {
	let pos = event.srcElement.closest(".buttons").className.split(" ")[0]
	let piece = pieces[pos];

	let attackingMove = attackingMoves.find(e => pos === e.position)
	let availableMove = availableMoves.find(e => pos === e.position)

	if (availableMove) {
		let piece = pieces[lastClickedPosition];
		board = await movePiece(gameID, lastClickedPiece, pos, null, availableMove.castleTarget)

		if (!board || board.status === "failed") {
			board = await getGameStatus(gameID);
			return;
		}

		checkGameState()

		// Visual position
		let newPos = visualToLogical(pos)
		piece.style.gridArea = `${newPos.y + 1}/${newPos.x + 1}`;

		if (availableMove.castleTarget) {
			let castleTarget = pieces[availableMove.castleTarget]
			let newPosition = ""

			if (availableMove.castleTarget[0].charCodeAt(0) < availableMove.position[0].charCodeAt(0))
				newPosition = logicalToVisual({ x: newPos.x + 1, y: newPos.y })
			else
				newPosition = logicalToVisual({ x: newPos.x - 1, y: newPos.y })

			let logicalNewPos = visualToLogical(newPosition)

			castleTarget.style.gridArea = `${logicalNewPos.y + 1}/${logicalNewPos.x + 1}`
			castleTarget.classList.remove(availableMove.castleTarget);
			castleTarget.classList.add(newPosition);

			delete pieces[availableMove.castleTarget]
			pieces[newPosition] = castleTarget
		}

		delete pieces[lastClickedPosition]
		pieces[pos] = piece

		return resetState();
	}

	if (attackingMove) {
		let piece = pieces[lastClickedPosition];
		let targetPiece = pieces[attackingMove.killTarget]
		board = await killPiece(gameID, lastClickedPiece, pos, attackingMove.killTarget)
		if (!board || board.status === "failed") {
			board = await getGameStatus(gameID);
			return;
		}

		checkGameState()

		// Visual position
		let newPos = visualToLogical(pos)
		piece.style.gridArea = `${newPos.y + 1}/${newPos.x + 1}`;

		targetPiece.remove()

		if (attackingMove["isEnPassant"])
			delete pieces[attackingMove.killTarget]


		delete pieces[lastClickedPosition];
		pieces[pos] = piece

		return resetState();
	}

	// Empty cell or not this player's turn
	if (!pieces[pos] || (pieces[pos] && pieces[pos].id[0] !== board.game.currentTurn[0].toUpperCase()))
		return resetState();

	if (lastClickedPosition.length) {
		// If user clicked the same piece, then we reset variables AND reset hover states
		if (lastClickedPosition === pos)
			return resetState();

		// But if user clicked on a piece then directly on another piece, then we only want to reset
		// variables and not hover states, so that they still work correctly
		lastClickedPosition = ""
		availableMoves = []
		attackingMoves = []
	}

	// Not their turn
	if (pieces[lastClickedPosition || pos].id[0] !== board.game.currentTurn[0].toUpperCase())
		return;

	resetAllCells()
	resetHoverEffect()
	lastClickedPosition = pos;
	lastClickedPiece = piece.id;

	let moves = await getMoves(gameID, lastClickedPiece)
	if (!moves) return;

	moves = moves.map(decodeMove)
	moves.forEach(move => {
		if ((move["isPawnDiagonal"] && !move["isKillingMove"]) || move["isFriendlyPiece"])
			return;

		if (move["isKillingMove"]) {
			attackedCell(move.position)
			attackingMoves.push(move)
		}
		else {
			availableCell(move.position)
			availableMoves.push(move)
		}
	})
}

function availableCell(pos) {
	let button = buttons[pos]

	button.children[1].style.transform = "scale(1)";
	button.addEventListener("mouseover", () => {
		button.style.border = "4px solid hsla(180, 100%, 75%, 1)";
		button.style.borderRadius = "10%";
	})
	button.addEventListener("mouseout", () => {
		button.style.border = "0px solid hsla(180, 100%, 75%, 1)";
		button.style.borderRadius = "10%";
	})
}

function attackedCell(pos) {
	let button = buttons[pos]

	button.children[0].style.transform = "scale(1)";
	button.addEventListener("mouseover", () => {
		button.style.border = "4px solid hsla(360, 100%, 50%, 1)";
		button.style.borderRadius = "10%";
	})
	button.addEventListener("mouseout", () => {
		button.style.border = "0px solid hsla(360, 100%, 50%, 1)";
		button.style.borderRadius = "10%";
	})
}

function checkGameState() {
	if (board.game.check) {
		if (!checkedCell.length) {
			checkedCell = board.game.check
			cells[board.game.check].style.background = "linear-gradient(135deg, hsl(0, 100%, 50%), hsl(0, 100%, 56%))"
		}
	} else {
		if (checkedCell.length) {
			cells[checkedCell].style.background = ""
			checkedCell = "";
		}
	}

	if (board.game.checkmate) {
		// TODO: Game is in checkmate, do stuff
	}

	if (board.game.stalemate) {
		// TODO: Game is in stalemate, do stuff
	}

	if (board.game.eligibleForPromotion) {
		// TODO: Create promotion pop-up and disable all other buttons
	}
}