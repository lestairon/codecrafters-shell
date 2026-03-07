import type { ParseResult } from "./types";
import { onChar } from "./handlers";
import { INIT } from "./state";
import finish from "./finish";

export function parseLine(line: string): ParseResult {
  const state = [...line].reduce(onChar, INIT);

  return finish(state);
}
