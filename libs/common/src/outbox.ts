import { Injectable } from '@nestjs/common';

export interface OutboxEvent {
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
  status: 'PENDING' | 'SENT';
  createdAt: string;
}

@Injectable()
export class OutboxService {
  private events: OutboxEvent[] = [];

  enqueue(event: Omit<OutboxEvent, 'status' | 'createdAt'>): OutboxEvent {
    const stored: OutboxEvent = {
      ...event,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };
    this.events.push(stored);
    return stored;
  }

  list(): OutboxEvent[] {
    return [...this.events];
  }
}
