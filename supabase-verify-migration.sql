-- ============================================
-- Verificar y Forzar Migración de Datos
-- ============================================

-- 1. Ver cuántos registros hay en players
SELECT 'Total jugadores en players:' as info, COUNT(*) as total FROM players;

-- 2. Ver estructura de datos en players
SELECT 
    id,
    name,
    day,
    is_fixed,
    created_at
FROM players
ORDER BY name
LIMIT 10;

-- 3. Ver cuántos registros hay en player_availability
SELECT 'Total registros en player_availability:' as info, COUNT(*) as total FROM player_availability;

-- 4. Ver datos en player_availability
SELECT 
    pa.id,
    p.name,
    pa.day,
    pa.is_fixed
FROM player_availability pa
INNER JOIN players p ON p.id = pa.player_id
ORDER BY p.name, pa.day;

-- 5. FORZAR migración si player_availability está vacía
-- Eliminar datos previos que puedan estar mal
DELETE FROM player_availability;

-- Migrar jugadores con day específico (martes o jueves)
INSERT INTO player_availability (player_id, day, is_fixed)
SELECT 
    id as player_id,
    day,
    is_fixed
FROM players
WHERE day IN ('martes', 'jueves')
ON CONFLICT (player_id, day) DO NOTHING;

-- Migrar jugadores con day='ambos' - crear entrada para martes
INSERT INTO player_availability (player_id, day, is_fixed)
SELECT 
    id as player_id,
    'martes' as day,
    is_fixed
FROM players
WHERE day = 'ambos'
ON CONFLICT (player_id, day) DO NOTHING;

-- Migrar jugadores con day='ambos' - crear entrada para jueves
INSERT INTO player_availability (player_id, day, is_fixed)
SELECT 
    id as player_id,
    'jueves' as day,
    is_fixed
FROM players
WHERE day = 'ambos'
ON CONFLICT (player_id, day) DO NOTHING;

-- 6. Verificar resultado después de migración
SELECT 'Después de migración - Total en player_availability:' as info, COUNT(*) as total 
FROM player_availability;

-- 7. Ver distribución por día y tipo
SELECT 
    pa.day,
    CASE WHEN pa.is_fixed THEN 'Fijos' ELSE 'Eventuales' END as tipo,
    COUNT(*) as total,
    STRING_AGG(p.name, ', ' ORDER BY p.name) as jugadores
FROM player_availability pa
INNER JOIN players p ON p.id = pa.player_id
GROUP BY pa.day, pa.is_fixed
ORDER BY pa.day, pa.is_fixed DESC;

-- 8. Buscar jugadores problemáticos (sin day o is_fixed null)
SELECT 
    'Jugadores sin day o is_fixed:' as info,
    COUNT(*) as total
FROM players
WHERE day IS NULL OR is_fixed IS NULL;

-- Si hay jugadores problemáticos, listarlos
SELECT 
    id,
    name,
    day,
    is_fixed
FROM players
WHERE day IS NULL OR is_fixed IS NULL;
