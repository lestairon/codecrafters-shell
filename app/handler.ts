import { runCommand } from "./executer";
import { parseLine, structureLine } from "./parser";
import type { CommandLine } from "./parser/types";
import resolveCommand from "./resolver";
import type { CommandIO } from "./types";

const DEFAULT_IO: CommandIO = {
	stdout: process.stdout,
	stderr: process.stderr,
};

export function handleLine(
	line: string,
	prompt: () => void,
	io: CommandIO = DEFAULT_IO,
): void {
	const result = parseLine(line);
	if (!result.ok) {
		io.stderr.write(`${result.message}\n`);
		prompt();
		return;
	}

	let commandLine: CommandLine;
	try {
		commandLine = structureLine(result.tokens);
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		io.stderr.write(`${msg}\n`);
		prompt();
		return;
	}

	if (!commandLine.command) {
		prompt();
		return;
	}

	const resolved = resolveCommand(commandLine.command.value);
	if (!resolved) {
		io.stderr.write(`${line}: command not found\n`);
	} else {
		runCommand(resolved, [...commandLine.args], commandLine.redirect, io);
	}

	prompt();
}
