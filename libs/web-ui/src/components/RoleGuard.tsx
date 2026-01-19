import { Alert } from 'antd';
import { getAuthContext, type ActorRole } from '@tokenizasyon/web-api';

export interface RoleGuardProps {
  allowed: ActorRole[];
  children: React.ReactNode;
}

export const RoleGuard = ({ allowed, children }: RoleGuardProps) => {
  const auth = getAuthContext();
  if (!auth) {
    return <Alert type="warning" message="Login required" />;
  }
  if (!allowed.includes(auth.actorRole)) {
    return <Alert type="error" message="Access denied for this role" />;
  }
  return <>{children}</>;
};
