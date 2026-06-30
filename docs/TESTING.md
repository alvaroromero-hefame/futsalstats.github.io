# 🧪 Guía de Pruebas - Futsal Stats

## ⚡ Inicio Rápido

### 1. Servir la aplicación localmente

La aplicación usa módulos ES6, por lo que **necesita ser servida desde un servidor HTTP** (no se puede abrir directamente con `file://`).

#### Opción A: Python (recomendado)
```bash
# Si tienes Python 3 instalado
cd c:\Proyectos\Personal\Code\FutsalStats\futsalstats.github.io
python -m http.server 8000
```

Luego abre: `http://localhost:8000`

#### Opción B: Node.js
```bash
# Si tienes Node.js instalado
npx http-server -p 8000
```

#### Opción C: VS Code Live Server
1. Instala la extensión "Live Server" en VS Code
2. Click derecho en `index.html`
3. Selecciona "Open with Live Server"

### 2. Verificar que todo funciona

Abre la consola del navegador (F12) y verifica que no hay errores.

## ✅ Checklist de Pruebas

### Funcionalidad Básica

- [ ] **Carga de datos**
  - La página carga sin errores
  - Se muestra la clasificación inicial
  - No hay errores en la consola

### Vista: Clasificación

- [ ] **Visualización**
  - Se muestra la tabla de clasificación
  - El primer jugador tiene fondo verde y 🏆
  - El último jugador tiene fondo rojo y 😭
  - Los jugadores fijos tienen ⭐
  - El próximo seleccionador tiene ⚽
  - Se muestra la leyenda de puntuación

- [ ] **Selector de días**
  - Click en "Martes" muestra datos de martes
  - Click en "Jueves" muestra datos de jueves
  - El botón activo tiene color azul
  - Los datos cambian correctamente

- [ ] **Datos correctos**
  - Puntos se calculan correctamente
  - Goles, asistencias, encajados son correctos
  - Ganados, empatados, perdidos suman bien
  - MVPs se cuentan correctamente

### Vista: Histórico

- [ ] **Visualización**
  - Se muestran todos los partidos
  - Fechas están formateadas correctamente
  - Resultados muestran "Azul X - Rojo Y"
  - MVPs se muestran o "Sin MVP"
  - Botones "Ver detalle" aparecen

- [ ] **Filtros**
  - Filtro por día funciona (selector superior)
  - Filtro por fecha filtra correctamente
  - Filtro por MVP encuentra partidos
  - Filtro por integrante busca en ambos equipos
  - Combinar filtros funciona
  - Botón "Buscar" aplica filtros

- [ ] **Detalle de partido**
  - Click en "Ver detalle" muestra lineup
  - Equipo azul aparece en azul
  - Equipo rojo aparece en rojo
  - Se muestran goles, asistencias y encajados
  - Jugadores fijos tienen ⭐

### Vista: Estadísticas

- [ ] **Visualización general**
  - Se muestran todas las estadísticas
  - Selector de días funciona
  - Números son correctos

- [ ] **Estadísticas individuales**
  - Total de goles es correcto
  - Victorias muestra "Azul X - Rojo Y" con colores
  - Top 3 goleadores muestra máximo 3 (o más si empate)
  - Top 3 encajados es correcto
  - Top 3 asistencias es correcto

- [ ] **Recaudación (solo Jueves)**
  - Aparece solo al seleccionar "Jueves"
  - Cuenta correctamente participaciones de no fijos
  - Formato es "X€"

### Menú Lateral (Sidebar)

- [ ] **Desktop (> 1024px)**
  - Menú siempre visible en el lado izquierdo
  - No hay botón hamburguesa visible
  - Click en opciones cambia la vista
  - Contenido se ajusta con margen izquierdo

- [ ] **Tablet (768px - 1024px)**
  - Botón hamburguesa visible
  - Click en botón colapsa/expande menú
  - Menú ocupa menos espacio cuando colapsado
  - Contenido se ajusta dinámicamente

- [ ] **Móvil (< 768px)**
  - Botón hamburguesa circular flotante
  - Color rojo con borde blanco
  - Click abre menú desde la izquierda
  - Backdrop oscuro aparece
  - Click en backdrop cierra menú
  - Click en opción cierra menú automáticamente
  - Swipe desde borde izquierdo abre menú
  - Swipe hacia izquierda cierra menú

### Responsive Design

#### Desktop (1920x1080)
- [ ] Layout se ve bien
- [ ] Tablas son legibles
- [ ] Menú lateral visible
- [ ] No hay scroll horizontal

#### Laptop (1366x768)
- [ ] Todo el contenido es visible
- [ ] Tablas no se cortan
- [ ] Menú funciona correctamente

#### Tablet Portrait (768x1024)
- [ ] Menú se puede colapsar
- [ ] Contenido se adapta
- [ ] Tablas son legibles
- [ ] Botones táctiles funcionan

#### Tablet Landscape (1024x768)
- [ ] Diseño similar a desktop
- [ ] Menú se ajusta correctamente

#### Móvil Portrait (375x667 - iPhone SE)
- [ ] Botón hamburguesa visible y grande
- [ ] Menú overlay funciona
- [ ] Tablas se convierten en tarjetas
- [ ] Cada fila es una tarjeta separada
- [ ] Labels aparecen antes de valores
- [ ] Todo es tocable (mínimo 44px)

#### Móvil Landscape (667x375)
- [ ] Contenido se adapta
- [ ] Menú funciona correctamente

### Pruebas de Interacción

- [ ] **Navegación fluida**
  - Cambiar entre vistas es instantáneo
  - No hay parpadeos
  - Estado se mantiene al volver a una vista

- [ ] **Performance**
  - Carga inicial < 2 segundos
  - Cambio de vista < 500ms
  - Aplicación de filtros < 500ms
  - No hay lag en interacciones

### Pruebas de Datos

- [ ] **Integridad de datos**
  - Todos los partidos de `FutsalStatsMartes.json` aparecen
  - Todos los partidos de `FutsalStatsJueves.json` aparecen
  - No hay jugadores duplicados en clasificación
  - Los fijos configurados tienen ⭐

- [ ] **Cálculos matemáticos**
  - Victoria da 3 puntos a cada jugador ganador
  - Empate da 1 punto a todos
  - Goles suman +0.25 por gol
  - Asistencias suman +0.25 por asistencia
  - Encajados restan -0.25 por gol
  - MVP suma +1 punto

## 🐛 Problemas Comunes y Soluciones

### Problema: Página en blanco
**Causa**: Módulos ES6 cargados desde `file://`
**Solución**: Usar servidor HTTP local (ver sección de inicio rápido)

### Problema: Error CORS
**Causa**: Archivos JSON no se pueden cargar
**Solución**: Verificar que los archivos estén en `data/` y usar servidor HTTP

### Problema: "Cannot use import statement outside a module"
**Causa**: Falta `type="module"` en el script tag
**Solución**: Ya está incluido en `index.html`: `<script type="module">`

### Problema: Vista no se actualiza al cambiar de día
**Causa**: Event listeners no adjuntados correctamente
**Solución**: Verificar que `attachEventListeners()` se llama en cada `render()`

### Problema: Estilos no se aplican
**Causa**: Archivos CSS no cargados o rutas incorrectas
**Solución**: Verificar que todos los `<link>` en `index.html` apuntan a `css/*.css`

### Problema: Menú no cierra en móvil
**Causa**: Backdrop o event listeners no funcionan
**Solución**: Verificar que `mobile-backdrop` existe en HTML y tiene event listener

## 📱 Pruebas en Dispositivos Reales

### iOS Safari
- [ ] Gestos táctiles funcionan
- [ ] Menú deslizable funciona
- [ ] No hay problema con viewport
- [ ] Inputs no hacen zoom

### Android Chrome
- [ ] Performance es buena
- [ ] Menú funciona correctamente
- [ ] Tablas se ven bien

### Prueba de Compatibilidad de Navegadores

| Navegador | Versión Mínima | Estado |
|-----------|----------------|--------|
| Chrome    | 61+           | ✅      |
| Firefox   | 60+           | ✅      |
| Safari    | 11+           | ✅      |
| Edge      | 79+           | ✅      |
| Opera     | 48+           | ✅      |

## 🔍 Herramientas de Desarrollo

### Chrome DevTools
```
F12 → Console
  - Verificar errores de JavaScript
  - Ver mensajes de carga de módulos

F12 → Network
  - Verificar carga de archivos JSON
  - Verificar carga de módulos JS
  - Verificar carga de CSS

F12 → Elements
  - Inspeccionar estructura HTML generada
  - Verificar clases CSS aplicadas

F12 → Application → Local Storage
  - (No usado actualmente, pero disponible para futuro)
```

### Responsive Testing
```
F12 → Toggle Device Toolbar (Ctrl+Shift+M)
  - Probar diferentes tamaños de pantalla
  - Simular dispositivos móviles
  - Verificar touch events
```

## 📊 Métricas de Calidad

Después de las pruebas, verificar:

- [ ] **Funcionalidad**: 100% de features funcionan
- [ ] **Responsive**: Se ve bien en todos los tamaños
- [ ] **Performance**: Carga rápida y fluida
- [ ] **Accesibilidad**: Botones y links son tocables
- [ ] **Compatibilidad**: Funciona en principales navegadores
- [ ] **Código**: Sin errores en consola

## ✨ Pruebas Opcionales Avanzadas

### Testing con datos diferentes
1. Modificar `data/FutsalStatsMartes.json`
2. Agregar un partido nuevo
3. Recargar y verificar que aparece correctamente

### Testing de edge cases
- [ ] Partido sin MVP
- [ ] Jugador sin goles, asistencias ni encajados
- [ ] Empate perfecto en clasificación
- [ ] Lista de fijos vacía
- [ ] Fecha en formato diferente

## 📝 Reporte de Bugs

Si encuentras algún bug, documenta:
1. **Descripción**: ¿Qué pasó?
2. **Pasos para reproducir**: ¿Cómo lo hiciste?
3. **Resultado esperado**: ¿Qué debería pasar?
4. **Resultado actual**: ¿Qué pasó realmente?
5. **Navegador/Dispositivo**: ¿Dónde lo viste?
6. **Console logs**: Copia errores de la consola

## ✅ Conclusión

Una vez completado este checklist, la aplicación está lista para producción. Si todos los items están marcados, ¡felicitaciones! 🎉
