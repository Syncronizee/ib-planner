PRAGMA foreign_keys = ON;

INSERT OR IGNORE INTO _meta (key, value) VALUES ('schema_version', '001');

INSERT OR IGNORE INTO _migrations (name) VALUES ('001_initial');
