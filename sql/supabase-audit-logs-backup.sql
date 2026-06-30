-- Script de Backup y Limpieza de audit_logs
-- Exporta logs antiguos y limpia la tabla periódicamente

-- ===================================
-- FUNCIÓN: Backup de Logs Antiguos
-- ===================================

CREATE OR REPLACE FUNCTION backup_old_audit_logs(days_to_keep INTEGER DEFAULT 90)
RETURNS TABLE (
    logs_backed_up INTEGER,
    logs_deleted INTEGER,
    backup_table_name TEXT
) AS $$
DECLARE
    backup_table TEXT;
    cutoff_date TIMESTAMPTZ;
    backed_up_count INTEGER;
    deleted_count INTEGER;
BEGIN
    -- Generar nombre de tabla de backup con fecha
    backup_table := 'audit_logs_archive_' || to_char(NOW(), 'YYYY_MM_DD');
    cutoff_date := NOW() - (days_to_keep || ' days')::INTERVAL;
    
    -- Crear tabla de backup si no existe
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I (LIKE audit_logs INCLUDING ALL)
    ', backup_table);
    
    -- Copiar logs antiguos a la tabla de backup
    EXECUTE format('
        INSERT INTO %I 
        SELECT * FROM audit_logs 
        WHERE timestamp < $1
    ', backup_table)
    USING cutoff_date;
    
    GET DIAGNOSTICS backed_up_count = ROW_COUNT;
    
    -- Eliminar logs antiguos de la tabla principal
    DELETE FROM audit_logs WHERE timestamp < cutoff_date;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Retornar estadísticas
    RETURN QUERY SELECT backed_up_count, deleted_count, backup_table;
    
    -- Log de la operación
    RAISE NOTICE 'Backup completado: % logs copiados a %, % logs eliminados de audit_logs',
        backed_up_count, backup_table, deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Comentario
COMMENT ON FUNCTION backup_old_audit_logs IS 
'Crea backup de logs antiguos y los elimina de la tabla principal. 
Uso: SELECT * FROM backup_old_audit_logs(90);';

-- ===================================
-- FUNCIÓN: Limpieza Simple (sin backup)
-- ===================================

CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
    cutoff_date TIMESTAMPTZ;
BEGIN
    cutoff_date := NOW() - (days_to_keep || ' days')::INTERVAL;
    
    DELETE FROM audit_logs WHERE timestamp < cutoff_date;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RAISE NOTICE 'Limpieza completada: % logs eliminados', deleted_count;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_audit_logs IS 
'Elimina logs antiguos sin hacer backup. 
Uso: SELECT cleanup_old_audit_logs(90);';

-- ===================================
-- FUNCIÓN: Exportar a JSON
-- ===================================

CREATE OR REPLACE FUNCTION export_audit_logs_to_json(
    days_to_export INTEGER DEFAULT 30,
    output_path TEXT DEFAULT '/tmp/audit_logs_export.json'
)
RETURNS TEXT AS $$
DECLARE
    cutoff_date TIMESTAMPTZ;
    export_count INTEGER;
BEGIN
    cutoff_date := NOW() - (days_to_export || ' days')::INTERVAL;
    
    -- Copiar a archivo (requiere permisos de superuser)
    EXECUTE format('
        COPY (
            SELECT json_agg(row_to_json(audit_logs))
            FROM (
                SELECT * FROM audit_logs 
                WHERE timestamp >= $1
                ORDER BY timestamp DESC
            ) audit_logs
        ) TO %L
    ', output_path)
    USING cutoff_date;
    
    SELECT COUNT(*) INTO export_count
    FROM audit_logs
    WHERE timestamp >= cutoff_date;
    
    RETURN format('Exportados %s logs a %s', export_count, output_path);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION export_audit_logs_to_json IS 
'Exporta logs recientes a archivo JSON.
Requiere permisos de superuser.
Uso: SELECT export_audit_logs_to_json(30, ''/tmp/logs.json'');';

-- ===================================
-- VISTA: Estadísticas de Logs
-- ===================================

CREATE OR REPLACE VIEW audit_logs_stats AS
SELECT 
    COUNT(*) as total_logs,
    COUNT(DISTINCT action) as unique_actions,
    COUNT(DISTINCT user_id) as unique_users,
    MIN(timestamp) as oldest_log,
    MAX(timestamp) as newest_log,
    pg_size_pretty(pg_total_relation_size('audit_logs')) as table_size,
    COUNT(*) FILTER (WHERE timestamp > NOW() - INTERVAL '24 hours') as logs_last_24h,
    COUNT(*) FILTER (WHERE timestamp > NOW() - INTERVAL '7 days') as logs_last_7d,
    COUNT(*) FILTER (WHERE timestamp > NOW() - INTERVAL '30 days') as logs_last_30d,
    COUNT(*) FILTER (WHERE action LIKE 'SECURITY_%') as security_events,
    COUNT(*) FILTER (WHERE action LIKE 'LOGIN_%') as login_events
FROM audit_logs;

COMMENT ON VIEW audit_logs_stats IS 
'Vista con estadísticas de audit_logs.
Uso: SELECT * FROM audit_logs_stats;';

-- ===================================
-- TAREA PROGRAMADA (pg_cron - opcional)
-- ===================================

-- Si tienes pg_cron instalado, puedes programar backup automático:
-- SELECT cron.schedule(
--     'backup-audit-logs',
--     '0 2 * * 0',  -- Cada domingo a las 2 AM
--     $$ SELECT backup_old_audit_logs(90); $$
-- );

-- ===================================
-- SCRIPTS DE USO MANUAL
-- ===================================

-- 1. Ver estadísticas de logs
SELECT * FROM audit_logs_stats;

-- 2. Hacer backup de logs > 90 días
SELECT * FROM backup_old_audit_logs(90);

-- 3. Limpieza simple (sin backup)
SELECT cleanup_old_audit_logs(90);

-- 4. Ver tablas de backup existentes
SELECT tablename 
FROM pg_tables 
WHERE tablename LIKE 'audit_logs_archive_%'
ORDER BY tablename DESC;

-- 5. Contar logs por acción (últimos 30 días)
SELECT 
    action,
    COUNT(*) as count,
    COUNT(DISTINCT user_id) as unique_users
FROM audit_logs
WHERE timestamp > NOW() - INTERVAL '30 days'
GROUP BY action
ORDER BY count DESC;

-- 6. Ver eventos de seguridad recientes
SELECT 
    timestamp,
    action,
    details->>'reason' as reason,
    details->>'email' as email,
    ip_address
FROM audit_logs
WHERE action LIKE 'SECURITY_%'
ORDER BY timestamp DESC
LIMIT 20;

-- 7. Restaurar desde backup (ejemplo)
-- INSERT INTO audit_logs 
-- SELECT * FROM audit_logs_archive_2024_12_01
-- WHERE id NOT IN (SELECT id FROM audit_logs);

-- ===================================
-- POLÍTICA DE RETENCIÓN RECOMENDADA
-- ===================================

-- Logs operativos: 30 días en tabla principal
-- Logs de seguridad: 90 días en tabla principal
-- Backups: 1 año en tablas de archivo
-- Después de 1 año: Exportar a cold storage y eliminar
