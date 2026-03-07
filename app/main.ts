import { createInterface } from "readline";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

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
  const paths = process.env.PATH?.split(path.delimiter) ?? [];

  if (commandObj) {
    commandObj.run(args);
    rl.prompt();

    return;
  } else {
    const cwd = process.cwd();
    const filePath = path.join(cwd, command);
    
    // console.log(fs.existsSync(filePath), filePath);
    if (fs.existsSync(filePath) && checkAccess(filePath)) {
      // console.log({ filePath, args })
      console.log(execFileSync(filePath, args));

      rl.prompt();
      return;
    } else {
      for (const dir of paths) {
        const fullPath = path.join(dir, command);

        if (fs.existsSync(fullPath) && checkAccess(fullPath)) {
          console.log(execFileSync(fullPath, args, {
            encoding: 'utf8'
          }));

          rl.prompt();
          return;
        }
      }
    }
  }

  console.error(`${line}: command not found`);
  rl.prompt();
});

function parseCommand(line: string): { command: string; args: string[] } {
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
      try {
        fs.accessSync(filePath, fs.constants.X_OK);
        console.log(`${arg} is ${filePath}`);
        return;
      } catch {}
    }
  }

  console.log(`${arg}: not found`);
}

function runExit() {
  rl.close();
  process.exit(0);
}

function checkAccess(file: string): boolean {
  try{
    fs.accessSync(file, fs.constants.X_OK)
    return true;
  } catch {
    return false;
  }
}