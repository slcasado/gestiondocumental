import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { KeyRound } from 'lucide-react';

export default function ChangePasswordModal({ open, onClose }) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { changePassword } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    if (newPassword.length < 4) {
      toast.error('La contraseña debe tener al menos 4 caracteres');
      return;
    }

    setLoading(true);
    try {
      await changePassword(oldPassword, newPassword);
      toast.success('Contraseña cambiada exitosamente');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onClose();
    } catch (error) {
      toast.error('Error al cambiar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" data-testid="change-password-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <KeyRound className="h-5 w-5" />
            Cambiar Contraseña
          </DialogTitle>
          <DialogDescription>
            Por seguridad, debe cambiar su contraseña en el primer inicio de sesión
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="old-password" className="text-sm font-medium uppercase tracking-wider text-slate-500">Contraseña Actual</Label>
            <Input
              id="old-password"
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
              data-testid="old-password-input"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password" className="text-sm font-medium uppercase tracking-wider text-slate-500">Nueva Contraseña</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              data-testid="new-password-input"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password" className="text-sm font-medium uppercase tracking-wider text-slate-500">Confirmar Contraseña</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              data-testid="confirm-password-input"
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-primary hover:bg-primary/90"
            disabled={loading}
            data-testid="change-password-submit-button"
          >
            {loading ? 'Cambiando...' : 'Cambiar Contraseña'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}