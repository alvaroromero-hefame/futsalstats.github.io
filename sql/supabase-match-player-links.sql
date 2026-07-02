-- ============================================
-- Vincular partidos al maestro de jugadores por id (no solo por nombre)
-- ============================================
-- blue_lineup/red_lineup (JSONB) seguirán llevando "name" como antes (no se
-- borra, se usa de fallback); a partir de ahora, además, cada entrada puede
-- llevar "player_id". El MVP pasa a tener también mvp_player_id.

ALTER TABLE matches ADD COLUMN IF NOT EXISTS mvp_player_id UUID REFERENCES players(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_matches_mvp_player ON matches(mvp_player_id);

COMMENT ON COLUMN matches.mvp_player_id IS 'Referencia al maestro de jugadores para el MVP. mvp (texto) se mantiene como fallback para partidos sin vincular.';

-- Verificación
SELECT COUNT(*) AS partidos_con_mvp_sin_vincular
FROM matches
WHERE mvp IS NOT NULL AND mvp <> '' AND mvp_player_id IS NULL;
