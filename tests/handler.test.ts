import { beforeEach, describe, expect, test } from "bun:test";
import { handleLine } from "../app/handler";
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

beforeEach(() => {
	setBuiltinNames(["echo", "cd", "exit", "type", "pwd"]);
});

describe("handleLine", () => {
	test("runs echo and writes to stdout", () => {
		const m = mockIO();
		let prompted = false;
		handleLine("echo hello world", () => { prompted = true; }, m.io);
		expect(m.out).toBe("hello world\n");
		expect(prompted).toBe(true);
	});

	test("reports unknown command on stderr", () => {
		const m = mockIO();
		handleLine("nonexistent_cmd_xyz", () => {}, m.io);
		expect(m.err).toContain("command not found");
	});

	test("reports parse error on stderr", () => {
		const m = mockIO();
		handleLine("echo 'unterminated", () => {}, m.io);
		expect(m.err).toContain("unmatched quote");
	});

	test("calls prompt for empty input", () => {
		const m = mockIO();
		let prompted = false;
		handleLine("", () => { prompted = true; }, m.io);
		expect(prompted).toBe(true);
		expect(m.out).toBe("");
		expect(m.err).toBe("");
	});

	test("always calls prompt", () => {
		const m = mockIO();
		let count = 0;
		const prompt = () => { count++; };

		handleLine("echo hi", prompt, m.io);
		handleLine("bad_cmd", prompt, m.io);
		handleLine("", prompt, m.io);

		expect(count).toBe(3);
	});

	test("malformed redirect does not crash", () => {
		const m = mockIO();
		let prompted = false;
		handleLine("echo hello >", () => { prompted = true; }, m.io);
		expect(m.err).toContain("missing redirect target");
		expect(prompted).toBe(true);
	});

	test("trailing >> reports syntax error", () => {
		const m = mockIO();
		handleLine("echo hello >>", () => {}, m.io);
		expect(m.err).toContain("missing redirect target");
	});

	test("cd with no args does not print 'undefined' on error", () => {
		const m = mockIO();
		const origHome = process.env.HOME;
		process.env.HOME = "/nonexistent_path_for_test";
		try {
			handleLine("cd", () => {}, m.io);
			expect(m.err).not.toContain("undefined");
			expect(m.err).toContain("/nonexistent_path_for_test");
		} finally {
			process.env.HOME = origHome;
		}
	});
});
