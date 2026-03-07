type Command = {
  name: string;
  description: string;
  run: (args: string[]) => void;
}

type Resolver = (cmd: string) => ResolveCommandResult | undefined;

type ResolveCommandResult =
  | { kind: 'builtin'; command: Command }
  | ExternalCommand
  | { kind: 'not_found'; command: string };

type ExternalCommand = {
  name: string;
  path: string;
  kind: 'external'
}

export type {
  Command,
  Resolver,
  ResolveCommandResult,
  ExternalCommand,
}