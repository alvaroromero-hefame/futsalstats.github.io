-- ================================================
-- CONFIGURACIÓN DE SEGURIDAD - ROW LEVEL SECURITY
-- FutsalStats - Supabase Database
-- ================================================

-- Este script configura las políticas de seguridad (RLS) para todas las tablas
-- IMPORTANTE: Ejecutar en Supabase SQL Editor

-- ================================================
-- 1. HABILITAR RLS EN TODAS LAS TABLAS
-- ================================================

-- Habilitar RLS en tabla de jugadores
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

-- Habilitar RLS en tabla de partidos
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- Habilitar RLS en tabla de disponibilidad
ALTER TABLE player_availability ENABLE ROW LEVEL SECURITY;

-- Habilitar RLS en tabla de configuración
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Habilitar RLS en tabla de roles de usuario (si existe)
ALTER TABLE IF EXISTS user_roles ENABLE ROW LEVEL SECURITY;

-- Habilitar RLS en tabla de logs de auditoría (si existe)
ALTER TABLE IF EXISTS audit_logs ENABLE ROW LEVEL SECURITY;

-- ================================================
-- 2. CREAR TABLA DE ROLES DE USUARIO (si no existe)
-- ================================================

CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Habilitar RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- ================================================
-- 3. CREAR TABLA DE AUDITORÍA (si no existe)
-- ================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(100),
    record_id UUID,
    details JSONB,
    user_id UUID REFERENCES auth.users(id),
    ip_address VARCHAR(45),
    user_agent TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table ON audit_logs(table_name);

-- Habilitar RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ================================================
-- 4. POLÍTICAS DE LECTURA PÚBLICA
-- ================================================

-- PLAYERS: Lectura pública (cualquiera puede ver jugadores)
CREATE POLICY "Lectura pública de jugadores"
ON players FOR SELECT
TO public
USING (true);

-- MATCHES: Lectura pública (cualquiera puede ver partidos)
CREATE POLICY "Lectura pública de partidos"
ON matches FOR SELECT
TO public
USING (true);

-- PLAYER_AVAILABILITY: Lectura pública (cualquiera puede ver disponibilidad)
CREATE POLICY "Lectura pública de disponibilidad"
ON player_availability FOR SELECT
TO public
USING (true);

-- SETTINGS: Lectura pública de configuración general
CREATE POLICY "Lectura pública de configuración"
ON settings FOR SELECT
TO public
USING (true);

-- ================================================
-- 5. POLÍTICAS DE ESCRITURA PARA ADMINISTRADORES
-- ================================================

-- PLAYERS: Solo admins pueden insertar jugadores
CREATE POLICY "Solo admins pueden insertar jugadores"
ON players FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
);

-- PLAYERS: Solo admins pueden actualizar jugadores
CREATE POLICY "Solo admins pueden actualizar jugadores"
ON players FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
);

-- PLAYERS: Solo admins pueden eliminar jugadores
CREATE POLICY "Solo admins pueden eliminar jugadores"
ON players FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
);

-- ================================================
-- MATCHES: Políticas similares
-- ================================================

CREATE POLICY "Solo admins pueden insertar partidos"
ON matches FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
);

CREATE POLICY "Solo admins pueden actualizar partidos"
ON matches FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
);

CREATE POLICY "Solo admins pueden eliminar partidos"
ON matches FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
);

-- ================================================
-- PLAYER_AVAILABILITY: Políticas similares
-- ================================================

CREATE POLICY "Solo admins pueden insertar disponibilidad"
ON player_availability FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
);

CREATE POLICY "Solo admins pueden actualizar disponibilidad"
ON player_availability FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
);

CREATE POLICY "Solo admins pueden eliminar disponibilidad"
ON player_availability FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
);

-- ================================================
-- SETTINGS: Políticas de configuración
-- ================================================

CREATE POLICY "Solo admins pueden modificar configuración"
ON settings FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
);

-- ================================================
-- USER_ROLES: Los usuarios pueden ver su propio rol
-- ================================================

CREATE POLICY "Usuarios pueden ver su propio rol"
ON user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Solo admins pueden modificar roles
CREATE POLICY "Solo admins pueden modificar roles"
ON user_roles FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
);

-- ================================================
-- AUDIT_LOGS: Solo admins pueden ver logs
-- ================================================

CREATE POLICY "Solo admins pueden ver logs de auditoría"
ON audit_logs FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
);

-- Sistema puede insertar logs
CREATE POLICY "Sistema puede insertar logs"
ON audit_logs FOR INSERT
TO authenticated
WITH CHECK (true);

-- ================================================
-- 6. FUNCIONES AUXILIARES
-- ================================================

-- Función para verificar si un usuario es admin
CREATE OR REPLACE FUNCTION is_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = user_uuid
        AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener el rol de un usuario
CREATE OR REPLACE FUNCTION get_user_role(user_uuid UUID)
RETURNS VARCHAR AS $$
DECLARE
    user_role VARCHAR;
BEGIN
    SELECT role INTO user_role
    FROM user_roles
    WHERE user_id = user_uuid;
    
    RETURN COALESCE(user_role, 'user');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- 7. TRIGGERS PARA AUDITORÍA (OPCIONAL)
-- ================================================

-- Función de trigger para registrar cambios
CREATE OR REPLACE FUNCTION log_table_changes()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (action, table_name, record_id, details, user_id)
    VALUES (
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        jsonb_build_object(
            'old', to_jsonb(OLD),
            'new', to_jsonb(NEW)
        ),
        auth.uid()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar triggers a tablas importantes (comentado, activar si se desea)
-- DROP TRIGGER IF EXISTS players_audit ON players;
-- CREATE TRIGGER players_audit
--     AFTER INSERT OR UPDATE OR DELETE ON players
--     FOR EACH ROW EXECUTE FUNCTION log_table_changes();

-- DROP TRIGGER IF EXISTS matches_audit ON matches;
-- CREATE TRIGGER matches_audit
--     AFTER INSERT OR UPDATE OR DELETE ON matches
--     FOR EACH ROW EXECUTE FUNCTION log_table_changes();

-- ================================================
-- 8. CREAR PRIMER USUARIO ADMINISTRADOR
-- ================================================

-- IMPORTANTE: Reemplazar 'admin@futsalstats.com' con el email del administrador
-- Primero crear el usuario en Supabase Authentication, luego ejecutar esto:

-- INSERT INTO user_roles (user_id, role)
-- SELECT id, 'admin'
-- FROM auth.users
-- WHERE email = 'admin@futsalstats.com'
-- ON CONFLICT (user_id) DO UPDATE SET role = 'admin', updated_at = NOW();

-- ================================================
-- 9. VERIFICACIÓN DE CONFIGURACIÓN
-- ================================================

-- Verificar que RLS está habilitado
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Ver todas las políticas activas
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd as operation,
    qual as using_clause
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Contar políticas por tabla
SELECT 
    tablename,
    COUNT(*) as num_policies
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- ================================================
-- 10. COMANDOS ÚTILES PARA DEBUGGING
-- ================================================

-- Ver usuario actual
-- SELECT auth.uid(), auth.email();

-- Ver rol del usuario actual
-- SELECT get_user_role(auth.uid());

-- Verificar si usuario actual es admin
-- SELECT is_admin(auth.uid());

-- Ver todos los usuarios con roles
-- SELECT 
--     u.email,
--     COALESCE(ur.role, 'user') as role,
--     ur.created_at
-- FROM auth.users u
-- LEFT JOIN user_roles ur ON ur.user_id = u.id
-- ORDER BY ur.created_at DESC;

-- Ver últimos logs de auditoría
-- SELECT 
--     action,
--     table_name,
--     timestamp,
--     details
-- FROM audit_logs
-- ORDER BY timestamp DESC
-- LIMIT 50;

-- ================================================
-- FIN DEL SCRIPT
-- ================================================

-- NOTAS IMPORTANTES:
-- 1. Ejecutar todo este script en Supabase SQL Editor
-- 2. Crear el primer usuario admin en Supabase Authentication
-- 3. Descomentar y ejecutar el INSERT INTO user_roles para asignar rol admin
-- 4. Verificar que las políticas funcionan correctamente
-- 5. Probar acceso desde la aplicación con usuario normal y admin
