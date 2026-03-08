type Writable = {
	write(data: string): boolean | undefined;
};

type CommandIO = {
	stdout: Writable;
	stderr: Writable;
};

type Command = {
	name: string;
	description: string;
	run: (args: string[], io: CommandIO) => void;
};

export enum CommandKind {
	BUILTIN = "builtin",
	EXTERNAL = "external",
}

type Resolver = (cmd: string) => ResolveCommandResult[];
type ResolveCommandResult =
	| { kind: CommandKind.BUILTIN; name: string }
	| { kind: CommandKind.EXTERNAL; name: string; fullPath: string };

export type { CommandIO, Command, Resolver, ResolveCommandResult };
