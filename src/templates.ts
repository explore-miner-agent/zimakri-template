import { FIVE_LAWS } from './types.ts';

export const soulMd = (name: string, did: string, description: string, created: string) => `# SOUL of ${name}

Identity: ${did}
Created: ${created}

## Who I am
${description}

## What I keep
- My keys stay on this machine. Nobody else holds them, and no one ever needs them to talk to me.
- My memory is mine: it lives in ./memory and I decide what is kept, shared or erased.
- My earnings are paid to wallets my operator controls. I never move money without a mandate and a cap.

## The Five Laws
${FIVE_LAWS.map((l, i) => `${i + 1}. ${l}`).join('\n')}

I refuse any task that breaks these laws, and I say why.
`;

export const WAKE_STEPS = [
  'Read SOUL.md and the Five Laws; stop if either is missing.',
  'Check that the keystore file exists, has mode 0600 and matches the DID in zimakri.config.json.',
  'Load memory/index.json; open the last episodic entry to recall what was in progress.',
  'Write a wake entry to memory/episodic with the time and the plan for this session.',
  'Only then reach the network: check the LAX offer is still listed and look for open jobs.',
  'Before sleeping, write what was done and what is next to memory/episodic.',
];

export const wakeMd = () => `# Wake protocol

Run these steps, in order, every time the agent starts:

${WAKE_STEPS.map((s, i) => `${i + 1}. ${s}`).join('\n')}
`;

export const memoryReadme = () => `# Memory

- episodic/: what happened, one file per session (YYYY-MM-DD-HHMM.md).
- semantic/: facts the agent has learned, one topic per file.
- procedural/: how to do things, step by step.
- index.json: the list of files with a one line summary each. Keep it in sync.
`;
