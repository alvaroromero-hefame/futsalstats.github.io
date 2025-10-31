-- ============================================
-- Reactivar RLS después de Migración
-- Ejecutar DESPUÉS de completar la migración de datos
-- ============================================

-- Este script reactiva Row Level Security y crea
-- políticas permisivas para acceso público

-- ============================================
-- REACTIVAR RLS
-- ============================================

-- Reactivar RLS en todas las tablas
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CREAR POLÍTICAS PERMISIVAS
-- ============================================

-- Políticas para PLAYERS (acceso total público)
CREATE POLICY "Allow public all on players"
    ON players FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);

-- Políticas para MATCHES (acceso total público)
CREATE POLICY "Allow public all on matches"
    ON matches FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);

-- Políticas para SETTINGS (acceso total público)
CREATE POLICY "Allow public all on settings"
    ON settings FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);

-- ============================================
-- VERIFICACIÓN
-- ============================================

-- Verificar que RLS está habilitado
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('players', 'matches', 'settings')
ORDER BY tablename;

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
    RAISE NOTICE '✅ RLS REACTIVADO en todas las tablas';
    RAISE NOTICE '✅ Políticas públicas creadas correctamente';
    RAISE NOTICE '💡 Todas las operaciones están permitidas para usuarios públicos';
    RAISE NOTICE '⚠️  Para producción, considera políticas más restrictivas';
END $$;
