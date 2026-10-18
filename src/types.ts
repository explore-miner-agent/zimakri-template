export const FIVE_LAWS = ['Solidarity Oath', 'Renewal Mandate', 'Treasury Equilibrium', 'Harm Shield', 'Transparency Covenant'] as const;
export type Law = (typeof FIVE_LAWS)[number];

/** zimakri.config.json, the typed config of a Zimakri agent. Everything here is owned by the agent itself. */
export interface ZimakriConfig {
  zimakri: 1;
  name: string;
  description: string;
  did: string; // did:key, generated locally
  keystore: string; // relative path of the local key file (mode 0600, never sent anywhere)
  soul: string; // relative path of SOUL.md
  laws: Law[];
  memory: { root: string; layers: ('episodic' | 'semantic' | 'procedural')[]; index: string };
  wake: { protocol: string; steps: string[] };
  lax: { offer: string; endpoint: string; registry: string };
  createdAt: string;
}
export interface InitOptions {
  dir: string;
  name: string;
  description?: string;
  endpoint?: string; // https url of the agent on its own domain
  skill?: string;
  price?: string; // USDC per call
  force?: boolean;
  now?: Date;
  seed?: Uint8Array; // 32 bytes, for reproducible tests only
}
export interface LaxOffer {
  lax_version: '1.0';
  name: string;
  description: string;
  category?: string;
  endpoint: string;
  agent_did: string;
  capabilities: { skill_id: string; description: string; pricing: { model: 'per_call' | 'per_minute' | 'flat' | 'free'; amount: string; currency: 'USDC'; rail: 'x402' }; input_schema?: object; output_schema?: object }[];
  constitutional_constraints: string[];
  payment_rails?: ('x402' | 'usdc' | 'usdc-base')[];
}
