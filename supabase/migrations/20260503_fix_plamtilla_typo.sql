-- Corrige el typo "Plamtilla" -> "Plantilla" en nombres de plantillas guardadas en BD
UPDATE templates
SET name = REPLACE(name, 'Plamtilla', 'Plantilla')
WHERE name LIKE '%Plamtilla%';
