import type { Token, ParseError, ParseResult, ParseState, ParseSuccess } from "./types";
import { Quote } from "./types";

function ok(tokens: Token[], values: string[], singleQuotedIndices: Set<number>): ParseSuccess {
  return { ok: true, tokens, values, singleQuotedIndices };
}

function errUnmatchedQuote(): ParseError {
  return { ok: false, error: "unmatched_quote", message: "unmatched quote" };
}

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
  const token: Token = { value: state.current, quote: state.tokenQuoteType };

  return {
    ...state,
    tokens: [...state.tokens, token],
    current: "",
    tokenStarted: false,
    tokenQuoteType: null,
  };
}

function handleQuote(state: ParseState, kind: Quote, ch: string): ParseState {
  if (!state.quoteContext) {
    return {
      ...state,
      tokenStarted: true,
      quoteContext: kind,
      tokenQuoteType:
        kind === Quote.Single ? Quote.Single : (state.tokenQuoteType ?? Quote.Double),
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
  if (ch === "'") return handleQuote(state, Quote.Single, ch);
  if (ch === '"') return handleQuote(state, Quote.Double, ch);

  if (ch === " ") {
    if (state.quoteContext) return append(state, ch);
    if (!state.tokenStarted) return state;

    return emitToken(state);
  }

  if (ch === "\\") {
    if (state.quoteContext === Quote.Single) return append(state, ch);

    return { ...state, tokenStarted: true, escaped: true };
  }

  return append(state, ch);
}

function finish(state: ParseState): ParseResult {
  const normalized = state.escaped ? append({ ...state, escaped: false }, "\\") : state;

  if (normalized.quoteContext) return errUnmatchedQuote();

  const stateAfter = normalized.tokenStarted
    ? emitToken(normalized)
    : normalized;
  const tokens = [...stateAfter.tokens];
  const values = tokens.map((t) => t.value);
  const singleQuotedIndices = new Set(
    tokens.map((t, i) => (t.quote === Quote.Single ? i : -1)).filter((i) => i >= 0)
  );

  return ok(tokens, values, singleQuotedIndices);
}

export function parseLine(line: string): ParseResult {
  const state = [...line].reduce(onChar, INIT);
  return finish(state);
}

export function hasUnclosedSingleQuote(line: string): boolean {
  const result = parseLine(line);
  return !result.ok && result.error === "unmatched_quote";
}
