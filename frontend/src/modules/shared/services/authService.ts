import { LoginCredentials } from '../../auth/AuthContext';
import { apiClient } from './apiClient';

interface ApiLoginResponse {
  accessToken: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    roleId: number;
    roleName: 'GESTOR' | 'COLABORADOR';
  };
}

export interface LoginResponse {
  token: string;
  user: ApiLoginResponse['user'];
}

const authService = {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      const { data } = await apiClient.post<ApiLoginResponse>('/auth/login', credentials);
      return {
        token: data.accessToken,
        user: data.user
      };
    } catch (error) {
      if (error instanceof Error && error.message) {
        throw new Error('Credenciales inválidas. Intenta nuevamente.');
      }
      throw new Error('No fue posible iniciar sesión. Intenta nuevamente.');
    }
  },
  logout() {
    // Aquí podríamos informar al backend para invalidar el token en el futuro.
  }
};

export default authService;