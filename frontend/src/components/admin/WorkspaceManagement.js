import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Checkbox } from '../ui/checkbox';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../utils/api';


export default function WorkspaceManagement() {
  const [workspaces, setWorkspaces] = useState([]);
  const [teams, setTeams] = useState([]);
  const [metadata, setMetadata] = useState([]);
  const [editingWorkspace, setEditingWorkspace] = useState(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', metadata_ids: [], team_ids: [] });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [workspacesRes, teamsRes, metaRes] = await Promise.all([
        api.getWorkspaces(),
        api.getTeams(),
        api.getMetadata()
      ]);
      setWorkspaces(workspacesRes.data);
      setTeams(teamsRes.data);
      setMetadata(metaRes.data);
    } catch (error) {
      toast.error('Error al cargar datos');
    }
  };

  const handleDelete = async (workspaceId) => {
    if (!window.confirm('¿Está seguro de eliminar este espacio? Se eliminarán todos los documentos.')) return;
    try {
      await api.deleteWorkspace(workspaceId);
      toast.success('Espacio eliminado');
      loadData();
    } catch (error) {
      toast.error('Error al eliminar espacio');
    }
  };

  const handleEdit = (workspace) => {
    setEditingWorkspace(workspace);
    setFormData({
      name: workspace.name,
      description: workspace.description || '',
      metadata_ids: workspace.metadata_ids || [],
      team_ids: workspace.team_ids || []
    });
  };

  const handleSave = async () => {
    try {
      if (editingWorkspace) {
        await api.updateWorkspace(editingWorkspace.id, formData);
        toast.success('Espacio actualizado');
      } else {
        await api.createWorkspace(formData);
        toast.success('Espacio creado');
      }
      setEditingWorkspace(null);
      setAddModalOpen(false);
      setFormData({ name: '', description: '', metadata_ids: [], team_ids: [] });
      loadData();
    } catch (error) {
      toast.error('Error al guardar espacio');
    }
  };

  const handleAddNew = () => {
    setEditingWorkspace(null);
    setFormData({ name: '', description: '', metadata_ids: [], team_ids: [] });
    setAddModalOpen(true);
  };

  const toggleMetadata = (metaId) => {
    setFormData(prev => ({
      ...prev,
      metadata_ids: prev.metadata_ids.includes(metaId)
        ? prev.metadata_ids.filter(id => id !== metaId)
        : [...prev.metadata_ids, metaId]
    }));
  };

  const toggleTeam = (teamId) => {
    setFormData(prev => ({
      ...prev,
      team_ids: prev.team_ids.includes(teamId)
        ? prev.team_ids.filter(id => id !== teamId)
        : [...prev.team_ids, teamId]
    }));
  };

  return (
<div className="flex-1 md:pl-64 min-h-screen bg-slate-50/50" data-testid="workspace-management">
      
      <div className="flex-1 md:pl-64 min-h-screen bg-slate-50/50" data-testid="workspace-management">
        <div className="p-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-4xl font-bold tracking-tight mb-2">Espacios</h1>
              <p className="text-slate-600">Gestión de espacios de trabajo</p>
            </div>
            <Button onClick={handleAddNew} className="bg-primary hover:bg-primary/90" data-testid="add-workspace-button">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Espacio
            </Button>
          </div>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Lista de Espacios</CardTitle>
              <CardDescription>{workspaces.length} espacio(s) registrado(s)</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Metadatos</TableHead>
                    <TableHead>Equipos</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workspaces.map((workspace) => (
                    <TableRow key={workspace.id} data-testid={`workspace-row-${workspace.id}`}>
                      <TableCell className="font-medium">{workspace.name}</TableCell>
                      <TableCell className="text-slate-600">{workspace.description || '-'}</TableCell>
                      <TableCell>{workspace.metadata_ids?.length || 0} metadato(s)</TableCell>
                      <TableCell>{workspace.team_ids?.length || 0} equipo(s)</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(workspace)} data-testid={`edit-workspace-${workspace.id}`}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(workspace.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            data-testid={`delete-workspace-${workspace.id}`}
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
      </div>

      <Dialog open={!!editingWorkspace || addModalOpen} onOpenChange={() => { setEditingWorkspace(null); setAddModalOpen(false); }}>
        <DialogContent className="max-w-2xl" data-testid="workspace-form-modal">
          <DialogHeader>
            <DialogTitle>{editingWorkspace ? 'Editar Espacio' : 'Nuevo Espacio'}</DialogTitle>
            <DialogDescription>Complete los datos del espacio</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Nombre</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                data-testid="workspace-name-input"
              />
            </div>
            <div>
              <Label>Descripción</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                data-testid="workspace-description-input"
              />
            </div>
            <div>
              <Label>Metadatos Asignados</Label>
              <div className="border rounded-md p-4 max-h-40 overflow-y-auto space-y-2">
                {metadata.map((meta) => (
                  <div key={meta.id} className="flex items-center gap-2">
                    <Checkbox
                      checked={formData.metadata_ids.includes(meta.id)}
                      onCheckedChange={() => toggleMetadata(meta.id)}
                      data-testid={`metadata-checkbox-${meta.id}`}
                    />
                    <span className="text-sm">{meta.name}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Label>Equipos con Acceso</Label>
              <div className="border rounded-md p-4 max-h-40 overflow-y-auto space-y-2">
                {teams.map((team) => (
                  <div key={team.id} className="flex items-center gap-2">
                    <Checkbox
                      checked={formData.team_ids.includes(team.id)}
                      onCheckedChange={() => toggleTeam(team.id)}
                      data-testid={`team-checkbox-${team.id}`}
                    />
                    <span className="text-sm">{team.name}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setEditingWorkspace(null); setAddModalOpen(false); }}>Cancelar</Button>
              <Button onClick={handleSave} data-testid="save-workspace-button">Guardar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
</div>
  );
}