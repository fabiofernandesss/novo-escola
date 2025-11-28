import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Auth from './pages/Auth';
import AwaitingApproval from './pages/AwaitingApproval';
import ResponsibleDashboard from './pages/ResponsibleDashboard';
import AdminLayout from './layouts/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminSchools from './pages/admin/AdminSchools';
import AdminClasses from './pages/admin/AdminClasses';
import AdminGrades from './pages/admin/AdminGrades';
import AdminDevices from './pages/admin/AdminDevices';
import AdminCameras from './pages/admin/AdminCameras';
import AdminStudents from './pages/admin/AdminStudents';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/awaiting-approval" element={<AwaitingApproval />} />
        <Route path="/responsavel" element={<ResponsibleDashboard />} />

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="usuarios" element={<AdminUsers />} />
          <Route path="escolas" element={<AdminSchools />} />
          <Route path="turmas" element={<AdminClasses />} />
          <Route path="series" element={<AdminGrades />} />
          <Route path="dispositivos" element={<AdminDevices />} />
          <Route path="cameras" element={<AdminCameras />} />
          <Route path="alunos" element={<AdminStudents />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
