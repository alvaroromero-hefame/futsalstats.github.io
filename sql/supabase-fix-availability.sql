-- ============================================
-- Diagnóstico: Ver qué hay en player_availability
-- ============================================

-- 1. ¿Cuántos registros hay?
SELECT 'Total en player_availability:' as check_point, COUNT(*) as count FROM player_availability;

-- 2. ¿Qué datos hay?
SELECT * FROM player_availability LIMIT 10;

-- 3. ¿Está Miguel en player_availability?
SELECT 
    pa.*,
    p.name
FROM player_availability pa
INNER JOIN players p ON p.id = pa.player_id
WHERE p.name = 'Miguel';

-- 4. Si está vacía, forzar inserción manual de TODOS los jugadores
-- ELIMINAR TODO primero
TRUNCATE player_availability;

-- Insertar TODOS los jugadores con sus días
INSERT INTO player_availability (player_id, day, is_fixed)
SELECT 
    id,
    CASE 
        WHEN day = 'ambos' THEN 'martes'
        WHEN day = 'martes' THEN 'martes'
        WHEN day = 'jueves' THEN 'jueves'
        ELSE 'martes' -- fallback
    END,
    COALESCE(is_fixed, false)
FROM players
WHERE day IS NOT NULL;

-- Para jugadores con day='ambos', duplicar para jueves
INSERT INTO player_availability (player_id, day, is_fixed)
SELECT 
    id,
    'jueves',
    COALESCE(is_fixed, false)
FROM players
WHERE day = 'ambos';

-- 5. Verificar inserción
SELECT 'Después de inserción - Total:' as check_point, COUNT(*) as count FROM player_availability;

-- 6. Ver distribución
SELECT 
    pa.day,
    pa.is_fixed,
    COUNT(*) as total
FROM player_availability pa
GROUP BY pa.day, pa.is_fixed
ORDER BY pa.day, pa.is_fixed DESC;

-- 7. Configurar Miguel específicamente
UPDATE player_availability
SET is_fixed = true
WHERE player_id = (SELECT id FROM players WHERE name = 'Miguel')
  AND day = 'jueves';

UPDATE player_availability
SET is_fixed = false
WHERE player_id = (SELECT id FROM players WHERE name = 'Miguel')
  AND day = 'martes';

-- 8. Verificar Miguel
SELECT 
    p.name,
    pa.day,
    pa.is_fixed
FROM player_availability pa
INNER JOIN players p ON p.id = pa.player_id
WHERE p.name = 'Miguel'
ORDER BY pa.day;

-- 9. Ver TODOS los registros para depuración
SELECT 
    p.name,
    pa.day,
    pa.is_fixed
FROM player_availability pa
INNER JOIN players p ON p.id = pa.player_id
ORDER BY p.name, pa.day;
