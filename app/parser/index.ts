import type { Token, ParseError, ParseResult, ParseState, ParseSuccess } from "./types"; 

function success(
  tokens: Token[],
  values: string[],
  singleQuotedIndices: Set<number>
): ParseSuccess {
  return { ok: true, tokens, values, singleQuotedIndices };
}

function unmatchedQuote(): ParseError {
  return {
    ok: false,
    error: "unmatched_quote",
    message: "unmatched quote",
  };
}

const initial: ParseState = {
  tokens: [],
  current: "",
  inSingleQuote: false,
  tokenStarted: false,
  hasSingleQuotedSegment: false,
};

function onChar(state: ParseState, ch: string): ParseState {
  switch (ch) {
    case "'":
    case '"': {
      return {
        ...state,
        tokenStarted: true,
        hasSingleQuotedSegment: true,
        inSingleQuote: !state.inSingleQuote,
      };
    }
    case " ": {
      if (state.inSingleQuote) {
        return { ...state, tokenStarted: true, current: state.current + ch };
      }
      if (!state.tokenStarted) return state;

      return {
        tokens: [
          ...state.tokens,
          { value: state.current, singleQuoted: state.hasSingleQuotedSegment },
        ],
        current: "",
        inSingleQuote: false,
        tokenStarted: false,
        hasSingleQuotedSegment: false,
      };
    }
    default: {
      return {
        ...state,
        tokenStarted: true,
        current: state.current + ch,
      };
    }
  }
}

function finish(state: ParseState): ParseResult {
  if (state.inSingleQuote) {
    return unmatchedQuote();
  }

  const tokens: Token[] = state.tokenStarted
    ? [
        ...state.tokens,
        { value: state.current, singleQuoted: state.hasSingleQuotedSegment },
      ]
    : [...state.tokens];
  const values = tokens.map((t) => t.value);
  const singleQuotedIndices = new Set(
    tokens.map((t, i) => (t.singleQuoted ? i : -1)).filter((i) => i >= 0)
  );

  return success(tokens, values, singleQuotedIndices);
}

export function parseLine(line: string): ParseResult {
  const state = [...line].reduce<ParseState>(onChar, initial);
  return finish(state);
}

export function hasUnclosedSingleQuote(line: string): boolean {
  const result = parseLine(line);
  return !result.ok && result.error === "unmatched_quote";
}
