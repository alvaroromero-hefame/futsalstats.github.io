# 🚀 Configuración Rápida de Supabase

## ✅ Estado Actual

Tu aplicación **ya está conectada a Supabase**, solo necesitas crear las tablas.

El mensaje que viste:
```
✅ Conexión a Supabase establecida correctamente
⚠️ Las tablas aún no existen
```

Es **normal** y significa que todo está bien configurado.

## 📋 Pasos para Completar la Configuración

### 1. Accede a tu Dashboard de Supabase

```
URL: https://supabase.com/dashboard/project/nqqbeuweyxatsxjsepnj
```

### 2. Ve al SQL Editor

1. En el menú lateral, busca **"SQL Editor"**
2. Click en **"New Query"**

### 3. Copia el Script SQL

Abre el archivo `supabase-init.sql` de tu proyecto y copia **todo** el contenido.

### 4. Pega y Ejecuta

1. Pega el contenido en el editor SQL
2. Click en **"Run"** (o presiona `Ctrl+Enter`)
3. Espera a que termine (debería tomar 1-2 segundos)

### 5. Configura los Permisos RLS (IMPORTANTE para Migración)

**Si planeas migrar datos desde JSON**, necesitas ejecutar un script adicional:

1. En el mismo SQL Editor, crea una **nueva query**
2. Abre el archivo `supabase-rls-fix.sql` y copia todo el contenido
3. Pega y haz click en **"Run"**
4. Verifica que aparezca: "✅ Políticas RLS actualizadas correctamente"

**¿Por qué es necesario?**
- Las políticas por defecto solo permiten lectura pública
- Para migrar datos, necesitas permisos de escritura
- Este script actualiza las políticas temporalmente para permitir la migración
- **Solo necesario si vas a ejecutar el script de migración**

### 6. Verifica que las Tablas se Crearon

En el menú lateral de Supabase:
1. Ve a **"Table Editor"**
2. Deberías ver 3 tablas:
   - ✅ `players`
   - ✅ `matches`
   - ✅ `settings`

### 7. Recarga tu Aplicación

1. Recarga tu aplicación en el navegador
2. Abre la consola (F12)
3. Ahora deberías ver:
   ```
   ✅ Conexión a Supabase establecida correctamente
   ✅ Tablas configuradas y listas para usar
   ```

## 🎯 ¿Qué hace el Script SQL?

El archivo `supabase-init.sql` crea:

1. **Tablas**:
   - `players`: Almacena jugadores (fijos y eventuales)
   - `matches`: Almacena todos los partidos
   - `settings`: Configuración (próximo seleccionador, etc.)

2. **Seguridad (RLS)**:
   - Lectura pública para todos
   - Escritura solo para usuarios autenticados

3. **Funciones útiles**:
   - Cálculo automático de estadísticas
   - Actualización automática de timestamps

4. **Datos iniciales**:
   - Configuración del próximo seleccionador
   - Preparación para migraciones futuras

## 🔄 Siguiente Paso: Migrar Datos

Una vez que las tablas estén creadas, puedes migrar tus datos JSON existentes a Supabase.

Ver `SUPABASE.md` sección "Migración de Datos JSON a Supabase" para instrucciones.

## ❓ Problemas Comunes

### "Permission denied for table X"
**Solución**: Asegúrate de estar usando el SQL Editor con permisos de admin.

### "Syntax error at or near X"
**Solución**: Asegúrate de copiar **todo** el contenido de `supabase-init.sql`, desde la primera línea hasta la última.

### "Extension uuid-ossp already exists"
**Solución**: Esto es normal, el script continúa sin problemas.

## 💡 Mientras Tanto...

Tu aplicación **sigue funcionando** con los archivos JSON locales. No hay prisa, puedes configurar Supabase cuando quieras.

La aplicación usa un sistema de **fallback automático**:
- ✅ Intenta usar Supabase primero
- ✅ Si no está disponible, usa archivos JSON
- ✅ Todo sigue funcionando igual

## 📞 ¿Necesitas Ayuda?

Si tienes problemas:
1. Verifica que copiaste **todo** el script SQL
2. Asegúrate de estar en el proyecto correcto de Supabase
3. Revisa la consola del navegador para mensajes de error
4. Lee `SUPABASE.md` para más detalles
