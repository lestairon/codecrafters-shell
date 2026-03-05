import { createInterface } from "readline";

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "$ ",
});

rl.prompt();

rl.on("line", (line: string) => {
  const [ command, ...args ] = line.trim().split(" ");
  // const args = line.trim().split(" ").slice(1);

  switch (command) {
    case "exit":
      rl.close();
      break;
    case "echo":
      console.log(args.join(" "));
      rl.prompt();
      break;
    default:
      console.error(`${line}: command not found`);
      rl.prompt();
      break;
  }
});
