import { loginRateLimiter } from '../security/rateLimiter.js';
import { AuditLogger } from '../utils/logger.js';

/**
 * AdminAuth - Gestión de autenticación para el panel de administración
 */
export class AdminAuth {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
        this.currentUser = null;
        this.rateLimiter = loginRateLimiter;
        this.logger = new AuditLogger(supabaseClient);
        this.loginAttempts = new Map(); // email -> { count, lastAttempt, lockedUntil }
    }

    /**
     * Inicializa la autenticación y verifica si hay sesión activa
     */
    async init() {
        try {
            const { data: { session } } = await this.supabase.auth.getSession();
            if (session) {
                this.currentUser = session.user;
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error inicializando auth:', error);
            return false;
        }
    }

    /**
     * Login con email y contraseña
     */
    async login(email, password) {
        try {
            // Verificar rate limiting
            if (!this.rateLimiter.canMakeRequest()) {
                const status = this.rateLimiter.getStatus();
                const waitMs = status.resetTime - Date.now();
                const waitSec = Math.ceil(waitMs / 1000);
                
                await this.logger.logSecurityEvent('RATE_LIMIT_EXCEEDED', {
                    email,
                    type: 'admin_login',
                    waitTime: waitSec
                });
                
                return {
                    success: false,
                    error: `Demasiados intentos. Espera ${waitSec} segundos.`
                };
            }

            // Verificar si la cuenta está bloqueada
            const lockStatus = this.checkLoginLock(email);
            if (lockStatus.locked) {
                await this.logger.logSecurityEvent('LOGIN_BLOCKED', {
                    email,
                    reason: 'Too many failed attempts',
                    unlockTime: lockStatus.unlockTime
                });
                
                return {
                    success: false,
                    error: `Cuenta bloqueada temporalmente. Reintenta en ${lockStatus.remainingMinutes} minutos.`
                };
            }

            const { data, error } = await this.supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) throw error;

            // Login exitoso - resetear intentos fallidos
            this.loginAttempts.delete(email);
            this.currentUser = data.user;
            
            // Log de auditoría
            await this.logger.logLogin(data.user.id, email, true);
            
            console.log('✅ Login exitoso:', data.user.email);
            return { success: true, user: data.user };
        } catch (error) {
            console.error('❌ Error en login:', error);
            
            // Registrar intento fallido
            this.recordFailedLogin(email);
            
            // Log de auditoría
            await this.logger.logLogin(null, email, false);
            
            return { success: false, error: error.message };
        }
    }

    /**
     * Logout
     */
    async logout() {
        try {
            const userId = this.currentUser?.id;
            
            const { error } = await this.supabase.auth.signOut();
            if (error) throw error;

            // Log de auditoría
            if (userId) {
                await this.logger.logLogout(userId);
            }

            this.currentUser = null;
            console.log('✅ Logout exitoso');
            return { success: true };
        } catch (error) {
            console.error('❌ Error en logout:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Registra un intento de login fallido
     */
    recordFailedLogin(email) {
        const now = Date.now();
        const attempts = this.loginAttempts.get(email) || {
            count: 0,
            lastAttempt: now,
            lockedUntil: null
        };

        attempts.count++;
        attempts.lastAttempt = now;

        // Bloquear después de 5 intentos fallidos
        if (attempts.count >= 5) {
            attempts.lockedUntil = now + (15 * 60 * 1000); // 15 minutos
            console.warn(`⚠️ Cuenta ${email} bloqueada temporalmente (15 min)`);
        }

        this.loginAttempts.set(email, attempts);
    }

    /**
     * Verifica si una cuenta está bloqueada
     */
    checkLoginLock(email) {
        const attempts = this.loginAttempts.get(email);
        
        if (!attempts || !attempts.lockedUntil) {
            return { locked: false };
        }

        const now = Date.now();
        
        if (now < attempts.lockedUntil) {
            const remainingMs = attempts.lockedUntil - now;
            const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));
            
            return {
                locked: true,
                unlockTime: new Date(attempts.lockedUntil).toISOString(),
                remainingMinutes
            };
        }

        // El bloqueo expiró - resetear
        this.loginAttempts.delete(email);
        return { locked: false };
    }

    /**
     * Verifica si hay un usuario autenticado
     */
    isAuthenticated() {
        return this.currentUser !== null;
    }

    /**
     * Obtiene el usuario actual
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Escucha cambios en el estado de autenticación
     */
    onAuthStateChange(callback) {
        return this.supabase.auth.onAuthStateChange((event, session) => {
            this.currentUser = session?.user || null;
            callback(event, session);
        });
    }
}
