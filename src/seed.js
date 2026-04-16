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
  await query(`DELETE FROM conversations      WHERE company_id = 1`).catch(() => {});
  await query(`DELETE FROM pending_approvals  WHERE company_id = 1`).catch(() => {});
  await query(`DELETE FROM marketing_campaigns WHERE company_id = 1`).catch(() => {});
  await query(`DELETE FROM recurring_jobs     WHERE company_id = 1`).catch(() => {});
  await query(`DELETE FROM job_materials      WHERE company_id = 1`).catch(() => {});
  await query(`DELETE FROM time_clock         WHERE company_id = 1`);
  await query(`DELETE FROM tasks              WHERE company_id = 1`);
  await query(`DELETE FROM activity_log       WHERE company_id = 1`);
  await query(`DELETE FROM invoices           WHERE company_id = 1`);
  await query(`DELETE FROM job_phases         WHERE job_id IN (SELECT id FROM jobs WHERE company_id = 1)`);
  await query(`DELETE FROM jobs               WHERE company_id = 1`);
  await query(`DELETE FROM clients            WHERE company_id = 1`);
  await query(`DELETE FROM leads              WHERE company_id = 1`);
  await query(`DELETE FROM team               WHERE company_id = 1`);
  await query(`DELETE FROM settings           WHERE company_id = 1`);
  console.log('🧹 Cleared existing demo data');

  // ── Settings ────────────────────────────────────────────────────────────
  await query(`
    INSERT INTO settings (company_id, company_name, phone, email, address, owner_name,
      calendly_link, google_review_link, email_signature, email_tone,
      target_margin, contingency_pct, default_labor_rate,
      website, license_number,
      proposal_template_id, estimate_template_id, contract_template_id)
    VALUES (1, 'Landcare Unlimited', '(614) 555-0210', 'info@landcareunlimited.com',
      '4280 Riverside Dr, Columbus, OH 43221', 'Coach Harris',
      'https://calendly.com/landcare-unlimited/estimate',
      'https://g.page/r/landcareunlimited/review',
      'Coach Harris | Landcare Unlimited | (614) 555-0210 | landcareunlimited.com',
      'friendly and professional',
      28, 10, 42,
      'landcareunlimited.com', 'OH-LIC-48291',
      '1nx2fcw8W_BWXUMnAlmGS8Kqd-nvnemh_yPAEhi_TiXM',
      '1fei6alaqm2K_zIc8Q2LGoTWm7E89stRmZLPeBfxTf30',
      '1KpDGnrF1DZZewF1iDkLNFEBi_7VjFCJMGMm9I2gHLjk')
  `);
  console.log('✅ Settings (with SPEC Sheets template IDs)');

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
      start_date, end_date, notes, created_at,
      tier_budget, tier_midrange, tier_highend, tier_luxury, selected_tier,
      site_visit_notes, site_visit_date, work_areas, client_budget, lot_size,
      quality_tier, square_footage, soil_conditions, existing_conditions, client_preferences)
    VALUES
      (1, ${hendersons.id}, 'JOB-001', 'Full Backyard Landscape', 'Full Landscape Design',
       'Complete backyard transformation — 800 sq ft paver patio with fire pit, irrigation system, privacy hedge, perennial beds, and sod lawn.',
       '1955 Stonebridge Rd, Dublin, OH 43017',
       'active', 24800, NULL, 9200, 8600, 7440, true,
       'Signed', 'Signed',
       NOW() - INTERVAL '10 days', NOW() + INTERVAL '20 days',
       'Wedding deadline Aug 15 — must be complete. Client extremely happy so far.', NOW() - INTERVAL '18 days',
       '{"total": 16200, "materials": 6800, "labor": 6200, "overhead": 3200, "desc": "Standard concrete pavers, basic plantings, seed lawn, manual irrigation"}',
       '{"total": 24800, "materials": 9200, "labor": 8600, "overhead": 7000, "desc": "Premium pavers, fire pit, privacy hedge, perennial beds, smart irrigation, sod lawn"}',
       '{"total": 38500, "materials": 16000, "labor": 12500, "overhead": 10000, "desc": "Natural stone, pergola, specimen trees, landscape lighting, smart irrigation, premium sod"}',
       '{"total": 62000, "materials": 28000, "labor": 18000, "overhead": 16000, "desc": "Imported travertine, outdoor kitchen, water feature, mature trees, full smart system"}',
       'midrange',
       'Large backyard with good existing grade. Some drainage issues in north corner — will need French drain. Client wants fire pit positioned to see from kitchen window. Dogs (two Goldens) need consideration during planting phase.',
       NOW() - INTERVAL '20 days',
       'Patio: 20x40 ft main area with 10ft diameter fire pit circle. Hedge line: 60 linear ft along back fence. Perennial beds: 180 sq ft (two L-shape beds). Sod area: ~2000 sq ft.',
       '$22,000 - $30,000', '0.35 acres', 'midrange', 800, 'clay', 'Dead maple stump near fence, old concrete slab where shed used to be, overgrown yew shrubs along north fence',
       'Natural stone over concrete pavers. Prefer native plants where possible. Want landscape lighting on pergola area. Daughter wedding Aug 15 — must be complete 2 weeks prior.'),

      (1, ${angela.id}, 'JOB-002', 'Front Yard Curb Appeal', 'Landscape Design',
       'New front walkway with natural stone, foundation plantings, landscape lighting, and mulch beds.',
       '6340 Ravine Blvd, Westerville, OH 43081',
       'completed', 12200, 12200, 4100, 5200, 3660, true,
       'Signed', 'Signed',
       NOW() - INTERVAL '40 days', NOW() - INTERVAL '10 days',
       'Completed on schedule. Client posted before/after on Facebook — great marketing.', NOW() - INTERVAL '48 days',
       '{"total": 8200, "materials": 3200, "labor": 3500, "overhead": 1500, "desc": "Concrete walkway, basic foundation plants, seed bed"}',
       '{"total": 12200, "materials": 4100, "labor": 5200, "overhead": 2900, "desc": "Natural stone walkway, mixed foundation plantings, lighting"}',
       '{"total": 18500, "materials": 7200, "labor": 7800, "overhead": 3500, "desc": "Flagstone walkway, ornamental trees, premium lighting, water feature"}',
       '{"total": 28000, "materials": 12500, "labor": 10500, "overhead": 5000, "desc": "Bluestone walkway with borders, specimen trees, smart lighting, custom beds"}',
       'midrange',
       'Mature trees along driveway — client wants to preserve all of them. Narrow front walk needs widening. Existing foundation plants are overgrown and need full removal.',
       NOW() - INTERVAL '55 days',
       'Walkway: 45 linear ft x 5 ft wide. Foundation bed: 80 linear ft x 4 ft wide. Accent beds at driveway entrance: 2 x 60 sq ft.',
       '$10,000 - $15,000', '0.28 acres', 'midrange', 380, 'good', 'Overgrown boxwoods (10), weeping cherry in poor health',
       'Traditional style. Lots of curb appeal. Wants seasonal color year-round. No maintenance-heavy plants.'),

      (1, ${jason.id}, 'JOB-003', 'Backyard Drainage & Retaining Wall', 'Retaining Wall',
       '80 linear ft retaining wall with French drain system to solve chronic backyard flooding.',
       '503 Maple Ridge Dr, Gahanna, OH 43230',
       'proposal', 8400, NULL, NULL, NULL, 2520, false,
       'Sent', '',
       NULL, NULL,
       'Proposal sent 3 days ago. Jason said he needs to discuss with wife.', NOW() - INTERVAL '7 days',
       '{"total": 6200, "materials": 2800, "labor": 2400, "overhead": 1000, "desc": "Timber wall, basic French drain, straightforward installation"}',
       '{"total": 8400, "materials": 3600, "labor": 3200, "overhead": 1600, "desc": "Allan Block segmental wall with full French drain system and drainage swale"}',
       '{"total": 12500, "materials": 5800, "labor": 4500, "overhead": 2200, "desc": "Natural stone face with engineered wall base, full drainage solution with cleanouts"}',
       '{"total": 19000, "materials": 9500, "labor": 6500, "overhead": 3000, "desc": "Dry-stack natural stone, engineered wall system, landscape lighting, planted terrace"}',
       'midrange',
       'Slope is steeper than it first appeared — closer to 4 feet of grade change over 80 ft. Standing water visible even during site visit. Soil is heavy clay which makes drainage critical.',
       NOW() - INTERVAL '10 days',
       'Wall: 80 linear ft x 3.5 ft high (varies). Catchment area above wall: ~1500 sq ft. Drainage outflow: east property line toward storm drain.',
       '$7,000 - $12,000', '0.22 acres', 'midrange', NULL, 'clay', 'Temporary plastic sheeting covering erosion damage, dead bushes where standing water pooled',
       'Prefer natural look. Budget-sensitive. Wants it done this summer before fall rains.'),

      (1, ${hendersons.id}, 'JOB-004', 'Outdoor Kitchen & Pergola', 'Outdoor Living',
       'Outdoor kitchen with built-in grill, mini fridge, and 14x12 cedar pergola. Adjacent to JOB-001 patio.',
       '1955 Stonebridge Rd, Dublin, OH 43017',
       'pending', 18500, NULL, NULL, NULL, NULL, false,
       '', '',
       NULL, NULL,
       'Henderson wants to add this after the main landscape is done. Phase 2.', NOW() - INTERVAL '5 days',
       NULL, NULL, NULL, NULL, NULL,
       NULL, NULL, NULL, NULL, NULL, 'highend', NULL, NULL, NULL, NULL)
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
    INSERT INTO equipment (company_id, name, type, serial_number, status, notes)
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

  // ── Get lead IDs for linking conversations ──────────────────────────────
  const leadMap = {};
  (await query(`SELECT id, name FROM leads WHERE company_id = 1`)).rows.forEach(l => {
    leadMap[l.name] = l.id;
  });

  // ── Conversations (Email + SMS) ─────────────────────────────────────────
  await query(`
    INSERT INTO conversations (company_id, lead_id, client_id, contact_name, contact_email, contact_phone,
      thread_id, direction, channel, subject, body, status, sent_at, created_at)
    VALUES
      -- Jennifer Caldwell (hot lead) — AI outreach, she replied
      (1, ${leadMap['Jennifer Caldwell']}, NULL, 'Jennifer Caldwell', 'jcaldwell@gmail.com', '(614) 555-1184',
       'THREAD-JC-001', 'outbound', 'email',
       'Your new home deserves a stunning landscape, Jennifer',
       'Hey Jennifer — Coach here from Landcare Unlimited. Saw your form come through about the new build on Windfield Dr. Full landscape packages are our specialty. I''d love to do a free site visit this week — how''s Thursday at 10am work? I can bring design examples of similar-sized projects we''ve done nearby.',
       'sent', NOW() - INTERVAL '6 hours', NOW() - INTERVAL '6 hours'),

      (1, ${leadMap['Jennifer Caldwell']}, NULL, 'Jennifer Caldwell', 'jcaldwell@gmail.com', '(614) 555-1184',
       'THREAD-JC-001', 'inbound', 'email',
       'Re: Your new home deserves a stunning landscape, Jennifer',
       'Hi Coach — thanks for the fast reply! Thursday at 10am works. Should I have anything ready? My husband and I are home. Address is 2190 Windfield Dr, Dublin. Also — do you do financing?',
       'received', NOW() - INTERVAL '3 hours', NOW() - INTERVAL '3 hours'),

      (1, ${leadMap['Jennifer Caldwell']}, NULL, 'Jennifer Caldwell', 'jcaldwell@gmail.com', '(614) 555-1184',
       'THREAD-JC-001', 'outbound', 'email',
       'Re: Your new home deserves a stunning landscape, Jennifer',
       'Perfect — see you Thursday at 10! No prep needed. And yes, we partner with Hearth for financing — I''ll bring a quick overview. Looking forward to meeting you both.',
       'sent', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours'),

      -- Tom Brennan (referral lead) — AI confirmed the referral
      (1, ${leadMap['Tom Brennan']}, NULL, 'Tom Brennan', 'tbrennan@yahoo.com', '(614) 555-2051',
       'THREAD-TB-001', 'outbound', 'email',
       'Thanks for the referral — Patio + Fire Pit at your Westerville home',
       'Tom — great to connect! The Hendersons spoke highly of you. A 500 sq ft paver patio with built-in fire pit is one of our favorite projects. Budget range for that scope typically lands between $15k–$22k depending on paver choice and features. I can swing by Friday afternoon to look at the site and sketch some options. Work for you?',
       'sent', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),

      (1, ${leadMap['Tom Brennan']}, NULL, 'Tom Brennan', 'tbrennan@yahoo.com', '(614) 555-2051',
       'THREAD-TB-001', 'inbound', 'email',
       'Re: Thanks for the referral',
       'Friday 3pm works. Do you take Venmo for deposits?',
       'received', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),

      -- Rachel Dunn (aspirational lead)
      (1, ${leadMap['Rachel Dunn']}, NULL, 'Rachel Dunn', 'rdunn@hotmail.com', '(614) 555-5528',
       'THREAD-RD-001', 'outbound', 'email',
       'Outdoor kitchen pricing guide — no pressure',
       'Hey Rachel — thanks for reaching out about the outdoor kitchen + pergola idea. Since you mentioned you''re still in research mode, I put together a quick pricing guide so you know what to expect. Ranges run from $25k (basic grill island) to $80k+ (full kitchen w/ pergola, lighting, hardscape). No pressure — reach back out whenever you''re ready to walk the site.',
       'sent', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),

      -- Bill Henderson (active client, JOB-001) — mid-job update
      (1, NULL, ${hendersons.id}, 'Bill & Linda Henderson', 'bhenderson@gmail.com', '(614) 555-7701',
       'THREAD-HEN-001', 'outbound', 'email',
       'Weekly Update — JOB-001 Backyard Landscape',
       'Hey Bill and Linda — quick update on your project. Week 2 wrap-up: irrigation install is complete (A1 tested all 6 zones yesterday), excavation and grading done, pavers started today. We''re on schedule and under budget on materials. Photos attached. Next week: patio complete, fire pit build, hedge install starts. Let me know if you have questions!',
       'sent', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),

      (1, NULL, ${hendersons.id}, 'Bill & Linda Henderson', 'bhenderson@gmail.com', '(614) 555-7701',
       'THREAD-HEN-001', 'inbound', 'email',
       'Re: Weekly Update',
       'Coach — we are LOVING watching this come together. Marcus and his crew are fantastic. Question on the hedge — can we swap one of the arborvitae spots for a Japanese maple? Linda wants a focal point near the pergola corner.',
       'received', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),

      (1, NULL, ${hendersons.id}, 'Bill & Linda Henderson', 'bhenderson@gmail.com', '(614) 555-7701',
       'THREAD-HEN-001', 'outbound', 'email',
       'Re: Weekly Update',
       'Absolutely doable. A Japanese maple in that corner will look stunning as a focal point. It''s a slight upcharge (~$180 for a 6ft specimen vs. the arborvitae it replaces). I''ll draft a quick change order for your approval — should be in your inbox later today.',
       'sent', NOW() - INTERVAL '18 hours', NOW() - INTERVAL '18 hours'),

      -- Jason Wright (JOB-003, proposal pending)
      (1, NULL, ${jason.id}, 'Jason Wright', 'jwright@wrightfamily.com', '(614) 555-9923',
       'THREAD-JW-001', 'outbound', 'email',
       'Your Retaining Wall Proposal — Ready to Review',
       'Jason — your proposal for the retaining wall and drainage solution is attached. Three tiers inside: Budget ($6,200), Standard ($8,400), and Premium ($12,500). My recommendation is Standard — gives you the engineered drainage you need without overbuilding. Call or text if you want to walk through it together.',
       'sent', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),

      -- SMS conversations
      (1, ${leadMap['Jennifer Caldwell']}, NULL, 'Jennifer Caldwell', NULL, '+16145551184',
       NULL, 'outbound', 'sms', NULL,
       'Hey Jennifer — this is Coach from Landcare Unlimited. Got your email, reply coming shortly. Wanted you to have my cell. Text me anytime.',
       'sent', NOW() - INTERVAL '5 hours', NOW() - INTERVAL '5 hours'),

      (1, ${leadMap['Jennifer Caldwell']}, NULL, 'Jennifer Caldwell', NULL, '+16145551184',
       NULL, 'inbound', 'sms', NULL,
       'Thanks! See you Thursday.',
       'received', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours'),

      (1, NULL, ${hendersons.id}, 'Bill Henderson', NULL, '+16145557701',
       NULL, 'inbound', 'sms', NULL,
       'Quick q — is Marcus here today? Linda wants to point out where the fire pit should go',
       'received', NOW() - INTERVAL '4 hours', NOW() - INTERVAL '4 hours'),

      (1, NULL, ${hendersons.id}, 'Bill Henderson', NULL, '+16145557701',
       NULL, 'outbound', 'sms', NULL,
       'Yep Marcus is on site until 4. Have Linda come find him anytime — he''s expecting you.',
       'sent', NOW() - INTERVAL '4 hours', NOW() - INTERVAL '4 hours'),

      (1, ${leadMap['Tom Brennan']}, NULL, 'Tom Brennan', NULL, '+16145552051',
       NULL, 'outbound', 'sms', NULL,
       'Confirming Friday 3pm site visit at 891 Clearwater. See you then!',
       'sent', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day')
  `).catch(e => console.warn('Conversations insert failed:', e.message));
  console.log('✅ Conversations (10 emails + 5 SMS — shows AI in action)');

  // ── Activity Log (powers dashboard "Recent Activity") ────────────────────
  await query(`
    INSERT INTO activity_log (company_id, agent, action, detail, entity_type, entity_id, created_at)
    VALUES
      (1, 'LeadAgent',     'new_lead_outreach', 'Sent personalized email to Jennifer Caldwell (score 95)',  'lead', ${leadMap['Jennifer Caldwell']}, NOW() - INTERVAL '6 hours'),
      (1, 'ClientAgent',   'weekly_update',     'Sent Week 2 update to Bill & Linda Henderson — JOB-001',   'job',  ${landscapeJob.id}, NOW() - INTERVAL '2 days'),
      (1, 'PricingAgent',  'estimate_ready',    'Generated estimate for JOB-003 Retaining Wall — 3 tiers',  'job',  ${wallJob.id}, NOW() - INTERVAL '3 days'),
      (1, 'JobAgent',      'proposal_sent',     'Sent proposal to Jason Wright after owner approval',        'job',  ${wallJob.id}, NOW() - INTERVAL '3 days'),
      (1, 'LeadAgent',     'nurture_step',      'Sent Day-5 follow-up to Rachel Dunn (outdoor kitchen lead)','lead', ${leadMap['Rachel Dunn']}, NOW() - INTERVAL '5 days'),
      (1, 'PaymentAgent',  'invoice_reminder',  'Reminded Jason Wright — deposit due in 14 days',           'job',  ${wallJob.id}, NOW() - INTERVAL '1 day'),
      (1, 'SmartOrch',     'daily_scan',        'Daily scan complete — 6 actions queued, 0 escalations',     'system', NULL, NOW() - INTERVAL '4 hours'),
      (1, 'LeadAgent',     'referral_detected', 'Tom Brennan came from Hendersons referral — linked automatically', 'lead', ${leadMap['Tom Brennan']}, NOW() - INTERVAL '2 days'),
      (1, 'ChangeOrder',   'change_order_draft','Drafted change order: Japanese maple swap on JOB-001 (+$180)', 'job', ${landscapeJob.id}, NOW() - INTERVAL '18 hours'),
      (1, 'MarketingAgent','campaign_sent',     'Spring Cleanup campaign sent to 42 past clients — 11 opens, 3 replies', 'system', NULL, NOW() - INTERVAL '3 days'),
      (1, 'ClientAgent',   'review_request',    'Requested Google review from Angela Foster (JOB-002 completed)', 'job', ${curbJob.id}, NOW() - INTERVAL '8 days'),
      (1, 'WelcomeAgent',  'kickoff_sent',      'Kickoff plan sent to Bill & Linda Henderson — JOB-001',    'job',  ${landscapeJob.id}, NOW() - INTERVAL '17 days')
  `);
  console.log('✅ Activity Log (12 entries — powers AI activity feed)');

  // ── Job Materials (for JOB-001 inventory) ───────────────────────────────
  await query(`
    INSERT INTO job_materials (company_id, job_id, job_ref, client_name, category, item, quantity, unit_cost, total_cost, best_source)
    VALUES
      (1, ${landscapeJob.id}, 'JOB-001', 'Bill & Linda Henderson', 'Hardscape',   'Belgard Lafitt Rustic Slab Pavers', '800 sq ft', '$5.20/sq ft', '$4,160', 'Belgard Dealer / SiteOne'),
      (1, ${landscapeJob.id}, 'JOB-001', 'Bill & Linda Henderson', 'Hardscape',   'Paver Base & Sand',                 '12 tons',   '$38/ton',    '$456',   'Local aggregate'),
      (1, ${landscapeJob.id}, 'JOB-001', 'Bill & Linda Henderson', 'Hardscape',   'Fire Pit Ring & Stone',             '1 ea',      '$850',       '$850',   'Oakland Nursery'),
      (1, ${landscapeJob.id}, 'JOB-001', 'Bill & Linda Henderson', 'Softscape',   'Green Giant Arborvitae 6-7ft',      '12 ea',     '$85/ea',     '$1,020', 'Kurtz Brothers'),
      (1, ${landscapeJob.id}, 'JOB-001', 'Bill & Linda Henderson', 'Softscape',   'Japanese Maple 6ft specimen',        '1 ea',      '$320',       '$320',   'Mill Creek Nursery'),
      (1, ${landscapeJob.id}, 'JOB-001', 'Bill & Linda Henderson', 'Softscape',   'Perennial Mix (native selection)',   '180 sq ft', '$6.50/sq ft','$1,170', 'Natives in Harmony'),
      (1, ${landscapeJob.id}, 'JOB-001', 'Bill & Linda Henderson', 'Mulch',       'Premium Hardwood Mulch',             '8 cu yd',   '$42/cu yd',  '$336',   'Kurtz Brothers'),
      (1, ${landscapeJob.id}, 'JOB-001', 'Bill & Linda Henderson', 'Irrigation',  'Rain Bird 6-Zone Smart Controller',  '1 ea',      '$285',       '$285',   'SiteOne'),
      (1, ${landscapeJob.id}, 'JOB-001', 'Bill & Linda Henderson', 'Irrigation',  'Drip Line + Heads (full system)',    '1 lot',     '$920',       '$920',   'SiteOne'),
      (1, ${landscapeJob.id}, 'JOB-001', 'Bill & Linda Henderson', 'Sod',         'Premium Bluegrass Sod',              '2000 sq ft','$0.68/sq ft','$1,360', 'Thornapple Sod Farm'),
      (1, ${landscapeJob.id}, 'JOB-001', 'Bill & Linda Henderson', 'Lighting',    'WAC Low-Voltage Path Light',         '14 ea',     '$68/ea',     '$952',   'SiteOne')
  `).catch(e => console.warn('Job materials insert skipped:', e.message));
  console.log('✅ Job Materials (11 line items on JOB-001)');

  // ── Pending Approvals (queue for owner review) ──────────────────────────
  await query(`
    INSERT INTO pending_approvals (company_id, type, recipient, subject, body, thread_id, job_id, agent_name, status, created_at)
    VALUES
      (1, 'email', 'jwright@wrightfamily.com',
       'Follow-up: Retaining Wall Proposal',
       'Hi Jason — just checking in on the retaining wall proposal I sent over 3 days ago. Totally understand if you need more time to talk it over with your wife. I''d love to answer any questions if you''re on the fence. Happy to jump on a 15-minute call — any day this week works for me.',
       'THREAD-JW-001', ${wallJob.id}, 'JobAgent', 'pending', NOW() - INTERVAL '6 hours'),

      (1, 'email', 'bhenderson@gmail.com',
       'Change Order — Japanese Maple substitution',
       'Bill — attached is the change order for the Japanese maple swap (replacing one arborvitae spot in the hedge line). Upcharge is $180 net. Once you sign, Kevin will source the maple this week so it''s ready for the planting phase. Thanks!',
       'THREAD-HEN-001', ${landscapeJob.id}, 'ChangeOrderAgent', 'pending', NOW() - INTERVAL '18 hours')
  `).catch(e => console.warn('Pending approvals insert skipped:', e.message));
  console.log('✅ Pending Approvals (2 waiting for owner review)');

  // ── Marketing Campaigns ─────────────────────────────────────────────────
  await query(`
    INSERT INTO marketing_campaigns (company_id, name, type, status, target_segment, message_body, sent_count, open_count, reply_count, created_at)
    VALUES
      (1, 'Spring Cleanup Push',       'seasonal',      'sent',  'Past clients (1+ years ago)', 'Spring is here — want us to handle your cleanup, mulch, and bed prep? 15% off for past clients this month.', 42, 18, 5, NOW() - INTERVAL '14 days'),
      (1, 'Referral Reward — Q2',       'referral',      'sent',  'Clients who finished in 2025', 'Know someone who needs landscaping? Send them our way — you''ll get $200 off your next service, and they get $100 off theirs.', 31, 14, 3, NOW() - INTERVAL '21 days'),
      (1, 'We Miss You',                're_engagement', 'draft', 'Leads gone cold 60+ days',   'Hey [first name] — it''s been a while! Circling back on your landscaping inquiry. Any update on the timing? If it''s not this year, no worries — just wanted to check in.', 0, 0, 0, NOW() - INTERVAL '2 days'),
      (1, 'Summer Patio Special',       'seasonal',      'draft', 'Hot/Warm leads — patio interest', 'Summer is prime patio season. Book by end of May and we''ll throw in a free fire pit ring ($850 value). Limited to 4 spots — first come, first served.', 0, 0, 0, NOW() - INTERVAL '1 day')
  `).catch(e => console.warn('Marketing campaigns insert skipped:', e.message));
  console.log('✅ Marketing Campaigns (2 sent + 2 draft — ready to launch)');

  // ── Recurring Services ──────────────────────────────────────────────────
  await query(`
    INSERT INTO recurring_jobs (company_id, client_id, title, service, frequency, next_run, last_run, status, template_notes)
    VALUES
      (1, ${hendersons.id}, 'Monthly Lawn Care — Henderson',     'Lawn Care + Bed Maintenance', 'monthly',  CURRENT_DATE + INTERVAL '5 days',  CURRENT_DATE - INTERVAL '25 days', 'active', 'Standard package: mow, edge, bed weed, mulch refresh in spring'),
      (1, ${angela.id},     'Quarterly Garden Refresh — Foster', 'Garden Refresh',              'quarterly', CURRENT_DATE + INTERVAL '12 days', CURRENT_DATE - INTERVAL '80 days', 'active', 'Seasonal plant swap, mulch top-off, pruning'),
      (1, ${jason.id},      'Fall Cleanup — Wright',             'Leaf Cleanup',                'annually',  CURRENT_DATE + INTERVAL '150 days', NULL,                           'active', 'Full leaf cleanup + gutter check')
  `).catch(e => console.warn('Recurring jobs insert skipped:', e.message));
  console.log('✅ Recurring Services (3 active)');

  console.log('\n🎉 Seed complete! Database loaded with Landcare Unlimited demo data.');
  await pool.end();
}

seed().catch(err => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
