import { Navigate, Route, Routes } from 'react-router-dom';
import { getAuthContext } from '@tokenizasyon/web-api';
import { Login } from './pages/Login';
import { TraderTerminal } from './pages/TraderTerminal';

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
        path="/"
        element={
          <RequireAuth>
            <TraderTerminal />
          </RequireAuth>
        }
      />
    </Routes>
  );
};

export default App;
