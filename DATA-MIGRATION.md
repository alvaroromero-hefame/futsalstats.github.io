# 🔄 Guía de Migración de Datos a Supabase

Este documento explica cómo migrar tus datos JSON existentes a las tablas de Supabase.

## ⚠️ Prerrequisitos

1. **Tablas creadas**: Asegúrate de haber ejecutado `supabase-init.sql` en tu proyecto de Supabase
2. **Políticas RLS configuradas**: Ejecuta `supabase-rls-fix.sql` para permitir la migración
3. **Aplicación funcionando**: La app debe estar corriendo en un servidor HTTP (no `file://`)
4. **Conexión verificada**: La conexión a Supabase debe estar funcionando correctamente

### 🔐 Configuración de Políticas RLS (IMPORTANTE)

**Antes de migrar**, debes desactivar temporalmente RLS:

1. Ve a: https://supabase.com/dashboard/project/nqqbeuweyxatsxjsepnj
2. Selecciona **SQL Editor** en el menú lateral
3. Crea una nueva query
4. Copia y pega el contenido de `supabase-rls-fix.sql`
5. Haz clic en **Run** o presiona `Ctrl+Enter`
6. Verifica que aparezca: "✅ RLS DESACTIVADO en todas las tablas"

**¿Por qué es necesario?**
- Por defecto, Supabase tiene Row Level Security (RLS) activado
- RLS bloquea todas las operaciones por defecto
- `supabase-rls-fix.sql` desactiva temporalmente RLS para permitir la migración
- Después de migrar, puedes reactivarlo con `supabase-rls-enable.sql`

**Después de migrar**, puedes reactivar RLS (opcional):
- Ejecuta `supabase-rls-enable.sql` para reactivar con políticas permisivas
- O déjalo desactivado si prefieres acceso sin restricciones

## 📋 Pasos para Migrar

### Opción 1: Migración desde la Consola del Navegador (Recomendado)

1. **Abre la aplicación en tu navegador**
   ```
   http://localhost:8000  (o tu servidor local)
   ```

2. **Abre las DevTools**
   - Presiona `F12` o `Ctrl+Shift+I`
   - Ve a la pestaña "Console"

3. **Carga el script de migración**
   ```javascript
   // Importar y ejecutar el script
   const module = await import('./js/migrate-data.js');
   ```

4. **Ejecuta la migración**
   ```javascript
   migrateData()
   ```

5. **Espera a que termine**
   - Verás mensajes en la consola mostrando el progreso
   - Al final aparecerá un resumen con las estadísticas

6. **Recarga la aplicación**
   - Presiona `F5` para recargar
   - Verifica que los datos se muestren correctamente

### Opción 2: Ejecución Manual en Node.js

Si prefieres ejecutar la migración desde Node.js (requiere configuración adicional):

```bash
# Instalar dependencias
npm install @supabase/supabase-js node-fetch

# Ejecutar script
node js/migrate-data.js
```

## 📊 Qué Hace el Script

El script `migrate-data.js` realiza las siguientes operaciones:

### 1. Migración de Jugadores
- Lee la lista de `fijos` de cada archivo JSON
- Inserta los jugadores en la tabla `players` con `is_fixed = true`
- Si un jugador juega ambos días, actualiza su campo `day` a `'ambos'`
- Registra también jugadores eventuales encontrados en los partidos

### 2. Migración de Partidos
- Lee todos los partidos del array `matches`
- Extrae la información de cada partido:
  - Fecha del partido
  - Día (martes/jueves)
  - MVP
  - Resultado
  - Alineaciones de equipos azul y rojo
- Inserta cada partido en la tabla `matches`
- Evita duplicados verificando fecha y día

### 3. Migración de Configuración
- Lee el campo `proximoSeleccionador`
- Lo guarda en la tabla `settings` para cada día

## 📈 Salida Esperada

```
🚀 Iniciando migración de datos a Supabase...

📥 Cargando FutsalStatsMartes.json...
📋 Migrando 10 jugadores fijos de martes...
  ✅ Álvaro insertado
  ✅ Pablo insertado
  ...

⚽ Migrando 45 partidos de martes...
  ✅ Partido 2024-01-09 insertado
  ✅ Partido 2024-01-16 insertado
  ...

⚙️  Configurando próximo seleccionador de martes: Álvaro
  ✅ Insertada configuración

📥 Cargando FutsalStatsJueves.json...
[mismo proceso para jueves]

============================================================
📊 RESUMEN DE MIGRACIÓN
============================================================
✅ Jugadores insertados/actualizados: 15
❌ Jugadores con error: 0
✅ Partidos insertados: 90
❌ Partidos con error: 0
✅ Configuraciones insertadas: 2
============================================================

🎉 ¡Migración completada exitosamente!
💡 Ahora puedes recargar la aplicación y verificar que todo funcione correctamente.
```

## 🔧 Funciones Disponibles

### `migrateData()`
Ejecuta la migración completa de todos los datos.

```javascript
migrateData()
```

### `clearSupabaseData()` ⚠️ PELIGROSO
Elimina **TODOS** los datos de Supabase. Úsalo solo si necesitas reiniciar desde cero.

```javascript
clearSupabaseData()  // ¡Ten cuidado!
```

## ❓ Solución de Problemas

### Error: "Failed to fetch"
- **Causa**: La aplicación no está corriendo en un servidor HTTP
- **Solución**: Usa un servidor local como `python -m http.server` o `npx http-server`

### Error: "Could not find the table"
- **Causa**: Las tablas de Supabase no están creadas
- **Solución**: 
  1. Ejecuta `supabase-init.sql` en el SQL Editor de Supabase
  2. Ejecuta `supabase-rls-fix.sql` para configurar permisos

### Error: "new row violates row-level security policy" o "401 Unauthorized"
- **Causa**: Las políticas RLS no permiten escritura a usuarios anónimos
- **Solución**: 
  1. **Ejecuta `supabase-rls-fix.sql`** en el SQL Editor de Supabase
  2. Este script actualiza las políticas para permitir INSERT/UPDATE/DELETE
  3. Vuelve a ejecutar la migración

### Error: "406 Not Acceptable"
- **Causa**: Problema con las cabeceras de la petición o políticas RLS
- **Solución**: Ejecuta `supabase-rls-fix.sql` para corregir las políticas

### Error: "duplicate key value violates unique constraint"
- **Causa**: Ya existen datos en Supabase
- **Solución**: 
  - Opción 1: El script saltará los duplicados automáticamente
  - Opción 2: Usa `clearSupabaseData()` para limpiar y volver a migrar

### Los datos no aparecen después de migrar
- **Solución**: 
  1. Verifica en Supabase Dashboard que los datos se insertaron
  2. Recarga la aplicación con `Ctrl+F5` (recarga forzada)
  3. Revisa la consola por errores de RLS (Row Level Security)

## 🔍 Verificación Post-Migración

Después de migrar, verifica que todo funcione:

1. **En Supabase Dashboard**:
   - Ve a `Table Editor`
   - Revisa que las tablas `players`, `matches` y `settings` tengan datos
   - Cuenta los registros y compara con tus archivos JSON

2. **En la Aplicación**:
   - Recarga la página
   - Verifica que la clasificación se muestre correctamente
   - Revisa el histórico de partidos
   - Comprueba las estadísticas

3. **En la Consola del Navegador**:
   - Busca el mensaje: `✅ Datos cargados desde Supabase`
   - No debe haber errores en rojo

## 🔄 Re-ejecutar la Migración

Si necesitas volver a ejecutar la migración:

1. Primero limpia los datos:
   ```javascript
   clearSupabaseData()
   ```

2. Espera a que termine la limpieza

3. Ejecuta la migración nuevamente:
   ```javascript
   migrateData()
   ```

## 💾 Respaldo de Datos JSON

**Importante**: Guarda una copia de seguridad de tus archivos JSON antes de migrar:

```bash
# Windows PowerShell
Copy-Item data\*.json data\backup\
```

Los archivos JSON seguirán funcionando como fallback si Supabase no está disponible.

## 📝 Notas Adicionales

- **Tiempo estimado**: La migración puede tardar 1-3 minutos dependiendo del número de partidos
- **Límites de rate**: Supabase tiene límites de solicitudes por segundo en el plan gratuito
- **Idempotencia**: El script puede ejecutarse múltiples veces, saltará duplicados automáticamente
- **Transacciones**: Cada inserción es independiente, si una falla, las demás continuarán

## 🎯 Próximos Pasos

Una vez completada la migración:

1. ✅ Verifica que los datos sean correctos
2. 📝 Actualiza `dataManager.js` para usar Supabase como fuente principal (opcional)
3. 🗑️ Considera eliminar o archivar los archivos JSON si ya no los necesitas
4. 🔐 Configura las políticas RLS de Supabase según tus necesidades

---

**¿Problemas?** Revisa los logs en la consola del navegador para más detalles sobre cualquier error.
