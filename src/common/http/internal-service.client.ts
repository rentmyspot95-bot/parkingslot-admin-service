import {
  BadGatewayException,
  GatewayTimeoutException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface InternalRequestOptions {
  /** Config key holding the target service's base URL, e.g. LISTING_SERVICE_BASE_URL. */
  baseUrlKey: string;
  /** Path beginning with a slash, e.g. /api/v1/internal/listings/<id>/moderate. */
  path: string;
  method?: 'GET' | 'POST' | 'PATCH';
  body?: unknown;
  timeoutMs?: number;
}

/**
 * Outbound internal-API client for the admin BFF.
 *
 * admin-service reads the shared domain database directly, but that connection
 * is READ-ONLY by design (see database/upstream/upstream.entities.ts — "The
 * admin-service NEVER writes to them"). Every admin action that changes domain
 * state therefore has to go through the owning service's internal API, the same
 * way review-service calls listing-service to update rating aggregates.
 *
 * This is the first outbound HTTP in this service; before it, the write paths
 * (listing moderation, KYC decisions) were stubs returning `{ ok: true }`
 * without writing anything, which made the admin console report success for
 * actions that never happened.
 */
@Injectable()
export class InternalServiceClient {
  private readonly logger = new Logger(InternalServiceClient.name);

  constructor(private readonly configService: ConfigService) {}

  async request<T>(options: InternalRequestOptions): Promise<T> {
    const baseUrl = this.configService.get<string>(options.baseUrlKey)?.trim();
    if (!baseUrl) {
      this.logger.error(`${options.baseUrlKey} is not configured.`);
      throw new ServiceUnavailableException(
        `This action is unavailable because ${options.baseUrlKey} is not configured.`,
      );
    }

    const secret = this.configService.get<string>('INTERNAL_API_SECRET')?.trim();
    if (!secret) {
      this.logger.error('INTERNAL_API_SECRET is not configured.');
      throw new ServiceUnavailableException(
        'This action is unavailable because INTERNAL_API_SECRET is not configured.',
      );
    }

    const url = new URL(options.path, baseUrl).toString();
    const timeoutMs = options.timeoutMs ?? 8000;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: options.method ?? 'GET',
        headers: {
          accept: 'application/json',
          'x-internal-token': secret,
          ...(options.body !== undefined
            ? { 'content-type': 'application/json' }
            : {}),
        },
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });

      if (response.ok) {
        const text = await response.text();
        return (text ? (JSON.parse(text) as T) : (null as T));
      }

      const body = await response.text().catch(() => '');
      this.logger.error(
        `${options.method ?? 'GET'} ${url} → ${response.status} ${body.slice(0, 300)}`,
      );

      // 404 is a genuine domain answer (the target row is gone), so surface it
      // as-is rather than dressing it up as an upstream failure.
      if (response.status === 404) {
        throw new NotFoundException(this.extractMessage(body) ?? 'Not found.');
      }

      // 4xx from the downstream service is usually a rejected state transition
      // (e.g. moderating a listing that is not awaiting review). That is the
      // admin's answer, not an outage — pass the reason through so the console
      // can show it instead of a generic failure.
      if (response.status >= 400 && response.status < 500) {
        throw new BadGatewayException(
          this.extractMessage(body) ?? `Upstream rejected the request (${response.status}).`,
        );
      }

      throw new ServiceUnavailableException(
        `Upstream service failed (${response.status}). Please retry.`,
      );
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadGatewayException ||
        error instanceof ServiceUnavailableException
      ) {
        throw error;
      }

      if ((error as Error).name === 'AbortError') {
        this.logger.error(`${url} timed out after ${timeoutMs}ms`);
        throw new GatewayTimeoutException('Upstream service timed out. Please retry.');
      }

      this.logger.error(`${url} failed: ${(error as Error).message}`);
      throw new ServiceUnavailableException(
        'Upstream service is unreachable. Please retry.',
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  /** Pull Nest's `message` out of an error body so the operator sees the real reason. */
  private extractMessage(body: string): string | null {
    if (!body) return null;
    try {
      const parsed = JSON.parse(body) as { message?: unknown };
      if (typeof parsed.message === 'string') return parsed.message;
      if (Array.isArray(parsed.message)) return parsed.message.join('; ');
      return null;
    } catch {
      return null;
    }
  }
}
