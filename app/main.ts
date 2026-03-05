import { createInterface } from "readline";

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "$ ",
});

rl.prompt();

const commands = [
  { name: "exit", description: "Exit the shell" },
  { name: "echo", description: "Echo the arguments" },
  { name: "type", description: "Type the arguments" },
];

rl.on("line", (line: string) => {
  const { command, args } = parseCommand(line);
  // const args = line.trim().split(" ").slice(1);

  switch (command) {
    case "exit":
      rl.close();
      break;
    case "echo":
      console.log(args.join(" "));
      rl.prompt();
      break;
    case "type":
      const arg = args.join(" ");
      if (commands.some((c) => c.name === arg)) console.log(`${arg} is a shell builtin`);
      else console.log(`${arg}: not found`);
      rl.prompt();
      break;
    default:
      console.error(`${line}: command not found`);
      rl.prompt();
      break;
  }
});

function parseCommand(line: string) {
  const [ command, ...args ] = line.trim().split(" ");
  return { command: command.toLowerCase(), args };
}

// function runCommand(command: string, args: string[]) {

//   const command = commands.find((c) => c.name === command);

//   switch (command) {
//     case "exit":
//       rl.close();
//       break;
//     case "echo":
//       console.log(args.join(" "));
//       break;
//   }
// }