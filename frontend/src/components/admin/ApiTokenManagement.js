import { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';
import { Plus, Trash2, Copy, Key, AlertTriangle, Check, Eye, EyeOff } from 'lucide-react';
import { formatDate } from '../../utils/dateFormat';

export default function ApiTokenManagement() {
  const [tokens, setTokens] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [selectedToken, setSelectedToken] = useState(null);
  const [newToken, setNewToken] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: []
  });
  const [tokenCopied, setTokenCopied] = useState(false);

  const loadTokens = useCallback(async () => {
    try {
      const response = await api.get('/api/admin/api-tokens');
      setTokens(response.data);
    } catch (error) {
      toast.error('Error al cargar los tokens');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPermissions = useCallback(async () => {
    try {
      const response = await api.get('/api/admin/api-tokens/permissions');
      setPermissions(response.data.permissions);
    } catch (error) {
      console.error('Error loading permissions:', error);
    }
  }, []);

  useEffect(() => {
    loadTokens();
    loadPermissions();
  }, [loadTokens, loadPermissions]);

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error('El nombre es requerido');
      return;
    }
    if (formData.permissions.length === 0) {
      toast.error('Selecciona al menos un permiso');
      return;
    }

    try {
      const response = await api.post('/api/admin/api-tokens', formData);
      setNewToken(response.data);
      setShowCreateModal(false);
      setShowTokenModal(true);
      setFormData({ name: '', description: '', permissions: [] });
      loadTokens();
      toast.success('Token creado exitosamente');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al crear el token');
    }
  };

  const handleDelete = async () => {
    if (!selectedToken) return;

    try {
      await api.delete(`/api/admin/api-tokens/${selectedToken.id}`);
      setShowDeleteModal(false);
      setSelectedToken(null);
      loadTokens();
      toast.success('Token revocado exitosamente');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al revocar el token');
    }
  };

  const togglePermission = (permValue) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permValue)
        ? prev.permissions.filter(p => p !== permValue)
        : [...prev.permissions, permValue]
    }));
  };

  const copyToken = async () => {
    if (!newToken?.token) return;
    
    try {
      await navigator.clipboard.writeText(newToken.token);
      setTokenCopied(true);
      toast.success('Token copiado al portapapeles');
      setTimeout(() => setTokenCopied(false), 3000);
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = newToken.token;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setTokenCopied(true);
        toast.success('Token copiado al portapapeles');
        setTimeout(() => setTokenCopied(false), 3000);
      } catch (err) {
        toast.error('No se pudo copiar el token');
      }
      document.body.removeChild(textArea);
    }
  };

  const getPermissionLabel = (value) => {
    const perm = permissions.find(p => p.value === value);
    return perm?.label || value;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-costa-blue"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="api-token-management">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">API Tokens</h1>
          <p className="text-slate-600 mt-1">Gestiona tokens de acceso para integraciones externas</p>
        </div>
        <Button 
          onClick={() => setShowCreateModal(true)}
          className="bg-costa-blue hover:bg-costa-blue/90"
          data-testid="create-token-btn"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Token
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Tokens Registrados
          </CardTitle>
          <CardDescription>
            Los tokens permiten acceso programático a la API con permisos específicos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tokens.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Key className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <p>No hay tokens registrados</p>
              <p className="text-sm mt-1">Crea un token para comenzar a usar la API</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Token</TableHead>
                  <TableHead>Permisos</TableHead>
                  <TableHead>Creado</TableHead>
                  <TableHead>Último Uso</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tokens.map((token) => (
                  <TableRow key={token.id} data-testid={`token-row-${token.id}`}>
                    <TableCell className="font-medium">{token.name}</TableCell>
                    <TableCell className="text-slate-600 max-w-xs truncate">
                      {token.description || '-'}
                    </TableCell>
                    <TableCell>
                      <code className="bg-slate-100 px-2 py-1 rounded text-sm">
                        {token.token_preview}
                      </code>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {token.permissions?.slice(0, 2).map(perm => (
                          <span 
                            key={perm} 
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-costa-blue/10 text-costa-blue"
                          >
                            {getPermissionLabel(perm)}
                          </span>
                        ))}
                        {token.permissions?.length > 2 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-600">
                            +{token.permissions.length - 2}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-600 text-sm">
                      {formatDate(token.created_at)}
                    </TableCell>
                    <TableCell className="text-slate-600 text-sm">
                      {token.last_used ? formatDate(token.last_used) : 'Nunca'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => {
                          setSelectedToken(token);
                          setShowDeleteModal(true);
                        }}
                        data-testid={`delete-token-${token.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Token Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Token</DialogTitle>
            <DialogDescription>
              El token se mostrará solo una vez. Asegúrate de copiarlo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="token-name">Nombre *</Label>
              <Input
                id="token-name"
                placeholder="Ej: API Producción"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                data-testid="token-name-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="token-description">Descripción</Label>
              <Textarea
                id="token-description"
                placeholder="Describe el uso de este token..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                data-testid="token-description-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Permisos *</Label>
              <div className="border rounded-lg p-4 space-y-3 max-h-64 overflow-y-auto">
                {permissions.map((perm) => (
                  <div key={perm.value} className="flex items-center space-x-3">
                    <Checkbox
                      id={perm.value}
                      checked={formData.permissions.includes(perm.value)}
                      onCheckedChange={() => togglePermission(perm.value)}
                      data-testid={`perm-${perm.value}`}
                    />
                    <Label htmlFor={perm.value} className="font-normal cursor-pointer">
                      {perm.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCreate}
              className="bg-costa-blue hover:bg-costa-blue/90"
              data-testid="confirm-create-token"
            >
              Crear Token
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Show Token Modal (only shown once after creation) */}
      <Dialog open={showTokenModal} onOpenChange={setShowTokenModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Token Creado
            </DialogTitle>
            <DialogDescription>
              Este token solo se mostrará una vez. Cópialo ahora y guárdalo en un lugar seguro.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-slate-900 rounded-lg p-4 relative">
              <code className="text-green-400 text-sm break-all block pr-10">
                {newToken?.token}
              </code>
              <Button
                size="sm"
                variant="ghost"
                className="absolute right-2 top-2 text-white hover:bg-slate-700"
                onClick={copyToken}
                data-testid="copy-token-btn"
              >
                {tokenCopied ? (
                  <Check className="h-4 w-4 text-green-400" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-sm text-amber-600 mt-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              No podrás ver este token de nuevo después de cerrar esta ventana.
            </p>
          </div>
          <DialogFooter>
            <Button 
              onClick={() => {
                setShowTokenModal(false);
                setNewToken(null);
              }}
              className="bg-costa-blue hover:bg-costa-blue/90"
              data-testid="close-token-modal"
            >
              Entendido, he copiado el token
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Revocar Token
            </DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas revocar el token "{selectedToken?.name}"? 
              Esta acción no se puede deshacer y cualquier integración que use este token dejará de funcionar.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              data-testid="confirm-delete-token"
            >
              Revocar Token
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
