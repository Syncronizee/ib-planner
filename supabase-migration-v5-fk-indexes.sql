-- Supabase lint remediation (worth fixing now): unindexed foreign keys
-- This script creates missing covering indexes for foreign keys in schema public.
-- It only creates an index when no existing covering btree index is found.

DO $$
DECLARE
  fk RECORD;
  idx_name TEXT;
  cols_sql TEXT;
BEGIN
  FOR fk IN
    SELECT
      c.oid,
      n.nspname AS schema_name,
      t.relname AS table_name,
      c.conname AS constraint_name,
      c.conrelid,
      c.conkey
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE c.contype = 'f'
      AND n.nspname = 'public'
      AND NOT EXISTS (
        SELECT 1
        FROM pg_index i
        WHERE i.indrelid = c.conrelid
          AND i.indisvalid
          AND i.indpred IS NULL
          AND i.indnatts >= cardinality(c.conkey)
          AND (i.indkey::smallint[])[1:cardinality(c.conkey)] = c.conkey
      )
  LOOP
    SELECT string_agg(quote_ident(a.attname), ', ' ORDER BY k.ord)
      INTO cols_sql
    FROM unnest(fk.conkey) WITH ORDINALITY AS k(attnum, ord)
    JOIN pg_attribute a
      ON a.attrelid = fk.conrelid
     AND a.attnum = k.attnum
     AND a.attisdropped = false;

    -- Keep index name deterministic and within Postgres identifier limit.
    idx_name := left('idx_' || fk.table_name || '_' || fk.constraint_name, 63);

    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON %I.%I (%s);',
      idx_name,
      fk.schema_name,
      fk.table_name,
      cols_sql
    );
  END LOOP;
END
$$;
