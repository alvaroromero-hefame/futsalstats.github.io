/**
 * RateLimiter - Control de tasa de peticiones
 * Previene abuso de API y ataques de fuerza bruta
 */

export class RateLimiter {
    /**
     * @param {number} maxRequests - Número máximo de peticiones permitidas
     * @param {number} timeWindow - Ventana de tiempo en milisegundos (default: 60000 = 1 minuto)
     */
    constructor(maxRequests = 100, timeWindow = 60000) {
        this.maxRequests = maxRequests;
        this.timeWindow = timeWindow;
        this.requests = new Map(); // Map<key, Array<timestamp>>
    }

    /**
     * Verifica si se puede hacer una petición
     * 
     * @param {string} key - Identificador único (ej: 'login', 'api_call', user_id)
     * @returns {boolean} true si puede hacer la petición
     */
    canMakeRequest(key = 'default') {
        const now = Date.now();
        const userRequests = this.requests.get(key) || [];
        
        // Limpiar peticiones antiguas fuera de la ventana de tiempo
        const recentRequests = userRequests.filter(
            timestamp => now - timestamp < this.timeWindow
        );
        
        // Si alcanzó el límite, denegar
        if (recentRequests.length >= this.maxRequests) {
            console.warn(`⚠️ Rate limit alcanzado para "${key}": ${recentRequests.length}/${this.maxRequests}`);
            return false;
        }
        
        // Registrar nueva petición
        recentRequests.push(now);
        this.requests.set(key, recentRequests);
        
        return true;
    }

    /**
     * Obtiene el número de peticiones restantes
     * 
     * @param {string} key - Identificador único
     * @returns {number} Peticiones restantes en la ventana actual
     */
    getRemainingRequests(key = 'default') {
        const now = Date.now();
        const userRequests = this.requests.get(key) || [];
        const recentRequests = userRequests.filter(
            timestamp => now - timestamp < this.timeWindow
        );
        
        return Math.max(0, this.maxRequests - recentRequests.length);
    }

    /**
     * Obtiene información sobre el límite para un key
     * 
     * @param {string} key - Identificador único
     * @returns {Object} Información del rate limit
     */
    getStatus(key = 'default') {
        const now = Date.now();
        const userRequests = this.requests.get(key) || [];
        const recentRequests = userRequests.filter(
            timestamp => now - timestamp < this.timeWindow
        );
        
        const remaining = Math.max(0, this.maxRequests - recentRequests.length);
        const resetTime = recentRequests.length > 0 
            ? new Date(recentRequests[0] + this.timeWindow)
            : null;
        
        return {
            limit: this.maxRequests,
            remaining,
            used: recentRequests.length,
            resetTime,
            resetIn: resetTime ? Math.ceil((resetTime - now) / 1000) : 0 // segundos
        };
    }

    /**
     * Resetea el contador para un key específico
     * 
     * @param {string} key - Identificador único
     */
    reset(key = 'default') {
        this.requests.delete(key);
        console.log(`✅ Rate limit reseteado para "${key}"`);
    }

    /**
     * Resetea todos los contadores
     */
    resetAll() {
        this.requests.clear();
        console.log('✅ Todos los rate limits reseteados');
    }

    /**
     * Ejecuta una función con rate limiting
     * 
     * @param {string} key - Identificador único
     * @param {Function} fn - Función a ejecutar
     * @returns {Promise<any>} Resultado de la función o error
     */
    async execute(key, fn) {
        if (!this.canMakeRequest(key)) {
            const status = this.getStatus(key);
            throw new Error(
                `Rate limit excedido. Intenta de nuevo en ${status.resetIn} segundos.`
            );
        }
        
        return await fn();
    }

    /**
     * Crea un decorador para funciones con rate limiting
     * 
     * @param {string} key - Identificador único
     * @returns {Function} Función decoradora
     */
    createLimitedFunction(key) {
        return async (fn) => {
            return await this.execute(key, fn);
        };
    }
}

/**
 * Rate Limiter global para la aplicación
 * Configuración por defecto: 100 peticiones por minuto
 */
export const globalRateLimiter = new RateLimiter(100, 60000);

/**
 * Rate Limiter para login (más restrictivo)
 * 5 intentos por minuto
 */
export const loginRateLimiter = new RateLimiter(5, 60000);

/**
 * Rate Limiter para operaciones de escritura en admin
 * 30 operaciones por minuto
 */
export const adminRateLimiter = new RateLimiter(30, 60000);
