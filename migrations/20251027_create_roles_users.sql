-- Migration: create roles and users tables
-- Engine: PostgreSQL

-- ========== UP ==========
BEGIN;

CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role_id INT REFERENCES roles(id) ON UPDATE CASCADE ON DELETE SET NULL
);

COMMIT;

-- ========== DOWN ==========
BEGIN;

DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS roles;

COMMIT;
