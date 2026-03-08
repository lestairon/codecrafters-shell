import { describe, expect, test } from "bun:test";
import { spawn } from "bun";
import { readFileSync, unlinkSync } from "node:fs";

function spawnShell() {
	return spawn(["bun", "run", "app/main.ts"], {
		stdin: "pipe",
		stdout: "pipe",
		stderr: "pipe",
	});
}

async function runCommands(...cmds: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
	const proc = spawnShell();

	for (const cmd of cmds) {
		proc.stdin.write(`${cmd}\n`);
	}
	proc.stdin.write("exit\n");
	proc.stdin.end();

	const [stdout, stderr] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
	]);

	const exitCode = await proc.exited;
	return { stdout, stderr, exitCode };
}

describe("shell e2e", () => {
	test("echo outputs text", async () => {
		const { stdout } = await runCommands("echo hello world");
		expect(stdout).toContain("hello world");
	});

	test("pwd outputs a path", async () => {
		const { stdout } = await runCommands("pwd");
		expect(stdout).toContain("/");
	});

	test("unknown command reports error", async () => {
		const { stderr } = await runCommands("nonexistent_cmd_xyz_12345");
		expect(stderr).toContain("command not found");
	});

	test("cd changes directory", async () => {
		const { stdout } = await runCommands("cd /tmp", "pwd");
		expect(stdout).toContain("/tmp");
	});

	test("type identifies builtin", async () => {
		const { stdout } = await runCommands("type echo");
		expect(stdout).toContain("echo is a shell builtin");
	});

	test("exit terminates the shell", async () => {
		const { exitCode } = await runCommands();
		expect(exitCode).toBe(0);
	});

	test("redirect writes to file", async () => {
		const tmpFile = `/tmp/shell-test-${Date.now()}.txt`;
		try {
			await runCommands(`echo redirected > ${tmpFile}`);
			const content = readFileSync(tmpFile, "utf-8");
			expect(content).toBe("redirected\n");
		} finally {
			try { unlinkSync(tmpFile); } catch {}
		}
	});

	test(">> appends to file", async () => {
		const tmpFile = `/tmp/shell-test-append-${Date.now()}.txt`;
		try {
			await runCommands(
				`echo first > ${tmpFile}`,
				`echo second >> ${tmpFile}`,
			);
			const content = readFileSync(tmpFile, "utf-8");
			expect(content).toBe("first\nsecond\n");
		} finally {
			try { unlinkSync(tmpFile); } catch {}
		}
	});

	test("2> redirects stderr to file", async () => {
		const tmpFile = `/tmp/shell-test-stderr-${Date.now()}.txt`;
		try {
			await runCommands(`cd /nonexistent_dir_xyz_12345 2> ${tmpFile}`);
			const content = readFileSync(tmpFile, "utf-8");
			expect(content).toContain("No such file or directory");
		} finally {
			try { unlinkSync(tmpFile); } catch {}
		}
	});

	test("malformed redirect reports syntax error", async () => {
		const { stderr } = await runCommands("echo hello >");
		expect(stderr).toContain("missing redirect target");
	});
});
