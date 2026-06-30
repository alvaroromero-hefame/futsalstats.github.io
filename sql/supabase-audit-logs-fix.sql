-- Script de migración para audit_logs
-- Convierte record_id de VARCHAR(100) a TEXT y elimina FK de user_id

-- Opción 1: Si la tabla está vacía o puedes borrarla
DROP TABLE IF EXISTS audit_logs CASCADE;

-- Crear tabla con schema corregido
CREATE TABLE audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(100),
    record_id TEXT,  -- TEXT en lugar de VARCHAR para flexibilidad
    details JSONB,
    user_id UUID,  -- Sin FK para permitir inserts sin restricciones
    ip_address VARCHAR(45),
    user_agent TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_table ON audit_logs(table_name);

-- RLS para audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Solo admins pueden ver logs
CREATE POLICY "Admins can view audit logs"
    ON audit_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role = 'admin'
        )
    );

-- El sistema puede insertar logs (sin restricción de RLS para inserts)
CREATE POLICY "System can insert audit logs"
    ON audit_logs FOR INSERT
    WITH CHECK (true);

-- Comentarios
COMMENT ON TABLE audit_logs IS 'Registro de auditoría de todas las acciones importantes';
COMMENT ON COLUMN audit_logs.action IS 'Tipo de acción: LOGIN_SUCCESS, CREATE_PLAYER, DELETE_MATCH, etc.';
COMMENT ON COLUMN audit_logs.table_name IS 'Tabla afectada por la acción';
COMMENT ON COLUMN audit_logs.record_id IS 'ID del registro afectado (puede ser UUID, int, o string)';
COMMENT ON COLUMN audit_logs.details IS 'Detalles adicionales en formato JSON';
COMMENT ON COLUMN audit_logs.ip_address IS 'Dirección IP del cliente';
COMMENT ON COLUMN audit_logs.user_agent IS 'User agent del navegador';

-- Verificación
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'audit_logs'
ORDER BY ordinal_position;
