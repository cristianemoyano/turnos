import type { Migration } from "../../lib/migrations";

/**
 * Notifications + Web Push stack (Andiko-aligned), scoped by business_id.
 * Also creates platform_settings singleton for VAPID credentials.
 */
export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.sequelize.query(`
    CREATE TABLE platform_settings (
      id                                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
      singleton                           BOOLEAN       NOT NULL DEFAULT TRUE,
      push_vapid_enabled                  BOOLEAN       NOT NULL DEFAULT FALSE,
      push_vapid_public_key               VARCHAR(255)  NOT NULL DEFAULT '',
      push_vapid_private_key_encrypted    TEXT          NOT NULL DEFAULT '',
      push_vapid_contact_email            VARCHAR(320)  NOT NULL DEFAULT '',
      created_at                          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
      updated_at                          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
      CONSTRAINT uq_platform_settings_singleton UNIQUE (singleton)
    );

    INSERT INTO platform_settings (singleton) VALUES (TRUE);

    CREATE TABLE notifications (
      id                   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id          UUID          NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      event_key            VARCHAR(64)   NOT NULL,
      actor_id             UUID          REFERENCES users(id) ON DELETE SET NULL,
      recipient_kind       VARCHAR(16)   NOT NULL
                             CHECK (recipient_kind IN ('user')),
      recipient_user_id    UUID          REFERENCES users(id) ON DELETE SET NULL,
      payload              JSONB         NOT NULL DEFAULT '{}'::jsonb,
      read_at              TIMESTAMPTZ,
      created_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
      updated_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
      deleted_at           TIMESTAMPTZ
    );

    CREATE INDEX idx_notifications_business_created
      ON notifications(business_id, created_at DESC)
      WHERE deleted_at IS NULL;

    CREATE INDEX idx_notifications_recipient_user
      ON notifications(business_id, recipient_user_id, created_at DESC)
      WHERE deleted_at IS NULL AND recipient_user_id IS NOT NULL;

    CREATE INDEX idx_notifications_recipient_unread
      ON notifications(business_id, recipient_user_id, created_at DESC)
      WHERE deleted_at IS NULL AND recipient_user_id IS NOT NULL AND read_at IS NULL;

    CREATE TABLE notification_deliveries (
      id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
      notification_id  UUID          NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
      business_id      UUID          NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      channel          VARCHAR(16)   NOT NULL
                         CHECK (channel IN ('in_app', 'push')),
      status           VARCHAR(16)   NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
      subject          VARCHAR(500),
      body_text        TEXT,
      body_html        TEXT,
      transport        VARCHAR(16),
      message_id       VARCHAR(255),
      error            TEXT,
      delivered_at     TIMESTAMPTZ,
      created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
      updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
    );

    CREATE INDEX idx_notification_deliveries_notification
      ON notification_deliveries(notification_id);

    CREATE INDEX idx_notification_deliveries_business_channel_created
      ON notification_deliveries(business_id, channel, created_at DESC);

    CREATE TABLE notification_preferences (
      id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id UUID          NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      user_id     UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      event_key   VARCHAR(64)   NOT NULL,
      channel     VARCHAR(16)   NOT NULL
                    CHECK (channel IN ('in_app', 'push')),
      enabled     BOOLEAN       NOT NULL DEFAULT TRUE,
      created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
      deleted_at  TIMESTAMPTZ
    );

    CREATE UNIQUE INDEX uq_notification_preferences_scope
      ON notification_preferences (business_id, user_id, event_key, channel)
      WHERE deleted_at IS NULL;

    CREATE INDEX idx_notification_preferences_business_user
      ON notification_preferences (business_id, user_id)
      WHERE deleted_at IS NULL;

    CREATE TABLE push_subscriptions (
      id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id UUID          NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      user_id     UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      endpoint    TEXT          NOT NULL,
      p256dh_key  TEXT          NOT NULL,
      auth_key    TEXT          NOT NULL,
      user_agent  VARCHAR(500),
      created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
      deleted_at  TIMESTAMPTZ
    );

    CREATE UNIQUE INDEX uq_push_subscriptions_endpoint
      ON push_subscriptions (endpoint)
      WHERE deleted_at IS NULL;

    CREATE INDEX idx_push_subscriptions_user_active
      ON push_subscriptions (business_id, user_id)
      WHERE deleted_at IS NULL;
  `);
};

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.sequelize.query(`
    DROP TABLE IF EXISTS push_subscriptions;
    DROP TABLE IF EXISTS notification_preferences;
    DROP TABLE IF EXISTS notification_deliveries;
    DROP TABLE IF EXISTS notifications;
    DROP TABLE IF EXISTS platform_settings;
  `);
};
