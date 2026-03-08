import { append, emitOperator, emitToken } from "./state";
import type { ParseState } from "./types";
import { Quote } from "./types";

function handleQuote(state: ParseState, kind: Quote, ch: string): ParseState {
	if (!state.quoteContext) {
		return {
			...state,
			tokenStarted: true,
			quoteContext: kind,
			tokenQuoteType:
				kind === Quote.Single
					? Quote.Single
					: (state.tokenQuoteType ?? Quote.Double),
		};
	}

	if (state.quoteContext === kind) {
		return { ...state, quoteContext: null };
	}

	return append(state, ch);
}

function isEscapableInDoubleQuotes(ch: string): boolean {
	return ch === "\\" || ch === '"' || ch === "$" || ch === "`";
}

function onChar(state: ParseState, ch: string): ParseState {
	if (state.escaped) {
		let next = { ...state, escaped: false };

		if (state.quoteContext === Quote.Double && !isEscapableInDoubleQuotes(ch)) {
			next = append(next, "\\");
		}

		return append(next, ch);
	}

	switch (ch) {
		case "'": {
			return handleQuote(state, Quote.Single, ch);
		}
		case '"': {
			return handleQuote(state, Quote.Double, ch);
		}
		case " ": {
			if (state.quoteContext) return append(state, ch);
			if (!state.tokenStarted) return state;

			return emitToken(state);
		}
		case "\\": {
			if (state.quoteContext === Quote.Single) return append(state, ch);

			return { ...state, tokenStarted: true, escaped: true };
		}
		case ">": {
			if (state.quoteContext) return append(state, ch);
			let next = state;

			if (state.tokenStarted) {
				next = emitToken(state);
			}

			return emitOperator(next, ">");
		}
		default: {
			return append(state, ch);
		}
	}
}

export { onChar, isEscapableInDoubleQuotes, handleQuote };
