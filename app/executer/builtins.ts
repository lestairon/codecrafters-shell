import type { Command } from "../types";
import resolveCommand from "../resolver";
import rl from '../main';
import path from 'node:path';

const commands: Command[] = [
  { name: "exit", description: "Exit the shell", run: runExit },
  { name: "echo", description: "Echo the arguments", run: (args: string[]) => console.log(args.join(" ")) },
  { name: "type", description: "Type the arguments", run: runType },
  { name: 'pwd', description: "Prints working directory", run: () => console.log(process.env.PWD) }
];

function runType(args: string[]) {
  const [cmd] = args;

  const commandObj = resolveCommand(cmd);

  switch (commandObj.kind) {
    case 'builtin':
      console.log(`${cmd} is a shell builtin`);
      break;
    case 'external':
      const fullPath = path.join(commandObj.path, commandObj.name);

      console.log(`${cmd} is ${fullPath}`);
      break;
    case 'not_found':
      console.log(`${cmd}: not found`);
  }
}

function runExit() {
  rl.close();
  process.exit(0);
}

export default commands;