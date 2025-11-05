/**
 * IPWhitelist - Control de acceso por dirección IP
 * Permite restringir el panel admin a IPs específicas
 */

export class IPWhitelist {
    constructor(options = {}) {
        this.enabled = options.enabled || false;
        this.whitelist = options.whitelist || []; // Array de IPs permitidas
        this.strictMode = options.strictMode || false; // true = bloquear si no puede verificar IP
        this.bypassOnLocalhost = options.bypassOnLocalhost !== false; // Permitir localhost
    }

    /**
     * Obtiene la IP del cliente
     * 
     * @returns {Promise<string>} IP address o 'unknown'
     */
    async getClientIP() {
        try {
            // Intento 1: API externa (ipify)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);
            
            const response = await fetch('https://api.ipify.org?format=json', {
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                const data = await response.json();
                return data.ip;
            }
        } catch (error) {
            console.warn('⚠️ [IP-WHITELIST] No se pudo obtener IP desde API:', error.message);
        }

        // Intento 2: Desde headers (si hay proxy/CDN configurado)
        // Nota: Esto solo funciona si tienes un backend que envíe estos headers
        try {
            const response = await fetch('/api/client-ip');
            if (response.ok) {
                const data = await response.json();
                return data.ip;
            }
        } catch {
            // Endpoint no disponible
        }

        // Intento 3: Detectar localhost
        if (window.location.hostname === 'localhost' || 
            window.location.hostname === '127.0.0.1' ||
            window.location.hostname === '::1') {
            return 'localhost';
        }

        return 'unknown';
    }

    /**
     * Verifica si una IP está en la whitelist
     * 
     * @param {string} ip - IP a verificar
     * @returns {boolean} true si está permitida
     */
    isIPAllowed(ip) {
        // Si está deshabilitado, permitir todo
        if (!this.enabled) {
            console.log('🔓 [IP-WHITELIST] Deshabilitado - acceso permitido');
            return true;
        }

        // Permitir localhost si está configurado
        if (this.bypassOnLocalhost && ip === 'localhost') {
            console.log('🏠 [IP-WHITELIST] Localhost permitido');
            return true;
        }

        // Si no se pudo obtener IP y no es modo estricto, permitir
        if (ip === 'unknown' && !this.strictMode) {
            console.warn('⚠️ [IP-WHITELIST] IP desconocida - permitido (modo no estricto)');
            return true;
        }

        // Verificar si está en whitelist
        const allowed = this.whitelist.includes(ip) || this.matchesCIDR(ip);
        
        if (allowed) {
            console.log(`✅ [IP-WHITELIST] IP ${ip} permitida`);
        } else {
            console.warn(`🚫 [IP-WHITELIST] IP ${ip} bloqueada`);
        }

        return allowed;
    }

    /**
     * Verifica si IP coincide con rangos CIDR en la whitelist
     * 
     * @param {string} ip - IP a verificar
     * @returns {boolean} true si coincide con algún rango
     */
    matchesCIDR(ip) {
        // Implementación básica - se puede mejorar con librerías como 'ip-address'
        const cidrRanges = this.whitelist.filter(entry => entry.includes('/'));
        
        for (const range of cidrRanges) {
            // Conversión simple de CIDR (solo para ejemplo)
            // En producción, usar librería especializada
            if (this.ipInCIDR(ip, range)) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Verifica si IP está en rango CIDR (implementación básica)
     * 
     * @param {string} ip - IP a verificar
     * @param {string} cidr - Rango CIDR (ej: "192.168.1.0/24")
     * @returns {boolean}
     */
    ipInCIDR(ip, cidr) {
        // Implementación simplificada
        // Para producción, usar librería como 'ipaddr.js'
        
        const [range, bits] = cidr.split('/');
        const ipParts = ip.split('.').map(Number);
        const rangeParts = range.split('.').map(Number);
        
        if (ipParts.length !== 4 || rangeParts.length !== 4) {
            return false;
        }

        const mask = ~((1 << (32 - parseInt(bits))) - 1);
        
        const ipNum = (ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3];
        const rangeNum = (rangeParts[0] << 24) | (rangeParts[1] << 16) | (rangeParts[2] << 8) | rangeParts[3];
        
        return (ipNum & mask) === (rangeNum & mask);
    }

    /**
     * Verifica acceso y bloquea si no está permitido
     * 
     * @param {Object} options - Opciones de verificación
     * @returns {Promise<Object>} { allowed: boolean, ip: string, reason: string }
     */
    async checkAccess(options = {}) {
        const { 
            onBlocked = null,
            redirectUrl = '/index.html'
        } = options;

        console.log('🔍 [IP-WHITELIST] Verificando acceso...');

        const ip = await this.getClientIP();
        const allowed = this.isIPAllowed(ip);

        if (!allowed) {
            const reason = ip === 'unknown' 
                ? 'IP desconocida y modo estricto habilitado'
                : `IP ${ip} no está en la whitelist`;

            console.error(`🚫 [IP-WHITELIST] Acceso denegado: ${reason}`);

            // Callback de bloqueo
            if (onBlocked) {
                onBlocked({ ip, reason });
            }

            // Log de seguridad (si existe AuditLogger)
            if (window.auditLogger) {
                await window.auditLogger.logSecurityEvent('IP_BLOCKED', {
                    ip,
                    reason,
                    url: window.location.href
                });
            }

            // Redirigir
            alert('⛔ Acceso denegado desde esta ubicación');
            window.location.href = redirectUrl;

            return { allowed: false, ip, reason };
        }

        console.log(`✅ [IP-WHITELIST] Acceso permitido desde ${ip}`);

        return { allowed: true, ip, reason: null };
    }

    /**
     * Agregar IP a la whitelist
     * 
     * @param {string} ip - IP o rango CIDR a agregar
     */
    addIP(ip) {
        if (!this.whitelist.includes(ip)) {
            this.whitelist.push(ip);
            console.log(`✅ [IP-WHITELIST] IP agregada: ${ip}`);
        }
    }

    /**
     * Remover IP de la whitelist
     * 
     * @param {string} ip - IP a remover
     */
    removeIP(ip) {
        const index = this.whitelist.indexOf(ip);
        if (index > -1) {
            this.whitelist.splice(index, 1);
            console.log(`🗑️ [IP-WHITELIST] IP removida: ${ip}`);
        }
    }

    /**
     * Habilitar/deshabilitar whitelist
     * 
     * @param {boolean} enabled - true para habilitar
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        console.log(`${enabled ? '🔒' : '🔓'} [IP-WHITELIST] ${enabled ? 'Habilitado' : 'Deshabilitado'}`);
    }

    /**
     * Obtener estado actual
     * 
     * @returns {Object} Estado de la whitelist
     */
    getStatus() {
        return {
            enabled: this.enabled,
            whitelist: [...this.whitelist],
            strictMode: this.strictMode,
            bypassOnLocalhost: this.bypassOnLocalhost
        };
    }
}

/**
 * Instancia global (deshabilitada por defecto)
 */
export const globalIPWhitelist = new IPWhitelist({
    enabled: false, // Cambiar a true para habilitar
    whitelist: [
        // Agregar IPs permitidas aquí:
        // '192.168.1.100',
        // '10.0.0.0/24',  // Rango de IPs
    ],
    strictMode: false,
    bypassOnLocalhost: true
});

/**
 * Helper para proteger una página con IP whitelist
 * 
 * @param {Object} options - Opciones de protección
 */
export async function protectWithIP(options = {}) {
    return await globalIPWhitelist.checkAccess(options);
}
