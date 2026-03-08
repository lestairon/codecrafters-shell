import { parseLine, structureLine } from "./parser";
import { searchCommands } from "./resolver";
import type { Writable } from "./types";

type CompletionResult = [string[], string];

enum CompletionActionKind {
	NONE = "none",
	SINGLE = "single",
	SHOW_ALL = "showAll",
}

type CompletionAction =
	| { kind: CompletionActionKind.NONE; bell: boolean }
	| { kind: CompletionActionKind.SINGLE; name: string; prefix: string }
	| { kind: CompletionActionKind.SHOW_ALL; line: string; names: string[] };

function determineCompletion(
	line: string,
	lastTab: string | null,
): [CompletionAction, string | null] {
	const result = parseLine(line);
	if (!result.ok)
		return [{ kind: CompletionActionKind.NONE, bell: true }, lastTab];

	const commandLine = structureLine(result.tokens);
	if (!commandLine.command)
		return [{ kind: CompletionActionKind.NONE, bell: true }, lastTab];

	const prefix = commandLine.command.value;
	const matches = searchCommands(prefix);
	const uniqueNames = [...new Set(matches.map((c) => c.name))].sort();

	if (!uniqueNames.length)
		return [{ kind: CompletionActionKind.NONE, bell: true }, null];

	if (uniqueNames.length === 1)
		return [
			{ kind: CompletionActionKind.SINGLE, name: uniqueNames[0], prefix },
			null,
		];

	if (lastTab === line)
		return [
			{ kind: CompletionActionKind.SHOW_ALL, line, names: uniqueNames },
			null,
		];

	return [{ kind: CompletionActionKind.NONE, bell: true }, line];
}

function applyCompletionAction(
	action: CompletionAction,
	line: string,
	out: Writable,
): CompletionResult {
	switch (action.kind) {
		case CompletionActionKind.NONE:
			if (action.bell) out.write("\x07");
			return [[], line];
		case CompletionActionKind.SINGLE:
			return [[`${action.name} `], action.prefix];
		case CompletionActionKind.SHOW_ALL:
			out.write(`\n${action.names.join("  ")}\n$ ${action.line}`);
			return [[], line];
	}
}

export function createCompleter(
	out: Writable,
): (line: string) => CompletionResult {
	let lastTab: string | null = null;

	return (line: string): CompletionResult => {
		const [action, nextTab] = determineCompletion(line, lastTab);
		lastTab = nextTab;
		return applyCompletionAction(action, line, out);
	};
}
