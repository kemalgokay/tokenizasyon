import { Injectable, NestMiddleware, BadRequestException } from '@nestjs/common';
import { createHash } from 'crypto';
import { Request, Response, NextFunction } from 'express';

export interface IdempotencyRecord {
  key: string;
  endpoint: string;
  requestHash: string;
  responseBody: string;
  statusCode: number;
}

export interface IdempotencyStore {
  find(key: string, endpoint: string): Promise<IdempotencyRecord | null>;
  save(record: IdempotencyRecord): Promise<void>;
}

@Injectable()
export class InMemoryIdempotencyStore implements IdempotencyStore {
  private records = new Map<string, IdempotencyRecord>();

  async find(key: string, endpoint: string): Promise<IdempotencyRecord | null> {
    return this.records.get(`${endpoint}:${key}`) ?? null;
  }

  async save(record: IdempotencyRecord): Promise<void> {
    this.records.set(`${record.endpoint}:${record.key}`, record);
  }
}

export const hashRequest = (body: unknown) =>
  createHash('sha256').update(JSON.stringify(body ?? {})).digest('hex');

@Injectable()
export class IdempotencyMiddleware implements NestMiddleware {
  constructor(private readonly store: IdempotencyStore) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      return next();
    }

    const key = req.header('Idempotency-Key');
    if (!key) {
      throw new BadRequestException('Missing Idempotency-Key');
    }

    const endpoint = `${req.method} ${req.path}`;
    const requestHash = hashRequest(req.body);
    const existing = await this.store.find(key, endpoint);

    if (existing) {
      if (existing.requestHash !== requestHash) {
        throw new BadRequestException('Idempotency-Key reused with different payload');
      }
      res.status(existing.statusCode).type('application/json').send(existing.responseBody);
      return;
    }

    const originalSend = res.send.bind(res);
    res.send = (body: unknown) => {
      const responseBody = typeof body === 'string' ? body : JSON.stringify(body);
      void this.store.save({
        key,
        endpoint,
        requestHash,
        responseBody,
        statusCode: res.statusCode,
      });
      return originalSend(body);
    };

    next();
  }
}
