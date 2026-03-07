import type { ResolveCommandResult, ExternalCommand } from "../types";
import { spawnSync } from "child_process";
import { cwd, chdir } from 'node:process';

function runCommand(commandResult: ResolveCommandResult, args: string[]) {
  switch (commandResult.kind) {
    case 'builtin': {
      commandResult.command.run(args);
      
      break;
    }
    case 'external': {
      runExternal(commandResult, args);

      break;
    }
  }
}

function runExternal(command: ExternalCommand, args: string[]) {
  if (command.path !== cwd()) {
    chdir(command.path)
  }

  spawnSync(command.name, args, {
    stdio: 'inherit'
  });
}

export default runCommand;