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
	io: CommandIO = DEFAULT_IO,
) {
	const command = getCommand(commandResult);

	if (!redirect) {
		command.run(args, io);
		return;
	}

	let fd: number;
	try {
		fd = openSync(
			redirect.target.value,
			redirect.operator.value.includes(">>") ? "a" : "w",
		);
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		io.stderr.write(`${redirect.target.value}: ${msg}\n`);
		return;
	}

	try {
		const fileWritable = {
			write: (data: string) => {
				writeSync(fd, data);
				return true;
			},
		};
		const redirectedIO: CommandIO = {
			stdout: redirect.operator.value.startsWith("2")
				? io.stdout
				: fileWritable,
			stderr: redirect.operator.value.startsWith("2")
				? fileWritable
				: io.stderr,
		};

		command.run(args, redirectedIO);
	} finally {
		closeSync(fd);
	}
}
