/**
 * AdminAuth - Gestión de autenticación para el panel de administración
 */
export class AdminAuth {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
        this.currentUser = null;
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
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) throw error;

            this.currentUser = data.user;
            console.log('✅ Login exitoso:', data.user.email);
            return { success: true, user: data.user };
        } catch (error) {
            console.error('❌ Error en login:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Logout
     */
    async logout() {
        try {
            const { error } = await this.supabase.auth.signOut();
            if (error) throw error;

            this.currentUser = null;
            console.log('✅ Logout exitoso');
            return { success: true };
        } catch (error) {
            console.error('❌ Error en logout:', error);
            return { success: false, error: error.message };
        }
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
