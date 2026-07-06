/**
 * SessionTimeout - Gestión de timeout de sesión
 * Cierra sesión automáticamente después de inactividad
 */

export class SessionTimeout {
    constructor(options = {}) {
        this.timeout = options.timeout || 15 * 60 * 1000; // 15 minutos default
        this.warningTime = options.warningTime || 2 * 60 * 1000; // 2 minutos antes
        this.checkInterval = options.checkInterval || 30 * 1000; // Check cada 30 seg
        
        this.onTimeout = options.onTimeout || null;
        this.onWarning = options.onWarning || null;
        
        this.lastActivity = Date.now();
        this.intervalId = null;
        this.warningShown = false;
        this.isActive = false;

        this.events = [
            'mousedown',
            'mousemove',
            'keypress',
            'scroll',
            'touchstart',
            'click'
        ];
    }

    /**
     * Inicia el monitoreo de actividad
     */
    start() {
        if (this.isActive) {
            console.warn('⚠️ [SESSION-TIMEOUT] Ya está activo');
            return;
        }

        console.log(`⏰ [SESSION-TIMEOUT] Iniciado - timeout: ${this.timeout / 1000}s`);
        
        this.lastActivity = Date.now();
        this.isActive = true;
        this.warningShown = false;

        // Escuchar eventos de actividad
        this.events.forEach(event => {
            window.addEventListener(event, this.handleActivity.bind(this), { passive: true });
        });

        // Iniciar checking periódico
        this.intervalId = setInterval(() => {
            this.checkTimeout();
        }, this.checkInterval);
    }

    /**
     * Detiene el monitoreo
     */
    stop() {
        if (!this.isActive) {
            return;
        }

        console.log('🛑 [SESSION-TIMEOUT] Detenido');
        
        // Remover event listeners
        this.events.forEach(event => {
            window.removeEventListener(event, this.handleActivity.bind(this));
        });

        // Limpiar interval
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }

        this.isActive = false;
        this.hideWarningDialog();
    }

    /**
     * Maneja eventos de actividad del usuario
     */
    handleActivity() {
        this.lastActivity = Date.now();
        
        // Si se mostró el warning, ocultarlo
        if (this.warningShown) {
            this.hideWarningDialog();
            this.warningShown = false;
        }
    }

    /**
     * Verifica si se debe cerrar sesión
     */
    checkTimeout() {
        const now = Date.now();
        const elapsed = now - this.lastActivity;
        const remaining = this.timeout - elapsed;

        // Mostrar warning si falta poco
        if (remaining <= this.warningTime && !this.warningShown) {
            this.showWarning(remaining);
            this.warningShown = true;
            
            if (this.onWarning) {
                this.onWarning({ remaining });
            }
        }

        // Timeout alcanzado
        if (elapsed >= this.timeout) {
            console.warn('⏰ [SESSION-TIMEOUT] Sesión expirada por inactividad');
            this.handleTimeout();
        }
    }

    /**
     * Maneja el timeout de sesión
     */
    async handleTimeout() {
        this.stop();

        // Callback personalizado
        if (this.onTimeout) {
            await this.onTimeout();
        } else {
            // Comportamiento default
            this.showTimeoutMessage();
            
            // Cerrar sesión si hay AuthManager
            if (window.authManager) {
                await window.authManager.logout();
            }
            
            // Redirigir
            setTimeout(() => {
                window.location.href = '/admin.html';
            }, 2000);
        }
    }

    /**
     * Muestra dialog de warning
     * 
     * @param {number} remaining - Tiempo restante en ms
     */
    showWarning(remaining) {
        const minutes = Math.ceil(remaining / 60000);
        
        console.warn(`⚠️ [SESSION-TIMEOUT] Warning: ${minutes} minutos restantes`);

        // Crear dialog si no existe
        let dialog = document.getElementById('session-timeout-warning');
        
        if (!dialog) {
            dialog = document.createElement('div');
            dialog.id = 'session-timeout-warning';
            dialog.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: var(--surface, #fff);
                border: 2px solid var(--ambar, #e8a13c);
                border-radius: 12px;
                padding: 20px;
                box-shadow: 0 8px 30px rgba(0,0,0,0.25);
                z-index: 10000;
                max-width: 300px;
                color: var(--text, #000000);
                animation: slideIn 0.3s ease-out;
            `;
            
            dialog.innerHTML = `
                <style>
                    @keyframes slideIn {
                        from { transform: translateX(400px); opacity: 0; }
                        to { transform: translateX(0); opacity: 1; }
                    }
                </style>
                <div style="display: flex; align-items: center; margin-bottom: 10px;">
                    <span style="font-size: 24px; margin-right: 10px;">⏰</span>
                    <strong style="font-size: 16px;">Sesión por expirar</strong>
                </div>
                <p style="margin: 10px 0; color: var(--muted, #5a6472);">
                    Tu sesión expirará en <strong>${minutes} minuto(s)</strong> por inactividad.
                </p>
                <button id="extend-session-btn" style="
                    width: 100%;
                    padding: 10px;
                    background: var(--ambar, #e8a13c);
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: bold;
                    color: #241a06;
                ">
                    Mantener sesión activa
                </button>
            `;
            
            document.body.appendChild(dialog);
            
            // Handler para extender sesión
            document.getElementById('extend-session-btn').addEventListener('click', () => {
                this.extendSession();
            });
        }
    }

    /**
     * Oculta dialog de warning
     */
    hideWarningDialog() {
        const dialog = document.getElementById('session-timeout-warning');
        if (dialog) {
            dialog.remove();
        }
    }

    /**
     * Extiende la sesión
     */
    extendSession() {
        console.log('🔄 [SESSION-TIMEOUT] Sesión extendida');
        this.lastActivity = Date.now();
        this.warningShown = false;
        this.hideWarningDialog();
    }

    /**
     * Muestra mensaje de timeout
     */
    showTimeoutMessage() {
        // Crear overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10001;
        `;
        
        overlay.innerHTML = `
            <div style="
                background: var(--surface, #fff);
                color: var(--text, #000000);
                padding: 40px;
                border-radius: 14px;
                text-align: center;
                max-width: 400px;
            ">
                <div style="font-size: 60px; margin-bottom: 20px;">⏰</div>
                <h2 style="margin: 0 0 15px 0;">Sesión Expirada</h2>
                <p style="color: var(--muted, #5a6472); margin-bottom: 20px;">
                    Tu sesión ha expirado por inactividad.
                    Serás redirigido al inicio de sesión.
                </p>
                <div style="
                    background: var(--surface-2, #ebebeb);
                    padding: 10px;
                    border-radius: 8px;
                    font-size: 14px;
                    color: var(--muted, #5a6472);
                ">
                    Redirigiendo en 2 segundos...
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
    }

    /**
     * Reinicia el timer manualmente
     */
    reset() {
        this.lastActivity = Date.now();
        this.warningShown = false;
        this.hideWarningDialog();
        console.log('🔄 [SESSION-TIMEOUT] Timer reiniciado');
    }

    /**
     * Obtiene el tiempo restante
     * 
     * @returns {number} Milisegundos restantes
     */
    getRemainingTime() {
        const elapsed = Date.now() - this.lastActivity;
        const remaining = this.timeout - elapsed;
        return Math.max(0, remaining);
    }

    /**
     * Obtiene el estado actual
     * 
     * @returns {Object} Estado del timeout
     */
    getStatus() {
        return {
            isActive: this.isActive,
            timeout: this.timeout,
            lastActivity: this.lastActivity,
            remainingTime: this.getRemainingTime(),
            remainingMinutes: Math.ceil(this.getRemainingTime() / 60000)
        };
    }
}

/**
 * Instancia global
 */
export const globalSessionTimeout = new SessionTimeout({
    timeout: 15 * 60 * 1000,      // 15 minutos
    warningTime: 2 * 60 * 1000,    // Warning 2 min antes
    checkInterval: 30 * 1000       // Check cada 30 seg
});

/**
 * Helper para iniciar timeout en una página
 * 
 * @param {Object} options - Opciones de configuración
 */
export function startSessionTimeout(options = {}) {
    const timeout = new SessionTimeout(options);
    timeout.start();
    return timeout;
}
