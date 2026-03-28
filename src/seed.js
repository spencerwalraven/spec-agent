/**
 * SPEC Systems — Demo Seed Data
 * Populates the database with realistic demo data for client presentations.
 * Usage: node src/seed.js
 * WARNING: Clears existing data for company_id = 1
 */
require('dotenv').config();
const { pool, query } = require('./db');

async function seed() {
  console.log('🌱 Seeding SPEC Systems demo data...\n');

  // ── Clean existing data (reverse FK order) ──────────────────────────────
  await query(`DELETE FROM time_clock    WHERE company_id = 1`);
  await query(`DELETE FROM tasks         WHERE company_id = 1`);
  await query(`DELETE FROM activity_log  WHERE company_id = 1`);
  await query(`DELETE FROM alerts        WHERE company_id = 1`);
  await query(`DELETE FROM invoices      WHERE company_id = 1`);
  await query(`DELETE FROM job_phases    WHERE job_id IN (SELECT id FROM jobs WHERE company_id = 1)`);
  await query(`DELETE FROM jobs          WHERE company_id = 1`);
  await query(`DELETE FROM clients       WHERE company_id = 1`);
  await query(`DELETE FROM leads         WHERE company_id = 1`);
  await query(`DELETE FROM team          WHERE company_id = 1`);
  await query(`DELETE FROM settings      WHERE company_id = 1`);
  console.log('🧹 Cleared existing demo data');

  // ── Settings ────────────────────────────────────────────────────────────
  await query(`
    INSERT INTO settings (company_id, company_name, phone, email, address, owner_name,
      calendly_link, google_review_link, email_signature, email_tone)
    VALUES (1, 'Summit Remodeling', '(303) 555-0182', 'hello@summitremodeling.com',
      '1420 Blake St, Denver, CO 80202', 'Spencer Walraven',
      'https://calendly.com/summit-remodeling/estimate',
      'https://g.page/r/summitremodeling/review',
      'Spencer Walraven | Summit Remodeling | (303) 555-0182 | summitremodeling.com',
      'friendly and professional')
  `);
  console.log('✅ Settings');

  // ── Team ────────────────────────────────────────────────────────────────
  const teamRows = await query(`
    INSERT INTO team (company_id, name, role, email, phone, status)
    VALUES
      (1, 'Spencer Walraven', 'Owner',         'spencer@summitremodeling.com', '(303) 555-0182', 'active'),
      (1, 'Jake Morrison',    'Lead Carpenter', 'jake@summitremodeling.com',   '(303) 555-0147', 'active'),
      (1, 'Dena Park',        'Estimator',      'dena@summitremodeling.com',   '(303) 555-0193', 'active'),
      (1, 'Tyler Reyes',      'Apprentice',     'tyler@summitremodeling.com',  '(303) 555-0261', 'active')
    RETURNING id, name
  `);
  const [spencer, jake, dena, tyler] = teamRows.rows;
  console.log('✅ Team (4 members)');

  // ── Leads ───────────────────────────────────────────────────────────────
  await query(`
    INSERT INTO leads (company_id, name, email, phone, service, message, address, source,
      score, score_label, status, notes, ai_summary, outreach_sent, created_at)
    VALUES
      (1, 'Amanda Torres', 'amanda.torres@gmail.com', '(720) 555-0384',
       'Kitchen Remodel', 'Looking to completely gut and redo our 1990s kitchen. Budget is flexible — we want it done right.',
       '847 Maple Ave, Denver, CO 80220', 'Google', 92, 'Hot', 'new',
       'Very motivated buyer. Mentioned neighbor referral as well.',
       'High-intent lead with flexible budget and urgent timeline. Likely to convert quickly.',
       true, NOW() - INTERVAL '1 day'),

      (1, 'Brian Kowalski', 'bkowalski@outlook.com', '(303) 555-0512',
       'Basement Finish', 'Want to finish our unfinished basement — roughly 800 sq ft. Looking for quotes.',
       '2214 Elm St, Lakewood, CO 80215', 'Facebook Ad', 71, 'Warm', 'contacted',
       'Requested estimate. Comparing 3 contractors.',
       'Comparison shopper but engaged. Price-sensitive. Emphasize quality and warranty.',
       true, NOW() - INTERVAL '3 days'),

      (1, 'Priya Sharma', 'priya.sharma@yahoo.com', '(720) 555-0791',
       'Master Bath Renovation', 'Complete master bath overhaul — tile, vanity, shower, the works.',
       '3309 Pearl St, Boulder, CO 80301', 'Referral', 85, 'Hot', 'qualified',
       'Estimate scheduled for next Tuesday.',
       'Referred by Mike Johnson. High-budget expectations. Decision maker is engaged.',
       true, NOW() - INTERVAL '5 days'),

      (1, 'Derek Walsh', 'dwalsh@comcast.net', '(303) 555-0628',
       'Deck Addition', 'Wanted a deck quote but went with another contractor.',
       '910 Grant Ave, Englewood, CO 80113', 'Yelp', 45, 'Cold', 'lost',
       'Lost to competitor on price.',
       NULL, true, NOW() - INTERVAL '14 days')
    RETURNING id, name
  `);
  console.log('✅ Leads (4)');

  // ── Clients ─────────────────────────────────────────────────────────────
  const clientRows = await query(`
    INSERT INTO clients (company_id, name, email, phone, address, source,
      total_revenue, job_count, communication_style, decision_factors, key_concerns, preferred_contact)
    VALUES
      (1, 'Mike Johnson',    'mike.johnson@gmail.com',   '(303) 555-0129',
       '1847 Oak St, Denver, CO 80207',    'Google',   7200,  1,
       'Prefers text updates. Very detail-oriented.',
       'Quality of materials and craftsmanship.',
       'Timeline and disruption to daily life.',
       'text'),

      (1, 'Sarah Chen',      'sarah.chen@gmail.com',     '(720) 555-0345',
       '4521 Pine Blvd, Denver, CO 80209', 'Referral', 18500, 1,
       'Email communicator. Likes detailed progress photos.',
       'Design aesthetics and resale value.',
       'Color and material choices — very selective.',
       'email'),

      (1, 'Robert Martinez', 'r.martinez@hotmail.com',   '(303) 555-0867',
       '782 Cedar Ln, Aurora, CO 80012',   'Repeat',   0,     1,
       'Prefers phone calls. No-nonsense, straightforward.',
       'Value and reliability.',
       'Getting everything done in one visit.',
       'phone')
    RETURNING id, name
  `);
  const [mike, sarah, robert] = clientRows.rows;
  console.log('✅ Clients (3)');

  // ── Jobs ────────────────────────────────────────────────────────────────
  const jobRows = await query(`
    INSERT INTO jobs (company_id, client_id, job_ref, title, service, description, address,
      status, estimated_value, actual_value, material_cost, labor_cost,
      deposit_amount, deposit_paid, proposal_status, contract_status,
      start_date, end_date, notes, created_at)
    VALUES
      (1, ${sarah.id}, 'JOB-001', 'Kitchen Remodel', 'Kitchen Remodel',
       'Full kitchen gut and remodel — new cabinets, quartz countertops, tile backsplash, LVP flooring, appliance package.',
       '4521 Pine Blvd, Denver, CO 80209',
       'active', 18500, NULL, 6800, 7200, 5550, true,
       'Signed', 'Signed',
       NOW() - INTERVAL '12 days', NOW() + INTERVAL '18 days',
       'Client is very particular about the cabinet color — confirmed with sample.', NOW() - INTERVAL '20 days'),

      (1, ${mike.id}, 'JOB-002', 'Master Bath Renovation', 'Bathroom Remodel',
       'Master bath full renovation — freestanding tub, walk-in shower, double vanity, heated tile floor.',
       '1847 Oak St, Denver, CO 80207',
       'completed', 7200, 7200, 2400, 3100, 2160, true,
       'Signed', 'Signed',
       NOW() - INTERVAL '45 days', NOW() - INTERVAL '8 days',
       'Completed on time. Client left 5-star Google review.', NOW() - INTERVAL '52 days'),

      (1, ${robert.id}, 'JOB-003', 'Home Addition — Master Suite', 'Addition',
       '600 sq ft master suite addition — bedroom, walk-in closet, en-suite bath.',
       '782 Cedar Ln, Aurora, CO 80012',
       'proposal', 42000, NULL, NULL, NULL, 12600, false,
       'Sent', '',
       NULL, NULL,
       'Proposal sent 2 days ago. Follow up Friday if no response.', NOW() - INTERVAL '6 days'),

      (1, ${robert.id}, 'JOB-004', 'Composite Deck Build', 'Deck',
       '400 sq ft composite deck with railing, built-in seating, and pergola.',
       '782 Cedar Ln, Aurora, CO 80012',
       'pending', 9800, NULL, NULL, NULL, NULL, false,
       '', '',
       NULL, NULL,
       'Bundled with JOB-003 addition — can schedule back-to-back.', NOW() - INTERVAL '6 days')
    RETURNING id, job_ref, title
  `);
  const [kitchenJob, bathJob, additionJob, deckJob] = jobRows.rows;
  console.log('✅ Jobs (4)');

  // ── Job Phases (Kitchen Remodel) ─────────────────────────────────────────
  await query(`
    INSERT INTO job_phases (job_id, phase_number, name, description, assigned_to,
      status, estimated_cost, actual_cost, start_date, end_date, completed_at)
    VALUES
      (${kitchenJob.id}, 1, 'Demo & Haul-Out', 'Remove cabinets, counters, flooring, and appliances.',
       'Jake Morrison', 'completed', 800, 750,
       NOW() - INTERVAL '12 days', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days'),

      (${kitchenJob.id}, 2, 'Rough-In & Plumbing', 'Relocate sink drain, add dishwasher line, run new electrical circuits.',
       'Jake Morrison', 'completed', 2200, 2350,
       NOW() - INTERVAL '9 days', NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days'),

      (${kitchenJob.id}, 3, 'Cabinet & Countertop Install', 'Install Shaker cabinets, quartz countertops, and undermount sink.',
       'Jake Morrison', 'in_progress', 5500, NULL,
       NOW() - INTERVAL '3 days', NOW() + INTERVAL '4 days', NULL),

      (${kitchenJob.id}, 4, 'Tile & Flooring', 'Lay subway tile backsplash and LVP flooring throughout.',
       'Tyler Reyes', 'pending', 2800, NULL,
       NOW() + INTERVAL '5 days', NOW() + INTERVAL '10 days', NULL),

      (${kitchenJob.id}, 5, 'Finish & Punch List', 'Install hardware, appliances, touch-up paint, final walkthrough.',
       'Jake Morrison', 'pending', 1200, NULL,
       NOW() + INTERVAL '11 days', NOW() + INTERVAL '18 days', NULL)
  `);
  console.log('✅ Job Phases (5 for kitchen)');

  // ── Invoices ─────────────────────────────────────────────────────────────
  await query(`
    INSERT INTO invoices (company_id, job_id, invoice_type, amount,
      status, sent_at, paid_at, due_date)
    VALUES
      (1, ${kitchenJob.id}, 'deposit', 5550.00,
       'paid', NOW() - INTERVAL '19 days', NOW() - INTERVAL '18 days', NOW() - INTERVAL '12 days'),

      (1, ${bathJob.id}, 'deposit', 2160.00,
       'paid', NOW() - INTERVAL '51 days', NOW() - INTERVAL '50 days', NOW() - INTERVAL '45 days'),

      (1, ${bathJob.id}, 'final', 5040.00,
       'paid', NOW() - INTERVAL '9 days', NOW() - INTERVAL '7 days', NOW() - INTERVAL '1 day'),

      (1, ${additionJob.id}, 'deposit', 12600.00,
       'pending', NULL, NULL, NOW() + INTERVAL '14 days')
  `);
  console.log('✅ Invoices (4)');

  // ── Tasks ────────────────────────────────────────────────────────────────
  await query(`
    INSERT INTO tasks (company_id, title, description, priority, status, due_date, assigned_to)
    VALUES
      (1, 'Follow up with Amanda Torres',
       'Hot lead from Google — score 92. Called once, no answer. Try again today.',
       'urgent', 'open', NOW() + INTERVAL '1 hour', 'Dena Park'),

      (1, 'Order kitchen cabinets — JOB-001',
       'Confirm final cabinet color with Sarah before placing order with supplier.',
       'high', 'open', NOW() + INTERVAL '2 days', 'Spencer Walraven'),

      (1, 'Schedule rough-in inspection — JOB-001',
       'Plumbing and electrical rough-in complete. Call city to schedule inspection.',
       'high', 'open', NOW() + INTERVAL '1 day', 'Jake Morrison')
  `);
  console.log('✅ Tasks (3)');

  // ── Time Clock ───────────────────────────────────────────────────────────
  await query(`
    INSERT INTO time_clock (company_id, team_member_name, job_id, job_name, clock_in, clock_out, hours)
    VALUES
      (1, 'Jake Morrison', ${kitchenJob.id}, 'Kitchen Remodel — JOB-001',
       NOW() - INTERVAL '4 hours 30 minutes', NULL, NULL),

      (1, 'Tyler Reyes', ${kitchenJob.id}, 'Kitchen Remodel — JOB-001',
       NOW() - INTERVAL '4 hours 30 minutes', NOW() - INTERVAL '30 minutes', 4.0)
  `);
  console.log('✅ Time Clock (Jake in, Tyler out)');

  console.log('\n🎉 Seed complete! Database is loaded with Summit Remodeling demo data.');
  await pool.end();
}

seed().catch(err => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
