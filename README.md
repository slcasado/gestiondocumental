# Costa_Doc - Sistema de Gestión Documental

Sistema web para gestión de documentos PDF con metadatos personalizables, control de acceso por equipos y API con tokens de permisos granulares.

## Características

- **Gestión de Usuarios**: Roles de administrador y usuario con autenticación JWT
- **Equipos**: Organización de usuarios en equipos de trabajo
- **Espacios de Trabajo**: Áreas de documentos con metadatos personalizados
- **Documentos**: Soporte para archivos locales y URLs externas
- **URLs Públicas**: Compartir documentos sin requerir login
- **API Tokens**: Acceso programático con permisos granulares
- **Visor PDF**: Visualización segura sin opción de descarga
- **Auditoría**: Registro de acciones del sistema

## Tecnologías

| Componente | Tecnología |
|------------|------------|
| Frontend | React 19, Tailwind CSS, Shadcn/UI |
| Backend | FastAPI (Python 3.10+) |
| Base de Datos | MongoDB 6.0+ |
| Autenticación | JWT + API Tokens |

## Credenciales por Defecto

- **Usuario:** `admin`
- **Contraseña:** `admin`
- ⚠️ El sistema obliga a cambiar la contraseña en el primer inicio de sesión

---

# 📘 Guía de Instalación - Linux (Ubuntu/Debian)

## 1. Requisitos del Sistema

- Ubuntu 20.04+ / Debian 11+
- 2 GB RAM mínimo
- 10 GB espacio en disco

## 2. Instalar Dependencias del Sistema

### Node.js 18+
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verificar
node --version
npm --version
```

### Python 3.10+
```bash
sudo apt-get update
sudo apt-get install -y python3 python3-pip python3-venv

# Verificar
python3 --version
```

### MongoDB 6.0
```bash
# Importar clave GPG
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -

# Añadir repositorio (Ubuntu 20.04)
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# Instalar
sudo apt-get update
sudo apt-get install -y mongodb-org

# Iniciar y habilitar servicio
sudo systemctl start mongod
sudo systemctl enable mongod

# Verificar
mongosh --eval "db.version()"
```

### Yarn
```bash
npm install -g yarn
```

## 3. Descargar/Clonar el Proyecto

```bash
# Opción A: Clonar desde GitHub
git clone https://github.com/tu-usuario/costa-doc.git /opt/costa-doc

# Opción B: Copiar archivos manualmente
mkdir -p /opt/costa-doc
# Copia los archivos del proyecto aquí
```

## 4. Estructura de Archivos

```
/opt/costa-doc/
├── backend/
│   ├── server.py
│   ├── models.py
│   ├── auth.py
│   ├── security.py
│   ├── audit.py
│   ├── requirements.txt
│   ├── .env              ← Configurar
│   └── uploads/
└── frontend/
    ├── src/
    ├── public/
    ├── package.json
    ├── .env              ← Configurar
    └── ...
```

## 5. Configuración

### Backend - `/opt/costa-doc/backend/.env`

```bash
# Crear archivo de configuración
cat > /opt/costa-doc/backend/.env << 'EOF'
MONGO_URL=mongodb://localhost:27017
DB_NAME=costa_doc
CORS_ORIGINS=http://localhost:3000,http://tu-dominio.com
JWT_SECRET_KEY=CAMBIAR_POR_CLAVE_SEGURA
EOF

# Generar clave segura
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
# Copia el resultado y edita JWT_SECRET_KEY en el archivo .env
```

### Frontend - `/opt/costa-doc/frontend/.env`

```bash
cat > /opt/costa-doc/frontend/.env << 'EOF'
REACT_APP_BACKEND_URL=http://localhost:8001
EOF
```

> **Nota:** Cambia `localhost` por tu dominio o IP si accedes desde otras máquinas.

## 6. Instalar Dependencias del Proyecto

### Backend
```bash
cd /opt/costa-doc/backend

# Crear entorno virtual
python3 -m venv venv
source venv/bin/activate

# Instalar dependencias
pip install --upgrade pip
pip install fastapi uvicorn motor python-jose[cryptography] passlib[bcrypt] \
    python-dotenv slowapi python-multipart bcrypt bleach
```

### Frontend
```bash
cd /opt/costa-doc/frontend
yarn install
```

## 7. Compilar Frontend para Producción

```bash
cd /opt/costa-doc/frontend
yarn build
```

Esto genera `/opt/costa-doc/frontend/build/` con los archivos estáticos.

## 7.1 Generar Paquete Precompilado (Linux)

Si quieres instalar en un servidor Linux sin volver a instalar dependencias de Python/Node, puedes generar un bundle con todo compilado.

### En la máquina de build (con Python 3 + Yarn instalados)

```bash
cd /ruta/al/repositorio/gestiondocumental
./scripts/build_linux_bundle.sh
```

Esto crea `dist/costa-doc-linux-bundle.tar.gz` con:
- Backend + virtualenv con dependencias instaladas.
- Frontend ya compilado en `build/`.

### En el servidor destino (Linux)

1. Copia el tarball al servidor.
2. Extrae en la raíz (requiere sudo):
   ```bash
   sudo tar -xzf costa-doc-linux-bundle.tar.gz -C /
   ```
3. Configura `.env`:
   - `/opt/costa-doc/backend/.env`
   - `/opt/costa-doc/frontend/.env`
4. Levanta el backend:
   ```bash
   /opt/costa-doc/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001
   ```
5. Sirve el frontend con Nginx desde `/opt/costa-doc/frontend/build`.

> Nota: El paquete asume que se extrae en `/opt/costa-doc` para mantener la ruta del virtualenv.

## 8. Probar Manualmente (Desarrollo)

Abre 2 terminales:

**Terminal 1 - Backend:**
```bash
cd /opt/costa-doc/backend
source venv/bin/activate
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

**Terminal 2 - Frontend:**
```bash
cd /opt/costa-doc/frontend
yarn start
```

Accede a: http://localhost:3000

## 9. Configurar Servicios de Producción

### Crear Servicio Systemd para Backend

```bash
sudo cat > /etc/systemd/system/costa-doc-backend.service << 'EOF'
[Unit]
Description=Costa_Doc Backend API
After=network.target mongod.service

[Service]
User=www-data
Group=www-data
WorkingDirectory=/opt/costa-doc/backend
Environment="PATH=/opt/costa-doc/backend/venv/bin"
ExecStart=/opt/costa-doc/backend/venv/bin/uvicorn server:app --host 127.0.0.1 --port 8001
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Ajustar permisos
sudo chown -R www-data:www-data /opt/costa-doc

# Recargar systemd
sudo systemctl daemon-reload

# Iniciar y habilitar servicio
sudo systemctl start costa-doc-backend
sudo systemctl enable costa-doc-backend

# Verificar estado
sudo systemctl status costa-doc-backend
```

### Instalar y Configurar Nginx

```bash
# Instalar Nginx
sudo apt-get install -y nginx

# Crear configuración del sitio
sudo cat > /etc/nginx/sites-available/costa-doc << 'EOF'
server {
    listen 80;
    server_name tu-dominio.com;  # Cambiar por tu dominio o IP

    # Logs
    access_log /var/log/nginx/costa-doc-access.log;
    error_log /var/log/nginx/costa-doc-error.log;

    # Frontend (archivos estáticos)
    location / {
        root /opt/costa-doc/frontend/build;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Backend API (proxy)
    location /api {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Archivos estáticos - cache
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        root /opt/costa-doc/frontend/build;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Activar sitio
sudo ln -s /etc/nginx/sites-available/costa-doc /etc/nginx/sites-enabled/

# Desactivar sitio por defecto (opcional)
sudo rm -f /etc/nginx/sites-enabled/default

# Verificar configuración
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

## 10. Configurar Firewall

```bash
# UFW (si está instalado)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw reload

# O con iptables
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT
```

## 11. Comandos de Gestión

```bash
# Ver estado de servicios
sudo systemctl status mongod costa-doc-backend nginx

# Reiniciar backend
sudo systemctl restart costa-doc-backend

# Ver logs del backend
sudo journalctl -u costa-doc-backend -f

# Ver logs de Nginx
sudo tail -f /var/log/nginx/costa-doc-error.log

# Reiniciar todo
sudo systemctl restart mongod costa-doc-backend nginx
```

## 12. Configurar SSL con Let's Encrypt (Opcional)

```bash
# Instalar Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Obtener certificado
sudo certbot --nginx -d tu-dominio.com

# Renovación automática (ya configurada por defecto)
sudo certbot renew --dry-run
```

---

# 📗 Guía de Instalación - Windows Server 2019

## 1. Requisitos del Sistema

- Windows Server 2019 o superior
- 2 GB RAM mínimo
- 10 GB espacio en disco
- Acceso de Administrador

## 2. Instalar Software Requerido

### Python 3.11+

1. Descarga desde: https://www.python.org/downloads/
2. Ejecuta el instalador
3. ⚠️ **IMPORTANTE:** Marca **"Add Python to PATH"**
4. Selecciona "Install Now"

**Verificar en PowerShell:**
```powershell
python --version
pip --version
```

### Node.js 18+

1. Descarga desde: https://nodejs.org/es (versión LTS)
2. Ejecuta el instalador con opciones por defecto
3. Reinicia PowerShell

**Verificar:**
```powershell
node --version
npm --version
```

### MongoDB 6.0

1. Descarga desde: https://www.mongodb.com/try/download/community
   - Version: 6.0+
   - Platform: Windows
   - Package: MSI
2. Ejecuta el instalador
3. Selecciona **"Complete"**
4. ✅ Marca **"Install MongoDB as a Service"**
5. ✅ Marca **"Install MongoDB Compass"** (opcional)

**Verificar:**
```powershell
Get-Service MongoDB
```

### Yarn

```powershell
npm install -g yarn
```

### Git (Opcional)

Descarga desde: https://git-scm.com/download/win

## 3. Crear Estructura de Carpetas

```powershell
# Ejecutar PowerShell como Administrador
mkdir C:\costa-doc
mkdir C:\costa-doc\backend
mkdir C:\costa-doc\backend\uploads
mkdir C:\costa-doc\frontend
mkdir C:\costa-doc\logs
```

## 4. Copiar Archivos del Proyecto

Copia todos los archivos a `C:\costa-doc\`:

```
C:\costa-doc\
├── backend\
│   ├── server.py
│   ├── models.py
│   ├── auth.py
│   ├── security.py
│   ├── audit.py
│   ├── requirements.txt
│   ├── .env              ← Crear
│   └── uploads\
├── frontend\
│   ├── src\
│   ├── public\
│   ├── package.json
│   ├── .env              ← Crear
│   └── ...
└── logs\
```

## 5. Configuración

### Backend - `C:\costa-doc\backend\.env`

Crea el archivo con PowerShell o Notepad:

```powershell
@"
MONGO_URL=mongodb://localhost:27017
DB_NAME=costa_doc
CORS_ORIGINS=http://localhost:3000,http://localhost
JWT_SECRET_KEY=CAMBIAR_POR_CLAVE_SEGURA
"@ | Out-File -FilePath C:\costa-doc\backend\.env -Encoding UTF8
```

**Generar clave secreta:**
```powershell
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

Copia el resultado y edita `JWT_SECRET_KEY` en el archivo `.env`

### Frontend - `C:\costa-doc\frontend\.env`

```powershell
@"
REACT_APP_BACKEND_URL=http://localhost:8001
"@ | Out-File -FilePath C:\costa-doc\frontend\.env -Encoding UTF8
```

> **Nota:** Cambia `localhost` por la IP del servidor si accedes desde otras máquinas.

## 6. Instalar Dependencias del Proyecto

### Backend

```powershell
cd C:\costa-doc\backend

# Crear entorno virtual
python -m venv venv

# Activar entorno virtual
.\venv\Scripts\Activate.ps1

# Si da error de políticas de ejecución:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Instalar dependencias
pip install --upgrade pip
pip install fastapi uvicorn motor python-jose[cryptography] passlib[bcrypt] python-dotenv slowapi python-multipart bcrypt bleach
```

### Frontend

```powershell
cd C:\costa-doc\frontend
yarn install
```

## 7. Compilar Frontend para Producción

```powershell
cd C:\costa-doc\frontend
yarn build
```

Esto genera `C:\costa-doc\frontend\build\` con los archivos estáticos.

## 8. Probar Manualmente (Desarrollo)

Abre **2 ventanas de PowerShell**:

**Ventana 1 - Backend:**
```powershell
cd C:\costa-doc\backend
.\venv\Scripts\Activate.ps1
uvicorn server:app --host 0.0.0.0 --port 8001
```

**Ventana 2 - Frontend:**
```powershell
cd C:\costa-doc\frontend
yarn start
```

Accede a: http://localhost:3000

## 9. Crear Servicio de Windows para Backend

### Descargar NSSM

1. Descarga desde: https://nssm.cc/download
2. Extrae `nssm.exe` a `C:\nssm\nssm.exe`

### Instalar Servicio Backend

```powershell
# Ejecutar PowerShell como Administrador
C:\nssm\nssm.exe install CostaDocBackend
```

En la ventana de configuración:

**Pestaña Application:**
| Campo | Valor |
|-------|-------|
| Path | `C:\costa-doc\backend\venv\Scripts\uvicorn.exe` |
| Startup directory | `C:\costa-doc\backend` |
| Arguments | `server:app --host 0.0.0.0 --port 8001` |

**Pestaña Details:**
| Campo | Valor |
|-------|-------|
| Display name | Costa_Doc Backend |
| Startup type | Automatic |

**Pestaña I/O:**
| Campo | Valor |
|-------|-------|
| Output (stdout) | `C:\costa-doc\logs\backend.log` |
| Error (stderr) | `C:\costa-doc\logs\backend-error.log` |

Haz clic en **"Install service"**

### Iniciar Servicio

```powershell
Start-Service CostaDocBackend
Get-Service CostaDocBackend
```

## 10. Configurar IIS para Frontend

### Instalar IIS

```powershell
# PowerShell como Administrador
Install-WindowsFeature -name Web-Server -IncludeManagementTools
```

### Instalar Módulos Adicionales

1. **URL Rewrite Module**: https://www.iis.net/downloads/microsoft/url-rewrite
2. **Application Request Routing (ARR)**: https://www.iis.net/downloads/microsoft/application-request-routing

Descarga e instala ambos módulos.

### Habilitar Proxy en ARR

1. Abre **IIS Manager** (`inetmgr`)
2. Selecciona el servidor en el panel izquierdo
3. Doble clic en **Application Request Routing Cache**
4. Clic en **Server Proxy Settings** (panel derecho)
5. ✅ Marca **Enable proxy**
6. Clic en **Apply**

### Crear Sitio Web

1. En IIS Manager, clic derecho en **Sites** → **Add Website**
   - Site name: `CostaDoc`
   - Physical path: `C:\costa-doc\frontend\build`
   - Binding: Port `80`
2. Clic **OK**

### Crear Archivo web.config

Crea el archivo `C:\costa-doc\frontend\build\web.config`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <!-- Proxy para API Backend -->
        <rule name="API Proxy" stopProcessing="true">
          <match url="^api/(.*)" />
          <action type="Rewrite" url="http://localhost:8001/api/{R:1}" />
        </rule>
        
        <!-- React Router - Single Page Application -->
        <rule name="React Routes" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="/" />
        </rule>
      </rules>
    </rewrite>
    
    <staticContent>
      <remove fileExtension=".json" />
      <mimeMap fileExtension=".json" mimeType="application/json" />
      <remove fileExtension=".woff" />
      <mimeMap fileExtension=".woff" mimeType="font/woff" />
      <remove fileExtension=".woff2" />
      <mimeMap fileExtension=".woff2" mimeType="font/woff2" />
    </staticContent>
    
    <httpErrors errorMode="Custom" existingResponse="Replace">
      <remove statusCode="404" />
      <error statusCode="404" path="/" responseMode="ExecuteURL" />
    </httpErrors>
  </system.webServer>
</configuration>
```

### Reiniciar IIS

```powershell
iisreset
```

## 11. Configurar Firewall

```powershell
# PowerShell como Administrador

# Permitir HTTP
New-NetFirewallRule -DisplayName "HTTP (80)" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow

# Permitir HTTPS (si usas SSL)
New-NetFirewallRule -DisplayName "HTTPS (443)" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow
```

## 12. Comandos de Gestión

```powershell
# Ver estado de servicios
Get-Service MongoDB, CostaDocBackend, W3SVC

# Reiniciar backend
Restart-Service CostaDocBackend

# Reiniciar IIS
iisreset

# Ver logs del backend
Get-Content C:\costa-doc\logs\backend.log -Tail 50 -Wait

# Ver logs de errores
Get-Content C:\costa-doc\logs\backend-error.log -Tail 50
```

## 13. Solución de Problemas

### El backend no inicia
```powershell
# Ver logs de error
Get-Content C:\costa-doc\logs\backend-error.log -Tail 100

# Verificar que MongoDB está corriendo
Get-Service MongoDB
Start-Service MongoDB
```

### Error de políticas de PowerShell
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### IIS no hace proxy al backend
1. Verifica que ARR está instalado y el proxy habilitado
2. Verifica que el servicio `CostaDocBackend` está corriendo
3. Prueba acceder directamente a `http://localhost:8001/api/auth/login`

### Error 500 en IIS
```powershell
# Ver logs de IIS
Get-Content C:\inetpub\logs\LogFiles\W3SVC1\*.log -Tail 50
```

---

# 📊 Resumen de Puertos y Servicios

| Servicio | Puerto | Descripción |
|----------|--------|-------------|
| Frontend (Nginx/IIS) | 80 | Aplicación web |
| Frontend (HTTPS) | 443 | Aplicación web (SSL) |
| Backend API | 8001 | API REST (interno) |
| MongoDB | 27017 | Base de datos (interno) |

---

# 🔐 Seguridad en Producción

## Recomendaciones

1. **Cambiar JWT_SECRET_KEY**: Genera una clave única y segura
2. **Configurar CORS**: Limita los orígenes permitidos en `CORS_ORIGINS`
3. **Usar HTTPS**: Configura certificados SSL (Let's Encrypt o comerciales)
4. **Firewall**: Solo expón los puertos 80 y 443
5. **MongoDB**: No expongas el puerto 27017 al exterior
6. **Backups**: Configura copias de seguridad de MongoDB

## Backup de MongoDB

```bash
# Linux
mongodump --db costa_doc --out /backup/$(date +%Y%m%d)

# Windows
mongodump --db costa_doc --out C:\backup\%date:~-4,4%%date:~-7,2%%date:~-10,2%
```

---

# 📝 API Tokens

El sistema permite crear tokens de API con permisos granulares para integraciones externas.

## Permisos Disponibles

| Permiso | Descripción |
|---------|-------------|
| `documents:read` | Leer documentos |
| `documents:create` | Crear documentos |
| `documents:update` | Actualizar documentos |
| `documents:delete` | Eliminar documentos |
| `documents:search` | Buscar documentos |
| `workspaces:read` | Leer espacios de trabajo |
| `metadata:read` | Leer metadatos |

## Ejemplo de Uso

```bash
# Buscar documentos con API Token
curl -X GET "http://tu-servidor/api/documents/search?q=factura" \
  -H "Authorization: Bearer costa_TU_TOKEN_AQUI"

# Crear documento
curl -X POST "http://tu-servidor/api/workspaces/{workspace_id}/documents" \
  -H "Authorization: Bearer costa_TU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{"file_name": "documento.pdf", "file_path": "/uploads/documento.pdf", "metadata": {}}'
```

---

# 📄 Licencia

Este proyecto es privado. Todos los derechos reservados.

---

# 🆘 Soporte

Para reportar problemas o solicitar ayuda, contacta al administrador del sistema.
