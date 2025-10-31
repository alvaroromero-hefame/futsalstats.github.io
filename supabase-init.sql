-- ============================================
-- Futsal Stats - Inicialización de Base de Datos
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLA: players
-- Almacena información de los jugadores
-- ============================================
CREATE TABLE IF NOT EXISTS players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    is_fixed BOOLEAN DEFAULT FALSE,
    day VARCHAR(10) CHECK (day IN ('martes', 'jueves', 'ambos')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para players
CREATE INDEX idx_players_name ON players(name);
CREATE INDEX idx_players_is_fixed ON players(is_fixed);
CREATE INDEX idx_players_day ON players(day);

-- ============================================
-- TABLA: matches
-- Almacena todos los partidos jugados
-- ============================================
CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_date DATE NOT NULL,
    day VARCHAR(10) NOT NULL CHECK (day IN ('martes', 'jueves')),
    mvp VARCHAR(100),
    result VARCHAR(20) NOT NULL CHECK (result IN ('VictoryRed', 'VictoryBlue', 'Draw')),
    blue_result INTEGER NOT NULL CHECK (blue_result >= 0),
    red_result INTEGER NOT NULL CHECK (red_result >= 0),
    blue_lineup JSONB NOT NULL,
    red_lineup JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para matches
CREATE INDEX idx_matches_date ON matches(match_date DESC);
CREATE INDEX idx_matches_day ON matches(day);
CREATE INDEX idx_matches_mvp ON matches(mvp);
CREATE INDEX idx_matches_result ON matches(result);

-- ============================================
-- TABLA: settings
-- Configuración global de la liga
-- ============================================
CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    day VARCHAR(10) NOT NULL UNIQUE CHECK (day IN ('martes', 'jueves')),
    next_selector VARCHAR(100),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- FUNCIONES AUXILIARES
-- ============================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para actualizar updated_at
CREATE TRIGGER update_players_updated_at
    BEFORE UPDATE ON players
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_matches_updated_at
    BEFORE UPDATE ON matches
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at
    BEFORE UPDATE ON settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura pública
CREATE POLICY "Allow public read access on players"
    ON players FOR SELECT
    TO anon
    USING (true);

CREATE POLICY "Allow public read access on matches"
    ON matches FOR SELECT
    TO anon
    USING (true);

CREATE POLICY "Allow public read access on settings"
    ON settings FOR SELECT
    TO anon
    USING (true);

-- Políticas de escritura para usuarios autenticados
CREATE POLICY "Authenticated users can insert players"
    ON players FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update players"
    ON players FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users can insert matches"
    ON matches FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update matches"
    ON matches FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update settings"
    ON settings FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- ============================================
-- DATOS INICIALES
-- ============================================

-- Configuración inicial de settings
INSERT INTO settings (day, next_selector) VALUES
    ('martes', 'Ruben'),
    ('jueves', 'Bienve')
ON CONFLICT (day) DO NOTHING;

-- ============================================
-- VISTAS ÚTILES
-- ============================================

-- Vista de estadísticas por jugador
CREATE OR REPLACE VIEW player_stats AS
SELECT 
    p.name,
    p.is_fixed,
    p.day,
    COUNT(DISTINCT m.id) as total_matches,
    SUM(CASE WHEN m.mvp = p.name THEN 1 ELSE 0 END) as mvp_count
FROM players p
LEFT JOIN matches m ON (
    m.blue_lineup::text LIKE '%' || p.name || '%' OR
    m.red_lineup::text LIKE '%' || p.name || '%'
)
GROUP BY p.name, p.is_fixed, p.day;

-- Vista de últimos partidos
CREATE OR REPLACE VIEW recent_matches AS
SELECT 
    m.match_date,
    m.day,
    m.mvp,
    m.result,
    m.blue_result,
    m.red_result
FROM matches m
ORDER BY m.match_date DESC
LIMIT 10;

-- ============================================
-- FUNCIONES DE ESTADÍSTICAS
-- ============================================

-- Función para obtener estadísticas de un jugador
CREATE OR REPLACE FUNCTION get_player_stats(player_name TEXT, match_day TEXT DEFAULT NULL)
RETURNS TABLE (
    total_goals BIGINT,
    total_assists BIGINT,
    total_keeper BIGINT,
    total_matches BIGINT,
    total_wins BIGINT,
    total_draws BIGINT,
    total_losses BIGINT,
    mvp_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        -- Aquí irían las agregaciones según la estructura de tu JSONB
        0::BIGINT as total_goals,
        0::BIGINT as total_assists,
        0::BIGINT as total_keeper,
        COUNT(DISTINCT m.id) as total_matches,
        0::BIGINT as total_wins,
        0::BIGINT as total_draws,
        0::BIGINT as total_losses,
        SUM(CASE WHEN m.mvp = player_name THEN 1 ELSE 0 END) as mvp_count
    FROM matches m
    WHERE (match_day IS NULL OR m.day = match_day)
      AND (m.blue_lineup::text LIKE '%' || player_name || '%' 
           OR m.red_lineup::text LIKE '%' || player_name || '%');
END;
$$ LANGUAGE plpgsql;

-- Función para obtener clasificación
CREATE OR REPLACE FUNCTION get_classification(match_day TEXT)
RETURNS TABLE (
    player_name TEXT,
    total_points NUMERIC,
    total_goals INTEGER,
    total_assists INTEGER,
    total_keeper INTEGER,
    wins INTEGER,
    draws INTEGER,
    losses INTEGER,
    mvps INTEGER
) AS $$
BEGIN
    -- Esta función necesitará ser implementada según tu lógica de puntuación
    RETURN QUERY
    SELECT
        'Ejemplo'::TEXT as player_name,
        0::NUMERIC as total_points,
        0::INTEGER as total_goals,
        0::INTEGER as total_assists,
        0::INTEGER as total_keeper,
        0::INTEGER as wins,
        0::INTEGER as draws,
        0::INTEGER as losses,
        0::INTEGER as mvps
    LIMIT 0;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMENTARIOS
-- ============================================

COMMENT ON TABLE players IS 'Almacena información de los jugadores';
COMMENT ON TABLE matches IS 'Almacena todos los partidos jugados';
COMMENT ON TABLE settings IS 'Configuración global de la liga';

COMMENT ON COLUMN players.is_fixed IS 'Indica si el jugador es fijo o eventual';
COMMENT ON COLUMN players.day IS 'Día en que juega: martes, jueves o ambos';
COMMENT ON COLUMN matches.blue_lineup IS 'Array JSON con los jugadores del equipo azul';
COMMENT ON COLUMN matches.red_lineup IS 'Array JSON con los jugadores del equipo rojo';

-- ============================================
-- VERIFICACIÓN
-- ============================================

-- Verificar que todas las tablas se crearon correctamente
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name IN ('players', 'matches', 'settings')
ORDER BY table_name;

-- Fin del script
