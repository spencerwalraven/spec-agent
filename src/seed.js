/**
 * SPEC Systems — Demo Seed Data
 * Populates the database with realistic demo data for client presentations.
 * Usage: node src/seed.js
 * WARNING: Clears existing data for company_id = 1
 */
require('dotenv').config();
const { pool, query } = require('./db');

async function seed() {
  console.log('🌱 Seeding SPEC Systems demo data — Landcare Unlimited...\n');

  // ── Clean existing data (reverse FK order) ──────────────────────────────
  await query(`DELETE FROM job_materials WHERE company_id = 1`).catch(() => {});
  await query(`DELETE FROM time_clock    WHERE company_id = 1`);
  await query(`DELETE FROM tasks         WHERE company_id = 1`);
  await query(`DELETE FROM activity_log  WHERE company_id = 1`);
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
      calendly_link, google_review_link, email_signature, email_tone,
      target_margin, contingency_pct, default_labor_rate)
    VALUES (1, 'Landcare Unlimited', '(614) 555-0210', 'info@landcareunlimited.com',
      '4280 Riverside Dr, Columbus, OH 43221', 'Coach Harris',
      'https://calendly.com/landcare-unlimited/estimate',
      'https://g.page/r/landcareunlimited/review',
      'Coach Harris | Landcare Unlimited | (614) 555-0210 | landcareunlimited.com',
      'friendly and professional',
      28, 10, 42)
  `);
  console.log('✅ Settings');

  // ── Team ────────────────────────────────────────────────────────────────
  const teamRows = await query(`
    INSERT INTO team (company_id, name, role, email, phone, status, trade, hourly_rate, employee_type)
    VALUES
      (1, 'Coach Harris',    'Owner / Estimator', 'coach@landcareunlimited.com',  '(614) 555-0210', 'active', 'General',      65.00, 'w2'),
      (1, 'Marcus Reed',     'Crew Lead',         'marcus@landcareunlimited.com', '(614) 555-0347', 'active', 'Hardscape',    38.00, 'w2'),
      (1, 'Kevin Pruitt',    'Crew Lead',         'kevin@landcareunlimited.com',  '(614) 555-0518', 'active', 'Softscape',    36.00, 'w2'),
      (1, 'Danny Velasco',   'Crew Member',       'danny@landcareunlimited.com',  '(614) 555-0629', 'active', 'General',      26.00, 'w2'),
      (1, 'A1 Irrigation',   'Irrigation Sub',    'dispatch@a1irrigation.com',    '(614) 555-0780', 'active', 'Irrigation',   NULL,  'sub'),
      (1, 'Elite Electric',  'Electrical Sub',    'jobs@eliteelectric.com',       '(614) 555-0891', 'active', 'Electrical',   NULL,  'sub')
    RETURNING id, name
  `);
  const [coach, marcus, kevin, danny, a1irrig, eliteElec] = teamRows.rows;
  console.log('✅ Team (6 — 4 crew + 2 subs)');

  // ── Leads ───────────────────────────────────────────────────────────────
  await query(`
    INSERT INTO leads (company_id, name, email, phone, service, message, address, source,
      score, score_label, status, notes, ai_summary, outreach_sent, created_at)
    VALUES
      (1, 'Jennifer Caldwell', 'jcaldwell@gmail.com', '(614) 555-1184',
       'Full Landscape Design', 'We just built a new home and the yard is completely bare — need everything: patio, plants, irrigation, sod. Budget around $35k.',
       '2190 Windfield Dr, Dublin, OH 43017', 'Google', 95, 'Hot', 'new',
       'Brand new construction. Full scope. Very motivated.',
       'Dream client — new build, blank canvas, strong budget, ready to move.',
       true, NOW() - INTERVAL '6 hours'),

      (1, 'Tom Brennan', 'tbrennan@yahoo.com', '(614) 555-2051',
       'Patio & Fire Pit', 'Want a paver patio with a built-in fire pit. About 500 sq ft. Hoping to get it done before summer.',
       '891 Clearwater Ln, Westerville, OH 43081', 'Referral', 82, 'Hot', 'contacted',
       'Referred by the Hendersons (past client). Called him back same day.',
       'Strong referral lead. Clear scope, realistic budget, urgent timeline.',
       true, NOW() - INTERVAL '2 days'),

      (1, 'Maria Gonzalez', 'maria.g@outlook.com', '(614) 555-3392',
       'Retaining Wall', 'We have erosion on the hillside in our backyard. Need a retaining wall — probably 60 feet long.',
       '4405 Hilltop Rd, Gahanna, OH 43230', 'Facebook Ad', 68, 'Warm', 'contacted',
       'Sent estimate request form. Budget unclear.',
       'Functional need (erosion). Motivated but may be price-sensitive.',
       true, NOW() - INTERVAL '4 days'),

      (1, 'Steve Kim', 'skim@protonmail.com', '(614) 555-4410',
       'Lawn Renovation', 'Our lawn is mostly weeds at this point. Want to start fresh — kill it all and re-sod.',
       '330 Brookside Ave, Worthington, OH 43085', 'Google', 55, 'Warm', 'new',
       NULL,
       'Straightforward lawn renovation. Moderate budget likely.',
       false, NOW() - INTERVAL '1 day'),

      (1, 'Rachel Dunn', 'rdunn@hotmail.com', '(614) 555-5528',
       'Outdoor Kitchen', 'Looking at an outdoor kitchen with a pergola. Not sure what it costs.',
       '7722 Stone Creek Ct, Powell, OH 43065', 'Instagram', 72, 'Warm', 'contacted',
       'Very early stage — still researching. Sent pricing guide.',
       'Aspirational project. Needs education on costs. Could be high-value.',
       true, NOW() - INTERVAL '5 days'),

      (1, 'David Park', 'dpark@aol.com', '(614) 555-6602',
       'Spring Cleanup', 'Just need spring cleanup, mulch, and some pruning.',
       '112 Elm St, Upper Arlington, OH 43221', 'Repeat', 40, 'Cold', 'lost',
       'Went with a cheaper company.',
       NULL, true, NOW() - INTERVAL '20 days')
    RETURNING id, name
  `);
  console.log('✅ Leads (6)');

  // ── Clients ─────────────────────────────────────────────────────────────
  const clientRows = await query(`
    INSERT INTO clients (company_id, name, email, phone, address, source,
      total_revenue, job_count, communication_style, decision_factors, key_concerns, preferred_contact)
    VALUES
      (1, 'Bill & Linda Henderson', 'bhenderson@gmail.com', '(614) 555-7701',
       '1955 Stonebridge Rd, Dublin, OH 43017', 'Referral', 24800, 2,
       'Prefers phone calls. Both involved in decisions.',
       'Quality materials and professional finish.',
       'Want it done before their daughter''s outdoor wedding in August.',
       'phone'),

      (1, 'Angela Foster', 'angela.foster@gmail.com', '(614) 555-8812',
       '6340 Ravine Blvd, Westerville, OH 43081', 'Google', 12200, 1,
       'Email communicator. Likes to see design mockups.',
       'Curb appeal and property value.',
       'Keeping mature trees healthy during construction.',
       'email'),

      (1, 'Jason Wright', 'jwright@wrightfamily.com', '(614) 555-9923',
       '503 Maple Ridge Dr, Gahanna, OH 43230', 'HomeAdvisor', 8400, 1,
       'Text only. Very responsive but brief.',
       'Speed and reliability.',
       'Drainage issues in backyard need to be solved.',
       'text')
    RETURNING id, name
  `);
  const [hendersons, angela, jason] = clientRows.rows;
  console.log('✅ Clients (3)');

  // ── Jobs ────────────────────────────────────────────────────────────────
  const jobRows = await query(`
    INSERT INTO jobs (company_id, client_id, job_ref, title, service, description, address,
      status, estimated_value, actual_value, material_cost, labor_cost,
      deposit_amount, deposit_paid, proposal_status, contract_status,
      start_date, end_date, notes, created_at)
    VALUES
      (1, ${hendersons.id}, 'JOB-001', 'Full Backyard Landscape', 'Full Landscape Design',
       'Complete backyard transformation — 800 sq ft paver patio with fire pit, irrigation system, privacy hedge, perennial beds, and sod lawn.',
       '1955 Stonebridge Rd, Dublin, OH 43017',
       'active', 24800, NULL, 9200, 8600, 7440, true,
       'Signed', 'Signed',
       NOW() - INTERVAL '10 days', NOW() + INTERVAL '20 days',
       'Wedding deadline Aug 15 — must be complete. Client extremely happy so far.', NOW() - INTERVAL '18 days'),

      (1, ${angela.id}, 'JOB-002', 'Front Yard Curb Appeal', 'Landscape Design',
       'New front walkway with natural stone, foundation plantings, landscape lighting, and mulch beds.',
       '6340 Ravine Blvd, Westerville, OH 43081',
       'completed', 12200, 12200, 4100, 5200, 3660, true,
       'Signed', 'Signed',
       NOW() - INTERVAL '40 days', NOW() - INTERVAL '10 days',
       'Completed on schedule. Client posted before/after on Facebook — great marketing.', NOW() - INTERVAL '48 days'),

      (1, ${jason.id}, 'JOB-003', 'Backyard Drainage & Retaining Wall', 'Retaining Wall',
       '80 linear ft retaining wall with French drain system to solve chronic backyard flooding.',
       '503 Maple Ridge Dr, Gahanna, OH 43230',
       'proposal', 8400, NULL, NULL, NULL, 2520, false,
       'Sent', '',
       NULL, NULL,
       'Proposal sent 3 days ago. Jason said he needs to discuss with wife.', NOW() - INTERVAL '7 days'),

      (1, ${hendersons.id}, 'JOB-004', 'Outdoor Kitchen & Pergola', 'Outdoor Living',
       'Outdoor kitchen with built-in grill, mini fridge, and 14x12 cedar pergola. Adjacent to JOB-001 patio.',
       '1955 Stonebridge Rd, Dublin, OH 43017',
       'pending', 18500, NULL, NULL, NULL, NULL, false,
       '', '',
       NULL, NULL,
       'Henderson wants to add this after the main landscape is done. Phase 2.', NOW() - INTERVAL '5 days')
    RETURNING id, job_ref, title
  `);
  const [landscapeJob, curbJob, wallJob, outdoorJob] = jobRows.rows;
  console.log('✅ Jobs (4)');

  // ── Job Phases (Full Backyard Landscape — JOB-001) ─────────────────────
  await query(`
    INSERT INTO job_phases (job_id, phase_number, name, description, assigned_to,
      status, estimated_cost, actual_cost, start_date, end_date, completed_at)
    VALUES
      (${landscapeJob.id}, 1, 'Site Prep & Demo', 'Remove existing landscaping, old fence section, grade for drainage.',
       'Marcus Reed', 'completed', 1800, 1650,
       NOW() - INTERVAL '10 days', NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days'),

      (${landscapeJob.id}, 2, 'Excavation & Grading', 'Excavate patio area, grade for proper drainage away from house.',
       'Marcus Reed', 'completed', 2200, 2400,
       NOW() - INTERVAL '7 days', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),

      (${landscapeJob.id}, 3, 'Irrigation Install', 'Install 6-zone irrigation system with smart controller.',
       'A1 Irrigation', 'completed', 3200, 3100,
       NOW() - INTERVAL '4 days', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),

      (${landscapeJob.id}, 4, 'Paver Patio & Fire Pit', 'Lay 800 sq ft Belgard Lafitt Rustic Slab pavers with circular fire pit.',
       'Marcus Reed', 'in_progress', 6800, NULL,
       NOW() - INTERVAL '2 days', NOW() + INTERVAL '5 days', NULL),

      (${landscapeJob.id}, 5, 'Planting — Trees & Shrubs', 'Install privacy hedge (Green Giant arborvitae), ornamental trees, foundation shrubs.',
       'Kevin Pruitt', 'pending', 4200, NULL,
       NOW() + INTERVAL '6 days', NOW() + INTERVAL '9 days', NULL),

      (${landscapeJob.id}, 6, 'Planting — Perennials & Mulch', 'Install perennial beds, ground cover, and 8 yards of hardwood mulch.',
       'Kevin Pruitt', 'pending', 2800, NULL,
       NOW() + INTERVAL '10 days', NOW() + INTERVAL '13 days', NULL),

      (${landscapeJob.id}, 7, 'Sod & Landscape Lighting', 'Lay 2,000 sq ft sod, install low-voltage path and accent lighting.',
       'Danny Velasco', 'pending', 3200, NULL,
       NOW() + INTERVAL '14 days', NOW() + INTERVAL '18 days', NULL),

      (${landscapeJob.id}, 8, 'Cleanup & Client Walkthrough', 'Final cleanup, system testing, plant care walkthrough with client.',
       'Coach Harris', 'pending', 600, NULL,
       NOW() + INTERVAL '19 days', NOW() + INTERVAL '20 days', NULL)
  `);
  console.log('✅ Job Phases (8 for landscape)');

  // ── Invoices ─────────────────────────────────────────────────────────────
  await query(`
    INSERT INTO invoices (company_id, job_id, invoice_type, amount,
      status, sent_at, paid_at, due_date)
    VALUES
      (1, ${landscapeJob.id}, 'deposit', 7440.00,
       'paid', NOW() - INTERVAL '17 days', NOW() - INTERVAL '16 days', NOW() - INTERVAL '10 days'),

      (1, ${curbJob.id}, 'deposit', 3660.00,
       'paid', NOW() - INTERVAL '47 days', NOW() - INTERVAL '46 days', NOW() - INTERVAL '40 days'),

      (1, ${curbJob.id}, 'final', 8540.00,
       'paid', NOW() - INTERVAL '11 days', NOW() - INTERVAL '9 days', NOW() - INTERVAL '3 days'),

      (1, ${wallJob.id}, 'deposit', 2520.00,
       'pending', NULL, NULL, NOW() + INTERVAL '14 days')
  `);
  console.log('✅ Invoices (4)');

  // ── Tasks ────────────────────────────────────────────────────────────────
  await query(`
    INSERT INTO tasks (company_id, title, description, priority, status, due_date, assigned_to)
    VALUES
      (1, 'Call Jennifer Caldwell — hot lead',
       'Score 95 — new build, full landscape, $35k budget. Call today.',
       'urgent', 'open', NOW() + INTERVAL '2 hours', 'Coach Harris'),

      (1, 'Order arborvitae for JOB-001',
       '12 Green Giant arborvitae (6-7 ft). Check stock at Kurtz Brothers and Mill Creek.',
       'high', 'open', NOW() + INTERVAL '2 days', 'Kevin Pruitt'),

      (1, 'Follow up on JOB-003 proposal',
       'Jason said he needs to discuss retaining wall proposal with wife. Follow up Friday.',
       'high', 'open', NOW() + INTERVAL '1 day', 'Coach Harris'),

      (1, 'Schedule lighting sub for JOB-001',
       'Need Elite Electric for low-voltage landscape lighting install in 2 weeks.',
       'medium', 'open', NOW() + INTERVAL '5 days', 'Coach Harris')
  `);
  console.log('✅ Tasks (4)');

  // ── Equipment ──────────────────────────────────────────────────────────
  await query(`
    INSERT INTO equipment (company_id, name, category, make_model, status, notes)
    VALUES
      (1, 'Crew Truck #1',     'Vehicle',   '2021 Ford F-350',            'in_use',    'Assigned to Marcus crew'),
      (1, 'Crew Truck #2',     'Vehicle',   '2019 Chevy Silverado 2500', 'available',  ''),
      (1, 'Mini Excavator',    'Heavy',     'Kubota KX040',              'in_use',     'On JOB-001 — patio excavation'),
      (1, 'Skid Steer',        'Heavy',     'Bobcat S70',                'available',  ''),
      (1, 'Plate Compactor',   'Tool',      'Wacker Neuson VP1340',      'in_use',     'JOB-001 base compaction'),
      (1, 'Laser Level',       'Tool',      'Spectra HV302',            'available',  ''),
      (1, 'Sod Cutter',        'Tool',      'Ryan Jr Sod Cutter',       'available',  'Reserve for JOB-001 sod phase'),
      (1, 'Enclosed Trailer',  'Trailer',   '2020 Wells Cargo 7x14',    'in_use',     'Materials staging for JOB-001')
  `).catch(e => console.warn('Equipment insert skipped:', e.message));
  console.log('✅ Equipment (8)');

  // ── Time Clock ─────────────────────────────────────────────────────────
  await query(`
    INSERT INTO time_clock (company_id, team_member_name, job_id, job_name, clock_in, clock_out, hours)
    VALUES
      (1, 'Marcus Reed', ${landscapeJob.id}, 'Full Backyard Landscape — JOB-001',
       NOW() - INTERVAL '5 hours', NULL, NULL),

      (1, 'Danny Velasco', ${landscapeJob.id}, 'Full Backyard Landscape — JOB-001',
       NOW() - INTERVAL '5 hours', NOW() - INTERVAL '30 minutes', 4.5),

      (1, 'Kevin Pruitt', NULL, NULL,
       NOW() - INTERVAL '3 hours', NULL, NULL)
  `);
  console.log('✅ Time Clock (Marcus + Danny on JOB-001, Kevin in office)');

  console.log('\n🎉 Seed complete! Database loaded with Landcare Unlimited demo data.');
  await pool.end();
}

seed().catch(err => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
