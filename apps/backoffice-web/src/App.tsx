import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { PageLayout } from '@tokenizasyon/web-ui';
import { getAuthContext } from '@tokenizasyon/web-api';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { AssetManagement } from './pages/AssetManagement';
import { TokenManagement } from './pages/TokenManagement';
import { Operations } from './pages/Operations';
import { CorporateActions } from './pages/CorporateActions';
import { Redemptions } from './pages/Redemptions';
import { TradingAdmin } from './pages/TradingAdmin';
import { MarketMakerAdmin } from './pages/MarketMakerAdmin';
import { AuditEvents } from './pages/AuditEvents';

const menuItems = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'assets', label: 'Asset Management' },
  { key: 'tokens', label: 'Token Management' },
  { key: 'operations', label: 'Operations' },
  { key: 'corporate-actions', label: 'Corporate Actions' },
  { key: 'redemptions', label: 'Redemptions' },
  { key: 'trading-admin', label: 'Trading Venue Admin' },
  { key: 'mm-admin', label: 'Market Maker Admin' },
  { key: 'audit-events', label: 'Audit & Events' }
];

const routeMap: Record<string, string> = {
  dashboard: '/',
  assets: '/assets',
  tokens: '/tokens',
  operations: '/operations',
  'corporate-actions': '/corporate-actions',
  redemptions: '/redemptions',
  'trading-admin': '/trading-admin',
  'mm-admin': '/mm-admin',
  'audit-events': '/audit-events'
};

const LayoutWrapper = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const selectedKey = Object.keys(routeMap).find((key) => routeMap[key] === location.pathname) ?? 'dashboard';

  return (
    <PageLayout
      title="Backoffice"
      menuItems={menuItems}
      selectedKey={selectedKey}
      onMenuSelect={(key) => navigate(routeMap[key] ?? '/')}
    >
      {children}
    </PageLayout>
  );
};

const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const auth = getAuthContext();
  if (!auth) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const App = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <RequireAuth>
            <LayoutWrapper>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/assets" element={<AssetManagement />} />
                <Route path="/tokens" element={<TokenManagement />} />
                <Route path="/operations" element={<Operations />} />
                <Route path="/corporate-actions" element={<CorporateActions />} />
                <Route path="/redemptions" element={<Redemptions />} />
                <Route path="/trading-admin" element={<TradingAdmin />} />
                <Route path="/mm-admin" element={<MarketMakerAdmin />} />
                <Route path="/audit-events" element={<AuditEvents />} />
              </Routes>
            </LayoutWrapper>
          </RequireAuth>
        }
      />
    </Routes>
  );
};

export default App;
