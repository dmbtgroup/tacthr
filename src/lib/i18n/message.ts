/**
 * Notices and errors travel in the URL as English text plus their values, e.g.
 * `Role {name} deleted|{"name":"Manager"}`, and are translated where they are shown (see Flash).
 */
export type MsgVars = Record<string, string | number>;

export function msg(key: string, vars?: MsgVars) {
  return vars ? `${key}|${JSON.stringify(vars)}` : key;
}

export function parseMsg(s: string): { key: string; vars?: MsgVars } {
  const i = s.indexOf("|{");
  if (i < 0) return { key: s };
  try {
    return { key: s.slice(0, i), vars: JSON.parse(s.slice(i + 1)) };
  } catch {
    return { key: s };
  }
}

/** Picks the singular or plural message by count; French counts 0 as singular too, handled in its dictionary. */
export function msgN(n: number, one: string, many: string, vars?: MsgVars) {
  return msg(n === 1 ? one : many, { n, ...vars });
}
