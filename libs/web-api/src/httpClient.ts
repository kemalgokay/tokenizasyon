import { getAuthHeaders } from './auth';
import { getCorrelationId } from './correlation';
import { ProblemDetailsError, type ProblemDetails } from './problem';

export interface RequestOptions {
  baseUrl: string;
  path: string;
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  idempotencyKey?: string;
}

export const requestJson = async <T>(options: RequestOptions): Promise<T> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Correlation-Id': getCorrelationId(),
    ...getAuthHeaders(),
    ...options.headers
  };
  if (options.idempotencyKey) {
    headers['Idempotency-Key'] = options.idempotencyKey;
  }
  const response = await fetch(`${options.baseUrl}${options.path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  if (!response.ok) {
    const problem = (await response.json()) as ProblemDetails;
    throw new ProblemDetailsError(problem);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  const text = await response.text();
  if (!text) {
    return undefined as T;
  }
  return JSON.parse(text) as T;
};
