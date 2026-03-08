import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { OperatorToken, Redirect } from "../app/parser/types";
import { TokenKind } from "../app/parser/types";
import { runCommand } from "../app/executer";
import { setBuiltinNames } from "../app/resolver/helpers";
import type { CommandIO, ResolveCommandResult } from "../app/types";
import { CommandKind } from "../app/types";

function mockIO() {
	let out = "";
	let err = "";
	return {
		io: {
			stdout: {
				write: (s: string) => {
					out += s;
					return true;
				},
			},
			stderr: {
				write: (s: string) => {
					err += s;
					return true;
				},
			},
		} satisfies CommandIO,
		get out() {
			return out;
		},
		get err() {
			return err;
		},
	};
}

function makeRedirect(op: OperatorToken["value"], target: string): Redirect {
	return {
		operator: { kind: TokenKind.OPERATOR, value: op },
		target: { kind: TokenKind.WORD, value: target, quote: null },
	};
}

const echoResult: ResolveCommandResult = {
	kind: CommandKind.BUILTIN,
	name: "echo",
};
const cdResult: ResolveCommandResult = {
	kind: CommandKind.BUILTIN,
	name: "cd",
};

let tmp: string;
const originalCwd = process.cwd();

beforeEach(() => {
	setBuiltinNames(["echo", "cd", "exit", "type", "pwd"]);
	tmp = mkdtempSync(join(tmpdir(), "shell-exec-"));
});

afterEach(() => {
	process.chdir(originalCwd);
	rmSync(tmp, { recursive: true, force: true });
});

describe("runCommand redirects", () => {
	test("> redirects stdout to file", () => {
		const m = mockIO();
		const file = join(tmp, "out.txt");
		runCommand(echoResult, ["hello", "world"], makeRedirect(">", file), m.io);

		expect(readFileSync(file, "utf-8")).toBe("hello world\n");
		expect(m.out).toBe("");
	});

	test(">> appends stdout to file", () => {
		const m = mockIO();
		const file = join(tmp, "append.txt");
		writeFileSync(file, "existing\n");

		runCommand(echoResult, ["appended"], makeRedirect(">>", file), m.io);

		expect(readFileSync(file, "utf-8")).toBe("existing\nappended\n");
	});

	test("2> redirects stderr to file", () => {
		const m = mockIO();
		const file = join(tmp, "err.txt");
		runCommand(
			cdResult,
			["/nonexistent_dir_xyz_12345"],
			makeRedirect("2>", file),
			m.io,
		);

		const content = readFileSync(file, "utf-8");
		expect(content).toContain("No such file or directory");
		expect(m.err).toBe("");
	});

	test("2>> appends stderr to file", () => {
		const m = mockIO();
		const file = join(tmp, "err-append.txt");
		writeFileSync(file, "prior error\n");

		runCommand(
			cdResult,
			["/nonexistent_dir_xyz_12345"],
			makeRedirect("2>>", file),
			m.io,
		);

		const content = readFileSync(file, "utf-8");
		expect(content).toContain("prior error");
		expect(content).toContain("No such file or directory");
	});
});

describe("runCommand io routing", () => {
	test("stdout redirect uses injected io for stderr", () => {
		const m = mockIO();
		const file = join(tmp, "io-stdout.txt");
		runCommand(
			cdResult,
			["/nonexistent_dir_xyz_12345"],
			makeRedirect(">", file),
			m.io,
		);

		expect(m.err).toContain("No such file or directory");
		expect(readFileSync(file, "utf-8")).toBe("");
	});

	test("stderr redirect uses injected io for stdout", () => {
		const m = mockIO();
		const file = join(tmp, "io-stderr.txt");
		runCommand(echoResult, ["hello"], makeRedirect("2>", file), m.io);

		expect(m.out).toBe("hello\n");
		expect(readFileSync(file, "utf-8")).toBe("");
	});

	test("no redirect passes io through", () => {
		const m = mockIO();
		runCommand(echoResult, ["direct"], undefined, m.io);
		expect(m.out).toBe("direct\n");
	});
});

describe("runCommand error handling", () => {
	test("openSync failure writes error to stderr", () => {
		const m = mockIO();
		const badPath = "/nonexistent_dir_xyz/file.txt";
		runCommand(echoResult, ["hello"], makeRedirect(">", badPath), m.io);

		expect(m.err).toContain(badPath);
		expect(m.out).toBe("");
	});
});
