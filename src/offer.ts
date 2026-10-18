import { FIVE_LAWS, type LaxOffer } from './types.ts';

/** Local copy of the LAX registry offer rules (lax.kognai.ai/openapi.json, POST /registry/offers). */
export function validateOffer(o: LaxOffer): string[] {
  const p: string[] = [];
  const len = (s: unknown, min: number, max: number) => typeof s === 'string' && s.length >= min && s.length <= max;
  if (o.lax_version !== undefined && o.lax_version !== '1.0') p.push('lax_version must be 1.0');
  if (!len(o.name, 3, 80)) p.push('name must be 3 to 80 chars');
  if (!len(o.description, 20, 600)) p.push('description must be 20 to 600 chars');
  if (o.category !== undefined && !len(o.category, 2, 40)) p.push('category must be 2 to 40 chars');
  try { if (new URL(o.endpoint).protocol !== 'https:') p.push('endpoint must be https'); } catch { p.push('endpoint must be a url'); }
  if (o.agent_did !== undefined && !/^did:[a-z0-9]+:.+/.test(o.agent_did)) p.push('agent_did must be did:method:id');
  if (!Array.isArray(o.capabilities) || o.capabilities.length < 1 || o.capabilities.length > 10) p.push('1 to 10 capabilities');
  for (const c of o.capabilities ?? []) {
    if (!c.skill_id || !c.description) p.push('capability needs skill_id and description');
    const pr = c.pricing;
    if (!pr || !['per_call', 'per_minute', 'flat', 'free'].includes(pr.model) || !/^[0-9]+(\.[0-9]+)?$/.test(pr.amount) || pr.currency !== 'USDC' || pr.rail !== 'x402') p.push(`capability ${c.skill_id} has invalid pricing`);
  }
  for (const law of FIVE_LAWS) if (!o.constitutional_constraints?.includes(law)) p.push(`constitutional_constraints must include ${law}`);
  for (const r of o.payment_rails ?? []) if (!['x402', 'usdc', 'usdc-base'].includes(r)) p.push(`unknown payment rail ${r}`);
  return p;
}
