import path from "node:path";
import { chdir } from "node:process";
import resolveCommand, { resolveHomeDir } from "../resolver";
import { checkAccess } from "../resolver/helpers";
import type { Command, CommandIO } from "../types";
import { CommandKind } from "../types";

let shutdown: () => void = () => {};

export function setShutdown(fn: () => void) {
	shutdown = fn;
}

const commands: Command[] = [
	{ name: "exit", description: "Exit the shell", run: runExit },
	{
		name: "echo",
		description: "Echo the arguments",
		run: (args, io) => io.stdout.write(`${args.join(" ")}\n`),
	},
	{ name: "type", description: "Type the arguments", run: runType },
	{
		name: "pwd",
		description: "Prints working directory",
		run: (_, io) => io.stdout.write(`${process.cwd()}\n`),
	},
	{ name: "cd", description: "Changes the current directory", run: runCd },
];

function runType(args: string[], io: CommandIO) {
	if (!args.length) {
		io.stderr.write("type: missing argument\n");
		return;
	}

	const [cmd] = args;
	const result = resolveCommand(cmd);

	if (!result) {
		io.stdout.write(`${cmd}: not found\n`);
		return;
	}

	switch (result.kind) {
		case CommandKind.BUILTIN:
			io.stdout.write(`${cmd} is a shell builtin\n`);
			break;
		case CommandKind.EXTERNAL:
			io.stdout.write(`${cmd} is ${result.fullPath}\n`);
			break;
	}
}

function runExit() {
	shutdown();
}

function runCd([arg]: string[], io: CommandIO) {
	const resolvedPath = resolveHomeDir(arg ?? "~");
	const normalizedPath = path.normalize(resolvedPath);

	if (!checkAccess(normalizedPath)) {
		io.stderr.write(`cd: ${resolvedPath}: No such file or directory\n`);

		return;
	}

	chdir(normalizedPath);
}

export const builtinNames = commands.map((c) => c.name);

export default commands;
