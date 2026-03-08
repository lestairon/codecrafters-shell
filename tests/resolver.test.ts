import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync, chmodSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import resolveCommand, {
	resolveHomeDir,
	searchCommands,
} from "../app/resolver";
import { setBuiltinNames } from "../app/resolver/helpers";
import { CommandKind } from "../app/types";

describe("resolveHomeDir", () => {
	const originalHome = process.env.HOME;

	afterEach(() => {
		process.env.HOME = originalHome;
	});

	test("expands tilde to HOME", () => {
		process.env.HOME = "/home/testuser";
		expect(resolveHomeDir("~/documents")).toBe("/home/testuser/documents");
	});

	test("expands bare tilde", () => {
		process.env.HOME = "/home/testuser";
		expect(resolveHomeDir("~")).toBe("/home/testuser");
	});

	test("returns non-tilde paths unchanged", () => {
		expect(resolveHomeDir("/tmp/foo")).toBe("/tmp/foo");
		expect(resolveHomeDir("relative/path")).toBe("relative/path");
	});

	test("handles empty HOME", () => {
		process.env.HOME = "";
		expect(resolveHomeDir("~/foo")).toBe("/foo");
	});
});

describe("resolveCommand", () => {
	beforeEach(() => {
		setBuiltinNames(["echo", "cd", "exit", "type", "pwd"]);
	});

	test("resolves a known builtin", () => {
		const result = resolveCommand("echo");
		expect(result).toBeDefined();
		expect(result?.kind).toBe(CommandKind.BUILTIN);
		expect(result?.name).toBe("echo");
	});

	test("returns undefined for unknown command", () => {
		const result = resolveCommand("nonexistent_command_xyz_12345");
		expect(result).toBeUndefined();
	});

	test("resolves all builtins", () => {
		for (const name of ["echo", "cd", "exit", "type", "pwd"]) {
			const result = resolveCommand(name);
			expect(result).toBeDefined();
			expect(result?.kind).toBe(CommandKind.BUILTIN);
		}
	});

	test("resolves EXTERNAL when PATH contains an executable", () => {
		const originalPath = process.env.PATH;
		const dir = mkdtempSync(join(tmpdir(), "shell-resolve-"));
		const name = `zz_testcmd_${Date.now()}`;
		const full = join(dir, name);

		try {
			writeFileSync(full, "#!/usr/bin/env sh\nexit 0\n");
			chmodSync(full, 0o755);
			process.env.PATH = `${dir}:${originalPath ?? ""}`;
			setBuiltinNames(["echo", "cd", "exit", "type", "pwd"]);

			const result = resolveCommand(name);
			expect(result).toBeDefined();
			expect(result?.kind).toBe(CommandKind.EXTERNAL);
			if (result?.kind === CommandKind.EXTERNAL) {
				expect(result.fullPath).toBe(full);
				expect(result.name).toBe(name);
			}
		} finally {
			if (originalPath === undefined) {
				delete process.env.PATH;
			} else {
				process.env.PATH = originalPath;
			}
			rmSync(dir, { recursive: true, force: true });
		}
	});
});

describe("searchCommands", () => {
	beforeEach(() => {
		setBuiltinNames(["echo", "exit", "cd", "type", "pwd"]);
	});

	test("finds builtins by prefix", () => {
		const results = searchCommands("e");
		const builtins = results.filter((r) => r.kind === CommandKind.BUILTIN);
		const names = builtins.map((r) => r.name);
		expect(names).toContain("echo");
		expect(names).toContain("exit");
	});

	test("returns empty for non-matching prefix", () => {
		const results = searchCommands("zzz_nonexistent_");
		expect(results).toEqual([]);
	});

	test("finds executables in temp PATH by prefix", () => {
		const originalPath = process.env.PATH;
		const dir = mkdtempSync(join(tmpdir(), "shell-search-"));

		try {
			for (const name of ["zzfoo", "zzbar"]) {
				const full = join(dir, name);
				writeFileSync(full, "#!/bin/sh\n");
				chmodSync(full, 0o755);
			}
			process.env.PATH = dir;
			setBuiltinNames([]);

			const results = searchCommands("zz");
			const names = results.map((r) => r.name).sort();
			expect(names).toEqual(["zzbar", "zzfoo"]);
			expect(results.every((r) => r.kind === CommandKind.EXTERNAL)).toBe(true);
		} finally {
			if (originalPath === undefined) {
				delete process.env.PATH;
			} else {
				process.env.PATH = originalPath;
			}
			rmSync(dir, { recursive: true, force: true });
		}
	});
});
