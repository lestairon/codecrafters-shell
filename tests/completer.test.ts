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

	test("completes single filename in argument position", () => {
		setBuiltinNames(["cat"]);
		writeFileSync(join(tmp, "readme.md"), "");

		const { writable } = mockOut();
		const completer = createCompleter(writable);
		const [matches, line] = completer("cat read");
		expect(matches).toEqual(["readme.md "]);
		expect(line).toBe("read");
	});

	test("no filename matches rings bell", () => {
		setBuiltinNames(["cat"]);

		const { writable, outRef } = mockOut();
		const completer = createCompleter(writable);
		const [matches, line] = completer("cat zzz_no_file");
		expect(matches).toEqual([]);
		expect(line).toBe("cat zzz_no_file");
		expect(outRef()).toContain("\x07");
	});

	test("partial filename completion via LCP", () => {
		setBuiltinNames(["cat"]);
		writeFileSync(join(tmp, "readme.md"), "");
		writeFileSync(join(tmp, "readme.txt"), "");

		const { writable } = mockOut();
		const completer = createCompleter(writable);
		const [matches, line] = completer("cat read");
		expect(matches).toEqual(["readme."]);
		expect(line).toBe("read");
	});

	test("double-tab shows all matching filenames", () => {
		setBuiltinNames(["cat"]);
		writeFileSync(join(tmp, "readme.md"), "");
		writeFileSync(join(tmp, "readme.txt"), "");

		const { writable, outRef } = mockOut();
		const completer = createCompleter(writable);
		completer("cat readme.");
		const [matches, line] = completer("cat readme.");
		expect(matches).toEqual([]);
		expect(line).toBe("cat readme.");
		expect(outRef()).toContain("readme.md");
		expect(outRef()).toContain("readme.txt");
	});

	test("trailing space after command triggers filename completion", () => {
		setBuiltinNames(["cat"]);
		writeFileSync(join(tmp, "only_file.txt"), "");

		const { writable } = mockOut();
		const completer = createCompleter(writable);
		const [matches, line] = completer("cat ");
		expect(matches).toEqual(["only_file.txt "]);
		expect(line).toBe("");
	});

	test("nested file completion", () => {
		setBuiltinNames(["cat"]);
		mkdirSync(join(tmp, "dir"));
		writeFileSync(join(tmp, "dir", "file.txt"), "");

		const { writable } = mockOut();
		const completer = createCompleter(writable);
		const [matches, line] = completer("cat dir/");

		expect(matches).toEqual(["dir/file.txt "]);
		expect(line).toBe("dir/");
	});

	test("deeply nested file completion preserves full path", () => {
		setBuiltinNames(["wc"]);
		mkdirSync(join(tmp, "orange", "strawberry"), { recursive: true });
		writeFileSync(join(tmp, "orange", "strawberry", "pear.txt"), "");

		const { writable } = mockOut();
		const completer = createCompleter(writable);
		const [matches, line] = completer("wc orange/strawberry/");

		expect(matches).toEqual(["orange/strawberry/pear.txt "]);
		expect(line).toBe("orange/strawberry/");
	});

	test("search files in subdirectories", () => {
		setBuiltinNames(["cat"]);
		mkdirSync(join(tmp, "dir"), { recursive: true });
		writeFileSync(join(tmp, "dir", "file.txt"), "");
		writeFileSync(join(tmp, "dir", "file2.txt"), "");

		const { writable } = mockOut();
		const completer = createCompleter(writable);
		const [matches, line] = completer("cat file");

		expect(matches).toEqual(["dir/file.txt ", "dir/file2.txt "]);
		expect(line).toBe("dir/");
	});

	test("single directory match completes with trailing slash", () => {
		setBuiltinNames(["cat"]);
		mkdirSync(join(tmp, "mydir"));

		const { writable } = mockOut();
		const completer = createCompleter(writable);
		const [matches, line] = completer("cat mydir");

		expect(matches).toEqual(["mydir/"]);
		expect(line).toBe("mydir");
	});

	test("mixed files and dirs show correct suffixes", () => {
		setBuiltinNames(["cat"]);
		mkdirSync(join(tmp, "dir"));
		writeFileSync(join(tmp, "data.txt"), "");

		const { writable, outRef } = mockOut();
		const completer = createCompleter(writable);
		completer("cat d");
		const [matches, line] = completer("cat d");

		expect(matches).toEqual([]);
		expect(line).toBe("cat d");
		expect(outRef()).toContain("data.txt ");
		expect(outRef()).toContain("dir/");
	});

	test("directory in nested path completes with slash", () => {
		setBuiltinNames(["cat"]);
		mkdirSync(join(tmp, "foo", "bar"), { recursive: true });
		writeFileSync(join(tmp, "foo", "file.txt"), "");

		const { writable, outRef } = mockOut();
		const completer = createCompleter(writable);
		completer("cat foo/");
		const [matches, line] = completer("cat foo/");

		expect(matches).toEqual([]);
		expect(line).toBe("cat foo/");
		expect(outRef()).toContain("foo/bar/");
		expect(outRef()).toContain("foo/file.txt ");
	});

	test("multiple directories complete via LCP", () => {
		setBuiltinNames(["cat"]);
		mkdirSync(join(tmp, "dir1"));
		mkdirSync(join(tmp, "dir2"));

		const { writable } = mockOut();
		const completer = createCompleter(writable);
		const [matches, line] = completer("cat d");

		expect(matches).toEqual(["dir"]);
		expect(line).toBe("d");
	});

	test("trailing space with only directories lists both with slashes", () => {
		setBuiltinNames(["cat"]);
		mkdirSync(join(tmp, "alpha"));
		mkdirSync(join(tmp, "beta"));

		const { writable, outRef } = mockOut();
		const completer = createCompleter(writable);
		completer("cat ");
		const [matches, line] = completer("cat ");

		expect(matches).toEqual([]);
		expect(line).toBe("cat ");
		expect(outRef()).toContain("alpha/");
		expect(outRef()).toContain("beta/");
	});

	test("single subdirectory in nested path completes with slash", () => {
		setBuiltinNames(["cat"]);
		mkdirSync(join(tmp, "foo", "bar"), { recursive: true });

		const { writable } = mockOut();
		const completer = createCompleter(writable);
		const [matches, line] = completer("cat foo/");

		expect(matches).toEqual(["foo/bar/"]);
		expect(line).toBe("foo/");
	});
});
