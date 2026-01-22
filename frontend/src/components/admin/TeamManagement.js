import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../utils/api';

export default function TeamManagement() {
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [editingTeam, setEditingTeam] = useState(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', user_ids: [] });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [teamsRes, usersRes] = await Promise.all([
        api.getTeams(),
        api.getUsers()
      ]);
      setTeams(teamsRes.data);
      setUsers(usersRes.data);
    } catch (error) {
      toast.error('Error al cargar datos');
    }
  };

  const handleDelete = async (teamId) => {
    if (!window.confirm('¿Está seguro de eliminar este equipo?')) return;
    try {
      await api.deleteTeam(teamId);
      toast.success('Equipo eliminado');
      loadData();
    } catch (error) {
      toast.error('Error al eliminar equipo');
    }
  };

  const handleEdit = (team) => {
    setEditingTeam(team);
    setFormData({
      name: team.name,
      description: team.description || '',
      user_ids: team.user_ids || []
    });
  };

  const handleSave = async () => {
    try {
      if (editingTeam) {
        await api.updateTeam(editingTeam.id, formData);
        toast.success('Equipo actualizado');
      } else {
        await api.createTeam(formData);
        toast.success('Equipo creado');
      }
      setEditingTeam(null);
      setAddModalOpen(false);
      setFormData({ name: '', description: '', user_ids: [] });
      loadData();
    } catch (error) {
      toast.error('Error al guardar equipo');
    }
  };

  const handleAddNew = () => {
    setEditingTeam(null);
    setFormData({ name: '', description: '', user_ids: [] });
    setAddModalOpen(true);
  };

  return (
    <div className="flex-1 md:pl-64 min-h-screen bg-slate-50/50" data-testid="team-management">
        <div className="p-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-4xl font-bold tracking-tight mb-2">Equipos</h1>
              <p className="text-slate-600">Gestión de equipos y asignación de usuarios</p>
            </div>
            <Button onClick={handleAddNew} className="bg-primary hover:bg-primary/90" data-testid="add-team-button">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Equipo
            </Button>
          </div>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Lista de Equipos</CardTitle>
              <CardDescription>{teams.length} equipo(s) registrado(s)</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Miembros</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teams.map((team) => (
                    <TableRow key={team.id} data-testid={`team-row-${team.id}`}>
                      <TableCell className="font-medium">{team.name}</TableCell>
                      <TableCell className="text-slate-600">{team.description || '-'}</TableCell>
                      <TableCell>{team.user_ids?.length || 0} usuario(s)</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(team)} data-testid={`edit-team-${team.id}`}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(team.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            data-testid={`delete-team-${team.id}`}
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

      <Dialog open={!!editingTeam || addModalOpen} onOpenChange={() => { setEditingTeam(null); setAddModalOpen(false); }}>
        <DialogContent className="max-w-2xl" data-testid="team-form-modal">
          <DialogHeader>
            <DialogTitle>{editingTeam ? 'Editar Equipo' : 'Nuevo Equipo'}</DialogTitle>
            <DialogDescription>Complete los datos del equipo y asigne usuarios</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Nombre</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                data-testid="team-name-input"
              />
            </div>
            <div>
              <Label>Descripción</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                data-testid="team-description-input"
              />
            </div>
            <div>
              <Label>Usuarios Asignados</Label>
              <div className="border rounded-md p-4 max-h-48 overflow-y-auto space-y-2">
                {users.length === 0 ? (
                  <p className="text-sm text-slate-500">No hay usuarios disponibles</p>
                ) : (
                  users.map((user) => (
                    <div key={user.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`user-${user.id}`}
                        checked={formData.user_ids.includes(user.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({ ...formData, user_ids: [...formData.user_ids, user.id] });
                          } else {
                            setFormData({ ...formData, user_ids: formData.user_ids.filter(id => id !== user.id) });
                          }
                        }}
                        className="rounded border-slate-300 text-primary focus:ring-primary"
                        data-testid={`user-checkbox-${user.id}`}
                      />
                      <label htmlFor={`user-${user.id}`} className="text-sm cursor-pointer flex-1">
                        {user.email}
                        <span className="ml-2 text-xs text-slate-500">({user.role})</span>
                      </label>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setEditingTeam(null); setAddModalOpen(false); }}>Cancelar</Button>
              <Button onClick={handleSave} data-testid="save-team-button">Guardar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}