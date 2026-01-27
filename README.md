# Costa Doc (Minimal PHP)

Proyecto ultra minimalista compatible con hosting compartido (PHP 8 + MySQL) y sin dependencias externas.

## Requisitos
- PHP 8.x
- MySQL 5.7+ / 8.x

## Configuración
1) Crea la base de datos y tablas:

```bash
mysql -u root -p < schema.sql
```

2) Edita `config/config.php` con credenciales reales:
- `db.host`, `db.name`, `db.user`, `db.pass`

3) Sube el contenido por FTP.

## Rutas
- API: `/api/...`
- Fallback sin rewrite: `/public/index.php?path=/api/...`
- Frontend de prueba: `/`

## Login por defecto
Crea un usuario admin en la tabla `users` o inserta manualmente.

Ejemplo SQL:
```sql
INSERT INTO users (id, email, password_hash, role, first_login, created_at)
VALUES ('admin-id', 'admin', '$2y$10$hash', 'admin', 1, NOW());
```

> Genera hash con `password_hash()` en PHP.

## Notas
- Sesiones PHP para usuarios.
- API tokens para integraciones programáticas (Bearer `costa_...`).
- CSRF requerido para operaciones mutantes en sesión.
