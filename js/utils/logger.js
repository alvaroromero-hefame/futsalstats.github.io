/**
 * AuditLogger - Sistema de logging y auditoría
 * Registra todas las acciones importantes para debugging y seguridad
 */

export class AuditLogger {
    constructor(supabase) {
        this.supabase = supabase;
        this.enabled = true;
        this.consoleEnabled = true; // Logs también en consola
    }

    /**
     * Registra una acción en la base de datos de auditoría
     * 
     * @param {string} action - Acción realizada (ej: 'CREATE_PLAYER', 'LOGIN', 'DELETE_MATCH')
     * @param {Object} details - Detalles de la acción
     * @param {string} userId - ID del usuario que realizó la acción
     * @param {string} tableName - Nombre de la tabla afectada (opcional)
     * @param {string} recordId - ID del registro afectado (opcional)
     * @returns {Promise<Object>} Resultado del log
     */
    async log(action, details = {}, userId = null, tableName = null, recordId = null) {
        if (!this.enabled) {
            console.warn('⚠️ [AUDIT] Logging deshabilitado');
            return { success: false, reason: 'logging_disabled' };
        }

        // Log en consola SIEMPRE para debugging
        console.log(`📝 [AUDIT] ${action}:`, details, { userId, tableName, recordId });

        if (!this.supabase) {
            console.error('❌ [AUDIT] No hay cliente Supabase configurado');
            return { success: false, error: 'No supabase client' };
        }

        try {
            // Obtener IP de forma no bloqueante
            const ipAddress = await this.getClientIP();

            const logEntry = {
                action,
                table_name: tableName,
                record_id: recordId,
                details: typeof details === 'string' ? details : JSON.stringify(details),
                user_id: userId,
                ip_address: ipAddress,
                user_agent: navigator.userAgent,
                timestamp: new Date().toISOString()
            };

            console.log('� [AUDIT] Intentando insertar en audit_logs:', logEntry);

            // Guardar en Supabase
            const { data, error } = await this.supabase
                .from('audit_logs')
                .insert([logEntry]);

            if (error) {
                console.error('❌ [AUDIT] Error guardando log de auditoría:', error);
                console.error('❌ [AUDIT] Detalles del error:', {
                    message: error.message,
                    details: error.details,
                    hint: error.hint,
                    code: error.code
                });
                return { success: false, error: error.message, errorDetails: error };
            }

            console.log('✅ [AUDIT] Log guardado exitosamente:', data);
            return { success: true, data };

        } catch (error) {
            console.error('❌ [AUDIT] Excepción en audit logger:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Obtiene la IP del cliente (aproximada)
     * Si falla o tarda, retorna 'unknown' inmediatamente
     */
    async getClientIP() {
        try {
            // Timeout de 1 segundo para no bloquear
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 1000);
            
            const response = await fetch('https://api.ipify.org?format=json', {
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            const data = await response.json();
            return data.ip || 'unknown';
        } catch (error) {
            // Cualquier error (timeout, red, etc.) → 'unknown'
            console.warn('⚠️ [AUDIT] No se pudo obtener IP:', error.message);
            return 'unknown';
        }
    }

    /**
     * Logs específicos para diferentes tipos de acciones
     */

    // Acciones de autenticación
    async logLogin(userId, email, success) {
        return await this.log(
            success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILED',
            { email, success },
            userId
        );
    }

    async logLogout(userId) {
        return await this.log('LOGOUT', {}, userId);
    }

    // Acciones CRUD de jugadores
    async logPlayerCreated(playerData, userId) {
        return await this.log(
            'CREATE_PLAYER',
            { name: playerData.name, day: playerData.day },
            userId,
            'players',
            playerData.id
        );
    }

    async logPlayerUpdated(playerId, oldData, newData, userId) {
        return await this.log(
            'UPDATE_PLAYER',
            { old: oldData, new: newData },
            userId,
            'players',
            playerId
        );
    }

    async logPlayerDeleted(playerId, playerName, userId) {
        return await this.log(
            'DELETE_PLAYER',
            { name: playerName },
            userId,
            'players',
            playerId
        );
    }

    // Acciones CRUD de partidos
    async logMatchCreated(matchData, userId) {
        return await this.log(
            'CREATE_MATCH',
            {
                date: matchData.match_date,
                blue_goals: matchData.blue_goals,
                red_goals: matchData.red_goals,
                blue_players: matchData.blue_lineup?.length || 0,
                red_players: matchData.red_lineup?.length || 0
            },
            userId,
            'matches',
            matchData.id
        );
    }

    async logMatchUpdated(matchId, oldData, newData, userId) {
        return await this.log(
            'UPDATE_MATCH',
            { old: oldData, new: newData },
            userId,
            'matches',
            matchId
        );
    }

    async logMatchDeleted(matchId, matchDate, userId) {
        return await this.log(
            'DELETE_MATCH',
            { date: matchDate },
            userId,
            'matches',
            matchId
        );
    }

    // Acciones de disponibilidad
    async logAvailabilityChanged(playerId, playerName, available, userId) {
        return await this.log(
            'UPDATE_AVAILABILITY',
            { player_name: playerName, available },
            userId,
            'player_availability',
            playerId
        );
    }

    // Acciones de configuración
    async logSettingsChanged(setting, oldValue, newValue, userId) {
        return await this.log(
            'UPDATE_SETTINGS',
            { setting, old_value: oldValue, new_value: newValue },
            userId,
            'settings'
        );
    }

    // Errores y eventos de seguridad
    async logError(errorType, errorMessage, context, userId = null) {
        return await this.log(
            'ERROR',
            { type: errorType, message: errorMessage, context },
            userId
        );
    }

    async logSecurityEvent(eventType, details, userId = null) {
        return await this.log(
            `SECURITY_${eventType}`,
            details,
            userId
        );
    }

    /**
     * Consulta logs de auditoría
     */
    async getRecentLogs(limit = 50) {
        if (!this.supabase) {
            console.warn('⚠️ Supabase no disponible para consultar logs');
            return { data: [], error: 'No supabase client' };
        }

        try {
            const { data, error } = await this.supabase
                .from('audit_logs')
                .select('*')
                .order('timestamp', { ascending: false })
                .limit(limit);

            return { data, error };
        } catch (error) {
            console.error('❌ Error consultando logs:', error);
            return { data: [], error: error.message };
        }
    }

    async getLogsByUser(userId, limit = 50) {
        if (!this.supabase) return { data: [], error: 'No supabase client' };

        try {
            const { data, error } = await this.supabase
                .from('audit_logs')
                .select('*')
                .eq('user_id', userId)
                .order('timestamp', { ascending: false })
                .limit(limit);

            return { data, error };
        } catch (error) {
            return { data: [], error: error.message };
        }
    }

    async getLogsByAction(action, limit = 50) {
        if (!this.supabase) return { data: [], error: 'No supabase client' };

        try {
            const { data, error } = await this.supabase
                .from('audit_logs')
                .select('*')
                .eq('action', action)
                .order('timestamp', { ascending: false })
                .limit(limit);

            return { data, error };
        } catch (error) {
            return { data: [], error: error.message };
        }
    }

    async getLogsByDateRange(startDate, endDate) {
        if (!this.supabase) return { data: [], error: 'No supabase client' };

        try {
            const { data, error } = await this.supabase
                .from('audit_logs')
                .select('*')
                .gte('timestamp', startDate)
                .lte('timestamp', endDate)
                .order('timestamp', { ascending: false });

            return { data, error };
        } catch (error) {
            return { data: [], error: error.message };
        }
    }

    /**
     * Configuración del logger
     */
    enable() {
        this.enabled = true;
        console.log('✅ Audit logging habilitado');
    }

    disable() {
        this.enabled = false;
        console.warn('⚠️ Audit logging deshabilitado');
    }

    enableConsole() {
        this.consoleEnabled = true;
    }

    disableConsole() {
        this.consoleEnabled = false;
    }
}
