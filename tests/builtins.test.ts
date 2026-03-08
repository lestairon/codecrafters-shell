import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import commands, { setShutdown } from "../app/executer/builtins";
import { setBuiltinNames } from "../app/resolver/helpers";
import type { CommandIO } from "../app/types";

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

function getBuiltin(name: string) {
	const cmd = commands.find((c) => c.name === name);
	if (!cmd) throw new Error(`Builtin "${name}" not found`);
	return cmd;
}

beforeEach(() => {
	setBuiltinNames(["echo", "cd", "exit", "type", "pwd"]);
});

describe("echo", () => {
	test("writes args joined by spaces", () => {
		const m = mockIO();
		getBuiltin("echo").run(["hello", "world"], m.io);
		expect(m.out).toBe("hello world\n");
	});

	test("writes newline for no args", () => {
		const m = mockIO();
		getBuiltin("echo").run([], m.io);
		expect(m.out).toBe("\n");
	});

	test("writes single arg", () => {
		const m = mockIO();
		getBuiltin("echo").run(["hello"], m.io);
		expect(m.out).toBe("hello\n");
	});
});

describe("pwd", () => {
	test("writes current working directory", () => {
		const m = mockIO();
		getBuiltin("pwd").run([], m.io);
		expect(m.out).toBe(`${process.cwd()}\n`);
	});
});

describe("type", () => {
	test("identifies a builtin command", () => {
		const m = mockIO();
		getBuiltin("type").run(["echo"], m.io);
		expect(m.out).toBe("echo is a shell builtin\n");
	});

	test("reports unknown command", () => {
		const m = mockIO();
		getBuiltin("type").run(["nonexistent_xyz_12345"], m.io);
		expect(m.out).toBe("nonexistent_xyz_12345: not found\n");
	});

	test("prints error when no args", () => {
		const m = mockIO();
		getBuiltin("type").run([], m.io);
		expect(m.err).toBe("type: missing argument\n");
		expect(m.out).toBe("");
	});
});

describe("cd", () => {
	const originalCwd = process.cwd();

	afterEach(() => {
		process.chdir(originalCwd);
	});

	test("changes to valid directory", () => {
		const m = mockIO();
		getBuiltin("cd").run(["/tmp"], m.io);
		expect(process.cwd()).toBe("/tmp");
		expect(m.err).toBe("");
	});

	test("reports error for invalid directory", () => {
		const m = mockIO();
		getBuiltin("cd").run(["/nonexistent_dir_xyz_12345"], m.io);
		expect(m.err).toContain("No such file or directory");
	});

	test("changes to HOME when no args", () => {
		const m = mockIO();
		const originalHome = process.env.HOME;
		process.env.HOME = "/tmp";

		try {
			getBuiltin("cd").run([], m.io);
			expect(process.cwd()).toBe("/tmp");
			expect(m.err).toBe("");
		} finally {
			process.env.HOME = originalHome;
		}
	});
});

describe("exit", () => {
	test("calls the injected shutdown callback", () => {
		let called = false;
		setShutdown(() => {
			called = true;
		});

		getBuiltin("exit").run([], mockIO().io);
		expect(called).toBe(true);
	});
});
