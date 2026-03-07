import { createInterface } from "readline";
import { stdin, stdout } from 'node:process'
import resolveCommand from './resolver';
import runCommand from './executer';
import { parseLine } from './parser';

const rl = createInterface({
  input: stdin,
  output: stdout,
  prompt: "$ ",
});

rl.prompt();

rl.on("line", (line: string) => {
  const result = parseLine(line);
  if (!result.ok) {
    console.error(result.message);
    rl.prompt();
    return;
  }

  const { values } = result;
  const [command, ...args] = values;

  if (!command) {
    rl.prompt();
    return;
  }

  const commandObj = resolveCommand(command);

  if (commandObj.kind === 'not_found') {
    console.error(`${line}: command not found`);
  } else {
    runCommand(commandObj, [...args]);
  }

  rl.prompt();
});

export default rl;
