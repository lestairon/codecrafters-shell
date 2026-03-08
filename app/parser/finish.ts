import { append, emitToken } from "./state";
import type {
	ParseError,
	ParseResult,
	ParseState,
	ParseSuccess,
	Token,
} from "./types";
import { Quote } from "./types";

function ok(
	tokens: Token[],
	values: string[],
	singleQuotedIndices: Set<number>,
): ParseSuccess {
	return { ok: true, tokens, values, singleQuotedIndices };
}

function errUnmatchedQuote(): ParseError {
	return { ok: false, error: "unmatched_quote", message: "unmatched quote" };
}

function finish(state: ParseState): ParseResult {
	const normalized = state.escaped
		? append({ ...state, escaped: false }, "\\")
		: state;

	if (normalized.quoteContext) return errUnmatchedQuote();

	const stateAfter = normalized.tokenStarted
		? emitToken(normalized)
		: normalized;
	const tokens = [...stateAfter.tokens];
	const values = tokens.map((t) => t.value);
	const singleQuotedIndices = new Set(
		tokens
			.map((t, i) => (t.kind === "word" && t.quote === Quote.Single ? i : -1))
			.filter((i) => i >= 0),
	);

	return ok(tokens, values, singleQuotedIndices);
}

export default finish;
