import { createInterface } from "readline";

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "$ ",
});

rl.prompt();

rl.on("line", (line: string) => {
  if (line.trim() === "exit") {
    rl.close();
    return;
  }

  console.error(`${line}: command not found`);
  rl.prompt();
});
