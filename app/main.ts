import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline";
import { runCommand } from "./executer";
import { builtinNames } from "./executer/builtins";
import { parseLine, structureLine } from "./parser";
import resolveCommand, { searchCommands, setBuiltinNames } from "./resolver";

setBuiltinNames(builtinNames);

const rl = createInterface({
	input: stdin,
	output: stdout,
	prompt: "$ ",
	completer: (line: string) => {
		const result = parseLine(line);
		if (!result.ok) {
			stdout.write("\x07");
			return [[], line];
		}

		const { tokens } = result;
		const commandLine = structureLine(tokens);
		if (!commandLine.command) {
			stdout.write("\x07");
			return [[], line];
		}

		const prefix = commandLine.command.value;
		const matches = searchCommands(prefix).map((c) => `${c.name} `);

		if (!matches.length) {
			stdout.write("\x07");
		}

		return [matches, prefix];
	},
});

rl.prompt();

rl.on("line", (line: string) => {
	const result = parseLine(line);
	if (!result.ok) {
		console.error(result.message);
		rl.prompt();
		return;
	}

	const { tokens } = result;
	const commandLine = structureLine(tokens);

	if (!commandLine.command) {
		rl.prompt();
		return;
	}

	const commandObj = resolveCommand(commandLine.command.value);

	if (!commandObj) {
		console.error(`${line}: command not found`);
	} else {
		runCommand(commandObj, [...commandLine.args], commandLine.redirect);
	}

	rl.prompt();
});

export default rl;
