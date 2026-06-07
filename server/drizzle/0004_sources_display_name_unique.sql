CREATE UNIQUE INDEX IF NOT EXISTS uq_sources_display_name ON sources(LOWER(display_name));
