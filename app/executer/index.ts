import { closeSync, openSync, writeSync } from "node:fs";
import type { Redirect } from "../parser/types";
import type { Command, CommandIO, ResolveCommandResult } from "../types";
import { CommandKind } from "../types";
import commands from "./builtins";
import { createExternalCommand } from "./external";

const DEFAULT_IO: CommandIO = {
	stdout: process.stdout,
	stderr: process.stderr,
};

export function getCommand(result: ResolveCommandResult): Command {
	if (result.kind === CommandKind.BUILTIN) {
		return commands.find((c) => c.name === result.name) as Command;
	}

	return createExternalCommand(result.name, result.fullPath);
}

export function runCommand(
	commandResult: ResolveCommandResult,
	args: string[],
	redirect?: Redirect,
) {
	const command = getCommand(commandResult);

	if (!redirect) {
		command.run(args, DEFAULT_IO);
		return;
	}

	const fd = openSync(redirect.target.value, "w");
	try {
		const io: CommandIO = {
			stdout: {
				write: (data: string) => {
					writeSync(fd, data);
					return true;
				},
			},
			stderr: process.stderr,
		};

		command.run(args, io);
	} finally {
		closeSync(fd);
	}
}
