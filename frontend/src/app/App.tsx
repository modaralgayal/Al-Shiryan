import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from '../shared/components/Layout';
import { RequireRole } from './guards';
import Home from '../features/portal/pages/Home';
import Login from '../features/auth/pages/Login';
import Register from '../features/auth/pages/Register';
import Portals from '../features/portal/pages/Portals';
import Journals from '../features/portal/pages/Journals';
import EducationPortal from '../features/portal/pages/EducationPortal';
import Authorities from '../features/portal/pages/Authorities';
import Events from '../features/portal/pages/Events';
import PatientRecords from '../features/patients/pages/PatientRecords';
import PrescriptionWriter from '../features/prescriptions/pages/PrescriptionWriter';
import PrescriptionList from '../features/prescriptions/pages/PrescriptionList';
import PatientSearch from '../features/patients/pages/PatientSearch';
import PharmacistFulfillment from '../features/pharmacist/pages/PharmacistFulfillment';
import AdminPanel from '../features/admin/pages/AdminPanel';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/portals" element={<Portals />} />
        <Route path="/journals" element={<Journals />} />
        <Route path="/education-portal" element={<EducationPortal />} />
        <Route path="/medical-library" element={<Navigate to="/education-portal" replace />} />
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
        <Route
          path="/patients"
          element={
            <RequireRole roles={['doctor', 'admin']}>
              <PatientRecords />
            </RequireRole>
          }
        />
        <Route
          path="/prescriptions/new"
          element={
            <RequireRole roles={['doctor']}>
              <PrescriptionWriter />
            </RequireRole>
          }
        />
        <Route
          path="/prescriptions"
          element={
            <RequireRole roles={['doctor', 'admin']}>
              <PrescriptionList />
            </RequireRole>
          }
        />
        <Route
          path="/patient-prescriptions"
          element={
            <RequireRole roles={['doctor', 'admin']}>
              <PatientSearch />
            </RequireRole>
          }
        />
        <Route
          path="/fulfill"
          element={
            <RequireRole roles={['pharmacist']}>
              <PharmacistFulfillment />
            </RequireRole>
          }
        />
        <Route
          path="/admin"
          element={
            <RequireRole roles={['admin']}>
              <AdminPanel />
            </RequireRole>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
