-- ============================================
-- Migración: Permitir jugadores fijos en un día y eventuales en otro
-- ============================================
-- CASO DE USO: Miguel es fijo los jueves pero eventual los martes
--
-- ESTRATEGIA: Crear tabla player_availability que relaciona
-- cada jugador con cada día y su tipo (fijo/eventual)
-- ============================================

-- 1. Crear nueva tabla de disponibilidad por jugador y día
CREATE TABLE IF NOT EXISTS player_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    day VARCHAR(10) NOT NULL CHECK (day IN ('martes', 'jueves')),
    is_fixed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Un jugador solo puede tener una entrada por día
    UNIQUE(player_id, day)
);

-- Índices para player_availability
CREATE INDEX IF NOT EXISTS idx_player_availability_player_id ON player_availability(player_id);
CREATE INDEX IF NOT EXISTS idx_player_availability_day ON player_availability(day);
CREATE INDEX IF NOT EXISTS idx_player_availability_day_fixed ON player_availability(day, is_fixed);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_player_availability_updated_at ON player_availability;
CREATE TRIGGER update_player_availability_updated_at
    BEFORE UPDATE ON player_availability
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 2. Habilitar RLS
ALTER TABLE player_availability ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura pública
DROP POLICY IF EXISTS "Allow public read access on player_availability" ON player_availability;
CREATE POLICY "Allow public read access on player_availability"
    ON player_availability FOR SELECT
    TO anon
    USING (true);

-- Políticas de escritura para usuarios autenticados
DROP POLICY IF EXISTS "Authenticated users can insert player_availability" ON player_availability;
CREATE POLICY "Authenticated users can insert player_availability"
    ON player_availability FOR INSERT
    TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update player_availability" ON player_availability;
CREATE POLICY "Authenticated users can update player_availability"
    ON player_availability FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can delete player_availability" ON player_availability;
CREATE POLICY "Authenticated users can delete player_availability"
    ON player_availability FOR DELETE
    TO authenticated
    USING (true);

-- 3. Migrar datos existentes de players a player_availability
INSERT INTO player_availability (player_id, day, is_fixed)
SELECT 
    id as player_id,
    CASE 
        WHEN day = 'ambos' THEN 'martes'
        ELSE day
    END as day,
    is_fixed
FROM players
WHERE day IS NOT NULL
ON CONFLICT (player_id, day) DO NOTHING;

-- Si el jugador juega "ambos" días, crear también la entrada para jueves
INSERT INTO player_availability (player_id, day, is_fixed)
SELECT 
    id as player_id,
    'jueves' as day,
    is_fixed
FROM players
WHERE day = 'ambos'
ON CONFLICT (player_id, day) DO NOTHING;

-- 4. OPCIONAL: Eliminar columnas obsoletas de players
-- (Comentado por seguridad - descomentar después de verificar)
-- ALTER TABLE players DROP COLUMN IF EXISTS is_fixed;
-- ALTER TABLE players DROP COLUMN IF EXISTS day;

-- 5. Crear vista para facilitar consultas (reemplaza la tabla players antigua)
CREATE OR REPLACE VIEW players_with_availability AS
SELECT 
    p.id,
    p.name,
    pa.day,
    pa.is_fixed,
    p.created_at,
    p.updated_at
FROM players p
LEFT JOIN player_availability pa ON p.id = pa.player_id;

-- 6. Crear funciones auxiliares para consultas comunes

-- Obtener jugadores fijos de un día
CREATE OR REPLACE FUNCTION get_fixed_players(match_day TEXT)
RETURNS TABLE (
    id UUID,
    name VARCHAR(100),
    day VARCHAR(10)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        pa.day
    FROM players p
    INNER JOIN player_availability pa ON p.id = pa.player_id
    WHERE pa.day = match_day
      AND pa.is_fixed = true
    ORDER BY p.name;
END;
$$ LANGUAGE plpgsql;

-- Obtener jugadores eventuales de un día
CREATE OR REPLACE FUNCTION get_eventual_players(match_day TEXT)
RETURNS TABLE (
    id UUID,
    name VARCHAR(100),
    day VARCHAR(10)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        pa.day
    FROM players p
    INNER JOIN player_availability pa ON p.id = pa.player_id
    WHERE pa.day = match_day
      AND pa.is_fixed = false
    ORDER BY p.name;
END;
$$ LANGUAGE plpgsql;

-- Obtener todos los jugadores de un día (fijos + eventuales)
CREATE OR REPLACE FUNCTION get_all_players(match_day TEXT)
RETURNS TABLE (
    id UUID,
    name VARCHAR(100),
    day VARCHAR(10),
    is_fixed BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        pa.day,
        pa.is_fixed
    FROM players p
    INNER JOIN player_availability pa ON p.id = pa.player_id
    WHERE pa.day = match_day
    ORDER BY pa.is_fixed DESC, p.name;
END;
$$ LANGUAGE plpgsql;

-- 7. Ejemplo de inserción del caso Miguel
-- (Comentado - ajustar según tu caso real)
/*
-- Obtener ID de Miguel
DO $$
DECLARE
    miguel_id UUID;
BEGIN
    SELECT id INTO miguel_id FROM players WHERE name = 'Miguel';
    
    IF miguel_id IS NOT NULL THEN
        -- Miguel es fijo los jueves
        INSERT INTO player_availability (player_id, day, is_fixed)
        VALUES (miguel_id, 'jueves', true)
        ON CONFLICT (player_id, day) 
        DO UPDATE SET is_fixed = true;
        
        -- Miguel es eventual los martes
        INSERT INTO player_availability (player_id, day, is_fixed)
        VALUES (miguel_id, 'martes', false)
        ON CONFLICT (player_id, day) 
        DO UPDATE SET is_fixed = false;
    END IF;
END $$;
*/

-- ============================================
-- VERIFICACIÓN
-- ============================================

-- Ver distribución de jugadores por día y tipo
SELECT 
    pa.day,
    pa.is_fixed,
    COUNT(*) as total_players,
    STRING_AGG(p.name, ', ' ORDER BY p.name) as players
FROM player_availability pa
INNER JOIN players p ON p.id = pa.player_id
GROUP BY pa.day, pa.is_fixed
ORDER BY pa.day, pa.is_fixed DESC;

-- Ver jugadores que juegan ambos días
SELECT 
    p.name,
    STRING_AGG(
        pa.day || ' (' || CASE WHEN pa.is_fixed THEN 'Fijo' ELSE 'Eventual' END || ')',
        ', ' 
        ORDER BY pa.day
    ) as availability
FROM players p
INNER JOIN player_availability pa ON p.id = pa.player_id
GROUP BY p.id, p.name
HAVING COUNT(DISTINCT pa.day) > 1
ORDER BY p.name;

-- Ver todos los jugadores con su disponibilidad
SELECT 
    p.name,
    pa.day,
    CASE WHEN pa.is_fixed THEN 'Fijo' ELSE 'Eventual' END as tipo
FROM players p
INNER JOIN player_availability pa ON p.id = pa.player_id
ORDER BY p.name, pa.day;

COMMENT ON TABLE player_availability IS 'Disponibilidad de jugadores por día (permite ser fijo en un día y eventual en otro)';
COMMENT ON COLUMN player_availability.is_fixed IS 'Si el jugador es fijo (true) o eventual (false) para este día específico';

-- Fin de migración
