import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline";
import { createCompleter } from "./completer";
import { builtinNames } from "./executer/builtins";
import { handleLine } from "./handler";
import { setBuiltinNames } from "./resolver";

setBuiltinNames(builtinNames);

const rl = createInterface({
	input: stdin,
	output: stdout,
	prompt: "$ ",
	completer: createCompleter(stdout),
});

rl.prompt();
rl.on("line", (line) => handleLine(line, () => rl.prompt()));

export default rl;
