import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../utils/api';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '', role: 'user', team_ids: [] });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [usersRes, teamsRes] = await Promise.all([
        api.getUsers(),
        api.getTeams()
      ]);
      setUsers(usersRes.data);
      setTeams(teamsRes.data);
    } catch (error) {
      toast.error('Error al cargar datos');
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('¿Está seguro de eliminar este usuario?')) return;
    try {
      await api.deleteUser(userId);
      toast.success('Usuario eliminado');
      loadData();
    } catch (error) {
      toast.error('Error al eliminar usuario');
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      password: '',
      role: user.role,
      team_ids: user.team_ids || []
    });
  };

  const handleSave = async () => {
    try {
      if (editingUser) {
        const updateData = { email: formData.email, role: formData.role, team_ids: formData.team_ids };
        await api.updateUser(editingUser.id, updateData);
        toast.success('Usuario actualizado');
      } else {
        await api.createUser(formData);
        toast.success('Usuario creado');
      }
      setEditingUser(null);
      setAddModalOpen(false);
      setFormData({ email: '', password: '', role: 'user', team_ids: [] });
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar usuario');
    }
  };

  const handleAddNew = () => {
    setEditingUser(null);
    setFormData({ email: '', password: '', role: 'user', team_ids: [] });
    setAddModalOpen(true);
  };

  return (
    <div className="flex-1 md:pl-64 min-h-screen bg-slate-50/50" data-testid="user-management">
      <div className="p-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2">Usuarios</h1>
            <p className="text-slate-600">Gestión de usuarios del sistema</p>
          </div>
          <Button onClick={handleAddNew} className="bg-primary hover:bg-primary/90" data-testid="add-user-button">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Usuario
          </Button>
        </div>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Lista de Usuarios</CardTitle>
            <CardDescription>{users.length} usuario(s) registrado(s)</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Equipos</TableHead>
                  <TableHead>Primer Login</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} data-testid={`user-row-${user.id}`}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                        {user.role}
                      </span>
                    </TableCell>
                    <TableCell>{user.team_ids?.length || 0} equipo(s)</TableCell>
                    <TableCell>{user.first_login ? 'Sí' : 'No'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(user)} data-testid={`edit-user-${user.id}`}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(user.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          data-testid={`delete-user-${user.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!editingUser || addModalOpen} onOpenChange={() => { setEditingUser(null); setAddModalOpen(false); }}>
        <DialogContent data-testid="user-form-modal">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</DialogTitle>
            <DialogDescription>Complete los datos del usuario</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Email</Label>
              <Input
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                data-testid="user-email-input"
              />
            </div>
            {!editingUser && (
              <div>
                <Label>Contraseña</Label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  data-testid="user-password-input"
                />
              </div>
            )}
            <div>
              <Label>Rol</Label>
              <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                <SelectTrigger data-testid="user-role-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Usuario</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setEditingUser(null); setAddModalOpen(false); }}>Cancelar</Button>
              <Button onClick={handleSave} data-testid="save-user-button">Guardar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}