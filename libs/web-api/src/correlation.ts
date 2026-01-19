import { v4 as uuid } from 'uuid';
import { STORAGE_KEYS } from './storage';

export const getCorrelationId = (): string => {
  const existing = localStorage.getItem(STORAGE_KEYS.correlationId);
  if (existing) {
    return existing;
  }
  const next = uuid();
  localStorage.setItem(STORAGE_KEYS.correlationId, next);
  return next;
};

export const refreshCorrelationId = (): string => {
  const next = uuid();
  localStorage.setItem(STORAGE_KEYS.correlationId, next);
  return next;
};
