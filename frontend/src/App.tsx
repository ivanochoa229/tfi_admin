import { Navigate, Route, Routes } from 'react-router-dom';

import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './modules/shared/layout/AppLayout';
import DashboardPage from './modules/dashboard/pages/DashboardPage';
import LoginPage from './modules/auth/pages/LoginPage';
import CreateProjectPage from './modules/projects/pages/CreateProjectPage';
import ProjectDetailPage from './modules/projects/pages/ProjectDetailPage';
import ProjectsPage from './modules/projects/pages/ProjectsPage';
import ReportsPage from './modules/reports/pages/ReportsPage';
import TeamsPage from './modules/teams/pages/TeamsPage';
import RegisterUserPage from './modules/users/pages/RegisterUserPage';

const App = () => (
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route
      path="/"
      element={
        <ProtectedRoute>
          <AppLayout />
        </ProtectedRoute>
      }
    >
      <Route index element={<DashboardPage />} />
      <Route path="projects" element={<ProjectsPage />} />
      <Route
        path="projects/new"
        element={
          <ProtectedRoute allowedRoles={['Gestor de proyecto']}>
            <CreateProjectPage />
          </ProtectedRoute>
        }
      />
      <Route path="projects/:projectId" element={<ProjectDetailPage />} />
      <Route
        path="teams"
        element={
          <ProtectedRoute allowedRoles={['Gestor de proyecto']}>
            <TeamsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="reports"
        element={
          <ProtectedRoute allowedRoles={['Gestor de proyecto']}>
            <ReportsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="users/register"
        element={
          <ProtectedRoute allowedRoles={['Gestor de proyecto']}>
            <RegisterUserPage />
          </ProtectedRoute>
        }
      />
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export default App;