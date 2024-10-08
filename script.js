import { CHESS_SFX } from "./logic/ChessVariables.js";
import { getChessPieceImage, makeGlobal, setDebugMode, logicalToVisual, visualToLogical, generateGame, getMoves, movePiece, decodeMove, killPiece, checkServerStatus } from "./logic/util.js";
import { wrapGrid } from "https://esm.sh/animate-css-grid";

setDebugMode(true);

const cellHolder = document.querySelector(".cell-holder");
const pieceHolder = document.querySelector(".piece-holder");
wrapGrid(pieceHolder);

let splashText = document.createElement("div")
splashText.innerHTML = "Loading..."
splashText.classList.add("splash-text")
pieceHolder.append(splashText)

await checkServerStatus()

let board = await generateGame();

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

		cells[logicalToVisual({ x: j - 1, y: i - 1 })] = cell;
	}
}

if (board) {
	pieceHolder.style.gridTemplateColumns = "repeat(8, 1fr)"
	pieceHolder.style.gridTemplateRows = "repeat(8, 1fr)"

	splashText.remove()

	renderBoardPieces(board.positions)
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
			let pieceImg = getChessPieceImage(positions[i][j]);
			piece.src = pieceImg;
			piece.style.gridArea = `${i + 1}/${j + 1}`;
			piece.className = visualPos + " " + pieceImg.slice(-7, -6)
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
let availableMoves = []
let attackingMoves = []

async function buttonOnClick(event) {
	let pos = event.srcElement.closest(".buttons").className.split(" ")[0]

	let attackingMove = attackingMoves.find(e => pos === e.position)
	let availableMove = availableMoves.find(e => pos === e.position)

	if (availableMove) {
		let visualPiece = pieces[lastClickedPosition]
		board = await movePiece(board.gameID, lastClickedPosition, pos, null, availableMove.castleTarget)
		if (!board) return;

		checkGameState()

		// Visual position
		let newPos = visualToLogical(pos)
		visualPiece.style.gridArea = `${newPos.y + 1}/${newPos.x + 1}`;
		visualPiece.classList.remove(lastClickedPosition);
		visualPiece.classList.add(pos);

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
		pieces[pos] = visualPiece

		resetAllCells()
		resetHoverEffect()
		availableMoves = []
		attackingMoves = []
		lastClickedPosition = ""
		return;
	}

	if (attackingMove) {
		let visualPiece = pieces[lastClickedPosition]
		let targetPiece = pieces[attackingMove.killTarget]
		board = await killPiece(board.gameID, lastClickedPosition, pos, attackingMove.killTarget)
		if (!board) return;

		checkGameState()

		// Visual position
		let newPos = visualToLogical(pos)
		visualPiece.style.gridArea = `${newPos.y + 1}/${newPos.x + 1}`;
		visualPiece.classList.remove(lastClickedPosition);
		visualPiece.classList.add(pos);

		targetPiece.remove()

		if (attackingMove["isEnPassant"])
			delete pieces[attackingMove.killTarget]

		delete pieces[lastClickedPosition];

		pieces[pos] = visualPiece

		resetAllCells()
		resetHoverEffect()
		availableMoves = []
		attackingMoves = []
		lastClickedPosition = ""
		return;
	}

	// Empty cell
	if (!pieces[pos]) {
		lastClickedPosition = ""
		availableMoves = []
		attackingMoves = []

		resetAllCells()
		resetHoverEffect()
		return;
	}
	else if (pieces[pos] && !pieces[pos].classList.contains(board.currentTurn[0])) {

		lastClickedPosition = ""
		availableMoves = []
		attackingMoves = []

		resetAllCells()
		resetHoverEffect()
		return;
	}

	if (lastClickedPosition.length) {

		if (lastClickedPosition === pos) {
			lastClickedPosition = ""
			availableMoves = []
			attackingMoves = []

			resetHoverEffect()
			return resetAllCells();
		}

		lastClickedPosition = ""
		availableMoves = []
		attackingMoves = []
	}

	if (!pieces[lastClickedPosition || pos].classList.contains(board.currentTurn[0]))
		return;

	resetAllCells()
	resetHoverEffect()
	lastClickedPosition = pos;

	let moves = await getMoves(board.gameID, pos)
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
	if (board.check) {
		if (!checkedCell.length) {
			checkedCell = board.check
			cells[board.check].style.background = "linear-gradient(135deg, hsl(0, 100%, 50%), hsl(0, 100%, 56%))"
		}
	} else {
		if (checkedCell.length) {
			cells[checkedCell].style.background = ""
			checkedCell = "";
		}
	}

	if (board.checkmate) {
		// TODO: Game is in checkmate, do stuff
	}

	if (board.stalemate) {
		// TODO: Game is in stalemate, do stuff
	}
}