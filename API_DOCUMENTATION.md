# Documentación API - Sistema de Gestión de Documentos PDF

## URL Base
```
https://docvault-106.preview.emergentagent.com/api
```

## Autenticación

Todas las peticiones (excepto login y vista pública de documentos) requieren autenticación mediante JWT Bearer Token.

### Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin",
  "password": "admin"
}
```

**Respuesta:**
```json
{
  "access_token": "eyJhbGc...",
  "token_type": "bearer",
  "user": {
    "id": "uuid",
    "email": "admin",
    "role": "admin",
    "first_login": true,
    "team_ids": [],
    "created_at": "2025-01-22T..."
  }
}
```

### Cambiar Contraseña
```bash
POST /api/auth/change-password
Authorization: Bearer {token}
Content-Type: application/json

{
  "old_password": "admin",
  "new_password": "nueva_contraseña"
}
```

### Obtener Usuario Actual
```bash
GET /api/auth/me
Authorization: Bearer {token}
```

---

## Gestión de Usuarios (Solo Admin)

### Listar Usuarios
```bash
GET /api/users
Authorization: Bearer {token}
```

### Crear Usuario
```bash
POST /api/users
Authorization: Bearer {token}
Content-Type: application/json

{
  "email": "usuario@ejemplo.com",
  "password": "contraseña123",
  "role": "user",  # "admin" o "user"
  "team_ids": []   # Array de IDs de equipos
}
```

### Actualizar Usuario
```bash
PUT /api/users/{user_id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "email": "nuevo_email@ejemplo.com",
  "role": "admin",
  "team_ids": ["team_id_1", "team_id_2"]
}
```

### Eliminar Usuario
```bash
DELETE /api/users/{user_id}
Authorization: Bearer {token}
```

---

## Gestión de Equipos

### Listar Equipos
```bash
GET /api/teams
Authorization: Bearer {token}
```

### Crear Equipo
```bash
POST /api/teams
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Equipo de Desarrollo",
  "description": "Equipo de desarrollo de software",
  "user_ids": ["user_id_1", "user_id_2"]
}
```

### Actualizar Equipo
```bash
PUT /api/teams/{team_id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Nuevo nombre",
  "description": "Nueva descripción",
  "user_ids": ["user_id_1", "user_id_2", "user_id_3"]
}
```

### Eliminar Equipo
```bash
DELETE /api/teams/{team_id}
Authorization: Bearer {token}
```

---

## Gestión de Metadatos

### Listar Metadatos
```bash
GET /api/metadata
Authorization: Bearer {token}
```

### Crear Metadato
```bash
POST /api/metadata
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Categoría",
  "field_type": "text",  # "text", "number", "date", "select"
  "visible": true,
  "options": ["Opción 1", "Opción 2"]  # Solo para type "select"
}
```

### Actualizar Metadato
```bash
PUT /api/metadata/{metadata_id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Nueva Categoría",
  "visible": false
}
```

### Eliminar Metadato
```bash
DELETE /api/metadata/{metadata_id}
Authorization: Bearer {token}
```

---

## Gestión de Espacios de Trabajo

### Listar Espacios
```bash
GET /api/workspaces
Authorization: Bearer {token}
```

**Nota:** Los usuarios normales solo ven espacios a los que tienen acceso a través de sus equipos.

### Crear Espacio
```bash
POST /api/workspaces
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Documentos Legales",
  "description": "Espacio para documentos legales",
  "metadata_ids": ["metadata_id_1", "metadata_id_2"],
  "team_ids": ["team_id_1"]
}
```

### Actualizar Espacio
```bash
PUT /api/workspaces/{workspace_id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Nuevo nombre",
  "description": "Nueva descripción",
  "metadata_ids": ["metadata_id_1"],
  "team_ids": ["team_id_1", "team_id_2"]
}
```

### Eliminar Espacio
```bash
DELETE /api/workspaces/{workspace_id}
Authorization: Bearer {token}
```

**Advertencia:** Esto eliminará todos los documentos del espacio.

---

## Gestión de Documentos

### Listar Documentos de un Espacio
```bash
GET /api/workspaces/{workspace_id}/documents
Authorization: Bearer {token}
```

**Respuesta:**
```json
[
  {
    "id": "doc_uuid",
    "workspace_id": "workspace_uuid",
    "file_path": "/app/backend/uploads/documento.pdf",
    "file_name": "Contrato de Servicios.pdf",
    "public_url": "public_uuid",
    "metadata": {
      "Categoría": "Contrato",
      "Fecha Documento": "2025-01-22"
    },
    "created_at": "2025-01-22T...",
    "updated_at": "2025-01-22T..."
  }
]
```

### Crear Documento (API para inserción externa)
```bash
POST /api/workspaces/{workspace_id}/documents
Authorization: Bearer {token}
Content-Type: application/json

{
  "file_path": "/app/backend/uploads/documento.pdf",
  "file_name": "Contrato de Servicios.pdf",
  "metadata": {
    "Categoría": "Contrato",
    "Fecha Documento": "2025-01-22",
    "Número Expediente": "EXP-2025-001"
  }
}
```

**Respuesta:**
```json
{
  "id": "doc_uuid",
  "workspace_id": "workspace_uuid",
  "file_path": "/app/backend/uploads/documento.pdf",
  "file_name": "Contrato de Servicios.pdf",
  "public_url": "abc123-def456-ghi789",
  "metadata": {
    "Categoría": "Contrato",
    "Fecha Documento": "2025-01-22"
  },
  "created_at": "2025-01-22T10:30:00Z",
  "updated_at": "2025-01-22T10:30:00Z"
}
```

### Actualizar Documento
```bash
PUT /api/documents/{document_id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "file_name": "Nuevo nombre.pdf",
  "file_path": "/nueva/ruta/documento.pdf",
  "metadata": {
    "Categoría": "Contrato Modificado",
    "Fecha Documento": "2025-01-23"
  }
}
```

### Eliminar Documento
```bash
DELETE /api/documents/{document_id}
Authorization: Bearer {token}
```

### Buscar Documentos
```bash
GET /api/documents/search?q=contrato
Authorization: Bearer {token}
```

Busca en nombres de archivo, rutas y metadatos de todos los espacios accesibles.

### Ver/Descargar Documento (Autenticado)
```bash
GET /api/documents/{document_id}/view
Authorization: Bearer {token}
```

Devuelve el archivo PDF para visualización o descarga.

### Ver Documento Público (Sin autenticación)
```bash
GET /api/public/documents/{public_url}
```

Permite acceso público al documento usando la URL pública generada automáticamente.

---

## Ejemplos Completos con curl

### Ejemplo 1: Crear un documento completo
```bash
# 1. Login
TOKEN=$(curl -s -X POST "https://docvault-106.preview.emergentagent.com/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin","password":"admin"}' | jq -r '.access_token')

# 2. Crear espacio de trabajo
WORKSPACE_ID=$(curl -s -X POST "https://docvault-106.preview.emergentagent.com/api/workspaces" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Contratos 2025",
    "description": "Contratos del año 2025",
    "metadata_ids": [],
    "team_ids": []
  }' | jq -r '.id')

# 3. Insertar documento
curl -X POST "https://docvault-106.preview.emergentagent.com/api/workspaces/$WORKSPACE_ID/documents" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "file_path": "/app/backend/uploads/contrato_001.pdf",
    "file_name": "Contrato Cliente XYZ.pdf",
    "metadata": {
      "Cliente": "XYZ Corp",
      "Fecha": "2025-01-22",
      "Valor": "50000"
    }
  }'
```

### Ejemplo 2: Buscar y descargar documentos
```bash
# 1. Login y obtener token
TOKEN=$(curl -s -X POST "https://docvault-106.preview.emergentagent.com/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin","password":"admin"}' | jq -r '.access_token')

# 2. Buscar documentos
curl -s -X GET "https://docvault-106.preview.emergentagent.com/api/documents/search?q=contrato" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# 3. Descargar documento específico
DOCUMENT_ID="doc_uuid_aquí"
curl -X GET "https://docvault-106.preview.emergentagent.com/api/documents/$DOCUMENT_ID/view" \
  -H "Authorization: Bearer $TOKEN" \
  -o documento_descargado.pdf
```

### Ejemplo 3: Script Python para inserción masiva
```python
import requests

API_URL = "https://docvault-106.preview.emergentagent.com/api"

# Login
response = requests.post(f"{API_URL}/auth/login", json={
    "email": "admin",
    "password": "admin"
})
token = response.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

# Obtener workspace ID
workspaces = requests.get(f"{API_URL}/workspaces", headers=headers).json()
workspace_id = workspaces[0]["id"]

# Insertar múltiples documentos
documentos = [
    {
        "file_path": "/ruta/documento1.pdf",
        "file_name": "Documento 1.pdf",
        "metadata": {"Categoría": "Tipo A", "Fecha": "2025-01-22"}
    },
    {
        "file_path": "/ruta/documento2.pdf",
        "file_name": "Documento 2.pdf",
        "metadata": {"Categoría": "Tipo B", "Fecha": "2025-01-23"}
    }
]

for doc in documentos:
    response = requests.post(
        f"{API_URL}/workspaces/{workspace_id}/documents",
        json=doc,
        headers=headers
    )
    if response.status_code == 200:
        print(f"✓ Documento creado: {doc['file_name']}")
        print(f"  URL pública: {response.json()['public_url']}")
    else:
        print(f"✗ Error: {response.text}")
```

---

## Códigos de Estado HTTP

- **200 OK**: Operación exitosa
- **201 Created**: Recurso creado exitosamente
- **400 Bad Request**: Datos inválidos en la petición
- **401 Unauthorized**: Token inválido o ausente
- **403 Forbidden**: Sin permisos para realizar la operación
- **404 Not Found**: Recurso no encontrado
- **500 Internal Server Error**: Error del servidor

---

## Notas Importantes

1. **Almacenamiento de archivos**: Los archivos PDF deben estar almacenados en el servidor en `/app/backend/uploads/` o en la ruta que especifiques en `file_path`.

2. **Permisos por equipos**: Los usuarios normales solo pueden acceder a espacios de trabajo asignados a sus equipos. Los administradores tienen acceso completo.

3. **URLs públicas**: Cada documento tiene una URL pública única que permite acceso sin autenticación. Guarda esta URL si necesitas compartir el documento externamente.

4. **Metadatos dinámicos**: Los metadatos son completamente personalizables. Define los campos que necesites en la gestión de metadatos y luego úsalos en tus documentos.

5. **Búsqueda**: La búsqueda es sensible a mayúsculas/minúsculas y busca coincidencias parciales en nombres de archivo, rutas y valores de metadatos.

---

## Soporte

Para más información o problemas con la API, contacta al administrador del sistema.
