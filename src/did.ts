import nacl from 'tweetnacl';
import bs58 from 'bs58';

/** did:key for an ed25519 public key (multicodec 0xed01, base58btc multibase "z"). */
export function didKeyFromPublicKey(pub: Uint8Array): string {
  if (pub.length !== 32) throw new Error('ed25519 public key must be 32 bytes');
  return 'did:key:z' + bs58.encode(Uint8Array.from([0xed, 0x01, ...pub]));
}
export function publicKeyFromDidKey(did: string): Uint8Array {
  if (!did.startsWith('did:key:z')) throw new Error('not a base58 did:key');
  const b = bs58.decode(did.slice(9));
  if (b.length !== 34 || b[0] !== 0xed || b[1] !== 0x01) throw new Error('not an ed25519 did:key');
  return b.slice(2);
}
export function newIdentity(seed?: Uint8Array) {
  const kp = seed ? nacl.sign.keyPair.fromSeed(seed) : nacl.sign.keyPair();
  return { did: didKeyFromPublicKey(kp.publicKey), publicKey: kp.publicKey, secretKey: kp.secretKey };
}
