# ✅ Checklist de Implementación - Fase 1 de Seguridad

## 📋 Estado de Implementación

### ✅ COMPLETADO (Por el Desarrollador)

- [x] **1. Sistema de Sanitización XSS**
  - [x] Archivo `js/utils/security.js` creado
  - [x] Funciones de sanitización implementadas
  - [x] Detección de código malicioso
  - [x] Validación de URLs y emails

- [x] **2. Sistema de Validación de Inputs**
  - [x] Archivo `js/utils/validation.js` creado
  - [x] Validaciones para nombres de jugadores
  - [x] Validaciones para fechas y números
  - [x] Validación de partidos completos
  - [x] Validación de contraseñas seguras

- [x] **3. Sanitización Aplicada**
  - [x] `js/utils/rendering.js` actualizado
  - [x] `js/ui/clasificacion.js` actualizado
  - [x] `js/ui/historico.js` actualizado
  - [x] `js/ui/estadisticas.js` actualizado
  - [x] Todos los datos se sanitizan antes de renderizar

- [x] **4. Sistema de Autenticación**
  - [x] `js/auth/authManager.js` creado
  - [x] Login/Logout implementado
  - [x] Verificación de roles
  - [x] Integración con Supabase Auth

- [x] **5. AuthGuard para Admin**
  - [x] `js/auth/authGuard.js` creado
  - [x] Protección de rutas administrativas
  - [x] Redirección automática
  - [x] Verificación de permisos

- [x] **6. Row Level Security (RLS)**
  - [x] Script SQL `supabase-rls-security.sql` creado
  - [x] Políticas de lectura pública definidas
  - [x] Políticas de escritura solo admin
  - [x] Tabla de roles de usuario
  - [x] Tabla de auditoría
  - [x] Funciones auxiliares

- [x] **7. Content Security Policy**
  - [x] CSP headers en `index.html`
  - [x] CSP headers en `admin.html`
  - [x] X-Frame-Options configurado
  - [x] X-Content-Type-Options configurado

- [x] **8. Variables de Entorno**
  - [x] `.env.example` creado
  - [x] `.gitignore` verificado
  - [x] Documentación en `SECURITY-SETUP.md`

- [x] **9. Documentación**
  - [x] `SECURITY-SETUP.md` - Guía de configuración
  - [x] `SECURITY-PHASE1-SUMMARY.md` - Resumen de implementación
  - [x] `SECURITY-CHECKLIST.md` - Este checklist

---

## 🔧 PENDIENTE (Acción del Usuario)

### 📝 Configuración Inicial

- [ ] **1. Copiar y configurar variables de entorno**
  ```bash
  copy .env.example .env
  # Editar .env con credenciales reales de Supabase
  ```

- [ ] **2. Ejecutar script SQL en Supabase**
  - [ ] Abrir Supabase Dashboard
  - [ ] Ir a SQL Editor
  - [ ] Copiar contenido de `supabase-rls-security.sql`
  - [ ] Ejecutar todo el script
  - [ ] Verificar que no hay errores

- [ ] **3. Crear usuario administrador**
  - [ ] Ir a Authentication → Users en Supabase
  - [ ] Crear nuevo usuario con email y contraseña segura
  - [ ] Anotar el email usado

- [ ] **4. Asignar rol de admin al usuario**
  ```sql
  -- Ejecutar en SQL Editor de Supabase
  INSERT INTO user_roles (user_id, role)
  SELECT id, 'admin'
  FROM auth.users
  WHERE email = 'TU_EMAIL_AQUI@ejemplo.com'
  ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
  ```

- [ ] **5. Verificar RLS habilitado**
  ```sql
  -- Ejecutar en SQL Editor de Supabase
  SELECT schemaname, tablename, rowsecurity
  FROM pg_tables
  WHERE schemaname = 'public';
  -- Todas las tablas deben tener rowsecurity = true
  ```

---

### 🔗 Integración con Código Existente

- [ ] **6. Actualizar admin.html para usar AuthGuard**
  
  Añadir al principio del script principal de admin:
  ```javascript
  import { protectPage } from './js/auth/authGuard.js';

  (async function() {
      const authorized = await protectPage({
          requireAdmin: true,
          redirectUrl: '/index.html'
      });
      
      if (!authorized) {
          return; // AuthGuard ya manejó la redirección
      }
      
      // Resto del código del panel de admin aquí
      const panel = new AdminPanel();
      await panel.init();
  })();
  ```

- [ ] **7. Actualizar js/admin/panel.js para usar ValidationUtils**
  
  ```javascript
  import { ValidationUtils } from '../utils/validation.js';
  
  async addPlayer(name, day, isFixed) {
      // Validar inputs
      const nameValidation = ValidationUtils.validatePlayerName(name);
      if (!nameValidation.valid) {
          alert(nameValidation.error);
          return;
      }
      
      const dayValidation = ValidationUtils.validateDay(day);
      if (!dayValidation.valid) {
          alert(dayValidation.error);
          return;
      }
      
      // Usar valores sanitizados
      const sanitizedName = nameValidation.sanitized;
      const sanitizedDay = dayValidation.sanitized;
      
      // Continuar con la inserción...
  }
  ```

- [ ] **8. Actualizar formularios de admin para validar**
  
  Aplicar validaciones antes de enviar datos:
  - Validar nombres de jugadores
  - Validar fechas de partidos
  - Validar números (goles, asistencias)
  - Sanitizar todos los inputs del usuario

---

### 🧪 Testing y Verificación

- [ ] **9. Probar protección del panel de admin**
  - [ ] Navegar a `/admin.html` sin login
  - [ ] Verificar que redirige a página de login
  - [ ] Login con usuario admin
  - [ ] Verificar que permite acceso
  - [ ] Logout y verificar que vuelve a pedir login

- [ ] **10. Probar protección XSS**
  - [ ] Intentar añadir jugador con nombre: `<script>alert('XSS')</script>`
  - [ ] Verificar que se muestra como texto, no se ejecuta
  - [ ] Revisar en clasificación que aparece sanitizado

- [ ] **11. Probar RLS en Supabase**
  - [ ] Desde consola del navegador (sin autenticar):
  ```javascript
  // Intentar insertar jugador sin autenticación
  const { data, error } = await supabase
      .from('players')
      .insert([{ name: 'Hacker', day: 'martes' }]);
  console.log(error); // Debe dar error de permisos
  ```

- [ ] **12. Verificar CSP headers**
  - [ ] Abrir DevTools → Console
  - [ ] Verificar que no hay errores de CSP
  - [ ] Si hay errores, ajustar la política en meta tag

- [ ] **13. Probar sanitización en todas las vistas**
  - [ ] Clasificación muestra nombres sanitizados
  - [ ] Histórico muestra datos sanitizados
  - [ ] Estadísticas muestran datos sanitizados
  - [ ] Simulador muestra datos sanitizados

---

### 📊 Validación Final

- [ ] **14. Auditoría de seguridad básica**
  - [ ] No hay errores en la consola del navegador
  - [ ] Variables de entorno NO están en el código
  - [ ] `.env` está en `.gitignore`
  - [ ] CSP headers están activos
  - [ ] RLS está habilitado en todas las tablas
  - [ ] Usuario admin puede acceder al panel
  - [ ] Usuarios no autenticados NO pueden acceder al panel

- [ ] **15. Revisar logs de Supabase**
  - [ ] Ir a Supabase → Logs
  - [ ] Revisar si hay intentos de acceso no autorizado
  - [ ] Verificar que las políticas RLS funcionan

- [ ] **16. Backup de configuración**
  - [ ] Guardar script SQL ejecutado
  - [ ] Documentar email del usuario admin
  - [ ] Guardar copia de `.env` en lugar seguro (NO Git)

---

## 🚨 Troubleshooting

### Problema: "Cannot find module 'security.js'"
**Solución:** Verificar que el import tiene la ruta correcta:
```javascript
import { SecurityUtils } from '../utils/security.js'; // Relativo
```

### Problema: "RLS policy violated"
**Solución:** 
1. Verificar que el script SQL se ejecutó completamente
2. Verificar que el usuario tiene rol 'admin' en `user_roles`
3. Ejecutar: `SELECT * FROM user_roles WHERE user_id = auth.uid();`

### Problema: Variables de entorno no funcionan
**Solución:** 
- Si NO usas bundler (Vite/Webpack), las variables de entorno NO funcionarán
- Crear `js/config.local.js` con credenciales directas (NO subir a Git)
- Cambiar imports de `config.js` a `config.local.js`

### Problema: CSP bloquea recursos
**Solución:** 
- Abrir DevTools → Console
- Ver qué recurso está siendo bloqueado
- Añadir el dominio a la directiva correspondiente en CSP

### Problema: AuthGuard causa bucle infinito
**Solución:** 
- Verificar que `loginUrl` apunta a página válida
- Asegurar que la página de login NO usa AuthGuard
- Revisar que existe `login.html` o ajustar la ruta

---

## 📈 Métricas de Éxito

Una vez completado el checklist, deberías tener:

- ✅ **0 vulnerabilidades críticas** de XSS
- ✅ **0 accesos no autorizados** al panel de admin
- ✅ **100% de datos sanitizados** antes de renderizar
- ✅ **RLS activo** en todas las tablas de Supabase
- ✅ **CSP configurado** y sin errores en consola
- ✅ **Autenticación real** funcionando correctamente

---

## 📞 Soporte

Si encuentras problemas:

1. **Revisar documentación:**
   - `SECURITY-SETUP.md` - Guía completa
   - `SECURITY-PHASE1-SUMMARY.md` - Resumen técnico

2. **Verificar configuración:**
   - Supabase RLS está habilitado
   - Usuario admin tiene rol correcto
   - Variables de entorno configuradas

3. **Debugging:**
   - Abrir DevTools → Console
   - Revisar errores específicos
   - Verificar logs de Supabase

---

**Última actualización:** 5 de noviembre de 2025  
**Versión:** 1.0.0
