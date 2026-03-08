import { runCommand } from "./executer";
import { parseLine, structureLine } from "./parser";
import resolveCommand from "./resolver";

export function handleLine(line: string, prompt: () => void): void {
	const result = parseLine(line);
	if (!result.ok) {
		console.error(result.message);
		prompt();
		return;
	}

	const commandLine = structureLine(result.tokens);
	if (!commandLine.command) {
		prompt();
		return;
	}

	const resolved = resolveCommand(commandLine.command.value);
	if (!resolved) {
		console.error(`${line}: command not found`);
	} else {
		runCommand(resolved, [...commandLine.args], commandLine.redirect);
	}

	prompt();
}
