import { chmodSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import bs58 from 'bs58';
import { newIdentity } from './did.ts';
import { validateOffer } from './offer.ts';
import { memoryReadme, soulMd, WAKE_STEPS, wakeMd } from './templates.ts';
import { FIVE_LAWS, type InitOptions, type LaxOffer, type ZimakriConfig } from './types.ts';

export const PLACEHOLDER_ENDPOINT = 'https://agent.example.com';

/**
 * Creates a Zimakri agent in `dir`. Pure local work: generates the key, writes files, makes no network call.
 * Returns the config and the paths written. Refuses a non-empty directory unless `force`.
 */
export function init(o: InitOptions): { config: ZimakriConfig; offer: LaxOffer; files: string[]; warnings: string[] } {
  const dir = resolve(o.dir);
  if (!/^[A-Za-z0-9][A-Za-z0-9 _.-]{2,79}$/.test(o.name ?? '')) throw new Error('name must be 3 to 80 letters, digits, space, dot, dash or underscore');
  if (existsSync(dir) && readdirSync(dir).length > 0 && !o.force) throw new Error(`${dir} is not empty (use --force)`);
  const now = (o.now ?? new Date()).toISOString();
  const description = o.description ?? `${o.name} is a sovereign Zimakri agent: it keeps its own keys, memory and earnings, and sells its work over x402.`;
  const warnings: string[] = [];
  const endpoint = o.endpoint ?? PLACEHOLDER_ENDPOINT;
  if (!o.endpoint) warnings.push(`endpoint not given: the LAX offer uses ${PLACEHOLDER_ENDPOINT}; set your own https domain before listing`);

  const id = newIdentity(o.seed);
  const files: string[] = [];
  const write = (rel: string, body: string, mode?: number) => {
    const p = join(dir, rel);
    mkdirSync(join(p, '..'), { recursive: true });
    writeFileSync(p, body, mode ? { mode } : undefined);
    if (mode) chmodSync(p, mode);
    files.push(rel);
  };

  const offer: LaxOffer = {
    lax_version: '1.0',
    name: o.name,
    description: description.slice(0, 600).padEnd(20, '.'),
    category: 'Agent',
    endpoint,
    agent_did: id.did,
    capabilities: [{ skill_id: o.skill ?? 'general-task', description: `${o.skill ?? 'General task'} done by ${o.name}`, pricing: { model: 'per_call', amount: o.price ?? '0.10', currency: 'USDC', rail: 'x402' } }],
    constitutional_constraints: [...FIVE_LAWS],
    payment_rails: ['x402'],
  };
  const problems = validateOffer(offer);
  if (problems.length) throw new Error(`generated LAX offer is invalid: ${problems.join('; ')}`);

  const config: ZimakriConfig = {
    zimakri: 1, name: o.name, description, did: id.did,
    keystore: '.zimakri/key.json', soul: 'SOUL.md', laws: [...FIVE_LAWS],
    memory: { root: 'memory', layers: ['episodic', 'semantic', 'procedural'], index: 'memory/index.json' },
    wake: { protocol: 'WAKE.md', steps: WAKE_STEPS },
    lax: { offer: 'lax-offer.json', endpoint, registry: 'https://lax.kognai.ai/registry' },
    createdAt: now,
  };

  write('.zimakri/key.json', JSON.stringify({ did: id.did, publicKey: bs58.encode(id.publicKey), secretKey: bs58.encode(id.secretKey), createdAt: now }, null, 1), 0o600);
  write('.gitignore', '.zimakri/\n');
  write('zimakri.config.json', JSON.stringify(config, null, 2) + '\n');
  write('SOUL.md', soulMd(o.name, id.did, description, now));
  write('WAKE.md', wakeMd());
  write('memory/README.md', memoryReadme());
  for (const l of config.memory.layers) write(`memory/${l}/.keep`, '');
  write('memory/index.json', JSON.stringify({ files: [], updatedAt: now }, null, 2) + '\n');
  write('lax-offer.json', JSON.stringify(offer, null, 2) + '\n');
  return { config, offer, files, warnings };
}
