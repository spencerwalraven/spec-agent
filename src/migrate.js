/**
 * SPEC Systems — PostgreSQL Schema Migration
 * Run once to create all tables. Safe to re-run (uses IF NOT EXISTS).
 * Usage: node src/migrate.js
 */
require('dotenv').config();
const { pool, query } = require('./db');

async function migrate() {
  console.log('🚀 Running SPEC Systems database migration...\n');

  await query(`
    -- ─────────────────────────────────────────────
    -- COMPANIES  (multi-tenant foundation)
    -- ─────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS companies (
      id              SERIAL PRIMARY KEY,
      name            VARCHAR(255) NOT NULL DEFAULT 'My Company',
      phone           VARCHAR(50),
      email           VARCHAR(255),
      address         TEXT,
      owner_name      VARCHAR(255),
      calendly_link   VARCHAR(500),
      google_review_link VARCHAR(500),
      email_signature TEXT,
      email_tone      VARCHAR(100) DEFAULT 'professional',
      plan            VARCHAR(50)  DEFAULT 'full',
      created_at      TIMESTAMPTZ  DEFAULT NOW(),
      updated_at      TIMESTAMPTZ  DEFAULT NOW()
    );

    -- Seed a default company row so company_id = 1 always exists
    INSERT INTO companies (id, name) VALUES (1, 'My Company')
      ON CONFLICT (id) DO NOTHING;
  `);
  console.log('✅ companies');

  await query(`
    -- ─────────────────────────────────────────────
    -- SETTINGS  (per-company config — mirrors Settings tab)
    -- ─────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS settings (
      id                  SERIAL PRIMARY KEY,
      company_id          INTEGER NOT NULL DEFAULT 1 REFERENCES companies(id) ON DELETE CASCADE,
      company_name        VARCHAR(255),
      phone               VARCHAR(50),
      email               VARCHAR(255),
      address             TEXT,
      owner_name          VARCHAR(255),
      calendly_link       VARCHAR(500),
      google_review_link  VARCHAR(500),
      email_signature     TEXT,
      email_tone          VARCHAR(100) DEFAULT 'professional',
      updated_at          TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(company_id)
    );

    INSERT INTO settings (company_id) VALUES (1) ON CONFLICT DO NOTHING;
  `);
  console.log('✅ settings');

  await query(`
    -- ─────────────────────────────────────────────
    -- LEADS
    -- ─────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS leads (
      id               SERIAL PRIMARY KEY,
      company_id       INTEGER NOT NULL DEFAULT 1 REFERENCES companies(id) ON DELETE CASCADE,
      name             VARCHAR(255),
      email            VARCHAR(255),
      phone            VARCHAR(50),
      service          VARCHAR(255),
      message          TEXT,
      address          TEXT,
      source           VARCHAR(100),
      score            INTEGER DEFAULT 0,
      score_label      VARCHAR(50),   -- Hot / Warm / Cold
      status           VARCHAR(50) DEFAULT 'new',  -- new, contacted, qualified, converted, lost
      notes            TEXT,
      last_contact_at  TIMESTAMPTZ,
      follow_up_count  INTEGER DEFAULT 0,
      ai_summary       TEXT,
      outreach_sent    BOOLEAN DEFAULT FALSE,
      sms_sent         BOOLEAN DEFAULT FALSE,
      converted_at     TIMESTAMPTZ,
      lost_at          TIMESTAMPTZ,
      created_at       TIMESTAMPTZ DEFAULT NOW(),
      updated_at       TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_leads_company ON leads(company_id);
    CREATE INDEX IF NOT EXISTS idx_leads_status  ON leads(status);
    CREATE INDEX IF NOT EXISTS idx_leads_email   ON leads(email);
  `);
  console.log('✅ leads');

  await query(`
    -- ─────────────────────────────────────────────
    -- CLIENTS  (converted leads)
    -- ─────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS clients (
      id                   SERIAL PRIMARY KEY,
      company_id           INTEGER NOT NULL DEFAULT 1 REFERENCES companies(id) ON DELETE CASCADE,
      lead_id              INTEGER REFERENCES leads(id),
      name                 VARCHAR(255) NOT NULL,
      email                VARCHAR(255),
      phone                VARCHAR(50),
      address              TEXT,
      source               VARCHAR(100),
      -- Customer profile (filled by Learning Agent)
      communication_style  TEXT,
      decision_factors     TEXT,
      key_concerns         TEXT,
      preferred_contact    VARCHAR(100),
      notes                TEXT,
      -- Aggregated stats
      total_revenue        DECIMAL(10,2) DEFAULT 0,
      job_count            INTEGER DEFAULT 0,
      last_job_at          TIMESTAMPTZ,
      created_at           TIMESTAMPTZ DEFAULT NOW(),
      updated_at           TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_clients_company ON clients(company_id);
    CREATE INDEX IF NOT EXISTS idx_clients_email   ON clients(email);
  `);
  console.log('✅ clients');

  await query(`
    -- ─────────────────────────────────────────────
    -- JOBS
    -- ─────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS jobs (
      id                   SERIAL PRIMARY KEY,
      company_id           INTEGER NOT NULL DEFAULT 1 REFERENCES companies(id) ON DELETE CASCADE,
      client_id            INTEGER REFERENCES clients(id),
      job_ref              VARCHAR(100) UNIQUE,  -- human-readable e.g. JOB-001
      title                VARCHAR(255),
      service              VARCHAR(255),
      description          TEXT,
      address              TEXT,
      status               VARCHAR(50) DEFAULT 'pending',
        -- pending | active | on_hold | completed | cancelled
      priority             VARCHAR(50) DEFAULT 'normal',
      -- Financials
      estimated_value      DECIMAL(10,2),
      actual_value         DECIMAL(10,2),
      material_cost        DECIMAL(10,2),
      labor_cost           DECIMAL(10,2),
      overhead_cost        DECIMAL(10,2),
      profit_margin        DECIMAL(5,2),
      deposit_amount       DECIMAL(10,2),
      deposit_paid         BOOLEAN DEFAULT FALSE,
      -- Timeline
      start_date           DATE,
      end_date             DATE,
      actual_start         DATE,
      actual_end           DATE,
      -- Proposal
      proposal_status      VARCHAR(50),
      proposal_sent_at     TIMESTAMPTZ,
      proposal_signed_at   TIMESTAMPTZ,
      proposal_token       VARCHAR(255),
      proposal_follow_ups  INTEGER DEFAULT 0,
      -- Contract
      contract_status      VARCHAR(50),
      contract_sent_at     TIMESTAMPTZ,
      contract_signed_at   TIMESTAMPTZ,
      -- QuickBooks
      qb_estimate_id       VARCHAR(100),
      qb_invoice_id        VARCHAR(100),
      qb_customer_id       VARCHAR(100),
      -- Notes & AI
      notes                TEXT,
      ai_plan              TEXT,
      scope_of_work        TEXT,
      weather_risk         VARCHAR(50),
      kickoff_date         DATE,
      kickoff_scheduled    BOOLEAN DEFAULT FALSE,
      -- Completion
      review_requested     BOOLEAN DEFAULT FALSE,
      checkin_scheduled    BOOLEAN DEFAULT FALSE,
      created_at           TIMESTAMPTZ DEFAULT NOW(),
      updated_at           TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_jobs_company   ON jobs(company_id);
    CREATE INDEX IF NOT EXISTS idx_jobs_client    ON jobs(client_id);
    CREATE INDEX IF NOT EXISTS idx_jobs_status    ON jobs(status);
    CREATE INDEX IF NOT EXISTS idx_jobs_ref       ON jobs(job_ref);
  `);
  console.log('✅ jobs');

  await query(`
    -- ─────────────────────────────────────────────
    -- JOB PHASES
    -- ─────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS job_phases (
      id              SERIAL PRIMARY KEY,
      company_id      INTEGER NOT NULL DEFAULT 1,
      job_id          INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      phase_number    INTEGER,
      name            VARCHAR(255),
      description     TEXT,
      assigned_to     VARCHAR(255),
      status          VARCHAR(50) DEFAULT 'pending',
        -- pending | in_progress | completed | blocked
      estimated_cost  DECIMAL(10,2),
      actual_cost     DECIMAL(10,2),
      start_date      DATE,
      end_date        DATE,
      completed_at    TIMESTAMPTZ,
      client_feedback TEXT,
      sub_notified    BOOLEAN DEFAULT FALSE,
      notes           TEXT,
      created_at      TIMESTAMPTZ DEFAULT NOW(),
      updated_at      TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_phases_job ON job_phases(job_id);
  `);
  console.log('✅ job_phases');

  await query(`
    -- ─────────────────────────────────────────────
    -- INVOICES
    -- ─────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS invoices (
      id                    SERIAL PRIMARY KEY,
      company_id            INTEGER NOT NULL DEFAULT 1,
      job_id                INTEGER REFERENCES jobs(id),
      client_id             INTEGER REFERENCES clients(id),
      invoice_type          VARCHAR(50),  -- deposit | final | change_order
      amount                DECIMAL(10,2),
      status                VARCHAR(50) DEFAULT 'pending',
        -- pending | sent | paid | overdue | cancelled
      stripe_payment_link   VARCHAR(500),
      stripe_payment_intent VARCHAR(255),
      qb_invoice_id         VARCHAR(100),
      sent_at               TIMESTAMPTZ,
      paid_at               TIMESTAMPTZ,
      due_date              DATE,
      follow_up_count       INTEGER DEFAULT 0,
      notes                 TEXT,
      created_at            TIMESTAMPTZ DEFAULT NOW(),
      updated_at            TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_invoices_job    ON invoices(job_id);
    CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
  `);
  console.log('✅ invoices');

  await query(`
    -- ─────────────────────────────────────────────
    -- TEAM MEMBERS
    -- ─────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS team (
      id                SERIAL PRIMARY KEY,
      company_id        INTEGER NOT NULL DEFAULT 1,
      name              VARCHAR(255) NOT NULL,
      role              VARCHAR(100),
      email             VARCHAR(255),
      phone             VARCHAR(50),
      status            VARCHAR(50) DEFAULT 'active',  -- active | inactive
      performance_score DECIMAL(4,1),
      jobs_completed    INTEGER DEFAULT 0,
      qb_employee_id        VARCHAR(100),
      login_username        VARCHAR(100),
      login_password_hash   VARCHAR(255),
      login_role            VARCHAR(50) DEFAULT 'field',
      notes                 TEXT,
      created_at        TIMESTAMPTZ DEFAULT NOW(),
      updated_at        TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_team_company ON team(company_id);
  `);
  console.log('✅ team');

  await query(`
    -- ─────────────────────────────────────────────
    -- TIME CLOCK
    -- ─────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS time_clock (
      id                    SERIAL PRIMARY KEY,
      company_id            INTEGER NOT NULL DEFAULT 1,
      team_member_id        INTEGER REFERENCES team(id),
      team_member_name      VARCHAR(255),
      job_id                INTEGER REFERENCES jobs(id),
      job_name              VARCHAR(255),
      clock_in              TIMESTAMPTZ,
      clock_out             TIMESTAMPTZ,
      hours                 DECIMAL(5,2),
      qb_synced             BOOLEAN DEFAULT FALSE,
      qb_time_activity_id   VARCHAR(100),
      notes                 TEXT,
      created_at            TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_timeclock_company ON time_clock(company_id);
    CREATE INDEX IF NOT EXISTS idx_timeclock_member  ON time_clock(team_member_name);
  `);
  console.log('✅ time_clock');

  await query(`
    -- ─────────────────────────────────────────────
    -- TASKS  (action items across jobs)
    -- ─────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS tasks (
      id           SERIAL PRIMARY KEY,
      company_id   INTEGER NOT NULL DEFAULT 1,
      job_id       INTEGER REFERENCES jobs(id),
      title        VARCHAR(500) NOT NULL,
      description  TEXT,
      assigned_to  VARCHAR(255),
      due_date     DATE,
      priority     VARCHAR(50) DEFAULT 'medium',  -- low | medium | high | urgent
      status       VARCHAR(50) DEFAULT 'pending', -- pending | in_progress | completed
      completed_at TIMESTAMPTZ,
      created_at   TIMESTAMPTZ DEFAULT NOW(),
      updated_at   TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_tasks_company ON tasks(company_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_job     ON tasks(job_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_status  ON tasks(status);
  `);
  console.log('✅ tasks');

  await query(`
    -- ─────────────────────────────────────────────
    -- CONVERSATIONS  (email + SMS log)
    -- ─────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS conversations (
      id             SERIAL PRIMARY KEY,
      company_id     INTEGER NOT NULL DEFAULT 1,
      lead_id        INTEGER REFERENCES leads(id),
      client_id      INTEGER REFERENCES clients(id),
      contact_name   VARCHAR(255),
      contact_email  VARCHAR(255),
      contact_phone  VARCHAR(50),
      thread_id      VARCHAR(255),   -- Gmail thread ID
      direction      VARCHAR(10),    -- inbound | outbound
      channel        VARCHAR(20),    -- email | sms
      subject        VARCHAR(500),
      body           TEXT,
      ai_reply       TEXT,
      status         VARCHAR(50),    -- sent | received | draft
      sent_at        TIMESTAMPTZ DEFAULT NOW(),
      created_at     TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_conv_company   ON conversations(company_id);
    CREATE INDEX IF NOT EXISTS idx_conv_thread    ON conversations(thread_id);
    CREATE INDEX IF NOT EXISTS idx_conv_lead      ON conversations(lead_id);
    CREATE INDEX IF NOT EXISTS idx_conv_client    ON conversations(client_id);
  `);
  console.log('✅ conversations');

  await query(`
    -- ─────────────────────────────────────────────
    -- PHOTOS  (before/after/progress)
    -- ─────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS photos (
      id           SERIAL PRIMARY KEY,
      company_id   INTEGER NOT NULL DEFAULT 1,
      job_id       INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
      url          TEXT NOT NULL,
      caption      VARCHAR(500),
      photo_type   VARCHAR(50),    -- before | after | progress
      uploaded_by  VARCHAR(255),
      created_at   TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_photos_job ON photos(job_id);
  `);
  console.log('✅ photos');

  await query(`
    -- ─────────────────────────────────────────────
    -- EQUIPMENT
    -- ─────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS equipment (
      id               SERIAL PRIMARY KEY,
      company_id       INTEGER NOT NULL DEFAULT 1,
      name             VARCHAR(255) NOT NULL,
      type             VARCHAR(100),
      serial_number    VARCHAR(255),
      status           VARCHAR(50) DEFAULT 'available',
        -- available | in_use | maintenance | retired
      assigned_to      VARCHAR(255),
      assigned_job_id  INTEGER REFERENCES jobs(id),
      purchase_date    DATE,
      purchase_price   DECIMAL(10,2),
      notes            TEXT,
      created_at       TIMESTAMPTZ DEFAULT NOW(),
      updated_at       TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_equipment_company ON equipment(company_id);
  `);
  console.log('✅ equipment');

  await query(`
    -- ─────────────────────────────────────────────
    -- RECURRING JOBS
    -- ─────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS recurring_jobs (
      id               SERIAL PRIMARY KEY,
      company_id       INTEGER NOT NULL DEFAULT 1,
      client_id        INTEGER REFERENCES clients(id),
      title            VARCHAR(255),
      service          VARCHAR(255),
      frequency        VARCHAR(50),  -- weekly | monthly | quarterly | annually
      next_run         DATE,
      last_run         DATE,
      status           VARCHAR(50) DEFAULT 'active',
      template_notes   TEXT,
      estimated_value  DECIMAL(10,2),
      created_at       TIMESTAMPTZ DEFAULT NOW(),
      updated_at       TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_recurring_company ON recurring_jobs(company_id);
  `);
  console.log('✅ recurring_jobs');

  await query(`
    -- ─────────────────────────────────────────────
    -- CHANGE ORDERS
    -- ─────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS change_orders (
      id               SERIAL PRIMARY KEY,
      company_id       INTEGER NOT NULL DEFAULT 1,
      job_id           INTEGER REFERENCES jobs(id),
      title            VARCHAR(255),
      description      TEXT,
      amount           DECIMAL(10,2),
      status           VARCHAR(50) DEFAULT 'pending',
        -- pending | approved | declined
      token            VARCHAR(255) UNIQUE,
      client_response  TEXT,
      responded_at     TIMESTAMPTZ,
      created_at       TIMESTAMPTZ DEFAULT NOW(),
      updated_at       TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_change_orders_job ON change_orders(job_id);
  `);
  console.log('✅ change_orders');

  await query(`
    -- ─────────────────────────────────────────────
    -- MARKETING CAMPAIGNS
    -- ─────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS marketing_campaigns (
      id              SERIAL PRIMARY KEY,
      company_id      INTEGER NOT NULL DEFAULT 1,
      name            VARCHAR(255),
      type            VARCHAR(100),  -- re_engagement | referral | seasonal | monthly_report
      status          VARCHAR(50) DEFAULT 'draft',
      target_segment  VARCHAR(255),
      message_body    TEXT,
      sent_count      INTEGER DEFAULT 0,
      open_count      INTEGER DEFAULT 0,
      reply_count     INTEGER DEFAULT 0,
      launched_at     TIMESTAMPTZ,
      created_at      TIMESTAMPTZ DEFAULT NOW(),
      updated_at      TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('✅ marketing_campaigns');

  await query(`
    -- ─────────────────────────────────────────────
    -- GOALS  (revenue, lead, job targets)
    -- ─────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS goals (
      id            SERIAL PRIMARY KEY,
      company_id    INTEGER NOT NULL DEFAULT 1,
      metric        VARCHAR(100),  -- revenue | leads | jobs | reviews | close_rate
      target        DECIMAL(12,2),
      current_value DECIMAL(12,2) DEFAULT 0,
      period        VARCHAR(50),   -- monthly | quarterly | annual
      period_start  DATE,
      period_end    DATE,
      created_at    TIMESTAMPTZ DEFAULT NOW(),
      updated_at    TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_goals_company ON goals(company_id);
  `);
  console.log('✅ goals');

  await query(`
    -- ─────────────────────────────────────────────
    -- ALERTS  (system notifications)
    -- ─────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS alerts (
      id          SERIAL PRIMARY KEY,
      company_id  INTEGER NOT NULL DEFAULT 1,
      type        VARCHAR(100),
      title       VARCHAR(500),
      message     TEXT,
      severity    VARCHAR(50) DEFAULT 'info',  -- info | warning | critical
      read        BOOLEAN DEFAULT FALSE,
      job_id      INTEGER REFERENCES jobs(id),
      lead_id     INTEGER REFERENCES leads(id),
      created_at  TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_alerts_company ON alerts(company_id);
    CREATE INDEX IF NOT EXISTS idx_alerts_read    ON alerts(read);
  `);
  console.log('✅ alerts');

  await query(`
    -- ─────────────────────────────────────────────
    -- ACTIVITY LOG  (audit trail for dashboard feed)
    -- ─────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS activity_log (
      id          SERIAL PRIMARY KEY,
      company_id  INTEGER NOT NULL DEFAULT 1,
      agent       VARCHAR(100),
      action      VARCHAR(255),
      detail      TEXT,
      entity_type VARCHAR(50),   -- lead | job | client | invoice
      entity_id   INTEGER,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_activity_company ON activity_log(company_id);
    CREATE INDEX IF NOT EXISTS idx_activity_time    ON activity_log(created_at DESC);
  `);
  console.log('✅ activity_log');

  // ── Safe ALTER TABLEs for agent compatibility ────────────────────────────
  const safeAlter = async (sql) => {
    try { await query(sql); } catch (e) { if (!e.message.includes('already exists')) console.warn('  ⚠ ', e.message); }
  };
  await safeAlter(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS email_thread_id VARCHAR(255)`);
  await safeAlter(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS assigned_to VARCHAR(255)`);
  console.log('✅ leads extra columns');

  // ── Team: hourly rate + trade specialty ──
  await safeAlter(`ALTER TABLE team ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(8,2)`);
  await safeAlter(`ALTER TABLE team ADD COLUMN IF NOT EXISTS trade VARCHAR(100)`);
  await safeAlter(`ALTER TABLE team ADD COLUMN IF NOT EXISTS employee_type VARCHAR(50) DEFAULT 'w2'`);
  console.log('✅ team extra columns (hourly_rate, trade, employee_type)');

  // ── Jobs: site visit notes + measurements ──
  await safeAlter(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS site_visit_notes TEXT`);
  await safeAlter(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS site_visit_measurements TEXT`);
  await safeAlter(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS site_visit_photos TEXT`);
  await safeAlter(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS site_visit_date DATE`);
  await safeAlter(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS quality_tier VARCHAR(50)`);
  await safeAlter(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS square_footage INTEGER`);
  console.log('✅ jobs extra columns (site visit, quality_tier, square_footage)');

  // ── Settings: profit margin + labor markup ──
  await safeAlter(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS target_margin DECIMAL(5,2) DEFAULT 25`);
  await safeAlter(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS contingency_pct DECIMAL(5,2) DEFAULT 10`);
  await safeAlter(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS default_labor_rate DECIMAL(8,2) DEFAULT 45`);
  console.log('✅ settings extra columns (target_margin, contingency_pct, default_labor_rate)');

  console.log('\n🎉 Migration complete — all tables created successfully.');
  await pool.end();
}

migrate().catch(err => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});
