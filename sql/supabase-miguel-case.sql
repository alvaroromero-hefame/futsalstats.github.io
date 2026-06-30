-- ============================================
-- Configuración específica: Miguel
-- ============================================
-- Miguel es FIJO los JUEVES y EVENTUAL los MARTES
--
-- IMPORTANTE: Ejecutar DESPUÉS de supabase-player-day-migration.sql
-- ============================================

-- Obtener ID de Miguel
DO $$
DECLARE
    miguel_id UUID;
BEGIN
    -- Buscar si Miguel ya existe
    SELECT id INTO miguel_id FROM players WHERE name = 'Miguel';
    
    -- Si no existe, crearlo
    IF miguel_id IS NULL THEN
        INSERT INTO players (name)
        VALUES ('Miguel')
        RETURNING id INTO miguel_id;
        
        RAISE NOTICE 'Jugador Miguel creado con ID: %', miguel_id;
    ELSE
        RAISE NOTICE 'Jugador Miguel encontrado con ID: %', miguel_id;
    END IF;
    
    -- Configurar disponibilidad: FIJO los JUEVES
    INSERT INTO player_availability (player_id, day, is_fixed)
    VALUES (miguel_id, 'jueves', true)
    ON CONFLICT (player_id, day) 
    DO UPDATE SET is_fixed = true;
    
    RAISE NOTICE 'Miguel configurado como FIJO los jueves';
    
    -- Configurar disponibilidad: EVENTUAL los MARTES
    INSERT INTO player_availability (player_id, day, is_fixed)
    VALUES (miguel_id, 'martes', false)
    ON CONFLICT (player_id, day) 
    DO UPDATE SET is_fixed = false;
    
    RAISE NOTICE 'Miguel configurado como EVENTUAL los martes';
    
END $$;

-- Verificar configuración de Miguel
SELECT 
    p.name,
    pa.day,
    CASE WHEN pa.is_fixed THEN '✓ FIJO' ELSE '○ EVENTUAL' END as tipo
FROM players p
INNER JOIN player_availability pa ON p.id = pa.player_id
WHERE p.name = 'Miguel'
ORDER BY pa.day;

-- Resultado esperado:
-- name    | day    | tipo
-- --------|--------|------------
-- Miguel  | jueves | ✓ FIJO
-- Miguel  | martes | ○ EVENTUAL
