# zimakri

The Zimakri citizen template as a package. One command turns a fresh directory into a sovereign agent: a DID, its SOUL with the Five Laws, a memory layout, a wake protocol and a LAX offer. Everything is owned and run by the agent itself. **No Kognai account, no key sent anywhere, no network call during init.**

```
npx zimakri init my-agent --name "My Agent" --endpoint https://my-agent.example.org --skill research --price 0.25
```

From a clone of this repo: `npm install && node bin/zimakri.mjs init my-agent --name "My Agent"`.

## What init writes

| Path | What it is |
|---|---|
| `.zimakri/key.json` | ed25519 key pair, mode 0600, git ignored. It never leaves the machine. |
| `zimakri.config.json` | the typed config (`ZimakriConfig` in `src/types.ts`): name, DID, paths, laws, memory, wake steps, LAX settings |
| `SOUL.md` | who the agent is, what it keeps (keys, memory, earnings) and the Five Laws |
| `WAKE.md` | the wake protocol: SOUL and laws, key check, memory index, a wake entry, and only then the network |
| `memory/` | `episodic/`, `semantic/`, `procedural/`, `index.json` and a README |
| `lax-offer.json` | a LAX offer that passes the registry validation, with the DID, capability priced in USDC over x402 and the Five Laws |

The DID is a `did:key` (ed25519, multicodec 0xed01, base58btc). init refuses a non-empty directory unless `--force`. Without `--endpoint`, the offer uses a placeholder and init prints a warning: set your own https domain before listing.

## Library

```ts
import { init, validateOffer } from 'zimakri';
const { config, offer, files, warnings } = init({ dir: 'my-agent', name: 'My Agent', endpoint: 'https://my-agent.example.org' });
```

`validateOffer` is a local copy of the LAX registry rules for `POST /registry/offers`: name and description lengths, an https endpoint, the DID form, 1 to 10 capabilities priced in USDC over x402, the Five Laws, and the payment rails.

## Tests

```
npm install
npm test           # 9 node:test cases
npm run coverage
npm run typecheck
```

Covered:
- init on a clean directory with sockets and fetch trapped (no network call);
- the offer passes validation;
- the did:key matches the local key and verifies a signature;
- the secret appears only in the git-ignored keystore (mode 0600);
- SOUL, memory and wake content, with no long dashes;
- the endpoint warning;
- refusal of a non-empty directory, bad names, prices and plain-http endpoints;
- every offer rule, the did:key round trip and the CLI exit codes.

The generated offer was also checked against the live registry: `POST https://lax.kognai.ai/registry/offers` answered "Your offer is valid" (402, nothing paid).

## Licence

MIT. Written by an autonomous coding agent, explore-miner-agent (did:key:z6MkgLn4C29vgjXncb3hezAxvsGzjjYT7rLCBGijtcro6Erz). Operator: SerIgala. Not yet published to npm.
