import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';

export type Role =
  | 'ADMIN'
  | 'ISSUER'
  | 'OPS'
  | 'AUDITOR'
  | 'TRADER'
  | 'MARKET_MAKER';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RbacGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const requiredRoles: Role[] = Reflect.getMetadata(ROLES_KEY, context.getHandler()) ?? [];
    const actorId = request.header('X-Actor-Id');
    const actorRole = request.header('X-Actor-Role');

    if (!actorId || !actorRole) {
      throw new UnauthorizedException('Missing actor headers');
    }

    if (requiredRoles.length > 0 && !requiredRoles.includes(actorRole)) {
      throw new ForbiddenException('Insufficient role');
    }

    request.actor = { id: actorId, role: actorRole };
    return true;
  }
}
