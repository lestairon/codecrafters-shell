import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline";
import { createCompleter } from "./completer";
import { builtinNames, setShutdown } from "./executer/builtins";
import { handleLine } from "./handler";
import { setBuiltinNames } from "./resolver";

setBuiltinNames(builtinNames);

const rl = createInterface({
	input: stdin,
	output: stdout,
	prompt: "$ ",
	completer: createCompleter(stdout),
});

setShutdown(() => {
	rl.close();
	process.exit(0);
});

rl.prompt();
rl.on("line", (line) => handleLine(line, () => rl.prompt()));
