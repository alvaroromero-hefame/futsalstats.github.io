# 🔐 Guía de Configuración de Seguridad

## 1. Variables de Entorno

### Configuración Inicial

1. **Copiar el archivo de ejemplo:**
   ```bash
   copy .env.example .env
   ```

2. **Editar `.env` con tus credenciales reales:**
   ```env
   VITE_SUPABASE_URL=https://nqqbeuweyxatsxjsepnj.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

3. **IMPORTANTE:** El archivo `.env` ya está en `.gitignore` y **NUNCA** debe subirse a Git.

### Uso en el Código

Las variables de entorno se usan así:

```javascript
// js/config.js
export const config = {
    supabase: {
        url: import.meta.env.VITE_SUPABASE_URL || 'fallback_url',
        anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || 'fallback_key'
    }
};
```

### Para Desarrollo Local

Si usas un bundler como Vite:

```bash
npm install -D vite
npm run dev
```

Si NO usas bundler (desarrollo simple):
- Las variables de entorno NO funcionarán directamente
- Debes crear un archivo `js/config.local.js` (también en .gitignore):

```javascript
// js/config.local.js (NO subir a Git)
export const config = {
    supabase: {
        url: 'https://nqqbeuweyxatsxjsepnj.supabase.co',
        anonKey: 'tu_clave_aqui'
    }
};
```

Y cambiar el import en los archivos que lo usen:

```javascript
// Cambiar esto:
import { config } from './config.js';

// Por esto:
import { config } from './config.local.js';
```

## 2. Row Level Security (RLS) en Supabase

### Ejecutar Script de Seguridad

1. Ir al panel de Supabase → SQL Editor
2. Abrir el archivo `supabase-rls-security.sql`
3. Ejecutar todo el script
4. Verificar que las políticas se aplicaron correctamente

### Verificar RLS

```sql
-- Verificar que RLS está habilitado
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- Ver políticas activas
SELECT * FROM pg_policies WHERE schemaname = 'public';
```

## 3. Autenticación de Administradores

### Configurar Usuarios Admin en Supabase

1. **Ir a Authentication → Users** en Supabase
2. **Crear usuario administrador:**
   - Email: admin@futsalstats.com
   - Password: (contraseña fuerte)
   - Confirmar email

3. **Asignar rol de admin:**
   
   Ejecutar en SQL Editor:
   ```sql
   -- Crear tabla de roles si no existe
   CREATE TABLE IF NOT EXISTS user_roles (
       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
       role VARCHAR(50) NOT NULL DEFAULT 'user',
       created_at TIMESTAMPTZ DEFAULT NOW(),
       UNIQUE(user_id)
   );

   -- Asignar rol admin al usuario
   INSERT INTO user_roles (user_id, role)
   SELECT id, 'admin'
   FROM auth.users
   WHERE email = 'admin@futsalstats.com'
   ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
   ```

### Acceso al Panel de Admin

1. Navegar a `/admin.html`
2. Será redirigido a página de login si no está autenticado
3. Ingresar credenciales de administrador
4. El sistema verificará el rol y dará acceso

## 4. Content Security Policy (CSP)

Ya está configurado en `index.html` y `admin.html`:

```html
<meta http-equiv="Content-Security-Policy" content="
    default-src 'self';
    script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    connect-src 'self' https://nqqbeuweyxatsxjsepnj.supabase.co;
">
```

### Personalizar CSP

Si necesitas añadir más fuentes permitidas, edita el `content` del meta tag.

## 5. Sanitización de Datos

### Uso de SecurityUtils

```javascript
import { SecurityUtils } from './js/utils/security.js';

// Sanitizar HTML (prevenir XSS)
const safeText = SecurityUtils.sanitizeHTML(userInput);

// Sanitizar objetos completos
const safeData = SecurityUtils.sanitizeObject(apiResponse);

// Verificar código malicioso
if (SecurityUtils.containsMaliciousCode(userInput)) {
    alert('Input contiene código malicioso');
    return;
}
```

### Uso de ValidationUtils

```javascript
import { ValidationUtils } from './js/utils/validation.js';

// Validar nombre de jugador
const result = ValidationUtils.validatePlayerName(nombre);
if (!result.valid) {
    alert(result.error);
    return;
}

// Usar el valor sanitizado
const nombreSeguro = result.sanitized;
```

## 6. Checklist de Seguridad

### Antes de Desplegar

- [ ] Variables de entorno configuradas
- [ ] `.env` en `.gitignore`
- [ ] RLS habilitado en todas las tablas de Supabase
- [ ] Políticas de RLS configuradas
- [ ] Usuario admin creado en Supabase
- [ ] Roles de usuario configurados
- [ ] CSP headers configurados
- [ ] Sanitización aplicada en todos los inputs
- [ ] Validación aplicada en todos los formularios
- [ ] AuthGuard protegiendo `/admin.html`

### Testing de Seguridad

```bash
# 1. Probar XSS
# Intentar ingresar: <script>alert('XSS')</script>
# Debería mostrarse como texto, no ejecutarse

# 2. Probar acceso a admin sin autenticación
# Navegar a /admin.html sin login
# Debería redirigir a login

# 3. Probar RLS
# Intentar modificar datos sin permisos desde la consola
# Debería fallar con error de permisos
```

## 7. Mantenimiento

### Actualizar Dependencias

```bash
# Si usas npm/Vite
npm audit
npm audit fix
```

### Rotar Credenciales

Si las credenciales se comprometen:

1. **Supabase:**
   - Ir a Settings → API
   - Regenerar `anon` key
   - Actualizar `.env` con nueva key
   - Redesplegar aplicación

2. **Contraseñas Admin:**
   - Cambiar en Supabase Authentication
   - Notificar a administradores

### Logs de Auditoría

Revisar regularmente los logs en Supabase:

```sql
SELECT * FROM audit_logs
ORDER BY timestamp DESC
LIMIT 100;
```

## 8. Recursos Adicionales

- [Supabase RLS Docs](https://supabase.com/docs/guides/auth/row-level-security)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)

## 9. Contacto y Soporte

Si encuentras algún problema de seguridad:
1. **NO** lo reportes públicamente
2. Contacta al equipo de desarrollo directamente
3. Proporciona detalles del problema y pasos para reproducirlo

---

**Última actualización:** 5 de noviembre de 2025
