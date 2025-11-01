import { NavLink, Outlet } from 'react-router-dom';

import { useAuth } from '../../auth/AuthContext';
import './AppLayout.css';

const AppLayout = () => {
  const { user, logout } = useAuth();
  const isManager = user?.role === 'Gestor de proyecto';
  const displayName = user ? `${user.firstName} ${user.lastName}` : '';

  return (
    <div className="app-layout">
      <header className="app-header">
        <div>
          <h1>Gestión de Proyectos</h1>
          <span className="app-header__subtitle">
            {isManager ? 'Panel administrativo' : 'Seguimiento de mis proyectos'}
          </span>
        </div>
        <div className="app-header__user">
          <div className="app-header__user-info">
            <span>{displayName}</span>
            <small>{user?.role}</small>
          </div>
          <button type="button" onClick={logout}>
            Cerrar sesión
          </button>
        </div>
      </header>
      <div className="app-body">
        <nav className="app-nav">
          <NavLink to="/" end>
            Inicio
          </NavLink>
          <NavLink to="/projects" end>
            {isManager ? 'Proyectos' : 'Mis proyectos'}
          </NavLink>
          {isManager && <NavLink to="/projects/new">Crear proyecto</NavLink>}
          {isManager && <NavLink to="/teams">Equipos</NavLink>}
          {isManager && <NavLink to="/reports">Reportes</NavLink>}
          {isManager && <NavLink to="/users/register">Usuarios</NavLink>}
        </nav>
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;