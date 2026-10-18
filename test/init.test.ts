import { test } from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { mkdtempSync, readFileSync, statSync, existsSync, writeFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { init, main, validateOffer, publicKeyFromDidKey, didKeyFromPublicKey, FIVE_LAWS, parseArgs } from '../src/index.ts';

const fresh = () => mkdtempSync(join(tmpdir(), 'zimakri-'));
const seed = new Uint8Array(32).fill(3);

/** Fails the test if anything tries to open a socket or call fetch. */
function noNetwork<T>(fn: () => T): T {
  const origConnect = net.Socket.prototype.connect;
  const origFetch = globalThis.fetch;
  let attempts = 0;
  net.Socket.prototype.connect = function () { attempts++; throw new Error('network call during init'); } as any;
  globalThis.fetch = (async () => { attempts++; throw new Error('network call during init'); }) as any;
  try { const r = fn(); assert.equal(attempts, 0); return r; } finally { net.Socket.prototype.connect = origConnect; globalThis.fetch = origFetch; }
}

test('init works on a clean directory with no network call', () => {
  const dir = fresh();
  const r = noNetwork(() => init({ dir, name: 'Test Agent', endpoint: 'https://agent.test.dev/a', seed, now: new Date('2026-10-20T00:00:00Z') }));
  for (const f of ['zimakri.config.json', 'SOUL.md', 'WAKE.md', 'lax-offer.json', 'memory/index.json', 'memory/episodic/.keep', 'memory/semantic/.keep', 'memory/procedural/.keep', '.zimakri/key.json', '.gitignore']) {
    assert.ok(existsSync(join(dir, f)), f);
  }
  assert.deepEqual(r.warnings, []);
});
test('the generated LAX offer passes the registry validation', () => {
  const dir = fresh();
  init({ dir, name: 'Offer Agent', endpoint: 'https://agent.test.dev/a', seed });
  const offer = JSON.parse(readFileSync(join(dir, 'lax-offer.json'), 'utf8'));
  assert.deepEqual(validateOffer(offer), []);
  assert.deepEqual(offer.constitutional_constraints, [...FIVE_LAWS]);
  assert.equal(offer.capabilities[0].pricing.rail, 'x402');
});
test('the DID is a valid did:key whose secret stays local with mode 0600', () => {
  const dir = fresh();
  const r = init({ dir, name: 'Key Agent', seed });
  const key = JSON.parse(readFileSync(join(dir, '.zimakri/key.json'), 'utf8'));
  assert.equal(statSync(join(dir, '.zimakri/key.json')).mode & 0o777, 0o600);
  assert.equal(key.did, r.config.did);
  assert.deepEqual(Buffer.from(publicKeyFromDidKey(r.config.did)), Buffer.from(bs58.decode(key.publicKey)));
  const msg = new TextEncoder().encode('wake');
  assert.ok(nacl.sign.detached.verify(msg, nacl.sign.detached(msg, bs58.decode(key.secretKey)), publicKeyFromDidKey(r.config.did)));
  // The secret appears nowhere but the keystore, and the keystore is git ignored.
  for (const f of ['zimakri.config.json', 'SOUL.md', 'lax-offer.json']) assert.ok(!readFileSync(join(dir, f), 'utf8').includes(key.secretKey));
  assert.equal(readFileSync(join(dir, '.gitignore'), 'utf8'), '.zimakri/\n');
});
test('SOUL and config carry the Five Laws, memory layout and wake protocol', () => {
  const dir = fresh();
  const r = init({ dir, name: 'Soul Agent', seed });
  const soul = readFileSync(join(dir, 'SOUL.md'), 'utf8');
  for (const l of FIVE_LAWS) assert.ok(soul.includes(l), l);
  assert.deepEqual(r.config.memory.layers, ['episodic', 'semantic', 'procedural']);
  assert.ok(r.config.wake.steps.length >= 5);
  assert.match(readFileSync(join(dir, 'WAKE.md'), 'utf8'), /1\. Read SOUL\.md/);
  assert.ok(!/\u2014|\u2013/.test(soul + readFileSync(join(dir, 'WAKE.md'), 'utf8')), 'no long dashes in text people read');
});
test('missing endpoint gives a warning and a valid placeholder', () => {
  const r = init({ dir: fresh(), name: 'No Endpoint', seed });
  assert.equal(r.offer.endpoint, 'https://agent.example.com');
  assert.equal(r.warnings.length, 1);
});
test('refuses a non empty directory unless forced, and bad names or offers', () => {
  const dir = fresh();
  writeFileSync(join(dir, 'x'), '1');
  assert.throws(() => init({ dir, name: 'Busy Agent', seed }), /not empty/);
  assert.equal(init({ dir, name: 'Busy Agent', seed, force: true }).config.name, 'Busy Agent');
  assert.throws(() => init({ dir: fresh(), name: 'x', seed }), /name/);
  assert.throws(() => init({ dir: fresh(), name: 'Bad Price', price: 'free!', seed }), /invalid pricing/);
  assert.throws(() => init({ dir: fresh(), name: 'Bad Url', endpoint: 'http://plain.example.com', seed }), /https/);
});
test('validateOffer catches every rule', () => {
  const bad: any = { lax_version: '2.0', name: 'ab', description: 'short', category: 'x', endpoint: 'nope', agent_did: 'key', capabilities: [], constitutional_constraints: ['Harm Shield'], payment_rails: ['card'] };
  const p = validateOffer(bad);
  for (const s of ['lax_version', 'name', 'description', 'category', 'endpoint must be a url', 'agent_did', '1 to 10', 'Solidarity Oath', 'unknown payment rail']) assert.ok(p.some((x) => x.includes(s)), s);
  assert.ok(validateOffer({ ...bad, capabilities: [{ skill_id: '', description: '', pricing: {} }] }).some((x) => x.includes('skill_id')));
});
test('did:key encoding round trips and rejects bad input', () => {
  const pub = new Uint8Array(32).fill(9);
  assert.deepEqual(Buffer.from(publicKeyFromDidKey(didKeyFromPublicKey(pub))), Buffer.from(pub));
  assert.throws(() => didKeyFromPublicKey(new Uint8Array(31)));
  assert.throws(() => publicKeyFromDidKey('did:web:example.com'));
  assert.throws(() => publicKeyFromDidKey('did:key:z' + bs58.encode(new Uint8Array(34))));
});
test('CLI: npx zimakri init', () => {
  const dir = fresh();
  const out: string[] = [], err: string[] = [];
  const code = noNetwork(() => main(['init', dir, '--name', 'Cli Agent', '--endpoint', 'https://cli.test.dev', '--skill', 'code', '--price', '1.5'], (s) => out.push(s), (s) => err.push(s)));
  assert.equal(code, 0);
  assert.match(out.join('\n'), /DID: did:key:z/);
  assert.equal(JSON.parse(readFileSync(join(dir, 'lax-offer.json'), 'utf8')).capabilities[0].pricing.amount, '1.5');
  assert.equal(main(['init', dir, '--name', 'Cli Agent'], () => {}, (s) => err.push(s)), 1);
  assert.equal(main(['help'], () => {}, (s) => err.push(s)), 2);
  assert.deepEqual(parseArgs(['init', '--force', '--name', 'A']).opts, { force: true, name: 'A' });
  assert.equal(parseArgs(['init']).dir, '.');
  assert.ok(readdirSync(dir).length > 0);
});
