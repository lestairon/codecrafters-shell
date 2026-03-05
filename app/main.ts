import { createInterface } from "readline";
import fs from "node:fs";
import path from "node:path";

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "$ ",
});

rl.prompt();

interface Command {
  name: string;
  description: string;
  run: (args: string[]) => void;
}

const commands: Command[] = [
  { name: "exit", description: "Exit the shell", run: runExit },
  { name: "echo", description: "Echo the arguments", run: (args: string[]) => console.log(args.join(" ")) },
  { name: "type", description: "Type the arguments", run: runType },
];

rl.on("line", (line: string) => {
  const { command, args } = parseCommand(line);
  const commandObj = commands.find((c) => c.name === command);

  if (commandObj) commandObj.run(args);
  else console.error(`${line}: command not found`);

  rl.prompt();
});

function parseCommand(line: string) {
  const [ command, ...args ] = line.trim().split(" ");
  return { command: command.toLowerCase(), args };
}

function runType(args: string[]) {
  const [arg] = args;
  const command = commands.find((c) => c.name === arg);
  const paths = process.env.PATH?.split(path.delimiter) ?? [];

  if (command) {
    console.log(`${arg} is a shell builtin`);
    return;
  }

  for (const pathObj of paths) {
    const filePath = path.join(pathObj, arg);
    if (fs.existsSync(filePath)) {
      fs.accessSync(filePath, fs.constants.X_OK);
      console.log(`${arg} is ${pathObj}`);
      return;
    }
  }

  console.log(`${arg}: not found`);
}

function runExit() {
  rl.close();
  process.exit(0);
}