import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import App from './App';
import { AuthProvider } from './modules/auth/AuthContext';
import { ProjectManagementProvider } from './modules/shared/context/ProjectManagementContext';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ProjectManagementProvider>
          <App />
        </ProjectManagementProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);