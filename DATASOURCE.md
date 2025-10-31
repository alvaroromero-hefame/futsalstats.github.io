# 📊 Sistema de Fuentes de Datos

FutsalStats utiliza un **sistema híbrido** que prioriza Supabase pero mantiene un fallback a archivos JSON locales.

## 🔄 Flujo de Carga de Datos

```
┌─────────────────┐
│  App Inicia     │
└────────┬────────┘
         │
         ▼
┌─────────────────────┐
│ ¿Supabase Config?   │
└────────┬────────────┘
         │
    ┌────┴────┐
    │ Sí      │ No
    ▼         ▼
┌─────────┐  ┌─────────┐
│ Intenta │  │  Carga  │
│ Supabase│  │  JSON   │
└────┬────┘  └────┬────┘
     │            │
  ┌──┴──┐         │
  │ OK? │         │
  └──┬──┘         │
     │            │
 ┌───┴───┐        │
 │ Sí│No │        │
 ▼   ▼   ▼        ▼
┌──────────────────┐
│  Datos Listos    │
└──────────────────┘
```

## 🎯 Prioridad de Fuentes

1. **Supabase** (preferido)
   - Datos en tiempo real
   - Sincronización entre dispositivos
   - Escalable y robusto

2. **JSON Local** (fallback)
   - Sin dependencia de red
   - Funciona offline
   - Respaldo confiable

## 🔧 Configuración Actual

La aplicación detecta automáticamente la mejor fuente:

```javascript
// En dataManager.js
async loadData() {
    // Intenta Supabase primero
    if (this.supabase) {
        const success = await this.loadFromSupabase();
        if (success) {
            this.dataSource = 'supabase';
            return true;
        }
    }
    
    // Fallback a JSON
    return await this.loadFromJSON();
}
```

## 📍 Indicador Visual

La aplicación muestra un badge en la esquina inferior derecha:

- **🟢 Supabase**: Datos desde base de datos en la nube
- **🟡 JSON Local**: Datos desde archivos locales

## 🔍 Verificar Fuente Actual

En la consola del navegador:

```javascript
// Verificar fuente de datos
app.dataManager.getDataSource()  // 'supabase' o 'json'

// Verificar si Supabase está disponible
app.dataManager.isSupabaseAvailable()  // true o false

// Recargar datos
await app.dataManager.reload()
```

## 📦 Formato de Datos

Ambas fuentes proporcionan datos en el mismo formato:

```javascript
{
    fijos: ['Jugador1', 'Jugador2', ...],
    proximoSeleccionador: 'Nombre',
    matches: [
        {
            matchDate: '2025-10-30',
            mvp: 'Nombre',
            result: 'VictoryRed',
            teams: [{ blue: [...], red: [...] }]
        }
    ]
}
```

## 🔄 Transformación de Datos

El `dataManager` transforma automáticamente los datos de Supabase al formato esperado:

### Estructura en Supabase:
```json
{
    "match_date": "2025-10-30",
    "day": "jueves",
    "mvp": "Jose Antonio",
    "result": "VictoryRed",
    "lineup": {
        "blue": {
            "result": 5,
            "lineup": [...]
        },
        "red": {
            "result": 8,
            "lineup": [...]
        }
    }
}
```

### Transformado a formato de la app:
```json
{
    "matchDate": "2025-10-30",
    "mvp": "Jose Antonio",
    "result": "VictoryRed",
    "teams": [{
        "blue": [{
            "result": 5,
            "lineup": [{ "member": [...] }]
        }],
        "red": [{
            "result": 8,
            "lineup": [{ "member": [...] }]
        }]
    }]
}
```

## 🚀 Ventajas del Sistema Híbrido

### ✅ Con Supabase:
- Sincronización en tiempo real
- Datos compartidos entre usuarios
- Estadísticas centralizadas
- Backup automático en la nube

### ✅ Con JSON Local:
- Funciona sin internet
- Sin dependencias externas
- Rápido y ligero
- Control total de los datos

## 🔧 Cambiar Fuente Manualmente

### Forzar uso de JSON:
```javascript
// En config.js, comenta la configuración:
export const SUPABASE_CONFIG = {
    url: '', // Vacío
    anonKey: '' // Vacío
};
```

### Forzar uso de Supabase:
```javascript
// Asegúrate de que config.js tenga valores:
export const SUPABASE_CONFIG = {
    url: 'https://nqqbeuweyxatsxjsepnj.supabase.co',
    anonKey: 'tu_anon_key_aqui'
};
```

## 📊 Debugging

Para ver mensajes detallados en la consola:

```javascript
// Al cargar la app, verás:
📥 Cargando datos...
✅ Datos cargados desde Supabase
// o
⚠️ Supabase no disponible, usando JSON local
✅ Datos cargados desde JSON local
```

## 🎯 Mejores Prácticas

1. **Mantén ambos archivos actualizados**
   - JSON como respaldo de Supabase
   - Exporta datos de Supabase periódicamente

2. **Prueba ambas fuentes**
   - Verifica que la app funcione con JSON
   - Verifica que la app funcione con Supabase

3. **Monitorea el badge visual**
   - Asegúrate de usar la fuente correcta
   - Verifica cambios de fuente en caso de errores

---

**💡 Tip**: El sistema híbrido garantiza que tu aplicación siempre tenga datos disponibles, sin importar el estado de Supabase o la conexión a internet.