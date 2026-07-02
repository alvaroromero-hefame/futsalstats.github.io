-- ============================================
-- Backup previo a supabase-seasons.sql / supabase-players-master.sql
-- ============================================
-- Ejecutar UNA VEZ, inmediatamente antes de aplicar esos dos scripts.
-- Restaurar solo si la migración deja datos corruptos; limpiar (DROP TABLE)
-- una vez verificado que todo funciona (ver instrucciones al final).

CREATE TABLE IF NOT EXISTS matches_backup_pre_seasons (LIKE matches INCLUDING ALL);
INSERT INTO matches_backup_pre_seasons SELECT * FROM matches;

CREATE TABLE IF NOT EXISTS player_availability_backup_pre_seasons (LIKE player_availability INCLUDING ALL);
INSERT INTO player_availability_backup_pre_seasons SELECT * FROM player_availability;

CREATE TABLE IF NOT EXISTS players_backup_pre_seasons (LIKE players INCLUDING ALL);
INSERT INTO players_backup_pre_seasons SELECT * FROM players;

-- Verificación: los recuentos deben coincidir con las tablas originales
SELECT 'matches' AS tabla, COUNT(*) FROM matches_backup_pre_seasons
UNION ALL SELECT 'player_availability', COUNT(*) FROM player_availability_backup_pre_seasons
UNION ALL SELECT 'players', COUNT(*) FROM players_backup_pre_seasons;

-- ============================================
-- Restauración (solo si algo falla tras aplicar Fase 1)
-- ============================================
-- season_id es una columna nueva, no existía antes: restaurar es ponerla a NULL de nuevo.
-- UPDATE matches SET season_id = NULL;
-- UPDATE player_availability SET season_id = NULL;
--
-- players solo recibe columnas nuevas (notes/avatar_url/emoji); revertir con:
-- ALTER TABLE players DROP COLUMN notes, DROP COLUMN avatar_url, DROP COLUMN emoji;
--
-- Si hiciera falta recrear la constraint eliminada en supabase-seasons.sql:
-- ALTER TABLE player_availability ADD CONSTRAINT player_availability_player_id_day_key UNIQUE(player_id, day);

-- ============================================
-- Limpieza (ejecutar solo tras validar TODOS los pasos de Verificación del plan)
-- ============================================
-- DROP TABLE matches_backup_pre_seasons, player_availability_backup_pre_seasons, players_backup_pre_seasons;
