import { spawnSync } from "node:child_process";
import path from "node:path";
import type { Command, CommandIO } from "../types";

export function createExternalCommand(name: string, fullPath: string): Command {
	return {
		name,
		description: `External command: ${name}`,
		run: (args: string[], io: CommandIO) => {
			const result = spawnSync(name, args, {
				stdio: "pipe",
				env: {
					...process.env,
					PATH: `${path.dirname(fullPath)}:${process.env.PATH}`,
				},
			});
			if (result.stdout) io.stdout.write(result.stdout.toString());
			if (result.stderr) io.stderr.write(result.stderr.toString());
		},
	};
}
