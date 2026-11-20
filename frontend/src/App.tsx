import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { RequireRole } from './routes/guards';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Portals from './pages/portal/Portals';
import Journals from './pages/portal/Journals';
import MedicalLibrary from './pages/portal/MedicalLibrary';
import Authorities from './pages/portal/Authorities';
import Events from './pages/portal/Events';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/portals" element={<Portals />} />
        <Route path="/journals" element={<Journals />} />
        <Route path="/medical-library" element={<MedicalLibrary />} />
        <Route path="/authorities" element={<Authorities />} />
        <Route path="/events" element={<Events />} />
        {/* Role-gated app sections (S2/S3 features mount here) */}
        <Route
          path="/dashboard"
          element={
            <RequireRole roles={['doctor', 'pharmacist', 'admin']}>
              <Home />
            </RequireRole>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
