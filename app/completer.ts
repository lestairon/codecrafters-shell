import { readdirSync } from "node:fs";
import path from "node:path";
import { parseLine, structureLine } from "./parser";
import type { CommandLine } from "./parser/types";
import { searchCommands } from "./resolver";
import type { Writable } from "./types";

type CompletionResult = [string[], string];

function sharedPrefix(a: string, b: string): string {
	const end = [...a].findIndex((ch, i) => ch !== b[i]);
	return end === -1 ? a : a.slice(0, end);
}

function longestCommonPrefix(names: string[]): string {
	if (!names.length) return "";
	return names.reduce(sharedPrefix);
}

function searchFiles(prefix: string, dirPath: string): string[] {
	try {
		const resolvedDir = path.isAbsolute(dirPath)
			? dirPath
			: path.join(process.cwd(), dirPath);
		return readdirSync(resolvedDir)
			.sort()
			.filter((name) => name.startsWith(prefix))
			.map((name) => path.join(dirPath, name));
	} catch {
		return [];
	}
}

function searchFilesRecursively(prefix: string): string[] {
	const results: string[] = [];

	function walk(relDir: string): void {
		const absDir = relDir ? path.join(process.cwd(), relDir) : process.cwd();
		for (const entry of readdirSync(absDir, { withFileTypes: true }).sort(
			(a, b) => a.name.localeCompare(b.name),
		)) {
			const rel = relDir ? `${relDir}/${entry.name}` : entry.name;
			if (entry.isDirectory()) walk(rel);
			else if (entry.name.startsWith(prefix)) results.push(rel);
		}
	}

	try {
		walk("");
		return results.sort();
	} catch {
		return [];
	}
}

function bell(out: Writable): void {
	out.write("\x07");
}

function resolveCompletion(
	names: string[],
	prefix: string,
	line: string,
	lastTab: string | null,
	out: Writable,
): [CompletionResult, string | null] {
	if (!names.length) {
		bell(out);
		return [[[], line], null];
	}

	if (names.length === 1) return [[[`${names[0]} `], prefix], null];

	const lcp = longestCommonPrefix(names);
	if (lcp.length > prefix.length) return [[[lcp], prefix], null];

	if (lastTab === line) {
		out.write(`\n${names.join("  ")}\n$ ${line}`);
		return [[[], line], null];
	}

	bell(out);
	return [[[], line], line];
}

function completeFilename(
	line: string,
	filename: string,
	lastTab: string | null,
	out: Writable,
): [CompletionResult, string | null] {
	const trailingSlash = filename.endsWith("/") || filename.endsWith(path.sep);
	const { dir, base } = path.parse(filename);
	const searchDir = trailingSlash ? filename.slice(0, -1) || "." : dir || ".";
	const prefix = trailingSlash ? "" : base;

	const direct = searchFiles(prefix, searchDir);
	if (direct.length)
		return resolveCompletion(direct, filename, line, lastTab, out);

	if (!trailingSlash && searchDir === "." && prefix) {
		const recursive = searchFilesRecursively(prefix);
		const parentDirs = new Set(recursive.map((m) => path.posix.dirname(m)));
		if (parentDirs.size === 1) {
			const parentDir = [...parentDirs][0];
			if (parentDir !== ".")
				return [[recursive.map((n) => `${n} `), `${parentDir}/`], null];
		}
	}

	bell(out);
	return [[[], line], null];
}

export function createCompleter(
	out: Writable,
): (line: string) => CompletionResult {
	let lastTab: string | null = null;

	return (line: string): CompletionResult => {
		const parsed = parseLine(line);
		if (!parsed.ok) {
			bell(out);
			return [[], line];
		}

		let commandLine: CommandLine;
		try {
			commandLine = structureLine(parsed.tokens);
		} catch {
			bell(out);
			return [[], line];
		}

		if (!commandLine.command) {
			bell(out);
			return [[], line];
		}

		const trimmed = line.trimStart();
		const lastSpaceIdx = trimmed.lastIndexOf(" ");

		let result: CompletionResult;
		let nextTab: string | null;

		if (lastSpaceIdx !== -1) {
			const filename = trimmed.slice(lastSpaceIdx + 1);
			[result, nextTab] = completeFilename(line, filename, lastTab, out);
		} else {
			const prefix = commandLine.command.value;
			const commands = searchCommands(prefix);
			const names = [...new Set(commands.map((c) => c.name))].sort();
			[result, nextTab] = resolveCompletion(names, prefix, line, lastTab, out);
		}

		lastTab = nextTab;
		return result;
	};
}
