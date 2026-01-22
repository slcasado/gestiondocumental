import { useAuth } from '../contexts/AuthContext';
import { Link, useLocation } from 'react-router-dom';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Users, Tag, FolderOpen, Settings, LogOut, Key } from 'lucide-react';
import { cn } from '../lib/utils';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_a739615c-f1b8-4bd3-af53-bfce43a6f5fc/artifacts/23euucvr_logo%20costa%20doc.png";

export default function Sidebar({ workspaces }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const isAdmin = user?.role === 'admin';

  const isActive = (path) => location.pathname === path;

  return (
    <div className="w-64 border-r border-costa-blue-light bg-white h-screen fixed left-0 top-0 z-30 flex flex-col" data-testid="sidebar">
      <div className="p-4 border-b border-costa-blue-light bg-white">
        <img 
          src={LOGO_URL} 
          alt="Costa Doc" 
          className="h-12 w-auto"
        />
        <p className="text-xs text-slate-500 mt-2">{user?.email}</p>
      </div>

      <ScrollArea className="flex-1 py-4">
        <div className="space-y-6">
          {/* Workspaces Section */}
          <div className="px-3">
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">Espacios</h3>
            <div className="space-y-1">
              {workspaces?.map((workspace) => (
                <Link key={workspace.id} to={`/workspace/${workspace.id}`}>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start text-left",
                      isActive(`/workspace/${workspace.id}`) && "bg-costa-yellow/20 text-costa-blue font-medium"
                    )}
                    data-testid={`workspace-link-${workspace.id}`}
                  >
                    <FolderOpen className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{workspace.name}</span>
                  </Button>
                </Link>
              ))}
            </div>
          </div>

          {/* Admin Section */}
          {isAdmin && (
            <>
              <Separator />
              <div className="px-3">
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">Administración</h3>
                <div className="space-y-1">
                  <Link to="/admin/users">
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start",
                        isActive('/admin/users') && "bg-costa-yellow/20 text-costa-blue font-medium"
                      )}
                      data-testid="admin-users-link"
                    >
                      <Users className="mr-2 h-4 w-4 flex-shrink-0" />
                      Usuarios
                    </Button>
                  </Link>
                  <Link to="/admin/teams">
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start",
                        isActive('/admin/teams') && "bg-costa-yellow/20 text-costa-blue font-medium"
                      )}
                      data-testid="admin-teams-link"
                    >
                      <Users className="mr-2 h-4 w-4 flex-shrink-0" />
                      Equipos
                    </Button>
                  </Link>
                  <Link to="/admin/metadata">
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start",
                        isActive('/admin/metadata') && "bg-costa-yellow/20 text-costa-blue font-medium"
                      )}
                      data-testid="admin-metadata-link"
                    >
                      <Tag className="mr-2 h-4 w-4 flex-shrink-0" />
                      Metadatos
                    </Button>
                  </Link>
                  <Link to="/admin/workspaces">
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start",
                        isActive('/admin/workspaces') && "bg-costa-yellow/20 text-costa-blue font-medium"
                      )}
                      data-testid="admin-workspaces-link"
                    >
                      <Settings className="mr-2 h-4 w-4 flex-shrink-0" />
                      Espacios
                    </Button>
                  </Link>
                  <Link to="/admin/api-tokens">
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start",
                        isActive('/admin/api-tokens') && "bg-costa-yellow/20 text-costa-blue font-medium"
                      )}
                      data-testid="admin-api-tokens-link"
                    >
                      <Key className="mr-2 h-4 w-4 flex-shrink-0" />
                      API Tokens
                    </Button>
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t">
        <Button
          variant="ghost"
          className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={logout}
          data-testid="logout-button"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Cerrar Sesión
        </Button>
      </div>
    </div>
  );
}