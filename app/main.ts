import { createInterface } from "readline";
import { stdin, stdout } from 'node:process'
import resolveCommand from './resolver';
import runCommand from './executer';

const rl = createInterface({
  input: stdin,
  output: stdout,
  prompt: "$ ",
});

rl.prompt();

rl.on("line", (line: string) => {
  const { command, args } = parseCommand(line);

  const commandObj = resolveCommand(command);

  if (commandObj.kind === 'not_found') {
    console.error(`${line}: command not found`);
  } else {
    runCommand(commandObj, args);
  }
  
  rl.prompt();
});

function parseCommand(line: string): { command: string; args: string[] } {
  const [ command, ...args ] = line.trim().split(" ");
  return { command: command.toLowerCase(), args };
}

export default rl;
