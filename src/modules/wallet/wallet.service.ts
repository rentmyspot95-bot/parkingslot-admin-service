import { Injectable } from '@nestjs/common';

@Injectable()
export class WalletService {
  /** Mirrors the console mock: POST /wallet/bulk-credit → { ok, audienceCount }. */
  bulkCredit(_body: { audience: unknown; amount: number; reason: string }) {
    return { ok: true as const, audienceCount: 1240 };
  }
}
