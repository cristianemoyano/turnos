import type { Migration } from "../../lib/migrations";

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.sequelize.query(`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;

    CREATE TYPE weekday AS ENUM ('mon','tue','wed','thu','fri','sat','sun');
    CREATE TYPE appointment_status AS ENUM ('confirmed','done','cancelled');
    CREATE TYPE appointment_source AS ENUM ('staff','online');
    CREATE TYPE appointment_kind AS ENUM ('appointment','block');
    CREATE TYPE segment_type AS ENUM ('work','wait');

    CREATE TABLE businesses (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name           VARCHAR(200) NOT NULL,
      phone          VARCHAR(30),
      address        VARCHAR(300),
      slug           VARCHAR(80) NOT NULL UNIQUE,
      timezone       VARCHAR(60) NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
      trial_ends_at  TIMESTAMPTZ,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at     TIMESTAMPTZ
    );
    CREATE UNIQUE INDEX idx_businesses_slug ON businesses(slug) WHERE deleted_at IS NULL;

    CREATE TABLE users (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id    UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      email          VARCHAR(255) NOT NULL,
      password_hash  VARCHAR(255) NOT NULL,
      name           VARCHAR(200) NOT NULL,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at     TIMESTAMPTZ
    );
    CREATE UNIQUE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
    CREATE INDEX idx_users_business_id ON users(business_id) WHERE deleted_at IS NULL;

    CREATE TABLE professionals (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id    UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      name           VARCHAR(200) NOT NULL,
      phone          VARCHAR(30),
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at     TIMESTAMPTZ
    );
    CREATE INDEX idx_professionals_business_id ON professionals(business_id) WHERE deleted_at IS NULL;

    CREATE TABLE business_hours (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id    UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      day_of_week    weekday NOT NULL,
      is_open        BOOLEAN NOT NULL DEFAULT true,
      shifts         JSONB NOT NULL DEFAULT '[]',
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at     TIMESTAMPTZ,
      UNIQUE (business_id, day_of_week)
    );
    CREATE INDEX idx_business_hours_business_id ON business_hours(business_id) WHERE deleted_at IS NULL;

    CREATE TABLE services (
      id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id      UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      name             VARCHAR(200) NOT NULL,
      duration_minutes INT NOT NULL CHECK (duration_minutes > 0),
      price            NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
      active           BOOLEAN NOT NULL DEFAULT true,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at       TIMESTAMPTZ
    );
    CREATE INDEX idx_services_business_id ON services(business_id) WHERE deleted_at IS NULL;

    CREATE TABLE service_segments (
      id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      service_id       UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
      type             segment_type NOT NULL,
      label            VARCHAR(200) NOT NULL,
      duration_minutes INT NOT NULL CHECK (duration_minutes > 0),
      position         INT NOT NULL DEFAULT 0,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at       TIMESTAMPTZ
    );
    CREATE INDEX idx_service_segments_service_id ON service_segments(service_id) WHERE deleted_at IS NULL;

    CREATE TABLE clients (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id    UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      name           VARCHAR(200) NOT NULL,
      phone          VARCHAR(30),
      notes          TEXT,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at     TIMESTAMPTZ
    );
    CREATE INDEX idx_clients_business_id ON clients(business_id) WHERE deleted_at IS NULL;

    CREATE TABLE appointments (
      id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id      UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      professional_id  UUID REFERENCES professionals(id) ON DELETE SET NULL,
      client_id        UUID REFERENCES clients(id) ON DELETE SET NULL,
      service_id       UUID REFERENCES services(id) ON DELETE SET NULL,
      kind             appointment_kind NOT NULL DEFAULT 'appointment',
      status           appointment_status NOT NULL DEFAULT 'confirmed',
      source           appointment_source NOT NULL DEFAULT 'staff',
      start_at         TIMESTAMPTZ NOT NULL,
      duration_minutes INT NOT NULL CHECK (duration_minutes > 0),
      price            NUMERIC(10,2),
      reason           VARCHAR(300),
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at       TIMESTAMPTZ
    );
    CREATE INDEX idx_appointments_business_id ON appointments(business_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_appointments_business_start ON appointments(business_id, start_at) WHERE deleted_at IS NULL;
    CREATE INDEX idx_appointments_professional_id ON appointments(professional_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_appointments_client_id ON appointments(client_id) WHERE deleted_at IS NULL;
  `);
};

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.sequelize.query(`
    DROP TABLE IF EXISTS appointments;
    DROP TABLE IF EXISTS clients;
    DROP TABLE IF EXISTS service_segments;
    DROP TABLE IF EXISTS services;
    DROP TABLE IF EXISTS business_hours;
    DROP TABLE IF EXISTS professionals;
    DROP TABLE IF EXISTS users;
    DROP TABLE IF EXISTS businesses;
    DROP TYPE IF EXISTS segment_type;
    DROP TYPE IF EXISTS appointment_kind;
    DROP TYPE IF EXISTS appointment_source;
    DROP TYPE IF EXISTS appointment_status;
    DROP TYPE IF EXISTS weekday;
  `);
};
