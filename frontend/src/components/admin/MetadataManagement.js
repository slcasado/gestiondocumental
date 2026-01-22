import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../utils/api';


export default function MetadataManagement() {
  const [metadata, setMetadata] = useState([]);
  
  const [editingMeta, setEditingMeta] = useState(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', field_type: 'text', visible: true, options: [] });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [metaRes] = await Promise.all([
        api.getMetadata()
      ]);
      setMetadata(metaRes.data);
    } catch (error) {
      toast.error('Error al cargar datos');
    }
  };

  const handleDelete = async (metaId) => {
    if (!window.confirm('¿Está seguro de eliminar este metadato?')) return;
    try {
      await api.deleteMetadata(metaId);
      toast.success('Metadato eliminado');
      loadData();
    } catch (error) {
      toast.error('Error al eliminar metadato');
    }
  };

  const handleEdit = (meta) => {
    setEditingMeta(meta);
    setFormData({
      name: meta.name,
      field_type: meta.field_type,
      visible: meta.visible,
      options: meta.options || []
    });
  };

  const handleSave = async () => {
    try {
      if (editingMeta) {
        await api.updateMetadata(editingMeta.id, formData);
        toast.success('Metadato actualizado');
      } else {
        await api.createMetadata(formData);
        toast.success('Metadato creado');
      }
      setEditingMeta(null);
      setAddModalOpen(false);
      setFormData({ name: '', field_type: 'text', visible: true, options: [] });
      loadData();
    } catch (error) {
      toast.error('Error al guardar metadato');
    }
  };

  const handleAddNew = () => {
    setEditingMeta(null);
    setFormData({ name: '', field_type: 'text', visible: true, options: [] });
    setAddModalOpen(true);
  };

  return (
    <div className="flex-1 md:pl-64 min-h-screen bg-slate-50/50" data-testid="metadata-management">
      <div className="p-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-4xl font-bold tracking-tight mb-2">Metadatos</h1>
              <p className="text-slate-600">Definiciones de metadatos para documentos</p>
            </div>
            <Button onClick={handleAddNew} className="bg-primary hover:bg-primary/90" data-testid="add-metadata-button">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Metadato
            </Button>
          </div>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Lista de Metadatos</CardTitle>
              <CardDescription>{metadata.length} metadato(s) registrado(s)</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Visible</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metadata.map((meta) => (
                    <TableRow key={meta.id} data-testid={`metadata-row-${meta.id}`}>
                      <TableCell className="font-medium">{meta.name}</TableCell>
                      <TableCell>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                          {meta.field_type}
                        </span>
                      </TableCell>
                      <TableCell>{meta.visible ? 'Sí' : 'No'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(meta)} data-testid={`edit-metadata-${meta.id}`}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(meta.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            data-testid={`delete-metadata-${meta.id}`}
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

      <Dialog open={!!editingMeta || addModalOpen} onOpenChange={() => { setEditingMeta(null); setAddModalOpen(false); }}>
        <DialogContent data-testid="metadata-form-modal">
          <DialogHeader>
            <DialogTitle>{editingMeta ? 'Editar Metadato' : 'Nuevo Metadato'}</DialogTitle>
            <DialogDescription>Complete los datos del metadato</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Nombre</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                data-testid="metadata-name-input"
              />
            </div>
            <div>
              <Label>Tipo de Campo</Label>
              <Select value={formData.field_type} onValueChange={(value) => setFormData({ ...formData, field_type: value })}>
                <SelectTrigger data-testid="metadata-type-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Texto</SelectItem>
                  <SelectItem value="number">Número</SelectItem>
                  <SelectItem value="date">Fecha</SelectItem>
                  <SelectItem value="select">Selección</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.visible}
                onCheckedChange={(checked) => setFormData({ ...formData, visible: checked })}
                data-testid="metadata-visible-switch"
              />
              <Label>Visible en lista de documentos</Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setEditingMeta(null); setAddModalOpen(false); }}>Cancelar</Button>
              <Button onClick={handleSave} data-testid="save-metadata-button">Guardar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}