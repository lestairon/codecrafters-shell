export enum Quote {
  Single = "single",
  Double = "double",
}

export type Token = {
  readonly value: string;
  readonly quote: Quote | null;
};

export type ParseState = {
  readonly tokens: readonly Token[];
  readonly current: string;
  readonly quoteContext: Quote | null;
  readonly tokenStarted: boolean;
  readonly tokenQuoteType: Quote | null;
  readonly escaped: boolean;
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
