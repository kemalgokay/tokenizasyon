import { Navigate, Route, Routes } from 'react-router-dom';
import { getAuthContext } from '@tokenizasyon/web-api';
import { Login } from './pages/Login';
import { AuditorView } from './pages/AuditorView';

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
            <AuditorView />
          </RequireAuth>
        }
      />
    </Routes>
  );
};

export default App;
