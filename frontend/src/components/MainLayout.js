import { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import api from '../utils/api';

export default function MainLayout({ children }) {
  const [workspaces, setWorkspaces] = useState([]);

  useEffect(() => {
    loadWorkspaces();
  }, []);

  const loadWorkspaces = async () => {
    try {
      const response = await api.getWorkspaces();
      setWorkspaces(response.data);
    } catch (error) {
      console.error('Error loading workspaces:', error);
    }
  };

  return (
    <>
      <Sidebar workspaces={workspaces} />
      {children}
    </>
  );
}
