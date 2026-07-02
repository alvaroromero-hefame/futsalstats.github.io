-- ============================================
-- Maestro de jugadores: campos enriquecidos en players
-- ============================================
-- Ejecutar DESPUÉS de supabase-backup-pre-seasons.sql (independiente de supabase-seasons.sql,
-- distinta tabla, pero se lista tras ella en el orden del plan).

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS notes      TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS emoji      VARCHAR(10);

-- Los campos legacy is_fixed/day de players quedan nullable, sin borrarse ni escribirse más
-- (la disponibilidad por día/temporada vive por completo en player_availability).

COMMENT ON COLUMN players.notes IS 'Notas libres del maestro de jugadores (admin)';
COMMENT ON COLUMN players.avatar_url IS 'URL de avatar del jugador (opcional)';
COMMENT ON COLUMN players.emoji IS 'Emoji identificativo del jugador (opcional, máx. 2 caracteres visibles)';

-- Verificación
SELECT id, name, emoji, avatar_url, notes FROM players ORDER BY name LIMIT 10;
