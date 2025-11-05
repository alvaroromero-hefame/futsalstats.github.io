/**
 * AuthManager - Gestión de autenticación con Supabase
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { config } from '../config.js';
import { loginRateLimiter } from '../security/rateLimiter.js';
import { AuditLogger } from '../utils/logger.js';

export class AuthManager {
    constructor() {
        this.supabase = createClient(config.supabase.url, config.supabase.anonKey);
        this.currentUser = null;
        this.onAuthStateChangeCallback = null;
        this.rateLimiter = loginRateLimiter;
        this.logger = new AuditLogger(this.supabase);
        this.loginAttempts = new Map(); // email -> { count, lastAttempt, lockedUntil }
    }

    /**
     * Inicializa el gestor de autenticación y verifica sesión actual
     */
    async init() {
        try {
            const { data: { session } } = await this.supabase.auth.getSession();
            
            if (session) {
                this.currentUser = session.user;
            }

            // Escuchar cambios en el estado de autenticación
            this.supabase.auth.onAuthStateChange((event, session) => {
                console.log('Auth state changed:', event);
                
                if (session) {
                    this.currentUser = session.user;
                } else {
                    this.currentUser = null;
                }

                // Ejecutar callback si existe
                if (this.onAuthStateChangeCallback) {
                    this.onAuthStateChangeCallback(event, session);
                }
            });

            return { success: true, user: this.currentUser };
        } catch (error) {
            console.error('Error inicializando auth:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Registrar callback para cambios de estado de autenticación
     * 
     * @param {Function} callback - Función a ejecutar cuando cambie el estado
     */
    onAuthStateChange(callback) {
        this.onAuthStateChangeCallback = callback;
    }

    /**
     * Login con email y contraseña
     * 
     * @param {string} email - Email del usuario
     * @param {string} password - Contraseña
     * @returns {Object} { success: boolean, user: Object, error: string }
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
                    type: 'login',
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
                email,
                password
            });

            if (error) throw error;

            // Login exitoso - resetear intentos fallidos
            this.loginAttempts.delete(email);
            this.currentUser = data.user;
            
            // Log de auditoría
            await this.logger.logLogin(data.user.id, email, true);
            
            console.log('✅ Login exitoso:', data.user.email);
            
            return { 
                success: true, 
                user: data.user,
                session: data.session
            };
        } catch (error) {
            console.error('❌ Error de login:', error);
            
            // Registrar intento fallido
            this.recordFailedLogin(email);
            
            // Log de auditoría
            await this.logger.logLogin(null, email, false);
            
            return { 
                success: false, 
                error: this.getErrorMessage(error) 
            };
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
     * Registro de nuevo usuario
     * 
     * @param {string} email - Email del usuario
     * @param {string} password - Contraseña
     * @returns {Object} { success: boolean, user: Object, error: string }
     */
    async signUp(email, password) {
        try {
            const { data, error } = await this.supabase.auth.signUp({
                email,
                password
            });

            if (error) throw error;

            console.log('Usuario registrado:', data.user?.email);
            
            return { 
                success: true, 
                user: data.user,
                message: 'Revisa tu email para confirmar tu cuenta'
            };
        } catch (error) {
            console.error('Error de registro:', error);
            return { 
                success: false, 
                error: this.getErrorMessage(error) 
            };
        }
    }

    /**
     * Cerrar sesión
     * 
     * @returns {Object} { success: boolean, error: string }
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
            console.error('❌ Error de logout:', error);
            return { 
                success: false, 
                error: this.getErrorMessage(error) 
            };
        }
    }

    /**
     * Verifica si hay una sesión activa
     * 
     * @returns {Object} { authenticated: boolean, user: Object, error: string }
     */
    async checkAuth() {
        try {
            const { data: { session }, error } = await this.supabase.auth.getSession();
            
            if (error) throw error;
            
            if (session) {
                this.currentUser = session.user;
                return { 
                    authenticated: true, 
                    user: session.user,
                    session: session
                };
            }
            
            return { authenticated: false };
        } catch (error) {
            console.error('Error verificando auth:', error);
            return { 
                authenticated: false, 
                error: this.getErrorMessage(error) 
            };
        }
    }

    /**
     * Verifica si el usuario está autenticado (método síncrono)
     * 
     * @returns {boolean} true si está autenticado
     */
    isAuthenticated() {
        return !!this.currentUser;
    }

    /**
     * Obtiene el usuario actual
     * 
     * @returns {Object|null} Usuario actual o null
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Verifica si el usuario actual es administrador
     * 
     * @returns {Promise<boolean>} true si es admin
     */
    async isAdmin() {
        if (!this.currentUser) {
            return false;
        }

        try {
            const { data, error } = await this.supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', this.currentUser.id)
                .single();

            if (error) {
                console.error('Error verificando rol:', error);
                return false;
            }

            return data?.role === 'admin';
        } catch (error) {
            console.error('Error verificando si es admin:', error);
            return false;
        }
    }

    /**
     * Obtiene el rol del usuario actual
     * 
     * @returns {Promise<string>} Rol del usuario ('admin', 'user', 'guest')
     */
    async getUserRole() {
        if (!this.currentUser) {
            return 'guest';
        }

        try {
            const { data, error } = await this.supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', this.currentUser.id)
                .single();

            if (error) {
                console.error('Error obteniendo rol:', error);
                return 'user';
            }

            return data?.role || 'user';
        } catch (error) {
            console.error('Error obteniendo rol:', error);
            return 'user';
        }
    }

    /**
     * Recuperar contraseña (enviar email)
     * 
     * @param {string} email - Email del usuario
     * @returns {Object} { success: boolean, error: string }
     */
    async resetPassword(email) {
        try {
            const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password.html`
            });

            if (error) throw error;

            return { 
                success: true,
                message: 'Email de recuperación enviado. Revisa tu bandeja de entrada.'
            };
        } catch (error) {
            console.error('Error reseteando contraseña:', error);
            return { 
                success: false, 
                error: this.getErrorMessage(error) 
            };
        }
    }

    /**
     * Actualizar contraseña del usuario actual
     * 
     * @param {string} newPassword - Nueva contraseña
     * @returns {Object} { success: boolean, error: string }
     */
    async updatePassword(newPassword) {
        try {
            const { error } = await this.supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            return { 
                success: true,
                message: 'Contraseña actualizada correctamente'
            };
        } catch (error) {
            console.error('Error actualizando contraseña:', error);
            return { 
                success: false, 
                error: this.getErrorMessage(error) 
            };
        }
    }

    /**
     * Convierte errores de Supabase a mensajes legibles en español
     * 
     * @param {Error} error - Error de Supabase
     * @returns {string} Mensaje de error en español
     */
    getErrorMessage(error) {
        const errorMessages = {
            'Invalid login credentials': 'Email o contraseña incorrectos',
            'Email not confirmed': 'Email no confirmado. Revisa tu bandeja de entrada.',
            'User already registered': 'Este email ya está registrado',
            'Password should be at least 6 characters': 'La contraseña debe tener al menos 6 caracteres',
            'Unable to validate email address: invalid format': 'Formato de email inválido',
            'User not found': 'Usuario no encontrado',
            'Invalid email or password': 'Email o contraseña inválidos'
        };

        const message = error.message || error.toString();
        return errorMessages[message] || `Error: ${message}`;
    }
}
