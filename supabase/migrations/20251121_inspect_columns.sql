CREATE OR REPLACE FUNCTION get_pagos_columns()
RETURNS TABLE (column_name text, data_type text)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT c.column_name::text, c.data_type::text
    FROM information_schema.columns c
    WHERE c.table_name = 'pagos'
    AND c.table_schema = 'public';
END;
$$;
