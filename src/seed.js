/**
 * SPEC Systems — Database Seed Script
 * Populates the database with realistic test data for Summit Remodeling.
 * Usage: node src/seed.js
 */
require('dotenv').config();
const { pool, query } = require('./db');

const COMPANY_ID = 1;

async function seed() {
  console.log('🌱 Starting seed...\n');

  try {
    // ─── CLEAR EXISTING DATA ────────────────────────────────────────────────
    // Order matters — delete dependents before parents
    console.log('Clearing existing data...');
    await query(`DELETE FROM time_clock       WHERE company_id = $1`, [COMPANY_ID]);
    await query(`DELETE FROM tasks            WHERE company_id = $1`, [COMPANY_ID]);
    await query(`DELETE FROM job_phases       WHERE company_id = $1`, [COMPANY_ID]);
    await query(`DELETE FROM invoices         WHERE company_id = $1`, [COMPANY_ID]);
    await query(`DELETE FROM photos           WHERE company_id = $1`, [COMPANY_ID]);
    await query(`DELETE FROM jobs             WHERE company_id = $1`, [COMPANY_ID]);
    await query(`DELETE FROM clients          WHERE company_id = $1`, [COMPANY_ID]);
    await query(`DELETE FROM leads            WHERE company_id = $1`, [COMPANY_ID]);
    await query(`DELETE FROM team             WHERE company_id = $1`, [COMPANY_ID]);
    await query(`DELETE FROM equipment        WHERE company_id = $1`, [COMPANY_ID]);
    await query(`DELETE FROM marketing_campaigns WHERE company_id = $1`, [COMPANY_ID]);
    await query(`DELETE FROM goals            WHERE company_id = $1`, [COMPANY_ID]);
    console.log('  ✓ Cleared\n');

    // ─── SETTINGS ───────────────────────────────────────────────────────────
    await query(`
      UPDATE settings SET
        company_name       = 'Summit Remodeling',
        owner_name         = 'Jake Summit',
        phone              = '(555) 823-4400',
        email              = 'jake@summitremodeling.com',
        address            = '1420 Oak Ridge Dr, Nashville, TN 37215',
        calendly_link      = 'https://calendly.com/summitremodeling',
        google_review_link = 'https://g.page/summitremodeling',
        email_signature    = 'Jake Summit | Summit Remodeling | (555) 823-4400',
        email_tone         = 'Professional yet warm',
        updated_at         = NOW()
      WHERE company_id = $1
    `, [COMPANY_ID]);
    console.log('✓ Settings updated');

    // ─── GOALS ──────────────────────────────────────────────────────────────
    await query(`
      INSERT INTO goals (company_id, metric, target, period)
      VALUES
        ($1, 'revenue',     85000, 'monthly'),
        ($1, 'leads',       20,    'monthly'),
        ($1, 'close_rate',  35,    'monthly')
    `, [COMPANY_ID]);
    console.log('✓ Goals inserted (3)');

    // ─── TEAM ───────────────────────────────────────────────────────────────
    await query(`
      INSERT INTO team (company_id, name, role, email, phone, status, performance_score, jobs_completed)
      VALUES
        ($1, 'Mike Torres',   'Project Manager',       'mike@summitremodeling.com',   '(555)823-4401', 'active', 92, 47),
        ($1, 'Carlos Rivera', 'Lead Carpenter',         'carlos@summitremodeling.com', '(555)823-4402', 'active', 88, 63),
        ($1, 'Dena Walsh',    'Sales',                  'dena@summitremodeling.com',   '(555)823-4403', 'active', 95, 31),
        ($1, 'Tom Bradley',   'Tile & Bath Specialist', NULL,                          '(555)823-4404', 'active', 85, 28)
    `, [COMPANY_ID]);
    console.log('✓ Team inserted (4)');

    // ─── LEADS ──────────────────────────────────────────────────────────────
    await query(`
      INSERT INTO leads (company_id, name, email, phone, source, service, status, score, score_label, notes, created_at)
      VALUES
        ($1, 'Rachel Green',  'rachel@gmail.com',      '(555)301-1122', 'Google',    'Kitchen Remodel',       'new',       87, 'Hot',  'Wants full kitchen gut & renovation, budget ~$45k. Very interested.',      NOW() - interval '2 days'),
        ($1, 'Brad Kim',      'brad.kim@outlook.com',  '(555)302-2233', 'Referral',  'Master Bath Renovation','Contacted', 72, 'Warm', 'Referred by Carlos. Looking to start in 2 months.',                        NOW() - interval '5 days'),
        ($1, 'Amy Chen',      'amy.chen@gmail.com',    '(555)303-3344', 'Facebook',  'Deck & Patio',          'Converted', 90, 'Hot',  NULL,                                                                       NOW() - interval '30 days'),
        ($1, 'David Park',    'dpark@yahoo.com',       '(555)304-4455', 'Google',    'Basement Finish',       'Lost',      45, 'Cold', NULL,                                                                       NOW() - interval '15 days'),
        ($1, 'Maria Santos',  'msantos@gmail.com',     '(555)305-5566', 'Nextdoor',  'Whole Home Remodel',    'new',       78, 'Warm', 'Large scope project, $150k+ budget. Scheduling site visit.',               NOW() - interval '1 day')
    `, [COMPANY_ID]);
    console.log('✓ Leads inserted (5)');

    // ─── CLIENTS ────────────────────────────────────────────────────────────
    const amyRes = await query(`
      INSERT INTO clients (company_id, name, email, phone, source, total_revenue, job_count, created_at)
      VALUES ($1, 'Amy Chen', 'amy.chen@gmail.com', '(555)303-3344', 'Facebook', 32500, 1, NOW() - interval '28 days')
      RETURNING id
    `, [COMPANY_ID]);
    const amyClientId = amyRes.rows[0].id;

    const robertRes = await query(`
      INSERT INTO clients (company_id, name, email, phone, source, total_revenue, job_count, created_at)
      VALUES ($1, 'Robert Hughes', 'rhughes@gmail.com', '(555)400-1234', 'Referral', 67800, 2, NOW() - interval '180 days')
      RETURNING id
    `, [COMPANY_ID]);
    const robertClientId = robertRes.rows[0].id;
    console.log('✓ Clients inserted (2)');

    // ─── JOBS ────────────────────────────────────────────────────────────────
    const job1Res = await query(`
      INSERT INTO jobs (
        company_id, client_id, job_ref, title, service, description,
        address, status, priority, estimated_value, deposit_paid,
        start_date, end_date, notes
      ) VALUES (
        $1, $2, 'JOB-001',
        'Kitchen Renovation — Amy Chen',
        'Kitchen Remodel',
        'Full kitchen gut and renovation including new cabinets, quartz countertops, island, tile backsplash, and appliance installation.',
        '4821 Hillside Ave, Nashville TN 37205',
        'active', 'high', 32500, true,
        NOW() - interval '10 days',
        NOW() + interval '25 days',
        'Client very happy with progress. Cabinets installed, waiting on countertop delivery.'
      )
      RETURNING id
    `, [COMPANY_ID, amyClientId]);
    const job1Id = job1Res.rows[0].id;

    const job2Res = await query(`
      INSERT INTO jobs (
        company_id, client_id, job_ref, title, service, description,
        address, status, priority, estimated_value, actual_value,
        deposit_paid, start_date, end_date
      ) VALUES (
        $1, $2, 'JOB-002',
        'Master Bath Remodel — Robert Hughes',
        'Bathroom Remodel',
        'Master bathroom full remodel with heated floors, walk-in shower, double vanity, and soaking tub.',
        '2219 Maple Grove Ct, Brentwood TN 37027',
        'completed', 'normal', 28900, 31200,
        true,
        NOW() - interval '90 days',
        NOW() - interval '30 days'
      )
      RETURNING id
    `, [COMPANY_ID, robertClientId]);
    const job2Id = job2Res.rows[0].id;

    const job3Res = await query(`
      INSERT INTO jobs (
        company_id, client_id, job_ref, title, service, description,
        address, status, priority, estimated_value, start_date
      ) VALUES (
        $1, $2, 'JOB-003',
        'Deck & Outdoor Living — Robert Hughes',
        'Outdoor Living',
        '16x24 composite deck with built-in seating, pergola, and outdoor kitchen rough-in.',
        '2219 Maple Grove Ct, Brentwood TN 37027',
        'pending', 'normal', 38900,
        NOW() + interval '14 days'
      )
      RETURNING id
    `, [COMPANY_ID, robertClientId]);
    const job3Id = job3Res.rows[0].id;
    console.log('✓ Jobs inserted (3)');

    // ─── JOB PHASES (JOB-001) ───────────────────────────────────────────────
    await query(`
      INSERT INTO job_phases (company_id, job_id, phase_number, name, status, estimated_cost, actual_cost, completed_at)
      VALUES
        ($1, $2, 1, 'Demo & Prep',          'completed', 2500, 2400, NOW() - interval '8 days'),
        ($1, $2, 2, 'Cabinet Installation', 'completed', 8500, 8700, NOW() - interval '3 days')
    `, [COMPANY_ID, job1Id]);

    await query(`
      INSERT INTO job_phases (company_id, job_id, phase_number, name, status, estimated_cost, assigned_to)
      VALUES ($1, $2, 3, 'Countertop & Backsplash', 'in_progress', 6800, 'Tom Bradley')
    `, [COMPANY_ID, job1Id]);

    await query(`
      INSERT INTO job_phases (company_id, job_id, phase_number, name, status, estimated_cost)
      VALUES ($1, $2, 4, 'Plumbing & Fixtures', 'pending', 3200)
    `, [COMPANY_ID, job1Id]);
    console.log('✓ Job phases inserted (4)');

    // ─── INVOICES ────────────────────────────────────────────────────────────
    await query(`
      INSERT INTO invoices (company_id, job_id, invoice_type, amount, status, paid_at, sent_at)
      VALUES
        ($1, $2, 'deposit', 9750,  'paid', NOW() - interval '12 days', NOW() - interval '14 days'),
        ($1, $2, 'final',   22750, 'sent', NULL,                        NOW() - interval '1 day')
    `, [COMPANY_ID, job1Id]);
    console.log('✓ Invoices inserted (2)');

    // ─── TASKS ───────────────────────────────────────────────────────────────
    await query(`
      INSERT INTO tasks (company_id, title, assigned_to, priority, status, due_date)
      VALUES
        ($1, 'Follow up with Rachel Green on kitchen estimate', 'Dena Walsh',  'high',   'pending', NOW() + interval '1 day'),
        ($1, 'Order countertop materials for Amy Chen job',    'Mike Torres', 'urgent', 'pending', NOW())
    `, [COMPANY_ID]);
    console.log('✓ Tasks inserted (2)');

    // ─── TIME CLOCK ──────────────────────────────────────────────────────────
    await query(`
      INSERT INTO time_clock (company_id, team_member_name, job_id, job_name, clock_in, clock_out, hours)
      VALUES (
        $1,
        'Carlos Rivera',
        $2,
        'Kitchen Renovation — Amy Chen',
        NOW() - interval '7 hours',
        NOW() - interval '30 minutes',
        6.5
      )
    `, [COMPANY_ID, job1Id]);
    console.log('✓ Time clock inserted (1)');

    // ─── EQUIPMENT ───────────────────────────────────────────────────────────
    await query(`
      INSERT INTO equipment (company_id, name, type, status, assigned_to)
      VALUES ($1, 'Tile Saw (Makita)', 'Power Tool', 'in_use', 'Tom Bradley')
    `, [COMPANY_ID]);
    console.log('✓ Equipment inserted (1)');

    // ─── MARKETING CAMPAIGNS ─────────────────────────────────────────────────
    await query(`
      INSERT INTO marketing_campaigns (company_id, name, type, target_segment, status, message_body, sent_count, reply_count)
      VALUES (
        $1,
        'Spring Kitchen Promo',
        'Email',
        'Past Clients',
        'active',
        'Spring kitchen renovation discount campaign targeting past clients for referrals',
        47,
        3
      )
    `, [COMPANY_ID]);
    console.log('✓ Marketing campaigns inserted (1)');

    // ─── SUMMARY ─────────────────────────────────────────────────────────────
    console.log('\n✅ Seed complete! Summary:');
    console.log('   Settings:           updated');
    console.log('   Goals:              3');
    console.log('   Team members:       4');
    console.log('   Leads:              5');
    console.log('   Clients:            2  (Amy Chen id=' + amyClientId + ', Robert Hughes id=' + robertClientId + ')');
    console.log('   Jobs:               3  (JOB-001 id=' + job1Id + ', JOB-002 id=' + job2Id + ', JOB-003 id=' + job3Id + ')');
    console.log('   Job phases:         4  (for JOB-001)');
    console.log('   Invoices:           2  (for JOB-001)');
    console.log('   Tasks:              2');
    console.log('   Time clock entries: 1');
    console.log('   Equipment:          1');
    console.log('   Marketing campaigns:1');

  } catch (err) {
    console.error('\n❌ Seed failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
