import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';

export interface AuditEntry {
  aggregateType: string;
  aggregateId: string;
  action: string;
  actorId: string;
  role: string;
  beforeHash: string | null;
  afterHash: string | null;
  createdAt: string;
}

@Injectable()
export class AuditLogger {
  private entries: AuditEntry[] = [];

  record(params: Omit<AuditEntry, 'beforeHash' | 'afterHash' | 'createdAt'> & { before: unknown; after: unknown }): AuditEntry {
    const beforeHash = params.before ? createHash('sha256').update(JSON.stringify(params.before)).digest('hex') : null;
    const afterHash = params.after ? createHash('sha256').update(JSON.stringify(params.after)).digest('hex') : null;
    const entry: AuditEntry = {
      aggregateType: params.aggregateType,
      aggregateId: params.aggregateId,
      action: params.action,
      actorId: params.actorId,
      role: params.role,
      beforeHash,
      afterHash,
      createdAt: new Date().toISOString(),
    };
    this.entries.push(entry);
    return entry;
  }

  list(): AuditEntry[] {
    return [...this.entries];
  }
}
