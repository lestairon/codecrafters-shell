import { describe, expect, test } from "bun:test";
import { parseLine, structureLine } from "../app/parser";
import { TokenKind } from "../app/parser/types";

function parseOk(line: string) {
	const result = parseLine(line);
	if (!result.ok) throw new Error(`Expected parse success for: ${line}`);
	return result;
}

function tokenValues(line: string) {
	return parseOk(line).tokens.map((t) => t.value);
}

describe("parseLine", () => {
	test("parses simple words", () => {
		expect(tokenValues("echo hello world")).toEqual([
			"echo",
			"hello",
			"world",
		]);
	});

	test("parses single word", () => {
		expect(tokenValues("ls")).toEqual(["ls"]);
	});

	test("collapses multiple spaces", () => {
		expect(tokenValues("echo   hello    world")).toEqual([
			"echo",
			"hello",
			"world",
		]);
	});

	test("handles leading and trailing spaces", () => {
		expect(tokenValues("  echo hello  ")).toEqual(["echo", "hello"]);
	});

	test("returns empty tokens for empty input", () => {
		expect(tokenValues("")).toEqual([]);
		expect(tokenValues("   ")).toEqual([]);
	});

	describe("single quotes", () => {
		test("preserves spaces inside single quotes", () => {
			expect(tokenValues("echo 'hello world'")).toEqual([
				"echo",
				"hello world",
			]);
		});

		test("preserves backslashes inside single quotes", () => {
			expect(tokenValues("echo 'hello\\nworld'")).toEqual([
				"echo",
				"hello\\nworld",
			]);
		});

		test("preserves double quotes inside single quotes", () => {
			expect(tokenValues(`echo '"hello"'`)).toEqual(["echo", '"hello"']);
		});
	});

	describe("double quotes", () => {
		test("preserves spaces inside double quotes", () => {
			expect(tokenValues('echo "hello world"')).toEqual([
				"echo",
				"hello world",
			]);
		});

		test("handles escaped backslash inside double quotes", () => {
			expect(tokenValues('echo "hello\\\\world"')).toEqual([
				"echo",
				"hello\\world",
			]);
		});

		test("handles escaped double quote inside double quotes", () => {
			expect(tokenValues('echo "hello\\"world"')).toEqual([
				"echo",
				'hello"world',
			]);
		});

		test("non-escapable chars keep the backslash", () => {
			expect(tokenValues('echo "hello\\nworld"')).toEqual([
				"echo",
				"hello\\nworld",
			]);
		});

		test("preserves single quotes inside double quotes", () => {
			expect(tokenValues(`echo "it's"`)).toEqual(["echo", "it's"]);
		});

		test("backslash escapes $ and ` (backslash removed)", () => {
			expect(tokenValues('echo "\\$HOME"')).toEqual(["echo", "$HOME"]);
			expect(tokenValues('echo "\\`x\\`"')).toEqual(["echo", "`x`"]);
		});
	});

	describe("escapes outside quotes", () => {
		test("backslash escapes a space", () => {
			expect(tokenValues("echo hello\\ world")).toEqual([
				"echo",
				"hello world",
			]);
		});

		test("backslash escapes a backslash", () => {
			expect(tokenValues("echo hello\\\\world")).toEqual([
				"echo",
				"hello\\world",
			]);
		});

		test("trailing backslash is preserved", () => {
			const result = parseOk("echo hello\\");
			expect(result.tokens.map((t) => t.value)).toEqual(["echo", "hello\\"]);
		});
	});

	describe("error cases", () => {
		test("unterminated single quote", () => {
			const result = parseLine("echo 'hello");
			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error).toBe("unmatched_quote");
			}
		});

		test("unterminated double quote", () => {
			const result = parseLine('echo "hello');
			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error).toBe("unmatched_quote");
			}
		});
	});

	describe("redirect operators", () => {
		test("parses > operator", () => {
			const result = parseOk("echo hello > file.txt");
			const kinds = result.tokens.map((t) => t.kind);
			expect(kinds).toEqual([
				TokenKind.WORD,
				TokenKind.WORD,
				TokenKind.OPERATOR,
				TokenKind.WORD,
			]);
			expect(result.tokens[2].value).toBe(">");
		});

		test("parses >> operator", () => {
			const result = parseOk("echo hello >> file.txt");
			expect(result.tokens[2].value).toBe(">>");
		});

		test("parses 2> operator", () => {
			const result = parseOk("cmd 2> err.log");
			expect(result.tokens[1].value).toBe("2>");
		});

		test("parses 2>> operator", () => {
			const result = parseOk("cmd 2>> err.log");
			expect(result.tokens[1].value).toBe("2>>");
		});

		test("parses 1> as > operator", () => {
			const result = parseOk("echo hi 1> out.txt");
			expect(result.tokens.map((t) => t.kind)).toEqual([
				TokenKind.WORD,
				TokenKind.WORD,
				TokenKind.OPERATOR,
				TokenKind.WORD,
			]);
			expect(result.tokens[2].value).toBe(">");
		});

		test("parses 1>> as >> operator", () => {
			const result = parseOk("echo hi 1>> out.txt");
			expect(result.tokens[2].value).toBe(">>");
		});

		test("parses >out.txt without spaces", () => {
			const result = parseOk("echo hi >out.txt");
			expect(result.tokens[2].value).toBe(">");
			expect(result.tokens[3].value).toBe("out.txt");
		});

		test("parses 2>err.log without spaces", () => {
			const result = parseOk("cmd 2>err.log");
			expect(result.tokens[1].value).toBe("2>");
			expect(result.tokens[2].value).toBe("err.log");
		});

	test("parses 2>>err.log without spaces", () => {
		const result = parseOk("cmd 2>>err.log");
		expect(result.tokens[1].value).toBe("2>>");
		expect(result.tokens[2].value).toBe("err.log");
	});

	test("trailing > emits operator token", () => {
		const result = parseOk("echo hello >");
		expect(result.tokens.map((t) => t.kind)).toEqual([
			TokenKind.WORD,
			TokenKind.WORD,
			TokenKind.OPERATOR,
		]);
		expect(result.tokens[2].value).toBe(">");
	});

	test("trailing >> emits operator token", () => {
		const result = parseOk("echo hello >>");
		expect(result.tokens.map((t) => t.kind)).toEqual([
			TokenKind.WORD,
			TokenKind.WORD,
			TokenKind.OPERATOR,
		]);
		expect(result.tokens[2].value).toBe(">>");
	});

	test("trailing 2> emits operator token", () => {
		const result = parseOk("echo hello 2>");
		expect(result.tokens.map((t) => t.kind)).toEqual([
			TokenKind.WORD,
			TokenKind.WORD,
			TokenKind.OPERATOR,
		]);
		expect(result.tokens[2].value).toBe("2>");
	});

	test("trailing 2>> emits operator token", () => {
		const result = parseOk("echo hello 2>>");
		expect(result.tokens.map((t) => t.kind)).toEqual([
			TokenKind.WORD,
			TokenKind.WORD,
			TokenKind.OPERATOR,
		]);
		expect(result.tokens[2].value).toBe("2>>");
	});
});
});

describe("structureLine", () => {
	test("extracts command and args", () => {
		const result = parseOk("ls -la /tmp");
		const cmd = structureLine(result.tokens);
		expect(cmd.command.value).toBe("ls");
		expect(cmd.args).toEqual(["-la", "/tmp"]);
	});

	test("command with no args", () => {
		const result = parseOk("pwd");
		const cmd = structureLine(result.tokens);
		expect(cmd.command.value).toBe("pwd");
		expect(cmd.args).toEqual([]);
	});

	test("extracts redirect", () => {
		const result = parseOk("echo hello > output.txt");
		const cmd = structureLine(result.tokens);
		expect(cmd.command.value).toBe("echo");
		expect(cmd.args).toEqual(["hello"]);
		expect(cmd.redirect).toBeDefined();
		expect(cmd.redirect?.operator.value).toBe(">");
		expect(cmd.redirect?.target.value).toBe("output.txt");
	});

	test("extracts stderr redirect", () => {
		const result = parseOk("cmd arg 2> err.log");
		const cmd = structureLine(result.tokens);
		expect(cmd.command.value).toBe("cmd");
		expect(cmd.args).toEqual(["arg"]);
		expect(cmd.redirect?.operator.value).toBe("2>");
	});

	test("redirect target can be quoted (spaces preserved)", () => {
		const result = parseOk('echo hi > "out file.txt"');
		const cmd = structureLine(result.tokens);
		expect(cmd.command.value).toBe("echo");
		expect(cmd.args).toEqual(["hi"]);
		expect(cmd.redirect?.operator.value).toBe(">");
		expect(cmd.redirect?.target.value).toBe("out file.txt");
	});

	test("redirect target works without spaces after operator", () => {
		const result = parseOk("echo hi >out.txt");
		const cmd = structureLine(result.tokens);
		expect(cmd.redirect?.operator.value).toBe(">");
		expect(cmd.redirect?.target.value).toBe("out.txt");
	});

	test("throws on trailing redirect (missing target)", () => {
		const result = parseOk("echo hello >");
		expect(() => structureLine(result.tokens)).toThrow(
			"missing redirect target",
		);
	});

	test("throws on trailing >> (missing target)", () => {
		const result = parseOk("echo hello >>");
		expect(() => structureLine(result.tokens)).toThrow(
			"missing redirect target",
		);
	});
});
