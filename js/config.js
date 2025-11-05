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
        anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xcWJldXdleXhhdHN4anNlcG5qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NzE0ODEsImV4cCI6MjA3NzM0NzQ4MX0.ZWrWEX9_55wIeew8p4Ar0zojHUMf7_2mtsuNI4aws_Y'
    },
    
    // Configuración de la aplicación
    app: {
        defaultDay: 'martes',
        version: '3.0.0'
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
