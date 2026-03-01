PRAGMA foreign_keys = ON;

INSERT OR REPLACE INTO _meta (key, value) VALUES ('schema_version', '003');
INSERT OR IGNORE INTO _migrations (name) VALUES ('003_focus_areas_and_practice_parity');
