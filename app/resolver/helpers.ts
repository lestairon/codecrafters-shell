import fs from "node:fs";
import path from "node:path";
import { cwd } from "node:process";
import type { ResolveCommandResult } from "../types";
import { CommandKind } from "../types";

let builtinNames: Set<string> = new Set();

function setBuiltinNames(names: string[]) {
	builtinNames = new Set(names);
}

function findBuiltIn(command: string): ResolveCommandResult | undefined {
	if (builtinNames.has(command)) {
		return { kind: CommandKind.BUILTIN, name: command };
	}
}

function findInCwd(command: string): ResolveCommandResult | undefined {
	const fullPath = path.join(cwd(), command);

	if (fs.existsSync(fullPath) && checkAccess(fullPath)) {
		return { kind: CommandKind.EXTERNAL, name: command, fullPath };
	}
}

function findInPath(command: string): ResolveCommandResult | undefined {
	const paths = process.env.PATH?.split(path.delimiter) ?? [];

	for (const dir of paths) {
		const fullPath = path.join(dir, command);

		if (fs.existsSync(fullPath) && checkAccess(fullPath)) {
			return { kind: CommandKind.EXTERNAL, name: command, fullPath };
		}
	}
}

function checkAccess(file: string): boolean {
	try {
		fs.accessSync(file, fs.constants.X_OK);
		return true;
	} catch {
		return false;
	}
}

export { setBuiltinNames, findBuiltIn, findInCwd, findInPath, checkAccess };
