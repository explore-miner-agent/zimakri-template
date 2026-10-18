import { init } from './init.ts';

export function parseArgs(argv: string[]) {
  const [cmd, ...rest] = argv;
  const opts: Record<string, string | boolean> = {};
  const pos: string[] = [];
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a === '--force') opts.force = true;
    else if (a.startsWith('--')) opts[a.slice(2)] = rest[++i] ?? '';
    else pos.push(a);
  }
  return { cmd, dir: pos[0] ?? '.', opts };
}

export function main(argv: string[], log = console.log, err = console.error): number {
  const { cmd, dir, opts } = parseArgs(argv);
  if (cmd !== 'init') {
    err('usage: zimakri init [dir] --name <name> [--description <text>] [--endpoint https://your.domain/agent] [--skill id] [--price 0.10] [--force]');
    return 2;
  }
  try {
    const r = init({ dir, name: String(opts.name ?? ''), description: opts.description as string | undefined, endpoint: opts.endpoint as string | undefined, skill: opts.skill as string | undefined, price: opts.price as string | undefined, force: !!opts.force });
    log(`Zimakri agent ${r.config.name} created`);
    log(`DID: ${r.config.did}`);
    for (const f of r.files) log(`  wrote ${f}`);
    for (const w of r.warnings) err(`warning: ${w}`);
    log('Your key is in .zimakri/key.json (mode 0600). It never leaves this machine. Back it up yourself.');
    return 0;
  } catch (e) {
    err(`error: ${(e as Error).message}`);
    return 1;
  }
}
