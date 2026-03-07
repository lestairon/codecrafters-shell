import path from 'node:path';
import { cwd } from 'node:process';
import fs from 'node:fs';
import type { ResolveCommandResult } from '../types';
import commands from '../executer/builtins';

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

function checkAccess(file: string): boolean {
  try{
    fs.accessSync(file, fs.constants.X_OK)
    return true;
  } catch {
    return false;
  }
}

export {
  findBuiltIn,
  findInCwd,
  findInPath
};