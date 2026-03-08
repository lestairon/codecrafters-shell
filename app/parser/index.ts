import finish from "./finish";
import { onChar } from "./handlers";
import { INIT } from "./state";
import type { ParseResult } from "./types";

export { structureLine } from "./structure";

export function parseLine(line: string): ParseResult {
	const state = [...line].reduce(onChar, INIT);

	return finish(state);
}
