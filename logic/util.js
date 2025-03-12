import { CHESS_PIECE_UNICODE, CHESS_SERVER_URL } from "./ChessVariables.js";

let usedPieceKeys = [];

export function getChessPieceImage(strPiece) {
	let str = "./assets/chess_pieces/";

	if (strPiece.charCodeAt(0) >= CHESS_PIECE_UNICODE.BLACK_KING && strPiece.charCodeAt(0) <= CHESS_PIECE_UNICODE.BLACK_PAWN) str += "b_";
	else str += "w_";

	switch (strPiece.charCodeAt(0)) {
		case CHESS_PIECE_UNICODE.BLACK_KING:
		case CHESS_PIECE_UNICODE.WHITE_KING:
			str += "k";
			break;

		case CHESS_PIECE_UNICODE.BLACK_QUEEN:
		case CHESS_PIECE_UNICODE.WHITE_QUEEN:
			str += "q";
			break;

		case CHESS_PIECE_UNICODE.BLACK_ROOK:
		case CHESS_PIECE_UNICODE.WHITE_ROOK:
			str += "r";
			break;

		case CHESS_PIECE_UNICODE.BLACK_BISHOP:
		case CHESS_PIECE_UNICODE.WHITE_BISHOP:
			str += "b";
			break;

		case CHESS_PIECE_UNICODE.BLACK_KNIGHT:
		case CHESS_PIECE_UNICODE.WHITE_KNIGHT:
			str += "n";
			break;

		case CHESS_PIECE_UNICODE.BLACK_PAWN:
		case CHESS_PIECE_UNICODE.WHITE_PAWN:
			str += "p";
			break;
	}

	str += ".svg";

	return str;
}

export function getChessPieceKey(strPiece) {

	if (usedPieceKeys.length >= 32)
		usedPieceKeys = [];

	const pieceCode = strPiece.charCodeAt(0);
	let str = [];
	let usedIndex = 1;

	if (pieceCode >= CHESS_PIECE_UNICODE.BLACK_KING && pieceCode <= CHESS_PIECE_UNICODE.BLACK_PAWN) {
		str.push("B_");
	} else {
		str.push("W_");
	}

	switch (pieceCode) {
		case CHESS_PIECE_UNICODE.BLACK_KING:
		case CHESS_PIECE_UNICODE.WHITE_KING:
			str.push("K");
			break;

		case CHESS_PIECE_UNICODE.BLACK_QUEEN:
		case CHESS_PIECE_UNICODE.WHITE_QUEEN:
			str.push("Q");
			break;

		case CHESS_PIECE_UNICODE.BLACK_ROOK:
		case CHESS_PIECE_UNICODE.WHITE_ROOK:
			str.push("R");
			break;

		case CHESS_PIECE_UNICODE.BLACK_BISHOP:
		case CHESS_PIECE_UNICODE.WHITE_BISHOP:
			str.push("B");
			break;

		case CHESS_PIECE_UNICODE.BLACK_KNIGHT:
		case CHESS_PIECE_UNICODE.WHITE_KNIGHT:
			str.push("N");
			break;

		case CHESS_PIECE_UNICODE.BLACK_PAWN:
		case CHESS_PIECE_UNICODE.WHITE_PAWN:
			str.push("P");
			break;
	}

	str.push(String(usedIndex))

	let finalString = str.join("");

	while (usedPieceKeys.includes(finalString) && usedIndex < 8) {
		usedIndex++;
		str[str.length - 1] = String(usedIndex);
		finalString = str.join("");
	}

	usedPieceKeys.push(finalString)
	return finalString;
}

export function logicalToVisual(pos) {
	return String.fromCharCode(pos.x + 97) + String(8 - pos.y)
}

export function visualToLogical(strPos) {
	return {
		x: strPos[0].charCodeAt(0) - 97,
		y: 8 - +strPos[1]
	}
}

let debugMode = false;

export function makeGlobal(name, variable) {
	if (debugMode === true)
		globalThis[name] = variable;
}

export function setDebugMode(boolean) {
	debugMode = boolean
}

// Helper functions for backend operations
let isServerOnline = false;

export async function checkServerStatus() {
	try {
		let apiRes = await (await fetch(CHESS_SERVER_URL)).json()
		let gamesRes = await (await fetch(CHESS_SERVER_URL + "/games")).json()

		isServerOnline = (apiRes && apiRes.status === "success") || (gamesRes && gamesRes.status === "success");
	}
	catch (error) {
		isServerOnline = false;
		return console.error("Server is offline.", error)
	}
}

export async function generateGame() {
	if (!isServerOnline) {
		return console.error("Cannot generate a new game because the server is offline.")
	}

	try {
		return await (await fetch(CHESS_SERVER_URL + "/games/new")).json()
	} catch (error) {
		await checkServerStatus();
		return console.error("An error occured while trying to generate a new game.", error)
	}
}

export async function getMoves(gameID, piece) {
	if (!isServerOnline) {
		return console.error("Cannot get moves because the server is offline.")
	}

	try {
		return (await (await fetch(CHESS_SERVER_URL + "/games/" + gameID + "/moves/" + piece)).json()).moves
	} catch (error) {
		await checkServerStatus();
		return console.error("An error occured while trying to get moves for the specified piece.", error)
	}
}

export async function movePiece(gameID, piece, newPos, promoteTo = null, castleTarget = null) {
	if (!isServerOnline) {
		return console.error("Cannot move piece because the server is offline.")
	}

	try {
		return await (await fetch(CHESS_SERVER_URL + "/games/" + gameID + "/moves/" + piece, {
			method: "POST",
			headers: {
				"Accept": "application/json",
				"Content-Type": "application/json"
			},
			body: JSON.stringify({ moveTo: newPos, promoteTo, castleTarget })
		})).json()
	} catch (error) {
		await checkServerStatus();
		return console.error("An error occured while trying to move the specified piece.", error)
	}
}

export async function killPiece(gameID, piece, newPos, piecePos) {
	if (!isServerOnline) {
		return console.error("Cannot kill piece because the server is offline.")
	}

	try {
		return await (await fetch(CHESS_SERVER_URL + "/games/" + gameID + "/moves/" + piece, {
			method: "POST",
			headers: {
				"Accept": "application/json",
				"Content-Type": "application/json"
			},
			body: JSON.stringify({ moveTo: newPos, killPos: piecePos })
		})).json()
	} catch (error) {
		await checkServerStatus();
		return console.error("An error occured while trying to kill the specified piece.", error)
	}
}

export async function getGameStatus(gameID) {
	if (!isServerOnline) {
		return console.error("Cannot move piece because the server is offline.")
	}

	try {
		return await (await fetch(CHESS_SERVER_URL + "/games/" + gameID, {
			method: "GET",
			headers: {
				"Accept": "application/json",
				"Content-Type": "application/json"
			},
		})).json()
	} catch (error) {
		await checkServerStatus();
		return console.error("An error occured while trying fetch the game's state.", error)
	}
}

export function decodeMove(moveStr) {
	let moveObj = {}

	moveObj["position"] = moveStr.split(":")[0]

	moveObj["isPromotingMove"] = moveStr.includes("*")
	moveObj["isPawnDiagonal"] = moveStr.includes("/")
	moveObj["isAttackableMove"] = moveStr.includes("#")
	moveObj["isKillingMove"] = moveStr.includes("!")
	moveObj["isCastlingMove"] = moveStr.includes("$")
	moveObj["isEnPassant"] = moveStr.includes("^")
	moveObj["isFriendlyPiece"] = moveStr.includes("@")
	moveObj["killTarget"] = moveObj.isKillingMove ? moveStr.split("!")[1].slice(0, 2) : null
	moveObj["castleTarget"] = moveObj.isCastlingMove ? moveStr.split("$")[1].slice(0, 2) : null

	return moveObj
}