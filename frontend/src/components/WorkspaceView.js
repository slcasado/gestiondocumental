import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Search, Edit, Trash2, ExternalLink, FileText, Plus, Link2, Copy, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
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
  const [editMetadataText, setEditMetadataText] = useState('{}');
  const [editMetadataError, setEditMetadataError] = useState('');
  const [addDocModalOpen, setAddDocModalOpen] = useState(false);
  const [newDocData, setNewDocData] = useState({ file_name: '', file_path: '', metadata: {} });
  const [newDocMetadataText, setNewDocMetadataText] = useState('{}');
  const [metadataError, setMetadataError] = useState('');
  const [publicUrlModalOpen, setPublicUrlModalOpen] = useState(false);
  const [selectedDocForUrl, setSelectedDocForUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [paginatedDocuments, setPaginatedDocuments] = useState([]);
  const [totalPages, setTotalPages] = useState(0);

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
      setCurrentPage(1); // Reset to first page when searching
    } else {
      setFilteredDocuments(documents);
    }
  }, [searchQuery, documents]);

  useEffect(() => {
    // Calculate pagination
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginated = filteredDocuments.slice(startIndex, endIndex);
    setPaginatedDocuments(paginated);
    setTotalPages(Math.ceil(filteredDocuments.length / pageSize));
  }, [filteredDocuments, currentPage, pageSize]);

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

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
    setEditMetadataText(JSON.stringify(doc.metadata || {}, null, 2));
    setEditMetadataError('');
  };

  const handleSaveEdit = async () => {
    try {
      const metadata = JSON.parse(editMetadataText);
      const updateData = { ...editFormData, metadata };
      
      await api.updateDocument(editingDoc.id, updateData);
      toast.success('Documento actualizado');
      setEditingDoc(null);
      setEditMetadataError('');
      loadDocuments();
    } catch (error) {
      if (error instanceof SyntaxError) {
        setEditMetadataError('JSON inválido. Por favor, corrija el formato.');
        toast.error('Error: JSON de metadatos inválido');
      } else {
        toast.error('Error al actualizar documento');
      }
    }
  };

  const handleEditMetadataTextChange = (text) => {
    setEditMetadataText(text);
    try {
      JSON.parse(text);
      setEditMetadataError('');
    } catch (err) {
      setEditMetadataError('JSON inválido');
    }
  };

  const handleAddDocument = async () => {
    // Validate JSON before submitting
    try {
      const metadata = JSON.parse(newDocMetadataText);
      const docData = { ...newDocData, metadata };
      
      await api.createDocument(workspaceId, docData);
      toast.success('Documento creado');
      setAddDocModalOpen(false);
      setNewDocData({ file_name: '', file_path: '', metadata: {} });
      setNewDocMetadataText('{}');
      setMetadataError('');
      loadDocuments();
    } catch (error) {
      if (error instanceof SyntaxError) {
        setMetadataError('JSON inválido. Por favor, corrija el formato.');
        toast.error('Error: JSON de metadatos inválido');
      } else {
        toast.error('Error al crear documento');
      }
    }
  };

  const handleMetadataTextChange = (text) => {
    setNewDocMetadataText(text);
    try {
      JSON.parse(text);
      setMetadataError('');
    } catch (err) {
      setMetadataError('JSON inválido');
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
    <div className="flex-1 md:pl-64 min-h-screen bg-gradient-to-br from-costa-blue-light/20 to-slate-50" data-testid="workspace-view">
      <div className="p-8">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-1 w-12 bg-gradient-to-r from-costa-yellow to-costa-yellow-bright rounded-full"></div>
            <h1 className="text-4xl font-bold tracking-tight text-costa-blue">{workspace?.name || 'Espacio'}</h1>
          </div>
          <p className="text-slate-600 ml-16">{workspace?.description || 'Gestión de documentos'}</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
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
          <div className="flex items-center gap-2">
            <Label className="text-sm text-slate-600 whitespace-nowrap">Mostrar:</Label>
            <Select value={pageSize.toString()} onValueChange={(value) => handlePageSizeChange(parseInt(value))}>
              <SelectTrigger className="w-28" data-testid="page-size-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
                <SelectItem value="500">500</SelectItem>
                <SelectItem value="1000">1000</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() => setAddDocModalOpen(true)}
            className="bg-costa-blue hover:bg-costa-blue/90 text-white"
            data-testid="add-document-button"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Documento
          </Button>
        </div>

        <Card className="shadow-lg border-costa-blue-light">
          <CardHeader className="bg-gradient-to-r from-costa-blue to-costa-blue/90">
            <CardTitle className="text-white">Documentos</CardTitle>
            <CardDescription className="text-costa-blue-light">
              Mostrando {paginatedDocuments.length > 0 ? ((currentPage - 1) * pageSize) + 1 : 0} - {Math.min(currentPage * pageSize, filteredDocuments.length)} de {filteredDocuments.length} documento(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center py-8 text-slate-500">Cargando...</p>
            ) : filteredDocuments.length === 0 ? (
              <p className="text-center py-8 text-slate-500">No hay documentos</p>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      {visibleFields.map(field => (
                        <TableHead key={field.id}>{field.name}</TableHead>
                      ))}
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                <TableBody>
                  {paginatedDocuments.map((doc) => (
                    <TableRow key={doc.id} data-testid={`document-row-${doc.id}`}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-slate-400" />
                          {doc.file_name}
                        </div>
                      </TableCell>
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
                            onClick={() => {
                              // Check if it's an external URL
                              if (doc.file_path.startsWith('http://') || doc.file_path.startsWith('https://')) {
                                window.open(doc.file_path, '_blank');
                              } else {
                                window.open(api.getDocumentUrl(doc.id), '_blank');
                              }
                            }}
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
              
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t pt-4 mt-4">
                  <div className="text-sm text-slate-600">
                    Página {currentPage} de {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      data-testid="prev-page-button"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </Button>
                    
                    {/* Page Numbers */}
                    <div className="flex gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => goToPage(pageNum)}
                            className={currentPage === pageNum ? "bg-costa-yellow text-costa-blue hover:bg-costa-yellow/90" : "border-costa-blue-light hover:bg-costa-blue-light/30"}
                            data-testid={`page-${pageNum}-button`}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      data-testid="next-page-button"
                    >
                      Siguiente
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
              </>
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
                value={editMetadataText}
                onChange={(e) => handleEditMetadataTextChange(e.target.value)}
                data-testid="edit-metadata-input"
              />
              {editMetadataError && (
                <p className="text-xs text-red-600 mt-1">{editMetadataError}</p>
              )}
              <p className="text-xs text-slate-500 mt-1">
                Formato: {`{"Categoría": "Contrato", "Fecha": "2025-01-22"}`}
              </p>
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
                value={newDocMetadataText}
                onChange={(e) => handleMetadataTextChange(e.target.value)}
                data-testid="new-metadata-input"
              />
              {metadataError && (
                <p className="text-xs text-red-600 mt-1">{metadataError}</p>
              )}
              <p className="text-xs text-slate-500 mt-1">
                Formato: {`{"Categoría": "Contrato", "Fecha": "2025-01-22"}`}
              </p>
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