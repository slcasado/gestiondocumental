import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Search, Edit, Trash2, ExternalLink, FileText, Plus, Link2, Copy, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import api from '../utils/api';
import { formatDateSpanish } from '../utils/dateFormat';
import { copyToClipboard } from '../utils/clipboard';

export default function WorkspaceView() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const [workspace, setWorkspace] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [metadataDefinitions, setMetadataDefinitions] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredDocuments, setFilteredDocuments] = useState([]);
  const [editingDoc, setEditingDoc] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [addDocModalOpen, setAddDocModalOpen] = useState(false);
  const [newDocData, setNewDocData] = useState({ file_name: '', file_path: '', metadata: {} });
  const [publicUrlModalOpen, setPublicUrlModalOpen] = useState(false);
  const [selectedDocForUrl, setSelectedDocForUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorkspace();
    loadDocuments();
    loadMetadata();
  }, [workspaceId]);

  useEffect(() => {
    if (searchQuery) {
      const filtered = documents.filter(doc =>
        doc.file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.file_path.toLowerCase().includes(searchQuery.toLowerCase()) ||
        JSON.stringify(doc.metadata).toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredDocuments(filtered);
    } else {
      setFilteredDocuments(documents);
    }
  }, [searchQuery, documents]);

  const loadWorkspace = async () => {
    try {
      const response = await api.getWorkspaces();
      const ws = response.data.find(w => w.id === workspaceId);
      setWorkspace(ws);
    } catch (error) {
      toast.error('Error al cargar el espacio');
    }
  };

  const loadDocuments = async () => {
    try {
      const response = await api.getDocuments(workspaceId);
      setDocuments(response.data);
      setFilteredDocuments(response.data);
    } catch (error) {
      toast.error('Error al cargar documentos');
    } finally {
      setLoading(false);
    }
  };

  const loadMetadata = async () => {
    try {
      const response = await api.getMetadata();
      const metaMap = {};
      response.data.forEach(meta => {
        metaMap[meta.id] = meta;
      });
      setMetadataDefinitions(metaMap);
    } catch (error) {
      console.error('Error loading metadata');
    }
  };

  const handleDelete = async (docId) => {
    if (!window.confirm('¿Está seguro de eliminar este documento?')) return;

    try {
      await api.deleteDocument(docId);
      toast.success('Documento eliminado');
      loadDocuments();
    } catch (error) {
      toast.error('Error al eliminar documento');
    }
  };

  const handleEdit = (doc) => {
    setEditingDoc(doc);
    setEditFormData({
      file_name: doc.file_name,
      file_path: doc.file_path,
      metadata: doc.metadata || {}
    });
  };

  const handleSaveEdit = async () => {
    try {
      await api.updateDocument(editingDoc.id, editFormData);
      toast.success('Documento actualizado');
      setEditingDoc(null);
      loadDocuments();
    } catch (error) {
      toast.error('Error al actualizar documento');
    }
  };

  const handleAddDocument = async () => {
    try {
      await api.createDocument(workspaceId, newDocData);
      toast.success('Documento creado');
      setAddDocModalOpen(false);
      setNewDocData({ file_name: '', file_path: '', metadata: {} });
      loadDocuments();
    } catch (error) {
      toast.error('Error al crear documento');
    }
  };

  const handleShowPublicUrl = (doc) => {
    setSelectedDocForUrl(doc);
    setPublicUrlModalOpen(true);
  };

  const copyPublicUrl = async () => {
    if (selectedDocForUrl) {
      const publicUrl = `${window.location.origin}/public/${selectedDocForUrl.public_url}`;
      const result = await copyToClipboard(publicUrl);
      
      if (result.success) {
        toast.success('URL pública copiada al portapapeles');
      } else {
        // Show input field for manual copy if all methods fail
        toast.error('No se pudo copiar automáticamente. Seleccione y copie la URL manualmente.');
      }
    }
  };

  const getVisibleMetadataFields = () => {
    if (!workspace?.metadata_ids) return [];
    return workspace.metadata_ids
      .map(id => metadataDefinitions[id])
      .filter(meta => meta && meta.visible);
  };

  const visibleFields = getVisibleMetadataFields();

  return (
    <div className="flex-1 md:pl-64 min-h-screen bg-slate-50/50" data-testid="workspace-view">
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-4xl font-bold tracking-tight mb-2">{workspace?.name || 'Espacio'}</h1>
          <p className="text-slate-600">{workspace?.description || 'Gestión de documentos'}</p>
        </div>

        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
            <Input
              placeholder="Buscar documentos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="search-documents-input"
            />
          </div>
          <Button
            onClick={() => setAddDocModalOpen(true)}
            className="bg-primary hover:bg-primary/90"
            data-testid="add-document-button"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Documento
          </Button>
        </div>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Documentos</CardTitle>
            <CardDescription>{filteredDocuments.length} documento(s) encontrado(s)</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center py-8 text-slate-500">Cargando...</p>
            ) : filteredDocuments.length === 0 ? (
              <p className="text-center py-8 text-slate-500">No hay documentos</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Ruta</TableHead>
                    {visibleFields.map(field => (
                      <TableHead key={field.id}>{field.name}</TableHead>
                    ))}
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((doc) => (
                    <TableRow key={doc.id} data-testid={`document-row-${doc.id}`}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-slate-400" />
                          {doc.file_name}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">{doc.file_path}</TableCell>
                      {visibleFields.map(field => (
                        <TableCell key={field.id} className="text-sm">
                          {doc.metadata?.[field.name] || '-'}
                        </TableCell>
                      ))}
                      <TableCell className="text-sm text-slate-600">
                        {formatDateSpanish(doc.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleShowPublicUrl(doc)}
                            title="Ver URL pública"
                            data-testid={`show-public-url-${doc.id}`}
                          >
                            <Link2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => window.open(api.getDocumentUrl(doc.id), '_blank')}
                            data-testid={`view-document-${doc.id}`}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(doc)}
                            data-testid={`edit-document-${doc.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(doc.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            data-testid={`delete-document-${doc.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Document Modal */}
      <Dialog open={!!editingDoc} onOpenChange={() => setEditingDoc(null)}>
        <DialogContent className="max-w-2xl" data-testid="edit-document-modal">
          <DialogHeader>
            <DialogTitle>Editar Documento</DialogTitle>
            <DialogDescription>Modifique los datos del documento</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Nombre del Archivo</Label>
              <Input
                value={editFormData.file_name || ''}
                onChange={(e) => setEditFormData({ ...editFormData, file_name: e.target.value })}
                data-testid="edit-file-name-input"
              />
            </div>
            <div>
              <Label>Ruta del Archivo</Label>
              <Input
                value={editFormData.file_path || ''}
                onChange={(e) => setEditFormData({ ...editFormData, file_path: e.target.value })}
                data-testid="edit-file-path-input"
              />
            </div>
            <div>
              <Label>Metadatos (JSON)</Label>
              <textarea
                className="w-full p-2 border rounded-md min-h-[100px] font-mono text-sm"
                value={JSON.stringify(editFormData.metadata || {}, null, 2)}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value);
                    setEditFormData({ ...editFormData, metadata: parsed });
                  } catch (err) {
                    // Invalid JSON, don't update
                  }
                }}
                data-testid="edit-metadata-input"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingDoc(null)}>Cancelar</Button>
              <Button onClick={handleSaveEdit} data-testid="save-edit-button">Guardar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Document Modal */}
      <Dialog open={addDocModalOpen} onOpenChange={setAddDocModalOpen}>
        <DialogContent className="max-w-2xl" data-testid="add-document-modal">
          <DialogHeader>
            <DialogTitle>Nuevo Documento</DialogTitle>
            <DialogDescription>Agregue un nuevo documento al espacio</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Nombre del Archivo</Label>
              <Input
                value={newDocData.file_name}
                onChange={(e) => setNewDocData({ ...newDocData, file_name: e.target.value })}
                data-testid="new-file-name-input"
              />
            </div>
            <div>
              <Label>Ruta del Archivo</Label>
              <Input
                value={newDocData.file_path}
                onChange={(e) => setNewDocData({ ...newDocData, file_path: e.target.value })}
                data-testid="new-file-path-input"
              />
            </div>
            <div>
              <Label>Metadatos (JSON)</Label>
              <textarea
                className="w-full p-2 border rounded-md min-h-[100px] font-mono text-sm"
                value={JSON.stringify(newDocData.metadata, null, 2)}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value);
                    setNewDocData({ ...newDocData, metadata: parsed });
                  } catch (err) {
                    // Invalid JSON
                  }
                }}
                data-testid="new-metadata-input"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAddDocModalOpen(false)}>Cancelar</Button>
              <Button onClick={handleAddDocument} data-testid="save-new-document-button">Crear</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Public URL Modal */}
      <Dialog open={publicUrlModalOpen} onOpenChange={setPublicUrlModalOpen}>
        <DialogContent className="max-w-2xl" data-testid="public-url-modal">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              URL Pública del Documento
            </DialogTitle>
            <DialogDescription>
              Comparta esta URL para que otros puedan visualizar el documento sin necesidad de iniciar sesión
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Documento</Label>
              <p className="text-base font-medium">{selectedDocForUrl?.file_name}</p>
            </div>
            <div>
              <Label className="text-sm font-medium mb-2 block">URL Pública</Label>
              <div className="flex gap-2">
                <Input
                  value={selectedDocForUrl ? `${window.location.origin}/public/${selectedDocForUrl.public_url}` : ''}
                  readOnly
                  className="font-mono text-sm"
                  data-testid="public-url-input"
                  onClick={(e) => e.target.select()}
                  onFocus={(e) => e.target.select()}
                />
                <Button
                  onClick={copyPublicUrl}
                  variant="outline"
                  data-testid="copy-url-button"
                  title="Copiar URL"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Haga clic en el campo para seleccionar toda la URL
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <AlertCircle className="inline h-4 w-4 mr-2" />
                <strong>Nota:</strong> Esta URL permite visualizar e imprimir el documento, pero no descargarlo. Ideal para compartir de forma segura.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setPublicUrlModalOpen(false)}
              >
                Cerrar
              </Button>
              <Button
                onClick={() => window.open(`/public/${selectedDocForUrl?.public_url}`, '_blank')}
                className="bg-primary hover:bg-primary/90"
                data-testid="open-public-view-button"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Abrir Vista Pública
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}