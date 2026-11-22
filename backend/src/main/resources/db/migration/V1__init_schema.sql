CREATE TABLE users (
    id            BIGSERIAL PRIMARY KEY,
    username      VARCHAR(50)  NOT NULL UNIQUE,
    email         VARCHAR(120) NOT NULL UNIQUE,
    password_hash VARCHAR(100) NOT NULL,
    role          VARCHAR(20)  NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE accounts (
    id             BIGSERIAL PRIMARY KEY,
    account_number VARCHAR(20)  NOT NULL UNIQUE,
    holder_name    VARCHAR(100) NOT NULL,
    home_country   VARCHAR(2)   NOT NULL,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE transactions (
    id               BIGSERIAL PRIMARY KEY,
    account_id       BIGINT        NOT NULL REFERENCES accounts(id),
    idempotency_key  VARCHAR(64)   NOT NULL UNIQUE,
    merchant         VARCHAR(100)  NOT NULL,
    amount           NUMERIC(14,2) NOT NULL CHECK (amount > 0),
    currency         VARCHAR(3)    NOT NULL,
    country          VARCHAR(2)    NOT NULL,
    device_id        VARCHAR(64),
    rule_score       NUMERIC(5,4),
    ml_score         NUMERIC(5,4),
    final_score      NUMERIC(5,4),
    decision         VARCHAR(10)   NOT NULL,
    decision_reason  TEXT,
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_txn_account_time ON transactions(account_id, created_at DESC);

CREATE TABLE alerts (
    id             BIGSERIAL PRIMARY KEY,
    transaction_id BIGINT      NOT NULL UNIQUE REFERENCES transactions(id),
    status         VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    reviewed_by    BIGINT REFERENCES users(id),
    reviewed_at    TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit_log (
    id             BIGSERIAL PRIMARY KEY,
    transaction_id BIGINT REFERENCES transactions(id),
    event_type     VARCHAR(40) NOT NULL,
    details        JSONB,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);