/**
 * Main - Punto de entrada principal de la aplicación Futsal Stats
 */
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { DataManager } from './dataManager.js';
import { SidebarManager } from './ui/sidebar.js';
import { ClasificacionView } from './ui/clasificacion.js';
import { HistoricoView } from './ui/historico.js';
import { EstadisticasView } from './ui/estadisticas.js';
import { ComparativaView } from './ui/comparativa.js';
import { SimuladorView } from './ui/simulador.js';
import { AnalisisIAView } from './ui/analisisIA.js';
import { initAdvancedStats } from './utils/advancedStats.js';
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
        
        // Ocultar loading inicial
        const loadingEl = document.getElementById('initial-loading');
        if (loadingEl) {
            loadingEl.style.display = 'none';
        }
        
        if (!dataLoaded) {
            this.showError('No se pudieron cargar los datos. Verifica tu conexión.');
            return;
        }

        // Mostrar fuente de datos en la UI (ahora en el footer)
        this.showDataSourceInfo();
        
        // Inicializar módulo de estadísticas avanzadas
        initAdvancedStats(this.dataManager);
        
        // Inicializar componentes UI
        this.sidebarManager = new SidebarManager();
        this.views = {
            clasificacion: new ClasificacionView(this.dataManager, this.mainContent),
            historico: new HistoricoView(this.dataManager, this.mainContent),
            estadisticas: new EstadisticasView(this.dataManager, this.mainContent),
            comparativa: new ComparativaView(this.dataManager, this.mainContent),
            simulador: new SimuladorView(this.dataManager, this.mainContent),
            analisisIA: new AnalisisIAView(this.dataManager, this.mainContent)
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
        const badge = document.getElementById('data-source-badge');
        if (!badge) return;

        // Solo Supabase disponible ahora
        badge.textContent = '🟢 Supabase';
        badge.classList.add('connected');
    }

    /**
     * Configura los event listeners de navegación
     */
    setupNavigation() {
        const menuItems = [
            { id: 'menu-clasificacion', view: 'clasificacion' },
            { id: 'menu-historico', view: 'historico' },
            { id: 'menu-estadisticas', view: 'estadisticas' },
            { id: 'menu-comparativa', view: 'comparativa' },
            { id: 'menu-simulador', view: 'simulador' },
            { id: 'menu-analisis-ia', view: 'analisisIA' }
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
            // Limpiar vista anterior si tiene método cleanup
            Object.values(this.views).forEach(view => {
                if (view.cleanup && typeof view.cleanup === 'function') {
                    view.cleanup();
                }
            });
            
            // Remover clase active de todos los enlaces
            document.querySelectorAll('.menu a').forEach(a => a.classList.remove('active'));
            
            // Añadir clase active al enlace actual
            const activeLink = document.getElementById(`menu-${viewName}`);
            if (activeLink) {
                activeLink.classList.add('active');
            }
            
            // Renderizar vista
            this.views[viewName].render();
            
            // Configurar instancia global para simulador
            if (viewName === 'simulador') {
                window.simuladorView = this.views[viewName];
            }
        } else {
            console.error('❌ Vista no encontrada:', viewName);
        }
    }

    /**
     * Muestra un mensaje de error en la interfaz
     * @param {string} message - Mensaje de error a mostrar
     */
    showError(message) {
        // Actualizar badge de conexión
        const badge = document.getElementById('data-source-badge');
        if (badge) {
            badge.textContent = '🔴 Error';
            badge.classList.remove('connected');
            badge.classList.add('error');
        }
        
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
