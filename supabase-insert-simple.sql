-- ============================================
-- Inserción SIMPLE y DIRECTA de datos
-- ============================================

-- Paso 1: Limpiar tabla
DELETE FROM player_availability;

-- Paso 2: Insertar TODOS los jugadores uno por uno
-- Esto es más lento pero más seguro

-- Insertar jugadores de MARTES
INSERT INTO player_availability (player_id, day, is_fixed)
SELECT id, 'martes', is_fixed
FROM players
WHERE day = 'martes';

-- Insertar jugadores de JUEVES
INSERT INTO player_availability (player_id, day, is_fixed)
SELECT id, 'jueves', is_fixed
FROM players
WHERE day = 'jueves';

-- Insertar jugadores de AMBOS días (duplicar: una fila para martes, otra para jueves)
INSERT INTO player_availability (player_id, day, is_fixed)
SELECT id, 'martes', is_fixed
FROM players
WHERE day = 'ambos';

INSERT INTO player_availability (player_id, day, is_fixed)
SELECT id, 'jueves', is_fixed
FROM players
WHERE day = 'ambos';

-- Paso 3: Configurar Miguel ESPECÍFICAMENTE
-- Miguel debe ser FIJO los JUEVES
UPDATE player_availability
SET is_fixed = true
WHERE player_id IN (SELECT id FROM players WHERE name = 'Miguel')
  AND day = 'jueves';

-- Miguel debe ser EVENTUAL los MARTES
UPDATE player_availability
SET is_fixed = false
WHERE player_id IN (SELECT id FROM players WHERE name = 'Miguel')
  AND day = 'martes';

-- Paso 4: VERIFICAR resultados
SELECT 'VERIFICACIÓN FINAL' as paso;

-- Total de registros
SELECT COUNT(*) as total_registros FROM player_availability;

-- Distribución por día y tipo
SELECT 
    day,
    is_fixed,
    COUNT(*) as cantidad
FROM player_availability
GROUP BY day, is_fixed
ORDER BY day, is_fixed DESC;

-- Estado de Miguel
SELECT 
    p.name,
    pa.day,
    CASE WHEN pa.is_fixed THEN '✓ FIJO' ELSE '○ EVENTUAL' END as tipo
FROM players p
INNER JOIN player_availability pa ON p.id = pa.player_id
WHERE p.name = 'Miguel'
ORDER BY pa.day;

-- Todos los jugadores fijos de jueves (debería mostrar 10 incluyendo Miguel)
SELECT 
    p.name,
    pa.day,
    pa.is_fixed
FROM players p
INNER JOIN player_availability pa ON p.id = pa.player_id
WHERE pa.day = 'jueves' AND pa.is_fixed = true
ORDER BY p.name;
