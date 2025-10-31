# 🔐 Panel de Administración - Guía de Configuración

## 📋 Descripción

El panel de administración permite gestionar partidos, jugadores y configuraciones de forma segura mediante autenticación de Supabase.

## 🚀 Acceso al Panel

**URL:** `admin.html`

Por ejemplo:
- Local: `http://localhost:8000/admin.html`
- Producción: `https://tudominio.github.io/admin.html`

## ⚙️ Configuración Inicial en Supabase

### 1. Habilitar Autenticación de Email

1. Ve a tu proyecto de Supabase: https://supabase.com/dashboard
2. Navega a **Authentication** → **Providers**
3. Asegúrate de que **Email** esté habilitado
4. Configura la URL del sitio en **Authentication** → **URL Configuration**:
   - Site URL: `https://tudominio.github.io`
   - Redirect URLs: `https://tudominio.github.io/admin.html`

### 2. Crear Usuario Administrador

Hay dos formas de crear un usuario admin:

#### Opción A: Desde el Dashboard de Supabase (Recomendado)

1. Ve a **Authentication** → **Users**
2. Click en **Add User** → **Create new user**
3. Ingresa:
   - Email: `admin@futsalstats.com` (o tu email)
   - Password: Una contraseña segura
   - Confirm Email: ✅ (marcar como confirmado)
4. Click en **Create user**

#### Opción B: Mediante SQL

Ejecuta en el SQL Editor:

```sql
-- Crear usuario admin (cambia el email y password)
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    confirmation_token,
    recovery_token
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'admin@futsalstats.com',
    crypt('TuPasswordSeguro123!', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    false,
    '',
    ''
);
```

**Nota:** Cambia `admin@futsalstats.com` y `TuPasswordSeguro123!` por tus credenciales.

## 🔑 Iniciar Sesión

1. Abre `admin.html` en tu navegador
2. Ingresa tus credenciales:
   - Email: El que configuraste
   - Password: La contraseña que configuraste
3. Click en **Iniciar Sesión**

## 📊 Funcionalidades del Panel

### 1. Añadir Nuevo Partido

#### Información General:
- **Fecha**: Selecciona la fecha del partido
- **Día**: Elige Martes o Jueves (selector arriba)
- **MVP**: Selecciona el MVP (opcional)

#### Configurar Equipos:

**Jugadores Fijos:**
1. Marca el checkbox del jugador para incluirlo en el equipo
2. Al marcarlo, aparecerán campos para sus estadísticas:
   - **Goles**: Número de goles marcados por el jugador
   - **Asist.**: Número de asistencias realizadas
   - **🧤**: Marca si jugó como portero

**Jugadores Extras:**
1. Click en **➕ Añadir Extra**
2. Opciones disponibles:
   - **Seleccionar de eventuales**: Elige un jugador eventual existente
   - **+ Nuevo jugador...**: Para jugadores que nunca han jugado antes
3. Si seleccionas "Nuevo jugador", aparecerá un campo para ingresar su nombre
4. Completa las estadísticas (goles, asistencias, portero)
5. Puedes añadir múltiples extras con el botón ➕
6. Para eliminar un extra, click en ❌

#### Goles del Equipo:
- Ingresa el total de goles del equipo azul
- Ingresa el total de goles del equipo rojo

El resultado (Victoria Azul/Roja o Empate) se calcula automáticamente.

**📝 Nota**: Las estadísticas individuales (goles, asistencias) se guardan para cada jugador y se usan en los cálculos de la aplicación.

### 2. Gestión de Jugadores

#### Añadir Jugador:
- Nombre del jugador
- Día: Martes, Jueves o Ambos
- Fijo o Eventual
- Click en **Añadir Jugador**

#### Eliminar Jugador:
- Click en el icono 🗑️ junto al jugador
- Confirmar eliminación

### 3. Partidos Recientes

- Ver últimos 10 partidos
- Eliminar partidos con el icono 🗑️
- Los cambios se reflejan inmediatamente en la app principal

### 4. Configuración

- **Próximo Seleccionador**: Elige quién será el próximo seleccionador de equipos
- Los cambios se guardan automáticamente

## 🔒 Seguridad

### Políticas RLS Recomendadas

Para producción, es recomendable restringir las operaciones solo a usuarios autenticados:

```sql
-- Eliminar políticas públicas (si las tienes)
DROP POLICY IF EXISTS "Allow anon all on matches" ON matches;
DROP POLICY IF EXISTS "Allow anon all on players" ON players;
DROP POLICY IF EXISTS "Allow anon all on settings" ON settings;

-- Crear políticas solo para usuarios autenticados
CREATE POLICY "Authenticated users can do all on matches"
    ON matches FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users can do all on players"
    ON players FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Authenticated users can do all on settings"
    ON settings FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Permitir lectura pública (para la app principal)
CREATE POLICY "Public read access on matches"
    ON matches FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "Public read access on players"
    ON players FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "Public read access on settings"
    ON settings FOR SELECT
    TO anon, authenticated
    USING (true);
```

### Proteger la Página Admin

Para producción, considera estas opciones:

1. **URL Oculta**: No enlaces `admin.html` desde ningún lugar público
2. **Autenticación Requerida**: Ya implementada con Supabase Auth
3. **Roles**: Puedes agregar verificación de roles específicos

## 🚨 Solución de Problemas

### "Invalid login credentials"
- Verifica que el email y contraseña sean correctos
- Asegúrate de que el usuario esté confirmado en Supabase

### "Error al iniciar sesión"
- Verifica la configuración de Supabase en `config.js`
- Revisa que las URLs de redirección estén configuradas correctamente

### Los cambios no se reflejan en la app
- Recarga la aplicación principal (`index.html`)
- Verifica que RLS esté configurado para permitir lectura pública

### No puedo eliminar jugadores/partidos
- Verifica las políticas RLS en Supabase
- Asegúrate de estar autenticado correctamente

## 📱 Uso desde Móvil

El panel está optimizado para dispositivos móviles. Puedes:
- Iniciar sesión desde tu teléfono
- Añadir partidos después del juego
- Gestionar jugadores sobre la marcha

## 🔄 Cerrar Sesión

Click en **🚪 Cerrar Sesión** en la esquina superior derecha del panel.

## 💡 Tips

1. **Añadir partidos inmediatamente**: Después de cada partido, añádelo mientras está fresco en la memoria
2. **Revisar partidos recientes**: Asegúrate de que la información sea correcta
3. **Gestionar jugadores**: Mantén la lista de jugadores actualizada
4. **Backup**: Los datos están en Supabase, pero puedes exportarlos periódicamente

## 📞 Soporte

Si necesitas ayuda:
1. Revisa los logs de la consola del navegador (F12)
2. Verifica la configuración de Supabase
3. Consulta la documentación de Supabase Auth

---

## 🎯 Próximos Pasos

Después de configurar el panel:

1. ✅ Crea tu usuario administrador
2. ✅ Inicia sesión en `admin.html`
3. ✅ Añade jugadores si aún no los has migrado
4. ✅ Añade un partido de prueba
5. ✅ Verifica que aparezca en la app principal
6. ✅ Configura las políticas RLS para producción

¡Listo! Ahora puedes gestionar tu liga de fútsal desde cualquier lugar. 🎉
