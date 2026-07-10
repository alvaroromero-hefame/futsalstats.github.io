/**
 * SecurityDashboard - Panel de monitoreo de eventos de seguridad
 * Muestra audit logs, estadísticas y alertas de seguridad en tiempo real
 */

import { SecurityError } from '../utils/security.js';

export class SecurityDashboard {
    constructor(supabaseClient, auditLogger) {
        this.supabase = supabaseClient;
        this.logger = auditLogger;
        this.refreshInterval = 30000; // 30 segundos
        this.autoRefreshTimer = null;
        this.filters = {
            timeRange: '24h',
            action: 'all',
            severity: 'all'
        };
    }

    /**
     * Renderiza el dashboard completo
     */
    async render(containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            throw new SecurityError('Container no encontrado', 'CONTAINER_NOT_FOUND');
        }

        container.innerHTML = `
            <div class="security-dashboard">
                <div class="dashboard-header">
                    <h2><svg class="icon icon-inline"><use href="#i-escudo"/></svg> Panel de Seguridad</h2>
                    <div class="dashboard-controls">
                        <button id="refresh-dashboard" class="btn-primary">
                            <svg class="icon icon-inline"><use href="#i-refrescar"/></svg> Actualizar
                        </button>
                        <label class="auto-refresh-toggle">
                            <input type="checkbox" id="auto-refresh" checked>
                            Auto-refresh (30s)
                        </label>
                    </div>
                </div>

                <!-- Estadísticas resumen -->
                <div class="stats-grid" id="stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon"><svg class="icon"><use href="#i-grafica"/></svg></div>
                        <div class="stat-content">
                            <div class="stat-value" id="stat-total">-</div>
                            <div class="stat-label">Total Eventos</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon"><svg class="icon"><use href="#i-alerta"/></svg></div>
                        <div class="stat-content">
                            <div class="stat-value" id="stat-security">-</div>
                            <div class="stat-label">Eventos de Seguridad</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon"><svg class="icon"><use href="#i-candado"/></svg></div>
                        <div class="stat-content">
                            <div class="stat-value" id="stat-failed-logins">-</div>
                            <div class="stat-label">Logins Fallidos</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon"><svg class="icon"><use href="#i-ia"/></svg></div>
                        <div class="stat-content">
                            <div class="stat-value" id="stat-bots">-</div>
                            <div class="stat-label">Bots Detectados</div>
                        </div>
                    </div>
                </div>

                <!-- Filtros -->
                <div class="dashboard-filters">
                    <select id="filter-time" class="filter-select">
                        <option value="1h">Última hora</option>
                        <option value="24h" selected>Últimas 24 horas</option>
                        <option value="7d">Últimos 7 días</option>
                        <option value="30d">Últimos 30 días</option>
                        <option value="all">Todo el tiempo</option>
                    </select>

                    <select id="filter-action" class="filter-select">
                        <option value="all">Todas las acciones</option>
                        <option value="SECURITY_">Eventos de seguridad</option>
                        <option value="LOGIN_">Eventos de login</option>
                        <option value="BOT_DETECTED">Bots detectados</option>
                        <option value="RATE_LIMIT">Rate limiting</option>
                        <option value="CSRF_">CSRF</option>
                    </select>

                    <select id="filter-severity" class="filter-select">
                        <option value="all">Todas las severidades</option>
                        <option value="critical">Crítico</option>
                        <option value="high">Alto</option>
                        <option value="medium">Medio</option>
                        <option value="low">Bajo</option>
                    </select>
                </div>

                <!-- Gráfico de eventos -->
                <div class="chart-container">
                    <h3><svg class="icon icon-inline"><use href="#i-grafica"/></svg> Eventos por Hora (24h)</h3>
                    <canvas id="events-chart"></canvas>
                </div>

                <!-- Tabla de logs recientes -->
                <div class="logs-container">
                    <h3><svg class="icon icon-inline"><use href="#i-calendario"/></svg> Eventos Recientes</h3>
                    <div class="logs-table-container">
                        <table class="logs-table" id="logs-table">
                            <thead>
                                <tr>
                                    <th>Timestamp</th>
                                    <th>Acción</th>
                                    <th>Usuario</th>
                                    <th>IP</th>
                                    <th>Detalles</th>
                                    <th>Severidad</th>
                                </tr>
                            </thead>
                            <tbody id="logs-tbody">
                                <tr><td colspan="6">Cargando...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Alertas activas -->
                <div class="alerts-container" id="alerts-container">
                    <!-- Se llenará dinámicamente -->
                </div>
            </div>
        `;

        await this.loadData();
        this.attachEventListeners();
        this.startAutoRefresh();
    }

    /**
     * Carga todos los datos del dashboard
     */
    async loadData() {
        try {
            await Promise.all([
                this.loadStats(),
                this.loadRecentLogs(),
                this.checkAlerts()
            ]);
        } catch (error) {
            console.error('Error cargando datos del dashboard:', error);
            this.showError('Error al cargar datos de seguridad');
        }
    }

    /**
     * Carga estadísticas del período seleccionado
     */
    async loadStats() {
        const timeFilter = this.getTimeFilter();
        
        // Query para estadísticas generales
        const { data: logs, error } = await this.supabase
            .from('audit_logs')
            .select('*')
            .gte('timestamp', timeFilter);

        if (error) throw error;

        // Calcular estadísticas
        const stats = {
            total: logs.length,
            security: logs.filter(l => l.action.startsWith('SECURITY_')).length,
            failedLogins: logs.filter(l => l.action === 'LOGIN_FAILED').length,
            bots: logs.filter(l => l.action === 'BOT_DETECTED').length
        };

        // Actualizar UI
        document.getElementById('stat-total').textContent = stats.total;
        document.getElementById('stat-security').textContent = stats.security;
        document.getElementById('stat-failed-logins').textContent = stats.failedLogins;
        document.getElementById('stat-bots').textContent = stats.bots;

        return stats;
    }

    /**
     * Carga logs recientes con filtros aplicados
     */
    async loadRecentLogs() {
        const timeFilter = this.getTimeFilter();
        let query = this.supabase
            .from('audit_logs')
            .select('*')
            .gte('timestamp', timeFilter)
            .order('timestamp', { ascending: false })
            .limit(50);

        // Aplicar filtro de acción
        if (this.filters.action !== 'all') {
            query = query.like('action', `${this.filters.action}%`);
        }

        const { data: logs, error } = await query;

        if (error) throw error;

        this.renderLogsTable(logs);
        return logs;
    }

    /**
     * Renderiza la tabla de logs
     */
    renderLogsTable(logs) {
        const tbody = document.getElementById('logs-tbody');
        
        if (logs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6">No hay eventos en el período seleccionado</td></tr>';
            return;
        }

        tbody.innerHTML = logs.map(log => {
            const severity = this.getSeverity(log.action);
            const severityClass = `severity-${severity}`;
            const timestamp = new Date(log.timestamp).toLocaleString('es-ES');
            const details = this.formatDetails(log.details);

            return `
                <tr class="${severityClass}">
                    <td>${timestamp}</td>
                    <td><span class="action-badge">${log.action}</span></td>
                    <td>${log.user_id || 'N/A'}</td>
                    <td>${log.ip_address || 'N/A'}</td>
                    <td class="details-cell">${details}</td>
                    <td><span class="severity-badge ${severityClass}">${severity.toUpperCase()}</span></td>
                </tr>
            `;
        }).join('');
    }

    /**
     * Determina la severidad de un evento
     */
    getSeverity(action) {
        if (action.includes('BOT_DETECTED') || action.includes('SECURITY_BREACH')) {
            return 'critical';
        }
        if (action.includes('LOGIN_FAILED') || action.includes('CSRF_INVALID')) {
            return 'high';
        }
        if (action.includes('RATE_LIMIT') || action.includes('SESSION_TIMEOUT')) {
            return 'medium';
        }
        return 'low';
    }

    /**
     * Formatea los detalles para mostrar
     */
    formatDetails(details) {
        if (!details) return 'N/A';
        
        try {
            const parsed = typeof details === 'string' ? JSON.parse(details) : details;
            const important = [];
            
            if (parsed.email) important.push(`Email: ${parsed.email}`);
            if (parsed.reason) important.push(`Razón: ${parsed.reason}`);
            if (parsed.ip) important.push(`IP: ${parsed.ip}`);
            if (parsed.userAgent) important.push(`UA: ${parsed.userAgent.substring(0, 30)}...`);
            
            return important.join(' | ') || 'Sin detalles';
        } catch {
            return String(details).substring(0, 50);
        }
    }

    /**
     * Verifica y muestra alertas activas
     */
    async checkAlerts() {
        const timeFilter = this.getTimeFilter();
        const alerts = [];

        // Query para detectar patrones sospechosos
        const { data: logs, error } = await this.supabase
            .from('audit_logs')
            .select('*')
            .gte('timestamp', timeFilter);

        if (error) throw error;

        // Detectar múltiples intentos de login fallidos
        const failedLogins = logs.filter(l => l.action === 'LOGIN_FAILED');
        const failedByIP = this.groupBy(failedLogins, 'ip_address');
        
        for (const [ip, attempts] of Object.entries(failedByIP)) {
            if (attempts.length >= 5) {
                alerts.push({
                    level: 'critical',
                    message: `${attempts.length} intentos de login fallidos desde IP ${ip}`,
                    action: 'Considerar bloquear esta IP'
                });
            }
        }

        // Detectar múltiples bots
        const bots = logs.filter(l => l.action === 'BOT_DETECTED');
        if (bots.length >= 10) {
            alerts.push({
                level: 'high',
                message: `${bots.length} bots detectados en las últimas 24h`,
                action: 'Verificar honeypot y añadir CAPTCHA si es necesario'
            });
        }

        // Detectar rate limiting excesivo
        const rateLimits = logs.filter(l => l.action === 'RATE_LIMIT_EXCEEDED');
        if (rateLimits.length >= 20) {
            alerts.push({
                level: 'medium',
                message: `${rateLimits.length} eventos de rate limiting`,
                action: 'Revisar si es tráfico legítimo o ataque'
            });
        }

        this.renderAlerts(alerts);
    }

    /**
     * Renderiza alertas activas
     */
    renderAlerts(alerts) {
        const container = document.getElementById('alerts-container');
        
        if (alerts.length === 0) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = `
            <div class="alerts-list">
                <h3><svg class="icon icon-inline"><use href="#i-alerta"/></svg> Alertas Activas</h3>
                ${alerts.map(alert => `
                    <div class="alert alert-${alert.level}">
                        <div class="alert-message">${alert.message}</div>
                        <div class="alert-action">Acción recomendada: ${alert.action}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    /**
     * Agrupa elementos por una clave
     */
    groupBy(array, key) {
        return array.reduce((result, item) => {
            const group = item[key] || 'unknown';
            result[group] = result[group] || [];
            result[group].push(item);
            return result;
        }, {});
    }

    /**
     * Obtiene el timestamp de inicio según el filtro de tiempo
     */
    getTimeFilter() {
        const now = new Date();
        
        switch (this.filters.timeRange) {
            case '1h':
                return new Date(now - 3600000).toISOString();
            case '24h':
                return new Date(now - 86400000).toISOString();
            case '7d':
                return new Date(now - 604800000).toISOString();
            case '30d':
                return new Date(now - 2592000000).toISOString();
            default:
                return '1970-01-01T00:00:00Z'; // Todo el tiempo
        }
    }

    /**
     * Adjunta event listeners
     */
    attachEventListeners() {
        // Botón de refresh manual
        document.getElementById('refresh-dashboard')?.addEventListener('click', () => {
            this.loadData();
        });

        // Toggle auto-refresh
        document.getElementById('auto-refresh')?.addEventListener('change', (e) => {
            if (e.target.checked) {
                this.startAutoRefresh();
            } else {
                this.stopAutoRefresh();
            }
        });

        // Filtros
        document.getElementById('filter-time')?.addEventListener('change', (e) => {
            this.filters.timeRange = e.target.value;
            this.loadData();
        });

        document.getElementById('filter-action')?.addEventListener('change', (e) => {
            this.filters.action = e.target.value;
            this.loadRecentLogs();
        });

        document.getElementById('filter-severity')?.addEventListener('change', (e) => {
            this.filters.severity = e.target.value;
            this.loadRecentLogs();
        });
    }

    /**
     * Inicia el auto-refresh
     */
    startAutoRefresh() {
        this.stopAutoRefresh(); // Limpiar timer existente
        this.autoRefreshTimer = setInterval(() => {
            this.loadData();
        }, this.refreshInterval);
    }

    /**
     * Detiene el auto-refresh
     */
    stopAutoRefresh() {
        if (this.autoRefreshTimer) {
            clearInterval(this.autoRefreshTimer);
            this.autoRefreshTimer = null;
        }
    }

    /**
     * Muestra un mensaje de error
     */
    showError(message) {
        const container = document.querySelector('.security-dashboard');
        if (!container) return;

        const errorDiv = document.createElement('div');
        errorDiv.className = 'dashboard-error';
        errorDiv.textContent = message;
        container.insertBefore(errorDiv, container.firstChild);

        setTimeout(() => errorDiv.remove(), 5000);
    }

    /**
     * Limpia y destruye el dashboard
     */
    destroy() {
        this.stopAutoRefresh();
    }
}

// Instancia global (se inicializa en AdminPanel)
export let globalSecurityDashboard = null;

/**
 * Inicializa el dashboard de seguridad
 */
export function initSecurityDashboard(supabaseClient, auditLogger, containerId) {
    if (!globalSecurityDashboard) {
        globalSecurityDashboard = new SecurityDashboard(supabaseClient, auditLogger);
    }
    return globalSecurityDashboard.render(containerId);
}
