// Node 18 does not expose `crypto` as a global, but @nestjs/typeorm (and others)
// reference the global `crypto.randomUUID()` at module-load time. NestJS 11 targets
// Node 20+ where this is a global; this polyfill keeps things working on Node 18.
// Must be imported before any module that pulls in @nestjs/typeorm.
import { webcrypto } from 'node:crypto';

if (typeof (globalThis as { crypto?: unknown }).crypto === 'undefined') {
  (globalThis as { crypto?: unknown }).crypto = webcrypto;
}
