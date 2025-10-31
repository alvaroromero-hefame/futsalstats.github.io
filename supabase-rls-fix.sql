-- ============================================
-- Fix RLS Policies para player_availability
-- ============================================

-- Desactivar RLS en player_availability
ALTER TABLE player_availability DISABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes de player_availability
DROP POLICY IF EXISTS "Allow public read access on player_availability" ON player_availability;
DROP POLICY IF EXISTS "Authenticated users can insert player_availability" ON player_availability;
DROP POLICY IF EXISTS "Authenticated users can update player_availability" ON player_availability;
DROP POLICY IF EXISTS "Authenticated users can delete player_availability" ON player_availability;
DROP POLICY IF EXISTS "Enable read access for all users" ON player_availability;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON player_availability;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON player_availability;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON player_availability;

-- Verificar políticas de player_availability
SELECT 
    policyname,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'player_availability';

-- Verificar que RLS está desactivado
SELECT 
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'player_availability';

-- Probar query como anon (debería funcionar ahora)
SET ROLE anon;
SELECT COUNT(*) as test_anon_count FROM player_availability;
RESET ROLE;

-- ============================================
-- Fix RLS en tablas originales
-- ============================================

-- Desactivar RLS en todas las tablas
ALTER TABLE players DISABLE ROW LEVEL SECURITY;
ALTER TABLE matches DISABLE ROW LEVEL SECURITY;
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;

-- ============================================
-- LIMPIAR POLÍTICAS EXISTENTES
-- ============================================

-- Eliminar todas las políticas existentes
DROP POLICY IF EXISTS "Allow public read access on players" ON players;
DROP POLICY IF EXISTS "Allow public read access on matches" ON matches;
DROP POLICY IF EXISTS "Allow public read access on settings" ON settings;

DROP POLICY IF EXISTS "Authenticated users can insert players" ON players;
DROP POLICY IF EXISTS "Authenticated users can update players" ON players;
DROP POLICY IF EXISTS "Authenticated users can delete players" ON players;

DROP POLICY IF EXISTS "Authenticated users can insert matches" ON matches;
DROP POLICY IF EXISTS "Authenticated users can update matches" ON matches;
DROP POLICY IF EXISTS "Authenticated users can delete matches" ON matches;

DROP POLICY IF EXISTS "Authenticated users can insert settings" ON settings;
DROP POLICY IF EXISTS "Authenticated users can update settings" ON settings;
DROP POLICY IF EXISTS "Authenticated users can delete settings" ON settings;

DROP POLICY IF EXISTS "Allow anon all on players" ON players;
DROP POLICY IF EXISTS "Allow anon all on matches" ON matches;
DROP POLICY IF EXISTS "Allow anon all on settings" ON settings;

-- ============================================
-- VERIFICACIÓN
-- ============================================

-- Verificar políticas activas
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('players', 'matches', 'settings')
ORDER BY tablename, policyname;

-- Mensaje de confirmación
DO $$ 
BEGIN
    RAISE NOTICE '✅ RLS DESACTIVADO en todas las tablas';
    RAISE NOTICE '✅ Políticas eliminadas correctamente';
    RAISE NOTICE '💡 Ahora puedes ejecutar el script de migración sin restricciones';
    RAISE NOTICE '⚠️  IMPORTANTE: RLS está DESACTIVADO';
    RAISE NOTICE '⚠️  Después de migrar, ejecuta supabase-rls-enable.sql para reactivarlo';
END $$;

