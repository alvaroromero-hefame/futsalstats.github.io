/**
 * Utilidades de Seguridad
 * Protección contra XSS, validación de datos, etc.
 */

/**
 * Error personalizado de seguridad
 */
export class SecurityError extends Error {
    constructor(message, code = 'SECURITY_ERROR') {
        super(message);
        this.name = 'SecurityError';
        this.code = code;
    }
}

export class SecurityUtils {
    /**
     * Sanitiza texto para prevenir ataques XSS
     * Convierte caracteres especiales HTML en entidades seguras
     * 
     * @param {string} text - Texto a sanitizar
     * @returns {string} Texto sanitizado
     */
    static sanitizeHTML(text) {
        if (text === null || text === undefined) return '';
        if (typeof text !== 'string') return String(text);
        
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Sanitiza un objeto completo recursivamente
     * Útil para sanitizar datos que vienen de APIs o formularios
     * 
     * @param {Object|Array} obj - Objeto a sanitizar
     * @returns {Object|Array} Objeto sanitizado
     */
    static sanitizeObject(obj) {
        if (obj === null || obj === undefined) return obj;
        if (typeof obj !== 'object') {
            return typeof obj === 'string' ? this.sanitizeHTML(obj) : obj;
        }
        
        const sanitized = Array.isArray(obj) ? [] : {};
        
        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'string') {
                sanitized[key] = this.sanitizeHTML(value);
            } else if (typeof value === 'object' && value !== null) {
                sanitized[key] = this.sanitizeObject(value);
            } else {
                sanitized[key] = value;
            }
        }
        
        return sanitized;
    }

    /**
     * Verifica si un texto contiene código potencialmente malicioso
     * 
     * @param {string} text - Texto a verificar
     * @returns {boolean} true si contiene código malicioso
     */
    static containsMaliciousCode(text) {
        if (!text || typeof text !== 'string') return false;
        
        const maliciousPatterns = [
            /<script[\s\S]*?>[\s\S]*?<\/script>/gi,    // Tags <script>
            /javascript:/gi,                            // javascript: protocol
            /on\w+\s*=/gi,                             // Event handlers (onclick, onload, etc.)
            /<iframe[\s\S]*?>/gi,                      // iframes
            /<object[\s\S]*?>/gi,                      // objects
            /<embed[\s\S]*?>/gi,                       // embeds
            /vbscript:/gi,                             // VBScript
            /data:text\/html/gi,                       // Data URIs con HTML
            /<link[\s\S]*?>/gi,                        // Link tags
            /<meta[\s\S]*?>/gi,                        // Meta tags
            /eval\s*\(/gi,                             // eval()
            /expression\s*\(/gi,                       // CSS expressions
        ];
        
        return maliciousPatterns.some(pattern => pattern.test(text));
    }

    /**
     * Valida y sanitiza un email
     * 
     * @param {string} email - Email a validar
     * @returns {Object} { valid: boolean, sanitized: string, error: string }
     */
    static validateEmail(email) {
        if (!email || typeof email !== 'string') {
            return { valid: false, sanitized: '', error: 'Email vacío' };
        }
        
        const sanitized = this.sanitizeHTML(email.trim().toLowerCase());
        
        // Regex simplificado para emails
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (!emailRegex.test(sanitized)) {
            return { valid: false, sanitized, error: 'Formato de email inválido' };
        }
        
        if (this.containsMaliciousCode(sanitized)) {
            return { valid: false, sanitized, error: 'Email contiene código malicioso' };
        }
        
        return { valid: true, sanitized, error: null };
    }

    /**
     * Escapa caracteres especiales para usar en expresiones regulares
     * 
     * @param {string} string - String a escapar
     * @returns {string} String escapado
     */
    static escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Genera un token aleatorio seguro
     * 
     * @param {number} length - Longitud del token (default: 32)
     * @returns {string} Token aleatorio
     */
    static generateSecureToken(length = 32) {
        const array = new Uint8Array(length);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Verifica si una URL es segura (no tiene protocolos peligrosos)
     * 
     * @param {string} url - URL a verificar
     * @returns {boolean} true si la URL es segura
     */
    static isSafeURL(url) {
        if (!url || typeof url !== 'string') return false;
        
        const dangerousProtocols = [
            'javascript:',
            'data:',
            'vbscript:',
            'file:',
        ];
        
        const lowerURL = url.toLowerCase().trim();
        
        return !dangerousProtocols.some(protocol => lowerURL.startsWith(protocol));
    }

    /**
     * Sanitiza atributos HTML para usar en setAttribute
     * 
     * @param {string} value - Valor del atributo
     * @returns {string} Valor sanitizado
     */
    static sanitizeAttribute(value) {
        if (value === null || value === undefined) return '';
        
        return String(value)
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    /**
     * Sanitiza un número, asegurando que es un número válido
     * 
     * @param {any} value - Valor a convertir en número
     * @param {number} defaultValue - Valor por defecto si no es válido
     * @returns {number} Número sanitizado
     */
    static sanitizeNumber(value, defaultValue = 0) {
        const parsed = Number(value);
        return !isNaN(parsed) && isFinite(parsed) ? parsed : defaultValue;
    }

    /**
     * Limita la longitud de un string
     * 
     * @param {string} str - String a limitar
     * @param {number} maxLength - Longitud máxima
     * @returns {string} String limitado
     */
    static limitLength(str, maxLength = 255) {
        if (!str || typeof str !== 'string') return '';
        return str.substring(0, maxLength);
    }

    /**
     * Elimina caracteres de control y espacios en blanco excesivos
     * 
     * @param {string} str - String a limpiar
     * @returns {string} String limpio
     */
    static cleanWhitespace(str) {
        if (!str || typeof str !== 'string') return '';
        
        return str
            .replace(/[\x00-\x1F\x7F]/g, '') // Eliminar caracteres de control
            .replace(/\s+/g, ' ')             // Colapsar espacios múltiples
            .trim();
    }
}
