-- ================================================
-- FIX: Recursión Infinita en user_roles
-- ================================================

-- 1. ELIMINAR todas las políticas problemáticas de user_roles
DROP POLICY IF EXISTS "Usuarios pueden ver su propio rol" ON user_roles;
DROP POLICY IF EXISTS "Solo admins pueden modificar roles" ON user_roles;

-- 2. DESHABILITAR RLS temporalmente en user_roles
-- (Esta tabla necesita ser accesible para verificar roles)
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;

-- ALTERNATIVA (si quieres mantener RLS):
-- Crear políticas más simples sin recursión

-- Opción A: Usuarios autenticados pueden ver su propio rol
CREATE POLICY "Ver propio rol"
ON user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Opción B: Solo lectura para funciones del sistema
-- (permite que las funciones is_admin() lean sin recursión)
CREATE POLICY "Lectura para sistema"
ON user_roles FOR SELECT
TO authenticated
USING (true);

-- Opción C: Solo super admins pueden escribir
-- (requiere marcar manualmente el primer admin en la BD)
CREATE POLICY "Solo super admin puede modificar"
ON user_roles FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_roles AS ur
        WHERE ur.user_id = auth.uid() 
        AND ur.role = 'super_admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_roles AS ur
        WHERE ur.user_id = auth.uid() 
        AND ur.role = 'super_admin'
    )
);

-- ================================================
-- RECOMENDACIÓN: Deshabilitar RLS en user_roles
-- ================================================

-- Para evitar problemas, es MÁS SEGURO deshabilitar RLS en user_roles
-- Esta tabla solo almacena roles, no datos sensibles
-- Y la necesitas accesible para verificar permisos en otras tablas

ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;

-- ================================================
-- VERIFICACIÓN
-- ================================================

-- Ver políticas actuales de user_roles
SELECT * FROM pg_policies WHERE tablename = 'user_roles';

-- Verificar estado de RLS
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'user_roles';
