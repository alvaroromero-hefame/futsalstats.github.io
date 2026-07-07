-- ============================================
-- Fix: upsert de player_availability roto con temporadas
-- ============================================
-- supabase-seasons.sql sustituyó la UNIQUE(player_id, day) original por dos
-- índices ÚNICOS PARCIALES:
--   pa_global_unique  ON (player_id, day)            WHERE season_id IS NULL
--   pa_season_unique  ON (player_id, day, season_id) WHERE season_id IS NOT NULL
--
-- Postgres no puede usar un índice único parcial como "arbiter" de un
-- ON CONFLICT (columnas) salvo que la propia cláusula repita el WHERE del
-- índice, algo que el cliente de Supabase no permite enviar vía onConflict.
-- Resultado: CUALQUIER upsert a player_availability con temporada activa
-- falla con "no unique or exclusion constraint matching the ON CONFLICT
-- specification" (no es un caso concreto, es sistemático).
--
-- Ejecutar en el SQL Editor de Supabase.

-- 1. Eliminar duplicados que pudieran existir por player_id+day+season_id
--    (se conserva el registro más reciente de cada grupo)
DELETE FROM player_availability a
USING player_availability b
WHERE a.season_id IS NOT NULL
  AND a.player_id = b.player_id
  AND a.day = b.day
  AND a.season_id = b.season_id
  AND a.created_at < b.created_at;

-- 2. Sustituir los dos índices parciales por una única restricción normal
--    (season_id ya está siempre poblado desde la migración de temporadas;
--    los NULL legacy, si quedara alguno, nunca chocan entre sí en una UNIQUE normal)
DROP INDEX IF EXISTS pa_global_unique;
DROP INDEX IF EXISTS pa_season_unique;

ALTER TABLE player_availability
    ADD CONSTRAINT player_availability_player_day_season_key
    UNIQUE (player_id, day, season_id);

-- 3. Verificación: no debe devolver ninguna fila
SELECT player_id, day, season_id, COUNT(*)
FROM player_availability
GROUP BY player_id, day, season_id
HAVING COUNT(*) > 1;
