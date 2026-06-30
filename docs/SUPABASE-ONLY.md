# Migración a Supabase Exclusivo

## 📋 Resumen de Cambios

La aplicación ha sido migrada completamente de un sistema híbrido (JSON + Supabase) a utilizar **exclusivamente Supabase** como fuente de datos.

## ✅ Cambios Realizados

### 1. **DataManager (`js/dataManager.js`)**
- ❌ Eliminado método `loadFromJSON()`
- ❌ Eliminado fallback a JSON
- ❌ Eliminada propiedad `dataSource`
- ✅ Supabase es ahora obligatorio en el constructor
- ✅ `loadData()` solo carga desde Supabase
- ✅ Mejoras en transformación de datos
- ✅ Manejo de errores mejorado

### 2. **Configuración (`js/config.js`)**
- ❌ Eliminada sección `data` con rutas JSON
- ✅ Validación estricta de configuración Supabase
- ✅ Errores claros si falta configuración
- ✅ Versión actualizada a 3.0.0

### 3. **Archivos de Datos**
- ❌ Eliminado `data/FutsalStatsMartes.json`
- ❌ Eliminado `data/FutsalStatsJueves.json`
- ℹ️ La carpeta `data/` puede ser eliminada si está vacía

### 4. **Documentación (`README.md`)**
- ✅ Actualizada estructura del proyecto
- ✅ Eliminadas referencias a JSON
- ✅ Documentación mejorada de Supabase
- ✅ Instrucciones de configuración actualizadas

### 5. **Simulador (`js/ui/simulador.js`)**
- ✅ Eliminados console.log de debug
- ✅ Código limpiado y optimizado

## 🔧 Configuración Requerida

Para que la aplicación funcione, debes tener configurado Supabase en `js/config.js`:

```javascript
export const config = {
    supabase: {
        url: 'https://tu-proyecto.supabase.co',
        anonKey: 'tu-anon-key-aqui'
    }
};
```

## 🗄️ Estructura de Base de Datos Requerida

La aplicación espera las siguientes tablas en Supabase:

### Tabla `players`
```sql
- id (uuid, primary key)
- name (text)
- day (text) -- 'martes', 'jueves', o 'ambos'
- is_fixed (boolean)
```

### Tabla `matches`
```sql
- id (uuid, primary key)
- day (text)
- match_date (date)
- mvp (text)
- result (text)
- blue_lineup (jsonb)
- red_lineup (jsonb)
- blue_result (integer)
- red_result (integer)
```

### Tabla `settings`
```sql
- id (uuid, primary key)
- day (text, unique)
- next_selector (text)
```

Ver `SUPABASE-SETUP.md` para scripts completos de creación de tablas.

## 🚀 Ventajas de Supabase Exclusivo

1. **Simplicidad**: Un solo flujo de datos, más fácil de mantener
2. **Consistencia**: Todos los usuarios ven los mismos datos en tiempo real
3. **Administración**: Panel de administración funcional con datos persistentes
4. **Escalabilidad**: No hay límites de archivos JSON locales
5. **Seguridad**: Row Level Security y autenticación integrada

## ⚠️ Importante

- **La aplicación NO funcionará sin Supabase configurado**
- **No hay fallback a JSON** - asegúrate de tener Supabase funcionando
- **Los datos antiguos de JSON deben migrarse** a Supabase antes de usar la aplicación

## 📦 Migración de Datos

Si tenías datos en JSON y necesitas migrarlos a Supabase, usa el script de migración:

```bash
# Abre admin.html en el navegador
# Ve a la sección "Migración de Datos"
# Sigue las instrucciones en pantalla
```

O ejecuta manualmente el script `js/migrate-data.js` (requiere los archivos JSON).

## 🔍 Verificación

Para verificar que la migración fue exitosa:

1. Abre la consola del navegador (F12)
2. Deberías ver: `✅ Datos cargados desde Supabase correctamente`
3. Si ves errores, verifica la configuración en `config.js`

## 📝 Notas Adicionales

- El archivo `migrate-data.js` sigue haciendo referencia a JSON pero solo se usa una vez para migración inicial
- Puedes mantenerlo para referencia o eliminarlo si ya migraste todos los datos
- La carpeta `data/` ya no es necesaria y puede ser eliminada

## 🆘 Solución de Problemas

### Error: "Supabase client es requerido"
- Verifica que `config.js` tiene las credenciales correctas
- Asegúrate de que Supabase está inicializado en `index.html`

### Error: "No hay datos disponibles en Supabase"
- Verifica que las tablas existen en Supabase
- Ejecuta los scripts de `SUPABASE-SETUP.md`
- Verifica que hay datos en las tablas `matches` y `players`

### La aplicación no carga
- Abre la consola (F12) y revisa errores
- Verifica la URL de Supabase
- Confirma que el anon key es correcto

## 📅 Fecha de Migración

Migración completada el 4 de noviembre de 2025.
