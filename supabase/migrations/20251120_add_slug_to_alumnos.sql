-- Add slug column to alumnos table
ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS slug TEXT;

-- Create unique index on slug
CREATE UNIQUE INDEX IF NOT EXISTS alumnos_slug_unique ON alumnos(slug);

-- Function to generate slug from nombre (first name + first surname only)
CREATE OR REPLACE FUNCTION generate_slug(nombre TEXT)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 1;
  words TEXT[];
  first_name TEXT;
  first_surname TEXT;
BEGIN
  -- Split name into words
  words := string_to_array(trim(nombre), ' ');
  
  -- Get first name (first word)
  first_name := COALESCE(words[1], '');
  
  -- Get first surname (second word, or empty if doesn't exist)
  first_surname := COALESCE(words[2], '');
  
  -- Combine first name + first surname
  base_slug := trim(first_name || ' ' || first_surname);
  
  -- Convert to lowercase, replace spaces with hyphens, remove special characters
  base_slug := lower(regexp_replace(
    regexp_replace(base_slug, '[áàäâ]', 'a', 'g'),
    '[éèëê]', 'e', 'g'
  ));
  base_slug := regexp_replace(
    regexp_replace(base_slug, '[íìïî]', 'i', 'g'),
    '[óòöô]', 'o', 'g'
  );
  base_slug := regexp_replace(base_slug, '[úùüû]', 'u', 'g');
  base_slug := regexp_replace(base_slug, '[ñ]', 'n', 'g');
  base_slug := regexp_replace(base_slug, '[^a-z0-9\s-]', '', 'g');
  base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
  base_slug := regexp_replace(base_slug, '-+', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  
  final_slug := base_slug;
  
  -- Check if slug exists and add counter if needed
  WHILE EXISTS (SELECT 1 FROM alumnos WHERE slug = final_slug) LOOP
    final_slug := base_slug || '-' || counter;
    counter := counter + 1;
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Generate slugs for existing alumnos
UPDATE alumnos 
SET slug = generate_slug(nombre)
WHERE slug IS NULL;

-- Make slug NOT NULL after populating
ALTER TABLE alumnos ALTER COLUMN slug SET NOT NULL;

-- Add comment
COMMENT ON COLUMN alumnos.slug IS 'URL-friendly unique identifier generated from first name + first surname';
