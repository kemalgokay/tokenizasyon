import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  correlationId?: string;
}

@Catch()
export class ProblemJsonFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const title = exception instanceof HttpException ? exception.name : 'Internal Server Error';
    const detail = exception instanceof HttpException ? exception.message : 'Unexpected error';

    const payload: ProblemDetails = {
      type: 'about:blank',
      title,
      status,
      detail,
      instance: request.path,
      correlationId: request.headers['x-correlation-id'] as string | undefined,
    };

    response.status(status).type('application/problem+json').json(payload);
  }
}
