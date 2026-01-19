export interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  errors?: Record<string, string[]>;
}

export class ProblemDetailsError extends Error {
  constructor(public problem: ProblemDetails) {
    super(problem.title ?? 'Request failed');
    this.name = 'ProblemDetailsError';
  }
}

export const formatProblemDetails = (problem: ProblemDetails): string => {
  if (problem.detail) {
    return problem.detail;
  }
  if (problem.title) {
    return problem.title;
  }
  return 'Unexpected error';
};
