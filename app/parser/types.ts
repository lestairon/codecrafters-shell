export enum Quote {
	Single = "single",
	Double = "double",
}

export enum TokenKind {
	WORD = "word",
	OPERATOR = "operator",
}

export type WordToken = {
	readonly kind: TokenKind.WORD;
	readonly value: string;
	readonly quote: Quote | null;
};

export type OperatorToken = {
	readonly kind: TokenKind.OPERATOR;
	readonly value: ">";
};

export type Token = WordToken | OperatorToken;

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

export type Redirect = {
	readonly operator: OperatorToken;
	readonly target: WordToken;
};

export type CommandLine = {
	readonly command: WordToken;
	readonly args: readonly string[];
	readonly redirect?: Redirect;
};
