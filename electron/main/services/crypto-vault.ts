import crypto from 'node:crypto';

const MAGIC = Buffer.from('TDBAENC1', 'ascii');
const SALT_LEN = 32;
const IV_LEN = 12;
const TAG_LEN = 16;
const KEY_LEN = 32;

const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

const VERIFY_PLAIN = Buffer.from('TodoBa encryption verifier', 'utf8');

const keyCache = new Map<string, Buffer>();

function cacheKey(password: string, saltHex: string): string {
  return saltHex + ':' + password;
}

export function generateSalt(): Buffer {
  return crypto.randomBytes(SALT_LEN);
}

export function deriveKey(password: string, salt: Buffer): Buffer {
  const saltHex = salt.toString('hex');
  const ck = cacheKey(password, saltHex);
  const cached = keyCache.get(ck);
  if (cached) return cached;
  const key = crypto.scryptSync(Buffer.from(password, 'utf8'), salt, KEY_LEN, SCRYPT_PARAMS);
  keyCache.set(ck, key);
  return key;
}

export interface EnvelopeParts {
  salt: Buffer;
  iv: Buffer;
  tag: Buffer;
  ciphertext: Buffer;
}

export function parseEnvelope(buf: Buffer): EnvelopeParts {
  if (buf.length < MAGIC.length + SALT_LEN + IV_LEN + TAG_LEN) {
    throw new Error('密文格式无效或已损坏');
  }
  if (!buf.subarray(0, MAGIC.length).equals(MAGIC)) {
    throw new Error('文件未加密或格式不被支持');
  }
  let off = MAGIC.length;
  const salt = buf.subarray(off, off + SALT_LEN);
  off += SALT_LEN;
  const iv = buf.subarray(off, off + IV_LEN);
  off += IV_LEN;
  const tag = buf.subarray(off, off + TAG_LEN);
  off += TAG_LEN;
  const ciphertext = buf.subarray(off);
  return { salt, iv, tag, ciphertext };
}

export function encryptBuffer(data: Buffer, password: string, salt: Buffer): Buffer {
  const key = deriveKey(password, salt);
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(data), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([MAGIC, salt, iv, tag, enc]);
}

export function decryptBuffer(buf: Buffer, password: string): Buffer {
  const { salt, iv, tag, ciphertext } = parseEnvelope(buf);
  const key = deriveKey(password, salt);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  try {
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } catch {
    throw new Error('解密失败：密码错误或文件已损坏');
  }
}

export function makeVerifier(password: string, salt: Buffer): string {
  return encryptBuffer(VERIFY_PLAIN, password, salt).toString('base64');
}

export function checkVerifier(verifierB64: string, password: string): boolean {
  try {
    const plain = decryptBuffer(Buffer.from(verifierB64, 'base64'), password);
    return plain.equals(VERIFY_PLAIN);
  } catch {
    return false;
  }
}

export function isEncryptedBuffer(buf: Buffer): boolean {
  return buf.length >= MAGIC.length && buf.subarray(0, MAGIC.length).equals(MAGIC);
}
