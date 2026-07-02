-- ============================================
-- Temporadas: tabla seasons + season_id en matches/player_availability
-- ============================================
-- Ejecutar DESPUÉS de supabase-backup-pre-seasons.sql

CREATE TABLE IF NOT EXISTS seasons (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       VARCHAR(50) NOT NULL,
  day        VARCHAR(10) NOT NULL CHECK (day IN ('martes', 'jueves')),
  start_date DATE NOT NULL,
  end_date   DATE,
  is_active  BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(day, name)
);

ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access on seasons" ON seasons;
CREATE POLICY "Allow public read access on seasons"
    ON seasons FOR SELECT
    TO anon
    USING (true);

-- Sin esta política, el admin (rol "authenticated") no ve NINGUNA fila de seasons:
-- la policy de "anon" de arriba no se aplica a sesiones logueadas.
DROP POLICY IF EXISTS "Authenticated users can read seasons" ON seasons;
CREATE POLICY "Authenticated users can read seasons"
    ON seasons FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert seasons" ON seasons;
CREATE POLICY "Authenticated users can insert seasons"
    ON seasons FOR INSERT
    TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update seasons" ON seasons;
CREATE POLICY "Authenticated users can update seasons"
    ON seasons FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

ALTER TABLE matches ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES seasons(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_matches_season ON matches(season_id);

ALTER TABLE player_availability ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES seasons(id) ON DELETE CASCADE;
ALTER TABLE player_availability DROP CONSTRAINT IF EXISTS player_availability_player_id_day_key;
CREATE UNIQUE INDEX IF NOT EXISTS pa_global_unique
  ON player_availability(player_id, day) WHERE season_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS pa_season_unique
  ON player_availability(player_id, day, season_id) WHERE season_id IS NOT NULL;

INSERT INTO seasons (name, day, start_date, is_active) VALUES
  ('2025-26', 'martes', '2025-09-01', true),
  ('2025-26', 'jueves', '2025-09-01', true)
ON CONFLICT DO NOTHING;

UPDATE matches
SET season_id = (SELECT id FROM seasons WHERE name = '2025-26' AND day = matches.day)
WHERE season_id IS NULL;

UPDATE player_availability
SET season_id = (SELECT id FROM seasons WHERE name = '2025-26' AND day = player_availability.day)
WHERE season_id IS NULL;

-- ============================================
-- VERIFICACIÓN
-- ============================================
SELECT day, name, is_active, start_date FROM seasons ORDER BY day, start_date DESC;
SELECT COUNT(*) AS matches_sin_season FROM matches WHERE season_id IS NULL;
SELECT COUNT(*) AS availability_sin_season FROM player_availability WHERE season_id IS NULL;

COMMENT ON TABLE seasons IS 'Temporadas por día (ciclo Septiembre-Septiembre). Cada día tiene su propia fila aunque comparta nombre con la del otro día.';
COMMENT ON COLUMN matches.season_id IS 'Temporada a la que pertenece el partido. NULL = sin asignar (no debería ocurrir tras la migración inicial).';
COMMENT ON COLUMN player_availability.season_id IS 'Temporada de esta disponibilidad. NULL solo para registros heredados anteriores al sistema de temporadas.';
