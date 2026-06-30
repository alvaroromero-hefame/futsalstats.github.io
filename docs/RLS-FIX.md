# 🔐 Políticas RLS para Migración - Guía Rápida

## ❌ Problema

Si ves estos errores durante la migración:

```
❌ Error: new row violates row-level security policy for table "matches"
POST /rest/v1/matches 401 (Unauthorized)
GET /rest/v1/matches 406 (Not Acceptable)
```

## ✅ Solución

Ejecuta el script `supabase-rls-fix.sql` en Supabase:

### Pasos:

1. Ve a https://supabase.com/dashboard/project/nqqbeuweyxatsxjsepnj
2. Click en **SQL Editor**
3. Click en **New Query**
4. Copia y pega el contenido de `supabase-rls-fix.sql`
5. Click en **Run** (Ctrl+Enter)
6. Verifica el mensaje: ✅ Políticas RLS actualizadas correctamente

### ¿Qué hace este script?

- **DESACTIVA completamente RLS** en las tres tablas
- Elimina todas las políticas existentes
- Permite acceso total sin restricciones durante la migración
- Después puedes reactivarlo con `supabase-rls-enable.sql`

## 🔄 Orden de Ejecución

Para una configuración completa de Supabase:

```
1. supabase-init.sql         → Crea tablas, índices, funciones
2. supabase-rls-fix.sql      → DESACTIVA RLS temporalmente
3. js/migrate-data.js        → Migra los datos JSON
4. supabase-rls-enable.sql   → OPCIONAL: Reactiva RLS
```

## ⚠️ Importante

- Este script **DESACTIVA RLS completamente**
- Permite acceso total sin autenticación durante la migración
- Después de migrar, puedes reactivar RLS con `supabase-rls-enable.sql`
- O dejarlo desactivado si prefieres acceso público sin restricciones

## 🔒 Seguridad en Producción

Después de migrar, si quieres asegurar la base de datos:

```sql
-- Eliminar permisos de escritura anónimos
DROP POLICY "Allow anon insert on matches" ON matches;
DROP POLICY "Allow anon update on matches" ON matches;
DROP POLICY "Allow anon delete on matches" ON matches;

-- Mantener solo lectura pública
-- (ya está creada en supabase-init.sql)
```

## 📝 Políticas Actuales

Después de ejecutar `supabase-rls-fix.sql`, tendrás:

### Para `players`:
- ✅ Lectura pública (SELECT)
- ✅ Escritura anónima (INSERT, UPDATE, DELETE)

### Para `matches`:
- ✅ Lectura pública (SELECT)
- ✅ Escritura anónima (INSERT, UPDATE, DELETE)

### Para `settings`:
- ✅ Lectura pública (SELECT)
- ✅ Escritura anónima (INSERT, UPDATE, DELETE)

## 🎯 Casos de Uso

### Desarrollo Local
✅ Usa estas políticas permisivas
- Facilita la migración de datos
- Permite desarrollo sin fricciones

### Producción (GitHub Pages)
⚠️ Evalúa si necesitas:
- Autenticación de usuarios
- Restricciones de escritura
- Auditoría de cambios

## 💡 Tips

1. **Backup**: Siempre haz backup antes de ejecutar scripts SQL
2. **Verificación**: Revisa las políticas en Table Editor → Policies
3. **Testing**: Prueba la migración en modo desarrollo primero
4. **Rollback**: Puedes revertir ejecutando `supabase-init.sql` nuevamente

## 📚 Referencias

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Policies](https://www.postgresql.org/docs/current/sql-createpolicy.html)
- Ver `DATA-MIGRATION.md` para el proceso completo de migración
