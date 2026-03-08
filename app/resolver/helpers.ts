import fs from "node:fs";
import path from "node:path";
import { cwd } from "node:process";
import type { ResolveCommandResult } from "../types";
import { CommandKind } from "../types";

let builtinNames: Set<string> = new Set();

function setBuiltinNames(names: string[]) {
	builtinNames = new Set(names);
}

function findBuiltIn(command: string): ResolveCommandResult[] {
	return [...builtinNames]
		.filter((name) => name.startsWith(command))
		.map((name) => ({ kind: CommandKind.BUILTIN, name }));
}

function readDirSafe(dir: string): string[] {
	try {
		return fs.readdirSync(dir);
	} catch {
		return [];
	}
}

function findMatchesIn(
	dir: string,
	prefix: string,
	executableOnly = true,
): ResolveCommandResult[] {
	return readDirSafe(dir)
		.filter((name) => name.startsWith(prefix))
		.filter((name) => !executableOnly || checkAccess(path.join(dir, name)))
		.map((name) => ({
			kind: CommandKind.EXTERNAL,
			name,
			fullPath: path.join(dir, name),
		}));
}

function findInCwd(command: string): ResolveCommandResult[] {
	return findMatchesIn(cwd(), command, false);
}

function findInPath(command: string): ResolveCommandResult[] {
	const paths = process.env.PATH?.split(path.delimiter) ?? [];

	return paths.flatMap((dir) => findMatchesIn(dir, command));
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
