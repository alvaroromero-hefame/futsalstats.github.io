/**
 * CSRFProtection - Protección contra Cross-Site Request Forgery
 * Genera y valida tokens CSRF para formularios
 */

export class CSRFProtection {
    constructor() {
        this.token = null;
        this.tokenKey = 'csrf_token';
    }

    /**
     * Genera un nuevo token CSRF
     * 
     * @returns {string} Token generado
     */
    generateToken() {
        // Generar token aleatorio usando Web Crypto API
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        this.token = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
        
        // Guardar en sessionStorage (se borra al cerrar pestaña)
        sessionStorage.setItem(this.tokenKey, this.token);
        
        console.log('🔐 CSRF token generado');
        return this.token;
    }

    /**
     * Obtiene el token actual o genera uno nuevo
     * 
     * @returns {string} Token CSRF
     */
    getToken() {
        if (!this.token) {
            this.token = sessionStorage.getItem(this.tokenKey);
            if (!this.token) {
                this.token = this.generateToken();
            }
        }
        return this.token;
    }

    /**
     * Valida un token CSRF
     * 
     * @param {string} token - Token a validar
     * @returns {boolean} true si el token es válido
     */
    validateToken(token) {
        const storedToken = sessionStorage.getItem(this.tokenKey);
        
        if (!storedToken) {
            console.error('❌ No hay token CSRF almacenado');
            return false;
        }
        
        if (!token) {
            console.error('❌ No se proporcionó token CSRF');
            return false;
        }
        
        // Comparación constante en tiempo para prevenir timing attacks
        const isValid = this.constantTimeCompare(token, storedToken);
        
        if (!isValid) {
            console.error('❌ Token CSRF inválido');
        }
        
        return isValid;
    }

    /**
     * Comparación en tiempo constante (previene timing attacks)
     * 
     * @param {string} a - Primera cadena
     * @param {string} b - Segunda cadena
     * @returns {boolean} true si son iguales
     */
    constantTimeCompare(a, b) {
        if (a.length !== b.length) {
            return false;
        }
        
        let result = 0;
        for (let i = 0; i < a.length; i++) {
            result |= a.charCodeAt(i) ^ b.charCodeAt(i);
        }
        
        return result === 0;
    }

    /**
     * Añade token CSRF a un formulario HTML
     * 
     * @param {HTMLFormElement} form - Formulario al que añadir el token
     * @returns {HTMLInputElement} Input creado con el token
     */
    addTokenToForm(form) {
        if (!form || !(form instanceof HTMLFormElement)) {
            throw new Error('Se requiere un formulario HTML válido');
        }

        // Eliminar token anterior si existe
        const existingInput = form.querySelector(`input[name="${this.tokenKey}"]`);
        if (existingInput) {
            existingInput.remove();
        }

        // Crear nuevo input hidden con el token
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = this.tokenKey;
        input.value = this.getToken();
        
        form.appendChild(input);
        
        console.log('✅ Token CSRF añadido al formulario');
        return input;
    }

    /**
     * Añade token CSRF a headers de fetch/ajax
     * 
     * @param {Object} headers - Objeto de headers
     * @returns {Object} Headers con token CSRF añadido
     */
    addTokenToHeaders(headers = {}) {
        return {
            ...headers,
            'X-CSRF-Token': this.getToken()
        };
    }

    /**
     * Valida token desde FormData
     * 
     * @param {FormData} formData - FormData del formulario
     * @returns {boolean} true si el token es válido
     */
    validateFromFormData(formData) {
        const token = formData.get(this.tokenKey);
        return this.validateToken(token);
    }

    /**
     * Valida token desde headers de request
     * 
     * @param {Headers} headers - Headers del request
     * @returns {boolean} true si el token es válido
     */
    validateFromHeaders(headers) {
        const token = headers.get('X-CSRF-Token') || headers.get('x-csrf-token');
        return this.validateToken(token);
    }

    /**
     * Regenera el token (útil después de login/logout)
     */
    regenerateToken() {
        sessionStorage.removeItem(this.tokenKey);
        this.token = null;
        return this.generateToken();
    }

    /**
     * Limpia el token almacenado
     */
    clearToken() {
        sessionStorage.removeItem(this.tokenKey);
        this.token = null;
        console.log('🗑️ Token CSRF eliminado');
    }

    /**
     * Crea un middleware para validar CSRF en funciones
     * 
     * @param {Function} fn - Función a proteger
     * @returns {Function} Función envuelta con validación CSRF
     */
    protect(fn) {
        return async (formDataOrToken, ...args) => {
            let token;
            
            if (formDataOrToken instanceof FormData) {
                token = formDataOrToken.get(this.tokenKey);
            } else if (typeof formDataOrToken === 'string') {
                token = formDataOrToken;
            } else if (formDataOrToken instanceof Headers) {
                token = formDataOrToken.get('X-CSRF-Token');
            }
            
            if (!this.validateToken(token)) {
                throw new Error('Token CSRF inválido. La operación fue rechazada por seguridad.');
            }
            
            return await fn(...args);
        };
    }
}

/**
 * Instancia global de CSRFProtection
 */
export const globalCSRF = new CSRFProtection();

/**
 * Helper function para proteger una función con CSRF
 * 
 * @param {Function} fn - Función a proteger
 * @returns {Function} Función protegida
 */
export function withCSRF(fn) {
    return globalCSRF.protect(fn);
}
