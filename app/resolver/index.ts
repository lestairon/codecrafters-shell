import path from "node:path";
import type { Resolver, ResolveCommandResult } from "../types";
import { findBuiltIn, findInCwd, findInPath } from './helpers';

const resolvers: Resolver[] = [
  findBuiltIn,
  findInCwd,
  findInPath
]

export function resolveHomeDir(filePath: string): string {
  if (filePath.startsWith('~')) {
    const homeDir = process.env.HOME || '';

    return path.join(homeDir, filePath.slice(1));
  }

  return filePath;
}

export default function resolveCommand(command: string): ResolveCommandResult {
  for (const resolver of resolvers) {
    const result = resolver(command);

    if (result) return result;
  }

  return { kind: 'not_found', command }
}
