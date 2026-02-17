PRAGMA foreign_keys = ON;

-- The canonical schema is maintained in schema.sql. We keep this migration marker
-- so existing local installs can advance schema_version safely.
INSERT OR REPLACE INTO _meta (key, value) VALUES ('schema_version', '002');
INSERT OR IGNORE INTO _migrations (name) VALUES ('002_full_schema_sync');
