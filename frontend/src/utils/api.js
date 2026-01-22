import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

export const api = {
  // Users
  getUsers: () => axios.get(`${API_URL}/users`),
  createUser: (data) => axios.post(`${API_URL}/users`, data),
  updateUser: (id, data) => axios.put(`${API_URL}/users/${id}`, data),
  deleteUser: (id) => axios.delete(`${API_URL}/users/${id}`),

  // Teams
  getTeams: () => axios.get(`${API_URL}/teams`),
  createTeam: (data) => axios.post(`${API_URL}/teams`, data),
  updateTeam: (id, data) => axios.put(`${API_URL}/teams/${id}`, data),
  deleteTeam: (id) => axios.delete(`${API_URL}/teams/${id}`),

  // Metadata
  getMetadata: () => axios.get(`${API_URL}/metadata`),
  createMetadata: (data) => axios.post(`${API_URL}/metadata`, data),
  updateMetadata: (id, data) => axios.put(`${API_URL}/metadata/${id}`, data),
  deleteMetadata: (id) => axios.delete(`${API_URL}/metadata/${id}`),

  // Workspaces
  getWorkspaces: () => axios.get(`${API_URL}/workspaces`),
  createWorkspace: (data) => axios.post(`${API_URL}/workspaces`, data),
  updateWorkspace: (id, data) => axios.put(`${API_URL}/workspaces/${id}`, data),
  deleteWorkspace: (id) => axios.delete(`${API_URL}/workspaces/${id}`),

  // Documents
  getDocuments: (workspaceId) => axios.get(`${API_URL}/workspaces/${workspaceId}/documents`),
  createDocument: (workspaceId, data) => axios.post(`${API_URL}/workspaces/${workspaceId}/documents`, data),
  updateDocument: (id, data) => axios.put(`${API_URL}/documents/${id}`, data),
  deleteDocument: (id) => axios.delete(`${API_URL}/documents/${id}`),
  searchDocuments: (query) => axios.get(`${API_URL}/documents/search?q=${encodeURIComponent(query)}`),
  getDocumentUrl: (docId) => `${API_URL}/documents/${docId}/view`,
  getPublicDocumentUrl: (publicUrl) => `${API_URL}/public/documents/${publicUrl}`
};

export default api;