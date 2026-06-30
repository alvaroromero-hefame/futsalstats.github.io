# Migración: Player Availability

## Problema Resuelto

Anteriormente, la tabla `players` tenía campos `day` (martes/jueves/ambos) e `is_fixed` (boolean) que no permitían la casuística de:

**Un jugador siendo FIJO en un día y EVENTUAL en otro**

**Ejemplo:** Miguel es fijo los jueves pero eventual los martes.

## Solución Implementada

### Nueva Estructura

Se creó la tabla `player_availability` que permite definir independientemente para cada día si un jugador es fijo o eventual:

```sql
CREATE TABLE player_availability (
    id UUID PRIMARY KEY,
    player_id UUID REFERENCES players(id),
    day VARCHAR(10) CHECK (day IN ('martes', 'jueves')),
    is_fixed BOOLEAN DEFAULT FALSE,
    UNIQUE(player_id, day)
);
```

### Relación

- **1 jugador** puede tener **2 registros** en `player_availability` (uno por día)
- Cada registro define si es `fijo` o `eventual` para ese día específico

### Ejemplo: Miguel

```
players:
┌──────────┬────────┐
│ id       │ name   │
├──────────┼────────┤
│ uuid-123 │ Miguel │
└──────────┴────────┘

player_availability:
┌──────────┬────────┬────────┐
│ player_id│ day    │is_fixed│
├──────────┼────────┼────────┤
│ uuid-123 │ jueves │ true   │  ← Fijo los jueves
│ uuid-123 │ martes │ false  │  ← Eventual los martes
└──────────┴────────┴────────┘
```

## Pasos de Migración

### 1. Ejecutar Script de Migración

```bash
# En Supabase SQL Editor
```

Ejecuta el archivo: `supabase-player-day-migration.sql`

Esto:
- ✅ Crea tabla `player_availability`
- ✅ Migra datos existentes de `players` a `player_availability`
- ✅ Crea índices y políticas RLS
- ✅ Crea funciones auxiliares (`get_fixed_players`, `get_eventual_players`)

### 2. Configurar Caso Miguel

```bash
# En Supabase SQL Editor
```

Ejecuta el archivo: `supabase-miguel-case.sql`

Esto configura a Miguel como:
- ✓ Fijo los jueves
- ○ Eventual los martes

### 3. Verificar Migración

Ejecuta en SQL Editor:

```sql
-- Ver todos los jugadores con su disponibilidad
SELECT 
    p.name,
    pa.day,
    CASE WHEN pa.is_fixed THEN 'Fijo' ELSE 'Eventual' END as tipo
FROM players p
INNER JOIN player_availability pa ON p.id = pa.player_id
ORDER BY p.name, pa.day;
```

### 4. Código JavaScript Actualizado

El archivo `js/admin/panel.js` ha sido actualizado para:

- Consultar `player_availability` usando JOIN con `players`
- Filtrar jugadores correctamente por día y tipo
- Crear nuevos jugadores eventuales con entrada en ambas tablas

## Funciones SQL Disponibles

### `get_fixed_players(day)`
Obtiene jugadores fijos de un día:
```sql
SELECT * FROM get_fixed_players('jueves');
```

### `get_eventual_players(day)`
Obtiene jugadores eventuales de un día:
```sql
SELECT * FROM get_eventual_players('martes');
```

### `get_all_players(day)`
Obtiene todos los jugadores (fijos + eventuales) de un día:
```sql
SELECT * FROM get_all_players('martes');
```

## Casos de Uso Soportados

### ✅ Jugador fijo solo un día
```sql
INSERT INTO player_availability (player_id, day, is_fixed)
VALUES (player_uuid, 'martes', true);
```

### ✅ Jugador eventual solo un día
```sql
INSERT INTO player_availability (player_id, day, is_fixed)
VALUES (player_uuid, 'jueves', false);
```

### ✅ Jugador fijo ambos días
```sql
INSERT INTO player_availability (player_id, day, is_fixed) VALUES
    (player_uuid, 'martes', true),
    (player_uuid, 'jueves', true);
```

### ✅ Jugador fijo un día y eventual otro (CASO MIGUEL)
```sql
INSERT INTO player_availability (player_id, day, is_fixed) VALUES
    (player_uuid, 'jueves', true),   -- Fijo jueves
    (player_uuid, 'martes', false);  -- Eventual martes
```

### ✅ Jugador eventual ambos días
```sql
INSERT INTO player_availability (player_id, day, is_fixed) VALUES
    (player_uuid, 'martes', false),
    (player_uuid, 'jueves', false);
```

## Retrocompatibilidad

La migración mantiene todos los datos existentes. Los jugadores que anteriormente tenían:

- `day='martes'` → 1 entrada en `player_availability` para martes
- `day='jueves'` → 1 entrada en `player_availability` para jueves  
- `day='ambos'` → 2 entradas en `player_availability` (una por día)

## Limpieza Opcional (Futuro)

Una vez verificado que todo funciona correctamente, puedes eliminar los campos obsoletos de `players`:

```sql
ALTER TABLE players DROP COLUMN IF EXISTS is_fixed;
ALTER TABLE players DROP COLUMN IF EXISTS day;
```

⚠️ **IMPORTANTE:** No ejecutar hasta estar 100% seguro de que todo funciona.

## Testing

Después de la migración, verifica:

1. ✅ Panel admin muestra jugadores fijos correctos por día
2. ✅ Panel admin muestra jugadores eventuales correctos por día
3. ✅ Miguel aparece como fijo los jueves
4. ✅ Miguel aparece como eventual los martes
5. ✅ Puedes crear nuevos partidos sin errores
6. ✅ Los partidos guardados tienen los lineups correctos

## Rollback (Si es necesario)

Si necesitas revertir la migración:

```sql
-- Eliminar tabla y funciones
DROP TABLE IF EXISTS player_availability CASCADE;
DROP FUNCTION IF EXISTS get_fixed_players(TEXT);
DROP FUNCTION IF EXISTS get_eventual_players(TEXT);
DROP FUNCTION IF EXISTS get_all_players(TEXT);

-- Los datos originales en players siguen intactos
-- (si no ejecutaste los ALTER TABLE DROP COLUMN)
```

## Archivos Modificados

- ✅ `supabase-player-day-migration.sql` - Script de migración completo
- ✅ `supabase-miguel-case.sql` - Configuración específica de Miguel
- ✅ `js/admin/panel.js` - Actualizado método `loadPlayers()` y `getTeamExtras()`
- ✅ `PLAYER-AVAILABILITY.md` - Esta documentación

## Soporte

Si encuentras algún problema:

1. Verifica logs de Supabase SQL Editor
2. Revisa consola del navegador (F12) en panel admin
3. Confirma que las políticas RLS están activas
4. Verifica que los JOINs en las queries funcionan correctamente
