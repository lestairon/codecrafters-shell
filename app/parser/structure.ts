import type { CommandLine, Redirect, Token, WordToken } from "./types";
import { TokenKind } from "./types";

export function structureLine(tokens: readonly Token[]): CommandLine {
	const redirectIndex = tokens.findIndex((t) => t.kind === TokenKind.OPERATOR);

	if (redirectIndex === -1) {
		const [command, ...args] = tokens;
		const values = args.map((t) => t.value);
		return { command: command as WordToken, args: values };
	}

	const operator = tokens[redirectIndex];
	if (operator.kind !== TokenKind.OPERATOR)
		throw new Error("unexpected token kind");

	const before = tokens.slice(0, redirectIndex);
	const after = tokens.slice(redirectIndex + 1);

	if (!after.length) {
		throw new Error("syntax error: missing redirect target");
	}

	const target = after[0];
	if (target.kind !== TokenKind.WORD) {
		throw new Error("syntax error: expected filename after redirect operator");
	}

	// const values = before.map((t) => t.value);
	const [command, ...args] = before;

	const redirect: Redirect = { operator, target };

	return {
		command: command as WordToken,
		args: args.map((t) => t.value),
		redirect,
	};
}
