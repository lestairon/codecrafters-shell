import { createInterface } from "readline";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { stdin, stdout, cwd, chdir } from 'node:process'

const rl = createInterface({
  input: stdin,
  output: stdout,
  prompt: "$ ",
});

rl.prompt();

type ResolveCommandResult = 
  | { kind: 'builtin'; command: Command }
  | ExternalCommand
  | { kind: 'not_found'; command: string };

type Resolver = (cmd: string) => ResolveCommandResult | undefined;

const resolvers: Resolver[] = [
  findBuiltIn,
  findInCwd,
  findInPath
]

interface Command {
  name: string;
  description: string;
  run: (args: string[]) => void;
}

interface ExternalCommand {
  name: string;
  path: string;
  kind: 'external'
}

const commands: Command[] = [
  { name: "exit", description: "Exit the shell", run: runExit },
  { name: "echo", description: "Echo the arguments", run: (args: string[]) => console.log(args.join(" ")) },
  { name: "type", description: "Type the arguments", run: runType },
];

rl.on("line", (line: string) => {
  const { command, args } = parseCommand(line);
  // const commandObj = commands.find((c) => c.name === command);
  // const paths = process.env.PATH?.split(path.delimiter) ?? [];

  const commandObj = resolveCommand(command);

  if (!commandObj) {
    console.error(`${line}: command not found`);
    rl.prompt();
  }
  
  runCommand(commandObj, args);
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

function resolveCommand(command: string): ResolveCommandResult {
  for (const resolver of resolvers) {
    const result = resolver(command);

    if (result) return result;
  }

  return { kind: 'not_found', command }
}

//   if (isBuiltIn(command)) {
//     return { name: command, kind: 'builtin' }
//   }

//   const externalCommand = findExternal(command);

//   if (!externalCommand) return { kind: 'not_found', command };

//   return { kind: 'external', path: externalCommand }

//   if (commandObj) {
//     commandObj.run(args);
//     rl.prompt();

//     return;
//   } else {
//     const filePath = path.join(cwd(), command);

//     if (fs.existsSync(filePath) && checkAccess(filePath)) {
//       spawnSync(command, args, {
//         stdio: 'inherit'
//       });

//       rl.prompt();
//       return;
//     } else {
//       for (const dir of paths) {
//         const filePath = path.join(dir, command);

//         if (fs.existsSync(filePath) && checkAccess(filePath)) {
//           chdir(dir);
//           spawnSync(command, args, {
//             stdio: 'inherit'
//           });

//           rl.prompt();
//           return;
//         }
//       }
//     }
//   }
// }

function findBuiltIn(command: string): ResolveCommandResult | undefined {
  const candidate = commands.find(c => c.name === command);

  if (candidate) return { command: candidate, kind: 'builtin' };
}

function findInCwd(command: string): ResolveCommandResult | undefined {
  const candidate = path.join(cwd(), command);

  if (fs.existsSync(candidate) && checkAccess(candidate)) {
    return { kind: 'external', path: cwd(), name: command };
  }
}

function findInPath(command: string): ResolveCommandResult | undefined {
  const paths = process.env.PATH?.split(path.delimiter) ?? [];
  
  for (const dir of paths) {
    const candidate = path.join(dir, command);

    if (fs.existsSync(candidate) && checkAccess(candidate)) {
      return { kind: 'external', path: dir, name: command };
    }
  }
}

function runCommand(command: ResolveCommandResult, args: string[]) {
  switch (command.kind) {
    case 'builtin': {
      command.command.run(args);
      
      break;
    }
    case 'external': {
      runExternal(command, args);

      break;
    }
  }

  rl.prompt();
}

function runExternal(command: ExternalCommand, args: string[]) {
  if (command.path !== cwd()) {
    chdir(command.path)
  }

  spawnSync(command, args, {
    stdio: 'inherit'
  });
}