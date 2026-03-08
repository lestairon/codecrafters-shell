import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createCompleter } from "../app/completer";
import { setBuiltinNames } from "../app/resolver/helpers";
import type { Writable } from "../app/types";

function mockOut() {
	let out = "";
	return {
		outRef: () => out,
		writable: {
			write: (s: string) => {
				out += s;
				return true;
			},
		} satisfies Writable,
	};
}

let originalCwd: string;
let originalPath: string | undefined;
let tmp: string;

beforeEach(() => {
	originalCwd = process.cwd();
	originalPath = process.env.PATH;
	tmp = mkdtempSync(join(tmpdir(), "shell-complete-"));
	process.chdir(tmp);
	process.env.PATH = "";
});

afterEach(() => {
	process.chdir(originalCwd);
	if (originalPath === undefined) {
		delete process.env.PATH;
	} else {
		process.env.PATH = originalPath;
	}
	rmSync(tmp, { recursive: true, force: true });
});

describe("createCompleter", () => {
	test("no matches: rings bell and returns unchanged line", () => {
		setBuiltinNames(["echo"]);
		const { writable, outRef } = mockOut();
		const completer = createCompleter(writable);
		const [matches, line] = completer("zzz");
		expect(matches).toEqual([]);
		expect(line).toBe("zzz");
		expect(outRef()).toContain("\x07");
	});

	test("single match: returns ['echo '] and prefix line", () => {
		setBuiltinNames(["echo"]);
		const { writable } = mockOut();
		const completer = createCompleter(writable);
		const [matches, line] = completer("e");
		expect(matches).toEqual(["echo "]);
		expect(line).toBe("e");
	});

	test("partial completion via LCP", () => {
		setBuiltinNames(["foobar", "foobaz"]);
		const { writable } = mockOut();
		const completer = createCompleter(writable);
		const [matches, line] = completer("f");
		expect(matches).toEqual(["fooba"]);
		expect(line).toBe("f");
	});

	test("double-tab shows all matches", () => {
		setBuiltinNames(["echo", "exit"]);
		const { writable, outRef } = mockOut();
		const completer = createCompleter(writable);

		completer("e");

		const [matches, line] = completer("e");
		expect(matches).toEqual([]);
		expect(line).toBe("e");
		expect(outRef()).toContain("\necho  exit\n$ e");
	});

	test("unmatched quote rings bell and does not crash", () => {
		setBuiltinNames(["echo"]);
		const { writable, outRef } = mockOut();
		const completer = createCompleter(writable);
		const [matches, line] = completer("echo 'unterminated");
		expect(matches).toEqual([]);
		expect(line).toBe("echo 'unterminated");
		expect(outRef()).toContain("\x07");
	});

	test("trailing redirect rings bell and does not crash", () => {
		setBuiltinNames(["echo"]);
		const { writable, outRef } = mockOut();
		const completer = createCompleter(writable);
		const [matches, line] = completer("echo hello >");
		expect(matches).toEqual([]);
		expect(line).toBe("echo hello >");
		expect(outRef()).toContain("\x07");
	});

	test("completes external commands from PATH", () => {
		const binDir = join(tmp, "bin");
		mkdirSync(binDir);
		const script = join(binDir, "zztest_cmd");
		writeFileSync(script, "#!/bin/sh\n");
		chmodSync(script, 0o755);

		process.env.PATH = binDir;
		setBuiltinNames([]);

		const { writable } = mockOut();
		const completer = createCompleter(writable);
		const [matches, line] = completer("zztest");
		expect(matches).toEqual(["zztest_cmd "]);
		expect(line).toBe("zztest");
	});
});
