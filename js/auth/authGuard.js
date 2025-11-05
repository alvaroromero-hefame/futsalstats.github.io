/**
 * AuthGuard - Protección de rutas administrativas
 */

import { AuthManager } from './authManager.js';

export class AuthGuard {
    constructor() {
        this.authManager = new AuthManager();
        this.redirectUrl = '/index.html';
        this.loginUrl = '/login.html';
    }

    /**
     * Protege una ruta, verificando autenticación y rol de administrador
     * 
     * @param {Object} options - Opciones de protección
     * @param {boolean} options.requireAdmin - Requiere rol de administrador (default: true)
     * @param {string} options.redirectUrl - URL de redirección si no autorizado
     * @param {Function} options.onAuthorized - Callback cuando está autorizado
     * @param {Function} options.onUnauthorized - Callback cuando no está autorizado
     * @returns {Promise<boolean>} true si está autorizado
     */
    async protect(options = {}) {
        const {
            requireAdmin = true,
            redirectUrl = this.redirectUrl,
            onAuthorized = null,
            onUnauthorized = null
        } = options;

        try {
            // Inicializar auth manager
            await this.authManager.init();

            // Verificar autenticación
            const auth = await this.authManager.checkAuth();
            
            if (!auth.authenticated) {
                console.warn('🔒 Acceso denegado: Usuario no autenticado');
                
                if (onUnauthorized) {
                    onUnauthorized({ reason: 'not_authenticated' });
                }
                
                // Guardar URL intentada para redirigir después del login
                sessionStorage.setItem('redirect_after_login', window.location.pathname);
                
                // Redirigir a login
                window.location.href = this.loginUrl;
                return false;
            }

            // Si requiere admin, verificar rol
            if (requireAdmin) {
                const isAdmin = await this.authManager.isAdmin();
                
                if (!isAdmin) {
                    console.warn('🔒 Acceso denegado: Usuario no es administrador');
                    
                    if (onUnauthorized) {
                        onUnauthorized({ reason: 'not_admin', user: auth.user });
                    }
                    
                    alert('❌ No tienes permisos de administrador para acceder a esta página');
                    window.location.href = redirectUrl;
                    return false;
                }
            }

            console.log('✅ Acceso autorizado:', auth.user.email);
            
            if (onAuthorized) {
                onAuthorized({ user: auth.user });
            }
            
            return true;

        } catch (error) {
            console.error('❌ Error en AuthGuard:', error);
            
            if (onUnauthorized) {
                onUnauthorized({ reason: 'error', error });
            }
            
            alert('Error verificando permisos. Por favor, intenta de nuevo.');
            window.location.href = redirectUrl;
            return false;
        }
    }

    /**
     * Verifica permisos sin redirigir (para uso en componentes)
     * 
     * @param {Object} options - Opciones de verificación
     * @returns {Promise<Object>} { authorized: boolean, user: Object, role: string }
     */
    async checkPermissions(options = {}) {
        const { requireAdmin = true } = options;

        try {
            await this.authManager.init();
            
            const auth = await this.authManager.checkAuth();
            
            if (!auth.authenticated) {
                return { 
                    authorized: false, 
                    reason: 'not_authenticated' 
                };
            }

            if (requireAdmin) {
                const isAdmin = await this.authManager.isAdmin();
                
                if (!isAdmin) {
                    const role = await this.authManager.getUserRole();
                    return { 
                        authorized: false, 
                        reason: 'not_admin',
                        user: auth.user,
                        role
                    };
                }
            }

            const role = await this.authManager.getUserRole();
            
            return {
                authorized: true,
                user: auth.user,
                role
            };

        } catch (error) {
            console.error('Error verificando permisos:', error);
            return { 
                authorized: false, 
                reason: 'error',
                error: error.message 
            };
        }
    }

    /**
     * Muestra un mensaje de carga mientras se verifican permisos
     * 
     * @param {string} message - Mensaje a mostrar
     */
    showLoadingMessage(message = 'Verificando permisos...') {
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'auth-loading';
        loadingDiv.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            color: white;
            font-size: 1.5em;
            font-family: Arial, sans-serif;
        `;
        loadingDiv.innerHTML = `
            <div style="text-align: center;">
                <div style="font-size: 3em; margin-bottom: 20px;">🔒</div>
                <div>${message}</div>
            </div>
        `;
        document.body.appendChild(loadingDiv);
    }

    /**
     * Oculta el mensaje de carga
     */
    hideLoadingMessage() {
        const loadingDiv = document.getElementById('auth-loading');
        if (loadingDiv) {
            loadingDiv.remove();
        }
    }

    /**
     * Obtiene el AuthManager para uso externo
     * 
     * @returns {AuthManager} Instancia del AuthManager
     */
    getAuthManager() {
        return this.authManager;
    }
}

/**
 * Función helper para proteger una página rápidamente
 * Uso: await protectPage();
 */
export async function protectPage(options = {}) {
    const guard = new AuthGuard();
    
    // Mostrar mensaje de carga
    guard.showLoadingMessage();
    
    const authorized = await guard.protect(options);
    
    // Ocultar mensaje de carga
    guard.hideLoadingMessage();
    
    return authorized;
}

/**
 * Función helper para verificar permisos sin redirigir
 * Uso: const { authorized, user } = await checkPermissions();
 */
export async function checkPermissions(options = {}) {
    const guard = new AuthGuard();
    await guard.getAuthManager().init();
    return await guard.checkPermissions(options);
}
