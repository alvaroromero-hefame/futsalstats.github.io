/**
 * Main - Punto de entrada principal de la aplicación Futsal Stats
 */
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { DataManager } from './dataManager.js';
import { SidebarManager } from './ui/sidebar.js';
import { ClasificacionView } from './ui/clasificacion.js';
import { HistoricoView } from './ui/historico.js';
import { EstadisticasView } from './ui/estadisticas.js';
import { config } from './config.js';

/**
 * Clase principal de la aplicación
 */
class FutsalApp {
    constructor() {
        this.supabase = null;
        this.dataManager = null;
        this.sidebarManager = null;
        this.mainContent = document.getElementById('main-content');
        this.views = {};
    }

    /**
     * Inicializa la aplicación
     */
    async init() {
        console.log('🚀 Iniciando FutsalStats...');

        // Intentar inicializar Supabase
        const supabaseConnected = await this.initSupabase();
        
        // Inicializar DataManager con o sin Supabase
        this.dataManager = new DataManager(this.supabase);
        
        // Cargar datos (intentará Supabase primero, luego JSON)
        const dataLoaded = await this.dataManager.loadData();
        
        if (!dataLoaded) {
            this.showError('No se pudieron cargar los datos. Verifica tu conexión.');
            return;
        }

        // Mostrar fuente de datos en la UI
        this.showDataSourceInfo();
        
        // Inicializar componentes UI
        this.sidebarManager = new SidebarManager();
        this.views = {
            clasificacion: new ClasificacionView(this.dataManager, this.mainContent),
            historico: new HistoricoView(this.dataManager, this.mainContent),
            estadisticas: new EstadisticasView(this.dataManager, this.mainContent)
        };
        
        // Configurar navegación
        this.setupNavigation();
        
        // Mostrar vista inicial
        this.showView('clasificacion');
        
        console.log('✅ FutsalStats iniciado correctamente');
    }

    /**
     * Inicializa la conexión a Supabase
     * @returns {Promise<boolean>} true si la conexión es exitosa
     */
    async initSupabase() {
        try {
            // Validar configuración
            if (!config.supabase.url || !config.supabase.anonKey) {
                console.warn('⚠️ Supabase no configurado. Usando datos locales (JSON)');
                return false;
            }

            // Cargar el cliente de Supabase desde CDN
            const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
            
            // Crear cliente
            this.supabase = createClient(config.supabase.url, config.supabase.anonKey);
            
            // Verificar conexión haciendo una query simple
            const { data, error } = await this.supabase
                .from('matches')
                .select('id', { count: 'exact', head: true })
                .limit(1);

            if (error) {
                // Si el error es "tabla no encontrada", la conexión funciona pero faltan tablas
                if (error.message.includes('does not exist') || 
                    error.message.includes('Could not find') ||
                    error.code === 'PGRST116') {
                    console.log('✅ Conexión a Supabase establecida correctamente');
                    console.warn('⚠️ Las tablas aún no existen. Ejecuta el script supabase-init.sql');
                    console.warn('📝 Ve a: SQL Editor > New Query > Pega el contenido > Run');
                    return true; // Conexión OK, solo faltan tablas
                }
                
                throw error;
            }

            console.log('✅ Conexión a Supabase establecida y verificada');
            console.log('✅ Base de datos configurada correctamente');
            return true;

        } catch (error) {
            console.error('❌ Error conectando a Supabase:', error.message);
            console.log('📝 Continuando con datos locales (JSON)');
            this.supabase = null;
            return false;
        }
    }

    /**
     * Muestra información sobre la fuente de datos en uso
     */
    showDataSourceInfo() {
        const source = this.dataManager.getDataSource();
        const badge = document.createElement('div');
        badge.id = 'data-source-badge';
        badge.style.cssText = `
            position: fixed;
            bottom: 10px;
            right: 10px;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: bold;
            z-index: 1000;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        `;

        if (source === 'supabase') {
            badge.textContent = '🟢 Supabase';
            badge.style.backgroundColor = '#10b981';
            badge.style.color = 'white';
        } else {
            badge.textContent = '🟡 JSON Local';
            badge.style.backgroundColor = '#f59e0b';
            badge.style.color = 'white';
        }

        document.body.appendChild(badge);
    }

    /**
     * Configura los event listeners de navegación
     */
    setupNavigation() {
        const menuItems = [
            { id: 'menu-clasificacion', view: 'clasificacion' },
            { id: 'menu-historico', view: 'historico' },
            { id: 'menu-estadisticas', view: 'estadisticas' }
        ];

        menuItems.forEach(({ id, view }) => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.showView(view);
                    this.sidebarManager?.close();
                });
            }
        });
    }

    /**
     * Muestra una vista específica
     * @param {string} viewName - Nombre de la vista a mostrar
     */
    showView(viewName) {
        if (this.views[viewName]) {
            // Remover clase active de todos los enlaces
            document.querySelectorAll('.menu a').forEach(a => a.classList.remove('active'));
            
            // Añadir clase active al enlace actual
            const activeLink = document.getElementById(`menu-${viewName}`);
            if (activeLink) {
                activeLink.classList.add('active');
            }
            
            // Renderizar vista
            this.views[viewName].render();
        } else {
            console.error('❌ Vista no encontrada:', viewName);
        }
    }

    /**
     * Muestra un mensaje de error en la interfaz
     * @param {string} message - Mensaje de error a mostrar
     */
    showError(message) {
        this.mainContent.innerHTML = `
            <div style="padding: 20px; text-align: center;">
                <h2 style="color: #ef4444;">❌ Error</h2>
                <p>${message}</p>
                <button onclick="location.reload()" style="
                    margin-top: 20px;
                    padding: 10px 20px;
                    background: #3b82f6;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                ">
                    Reintentar
                </button>
            </div>
        `;
    }
}

// Iniciar aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    const app = new FutsalApp();
    app.init();
});
