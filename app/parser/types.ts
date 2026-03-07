export type ParseState = {
  readonly tokens: readonly Token[];
  readonly current: string;
  readonly inSingleQuote: boolean;
  readonly tokenStarted: boolean;
  readonly hasSingleQuotedSegment: boolean;
};

export type Token = {
  readonly value: string;
  readonly singleQuoted: boolean;
};

export type ParseSuccess = {
  readonly ok: true;
  readonly tokens: readonly Token[];
  readonly values: readonly string[];
  readonly singleQuotedIndices: ReadonlySet<number>;
};

export type ParseError = {
  readonly ok: false;
  readonly error: "unmatched_quote";
  readonly message: string;
};

export type ParseResult = ParseSuccess | ParseError;
