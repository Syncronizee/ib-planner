-- Supabase lint remediation: RLS init-plan optimization + duplicate indexes
-- Run in Supabase SQL Editor (safe to run multiple times).

BEGIN;

-- 1) PERFORMANCE: Wrap auth.*() calls in policies with SELECT so they are init-planned once.
-- Ref: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
DO $$
DECLARE
  p RECORD;
  new_using TEXT;
  new_check TEXT;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        coalesce(qual, '') ~ 'auth\\.(uid|role|jwt)\\(\\)'
        OR coalesce(with_check, '') ~ 'auth\\.(uid|role|jwt)\\(\\)'
      )
  LOOP
    new_using := p.qual;
    new_check := p.with_check;

    IF new_using IS NOT NULL THEN
      new_using := regexp_replace(new_using, 'auth\\.uid\\(\\)', '(select auth.uid())', 'g');
      new_using := regexp_replace(new_using, 'auth\\.role\\(\\)', '(select auth.role())', 'g');
      new_using := regexp_replace(new_using, 'auth\\.jwt\\(\\)', '(select auth.jwt())', 'g');

      IF new_using IS DISTINCT FROM p.qual THEN
        EXECUTE format(
          'ALTER POLICY %I ON %I.%I USING (%s)',
          p.policyname,
          p.schemaname,
          p.tablename,
          new_using
        );
      END IF;
    END IF;

    IF new_check IS NOT NULL THEN
      new_check := regexp_replace(new_check, 'auth\\.uid\\(\\)', '(select auth.uid())', 'g');
      new_check := regexp_replace(new_check, 'auth\\.role\\(\\)', '(select auth.role())', 'g');
      new_check := regexp_replace(new_check, 'auth\\.jwt\\(\\)', '(select auth.jwt())', 'g');

      IF new_check IS DISTINCT FROM p.with_check THEN
        EXECUTE format(
          'ALTER POLICY %I ON %I.%I WITH CHECK (%s)',
          p.policyname,
          p.schemaname,
          p.tablename,
          new_check
        );
      END IF;
    END IF;
  END LOOP;
END
$$;

-- 2) PERFORMANCE: Drop duplicate indexes reported by Supabase linter.
-- Keep the more descriptive *_user_* indexes.
DROP INDEX IF EXISTS public.idx_energy_checkins_timestamp;
DROP INDEX IF EXISTS public.idx_study_sessions_started;

COMMIT;
