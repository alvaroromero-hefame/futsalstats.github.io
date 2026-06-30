-- ============================================
-- Actualizar Miguel en la estructura ANTIGUA
-- ============================================
-- Mientras no migres a player_availability, 
-- Miguel debe tener is_fixed=true y day='ambos' o 'jueves'
-- ============================================

-- Ver estado actual de Miguel
SELECT 
    id,
    name,
    day,
    is_fixed,
    created_at
FROM players
WHERE name = 'Miguel';

-- Actualizar Miguel para que sea FIJO y juegue AMBOS días
-- (Temporalmente, hasta que migres a player_availability)
UPDATE players
SET 
    is_fixed = true,
    day = 'jueves'
WHERE name = 'Miguel';

-- Verificar actualización
SELECT 
    id,
    name,
    day,
    is_fixed,
    created_at
FROM players
WHERE name = 'Miguel';

-- Ver todos los fijos de jueves después del cambio
SELECT 
    name,
    day,
    is_fixed
FROM players
WHERE is_fixed = true
  AND (day = 'jueves' OR day = 'ambos')
ORDER BY name;
