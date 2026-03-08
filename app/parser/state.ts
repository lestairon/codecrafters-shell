import type { OperatorToken, ParseState, WordToken } from "./types";
import { TokenKind } from "./types";

const INIT: ParseState = {
	tokens: [],
	current: "",
	quoteContext: null,
	tokenStarted: false,
	tokenQuoteType: null,
	escaped: false,
};

function append(state: ParseState, ch: string): ParseState {
	return { ...state, tokenStarted: true, current: state.current + ch };
}

function emitToken(state: ParseState): ParseState {
	const token: WordToken = {
		kind: TokenKind.WORD,
		value: state.current,
		quote: state.tokenQuoteType,
	};

	return {
		...state,
		tokens: [...state.tokens, token],
		current: "",
		tokenStarted: false,
		tokenQuoteType: null,
	};
}

function emitOperator(
	state: ParseState,
	op: OperatorToken["value"],
): ParseState {
	const token: OperatorToken = { kind: TokenKind.OPERATOR, value: op };

	return {
		...state,
		tokens: [...state.tokens, token],
    current: "",
    tokenStarted: false,
    tokenQuoteType: null,
	};
}

export { INIT, append, emitToken, emitOperator };
