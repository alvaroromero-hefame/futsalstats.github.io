/**
 * Configuración de la aplicación
 * 
 * IMPORTANTE: Este archivo contiene configuraciones sensibles.
 * En producción, estas variables deberían estar en variables de entorno.
 */

export const config = {
    // Configuración de Supabase
    supabase: {
        url: 'https://nqqbeuweyxatsxjsepnj.supabase.co',
        // ⚠️ ATENCIÓN: Necesitas reemplazar esta clave con tu clave real de Supabase
        // 1. Ve a: https://supabase.com/dashboard
        // 2. Selecciona tu proyecto
        // 3. Settings → API → Copia "anon public key"
        // 4. Pégala aquí (es segura, está diseñada para usarse en frontend)
        anonKey: 'sb_publishable_lo3mmXzOCwyfYg2NnMBS3Q_v2eCoVpO'
    },
    
    // Configuración de la aplicación
    app: {
        defaultDay: 'martes',
        version: '3.2.1' // v3.2.1 - Fix cálculo MVPs en Comparativa
    }
};

// Validar configuración
export function validateConfig() {
    const errors = [];
    
    if (!config.supabase.url) {
        errors.push('❌ Supabase URL no configurada');
    }
    
    if (!config.supabase.anonKey || config.supabase.anonKey === 'YOUR_SUPABASE_ANON_KEY_HERE') {
        errors.push('❌ Supabase Anon Key no configurada');
    }
    
    if (errors.length > 0) {
        console.error('❌ Errores de configuración:', errors);
        throw new Error('Configuración inválida: ' + errors.join(', '));
    }
    
    return {
        isValid: true,
        errors: []
    };
}
