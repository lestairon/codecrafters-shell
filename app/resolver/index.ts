import type { Resolver, ResolveCommandResult } from "../types";
import { findBuiltIn, findInCwd, findInPath } from './helpers';

const resolvers: Resolver[] = [
  findBuiltIn,
  findInCwd,
  findInPath
]

export default function resolveCommand(command: string): ResolveCommandResult {
  for (const resolver of resolvers) {
    const result = resolver(command);

    if (result) return result;
  }

  return { kind: 'not_found', command }
}