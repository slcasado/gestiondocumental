import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ChangePasswordModal from '../components/ChangePasswordModal';
import api from '../utils/api';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState([]);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  useEffect(() => {
    if (user?.first_login) {
      setShowPasswordModal(true);
    }
  }, [user]);

  useEffect(() => {
    loadWorkspaces();
  }, []);

  const loadWorkspaces = async () => {
    try {
      const response = await api.getWorkspaces();
      setWorkspaces(response.data);
      
      // Auto-navigate to first workspace
      if (response.data.length > 0) {
        navigate(`/workspace/${response.data[0].id}`);
      }
    } catch (error) {
      console.error('Error loading workspaces:', error);
    }
  };

  return (
    <>
      <Sidebar workspaces={workspaces} />
      <div className="flex-1 md:pl-64 min-h-screen bg-slate-50/50" data-testid="dashboard">
        <div className="p-8">
          <h1 className="text-4xl font-bold tracking-tight mb-2">Bienvenido</h1>
          <p className="text-slate-600">Seleccione un espacio de trabajo del menú lateral</p>
        </div>
      </div>
      <ChangePasswordModal
        open={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />
    </>
  );
}