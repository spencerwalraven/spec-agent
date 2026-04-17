/* ─── DEMO DATA (fallback when API is unreachable) ─────────────── */
const DEMO = {
  summary: {
    newLeads: 6, activeJobs: 4, pipelineValue: 187500, conversionRate: '31%',
    companyName: 'Landcare Unlimited',
    revenueByMonth: [
      { label: 'Nov', value: 18500, label2: '$19k' },
      { label: 'Dec', value: 12000, label2: '$12k' },
      { label: 'Jan', value: 22000, label2: '$22k' },
      { label: 'Feb', value: 31000, label2: '$31k' },
      { label: 'Mar', value: 45000, label2: '$45k' },
      { label: 'Apr', value: 29000, label2: '$29k' },
    ],
    conversionFunnel: [
      { label: 'Leads', value: 24 },
      { label: 'Contacted', value: 18 },
      { label: 'Qualified', value: 12 },
      { label: 'Proposal Sent', value: 8 },
      { label: 'Won', value: 5 },
    ],
    leadSourcesChart: [
      { label: 'Website', value: 9 },
      { label: 'Referral', value: 7 },
      { label: 'Google Ads', value: 4 },
      { label: 'Nextdoor', value: 3 },
      { label: 'Other', value: 1 },
    ],
    jobMargins: [
      { label: 'Chen', value: 34, label2: '34%', color: '#22C55E' },
      { label: 'Henderson', value: 28, label2: '28%', color: '#22C55E' },
      { label: 'Bradley', value: 18, label2: '18%', color: '#F59E0B' },
      { label: 'Patel', value: 42, label2: '42%', color: '#22C55E' },
      { label: 'Garcia', value: 12, label2: '12%', color: '#EF4444' },
    ],
    activity: [
      { text: '<strong>Marcus Johnson</strong> submitted a new lead — Landscape Renovation', time: 'Today, 9:12 AM' },
      { text: '<strong>Sarah Chen</strong> signed the contract for backyard patio', time: 'Today, 7:45 AM' },
      { text: '<strong>Rivera Family</strong> — proposal viewed 3 times', time: 'Yesterday, 4:30 PM' },
      { text: 'Deposit invoice paid by <strong>The Hendersons</strong>', time: 'Apr 12' },
      { text: '<strong>Tom Bradley</strong> — 30-day check-in sent automatically', time: 'Apr 11' },
    ]
  },
  leads: [
    { __row: 2, 'First Name': 'Marcus', 'Last Name': 'Johnson', Email: 'marcus@email.com', Phone: '555-0101', 'Project Type': 'Landscape Renovation', Budget: '$45,000', Status: 'New', 'AI Score': '88', 'Score Label': 'Hot', 'Last Contact': '', Notes: 'Wants to start ASAP. Has kids — prefers weekend work.', 'Assigned Rep': 'Chase', 'Timestamp': '2026-03-21' },
    { __row: 3, 'First Name': 'Diana', 'Last Name': 'Rivera', Email: 'diana@email.com', Phone: '555-0202', 'Project Type': 'Patio Installation', Budget: '$28,000', Status: 'Proposal Sent', 'AI Score': '74', 'Score Label': 'Warm', 'Last Contact': '2026-03-20', Notes: 'Comparing 3 contractors. Liked our online reviews.', 'Assigned Rep': 'Spencer', 'Timestamp': '2026-03-19' },
    { __row: 4, 'First Name': 'Kevin', 'Last Name': 'Park', Email: 'kevin@email.com', Phone: '555-0303', 'Project Type': 'Retaining Wall', Budget: '$18,000', Status: 'Contacted', 'AI Score': '61', 'Score Label': 'Warm', 'Last Contact': '2026-03-18', Notes: 'Budget flexible. Wants natural stone. Budget flexible.', 'Assigned Rep': 'Chase', 'Timestamp': '2026-03-17' },
    { __row: 5, 'First Name': 'Priya', 'Last Name': 'Mehta', Email: 'priya@email.com', Phone: '555-0404', 'Project Type': 'Irrigation System', Budget: '$55,000', Status: 'Consultation Booked', 'AI Score': '92', 'Score Label': 'Hot', 'Last Contact': '2026-03-22', Notes: 'High budget, motivated. Consultation on March 25.', 'Assigned Rep': 'Spencer', 'Timestamp': '2026-03-22' },
    { __row: 6, 'First Name': 'Tom', 'Last Name': 'Bradley', Email: 'tom@email.com', Phone: '555-0505', 'Project Type': 'Sod Installation', Budget: '$12,000', Status: 'Lost', 'AI Score': '42', 'Score Label': 'Cold', 'Last Contact': '2026-03-10', Notes: 'Went with another contractor. Price was the deciding factor.', 'Assigned Rep': '', 'Timestamp': '2026-03-05' },
    { __row: 7, 'First Name': 'Linda', 'Last Name': 'Foster', Email: 'linda@email.com', Phone: '555-0606', 'Project Type': 'Full Landscape Redesign', Budget: '$80,000', Status: 'New', 'AI Score': '85', 'Score Label': 'Hot', 'Last Contact': '', Notes: 'Large project. Referred by Sarah Chen.', 'Assigned Rep': '', 'Timestamp': '2026-03-23' },
  ],
  jobs: [
    { __row: 2, 'Job ID': 'JOB-001', 'Client Name': 'Sarah Chen', 'Project Type': 'Patio Installation', 'Job Value': '$28,500', Status: 'In Progress', 'Start Date': '2026-03-01', 'End Date': '2026-03-30', 'Deposit Status': 'Paid', 'Final Invoice Status': 'Pending', 'Proposal Link': 'https://docs.google.com', 'Contract Link': 'https://docs.google.com', 'Kickoff Doc Link': 'https://docs.google.com', 'Assigned Crew': 'Mike T., Carlos R.', 'Job Notes': 'Grading complete. Paver base going in Monday.', selectedTier: 'midrange',
      tierBudget: JSON.stringify({ total: 18500, materials: 8200, labor: 7800, overhead: 2500, desc: 'Standard concrete pavers, basic layout, minimal landscaping' }),
      tierMidrange: JSON.stringify({ total: 28500, materials: 13500, labor: 10800, overhead: 4200, desc: 'Premium pavers, custom pattern, integrated lighting, border plantings' }),
      tierHighend: JSON.stringify({ total: 42000, materials: 21000, labor: 14500, overhead: 6500, desc: 'Natural stone, heated surface, built-in fire pit, full landscape surround' }),
      tierLuxury: JSON.stringify({ total: 68000, materials: 35000, labor: 22000, overhead: 11000, desc: 'Imported travertine, outdoor kitchen, pergola, water feature, smart lighting' })
    },
    { __row: 3, 'Job ID': 'JOB-002', 'Client Name': 'The Hendersons', 'Project Type': 'Landscape Renovation', 'Job Value': '$62,000', Status: 'In Progress', 'Start Date': '2026-02-15', 'End Date': '2026-04-10', 'Deposit Status': 'Paid', 'Final Invoice Status': 'Pending', 'Proposal Link': 'https://docs.google.com', 'Contract Link': 'https://docs.google.com', 'Kickoff Doc Link': '', 'Assigned Crew': 'Spencer, Chase', 'Job Notes': 'Planting beds shaped. Irrigation install starts Friday.', selectedTier: 'highend',
      tierBudget: JSON.stringify({ total: 32000, materials: 14000, labor: 13000, overhead: 5000, desc: 'Seed lawn, basic shrubs, standard irrigation, mulch beds' }),
      tierMidrange: JSON.stringify({ total: 48000, materials: 22000, labor: 18000, overhead: 8000, desc: 'Sod lawn, native plants, drip irrigation, decorative rock borders' }),
      tierHighend: JSON.stringify({ total: 62000, materials: 29000, labor: 22500, overhead: 10500, desc: 'Premium sod, specimen trees, smart irrigation, landscape lighting, water feature' }),
      tierLuxury: JSON.stringify({ total: 95000, materials: 48000, labor: 31000, overhead: 16000, desc: 'Full estate design, mature trees, smart system, pool surround, outdoor living space' })
    },
    { __row: 4, 'Job ID': 'JOB-003', 'Client Name': 'Raj Patel', 'Project Type': 'Irrigation System', 'Job Value': '$48,000', Status: 'Planning', 'Start Date': '2026-04-01', 'End Date': '2026-05-20', 'Deposit Status': 'Invoiced', 'Final Invoice Status': 'Pending', 'Proposal Link': 'https://docs.google.com', 'Contract Link': 'https://docs.google.com', 'Kickoff Doc Link': '', 'Assigned Crew': '', 'Job Notes': 'Contract signed. Awaiting deposit.' },
    { __row: 5, 'Job ID': 'JOB-004', 'Client Name': 'Tom Bradley', 'Project Type': 'Retaining Wall', 'Job Value': '$22,000', Status: 'Complete', 'Start Date': '2026-01-10', 'End Date': '2026-02-28', 'Deposit Status': 'Paid', 'Final Invoice Status': 'Paid', 'Proposal Link': '', 'Contract Link': '', 'Kickoff Doc Link': '', 'Assigned Crew': 'Mike T.', 'Job Notes': 'Completed on time. Great feedback from client.' },
    { __row: 6, 'Job ID': 'JOB-005', 'Client Name': 'Garcia Family', 'Project Type': 'Sod Installation', 'Job Value': '$16,500', Status: 'In Progress', 'Start Date': '2026-03-18', 'End Date': '2026-03-25', 'Deposit Status': 'Paid', 'Final Invoice Status': 'Pending', 'Proposal Link': 'https://docs.google.com', 'Contract Link': 'https://docs.google.com', 'Kickoff Doc Link': 'https://docs.google.com', 'Assigned Crew': 'Carlos R.', 'Job Notes': '4 of 5 zones sodded. Final zone tomorrow.' },
  ],
  phases: {
    'JOB-001': [
      { __row: 10, 'Job ID': 'JOB-001', Phase: 'Site Prep & Grading', Status: 'Complete', 'Completed Date': '2026-03-05' },
      { __row: 11, 'Job ID': 'JOB-001', Phase: 'Base & Drainage', Status: 'Complete', 'Completed Date': '2026-03-10' },
      { __row: 12, 'Job ID': 'JOB-001', Phase: 'Paver Install', Status: 'In Progress', 'Completed Date': '' },
      { __row: 13, 'Job ID': 'JOB-001', Phase: 'Planting & Mulch', Status: 'Pending', 'Completed Date': '' },
      { __row: 14, 'Job ID': 'JOB-001', Phase: 'Final Walkthrough', Status: 'Pending', 'Completed Date': '' },
    ]
  },
  clients: [
    { __row: 2, 'First Name': 'Sarah', 'Last Name': 'Chen', Email: 'sarah@email.com', Phone: '555-1001', 'Lifetime Value': '$28,500', 'Number of Jobs': '1', 'Last Job': 'Patio Installation', 'Satisfaction Score': '9/10', 'Referrals Given': '1', Notes: 'Excellent client. Referred Linda Foster.' },
    { __row: 3, 'First Name': 'The', 'Last Name': 'Hendersons', Email: 'henderson@email.com', Phone: '555-1002', 'Lifetime Value': '$62,000', 'Number of Jobs': '1', 'Last Job': 'Landscape Renovation', 'Satisfaction Score': '10/10', 'Referrals Given': '0', Notes: 'Huge project. Very pleased with progress.' },
    { __row: 4, 'First Name': 'Tom', 'Last Name': 'Bradley', Email: 'tombradley@email.com', Phone: '555-1003', 'Lifetime Value': '$22,000', 'Number of Jobs': '1', 'Last Job': 'Retaining Wall', 'Satisfaction Score': '8/10', 'Referrals Given': '0', Notes: 'Happy client. May want landscaping next year.' },
    { __row: 5, 'First Name': 'Raj', 'Last Name': 'Patel', Email: 'raj@email.com', Phone: '555-1004', 'Lifetime Value': '$48,000', 'Number of Jobs': '1', 'Last Job': 'Irrigation System', 'Satisfaction Score': '', 'Referrals Given': '0', Notes: 'New client — job starts April.' },
  ],
  team: [
    { __row: 2, Name: 'Tim Blake', Role: 'Owner / Project Manager', Email: 'tim@landcareunlimited.com', Phone: '555-2001', Type: 'Crew', Active: 'Yes', 'Active Jobs': 2 },
    { __row: 3, Name: 'Marcus Reed', Role: 'Sales Rep', Email: 'chase@landcareunlimited.com', Phone: '555-2002', Type: 'Crew', Active: 'Yes', 'Active Jobs': 1 },
    { __row: 4, Name: 'Mike Torres', Role: 'Crew Lead', Email: 'mike@email.com', Phone: '555-2003', Type: 'Crew', Active: 'Yes', 'Active Jobs': 2 },
    { __row: 5, Name: 'Carlos Rivera', Role: 'Hardscape Specialist', Email: 'carlos@email.com', Phone: '555-2004', Type: 'Crew', Active: 'Yes', 'Active Jobs': 2 },
    { __row: 6, Name: 'A1 Irrigation', Role: 'Irrigation Subcontractor', Email: 'a1irrigation@gmail.com', Phone: '555-3001', Type: 'Subcontractor', Active: 'Yes', 'Active Jobs': 1 },
    { __row: 7, Name: 'Elite Electric', Role: 'Electrical Subcontractor', Email: 'info@eliteelectric.com', Phone: '555-3002', Type: 'Subcontractor', Active: 'No', 'Active Jobs': 0 },
  ],
  alerts: [
    { type: 'urgent', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2c0 4-4 6-4 10a4 4 0 0 0 8 0c0-4-4-6-4-10z"/></svg>', title: 'Hot lead not contacted', desc: 'Linda Foster submitted 2 hours ago — Score 85. No contact made yet.', tag: 'Lead: Linda Foster' },
    { type: 'urgent', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2c0 4-4 6-4 10a4 4 0 0 0 8 0c0-4-4-6-4-10z"/></svg>', title: 'Hot lead not contacted', desc: 'Marcus Johnson submitted yesterday — Score 88. No contact made yet.', tag: 'Lead: Marcus Johnson' },
    { type: 'warning', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>', title: 'Deposit overdue — Raj Patel', desc: 'Contract signed 5 days ago. Deposit invoice still unpaid. Job start date is April 1.', tag: 'Job: JOB-003' },
    { type: 'info', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>', title: 'Consultation tomorrow', desc: 'Priya Mehta consultation scheduled for March 25. Prep estimate before meeting.', tag: 'Lead: Priya Mehta' },
  ],
  marketing: [
    { __row: 2, 'Campaign Name': 'Spring Landscaping Promo', Type: 'seasonal', Description: 'Seasonal promotion targeting past clients for spring projects.', 'Target Audience': 'Past clients + leads', Status: 'Ready', 'Send Now': '' },
    { __row: 3, 'Campaign Name': 'Referral Thank You', Type: 'referral', Description: 'Reward clients who refer new leads with a thank-you and gift card offer.', 'Target Audience': 'Current clients', Status: 'Ready', 'Send Now': '' },
    { __row: 4, 'Campaign Name': 'We Miss You', Type: 're-engagement', Description: 'Re-engage leads who went cold in the last 60–90 days.', 'Target Audience': 'Cold leads', Status: 'Ready', 'Send Now': '' },
    { __row: 5, 'Campaign Name': 'Summer Patio Special', Type: 'seasonal', Description: '10% off patio projects booked before June 1.', 'Target Audience': 'All leads', Status: 'Sent', 'Send Now': 'Yes' },
  ],
  settings: {
    companyName: 'Landcare Unlimited',
    phone: '(555) 555-0100',
    email: 'tim@landcareunlimited.com',
    address: '1300 S Litchfield Rd, Goodyear, AZ 85338',
    ownerName: 'Tim Blake',
    calendlyLink: 'https://calendly.com/landcareunlimited/consultation',
    googleReviewLink: 'https://g.page/r/review',
    emailSignature: 'Tim Blake | Landcare Unlimited | (555) 555-0100',
  },
  approvals: [
    { _row: 3, jobId: 'JOB-002', clientName: 'The Hendersons', serviceType: 'Landscape Renovation', jobValue: '$62,000', type: 'proposal', label: 'Proposal', docLink: 'https://docs.google.com' },
    { _row: 4, jobId: 'JOB-003', clientName: 'Raj Patel',      serviceType: 'Irrigation System',  jobValue: '$48,000', type: 'contract', label: 'Contract', docLink: 'https://docs.google.com' },
  ],
  inventory: {
    items: [
      { jobId:'JOB-001', clientName:'Henderson Residence', category:'Hardscape',   item:'Belgard Lafitt Rustic Slab Pavers', quantity:'800 sq ft',  unitCost:'$5.20/sq ft', totalCost:'$4,160', bestSource:'Belgard Dealer / SiteOne' },
      { jobId:'JOB-001', clientName:'Henderson Residence', category:'Hardscape',   item:'Paver Base & Sand',               quantity:'12 tons',    unitCost:'$38/ton',     totalCost:'$456',   bestSource:'Local aggregate supplier' },
      { jobId:'JOB-001', clientName:'Henderson Residence', category:'Softscape',   item:'Green Giant Arborvitae 6-7ft',    quantity:'12 ea',      unitCost:'$85/ea',      totalCost:'$1,020', bestSource:'Kurtz Brothers / Mill Creek Nursery' },
      { jobId:'JOB-001', clientName:'Henderson Residence', category:'Mulch',       item:'Premium Hardwood Mulch',          quantity:'8 cu yds',   unitCost:'$42/cu yd',   totalCost:'$336',   bestSource:'Kurtz Brothers' },
      { jobId:'JOB-005', clientName:'Dr. Richard Patel',   category:'Trees',       item:'Ornamental Crabapple 2.5" cal',   quantity:'4 ea',       unitCost:'$320/ea',     totalCost:'$1,280', bestSource:'Mill Creek Nursery' },
      { jobId:'JOB-005', clientName:'Dr. Richard Patel',   category:'Softscape',   item:'Native Perennial Mix',            quantity:'200 sq ft',  unitCost:'$8.50/sq ft', totalCost:'$1,700', bestSource:'Natives in Harmony' },
      { jobId:'JOB-005', clientName:'Dr. Richard Patel',   category:'Irrigation',  item:'Rain Bird 8-Zone Smart Controller',quantity:'1 ea',      unitCost:'$285/ea',     totalCost:'$285',   bestSource:'SiteOne Landscape Supply' },
      { jobId:'JOB-005', clientName:'Dr. Richard Patel',   category:'Lighting',    item:'WAC Lighting Bronze Path Light',   quantity:'14 ea',     unitCost:'$68/ea',      totalCost:'$952',   bestSource:'SiteOne / Amazon' },
    ],
    byJob: [
      { jobId:'JOB-001', clientName:'Sarah Chen',     updatedAt:'3/20/2026', items: [] },
      { jobId:'JOB-002', clientName:'The Hendersons', updatedAt:'3/22/2026', items: [] },
    ],
  },
  equipment: [
    { _row:2, equipmentId:'EQ-001', name:'2022 Ford F-250',             category:'Vehicle',    makeModel:'Ford F-250 XLT',    status:'In Use',     assignedTo:'Mike T.',  assignedJob:'JOB-001', value:'$45,000', notes:'Main work truck' },
    { _row:3, equipmentId:'EQ-002', name:'2019 Trailer',                category:'Trailer',    makeModel:'Big Tex 14OA',      status:'Available',  assignedTo:'',         assignedJob:'',        value:'$8,500',  notes:'Material hauler' },
    { _row:4, equipmentId:'EQ-003', name:'Honda Trencher',       category:'Ladder',     makeModel:'Honda F220',    status:'Available',  assignedTo:'',         assignedJob:'',        value:'$280',    notes:'' },
    { _row:5, equipmentId:'EQ-004', name:'Wacker Neuson Plate Compactor',             category:'Compaction', makeModel:'Wacker Neuson VP1340A',    status:'Maintenance',assignedTo:'',         assignedJob:'',        value:'$650',    notes:'Needs new pad' },
    { _row:6, equipmentId:'EQ-005', name:'Dingo Mini Loader',   category:'Equipment',   makeModel:'Toro Dingo TX525',       status:'Available',  assignedTo:'',         assignedJob:'',        value:'$1,200',  notes:'Narrow access loader' },
    { _row:7, equipmentId:'EQ-006', name:'2021 Ford Transit Van',       category:'Vehicle',    makeModel:'Ford Transit 250',  status:'Available',  assignedTo:'',         assignedJob:'',        value:'$38,000', notes:'Cargo van — crew transport' },
  ],
  todaySchedule: [
    { title: 'Henderson Residence — Irrigation Install', start: new Date().toISOString().slice(0,10) + 'T09:00:00', source: 'job', color: '2' },
    { title: 'Priya Mehta — Consultation', start: new Date().toISOString().slice(0,10) + 'T11:30:00', source: 'lead', color: '10' },
    { title: 'Garcia Sod — Final Zone Walkthrough', start: new Date().toISOString().slice(0,10) + 'T14:00:00', source: 'job', color: '2' },
  ],
};

/* ─── STATE ────────────────────────────────────────────────────── */
const loaded = {};
let allLeads = [], allJobs = [], allClients = [], allTeam = [], allMarketing = [];
let leadFilter = 'all', jobFilter = 'all', teamFilter = 'all', mktgFilter = 'all';
let usingDemo = false;
let _calendlyLink = '';
let currentUser = { name: '', role: '' }; // empty until /api/me returns

/* ─── GREETING ──────────────────────────────────────────────────── */
function greet() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

/* ─── ROLE NAV ──────────────────────────────────────────────────── */
function applyRoleNav(role) {
  const nav = document.getElementById('bottomNav');
  if (!nav) return;

  // SVG icon helpers for bottom nav
  const _ni = (d) => `<svg viewBox="0 0 24 24">${d}</svg>`;
  const NAV_ICONS = {
    home:     _ni('<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>'),
    leads:    _ni('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'),
    jobs:     _ni('<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>'),
    team:     _ni('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>'),
    schedule: _ni('<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>'),
    more:     _ni('<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>'),
  };

  const configs = {
    owner: [
      { page: 'dashboard', icon: NAV_ICONS.home,  label: 'Home' },
      { page: 'leads',     icon: NAV_ICONS.leads, label: 'Leads',    badge: 'leadsNavBadge' },
      { page: 'jobs',      icon: NAV_ICONS.jobs,  label: 'Jobs' },
      { page: 'team',      icon: NAV_ICONS.team,  label: 'Team' },
      { page: 'more',      icon: NAV_ICONS.more,  label: 'More' },
    ],
    sales: [
      { page: 'dashboard', icon: NAV_ICONS.home,     label: 'Home' },
      { page: 'leads',     icon: NAV_ICONS.leads,    label: 'Leads',    badge: 'leadsNavBadge' },
      { page: 'jobs',      icon: NAV_ICONS.jobs,     label: 'Jobs' },
      { page: 'schedule',  icon: NAV_ICONS.schedule, label: 'Schedule' },
      { page: 'more',      icon: NAV_ICONS.more,     label: 'More' },
    ],
    field: [
      { page: 'dashboard', icon: NAV_ICONS.home,     label: 'Home' },
      { page: 'jobs',      icon: NAV_ICONS.jobs,     label: 'Jobs' },
      { page: 'schedule',  icon: NAV_ICONS.schedule, label: 'Schedule' },
      { page: 'more',      icon: NAV_ICONS.more,     label: 'More' },
    ],
  };

  // Hide More menu items that this role shouldn't see
  document.querySelectorAll('[data-roles]').forEach(el => {
    const allowed = el.dataset.roles.split(' ');
    el.style.display = allowed.includes(role) ? '' : 'none';
  });

  if (!role || !configs[role]) role = 'owner';
  const items = configs[role];
  const curPage = document.querySelector('.page.active')?.id?.replace('page-','') || 'dashboard';

  nav.innerHTML = items.map(item => `
    <button class="nav-item${item.page === curPage ? ' active' : ''}"
            data-page="${item.page}"
            onclick="navigate('${item.page}')"
            style="position:relative">
      <span class="nav-icon">${item.icon}</span>
      <span>${item.label}</span>
      ${item.badge ? `<span id="${item.badge}" style="display:none;position:absolute;top:4px;right:10px;background:#DC2626;color:#fff;font-size:10px;font-weight:800;min-width:16px;height:16px;border-radius:99px;align-items:center;justify-content:center;padding:0 4px"></span>` : ''}
      ${item.dot   ? `<span id="${item.dot}"   style="display:none;position:absolute;top:6px;right:12px;width:7px;height:7px;border-radius:50%;background:var(--red);border:1.5px solid var(--ink)"></span>` : ''}
    </button>
  `).join('');
}

function buildMoreMenu(role) {
  const el = document.getElementById('moreMenuContent');
  if (!el) return;

  const btn = (page, icon, name, desc, extra) =>
    `<button class="more-item" onclick="${extra || `navigate('${page}')`}"><div class="more-icon">${icon}</div><div class="more-name">${name}</div><div class="more-desc">${desc}</div></button>`;

  const section = (title, items) =>
    `<div style="font-size:11px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--text3);padding:4px 4px 8px">${title}</div>
     <div class="more-grid" style="margin-bottom:20px">${items.join('')}</div>`;

  let html = '';
  // Default to owner if role is unrecognized
  if (!role || !['owner','sales','field'].includes(role)) role = 'owner';

  if (role === 'owner') {
    html += section('Daily Tools', [
      btn('field', '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21L3 3 21 21z"/><line x1="9" y1="15" x2="15" y2="15"/></svg>', 'Job Estimate', 'Site visit form'),
      btn('schedule', '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>', 'Schedule', 'Calendar sync'),
      btn('tasks', '✓', 'Tasks', 'Action items'),
      btn('team', '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>', 'Time Clock', 'Clock in & out', "navigate('team');setTimeout(()=>switchTeamTab('clock'),100)"),
    ]);
    html += section('Manage', [
      btn('team', '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>', 'Team', 'Members & rates'),
      btn('clients', '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>', 'Clients', 'Profiles & history'),
      btn('conversations', '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>', 'Conversations', 'Email threads'),
      btn('approvals', '✓', 'Approvals', 'Review queue'),
      btn('marketing', '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>', 'Marketing', 'Campaigns'),
      btn('inventory', '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>', 'Inventory', 'Materials & equipment'),
    ]);
    html += section('Insights', [
      btn('analytics', '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>', 'Analytics', 'Revenue & insights'),
      btn('agents', '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/><line x1="12" y1="3" x2="12" y2="1"/><circle cx="8" cy="16" r="1" fill="currentColor"/><circle cx="16" cy="16" r="1" fill="currentColor"/></svg>', 'AI Agents', 'Live activity'),
    ]);
    html += section('Admin', [
      btn('settings', '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>', 'Settings', 'Company info'),
      btn('recurring', '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>', 'Recurring', 'Scheduled services'),
    ]);

  } else if (role === 'sales') {
    html += section('Daily Tools', [
      btn('field', '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21L3 3 21 21z"/><line x1="9" y1="15" x2="15" y2="15"/></svg>', 'Job Estimate', 'Site visit form'),
      btn('schedule', '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>', 'Schedule', 'Calendar sync'),
      btn('tasks', '✓', 'Tasks', 'My action items'),
      btn('alerts', '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>', 'Alerts', 'Notifications'),
    ]);
    html += section('Manage', [
      btn('clients', '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>', 'Clients', 'Profiles & history'),
      btn('conversations', '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>', 'Conversations', 'Email threads'),
      btn('approvals', '✓', 'Approvals', 'Review queue'),
    ]);

  } else if (role === 'field') {
    html += section('Daily Tools', [
      btn('tasks', '✓', 'Tasks', 'My tasks'),
      btn('team', '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>', 'Time Clock', 'Clock in & out', "navigate('team');setTimeout(()=>switchTeamTab('clock'),100)"),
      btn('alerts', '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>', 'Alerts', 'Notifications'),
    ]);
  }

  el.innerHTML = html;
}

/* ─── TODAY'S SCHEDULE STRIP ────────────────────────────────────── */
async function loadTodayStrip() {
  const el = document.getElementById('todayEvents');
  if (!el) return;

  // Google Calendar color IDs → hex
  const GC_COLORS = {
    '1':'#e53935','2':'#43a047','3':'#7986cb','4':'#e91e63',
    '5':'#f4511e','6':'#f6bf26','7':'#039be5','8':'#616161',
    '9':'#3f51b5','10':'#0b8043','11':'#d50000',
  };
  const SOURCE_COLORS = { lead: '#0b8043', job: '#e53935', calendar: '#039be5' };

  try {
    // Primary: combined schedule endpoint (Calendar + Leads + Jobs)
    const events = await fetch('/api/schedule/today')
      .then(r => r.ok ? r.json() : [])
      .catch(() => []);

    if (!events.length && DEMO.todaySchedule) {
      events.push(...DEMO.todaySchedule);
    }
    if (!events.length) {
      el.innerHTML = '<div class="cal-evt-empty">Nothing scheduled today</div>';
      return;
    }

    el.innerHTML = events.slice(0, 6).map(e => {
      const d = new Date(e.start);
      const allDay  = !e.start.includes('T');
      const timeStr = allDay ? 'All Day' : d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
      const color   = SOURCE_COLORS[e.source] || GC_COLORS[e.color] || '#039be5';
      const title   = e.title || 'Untitled';
      const tag     = e.source === 'lead' ? 'Consult'
                    : e.source === 'job'  ? 'Job Start'
                    : /consult|meeting|call/i.test(title) ? 'Consult'
                    : /kickoff|start/i.test(title)        ? 'Kickoff'
                    : /phase|install|demo/i.test(title)   ? 'Phase'
                    : '';
      const onclick = e.link ? 'window.open(this.dataset.link,\'_blank\')' : '';
      return `
        <div class="cal-evt" onclick="${onclick}" data-link="${e.link || ''}">
          <div class="cal-evt-time">${timeStr}</div>
          <div class="cal-evt-bar" style="background:${color}"></div>
          <div class="cal-evt-title">${title}</div>
          ${tag ? '<div class="cal-evt-tag">' + tag + '</div>' : ''}
        </div>`;
    }).join('');
  } catch (_) {
    el.innerHTML = '<div class="cal-evt-empty">No schedule data available</div>';
  }
}

/* ─── DASHBOARD RENDERERS ───────────────────────────────────────── */
function renderDashKPIs(data, role) {
  const el = document.getElementById('kpiGrid');
  if (!el) return;

  if (role === 'field') {
    el.innerHTML = `
      <div class="kpi-card" style="grid-column:1/-1">
        <div class="kpi-label">Active Jobs</div>
        <div class="kpi-value green">${data.activeJobs ?? '—'}</div>
        <div class="kpi-sub">In progress or planning</div>
      </div>`;
    return;
  }

  // Owner + Sales: full grid
  el.innerHTML = `
    <div class="kpi-card">
      <div class="kpi-label">New Leads</div>
      <div class="kpi-value">${data.newLeadsThisMonth ?? data.newLeads ?? '—'}</div>
      <div class="kpi-sub">This month <span class="kpi-trend up">+23%</span></div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Active Jobs</div>
      <div class="kpi-value green">${data.activeJobs ?? '—'}</div>
      <div class="kpi-sub">In progress</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Pipeline</div>
      <div class="kpi-value gold">${formatCurrency(data.pipelineValue)}</div>
      <div class="kpi-sub">Open opportunities <span class="kpi-trend up">+12%</span></div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Conversion</div>
      <div class="kpi-value">${data.conversionRate ?? '—'}</div>
      <div class="kpi-sub">Lead → client</div>
    </div>`;
}

function renderDashPills(urgentCount, approvalCount, role) {
  const el = document.getElementById('dashPills');
  if (!el) return;
  const pills = [];
  if (role === 'field') {
    // Field: just show a quick link to their jobs
    pills.push(`<button class="dash-pill blue" onclick="navigate('field')">Log Today's Update</button>`);
    el.innerHTML = pills.join('');
    return;
  }
  if (urgentCount > 0) {
    pills.push(`<button class="dash-pill red" onclick="toggleNotifPanel()">${urgentCount} Alert${urgentCount > 1 ? 's' : ''} Need Attention</button>`);
  } else {
    pills.push(`<div class="dash-pill green" style="cursor:default">No urgent alerts</div>`);
  }
  if (approvalCount > 0) {
    pills.push(`<button class="dash-pill gold" onclick="navigate('approvals')">${approvalCount} Pending Approval${approvalCount > 1 ? 's' : ''}</button>`);
  }
  el.innerHTML = pills.join('');
}

function renderDashQuickActions(role) {
  const el = document.getElementById('dashQuickActions');
  if (!el) return;

  const sets = {
    owner: [
      { icon:'<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>', name:'Leads',        desc:'View pipeline',        page:'leads' },
      { icon:'<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>', name:'Jobs',         desc:'Active projects',       page:'jobs' },
      { icon:'<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>', name:'Inventory',    desc:'Materials & suppliers', page:'inventory' },
      { icon:'<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>', name:'Marketing',    desc:'Campaigns',             page:'marketing' },
      { icon:'<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/><line x1="12" y1="3" x2="12" y2="1"/><circle cx="8" cy="16" r="1" fill="currentColor"/><circle cx="16" cy="16" r="1" fill="currentColor"/></svg>', name:'AI Agents',    desc:'Live activity',         page:'agents' },
      { icon:'<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>', name:'Analytics',    desc:'Revenue & trends',      page:'analytics' },
    ],
    sales: [
      { icon:'<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>', name:'Leads',        desc:'My pipeline',      page:'leads' },
      { icon:'<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>', name:'Jobs',         desc:'Active projects',  page:'jobs' },
      { icon:'✓', name:'Approvals',    desc:'Review queue',     page:'approvals' },
      { icon:'<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>', name:'Conversations',desc:'Email threads',    page:'conversations' },
    ],
    field: [
      { icon:'<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>', name:'My Jobs',      desc:'Active projects',  page:'jobs' },
      { icon:'<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>', name:'Field Update', desc:'Log progress',     page:'field' },
      { icon:'<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>', name:'Schedule',    desc:'Upcoming work',    page:'schedule' },
      { icon:'<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>', name:'Conversations',desc:'Messages',         page:'conversations' },
    ],
  };

  const items = sets[role] || sets.owner;
  el.innerHTML = `
    <div class="section-header" style="margin-top:20px">
      <span class="section-title">Quick Access</span>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      ${items.map(i => `
        <button class="more-item" onclick="navigate('${i.page}')">
          <div class="more-icon">${i.icon}</div>
          <div class="more-name">${i.name}</div>
          <div class="more-desc">${i.desc}</div>
        </button>`).join('')}
    </div>`;
}

/* ─── TOAST ─────────────────────────────────────────────────────── */
function toast(msg, dur = 2200, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show' + (type ? ' toast-' + type : '');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), dur);
}
function toastSuccess(msg) { toast(msg, 2500, 'success'); }
function toastError(msg)   { toast(msg, 3500, 'error'); }
function toastInfo(msg)    { toast(msg, 2200); }

/* ─── SKELETON LOADER ───────────────────────────────────────────── */
function skeletonList(count = 5, avatarStyle = '') {
  return Array.from({length: count}, () => `
    <div class="skeleton-item">
      <div class="skeleton-avatar ${avatarStyle}"></div>
      <div class="skeleton-body">
        <div class="skeleton-line" style="width:55%"></div>
        <div class="skeleton-line" style="width:35%;margin-top:6px"></div>
      </div>
      <div class="skeleton-right">
        <div class="skeleton-line" style="width:36px;height:20px;border-radius:10px"></div>
      </div>
    </div>`).join('');
}

/* ─── BUTTON STATE HELPERS ──────────────────────────────────────── */
function btnLoading(btn, label = '…') {
  if (!btn) return;
  btn._origText = btn.textContent;
  btn.textContent = label;
  btn.disabled = true;
}
function btnReset(btn) {
  if (!btn) return;
  btn.textContent = btn._origText || btn.textContent;
  btn.disabled = false;
}
function btnDone(btn, label, ms = 2000) {
  if (!btn) return;
  btn.textContent = label;
  setTimeout(() => btnReset(btn), ms);
}

/* ─── API FETCH W/ DEMO FALLBACK ────────────────────────────────── */
async function api(path, options = {}) {
  try {
    if (options.body && typeof options.body === 'object') {
      options.body = JSON.stringify(options.body);
    }
    const res = await fetch(path, {
      credentials: 'same-origin',
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    });
    if (!res.ok) throw new Error('API ' + res.status);
    usingDemo = false;
    setConnDot('live');
    return await res.json();
  } catch {
    usingDemo = true;
    setConnDot('demo');
    const key = path.replace(/^\/api\//, '').split('?')[0];
    if (key === 'summary') return DEMO.summary;
    if (key === 'leads')   return DEMO.leads;
    if (key === 'jobs')    return DEMO.jobs;
    if (key === 'clients') return DEMO.clients;
    if (key === 'team')    return DEMO.team;
    if (key === 'alerts')  return DEMO.alerts;
    if (key === 'marketing') return DEMO.marketing;
    if (key === 'settings')   return DEMO.settings;
    if (key === 'approvals')  return DEMO.approvals;
    if (key === 'inventory')  return DEMO.inventory;
    if (key === 'equipment')  return DEMO.equipment;
    if (key.startsWith('phases')) {
      const jobId = new URLSearchParams('?' + path.split('?')[1]).get('jobId') || '';
      return DEMO.phases[jobId] || [];
    }
    return null;
  }
}

function setConnDot(state) {
  const dot = document.getElementById('connDot');
  if (!dot) return;
  dot.className = 'conn-dot ' + state;
  dot.title = state === 'live' ? 'Connected to database ✓'
            : state === 'demo' ? 'Demo mode — not connected'
            : 'Connection error';
}

/* ─── NAVIGATION ────────────────────────────────────────────────── */
const PAGE_TITLES = {
  dashboard: 'Dashboard', leads: 'Leads', jobs: 'Jobs',
  clients: 'Clients', alerts: 'Alerts', team: 'Team',
  marketing: 'Marketing', settings: 'Settings', approvals: 'Approvals',
  conversations: 'Conversations', agents: 'AI Agents', more: 'More',
  inventory: 'Inventory & Materials', schedule: 'Schedule', analytics: 'Analytics',
  field: 'Job Site Estimate', recurring: 'Recurring Jobs',
  tasks: 'Tasks',
};

// Pages each role is allowed to access
const ROLE_PAGES = {
  owner: null, // null = all pages
  sales: new Set(['dashboard','leads','jobs','schedule','more','field','tasks','clients',
    'conversations','approvals','alerts']),
  field: new Set(['dashboard','jobs','schedule','more','tasks','alerts','team']),
};

function navigate(page) {
  // Role-based page guard
  const allowed = ROLE_PAGES[currentUser?.role];
  if (allowed && !allowed.has(page)) {
    toast('! You don\'t have access to that page');
    return;
  }

  // Update pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById('page-' + page);
  if (el) el.classList.add('active');

  // Update nav (bottom nav + sidebar)
  document.querySelectorAll('.nav-item').forEach(n => {
    n.classList.toggle('active', n.dataset.page === page);
  });
  document.querySelectorAll('.sidebar-item').forEach(n => {
    n.classList.toggle('active', n.dataset.page === page);
  });

  // Update title
  document.getElementById('pageTitle').textContent = PAGE_TITLES[page] || page;

  // Load data on first visit
  if (!loaded[page]) {
    loaded[page] = true;
    if (page === 'dashboard') loadDashboard();
    else if (page === 'leads') loadLeads();
    else if (page === 'jobs') loadJobs();
    else if (page === 'clients') loadClients();
    else if (page === 'alerts') loadAlerts();
    else if (page === 'team') loadTeam();
    else if (page === 'marketing') loadMarketing();
    else if (page === 'settings') loadSettings();
    else if (page === 'approvals')     loadApprovals();
    else if (page === 'conversations') { loadConversations(); loadSmsConversations(); }
    else if (page === 'field')         loadField();
    else if (page === 'analytics')     loadAnalytics();
    else if (page === 'schedule')      loadSchedule();
    else if (page === 'inventory')     loadInventory();
    else if (page === 'recurring')     loadRecurring();
    else if (page === 'tasks')         loadTasks();
  }
}

async function refreshAll() {
  const btn = document.getElementById('refreshBtn');
  btn.classList.add('spinning');
  Object.keys(loaded).forEach(k => delete loaded[k]);
  allLeads = []; allJobs = []; allClients = []; allTeam = []; allMarketing = []; allApprovals = [];

  // Reload current page
  const active = document.querySelector('.page.active');
  if (active) {
    const page = active.id.replace('page-', '');
    navigate(page);
  }

  setTimeout(() => btn.classList.remove('spinning'), 800);
  toast(usingDemo ? '✓ Demo data refreshed' : '✓ Data refreshed');
}

/* ─── SETUP WIZARD ──────────────────────────────────────────────── */
function dismissWizard() {
  try { localStorage.setItem('wizardDismissed', '1'); } catch (_) {}
  const el = document.getElementById('setupWizard');
  if (el) el.style.display = 'none';
}

function renderSetupWizard(summaryData, settingsData) {
  // Only show to owner role
  if (currentUser.role !== 'owner') return;
  // Don't show if dismissed OR if all steps are done (demo-ready)
  try { if (localStorage.getItem('wizardDismissed') === '1') return; } catch (_) {}
  // Auto-hide for demo: if connected to real DB, skip wizard
  if (!usingDemo) { try { localStorage.setItem('wizardDismissed', '1'); } catch(_) {} }

  const el = document.getElementById('setupWizard');
  if (!el) return;

  const appUrl = location.origin;
  const companyName = summaryData?.companyName || settingsData?.companyName || '';
  const calendlySet  = !!(settingsData?.calendlyLink);
  const hasLeads     = (summaryData?.totalLeads || summaryData?.newLeadsThisMonth || summaryData?.newLeads || 0) > 0;

  const steps = [
    {
      id: 'sheet',
      name: 'Connect your Google Sheet',
      desc: 'Set SHEET_ID in Railway variables so live data flows in',
      action: '→ Railway',
      done: !usingDemo,
      onclick: null,
    },
    {
      id: 'settings',
      name: 'Fill in business settings',
      desc: 'Company name, phone, email, signature, email tone',
      action: '→ Go to Settings',
      done: !!(companyName && companyName !== '—' && companyName !== 'Landcare Unlimited'),
      onclick: `navigate('settings')`,
    },
    {
      id: 'tally',
      name: 'Connect your lead form webhook',
      desc: `Tally → Integrations → Webhooks → ${appUrl}/webhook/new-lead`,
      action: '→ Copy URL',
      done: hasLeads && !usingDemo,
      onclick: `navigator.clipboard?.writeText('${appUrl}/webhook/new-lead').then(()=>toastSuccess('Webhook URL copied!')).catch(()=>toastInfo('${appUrl}/webhook/new-lead'))`,
    },
    {
      id: 'calendly',
      name: 'Add your Calendly booking link',
      desc: 'Agents include it in every outreach email automatically',
      action: '→ Go to Settings',
      done: calendlySet && !usingDemo,
      onclick: `navigate('settings')`,
    },
    {
      id: 'lead',
      name: 'Receive your first real lead',
      desc: 'Submit a test entry through your form to verify the full flow',
      action: '→ Test now',
      done: hasLeads && !usingDemo,
      onclick: null,
    },
  ];

  const doneCount = steps.filter(s => s.done).length;

  // Hide wizard if all done (auto-dismiss)
  if (doneCount === steps.length) {
    dismissWizard();
    return;
  }

  el.style.display = 'block';

  document.getElementById('setupProgress').textContent = `${doneCount} of ${steps.length} steps complete`;

  document.getElementById('setupSteps').innerHTML = steps.map(s => `
    <div class="setup-step ${s.done ? 'done' : ''}" ${s.onclick ? `onclick="${s.onclick}"` : ''}>
      <div class="setup-step-icon">${s.done ? '✓' : ''}</div>
      <div class="setup-step-body">
        <div class="setup-step-name">${s.name}</div>
        <div class="setup-step-desc">${s.desc}</div>
      </div>
      ${!s.done && s.action ? `<div class="setup-step-action">${s.action}</div>` : ''}
    </div>
  `).join('');
}

/* ─── DASHBOARD ─────────────────────────────────────────────────── */
async function loadDashboard() {
  // Greeting + today's date
  const todayLabel = new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' });
  const greetName  = currentUser.name && currentUser.name !== 'Owner' ? `, ${currentUser.name}` : '';
  document.getElementById('greetSub').textContent = greet() + greetName;
  const tlEl = document.getElementById('dashTodayLabel');
  if (tlEl) tlEl.textContent = todayLabel;

  // Quick actions render immediately (no async needed — role is known)
  renderDashQuickActions(currentUser.role);

  // Show skeleton in activity feed while loading
  const feedEl = document.getElementById('activityFeed');
  if (feedEl) feedEl.innerHTML = Array.from({length:4}, () =>
    `<div class="skeleton-item" style="padding:10px 0;border:none">
       <div style="width:8px;height:8px;border-radius:50%;background:var(--card2);flex-shrink:0;margin-top:3px"></div>
       <div class="skeleton-body"><div class="skeleton-line" style="width:70%"></div><div class="skeleton-line" style="width:30%;margin-top:5px"></div></div>
     </div>`).join('');

  // Today's schedule strip + summary in parallel
  const [data] = await Promise.all([
    api('/api/summary'),
    loadTodayStrip(),
  ]);
  if (!data) return;

  const cn = data.companyName || '—';
  document.getElementById('companyName').textContent = cn;
  if (cn !== '—') document.title = cn + ' CRM';
  // Update sidebar company name
  const sbn = document.getElementById('sidebarCompanyName');
  if (sbn && cn !== '—') sbn.textContent = cn;

  // Role-specific KPIs
  renderDashKPIs(data, currentUser.role);

  // Activity feed
  const feed = document.getElementById('activityFeed');
  const items = data.recentActivity || data.activity || [];
  if (items.length === 0) {
    feed.innerHTML = '<div class="empty-notes" style="color:var(--text3);font-size:13px">No recent activity</div>';
  } else {
    feed.innerHTML = items.map(a => `
      <div class="activity-item">
        <div class="activity-dot"></div>
        <div>
          <div class="activity-text">${a.text}</div>
          <div class="activity-time">${a.time}</div>
        </div>
      </div>
    `).join('');
  }

  // Load alerts + approvals + settings (for wizard) in parallel
  const [alerts, pending, wizSettings] = await Promise.all([
    loaded['alerts-count']   ? Promise.resolve(null) : api('/api/alerts').catch(() => []),
    loaded['approvals-count'] || currentUser.role === 'field'
      ? Promise.resolve(null)
      : api('/api/approvals').catch(() => []),
    currentUser.role === 'owner' ? api('/api/settings').catch(() => null) : Promise.resolve(null),
  ]);

  // Cache company email for conversation AI badges
  if (wizSettings) window._companyEmail = (wizSettings.email || '').toLowerCase();
  // Show setup wizard for owners who haven't finished configuration
  if (currentUser.role === 'owner') renderSetupWizard(data, wizSettings);

  let urgentCount = 0, approvalCount = 0;

  if (alerts !== null) {
    loaded['alerts-count'] = true;
    urgentCount = (alerts || []).filter(a => a.type === 'urgent').length;
    const topBadge = document.getElementById('alertBadge');
    const navDot   = document.getElementById('alertsNavDot');
    if (urgentCount > 0) {
      if (topBadge) topBadge.style.display = 'block';
      if (navDot)   navDot.style.display   = 'block';
    }
  }

  if (pending !== null) {
    loaded['approvals-count'] = true;
    approvalCount = (pending || []).length;
    const moreDesc = document.getElementById('moreApprovalDesc');
    if (moreDesc) moreDesc.textContent = approvalCount > 0 ? `${approvalCount} waiting` : 'Review queue';
  }

  // Render the status pills row
  renderDashPills(urgentCount, approvalCount, currentUser.role);

  // Load outstanding invoices for owner
  if (currentUser.role === 'owner') loadDashInvoices();

  // Load tasks for the dashboard tasks strip
  loadTasks();

  // Load recurring services + QB invoices for dashboard
  loadDashRecurring();
  loadDashQBInvoices();
}

async function loadDashInvoices() {
  const el = document.getElementById('dashInvoices');
  if (!el) return;
  try {
    const invoices = await api('/api/invoices/outstanding').catch(() => []);
    if (!invoices || !invoices.length) {
      el.innerHTML = '<div style="text-align:center;padding:16px;color:var(--text3);font-size:13px">No outstanding invoices</div>';
      return;
    }
    el.innerHTML = invoices.map(inv => {
      const days = inv.daysOverdue || 0;
      const color = days > 7 ? 'var(--red, #ef4444)' : days > 3 ? 'var(--gold)' : 'var(--green)';
      const statusText = inv.status === 'paid' ? 'Paid' : days > 0 ? days + 'd overdue' : 'Sent';
      return `<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">
        <div style="width:8px;height:8px;border-radius:50%;background:${color};flex-shrink:0"></div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:600;color:var(--text1)">${inv.clientName || 'Unknown'}</div>
          <div style="font-size:11px;color:var(--text3)">${inv.jobRef || ''} — ${inv.invoiceType || 'Invoice'}</div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-size:14px;font-weight:700;color:var(--text1)">${formatCurrency(inv.amount)}</div>
          <div style="font-size:11px;font-weight:600;color:${color}">${statusText}</div>
        </div>
      </div>`;
    }).join('');
  } catch (e) { el.innerHTML = ''; }
}

/* ─── DASHBOARD: RECURRING SERVICES ────────────────────────────── */
async function loadDashRecurring() {
  const el = document.getElementById('dashRecurring');
  if (!el) return;
  try {
    const data = await api('/api/recurring').catch(() => []);
    if (!data || !data.length) {
      el.innerHTML = '<div style="text-align:center;padding:12px;color:var(--text3);font-size:13px">No recurring services set up</div>';
      return;
    }
    const active = data.filter(r => r.status === 'active' || r.active);
    el.innerHTML = active.slice(0, 4).map(r => {
      const nextRun = r.nextRunDate || r.next_run;
      const freq = r.frequency || r.interval || '';
      const isOverdue = nextRun && new Date(nextRun) < new Date();
      return `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:600;color:var(--text)">${r.name || r.clientName || 'Service'}</div>
          <div style="font-size:11px;color:var(--text3)">${r.service || r.type || ''} · ${freq}</div>
        </div>
        <div style="text-align:right">
          ${nextRun ? `<div style="font-size:11px;font-weight:600;color:${isOverdue ? 'var(--red)' : 'var(--text3)'}">${isOverdue ? 'Overdue' : 'Next: ' + new Date(nextRun).toLocaleDateString('en-US', {month:'short',day:'numeric'})}</div>` : ''}
          ${r.amount || r.value ? `<div style="font-size:12px;font-weight:700;color:var(--gold)">${formatCurrency(r.amount || r.value)}</div>` : ''}
        </div>
      </div>`;
    }).join('') + (active.length > 4 ? `<div style="text-align:center;padding:8px;font-size:12px;color:var(--gold);cursor:pointer" onclick="navigate('recurring')">+${active.length - 4} more →</div>` : '');
  } catch (e) {
    el.innerHTML = '<div style="font-size:13px;color:var(--text3)">No recurring services</div>';
  }
}

/* ─── DASHBOARD: QB OUTSTANDING INVOICES ───────────────────────── */
async function loadDashQBInvoices() {
  const el = document.getElementById('dashQBInvoices');
  if (!el) return;
  try {
    const invoices = await api('/api/quickbooks/invoices').catch(() => []);
    if (!invoices || !invoices.length) {
      // Fall back to local invoices
      const local = await api('/api/invoices/outstanding').catch(() => []);
      if (!local?.length) {
        el.innerHTML = '<div style="text-align:center;padding:12px;color:var(--text3);font-size:13px">No outstanding invoices</div>';
        return;
      }
      el.innerHTML = local.slice(0, 4).map(inv => `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
        <div style="width:8px;height:8px;border-radius:50%;background:${inv.daysOverdue > 7 ? 'var(--red)' : inv.daysOverdue > 3 ? 'var(--gold)' : 'var(--green)'};flex-shrink:0"></div>
        <div style="flex:1"><div style="font-size:13px;font-weight:600;color:var(--text)">${inv.clientName || ''}</div><div style="font-size:11px;color:var(--text3)">${inv.jobRef || ''} · ${inv.invoiceType || ''}</div></div>
        <div style="font-size:13px;font-weight:700;color:var(--gold)">${formatCurrency(inv.amount)}</div>
      </div>`).join('');
      return;
    }
    el.innerHTML = invoices.slice(0, 4).map(inv => `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
      <div style="width:8px;height:8px;border-radius:50%;background:${inv.overdue ? 'var(--red)' : 'var(--green)'};flex-shrink:0"></div>
      <div style="flex:1"><div style="font-size:13px;font-weight:600;color:var(--text)">${inv.customerName}</div><div style="font-size:11px;color:var(--text3)">#${inv.number} · Due ${new Date(inv.dueDate).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</div></div>
      <div style="text-align:right"><div style="font-size:13px;font-weight:700;color:var(--gold)">${formatCurrency(inv.balance)}</div>${inv.overdue ? '<div style="font-size:10px;color:var(--red);font-weight:600">OVERDUE</div>' : ''}</div>
    </div>`).join('');
  } catch(e) {
    el.innerHTML = '<div style="font-size:13px;color:var(--text3)">No outstanding invoices</div>';
  }
}

/* ─── FORMAT HELPERS ────────────────────────────────────────────── */
function formatCurrency(val) {
  if (!val && val !== 0) return '—';
  const n = typeof val === 'string' ? parseFloat(val.replace(/[$,]/g, '')) : val;
  if (isNaN(n)) return val;
  if (n >= 1000000) return '$' + (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return '$' + Math.round(n / 1000) + 'k';
  return '$' + n.toLocaleString();
}

function scoreClass(score, label) {
  const s = parseInt(score) || 0;
  const lbl = (label || '').toLowerCase();
  if (lbl === 'hot' || s >= 80) return 'hot';
  if (lbl === 'warm' || s >= 50) return 'warm';
  if (lbl === 'cold' || s >= 1)  return 'cold';
  return 'none';
}

function scoreBadgeClass(sc) {
  if (sc === 'hot')  return 'badge-red';
  if (sc === 'warm') return 'badge-yellow';
  if (sc === 'cold') return 'badge-blue';
  return 'badge-gray';
}

function statusBadge(status) {
  const s = (status || '').toLowerCase();
  if (s.includes('progress') || s.includes('active')) return `<span class="badge badge-blue">${status}</span>`;
  if (s.includes('complete') || s.includes('paid') || s.includes('signed')) return `<span class="badge badge-green">${status}</span>`;
  if (s.includes('new') || s.includes('pending')) return `<span class="badge badge-yellow">${status}</span>`;
  if (s.includes('lost') || s.includes('overdue')) return `<span class="badge badge-red">${status}</span>`;
  if (s.includes('proposal') || s.includes('invoiced')) return `<span class="badge badge-gold">${status}</span>`;
  if (s.includes('booked') || s.includes('consultat')) return `<span class="badge badge-gold">${status}</span>`;
  return `<span class="badge badge-gray">${status || 'No Status'}</span>`;
}

function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
}

function g(row, ...keys) {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== '') return row[k];
  }
  return '';
}

/* ─── LEADS PAGE ────────────────────────────────────────────────── */
/* ─── ADD LEAD ──────────────────────────────────────────────────── */
function showAddLead() {
  ['newLeadName','newLeadPhone','newLeadEmail','newLeadService','newLeadAddress','newLeadMessage'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  openModal('addLeadModal');
}

async function saveNewLead() {
  const name = document.getElementById('newLeadName')?.value?.trim();
  if (!name) { toast('× Name is required'); return; }
  const data = {
    name,
    phone:   document.getElementById('newLeadPhone')?.value?.trim() || '',
    email:   document.getElementById('newLeadEmail')?.value?.trim() || '',
    service: document.getElementById('newLeadService')?.value?.trim() || '',
    address: document.getElementById('newLeadAddress')?.value?.trim() || '',
    message: document.getElementById('newLeadMessage')?.value?.trim() || '',
    source:  document.getElementById('newLeadSource')?.value || 'Manual Entry',
  };
  try {
    const result = await api('/api/leads', { method: 'POST', body: data });
    if (!result?.ok) throw new Error(result?.error || 'Failed');
    closeModal('addLeadModal');
    toast(`${name} added as a lead!`);
    delete loaded['leads'];
    await loadLeads();
  } catch (e) { toast('× ' + (e.message || 'Error adding lead')); }
}

/* ─── CREATE JOB ───────────────────────────────────────────────── */
async function showCreateJob() {
  // Populate client dropdown
  const sel = document.getElementById('newJobClient');
  if (sel) {
    const clients = await api('/api/clients').catch(() => []) || [];
    sel.innerHTML = '<option value="">— Select client —</option>' +
      clients.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  }
  ['newJobTitle','newJobDesc','newJobAddress','newJobValue','newJobStart'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  openModal('createJobModal');
}

async function saveNewJob() {
  const title = document.getElementById('newJobTitle')?.value?.trim();
  if (!title) { toast('× Job title is required'); return; }
  const data = {
    clientId:       document.getElementById('newJobClient')?.value || null,
    title,
    service:        title,
    description:    document.getElementById('newJobDesc')?.value?.trim() || '',
    address:        document.getElementById('newJobAddress')?.value?.trim() || '',
    estimatedValue: document.getElementById('newJobValue')?.value || null,
    startDate:      document.getElementById('newJobStart')?.value || null,
  };
  try {
    const result = await api('/api/jobs', { method: 'POST', body: data });
    if (!result?.ok) throw new Error(result?.error || 'Failed');
    closeModal('createJobModal');
    toast(`Job "${title}" created!`);
    delete loaded['jobs'];
    await loadJobs();
  } catch (e) { toast('× ' + (e.message || 'Error creating job')); }
}

let leadView = 'list'; // 'list' | 'pipeline'

function toggleLeadView() {
  leadView = leadView === 'list' ? 'pipeline' : 'list';
  const btn    = document.getElementById('leadViewBtn');
  const chips  = document.getElementById('leadFilterChips');
  if (btn)   btn.textContent   = leadView === 'list' ? 'Pipeline' : 'List';
  if (chips) chips.style.display = leadView === 'list' ? '' : 'none';
  renderLeads();
}

async function loadLeads() {
  document.getElementById('leadsList').innerHTML = skeletonList(6);
  const [leads, clients] = await Promise.all([
    api('/api/leads'),
    allClients.length ? Promise.resolve(allClients) : api('/api/clients')
  ]);
  allLeads = leads || [];
  if (!allClients.length) allClients = clients || [];
  renderLeads();
  updateLeadBadge();
}

function updateLeadBadge() {
  // Count new, uncontacted leads for the nav badge
  const uncontacted = allLeads.filter(l => {
    const status  = (g(l,'leadStatus','Status','Lead Status') || '').toLowerCase();
    const contact = g(l,'lastContact','Last Contact','Last Contacted') || '';
    return status === 'new' && !contact;
  }).length;
  const badge = document.getElementById('leadsNavBadge');
  if (badge) {
    badge.textContent = uncontacted || '';
    badge.style.display = uncontacted > 0 ? 'flex' : 'none';
  }
}

function setLeadFilter(btn) {
  document.querySelectorAll('#page-leads .chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  leadFilter = btn.dataset.filter;
  // Sync dropdown
  const sel = document.getElementById('leadFilterSelect');
  if (sel) sel.value = leadFilter;
  renderLeads();
}

function setLeadFilterFromSelect(sel) {
  leadFilter = sel.value;
  // Sync chips for backwards compat
  document.querySelectorAll('#page-leads .chip').forEach(c => {
    c.classList.toggle('active', c.dataset.filter === leadFilter);
  });
  renderLeads();
}

function filterLeads() { renderLeads(); }

function renderKanban() {
  const el = document.getElementById('leadsList');
  if (!el) return;
  const search = (document.getElementById('leadSearch')?.value || '').toLowerCase();
  const leads = allLeads.filter(l => {
    if (!search) return true;
    const name = (l.name || `${l.firstName||''} ${l.lastName||''}`).toLowerCase();
    const svc  = (l.projectType || l.serviceRequested || l.service || '').toLowerCase();
    return name.includes(search) || svc.includes(search);
  });

  const stages = [
    { key:'new',       label:'New',           color:'#3B82F6' },
    { key:'contacted', label:'Contacted',      color:'#F59E0B' },
    { key:'qualified', label:'Qualified',      color:'#8B5CF6' },
    { key:'proposal',  label:'Proposal Sent',  color:'#EC4899' },
    { key:'booked',    label:'Booked',         color:'#22C55E' },
    { key:'won',       label:'Won',            color:'#16A34A' },
    { key:'lost',      label:'Lost',           color:'#9CA3AF' },
  ];

  const buckets = {};
  stages.forEach(s => { buckets[s.key] = []; });
  leads.forEach(l => {
    const st = (g(l,'leadStatus','Status','status') || '').toLowerCase();
    if      (st.includes('converted') || st === 'won')          buckets.won.push(l);
    else if (st.includes('lost') || st === 'dead')              buckets.lost.push(l);
    else if (st.includes('contacted'))                          buckets.contacted.push(l);
    else if (st.includes('qualified'))                          buckets.qualified.push(l);
    else if (st.includes('proposal'))                           buckets.proposal.push(l);
    else if (st.includes('booked') || st.includes('consultat')) buckets.booked.push(l);
    else                                                         buckets.new.push(l);
  });

  // Helper: get budget value from a lead
  const getBudget = l => {
    const b = (g(l,'Budget','budget','estimatedValue') || '').toString().replace(/[^0-9.]/g,'');
    return parseFloat(b) || 0;
  };

  el.innerHTML = `
    <div style="overflow-x:auto;margin:0 -16px;padding:0 16px 20px">
      <div style="display:flex;gap:10px;min-width:max-content;padding-bottom:4px">
        ${stages.map(s => {
          const cards = buckets[s.key];
          const colTotal = cards.reduce((sum, l) => sum + getBudget(l), 0);
          const colTotalStr = colTotal >= 1000 ? '$' + Math.round(colTotal/1000) + 'k' : colTotal > 0 ? '$' + colTotal : '';
          return `
            <div class="kanban-col" data-stage="${s.key}"
                 ondragover="event.preventDefault();this.classList.add('kanban-col-hover')"
                 ondragleave="this.classList.remove('kanban-col-hover')"
                 ondrop="kanbanDrop(event,'${s.key}');this.classList.remove('kanban-col-hover')"
                 style="width:200px;flex-shrink:0;background:var(--card);border-radius:14px;border:1px solid var(--border);overflow:hidden;transition:border-color .15s">
              <div style="padding:11px 13px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--border)">
                <div style="display:flex;align-items:center;gap:7px">
                  <span style="width:8px;height:8px;border-radius:50%;background:${s.color};display:inline-block;flex-shrink:0"></span>
                  <span style="font-size:12px;font-weight:700;color:var(--text)">${s.label}</span>
                </div>
                <div style="display:flex;align-items:center;gap:6px">
                  ${colTotalStr ? `<span style="font-size:10px;font-weight:600;color:var(--text3)">${colTotalStr}</span>` : ''}
                  <span style="font-size:11px;font-weight:700;background:var(--card2);border-radius:99px;padding:2px 8px;color:var(--text3)">${cards.length}</span>
                </div>
              </div>
              <div class="kanban-drop-zone" style="padding:8px;display:flex;flex-direction:column;gap:7px;min-height:100px">
                ${cards.length === 0
                  ? `<div style="text-align:center;padding:18px 8px;color:var(--text3);font-size:11px;border:1.5px dashed var(--border);border-radius:8px;margin:4px 0">Drop here</div>`
                  : cards.map(l => {
                      const idx   = allLeads.indexOf(l);
                      const score = parseInt(g(l,'leadScore','score','Lead Score','AI Score') || 0);
                      const sc    = score >= 80 ? '#EF4444' : score >= 60 ? '#F59E0B' : '#6B7280';
                      const name  = g(l,'name','Name') || `${g(l,'firstName','First Name')||''} ${g(l,'lastName','Last Name')||''}`.trim() || 'Unknown';
                      const svc   = g(l,'projectType','serviceRequested','Service Requested','service','Project Type') || '';
                      const budget = getBudget(l);
                      const budgetStr = budget >= 1000 ? '$' + Math.round(budget/1000) + 'k' : budget > 0 ? '$' + budget : '';
                      return `
                        <div class="kanban-card" draggable="true"
                             ondragstart="kanbanDragStart(event,${idx})"
                             ondragend="this.style.opacity='1'"
                             onclick="showLeadDetail(${idx})"
                             style="background:var(--card2);border-radius:10px;padding:11px 12px;cursor:grab;border:1px solid var(--border);transition:opacity .15s,box-shadow .15s">
                          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:6px;margin-bottom:3px">
                            <div style="font-size:13px;font-weight:700;color:var(--text);line-height:1.3">${name}</div>
                            ${score ? `<div style="font-size:10px;font-weight:800;color:${sc};background:${sc}22;border-radius:5px;padding:2px 6px;flex-shrink:0">${score}</div>` : ''}
                          </div>
                          <div style="display:flex;align-items:center;justify-content:space-between">
                            <div style="font-size:11px;color:var(--text3)">${svc}</div>
                            ${budgetStr ? `<div style="font-size:11px;font-weight:600;color:var(--gold)">${budgetStr}</div>` : ''}
                          </div>
                        </div>`;
                    }).join('')
                }
              </div>
            </div>`;
        }).join('')}
      </div>
    </div>`;
}

/* ─── KANBAN DRAG & DROP ───────────────────────────────────────── */
let _kanbanDragIdx = null;
function kanbanDragStart(e, idx) {
  _kanbanDragIdx = idx;
  e.dataTransfer.effectAllowed = 'move';
  e.target.style.opacity = '0.5';
}

const KANBAN_STATUS_MAP = {
  new: 'New', contacted: 'Contacted', qualified: 'Qualified',
  proposal: 'Proposal Sent', booked: 'Consultation Booked',
  won: 'Converted', lost: 'Lost'
};

async function kanbanDrop(e, newStage) {
  e.preventDefault();
  if (_kanbanDragIdx === null) return;
  const lead = allLeads[_kanbanDragIdx];
  if (!lead) return;
  const row = lead.row || lead.id || _kanbanDragIdx;
  const newStatus = KANBAN_STATUS_MAP[newStage] || newStage;
  _kanbanDragIdx = null;

  // Optimistically update local data
  const statusKey = Object.keys(lead).find(k => /^(leadStatus|status|Status|Lead Status)$/.test(k));
  if (statusKey) lead[statusKey] = newStatus;
  renderKanban();

  // Persist to backend
  try {
    if (newStage === 'won') {
      await api(`/api/leads/${row}/convert`, { method: 'POST' });
    } else if (newStage === 'lost') {
      await api(`/api/leads/${row}/lost`, { method: 'POST' });
    } else {
      await api(`/api/leads/${row}`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ field: 'leadStatus', value: newStatus }) });
    }
    toast(`Lead moved to ${KANBAN_STATUS_MAP[newStage]}`);
  } catch (err) {
    toastError('Failed to update lead status');
    loadLeads(); // Revert on error
  }
}

function renderLeads() {
  // Update pipeline summary
  try {
    const totalEl = document.getElementById('leadTotalCount');
    const hotEl = document.getElementById('leadHotCount');
    const pipeEl = document.getElementById('leadPipelineVal');
    if (totalEl) totalEl.textContent = allLeads.length;
    if (hotEl) hotEl.textContent = allLeads.filter(l => parseInt(g(l,'Lead Score','leadScore','AI Score','Score') || 0) >= 80).length;
    if (pipeEl) {
      const total = allLeads.reduce((sum, l) => {
        const b = (g(l,'Budget','budget') || '').replace(/[^0-9.]/g,'');
        return sum + (parseFloat(b) || 0);
      }, 0);
      pipeEl.textContent = total >= 1000 ? '$' + Math.round(total/1000) + 'k' : '$' + total;
    }
  } catch(_) {}

  if (leadView === 'pipeline') { renderKanban(); return; }
  const search = (document.getElementById('leadSearch')?.value || '').toLowerCase();
  let leads = allLeads.filter(l => {
    const name = `${g(l,'First Name','firstName','first_name')} ${g(l,'Last Name','lastName','last_name')}`.toLowerCase();
    const project = g(l,'Service Requested','projectType','Project Type','Service Type').toLowerCase();
    const status = g(l,'Status','leadStatus','Lead Status').toLowerCase();
    const score = parseInt(g(l,'Lead Score','leadScore','AI Score') || 0);
    if (search && !name.includes(search) && !project.includes(search)) return false;
    if (leadFilter === 'all') return true;
    if (leadFilter === 'hot') return score >= 80;
    if (leadFilter === 'new') return status.includes('new');
    if (leadFilter === 'contacted') return status.includes('contacted');
    if (leadFilter === 'proposal') return status.includes('proposal');
    if (leadFilter === 'booked') return status.includes('booked') || status.includes('consultat') || status.includes('call');
    if (leadFilter === 'lost') return status.includes('lost');
    return true;
  });

  const el = document.getElementById('leadsList');
  if (leads.length === 0) {
    const isFiltered = leadFilter !== 'all' || search;
    el.innerHTML = `<div class="empty">
      <div class="empty-icon"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>
      <div class="empty-title">${isFiltered ? 'No leads match' : 'No leads yet'}</div>
      <div class="empty-sub">${isFiltered ? 'Clear the filter or try searching a different name' : 'New leads from your Tally form will appear here automatically'}</div>
    </div>`;
    return;
  }

  el.innerHTML = leads.map((l, i) => {
    const firstName = g(l,'First Name','firstName','first_name');
    const lastName  = g(l,'Last Name','lastName','last_name');
    const name = `${firstName} ${lastName}`.trim() || 'Unknown Lead';
    const project = g(l,'Service Requested','projectType','Project Type','Service Type') || '—';
    const budget  = g(l,'Budget','budget');
    const score   = g(l,'Lead Score','leadScore','AI Score','Score');
    const status  = g(l,'Status','leadStatus','Lead Status');
    const phone   = g(l,'Phone Number','phone','Phone');
    const email   = g(l,'Email','email');
    const sc = scoreClass(score, '');
    const idx = allLeads.indexOf(l);

    const desc = g(l,'Project Description','Description','description') || '';

    const borderColor = sc==='hot'?'var(--red)':sc==='warm'?'var(--yellow)':sc==='cold'?'var(--blue)':'var(--border)';
    return `
      <div class="list-item" onclick="showLeadDetail(${idx})" style="border-left-color:${borderColor}">
        <div class="item-avatar" style="background:${sc==='hot'?'rgba(220,38,38,.06)':sc==='warm'?'rgba(217,119,6,.06)':'rgba(37,99,235,.06)'}">
          ${initials(name)}
        </div>
        <div class="item-body">
          <div class="item-name">${name}</div>
          <div class="item-sub">${project}${phone?' · '+phone:''}</div>
          ${desc ? `<div class="item-sub" style="margin-top:2px;color:var(--text3);font-size:12px">${desc.length>60?desc.slice(0,60)+'…':desc}</div>` : ''}
        </div>
        <div class="item-right">
          ${score ? `<div class="badge badge-${sc==='hot'?'red':sc==='warm'?'yellow':sc==='cold'?'blue':'gray'}" style="margin-bottom:4px">${score}</div>` : ''}
          ${statusBadge(status)}
        </div>
        <span class="chevron">›</span>
      </div>
    `;
  }).join('');
}

function showLeadDetail(idx) {
  _currentLeadIdx = idx;
  const l = allLeads[idx];
  if (!l) return;
  const firstName = g(l,'First Name','firstName','first_name');
  const lastName  = g(l,'Last Name','lastName','last_name');
  const name   = `${firstName} ${lastName}`.trim() || 'Unknown Lead';
  const email  = g(l,'Email','email');
  const phone  = g(l,'Phone Number','phone','Phone');
  const status = g(l,'Status','leadStatus','Lead Status');
  const project= g(l,'Service Requested','projectType','Project Type','Service Type');
  const budget = g(l,'Budget','budget');
  const score  = g(l,'Lead Score','leadScore','AI Score','Score');
  const notes  = g(l,'Notes','notes','Agent Notes','Qualifying Notes');
  const rep    = g(l,'Assigned Salesmen','assignedRep','Assigned Rep','Salesperson');
  const ts     = g(l,'Timestamp','timestamp','Submitted','Date');
  const last   = g(l,'Last Contact','lastContact','Last Contacted');
  const sc     = scoreClass(score, '');
  const label  = sc === 'hot' ? 'Hot' : sc === 'warm' ? 'Warm' : sc === 'cold' ? 'Cold' : '';

  document.getElementById('lmRing').className = 'score-ring ' + sc;
  document.getElementById('lmRing').textContent = score || '—';
  document.getElementById('lmName').textContent = name;
  document.getElementById('lmSub').textContent  = project || status || '—';
  document.getElementById('lmCall').href  = phone ? 'tel:' + phone.replace(/\D/g,'') : '#';
  document.getElementById('lmEmail').href = email ? 'mailto:' + email : '#';

  const desc = g(l,'Project Description','Description','description','Project Details');

  document.getElementById('lmBody').innerHTML = `
    <div class="modal-section">
      <div class="modal-section-label">Lead Details</div>
      <div class="detail-row"><div class="detail-key">Status</div><div class="detail-val">${statusBadge(status)}</div></div>
      <div class="detail-row"><div class="detail-key">Project</div><div class="detail-val">${project||'—'}</div></div>
      ${desc ? `<div class="detail-row"><div class="detail-key">Description</div><div class="detail-val" style="text-align:left;color:var(--text2);font-size:13px;font-weight:400">${desc}</div></div>` : ''}
      <div class="detail-row"><div class="detail-key">Budget</div><div class="detail-val text-gold fw800">${budget||'—'}</div></div>
      <div class="detail-row"><div class="detail-key">AI Score</div><div class="detail-val"><span class="badge badge-${sc==='hot'?'red':sc==='warm'?'yellow':sc==='cold'?'blue':'gray'}">${score||'—'} ${label||''}</span></div></div>
      <div class="detail-row"><div class="detail-key">Assigned To</div><div class="detail-val">${rep||'Unassigned'}</div></div>
      <div class="detail-row"><div class="detail-key">Last Contact</div><div class="detail-val">${last||'Never'}</div></div>
      <div class="detail-row"><div class="detail-key">Submitted</div><div class="detail-val">${ts||'—'}</div></div>
      <div class="detail-row"><div class="detail-key">Phone</div><div class="detail-val">${phone||'—'}</div></div>
      <div class="detail-row"><div class="detail-key">Email</div><div class="detail-val" style="word-break:break-all">${email||'—'}</div></div>
      <div class="detail-row">
        <div class="detail-key">Referred By</div>
        <div class="detail-val">
          <select id="lmReferralClient" onchange="setLeadReferral(${l._row||l.__row||idx},this.value)" style="padding:6px 10px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text);font-size:13px;min-width:140px">
            <option value="">None</option>
            ${(allClients||[]).map(c => {
              const cName = c.name || c.clientName || c['Client Name'] || 'Unknown';
              const cId = c.id || c._row || c.__row;
              const isSelected = (l.referralClientId || l.referral_client_id) == cId;
              return '<option value="'+cId+'"'+(isSelected?' selected':'')+'>'+cName+'</option>';
            }).join('')}
          </select>
        </div>
      </div>
    </div>
    <div class="modal-section">
      <div class="modal-section-label">Notes</div>
      <textarea class="note-editor" id="lmNoteText" placeholder="Add a note after your call…">${notes||''}</textarea>
      <button class="save-note-btn" onclick="saveLeadNote()">Save Note</button>
    </div>
  `;

  // Handle convert / lost / calendly button states
  const convertBtn  = document.getElementById('lmConvertBtn');
  const lostBtn     = document.getElementById('lmLostBtn');
  const calendlyBtn = document.getElementById('lmCalendly');
  const isConverted = (status || '').toLowerCase().includes('convert');
  const isLost      = (status || '').toLowerCase().includes('lost');

  if (isConverted) {
    convertBtn.textContent = '✓ Converted';
    convertBtn.disabled = true;
    convertBtn.className = 'btn btn-green';
  } else {
    convertBtn.innerHTML = 'Convert to Job';
    convertBtn.disabled = false;
    convertBtn.className = 'btn btn-green';
  }

  if (isLost) {
    lostBtn.textContent = '× Already Lost';
    lostBtn.disabled = true;
  } else {
    lostBtn.textContent = '× Lost';
    lostBtn.disabled = false;
  }

  // Calendly button — show only if settings has a link loaded
  if (_calendlyLink) {
    calendlyBtn.style.display = 'flex';
    calendlyBtn.href = _calendlyLink;
  } else {
    calendlyBtn.style.display = 'none';
  }

  openModal('leadModal');
}

/* ─── CONVERT LEAD ──────────────────────────────────────────────── */
let _currentLeadIdx = null;
let _currentJobRow  = null;

async function convertLead() {
  const lead = allLeads[_currentLeadIdx];
  if (!lead) return;

  const name = `${g(lead,'First Name','first_name','FirstName')} ${g(lead,'Last Name','last_name','LastName')}`.trim();
  const row  = lead.__row || lead._row;

  const btn = document.getElementById('lmConvertBtn');
  btn.textContent = '…';
  btn.disabled = true;

  try {
    if (!usingDemo) {
      const res = await fetch(`/api/leads/${row}/convert`, {
        method: 'POST', headers: {'Content-Type':'application/json'}, body: '{}'
      });
      if (!res.ok) throw new Error('API error');
    }

    // Update local state
    if (lead['Status'] !== undefined) lead['Status'] = 'Converted';
    if (lead['Lead Status'] !== undefined) lead['Lead Status'] = 'Converted';
    if (lead['leadStatus'] !== undefined) lead['leadStatus'] = 'Converted';

    btn.textContent = '✓ Converted!';
    btn.style.background = 'rgba(34,197,94,.25)';
    btn.style.color = 'var(--green)';

    toast(`${name} marked as Converted!`, 3000);

    // Re-render list behind modal
    renderLeads();

    // Close modal after a beat
    setTimeout(() => closeModal('leadModal'), 1200);

  } catch(e) {
    btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3 6h7l-5.5 4 2 7L12 15l-6.5 4 2-7L2 8h7z"/></svg> Mark as Converted';
    btn.disabled = false;
    toast('! Could not update — try again');
  }
}

/* ─── LOST LEAD ─────────────────────────────────────────────────── */
async function lostLead() {
  const lead = allLeads[_currentLeadIdx];
  if (!lead) return;
  const name = `${g(lead,'First Name','first_name','FirstName')} ${g(lead,'Last Name','last_name','LastName')}`.trim();
  const row  = lead.__row || lead._row;
  const btn  = document.getElementById('lmLostBtn');
  btn.textContent = '…'; btn.disabled = true;
  try {
    if (!usingDemo) {
      const res = await fetch(`/api/leads/${row}/lost`, { method:'POST', headers:{'Content-Type':'application/json'}, body:'{}' });
      if (!res.ok) throw new Error();
    }
    if (lead['Status'] !== undefined)      lead['Status'] = 'Lost';
    if (lead['Lead Status'] !== undefined) lead['Lead Status'] = 'Lost';
    if (lead['leadStatus'] !== undefined)  lead['leadStatus'] = 'Lost';
    btn.textContent = '× Marked Lost';
    toast(`${name} marked as Lost`);
    renderLeads();
    setTimeout(() => closeModal('leadModal'), 1000);
  } catch {
    btn.textContent = '× Lost'; btn.disabled = false;
    toast('! Could not update — try again');
  }
}

/* ─── SAVE LEAD NOTE ─────────────────────────────────────────────── */
async function setLeadReferral(leadRow, clientId) {
  try {
    await api(`/api/leads/${leadRow}`, {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ field: 'referral_client_id', value: clientId || null })
    });
    toast(clientId ? 'Referral source saved' : 'Referral cleared');
  } catch(e) {}
}

async function saveLeadNote() {
  const lead = allLeads[_currentLeadIdx];
  if (!lead) return;
  const row  = lead.__row || lead._row;
  const text = document.getElementById('lmNoteText')?.value || '';
  const btn  = document.querySelector('.save-note-btn');
  if (btn) { btn.textContent = '…'; btn.disabled = true; }
  try {
    if (!usingDemo) {
      const res = await fetch(`/api/leads/${row}/note`, {
        method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ note: text })
      });
      if (!res.ok) throw new Error();
    }
    // Update local state
    if (lead['Notes'] !== undefined)      lead['Notes'] = text;
    if (lead['Agent Notes'] !== undefined) lead['Agent Notes'] = text;
    if (lead['notes'] !== undefined)       lead['notes'] = text;
    if (btn) { btn.textContent = '✓ Saved!'; btn.style.color = 'var(--green)'; }
    toast('Save Note saved');
    setTimeout(() => {
      if (btn) { btn.textContent = 'Save Note'; btn.disabled = false; btn.style.color = ''; }
    }, 2000);
  } catch {
    if (btn) { btn.textContent = 'Save Note'; btn.disabled = false; }
    toast('! Could not save note');
  }
}

/* ─── JOBS PAGE ─────────────────────────────────────────────────── */
async function loadJobs() {
  document.getElementById('jobsList').innerHTML = skeletonList(5);
  allJobs = await api('/api/jobs') || [];
  renderJobs();
}

function setJobFilter(btn) {
  document.querySelectorAll('#page-jobs .chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  jobFilter = btn.dataset.filter;
  const sel = document.getElementById('jobFilterSelect');
  if (sel) sel.value = jobFilter;
  renderJobs();
}

function setJobFilterFromSelect(sel) {
  jobFilter = sel.value;
  document.querySelectorAll('#page-jobs .chip').forEach(c => {
    c.classList.toggle('active', c.dataset.filter === jobFilter);
  });
  renderJobs();
}

function filterJobs() { renderJobs(); }

function renderJobs() {
  const search = (document.getElementById('jobSearch')?.value || '').toLowerCase();
  let jobs = allJobs.filter(j => {
    const client = g(j,'Client Name','Client','client_name').toLowerCase();
    const project = g(j,'Project Type','Job Type','project_type').toLowerCase();
    const status = g(j,'Status','Job Status').toLowerCase();
    if (search && !client.includes(search) && !project.includes(search)) return false;
    if (jobFilter === 'all') return true;
    if (jobFilter === 'active') return status.includes('progress') || status.includes('active');
    if (jobFilter === 'planning') return status.includes('plan') || status.includes('pending');
    if (jobFilter === 'complete') return status.includes('complete');
    if (jobFilter === 'invoiced') return status.includes('invoic');
    return true;
  });

  const el = document.getElementById('jobsList');
  if (jobs.length === 0) {
    const isFiltered = jobFilter !== 'all' || search;
    el.innerHTML = `<div class="empty">
      <div class="empty-icon"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg></div>
      <div class="empty-title">${isFiltered ? 'No jobs match' : 'No active jobs'}</div>
      <div class="empty-sub">${isFiltered ? 'Try a different filter or search' : 'Jobs are created when a lead is converted. Convert a hot lead to get started.'}</div>
    </div>`;
    return;
  }

  el.innerHTML = jobs.map((j) => {
    const client  = g(j,'clientName','Client Name','Client') || `${g(j,'firstName','First Name')} ${g(j,'lastName','Last Name')}`.trim() || 'Unknown Client';
    const project = g(j,'serviceType','Service Type','Project Type') || '—';
    const value   = g(j,'totalJobValue','Total Job Value','Job Value','Contract Value');
    const status  = g(j,'jobStatus','Job Status','Status');
    const jobId   = g(j,'jobId','Job ID');
    const deposit = g(j,'depositPaid','Deposit Paid','Deposit Invoice Paid');
    const invoice = g(j,'finalPaid','Final Invoice Paid','Final Paid');
    const idx = allJobs.indexOf(j);

    let icons = '';
    if (deposit && deposit.toLowerCase().includes('paid')) icons += '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>';
    if (invoice && invoice.toLowerCase().includes('paid')) icons += '✓';
    if (invoice && invoice.toLowerCase().includes('overdue')) icons += '!';

    const st = (status||'').toLowerCase();
    const borderCol = st.includes('progress')||st.includes('active')?'var(--green)':st.includes('plan')||st.includes('pending')?'var(--yellow)':st.includes('complete')?'var(--blue)':'var(--border)';
    return `
      <div class="list-item" onclick="showJobDetail(${idx})" style="border-left-color:${borderCol}">
        <div class="item-avatar" style="font-size:22px;background:linear-gradient(135deg,rgba(45,122,30,0.05),rgba(45,122,30,0.01))"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg></div>
        <div class="item-body">
          <div class="item-name">${client}</div>
          <div class="item-sub">${project}${jobId?' · '+jobId:''}</div>
        </div>
        <div class="item-right">
          ${currentUser?.role !== 'field' ? `<div class="item-value">${value ? formatCurrency(value) : '—'}</div>` : ''}
          <div style="margin-top:4px">${statusBadge(status)}</div>
        </div>
        <span class="chevron">›</span>
      </div>
    `;
  }).join('');
}

// DB status value → display label mapping
const JOB_STATUS_LABELS = {
  pending:   'Planning',
  proposal:  'Proposal',
  active:    'In Progress',
  completed: 'Complete',
  invoiced:  'Invoiced',
};
// Display label → DB value mapping
const JOB_STATUS_DB = {
  'Planning':     'pending',
  'Proposal':     'proposal',
  'In Progress':  'active',
  'Complete':     'completed',
  'Invoiced':     'invoiced',
};

/* ─── TIER COMPARISON ──────────────────────────────────────────── */
function renderTierComparison(j) {
  const tiers = [
    { key: 'budget',   label: 'Budget',    color: '#22C55E', data: j.tierBudget || j.tier_budget },
    { key: 'midrange', label: 'Mid-Range',  color: '#3B82F6', data: j.tierMidrange || j.tier_midrange },
    { key: 'highend',  label: 'High-End',   color: '#F59E0B', data: j.tierHighend || j.tier_highend },
    { key: 'luxury',   label: 'Luxury',     color: '#EC4899', data: j.tierLuxury || j.tier_luxury },
  ];

  // Only show if at least one tier has data
  const hasTiers = tiers.some(t => t.data);
  if (!hasTiers) return '';

  const selected = (j.selectedTier || j.selected_tier || '').toLowerCase();
  const row = j._row || j.id;

  return `
    <div class="modal-section">
      <div class="modal-section-label">Estimate Tiers</div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;overflow-x:auto">
        ${tiers.map(t => {
          if (!t.data) return `<div style="background:var(--card2);border-radius:12px;padding:14px;text-align:center;border:1.5px solid var(--border);opacity:.4"><div style="font-size:12px;font-weight:700;color:var(--text3)">${t.label}</div><div style="font-size:11px;color:var(--text3);margin-top:4px">Not generated</div></div>`;
          let d;
          try { d = typeof t.data === 'string' ? JSON.parse(t.data) : t.data; } catch(_) { return ''; }
          const isSelected = selected === t.key;
          return `
            <div style="background:${isSelected ? t.color + '08' : 'var(--card2)'};border-radius:12px;padding:14px;text-align:center;border:1.5px solid ${isSelected ? t.color : 'var(--border)'};position:relative;transition:all .15s">
              ${isSelected ? `<div style="position:absolute;top:8px;right:8px;width:18px;height:18px;border-radius:50%;background:${t.color};display:flex;align-items:center;justify-content:center"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></div>` : ''}
              <div style="font-size:11px;font-weight:700;color:${t.color};text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">${t.label}</div>
              <div style="font-size:22px;font-weight:800;color:var(--text);margin-bottom:4px">${formatCurrency(d.total)}</div>
              <div style="font-size:11px;color:var(--text3);margin-bottom:8px;line-height:1.4;min-height:32px">${d.desc || ''}</div>
              <div style="border-top:1px solid var(--border);padding-top:8px;margin-top:4px">
                <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px"><span style="color:var(--text3)">Materials</span><span style="font-weight:600;color:var(--text)">${formatCurrency(d.materials)}</span></div>
                <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px"><span style="color:var(--text3)">Labor</span><span style="font-weight:600;color:var(--text)">${formatCurrency(d.labor)}</span></div>
                <div style="display:flex;justify-content:space-between;font-size:11px"><span style="color:var(--text3)">Overhead</span><span style="font-weight:600;color:var(--text)">${formatCurrency(d.overhead)}</span></div>
              </div>
              ${!isSelected ? `<button onclick="selectTier(${row},'${t.key}',${d.total})" style="margin-top:8px;width:100%;padding:6px;border:1px solid ${t.color};border-radius:8px;background:none;color:${t.color};font-size:11px;font-weight:700;cursor:pointer">Select</button>` : `<div style="margin-top:8px;font-size:11px;font-weight:700;color:${t.color}">Selected</div>`}
            </div>`;
        }).join('')}
      </div>
    </div>`;
}

async function selectTier(jobRow, tierKey, total) {
  try {
    await api(`/api/jobs/${jobRow}`, {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ field: 'selected_tier', value: tierKey })
    });
    // Update local data
    const job = allJobs.find(j => (j._row || j.id) === jobRow);
    if (job) { job.selectedTier = tierKey; job.selected_tier = tierKey; }
    toast(`${tierKey.charAt(0).toUpperCase() + tierKey.slice(1)} tier selected`);
    const idx = allJobs.indexOf(job);
    if (idx >= 0) showJobDetail(idx);
  } catch(e) { toastError('Failed to select tier'); }
}

async function showJobDetail(idx) {
  const j = allJobs[idx];
  if (!j) return;
  _currentJobRow = j._row || j.id;

  // Field extraction — uses direct formatJob field names with g() fallback
  const client   = j.clientName  || g(j,'Client Name','Client') || 'Unknown';
  const project  = j.serviceType || j['Project Type'] || j.service || j.title || '—';
  const jobId    = j.jobId       || j['Job ID'] || '';
  const numericId= j.id;                          // ← numeric DB id for phases
  const status   = j.status      || j.jobStatus  || '';
  const address  = j.address     || '';
  const start    = j.startDate   || '';
  const end      = j.endDate     || '';
  const notes    = j.notes       || '';
  const estVal   = j.estimatedValue || j.totalJobValue || 0;
  const actVal   = j.actualValue    || 0;
  const matCost  = j.materialCost   || 0;
  const labCost  = j.laborCost      || 0;
  const margin   = j.profitMargin   || 0;
  const depAmt   = j.depositAmount  || 0;
  const depPaid  = j.depositPaid    || 'No';
  const propStat = j.proposalStatus  || '';
  const contStat = j.contractStatus  || '';
  const estLink  = j.estimateLink    || '';
  const propLink = j.proposalLink    || (j.proposalToken ? `/proposal/${j.proposalToken}` : '');
  const contLink = j.contractLink    || '';
  const kickLink = j.kickoffLink     || '';

  window._openJobRow    = _currentJobRow;
  window._openJobId     = jobId;
  window._openJobClient = client;

  document.getElementById('jmTitle').textContent = client;
  document.getElementById('jmSub').textContent   = `${project}${jobId ? ' · ' + jobId : ''}`;

  // ── Load phases using numeric job id ─────────────────────────────
  let phasesHTML = '<div style="color:var(--text3);font-size:13px;padding:4px 0">No phases yet</div>';
  if (numericId) {
    try {
      const phaseData = await api('/api/phases?jobId=' + numericId) || [];
      if (phaseData.length > 0) {
        const total    = phaseData.length;
        const done_ct  = phaseData.filter(p => p.status === 'completed').length;
        const pct      = Math.round((done_ct / total) * 100);
        const barColor = pct === 100 ? 'var(--green)' : 'var(--gold)';
        phasesHTML = `
          <div style="margin-bottom:12px">
            <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text2);margin-bottom:6px">
              <span>${done_ct} of ${total} phases complete</span><span style="font-weight:700;color:${barColor}">${pct}%</span>
            </div>
            <div style="height:6px;background:var(--card2);border-radius:3px;overflow:hidden">
              <div style="height:100%;width:${pct}%;background:${barColor};border-radius:3px;transition:width .4s"></div>
            </div>
          </div>
          ${phaseData.map(p => {
            const isDone   = p.status === 'completed';
            const isActive = p.status === 'in_progress';
            const pRow     = p._row || p.id;
            const dateLabel = isDone && p.completedAt
              ? new Date(p.completedAt).toLocaleDateString('en-US',{month:'short',day:'numeric'})
              : isActive ? 'In progress' : 'Pending';
            return `
              <div class="phase-item" id="phase-row-${pRow}">
                <div class="phase-check ${isDone?'done':''}" onclick="togglePhase(${pRow}, this)">${isDone?'✓':isActive?'…':''}</div>
                <div class="phase-name" style="${isActive?'font-weight:700;color:var(--text)':''}">${p.name||'—'}<span style="font-weight:400;color:var(--gold);font-size:11px;margin-left:6px;cursor:pointer;text-decoration:underline dotted" onclick="event.stopPropagation();editPhaseAssignment(${pRow},'${(p.assignedTo||'').replace(/'/g,"\\'")}')" title="Click to reassign">${p.assignedTo ? '· '+p.assignedTo : '+ assign'}</span></div>
                <div class="phase-date" style="${isActive?'color:var(--blue)':''}">${dateLabel}</div>
              </div>`;
          }).join('')}`;
      }
    } catch(e) { console.warn('phases error', e); }
  }

  // ── Status switcher ───────────────────────────────────────────────
  const statusLabels = ['Planning','Proposal','In Progress','Complete','Invoiced'];
  const statusSwitcher = `
    <div class="status-switcher">
      ${statusLabels.map(label => {
        const dbVal   = JOB_STATUS_DB[label] || label.toLowerCase();
        const isActive = status === dbVal ||
                         (label === 'In Progress' && status === 'active') ||
                         (label === 'Planning'    && status === 'pending');
        return `<button class="status-pill ${isActive?'active-pill':''}" onclick="changeJobStatus('${dbVal}', this, '${label}')">${label}</button>`;
      }).join('')}
    </div>`;

  // ── Financial summary ─────────────────────────────────────────────
  const grossProfit = estVal - matCost - labCost;
  const marginPct   = estVal > 0 ? Math.round((grossProfit / estVal) * 100) : (margin || 0);

  document.getElementById('jmBody').innerHTML = `
    <div class="modal-section">
      <div class="modal-section-label">Status</div>
      ${statusSwitcher}
    </div>

    ${currentUser?.role !== 'field' ? `<div class="modal-section" style="background:var(--card2);border:1px solid var(--border);border-radius:var(--r);padding:16px">
      <div class="modal-section-label" style="margin-bottom:12px"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg> Site Visit & Property Details</div>

      <!-- Row 1: Property basics -->
      <div style="display:flex;gap:8px;margin-bottom:10px">
        <div style="flex:1">
          <div style="font-size:11px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Lot Size</div>
          <input id="jmLotSize" placeholder="e.g. 0.5 acres" class="form-input" style="font-size:13px;width:100%" value="${j.lotSize || ''}">
        </div>
        <div style="flex:1">
          <div style="font-size:11px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Total Work Area (sq ft)</div>
          <input id="jmSqft" type="number" placeholder="e.g. 800" class="form-input" style="font-size:13px;width:100%" value="${j.squareFootage || ''}">
        </div>
        <div style="flex:1">
          <div style="font-size:11px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Client Budget</div>
          <input id="jmClientBudget" placeholder="e.g. $25,000" class="form-input" style="font-size:13px;width:100%" value="${j.clientBudget || ''}">
        </div>
      </div>

      <!-- Row 2: Work areas -->
      <div style="margin-bottom:10px">
        <div style="font-size:11px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Work Areas & Dimensions</div>
        <textarea id="jmWorkAreas" placeholder="Patio: 20x25ft&#10;Walkway: 4x60ft&#10;Retaining wall: 40 linear ft x 4ft high&#10;Planting beds: 200 sq ft" rows="3" class="form-input" style="font-size:13px">${j.workAreas || j.siteVisitMeasurements || ''}</textarea>
      </div>

      <!-- Row 3: Conditions -->
      <div style="display:flex;gap:8px;margin-bottom:10px">
        <div style="flex:1">
          <div style="font-size:11px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Soil Conditions</div>
          <select id="jmSoil" class="form-input" style="font-size:13px;width:100%">
            <option value="">Select...</option>
            <option value="Good - well drained" ${j.soilConditions?.includes('Good')?'selected':''}>Good - well drained</option>
            <option value="Clay - poor drainage" ${j.soilConditions?.includes('Clay')?'selected':''}>Clay - poor drainage</option>
            <option value="Rocky" ${j.soilConditions?.includes('Rocky')?'selected':''}>Rocky</option>
            <option value="Sandy" ${j.soilConditions?.includes('Sandy')?'selected':''}>Sandy</option>
            <option value="Wet / swampy" ${j.soilConditions?.includes('Wet')?'selected':''}>Wet / swampy</option>
            <option value="Unknown - needs testing" ${j.soilConditions?.includes('Unknown')?'selected':''}>Unknown - needs testing</option>
          </select>
        </div>
        <div style="flex:1">
          <div style="font-size:11px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Preferred Tier</div>
          <select id="jmQuality" class="form-input" style="font-size:13px;width:100%">
            <option value="">Not specified</option>
            <option value="budget" ${j.qualityTier==='budget'?'selected':''}>Budget</option>
            <option value="mid-range" ${j.qualityTier==='mid-range'?'selected':''}>Mid-Range</option>
            <option value="high-end" ${j.qualityTier==='high-end'?'selected':''}>High-End</option>
            <option value="luxury" ${j.qualityTier==='luxury'?'selected':''}>Luxury</option>
          </select>
        </div>
      </div>

      <!-- Row 4: Access & Existing -->
      <div style="margin-bottom:10px">
        <div style="font-size:11px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Access Issues</div>
        <input id="jmAccess" placeholder="Narrow gate, steep slope, power lines, HOA restrictions..." class="form-input" style="font-size:13px;width:100%" value="${j.accessIssues || ''}">
      </div>

      <div style="margin-bottom:10px">
        <div style="font-size:11px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Existing Conditions to Remove</div>
        <input id="jmExisting" placeholder="Old concrete patio, dead trees, overgrown shrubs..." class="form-input" style="font-size:13px;width:100%" value="${j.existingConditions || ''}">
      </div>

      <!-- Row 5: Client preferences & notes -->
      <div style="margin-bottom:10px">
        <div style="font-size:11px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Client Preferences</div>
        <textarea id="jmPreferences" placeholder="Specific materials, plant types, colors, style (modern, natural, formal)..." rows="2" class="form-input" style="font-size:13px">${j.clientPreferences || ''}</textarea>
      </div>

      <div style="margin-bottom:12px">
        <div style="font-size:11px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Additional Notes</div>
        <textarea id="jmSiteNotes" placeholder="Anything else relevant — pets, sprinkler system, neighbor concerns..." rows="2" class="form-input" style="font-size:13px">${j.siteVisitNotes || ''}</textarea>
      </div>

      <!-- Action buttons -->
      <div style="display:flex;gap:8px">
        <button class="btn btn-secondary" style="flex:1;font-size:13px" onclick="saveSiteVisit(${_currentJobRow})">Save</button>
        ${!propLink ? '<button class="btn btn-primary" style="flex:1;font-size:13px" onclick="saveSiteVisitAndProposal('+_currentJobRow+')"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> Generate Proposal</button>'
        : j.selectedTier && !estLink ? '<button class="btn btn-primary" style="flex:1;font-size:13px" onclick="saveSiteVisitAndEstimate('+_currentJobRow+')"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/><line x1="12" y1="3" x2="12" y2="1"/><circle cx="8" cy="16" r="1" fill="currentColor"/><circle cx="16" cy="16" r="1" fill="currentColor"/></svg> Generate Estimate</button>'
        : '<div style="flex:1;text-align:center;padding:10px;font-size:12px;color:var(--text3)">'+(propLink && !j.selectedTier ? 'Waiting for client to select tier' : 'Docs generated')+'</div>'}
      </div>
      ${j.siteVisitDate ? '<div style="font-size:11px;color:var(--text3);margin-top:8px">Last site visit: '+j.siteVisitDate+'</div>' : ''}
    </div>` : ''}

    <!-- Tier comparison rendered by renderTierComparison() above -->

    ${currentUser?.role !== 'field' ? `<div class="modal-section">
      <div class="modal-section-label" style="display:flex;justify-content:space-between;align-items:center">
        <span><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg> Materials & Costs</span>
        <button style="font-size:11px;color:var(--gold);background:none;border:none;cursor:pointer;font-weight:700" onclick="addMaterialRow(${_currentJobRow})">+ Add Item</button>
      </div>
      <div id="jmMaterialsList" style="margin-top:8px">
        <div style="text-align:center;padding:16px;color:var(--text3);font-size:13px">Loading materials…</div>
      </div>
      <div id="jmMaterialsTotal" style="margin-top:8px"></div>
    </div>` : ''}

    <div class="modal-section">
      <div class="modal-section-label">Project Info</div>
      ${start    ? `<div class="detail-row"><div class="detail-key">Start Date</div><div class="detail-val">${start}</div></div>` : ''}
      ${end      ? `<div class="detail-row"><div class="detail-key">End Date</div><div class="detail-val">${end}</div></div>` : ''}
      ${address  ? `<div class="detail-row"><div class="detail-key">Address</div><div class="detail-val" style="font-size:13px">${address}</div></div>` : ''}
      ${propStat ? `<div class="detail-row"><div class="detail-key">Proposal</div><div class="detail-val">${statusBadge(propStat)}</div></div>` : ''}
      ${contStat ? `<div class="detail-row"><div class="detail-key">Contract</div><div class="detail-val">${statusBadge(contStat)}</div></div>` : ''}
    </div>

    ${currentUser?.role !== 'field' ? `<div class="modal-section">
      <div class="modal-section-label">Financials</div>
      <div class="detail-row"><div class="detail-key">Contract Value</div><div class="detail-val fw800" style="color:var(--gold)">${estVal ? formatCurrency(estVal) : '—'}</div></div>
      ${matCost ? `<div class="detail-row"><div class="detail-key">Materials</div><div class="detail-val">${formatCurrency(matCost)}</div></div>` : ''}
      ${labCost ? `<div class="detail-row"><div class="detail-key">Labor</div><div class="detail-val">${formatCurrency(labCost)}</div></div>` : ''}
      ${(matCost || labCost) ? `<div class="detail-row"><div class="detail-key">Gross Profit</div><div class="detail-val" style="color:var(--green)">${formatCurrency(grossProfit)} <span style="font-size:11px;color:var(--text3)">(${marginPct}%)</span></div></div>` : ''}
      <div class="detail-row"><div class="detail-key">Deposit</div><div class="detail-val">${depAmt ? formatCurrency(depAmt) : '—'} ${statusBadge(depPaid === 'Paid' ? 'Paid' : 'Pending')}</div></div>
    </div>` : ''}

    ${renderTierComparison(j)}

    ${currentUser?.role !== 'field' ? '<div class="modal-section"><div class="modal-section-label">Documents</div>' +
      [{name:'Proposal',icon:'<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',link:propLink,event:'generate_proposal',status:propStat,sendType:'proposal'},
       {name:'Estimate',icon:'<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',link:estLink,event:'estimate_ready',status:'',sendType:'estimate'},
       {name:'Contract',icon:'<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',link:contLink,event:'generate_contract',status:contStat,sendType:'contract'},
       {name:'Kickoff Doc',icon:'<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>',link:kickLink,event:'plan_project',status:'',sendType:''}
      ].map(d => {
        var btns = '';
        if (d.link) {
          btns += '<a class="doc-btn" href="'+d.link+'" target="_blank" style="font-size:11px">Open ↗</a>';
          if (d.sendType && (!d.status || d.status.toLowerCase().includes('pending') || d.status.toLowerCase().includes('ready'))) {
            btns += '<button class="doc-btn" style="color:#22C55E;cursor:pointer;font-size:11px;font-weight:700" onclick="approveAndSend(\''+d.sendType+'\','+_currentJobRow+')">Approve & Send ✓</button>';
          } else if (d.status && d.status.toLowerCase().includes('sent')) {
            btns += '<span style="color:var(--green);font-size:11px;font-weight:600">Sent ✓</span>';
          }
        } else {
          btns = '<button class="doc-btn" style="color:var(--gold);cursor:pointer" onclick="triggerDocGen(\''+d.event+'\','+_currentJobRow+')">Generate</button>';
        }
        return '<div class="doc-link"><div class="doc-icon">'+d.icon+'</div><div class="doc-name">'+d.name+'</div><div style="display:flex;gap:6px;align-items:center">'+btns+'</div></div>';
      }).join('') + '</div>' : ''}

    <div class="modal-section">
      <div class="modal-section-label">Phases</div>
      ${phasesHTML}
    </div>

    <div class="modal-section">
      <div class="modal-section-label">Notes</div>
      <textarea id="jmJobNotes" rows="3" class="note-editor" placeholder="Add notes about this job...">${(notes || '').replace(/</g,'&lt;')}</textarea>
      <button class="save-note-btn" onclick="saveJobNotes(${_currentJobRow})">Save Notes</button>
    </div>

    ${jobId ? `
    <div class="modal-section">
      <div class="modal-section-label">Client Status Page</div>
      <div style="display:flex;align-items:center;gap:10px;background:var(--card2);border:1px solid var(--border);border-radius:10px;padding:12px">
        <div style="flex:1;font-size:12px;color:var(--text2);word-break:break-all">${location.origin}/status/${jobId}</div>
        <button class="btn btn-secondary" style="padding:7px 12px;font-size:12px;flex-shrink:0" onclick="copyStatusLink('${jobId}')">Copy</button>
        <a href="/status/${jobId}" target="_blank" class="btn btn-secondary" style="padding:7px 12px;font-size:12px;flex-shrink:0;text-decoration:none">Open ↗</a>
      </div>
    </div>` : ''}

    <!-- Equipment Assignment -->
    <div class="modal-section">
      <div class="modal-section-label">Equipment</div>
      <div id="jmEquipment" style="font-size:13px;color:var(--text3)">Loading...</div>
    </div>

    <!-- Field Checklist -->
    <div class="modal-section">
      <div class="modal-section-label">Field Checklist</div>
      <div id="jmChecklist" style="font-size:13px;color:var(--text3)">Loading...</div>
    </div>

    <!-- Review Request (only for completed jobs) -->
    ${/completed|done|finished/i.test(status) ? `
    <div class="modal-section">
      <div class="modal-section-label">Client Review</div>
      <div style="display:flex;align-items:center;gap:10px">
        ${j.reviewRequested || j.review_requested ? `
          <div style="font-size:13px;color:var(--green);font-weight:600">Review requested ${j.reviewRequestedAt || j.review_requested_at ? 'on ' + new Date(j.reviewRequestedAt || j.review_requested_at).toLocaleDateString() : ''}</div>
          ${j.reviewRating || j.review_rating ? `<div style="font-size:14px;font-weight:800;color:var(--gold)">★ ${j.reviewRating || j.review_rating}/5</div>` : ''}
        ` : `
          <button class="btn btn-primary" style="font-size:13px;padding:8px 16px" onclick="requestReview(${numericId})">Request Google Review</button>
        `}
      </div>
    </div>` : ''}
  `;

  openModal('jobModal');

  // Load equipment and checklists for this job
  loadJobEquipment(numericId);
  loadJobChecklist(numericId);

  // Load materials asynchronously after modal opens
  if (currentUser?.role !== 'field') {
    loadJobMaterials(_currentJobRow);
  }
}

async function approveAndSend(docType, jobRow) {
  if (!confirm('Send this ' + docType + ' to the client? Make sure you\'ve reviewed the document first.')) return;
  try {
    const res = await api('/api/jobs/' + jobRow + '/approve-send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: docType }),
    });
    toast('✓ ' + docType.charAt(0).toUpperCase() + docType.slice(1) + ' approved and sent to client!');
    // Refresh job detail
    delete loaded['jobs'];
    allJobs = await api('/api/jobs').catch(() => allJobs) || allJobs;
    const idx = allJobs.findIndex(j => (j._row || j.id) === jobRow);
    if (idx >= 0) showJobDetail(idx);
  } catch (e) { toast('× ' + e.message); }
}

async function selectTier(jobRow, tier) {
  try {
    await api('/api/jobs/' + jobRow + '/field-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ field: 'selected_tier', value: tier }),
    });
    toast('✓ ' + tier.charAt(0).toUpperCase() + tier.slice(1) + ' tier selected — generate the estimate now');
    // Refresh the job detail
    delete loaded['jobs'];
    allJobs = await api('/api/jobs').catch(() => allJobs) || allJobs;
    const idx = allJobs.findIndex(j => (j._row || j.id) === jobRow);
    if (idx >= 0) showJobDetail(idx);
  } catch (e) { toast('× ' + e.message); }
}

async function saveJobNotes(jobRow) {
  const notes = document.getElementById('jmJobNotes')?.value?.trim();
  try {
    await api('/api/jobs/' + jobRow + '/field-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ field: 'notes', value: notes }),
    });
    toast('✓ Notes saved');
  } catch (e) { toast('× ' + e.message); }
}

async function saveSiteVisit(jobRow) {
  const data = {
    notes: document.getElementById('jmSiteNotes')?.value?.trim() || '',
    workAreas: document.getElementById('jmWorkAreas')?.value?.trim() || '',
    squareFootage: document.getElementById('jmSqft')?.value?.trim() || '',
    qualityTier: document.getElementById('jmQuality')?.value || '',
    lotSize: document.getElementById('jmLotSize')?.value?.trim() || '',
    clientBudget: document.getElementById('jmClientBudget')?.value?.trim() || '',
    soilConditions: document.getElementById('jmSoil')?.value || '',
    accessIssues: document.getElementById('jmAccess')?.value?.trim() || '',
    existingConditions: document.getElementById('jmExisting')?.value?.trim() || '',
    clientPreferences: document.getElementById('jmPreferences')?.value?.trim() || '',
  };
  try {
    const res = await fetch(`/api/jobs/${jobRow}/site-visit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Save failed');
    toast('✓ Site visit saved!');
  } catch (e) {
    toast('× ' + e.message, 3000);
  }
}

/* ─── JOB EQUIPMENT SECTION ─────────────────────────────────────── */
async function loadJobEquipment(jobId) {
  const el = document.getElementById('jmEquipment');
  if (!el) return;
  try {
    const allEquip = await api('/api/equipment') || [];
    const assigned = allEquip.filter(e => e.assignedJob == jobId || e.assigned_job_id == jobId);
    if (assigned.length) {
      el.innerHTML = assigned.map(e => `
        <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
          <span style="font-size:13px;font-weight:600;color:var(--text)">${e.name || e.equipmentName}</span>
          <span style="font-size:11px;color:var(--text3)">${e.category || e.type || ''}</span>
          <span style="margin-left:auto;font-size:11px;font-weight:600;color:var(--green)">Assigned</span>
        </div>
      `).join('') + `<button class="btn btn-secondary" style="font-size:12px;padding:6px 14px;margin-top:8px" onclick="autoAssignEquipment(${jobId})">+ Add More</button>`;
    } else {
      el.innerHTML = `
        <div style="font-size:13px;color:var(--text3);margin-bottom:8px">No equipment assigned</div>
        <button class="btn btn-primary" style="font-size:12px;padding:8px 16px" onclick="autoAssignEquipment(${jobId})">Auto-Assign Equipment</button>`;
    }
  } catch(e) {
    el.innerHTML = '<div style="font-size:13px;color:var(--text3)">No equipment assigned</div>';
  }
}

async function autoAssignEquipment(jobId) {
  try {
    const suggestions = await api(`/api/jobs/${jobId}/auto-assign-equipment`, { method: 'POST' }) || [];
    if (!suggestions.length) { toast('No available equipment'); return; }
    const names = suggestions.map(s => s.name || s.equipmentName).join(', ');
    if (confirm(`Assign to this job?\n\n${names}`)) {
      for (const s of suggestions) {
        await api(`/api/equipment/${s._row || s.id}/assign`, {
          method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ jobId, assignedTo: 'Auto' })
        });
      }
      toast('Equipment assigned');
      loadJobEquipment(jobId);
    }
  } catch(e) { toastError('Failed to assign equipment'); }
}

/* ─── JOB CHECKLIST SECTION ────────────────────────────────────── */
const DEFAULT_CHECKLISTS = {
  pre_job: [
    { text: 'Safety equipment verified', checked: false },
    { text: 'Materials on-site confirmed', checked: false },
    { text: 'Work area cleared', checked: false },
    { text: 'Client notified of arrival', checked: false },
    { text: 'Before photos taken', checked: false },
  ],
  post_job: [
    { text: 'Work area cleaned', checked: false },
    { text: 'After photos taken', checked: false },
    { text: 'Client walkthrough completed', checked: false },
    { text: 'Equipment returned', checked: false },
    { text: 'Final inspection passed', checked: false },
  ]
};

async function loadJobChecklist(jobId) {
  const el = document.getElementById('jmChecklist');
  if (!el) return;
  try {
    let checklists = await api(`/api/jobs/${jobId}/checklists`) || [];
    // If no checklists exist, show create option
    if (!checklists.length) {
      el.innerHTML = `
        <div style="display:flex;gap:8px">
          <button class="btn btn-secondary" style="font-size:12px;padding:7px 14px" onclick="createChecklist(${jobId},'pre_job')">+ Pre-Job Checklist</button>
          <button class="btn btn-secondary" style="font-size:12px;padding:7px 14px" onclick="createChecklist(${jobId},'post_job')">+ Post-Job Checklist</button>
        </div>`;
      return;
    }
    el.innerHTML = checklists.map(cl => {
      const items = typeof cl.items === 'string' ? JSON.parse(cl.items) : (cl.items || []);
      const done = items.filter(i => i.checked).length;
      const total = items.length;
      const pct = total > 0 ? Math.round((done / total) * 100) : 0;
      const typeLabel = cl.checklist_type === 'pre_job' ? 'Pre-Job' : 'Post-Job';
      return `
        <div style="margin-bottom:12px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
            <span style="font-size:13px;font-weight:700;color:var(--text)">${typeLabel} Checklist</span>
            <span style="font-size:11px;font-weight:600;color:${pct === 100 ? 'var(--green)' : 'var(--text3)'}">${done}/${total} complete</span>
          </div>
          <div style="height:4px;background:var(--border);border-radius:99px;margin-bottom:8px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:${pct === 100 ? 'var(--green)' : 'var(--gold)'};border-radius:99px;transition:width .3s"></div>
          </div>
          ${items.map((item, i) => `
            <label style="display:flex;align-items:center;gap:8px;padding:6px 0;cursor:pointer;font-size:13px;color:var(--text)">
              <input type="checkbox" ${item.checked ? 'checked' : ''} onchange="toggleChecklistItem(${cl.id},${i},this.checked,${jobId})" style="width:16px;height:16px;accent-color:var(--gold)">
              <span style="${item.checked ? 'text-decoration:line-through;opacity:.5' : ''}">${item.text}</span>
            </label>
          `).join('')}
        </div>`;
    }).join('');
  } catch(e) {
    el.innerHTML = '<div style="font-size:13px;color:var(--text3)">Checklists unavailable</div>';
  }
}

async function createChecklist(jobId, type) {
  try {
    await api(`/api/jobs/${jobId}/checklists`, {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ type, items: DEFAULT_CHECKLISTS[type] })
    });
    toast('Checklist created');
    loadJobChecklist(jobId);
  } catch(e) { toastError('Failed to create checklist'); }
}

async function toggleChecklistItem(checklistId, itemIdx, checked, jobId) {
  try {
    // Get current items, update the one that changed
    const checklists = await api(`/api/jobs/${jobId}/checklists`) || [];
    const cl = checklists.find(c => c.id === checklistId);
    if (!cl) return;
    const items = typeof cl.items === 'string' ? JSON.parse(cl.items) : (cl.items || []);
    items[itemIdx].checked = checked;
    const allDone = items.every(i => i.checked);
    await api(`/api/checklists/${checklistId}`, {
      method: 'PUT', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ items, completed: allDone, completed_by: currentUser?.name || 'owner' })
    });
    if (allDone) toast('Checklist complete!');
    loadJobChecklist(jobId);
  } catch(e) {}
}

/* ─── REVIEW REQUEST ───────────────────────────────────────────── */
async function requestReview(jobId) {
  if (!confirm('Send a review request email to the client?')) return;
  try {
    await api(`/api/jobs/${jobId}/request-review`, { method: 'POST' });
    toast('Review request sent');
    // Refresh job detail
    const idx = allJobs.findIndex(j => (j.id || j._row) === jobId);
    if (idx >= 0) {
      allJobs[idx].reviewRequested = true;
      allJobs[idx].review_requested = true;
      showJobDetail(idx);
    }
  } catch(e) { toastError('Failed to send review request'); }
}

async function loadJobMaterials(jobId) {
  const el = document.getElementById('jmMaterialsList');
  const totEl = document.getElementById('jmMaterialsTotal');
  if (!el) return;
  try {
    const materials = await api('/api/jobs/' + jobId + '/materials');
    if (!materials || !materials.length) {
      el.innerHTML = '<div style="text-align:center;padding:16px;color:var(--text3);font-size:13px">No materials yet — generate an estimate or add items manually</div>';
      if (totEl) totEl.innerHTML = '';
      return;
    }
    // Group by category
    const cats = {};
    let grandTotal = 0;
    materials.forEach(m => {
      const cat = m.category || 'Other';
      if (!cats[cat]) cats[cat] = [];
      cats[cat].push(m);
      const cost = parseFloat((m.totalCost || '0').replace(/[^0-9.-]/g, '')) || 0;
      grandTotal += cost;
    });

    // Check if any actuals have been logged
    let actualTotal = 0;
    let hasActuals = false;
    materials.forEach(m => {
      if (m.actualTotalCost || m.actual_total_cost) {
        hasActuals = true;
        actualTotal += parseFloat(((m.actualTotalCost || m.actual_total_cost || '0') + '').replace(/[^0-9.-]/g, '')) || 0;
      }
    });

    el.innerHTML = Object.entries(cats).map(([cat, items]) =>
      '<div style="margin-bottom:12px">' +
        '<div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">' + cat + '</div>' +
        items.map(m => {
          const hasActual = m.actualQuantity || m.actual_quantity;
          const estCost = parseFloat(((m.totalCost || '0') + '').replace(/[^0-9.-]/g, '')) || 0;
          const actCost = parseFloat(((m.actualTotalCost || m.actual_total_cost || '0') + '').replace(/[^0-9.-]/g, '')) || 0;
          const variance = m.variancePct || m.variance_pct;
          const varColor = variance > 5 ? 'var(--red)' : variance < -5 ? 'var(--green)' : 'var(--text3)';
          return '<div style="display:flex;align-items:center;gap:6px;padding:6px 0;border-bottom:1px solid var(--border);font-size:12px" data-mat-id="' + m.id + '">' +
            '<div style="flex:1;min-width:0">' +
              '<div style="font-weight:600;color:var(--text)">' + (m.item || '—') + '</div>' +
              '<div style="color:var(--text3);font-size:11px">Est: ' + (m.quantity || '') + ' · ' + (m.unitCost || '') + (m.bestSource ? ' · <span style="color:var(--gold)">' + m.bestSource + '</span>' : '') + '</div>' +
              (hasActual ? '<div style="font-size:11px;margin-top:2px"><span style="font-weight:600;color:var(--text)">Actual: ' + (m.actualQuantity || m.actual_quantity) + '</span>' +
                (variance !== null && variance !== undefined ? ' <span style="font-weight:700;color:' + varColor + '">' + (variance > 0 ? '+' : '') + variance + '%</span>' : '') +
              '</div>' : '') +
            '</div>' +
            '<div style="text-align:right">' +
              '<div style="font-weight:700;color:var(--text);white-space:nowrap">' + (m.totalCost || '—') + '</div>' +
              (hasActual && actCost ? '<div style="font-size:11px;font-weight:600;color:' + (actCost > estCost ? 'var(--red)' : 'var(--green)') + '">' + formatCurrency(actCost) + ' actual</div>' : '') +
            '</div>' +
            '<div style="display:flex;gap:2px">' +
              '<select style="background:var(--card2);border:1px solid var(--border);border-radius:4px;color:var(--text2);font-size:10px;padding:2px 4px" onchange="updateMaterialStatus(' + _currentJobRow + ',' + m.id + ',this.value)">' +
                '<option value="needed"' + (m.status==='needed'?' selected':'') + '>Needed</option>' +
                '<option value="ordered"' + (m.status==='ordered'?' selected':'') + '>Ordered</option>' +
                '<option value="received"' + (m.status==='received'?' selected':'') + '>Received</option>' +
              '</select>' +
              '<button style="background:none;border:none;color:var(--text3);font-size:14px;cursor:pointer;padding:0 2px" onclick="deleteMaterial(' + _currentJobRow + ',' + m.id + ')">×</button>' +
            '</div>' +
          '</div>';
        }).join('') +
      '</div>'
    ).join('');

    // Totals row with actual comparison
    if (totEl) {
      let totHtml = '<div style="display:flex;justify-content:space-between;padding:8px 0;border-top:2px solid var(--border);font-weight:800"><span>Estimated Total</span><span style="color:var(--text)">' + formatCurrency(grandTotal) + '</span></div>';
      if (hasActuals) {
        const diff = actualTotal - grandTotal;
        const diffColor = diff > 0 ? 'var(--red)' : 'var(--green)';
        totHtml += '<div style="display:flex;justify-content:space-between;padding:4px 0;font-weight:800"><span>Actual Total</span><span style="color:var(--gold)">' + formatCurrency(actualTotal) + '</span></div>';
        totHtml += '<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:12px"><span style="color:var(--text3)">Variance</span><span style="font-weight:700;color:' + diffColor + '">' + (diff > 0 ? '+' : '') + formatCurrency(diff) + ' (' + (grandTotal > 0 ? Math.round((diff / grandTotal) * 100) : 0) + '%)</span></div>';
      }
      totHtml += '<button class="btn btn-secondary" style="width:100%;margin-top:8px;font-size:12px;padding:8px" onclick="openLogActualsModal(' + _currentJobRow + ')">Log Actual Materials Used</button>';
      totEl.innerHTML = totHtml;
    }
  } catch (e) {
    el.innerHTML = '<div style="color:var(--red);font-size:13px">Error loading materials</div>';
  }
}

async function addMaterialRow(jobId) {
  const item = prompt('Material name (e.g. "Belgard Pavers"):');
  if (!item) return;
  const qty = prompt('Quantity (e.g. "800 sq ft"):') || '';
  const unitCost = prompt('Unit cost (e.g. "$5.20/sq ft"):') || '';
  const total = prompt('Total cost (e.g. "$4,160"):') || '';
  const source = prompt('Best source (e.g. "SiteOne"):') || '';
  const cat = prompt('Category (e.g. "Hardscape"):') || 'General';
  try {
    await api('/api/jobs/' + jobId + '/materials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item, quantity: qty, unitCost, totalCost: total, bestSource: source, category: cat }),
    });
    toast('✓ Material added');
    loadJobMaterials(jobId);
  } catch (e) { toast('× ' + e.message); }
}

async function updateMaterialStatus(jobId, matId, status) {
  try {
    await api('/api/jobs/' + jobId + '/materials/' + matId, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
  } catch (e) { toast('× ' + e.message); }
}

async function deleteMaterial(jobId, matId) {
  if (!confirm('Remove this material?')) return;
  try {
    await api('/api/jobs/' + jobId + '/materials/' + matId, { method: 'DELETE' });
    toast('✓ Removed');
    loadJobMaterials(jobId);
  } catch (e) { toast('× ' + e.message); }
}

/* ─── LOG ACTUAL MATERIALS MODAL ────────────────────────────────── */
let _logActualsMaterials = [];
async function openLogActualsModal(jobId) {
  try {
    const materials = await api('/api/jobs/' + jobId + '/materials') || [];
    if (!materials.length) { toast('No materials to log actuals for'); return; }
    _logActualsMaterials = materials;

    const modal = document.createElement('div');
    modal.id = 'logActualsModal';
    modal.className = 'modal-overlay';
    modal.style.cssText = 'display:flex;align-items:center;justify-content:center;overflow-y:auto;padding:20px;z-index:9999';
    modal.onclick = function(e) { if (e.target === this) this.remove(); };

    modal.innerHTML = `
      <div style="max-width:600px;width:100%;background:var(--card);border:1px solid var(--border);border-radius:18px;padding:24px;box-shadow:0 12px 40px rgba(0,0,0,0.15);max-height:85vh;overflow-y:auto">
        <div style="font-size:20px;font-weight:700;color:var(--text);margin-bottom:4px">Log Actual Materials</div>
        <div style="font-size:13px;color:var(--text3);margin-bottom:16px">Update quantities and costs to what was actually used on this job.</div>
        <div id="logActualsItems">
          ${materials.map((m, i) => {
            const estQty = m.quantity || '';
            const estCost = m.totalCost || '';
            const actQty = m.actualQuantity || m.actual_quantity || '';
            const actCost = m.actualTotalCost || m.actual_total_cost || '';
            return `
              <div style="padding:10px 0;border-bottom:1px solid var(--border)">
                <div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:6px">${m.item || 'Material'}</div>
                <div style="font-size:11px;color:var(--text3);margin-bottom:8px">Estimated: ${estQty} · ${m.unitCost || ''} · Total: ${estCost}</div>
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
                  <div>
                    <label style="font-size:10px;font-weight:600;color:var(--text3);text-transform:uppercase;display:block;margin-bottom:3px">Actual Qty</label>
                    <input type="text" id="actQty_${i}" value="${actQty || estQty}" placeholder="${estQty}" style="width:100%;padding:7px 10px;border:1px solid var(--border);border-radius:8px;font-size:13px;background:var(--surface);color:var(--text);box-sizing:border-box">
                  </div>
                  <div>
                    <label style="font-size:10px;font-weight:600;color:var(--text3);text-transform:uppercase;display:block;margin-bottom:3px">Actual $/Unit</label>
                    <input type="text" id="actUnit_${i}" value="${m.actualUnitCost || m.actual_unit_cost || m.unitCost || ''}" placeholder="${m.unitCost || ''}" style="width:100%;padding:7px 10px;border:1px solid var(--border);border-radius:8px;font-size:13px;background:var(--surface);color:var(--text);box-sizing:border-box">
                  </div>
                  <div>
                    <label style="font-size:10px;font-weight:600;color:var(--text3);text-transform:uppercase;display:block;margin-bottom:3px">Actual Total</label>
                    <input type="text" id="actTotal_${i}" value="${actCost || estCost}" placeholder="${estCost}" style="width:100%;padding:7px 10px;border:1px solid var(--border);border-radius:8px;font-size:13px;background:var(--surface);color:var(--text);box-sizing:border-box">
                  </div>
                </div>
              </div>`;
          }).join('')}
        </div>
        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px">
          <button onclick="document.getElementById('logActualsModal').remove()" style="padding:10px 20px;border-radius:10px;border:1px solid var(--border);background:var(--card);color:var(--text);font-size:14px;font-weight:600;cursor:pointer">Cancel</button>
          <button onclick="saveLogActuals(${jobId})" class="btn btn-primary" style="padding:10px 24px;font-size:14px">Save Actuals</button>
        </div>
      </div>`;

    document.body.appendChild(modal);
  } catch (e) { toastError('Failed to load materials'); }
}

async function saveLogActuals(jobId) {
  const actuals = _logActualsMaterials.map((m, i) => ({
    materialId: m.id,
    estimatedQty: (m.quantity || '').replace(/[^0-9.]/g, ''),
    actualQty: document.getElementById('actQty_' + i)?.value || '',
    actualUnitCost: document.getElementById('actUnit_' + i)?.value || '',
    actualTotal: document.getElementById('actTotal_' + i)?.value || '',
  }));

  try {
    await api('/api/jobs/' + jobId + '/materials/log-actuals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actuals, loggedBy: currentUser?.name || 'field' }),
    });
    document.getElementById('logActualsModal')?.remove();
    toast('Actuals logged — materials updated');
    loadJobMaterials(jobId);
  } catch (e) { toastError('Failed to save actuals'); }
}

async function saveSiteVisitAndProposal(jobRow) {
  await saveSiteVisit(jobRow);
  triggerDocGen('generate_proposal', jobRow);
}

async function saveSiteVisitAndEstimate(jobRow) {
  await saveSiteVisit(jobRow);
  try {
    const res = await fetch(`/api/jobs/${jobRow}/regenerate-estimate`, { method: 'POST' });
    if (!res.ok) throw new Error('Estimate generation failed');
    toast('Estimate generating — the AI is crunching numbers. Check back in 1-2 minutes!', 5000);
  } catch (e) {
    toast('× ' + e.message, 3000);
  }
}

function copyStatusLink(jobId) {
  const url = `${location.origin}/status/${jobId}`;
  navigator.clipboard.writeText(url).then(() => toast('✓ Status link copied!')).catch(() => {
    const el = document.createElement('textarea');
    el.value = url; document.body.appendChild(el); el.select();
    document.execCommand('copy'); document.body.removeChild(el);
    toast('✓ Status link copied!');
  });
}

/* ─── CHANGE ORDER MODAL ─────────────────────────────────────────── */
// ─── KICKOFF SCHEDULER ────────────────────────────────────────────────────────
async function syncJobToCalendar() {
  if (!_currentJobRow) { toast('! No job selected'); return; }
  try {
    const res  = await fetch(`/api/jobs/${_currentJobRow}/sync-calendar`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    toast(`${data.created} event${data.created !== 1 ? 's' : ''} synced to Google Calendar!`);
  } catch (err) {
    toast(`× ${err.message}`, 3000);
  }
}

async function sendKickoffSchedule() {
  if (!_currentJobRow) { toast('! No job selected'); return; }
  const confirmed = confirm('Send kickoff date options to the client? They\'ll get 3 date choices by email.');
  if (!confirmed) return;
  try {
    const res  = await fetch(`/api/jobs/${_currentJobRow}/kickoff-schedule`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    toast(`Kickoff scheduling email sent! Dates offered: ${(data.datesOffered||[]).join(', ')}`);
    closeModal('jobModal');
  } catch (err) {
    toast(`× ${err.message}`, 3000);
  }
}

// ─── DAILY BRIEFING ───────────────────────────────────────────────────────────
async function sendDailyBriefing() {
  const btn = document.getElementById('briefingBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
  try {
    await fetch('/api/briefing/send', { method: 'POST' });
    toast('Briefing sent to owner email!');
  } catch (err) {
    toast(`× ${err.message}`, 3000);
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg> Send Briefing'; }
  }
}

function openChangeOrderModal() {
  closeModal('jobModal');
  document.getElementById('coDescription').value = '';
  const btn = document.getElementById('coSubmitBtn');
  if (btn) { btn.disabled = false; btn.textContent = 'Generate & Send'; }
  openModal('changeOrderModal');
}

async function submitChangeOrder() {
  const desc = document.getElementById('coDescription')?.value?.trim();
  if (!desc) { toast('! Describe what is changing first'); return; }
  if (!_currentJobRow) { toast('! No job selected'); return; }

  const btn = document.getElementById('coSubmitBtn');
  btn.disabled = true;
  btn.textContent = 'Generating…';

  try {
    const res  = await fetch(`/api/jobs/${_currentJobRow}/change-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: desc }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    closeModal('changeOrderModal');
    toast('✓ Change order generating — client will receive email shortly');
  } catch (err) {
    toast(`× ${err.message}`, 3000);
    btn.disabled = false;
    btn.textContent = 'Generate & Send';
  }
}

/* ─── CHANGE JOB STATUS ─────────────────────────────────────────── */
async function changeJobStatus(dbStatus, btn, displayLabel) {
  if (!_currentJobRow) return;
  const label = displayLabel || JOB_STATUS_LABELS[dbStatus] || dbStatus;
  document.querySelectorAll('.status-pill').forEach(p => p.classList.remove('active-pill'));
  btn.classList.add('active-pill');
  const badgeEl = document.getElementById('jmStatusBadge');
  if (badgeEl) badgeEl.innerHTML = `<div class="detail-key">Status</div><div class="detail-val">${statusBadge(label)}</div>`;
  const job = allJobs.find(j => (j._row || j.id) === _currentJobRow);
  if (job) { job.status = dbStatus; job.jobStatus = dbStatus; job.Status = dbStatus; }
  try {
    if (!usingDemo) {
      await fetch(`/api/jobs/${_currentJobRow}/status`, {
        method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ status: dbStatus })
      });
    }
    toast(`✓ Job moved to ${label}`);
    renderJobs();
  } catch {
    toast('! Could not update status');
  }
}

/* ─── GENERATE DOCUMENT ─────────────────────────────────────────── */
async function triggerDocGen(eventType, rowNumber) {
  if (usingDemo) { toastInfo('Documents will be generated by AI'); return; }
  const btn = event?.target;
  const savedRow = rowNumber || _currentJobRow;
  btnLoading(btn, '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2H6v6l4 4-4 4v6h12v-6l-4-4 4-4V2z"/></svg> Starting…');
  try {
    const res = await fetch('/webhook/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-internal': '1' },
      body: JSON.stringify({ type: eventType, rowNumber: savedRow }),
    });
    if (res.ok) {
      toastSuccess('Agent started — doc will appear in about a minute');
      if (btn) btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2H6v6l4 4-4 4v6h12v-6l-4-4 4-4V2z"/></svg> Working…';
      // Refresh jobs + reopen modal after 90s so the new doc link appears
      setTimeout(async () => {
        delete loaded['jobs'];
        allJobs = [];
        allJobs = await api('/api/jobs').catch(() => allJobs) || allJobs;
        if (savedRow) showJobDetail(allJobs.findIndex(j => (j.__row||j._row) === savedRow));
      }, 90000);
    } else {
      toastError('Could not start agent — try again');
      btnReset(btn);
    }
  } catch {
    toastError('Network error — check your connection');
    btnReset(btn);
  }
}

/* ─── TOGGLE PHASE COMPLETE ─────────────────────────────────────── */
async function togglePhase(row, checkEl) {
  const isDone    = checkEl.classList.contains('done');
  const newStatus = isDone ? 'pending' : 'completed';  // DB values
  checkEl.classList.toggle('done', !isDone);
  checkEl.textContent = isDone ? '' : '✓';
  const dateEl = checkEl.closest('.phase-item')?.querySelector('.phase-date');
  if (dateEl) dateEl.textContent = isDone ? 'Pending' : new Date().toLocaleDateString('en-US',{month:'short',day:'numeric'});
  try {
    if (!usingDemo) {
      await fetch(`/api/phases/${row}/status`, {
        method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ status: newStatus })
      });
    }
    toast(isDone ? 'Phase marked pending' : '✓ Phase complete!');
  } catch {
    checkEl.classList.toggle('done', isDone);
    checkEl.textContent = isDone ? '✓' : '';
    toast('! Could not update phase');
  }
}

async function editPhaseAssignment(phaseRow, currentAssigned) {
  // Build list of team members for selection
  const teamNames = (allTeam || []).map(m => g(m,'Name','name','Full Name') || '').filter(Boolean);
  const choice = prompt(
    'Assign this phase to:\n\n' +
    teamNames.map((n,i) => `${i+1}. ${n}`).join('\n') +
    '\n\nEnter name or number (blank to unassign):',
    currentAssigned || ''
  );
  if (choice === null) return; // cancelled
  let assignee = choice.trim();
  // If they entered a number, map to name
  const num = parseInt(assignee);
  if (!isNaN(num) && num >= 1 && num <= teamNames.length) assignee = teamNames[num - 1];

  try {
    await fetch(`/api/phases/${phaseRow}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignedTo: assignee }),
    });
    toast(assignee ? `✓ Assigned to ${assignee}` : '✓ Unassigned');
    // Refresh job detail
    delete loaded['jobs'];
    allJobs = await api('/api/jobs').catch(() => allJobs) || allJobs;
    const idx = allJobs.findIndex(j => (j._row || j.id) === _currentJobRow);
    if (idx >= 0) showJobDetail(idx);
  } catch (e) {
    toast('× Could not assign: ' + e.message);
  }
}

/* ─── CLIENTS PAGE ──────────────────────────────────────────────── */
async function loadClients() {
  document.getElementById('clientsList').innerHTML = skeletonList(4);
  allClients = await api('/api/clients') || [];
  renderClients();
}

function filterClients() { renderClients(); }

function renderClients() {
  const search = (document.getElementById('clientSearch')?.value || '').toLowerCase();
  let clients = allClients.filter(c => {
    const name = `${g(c,'First Name','first_name')} ${g(c,'Last Name','last_name')}`.toLowerCase();
    return !search || name.includes(search);
  });

  const el = document.getElementById('clientsList');
  if (clients.length === 0) {
    el.innerHTML = `<div class="empty"><div class="empty-icon"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div><div class="empty-title">No clients yet</div><div class="empty-sub">Clients appear here after jobs are completed</div></div>`;
    return;
  }

  el.innerHTML = clients.map((c) => {
    const firstName = g(c,'First Name','firstName','first_name');
    const lastName  = g(c,'Last Name','lastName','last_name');
    const name = g(c,'Full Name','fullName') || `${firstName} ${lastName}`.trim() || 'Unknown Client';
    const ltv  = g(c,'Lifetime Value','lifetimeValue','LTV');
    const jobs = g(c,'Jobs Completed','jobsCompleted','Total Jobs','totalJobs','Number of Jobs');
    const last = g(c,'Last Job','lastJob','Last Job Type','Last Project');
    const sat  = g(c,'AI Score','aiScore','Satisfaction Score','Satisfaction');
    const idx  = allClients.indexOf(c);

    return `
      <div class="list-item" onclick="showClientDetail(${idx})">
        <div class="item-avatar" style="font-size:20px"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
        <div class="item-body">
          <div class="item-name">${name}</div>
          <div class="item-sub">${last ? last : 'New client'}${jobs?' · '+jobs+' job'+(parseInt(jobs)>1?'s':''):''}</div>
        </div>
        <div class="item-right">
          <div class="item-value">${ltv?formatCurrency(ltv):''}</div>
          ${sat?`<div class="item-label">${sat}</div>`:''}
        </div>
        <span class="chevron">›</span>
      </div>
    `;
  }).join('');
}

let _openClientId = null;
let _openClientName = null;

function showClientDetail(idx) {
  const c = allClients[idx];
  if (!c) return;
  const firstName = g(c,'First Name','firstName','first_name');
  const lastName  = g(c,'Last Name','lastName','last_name');
  const name   = g(c,'Full Name','fullName') || `${firstName} ${lastName}`.trim() || 'Unknown';
  const email  = g(c,'Email','email');
  const phone  = g(c,'Phone','phone','Phone Number');
  const ltv    = g(c,'Lifetime Value','lifetimeValue','LTV','totalRevenue');
  const jobCt  = g(c,'Jobs Completed','jobsCompleted','Total Jobs','totalJobs','jobCount');
  const last   = g(c,'Last Job','lastJob','Last Job Type','Last Project');
  const sat    = g(c,'AI Score','aiScore','Satisfaction Score','Satisfaction');
  const refs   = g(c,'Referral Potential','referralScore','Referral Score','Referrals Given');
  const notes  = g(c,'Notes','notes','Customer Profile','customerProfile');
  const addr   = g(c,'Street Address','address','Address');
  const commStyle = g(c,'Communication Style','communicationStyle') || '';
  const concerns  = g(c,'Key Concerns','keyConcerns') || '';
  const prefContact = g(c,'Preferred Contact','preferredContact') || '';

  _openClientId = c._row || c.id;
  _openClientName = name;

  document.getElementById('cmName').textContent = name;
  document.getElementById('cmSub').textContent  = email || phone || 'No contact info on file';
  document.getElementById('cmCall').href  = phone ? 'tel:' + phone.replace(/\D/g,'') : '#';
  document.getElementById('cmEmail').href = email ? 'mailto:' + email : '#';

  // Render overview tab
  const el = document.getElementById('cmOverviewContent');
  if (el) el.innerHTML = `
    <div class="modal-section">
      <div class="modal-section-label">Client Profile</div>
      <div class="detail-row"><div class="detail-key">Lifetime Value</div><div class="detail-val text-gold fw800">${ltv?formatCurrency(ltv):'—'}</div></div>
      <div class="detail-row"><div class="detail-key">Total Jobs</div><div class="detail-val">${jobCt||'—'}</div></div>
      <div class="detail-row"><div class="detail-key">Last Project</div><div class="detail-val">${last||'—'}</div></div>
      <div class="detail-row"><div class="detail-key">Satisfaction</div><div class="detail-val">${sat?'⭐ '+sat:'—'}</div></div>
      <div class="detail-row"><div class="detail-key">Referrals</div><div class="detail-val">${refs||'0'}</div></div>
      ${addr?`<div class="detail-row"><div class="detail-key">Address</div><div class="detail-val">${addr}</div></div>`:''}
      <div class="detail-row"><div class="detail-key">Phone</div><div class="detail-val">${phone||'—'}</div></div>
      <div class="detail-row"><div class="detail-key">Email</div><div class="detail-val" style="word-break:break-all">${email||'—'}</div></div>
      ${prefContact?`<div class="detail-row"><div class="detail-key">Prefers</div><div class="detail-val" style="text-transform:capitalize">${prefContact}</div></div>`:''}
    </div>
    ${commStyle || concerns ? `<div class="modal-section">
      <div class="modal-section-label">Working With This Client</div>
      ${commStyle?`<div class="detail-row"><div class="detail-key">Communication</div><div class="detail-val" style="font-size:13px">${commStyle}</div></div>`:''}
      ${concerns?`<div class="detail-row"><div class="detail-key">Key Concerns</div><div class="detail-val" style="font-size:13px">${concerns}</div></div>`:''}
    </div>` : ''}
    ${notes?`<div class="modal-section">
      <div class="modal-section-label">Notes</div>
      <div class="notes-box">${notes}</div>
    </div>`:''}
  `;

  // Clear jobs + photos tabs (will lazy-load when clicked)
  const jobsEl = document.getElementById('cmJobsContent');
  if (jobsEl) jobsEl.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text2)">Loading jobs…</div>';
  const photosEl = document.getElementById('cmPhotosContent');
  if (photosEl) photosEl.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text2)">Loading photos…</div>';

  switchClientTab('overview');
  openModal('clientModal');
}

// ── CLIENT HUB TABS ────────────────────────────────────────────────────────────
const CLIENT_TABS = ['overview','jobs','photos','history'];

function switchClientTab(tab) {
  CLIENT_TABS.forEach(t => {
    const btn = document.getElementById('cmTab_' + t);
    const div = document.getElementById('cm' + t.charAt(0).toUpperCase() + t.slice(1) + 'Content');
    if (btn) {
      btn.style.borderBottomColor = t === tab ? 'var(--gold)' : 'transparent';
      btn.style.color = t === tab ? 'var(--gold)' : 'var(--text2)';
    }
    if (div) div.style.display = t === tab ? '' : 'none';
  });

  // Lazy-load data when tab is first opened
  if (tab === 'jobs' && _openClientId) loadClientJobs(_openClientId);
  if (tab === 'photos' && _openClientId) loadClientPhotos(_openClientId);
  if (tab === 'history' && _openClientName) loadClientTimeline(_openClientName);
}

async function loadClientJobs(clientId) {
  const el = document.getElementById('cmJobsContent');
  if (!el || el.dataset.loaded === String(clientId)) return;
  el.dataset.loaded = clientId;
  el.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text2)">Loading…</div>';

  try {
    const jobs = await api('/api/clients/' + clientId + '/jobs');
    if (!jobs || !jobs.length) {
      el.innerHTML = '<div style="text-align:center;padding:32px;color:var(--text2);font-size:14px">No jobs yet for this client</div>';
      return;
    }
    el.innerHTML = jobs.map(j => {
      const val = j.estimatedValue || j.totalJobValue || 0;
      const status = JOB_STATUS_LABELS[j.status] || j.status || '';
      const phases = (j.phases || []);
      const doneCt = phases.filter(p => p.status === 'completed').length;
      const pct = phases.length ? Math.round(doneCt / phases.length * 100) : 0;

      return `<div class="modal-section" style="background:var(--card);border:1px solid var(--border);border-radius:var(--r);padding:14px;margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <div>
            <div style="font-weight:700;font-size:15px;color:var(--text)">${j.title || j.service || 'Untitled Job'}</div>
            <div style="font-size:12px;color:var(--text3)">${j.jobId || j.jobRef} · ${j.address || ''}</div>
          </div>
          <div style="text-align:right">
            ${val ? '<div style="font-weight:800;color:var(--gold)">' + formatCurrency(val) + '</div>' : ''}
            <div style="margin-top:2px">${statusBadge(status)}</div>
          </div>
        </div>
        ${phases.length ? `
          <div style="font-size:11px;color:var(--text3);margin-bottom:4px">${doneCt} of ${phases.length} phases complete (${pct}%)</div>
          <div style="height:4px;background:var(--border);border-radius:2px;overflow:hidden;margin-bottom:10px">
            <div style="height:100%;width:${pct}%;background:var(--green);border-radius:2px"></div>
          </div>
          <div style="display:flex;flex-direction:column;gap:4px">
            ${phases.map(p => '<div style="display:flex;justify-content:space-between;font-size:12px;padding:3px 0;border-bottom:1px solid var(--border)">' +
              '<span style="color:' + (p.status==='completed'?'var(--green)':p.status==='in_progress'?'var(--gold)':'var(--text3)') + '">' +
              (p.status==='completed'?'✓ ':p.status==='in_progress'?'<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg> ':'○ ') + (p.name||'Phase') + '</span>' +
              '<span style="color:var(--text3)">' + (p.assignedTo||'') + '</span></div>').join('')}
          </div>
        ` : ''}
        ${j.siteVisitNotes ? '<div style="margin-top:10px;padding:8px 10px;background:var(--card2);border-radius:8px;font-size:12px;color:var(--text2)"><span style="font-weight:700;color:var(--text3)"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg> Site Notes:</span> ' + j.siteVisitNotes + '</div>' : ''}
        <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap">
          ${['Proposal','Estimate','Contract','Kickoff'].map(doc => {
            const evt = doc==='Proposal'?'generate_proposal':doc==='Estimate'?'estimate_ready':doc==='Contract'?'generate_contract':'plan_project';
            return '<button style="flex:1;min-width:70px;padding:7px 0;border-radius:8px;border:1px solid var(--border);background:var(--card2);color:var(--text2);font-size:11px;font-weight:600;cursor:pointer" onclick="triggerDocGen(\''+evt+'\','+j.id+')">' + doc + '</button>';
          }).join('')}
        </div>
      </div>`;
    }).join('');
  } catch (e) {
    el.innerHTML = '<div style="text-align:center;padding:24px;color:var(--red)">Error loading jobs</div>';
  }
}

async function loadClientPhotos(clientId) {
  const el = document.getElementById('cmPhotosContent');
  if (!el || el.dataset.loaded === String(clientId)) return;
  el.dataset.loaded = clientId;
  el.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text2)">Loading…</div>';

  try {
    const photos = await api('/api/clients/' + clientId + '/photos');
    if (!photos || !photos.length) {
      el.innerHTML = '<div style="text-align:center;padding:32px;color:var(--text2);font-size:14px"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg> No photos yet<br><span style="font-size:12px;color:var(--text3)">Photos uploaded from job pages will appear here</span></div>';
      return;
    }
    el.innerHTML = `
      <div style="font-size:12px;color:var(--text3);margin-bottom:12px">${photos.length} photo${photos.length!==1?'s':''}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px">
        ${photos.map(p => `<div style="position:relative;padding-top:100%;border-radius:8px;overflow:hidden;background:var(--card);cursor:pointer" onclick="window.open('${p.url}','_blank')">
          <img src="${p.url}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover" loading="lazy" onerror="this.style.display='none'">
          ${p.caption?'<div style="position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,.7);padding:3px 6px;font-size:10px;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+p.caption+'</div>':''}
        </div>`).join('')}
      </div>
    `;
  } catch (e) {
    el.innerHTML = '<div style="text-align:center;padding:24px;color:var(--red)">Error loading photos</div>';
  }
}

async function loadClientTimeline(name) {
  const el = document.getElementById('cmHistoryContent');
  if (!el) return;
  el.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text2);font-size:13px">Loading timeline…</div>';

  try {
    const res  = await fetch(`/api/clients/${encodeURIComponent(name)}/timeline`);
    const data = await res.json();

    if (!data.events?.length) {
      el.innerHTML = '<div style="text-align:center;padding:32px;color:var(--text2);font-size:13px">No activity recorded yet</div>';
      return;
    }

    const colorMap = {
      gold:  { bg: 'rgba(191,148,56,.12)',  border: 'rgba(191,148,56,.3)',  text: 'var(--gold)'  },
      green: { bg: 'rgba(34,197,94,.1)',    border: 'rgba(34,197,94,.25)',  text: 'var(--green)' },
      mist:  { bg: 'rgba(255,255,255,.04)', border: 'var(--border)',         text: 'var(--text2)' },
    };

    el.innerHTML = `
      <div style="font-size:12px;color:var(--text2);margin-bottom:14px">${data.events.length} event${data.events.length!==1?'s':''} · ${data.jobCount} job${data.jobCount!==1?'s':''}</div>
      <div style="position:relative">
        <div style="position:absolute;left:19px;top:0;bottom:0;width:2px;background:var(--border);z-index:0"></div>
        ${data.events.map(e => {
          const c = colorMap[e.color] || colorMap.mist;
          let dateStr = '';
          if (e.date) {
            try { dateStr = new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
            catch(_) { dateStr = e.date; }
          }
          return `
            <div style="display:flex;gap:12px;margin-bottom:16px;position:relative;z-index:1">
              <div style="width:38px;height:38px;border-radius:50%;background:${c.bg};border:1px solid ${c.border};display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">${e.icon}</div>
              <div style="flex:1;min-width:0;padding-top:4px">
                <div style="font-size:14px;font-weight:700;color:var(--text)">${e.label}</div>
                ${e.detail ? `<div style="font-size:12px;color:var(--text2);margin-top:1px">${e.detail}</div>` : ''}
                ${dateStr  ? `<div style="font-size:11px;color:var(--text3);margin-top:3px">${dateStr}</div>` : ''}
                ${e.photoUrl ? `<img src="${e.photoUrl}" style="margin-top:6px;width:80px;height:60px;object-fit:cover;border-radius:6px;cursor:pointer" onclick="window.open('${e.photoUrl}','_blank')">` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  } catch(err) {
    el.innerHTML = `<div style="padding:24px;text-align:center;color:var(--text2)">Could not load timeline</div>`;
  }
}

/* ─── NOTIFICATIONS PANEL ───────────────────────────────────────── */
let _notifOpen = false;

function toggleNotifPanel() {
  _notifOpen = !_notifOpen;
  const panel   = document.getElementById('notifPanel');
  const overlay = document.getElementById('notifOverlay');
  if (panel)   panel.style.display   = _notifOpen ? 'block' : 'none';
  if (overlay) overlay.style.display = _notifOpen ? 'block' : 'none';
  if (_notifOpen) loadNotifPanel();
}

async function loadNotifPanel() {
  const el = document.getElementById('notifPanelContent');
  if (!el) return;
  el.innerHTML = '<div style="padding:24px;text-align:center;color:#666;font-size:14px">Loading…</div>';

  const alerts = await api('/api/alerts').catch(() => []) || [];

  // Sync badge
  const urgentCount = alerts.filter(a => a.type === 'urgent').length;
  const badge = document.getElementById('alertBadge');
  const navDot = document.getElementById('alertsNavDot');
  if (badge)  badge.style.display  = urgentCount > 0 ? 'block' : 'none';
  if (navDot) navDot.style.display = urgentCount > 0 ? 'block' : 'none';

  if (alerts.length === 0) {
    el.innerHTML = `
      <div style="padding:36px 16px;text-align:center">
        <div style="font-size:36px;margin-bottom:10px">✓</div>
        <div style="font-size:15px;font-weight:700;color:#F0F0F0;margin-bottom:4px">All clear!</div>
        <div style="font-size:13px;color:#666">No alerts right now. Great work.</div>
      </div>`;
    return;
  }

  el.innerHTML = alerts.map(a => `
    <div class="alert-item ${a.type||'info'}" style="margin:6px 12px;border-radius:12px">
      <div class="alert-icon">${a.icon||'ℹ️'}</div>
      <div class="alert-body">
        <div class="alert-title">${a.title||'Alert'}</div>
        <div class="alert-desc">${a.desc||''}</div>
        ${a.tag ? `<div class="alert-tag">${a.tag}</div>` : ''}
      </div>
    </div>
  `).join('');
}

// Wire bell button and close after DOM ready
document.addEventListener('DOMContentLoaded', function() {
  const bell    = document.getElementById('notifBellBtn');
  const close   = document.getElementById('notifCloseBtn');
  const overlay = document.getElementById('notifOverlay');
  if (bell)    bell.addEventListener('click', toggleNotifPanel);
  if (close)   close.addEventListener('click', toggleNotifPanel);
  if (overlay) overlay.addEventListener('click', toggleNotifPanel);
});

/* ─── ALERTS PAGE ───────────────────────────────────────────────── */
async function loadAlerts() {
  const alerts = await api('/api/alerts') || [];
  const el = document.getElementById('alertsList');

  // Update badge
  const urgentCount = alerts.filter(a => a.type === 'urgent').length;
  document.getElementById('alertBadge').style.display = urgentCount > 0 ? 'block' : 'none';
  const _navDot = document.getElementById('alertsNavDot'); if (_navDot) _navDot.style.display = urgentCount > 0 ? 'block' : 'none';

  if (alerts.length === 0) {
    el.innerHTML = `<div class="empty"><div class="empty-icon">✓</div><div class="empty-title">All clear!</div><div class="empty-sub">No alerts right now. Great work keeping everything on track.</div></div>`;
    return;
  }

  el.innerHTML = alerts.map(a => `
    <div class="alert-item ${a.type||'info'}">
      <div class="alert-icon">${a.icon||'ℹ️'}</div>
      <div class="alert-body">
        <div class="alert-title">${a.title||'Alert'}</div>
        <div class="alert-desc">${a.desc||''}</div>
        ${a.tag?`<div class="alert-tag">${a.tag}</div>`:''}
      </div>
    </div>
  `).join('');
}

/* ─── TEAM PAGE ─────────────────────────────────────────────────── */
let teamFilterActive = 'all';

async function loadTeam() {
  allTeam = await api('/api/team') || [];
  renderTeam();
}

function setTeamFilter(btn) {
  document.querySelectorAll('#page-team .chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  teamFilterActive = btn.dataset.filter;
  renderTeam();
}

function filterTeam() { renderTeam(); }

function renderTeam() {
  const search = (document.getElementById('teamSearch')?.value || '').toLowerCase();
  let team = allTeam.filter(m => {
    const name = (g(m,'Name','name','Full Name') || '').toLowerCase();
    const role = (g(m,'Role','role','Position') || '').toLowerCase();
    const type = (g(m,'Type','type','Member Type') || '').toLowerCase();
    const active = g(m,'Active','active','Is Active');
    if (search && !name.includes(search) && !role.includes(search)) return false;
    if (teamFilterActive === 'active') return active && active.toLowerCase() === 'yes';
    if (teamFilterActive === 'crew') return type.toLowerCase().includes('crew') || (!type || type === '');
    if (teamFilterActive === 'sub') return type.toLowerCase().includes('sub');
    return true;
  });

  const el = document.getElementById('teamList');
  if (team.length === 0) {
    el.innerHTML = `<div class="empty"><div class="empty-icon"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div><div class="empty-title">No team members</div><div class="empty-sub">Tap + Add to create your first team member</div></div>`;
    return;
  }

  const crew = team.filter(m => !g(m,'Type','type','Member Type').toLowerCase().includes('sub'));
  const subs = team.filter(m =>  g(m,'Type','type','Member Type').toLowerCase().includes('sub'));

  const renderMember = (m, idx) => {
    const name  = g(m,'Name','name','Full Name') || 'Unknown';
    const role  = g(m,'Role','role','Position') || '—';
    const type  = g(m,'Type','type','Member Type') || 'Crew';
    const active= g(m,'Active','active','Is Active');
    const jobs  = g(m,'Active Jobs','active_jobs','Jobs');
    const isOn  = !active || active.toLowerCase() === 'yes';
    const row   = m.__row;
    const ini   = initials(name);
    const globalIdx = allTeam.indexOf(m);
    const isSub = type.toLowerCase().includes('sub');
    const roleLower = role.toLowerCase();
    const avatarBg = isSub ? 'linear-gradient(135deg,rgba(124,58,237,0.06),rgba(124,58,237,0.02))' : roleLower.includes('owner') ? 'linear-gradient(135deg,rgba(45,122,30,0.08),rgba(45,122,30,0.02))' : 'linear-gradient(135deg,rgba(37,99,235,0.06),rgba(37,99,235,0.02))';
    const avatarBorder = isSub ? 'rgba(124,58,237,0.2)' : roleLower.includes('owner') ? 'rgba(45,122,30,0.2)' : 'rgba(37,99,235,0.15)';
    const avatarColor = isSub ? '#A855F7' : roleLower.includes('owner') ? 'var(--gold)' : '#60A5FA';
    return `
      <div class="team-item" onclick="showTeamDetail(${globalIdx})" style="cursor:pointer">
        <div class="team-avatar" style="color:${isOn?avatarColor:'var(--text3)'};background:${avatarBg};border-color:${avatarBorder}">${ini}</div>
        <div class="team-body">
          <div class="team-name">${name}</div>
          <div class="team-role">${role}${g(m,'Trade','trade') ? ' · '+g(m,'Trade','trade') : ''}</div>
          <div class="team-meta">${isOn?'<span style="display:inline-flex;align-items:center;gap:4px"><span style="width:6px;height:6px;border-radius:50%;background:var(--green);display:inline-block"></span><span class="text-green fw700">Active</span></span>':'<span style="display:inline-flex;align-items:center;gap:4px"><span style="width:6px;height:6px;border-radius:50%;background:var(--text3);display:inline-block"></span><span class="text-dim">Inactive</span></span>'}${currentUser?.role === 'owner' && g(m,'Hourly Rate','hourlyRate') ? ' · <span style="color:var(--gold);font-weight:700">$'+g(m,'Hourly Rate','hourlyRate')+'/hr</span>' : ''}${jobs?' · '+jobs+' job'+(parseInt(jobs)>1?'s':''):''}</div>
        </div>
        <div class="toggle ${isOn?'on':''}" onclick="event.stopPropagation();toggleTeamMember(${row}, this)"></div>
      </div>`;
  };

  let html = '';
  if (crew.length) {
    html += `<div class="section-label" style="padding:10px 4px 6px;font-size:11px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--text3)">Crew (${crew.length})</div>`;
    html += crew.map(renderMember).join('');
  }
  if (subs.length) {
    html += `<div class="section-label" style="padding:16px 4px 6px;font-size:11px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--text3)">Subcontractors (${subs.length})</div>`;
    html += subs.map(renderMember).join('');
  }
  el.innerHTML = html;
}

function showAddTeamMember() {
  // Clear form
  ['newMemberName','newMemberRole','newMemberPhone','newMemberEmail','newMemberUsername','newMemberPassword'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  openModal('addTeamModal');
}

async function saveNewTeamMember() {
  const name = document.getElementById('newMemberName')?.value?.trim();
  if (!name) { toast('× Name is required'); return; }

  const data = {
    name,
    role:          document.getElementById('newMemberRole')?.value?.trim()  || '',
    trade:         document.getElementById('newMemberTrade')?.value?.trim() || '',
    hourly_rate:   parseFloat(document.getElementById('newMemberRate')?.value) || null,
    employee_type: document.getElementById('newMemberType')?.value || 'w2',
    phone:         document.getElementById('newMemberPhone')?.value?.trim() || '',
    email:         document.getElementById('newMemberEmail')?.value?.trim() || '',
  };

  try {
    const result = await api('/api/team', { method: 'POST', body: data });
    if (!result?.ok) throw new Error(result?.error || 'Failed to add team member');

    // If login credentials provided, set them
    const username = document.getElementById('newMemberUsername')?.value?.trim();
    const password = document.getElementById('newMemberPassword')?.value?.trim();
    if (username && password && result.id) {
      const loginRole = document.getElementById('newMemberLoginRole')?.value || 'field';
      await api(`/api/team/${result.id}/set-login`, {
        method: 'POST',
        body: { username, password, role: loginRole }
      });
    }

    closeModal('addTeamModal');
    toast(`${name} added to team!`);
    await loadTeam();
  } catch (e) {
    toast('× ' + (e.message || 'Error adding team member'));
  }
}

let _setLoginMemberId = null;
function showSetLoginModal(memberId, memberName, currentRole) {
  _setLoginMemberId = memberId;
  document.getElementById('setLoginMemberName').textContent = memberName;
  document.getElementById('setLoginUsername').value  = '';
  document.getElementById('setLoginPassword').value  = '';
  document.getElementById('setLoginRole').value      = currentRole || 'field';
  openModal('setLoginModal');
}

async function saveSetLogin() {
  const id       = _setLoginMemberId;
  const username = document.getElementById('setLoginUsername')?.value?.trim();
  const password = document.getElementById('setLoginPassword')?.value?.trim();
  const role     = document.getElementById('setLoginRole')?.value || 'field';
  if (!username || !password) { toast('× Username and password required'); return; }
  try {
    await api(`/api/team/${id}/set-login`, { method: 'POST', body: { username, password, role } });
    closeModal('setLoginModal');
    toast('Login credentials saved!');
    loadSettings(); // Refresh team list
  } catch(e) {
    toast('× ' + (e.message || 'Error saving login'));
  }
}

function showTeamDetail(idx) {
  const m = allTeam[idx];
  if (!m) return;
  const name   = g(m,'Name','name','Full Name') || 'Unknown';
  const role   = g(m,'Role','role','Position') || '—';
  const type   = g(m,'Type','type','Member Type') || '—';
  const phone  = g(m,'Phone','phone');
  const email  = g(m,'Email','email');
  const trade  = g(m,'Trade / Specialty','trade','Trade','Specialty') || '—';
  const rate   = g(m,'Hourly Rate','hourlyRate','Rate') || '—';
  const active = g(m,'Active','active','Is Active');
  const jobs   = g(m,'Active Jobs','active_jobs','Current Assignment','Assignment') || '—';
  const notes  = g(m,'Notes','notes') || '—';
  const isOn   = !active || active.toLowerCase() === 'yes';

  document.getElementById('tmAvatar').textContent = initials(name);
  document.getElementById('tmName').textContent   = name;
  document.getElementById('tmSub').textContent    = role;
  document.getElementById('tmCall').href  = phone ? 'tel:' + phone.replace(/\D/g,'') : '#';
  document.getElementById('tmEmail').href = email ? 'mailto:' + email : '#';

  const memberId = m._row || m.id;
  document.getElementById('tmBody').innerHTML = `
    <div class="modal-section">
      <div class="modal-section-label">Details</div>
      <div class="detail-row"><div class="detail-key">Role</div><div class="detail-val"><input id="tmEditRole" class="form-input" style="font-size:14px;padding:6px 10px" value="${role}"></div></div>
      <div class="detail-row"><div class="detail-key">Trade</div><div class="detail-val"><input id="tmEditTrade" class="form-input" style="font-size:14px;padding:6px 10px" value="${trade === '—' ? '' : trade}" placeholder="Tile, Plumbing, General..."></div></div>
      <div class="detail-row"><div class="detail-key">Rate ($/hr)</div><div class="detail-val"><input id="tmEditRate" class="form-input" type="number" step="0.50" style="font-size:14px;padding:6px 10px" value="${rate === '—' ? '' : rate}" placeholder="45.00"></div></div>
      <div class="detail-row"><div class="detail-key">Type</div><div class="detail-val"><select id="tmEditType" class="form-input" style="font-size:14px;padding:6px 10px"><option value="w2" ${type.includes('w2')||type.includes('Crew')?'selected':''}>W-2 Employee</option><option value="sub" ${type.toLowerCase().includes('sub')?'selected':''}>Subcontractor</option></select></div></div>
      <div class="detail-row"><div class="detail-key">Phone</div><div class="detail-val"><input id="tmEditPhone" class="form-input" style="font-size:14px;padding:6px 10px" value="${phone||''}" placeholder="(303) 555-0000"></div></div>
      <div class="detail-row"><div class="detail-key">Email</div><div class="detail-val"><input id="tmEditEmail" class="form-input" style="font-size:14px;padding:6px 10px" value="${email||''}" placeholder="name@company.com"></div></div>
      <button class="btn btn-primary" style="width:100%;margin-top:10px" onclick="saveTeamEdit(${memberId})">Save Changes</button>
    </div>
    <div class="modal-section">
      <div class="modal-section-label">Current Assignment</div>
      <div style="color:var(--text2);font-size:14px">${jobs === '—' ? 'No active assignments' : jobs}</div>
    </div>
    <div class="modal-section">
      <div class="modal-section-label">Notes</div>
      <textarea id="tmEditNotes" class="note-editor" placeholder="Add notes about this team member...">${notes === '—' ? '' : notes}</textarea>
    </div>
    <div class="modal-section">
      <div class="modal-section-label">Sub Portal</div>
      <div style="display:flex;align-items:center;gap:10px;background:var(--card2);border:1px solid var(--border);border-radius:10px;padding:12px">
        <div style="flex:1;font-size:13px;color:var(--text2);word-break:break-all">${location.origin}/sub/${encodeURIComponent(name)}</div>
        <button class="btn btn-secondary" style="padding:8px 14px;font-size:13px;flex-shrink:0" onclick="copySubLink('${encodeURIComponent(name)}')">Copy</button>
        <a href="/sub/${encodeURIComponent(name)}" target="_blank" class="btn btn-secondary" style="padding:8px 14px;font-size:13px;flex-shrink:0;text-decoration:none">Open ↗</a>
      </div>
    </div>
  `;
  openModal('teamModal');
}

async function saveTeamEdit(memberId) {
  const data = {
    role:          document.getElementById('tmEditRole')?.value?.trim() || '',
    trade:         document.getElementById('tmEditTrade')?.value?.trim() || '',
    hourly_rate:   parseFloat(document.getElementById('tmEditRate')?.value) || null,
    employee_type: document.getElementById('tmEditType')?.value || 'w2',
    phone:         document.getElementById('tmEditPhone')?.value?.trim() || '',
    email:         document.getElementById('tmEditEmail')?.value?.trim() || '',
    notes:         document.getElementById('tmEditNotes')?.value?.trim() || '',
  };
  try {
    const res = await fetch(`/api/team/${memberId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Save failed');
    toast('✓ Team member updated!');
    closeModal('teamModal');
    await loadTeam();
  } catch (e) {
    toast('× ' + e.message, 3000);
  }
}

function copySubLink(encodedName) {
  const url = `${location.origin}/sub/${encodedName}`;
  navigator.clipboard.writeText(url).then(() => toast('✓ Sub portal link copied!')).catch(() => {
    const el = document.createElement('textarea');
    el.value = url; document.body.appendChild(el); el.select();
    document.execCommand('copy'); document.body.removeChild(el);
    toast('✓ Sub portal link copied!');
  });
}

async function toggleTeamMember(row, el) {
  const isOn = el.classList.contains('on');
  el.classList.toggle('on', !isOn);
  const newVal = isOn ? 'No' : 'Yes';
  try {
    if (!usingDemo) {
      await fetch(`/api/team/${row}/toggle`, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ active: newVal })
      });
    }
    // Update local state
    const member = allTeam.find(m => m.__row === row);
    if (member) member['Active'] = newVal;
    toast(newVal === 'Yes' ? '✓ Marked active' : '✓ Marked off today');
  } catch(e) {
    el.classList.toggle('on', isOn); // revert
    toast('! Could not update');
  }
}

// ── TIME CLOCK ────────────────────────────────────────────────────
function switchTeamTab(tab) {
  document.getElementById('teamTabMembers').classList.toggle('active', tab === 'members');
  document.getElementById('teamTabClock').classList.toggle('active', tab === 'clock');
  document.getElementById('teamMembersView').style.display = tab === 'members' ? '' : 'none';
  document.getElementById('teamClockView').style.display   = tab === 'clock'   ? '' : 'none';
  if (tab === 'clock') loadTimeclock();
}

async function loadTimeclock() {
  const list = document.getElementById('clockList');
  if (!list) return;
  const skelHtml = '<div class="skel-item"><div class="skel-avatar skeleton"></div><div class="skel-lines"><div class="skel-line w60 skeleton"></div><div class="skel-line w40 skeleton"></div></div></div>';
  list.innerHTML = skelHtml.repeat(2);

  try {
    const res  = await fetch('/api/timeclock');
    const data = await res.json();

    // Update date label
    const label = document.getElementById('clockDateLabel');
    if (label) {
      const d = new Date();
      label.textContent = d.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' });
    }

    if (!data.members?.length) {
      list.innerHTML = '<div style="text-align:center;padding:32px;color:var(--text2);font-size:14px">No team members found.<br>Add team members in Settings.</div>';
      return;
    }

    list.innerHTML = data.members.map(m => `
      <div style="background:var(--card);border:1px solid var(--border);border-radius:var(--r);padding:14px 16px;margin-bottom:10px;display:flex;align-items:center;gap:14px">
        <div style="width:44px;height:44px;border-radius:50%;background:${m.clockedIn ? 'rgba(34,197,94,.15)' : 'var(--card2)'};border:2px solid ${m.clockedIn ? 'var(--green)' : 'var(--border)'};display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">
          ${m.clockedIn ? '<span style="color:#16A34A">●</span>' : '○'}
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-size:15px;font-weight:700;color:var(--text)">${m.name}</div>
          <div style="font-size:12px;color:var(--text2);margin-top:1px">${m.role || 'Team Member'}</div>
          <div style="font-size:12px;margin-top:4px;color:${m.clockedIn ? 'var(--green)' : 'var(--text3)'}">
            ${m.clockedIn
              ? `<span style="color:#16A34A">●</span> Clocked in · ${m.todayHours}h today`
              : m.todayHours > 0
                ? `● Clocked out · ${m.todayHours}h today`
                : '● Not clocked in'}
          </div>
        </div>
        <button
          onclick="punchClock('${m.name.replace(/'/g, "\\'")}', '${m.clockedIn ? 'OUT' : 'IN'}')"
          style="padding:10px 16px;border-radius:10px;font-size:13px;font-weight:700;border:none;cursor:pointer;flex-shrink:0;${m.clockedIn ? 'background:rgba(239,68,68,.1);color:var(--red)' : 'background:rgba(34,197,94,.12);color:var(--green)'}">
          ${m.clockedIn ? 'Clock Out' : 'Clock In'}
        </button>
      </div>
    `).join('');
  } catch(e) {
    list.innerHTML = '<div style="text-align:center;padding:32px;color:var(--text2)">Could not load time clock</div>';
  }
}

async function punchClock(name, action) {
  try {
    const res  = await fetch('/api/timeclock/punch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, action })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    toast(action === 'IN' ? `✓ ${name} clocked in` : ` ${name} clocked out`);
    loadTimeclock();
  } catch(e) {
    toast('Punch failed: ' + e.message);
  }
}

/* ─── MARKETING PAGE ────────────────────────────────────────────── */
let mktgFilterActive = 'all';

async function loadMarketing() {
  allMarketing = await api('/api/marketing') || [];
  renderMarketing();
}

function setMktgFilter(btn) {
  document.querySelectorAll('#page-marketing .chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  mktgFilterActive = btn.dataset.filter;
  renderMarketing();
}

function renderMarketing() {
  let items = allMarketing.filter(m => {
    if (mktgFilterActive === 'all') return true;
    const type = (g(m,'Type','Campaign Type','type') || '').toLowerCase();
    return type.includes(mktgFilterActive);
  });

  const el = document.getElementById('marketingList');
  if (items.length === 0) {
    el.innerHTML = `<div class="empty"><div class="empty-icon"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div><div class="empty-title">No campaigns</div><div class="empty-sub">No campaigns set up yet. Create one to get started.</div></div>`;
    return;
  }

  const icons = { 'seasonal':'<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2a3 3 0 0 0 0 6"/><path d="M12 22a3 3 0 0 1 0-6"/></svg>', 'referral':'<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>', 're-engagement':'<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>', 'default':'<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' };

  el.innerHTML = items.map((m) => {
    const name     = g(m,'Campaign Name','campaignName','Name') || 'Campaign';
    const desc     = g(m,'Message Theme','description','Description','Message') || '—';
    const segment  = g(m,'Target Segment','type','Campaign Type','Type') || '';
    const type     = segment.toLowerCase() || 'default';
    const status   = (g(m,'Status','status','Campaign Status') || '').toLowerCase();
    const launched = status.includes('launch') || status.includes('sent');
    const row      = m.__row || m._row;
    const typeIcon = Object.keys(icons).find(k => type.includes(k));
    const icon     = icons[typeIcon] || icons.default;

    return `
      <div class="mktg-card">
        <div class="mktg-icon">${icon}</div>
        <div class="mktg-body">
          <div class="mktg-name">${name}</div>
          <div class="mktg-desc">${desc}</div>
          <div class="mktg-meta">${segment||'Campaign'} · ${g(m,'Target Segment','audience','Target Audience')||'All contacts'}</div>
        </div>
        <button class="mktg-launch ${launched?'sent':''}" onclick="launchCampaign(${row}, this)" ${launched?'disabled':''}>
          ${launched ? '✓ Sent' : 'Launch'}
        </button>
      </div>
    `;
  }).join('');
}

async function launchCampaign(row, btn) {
  if (btn.classList.contains('sent')) return;
  btn.textContent = '…';
  try {
    if (!usingDemo) {
      await fetch(`/api/marketing/${row}/launch`, {
        method: 'POST', headers: {'Content-Type':'application/json'}, body: '{}'
      });
    }
    btn.classList.add('sent');
    btn.textContent = '✓ Sent';
    btn.disabled = true;
    toast('Campaign launched!');
  } catch(e) {
    btn.textContent = 'Launch';
    toastError('Launch failed');
  }
}

/* ─── CAMPAIGN CREATOR ─────────────────────────────────────────── */
function openCampaignModal() {
  document.getElementById('campName').value = '';
  document.getElementById('campType').value = 're-engagement';
  document.getElementById('campAudience').value = 'all_leads';
  document.getElementById('campBody').value = '';
  document.getElementById('campaignModal').style.display = 'flex';
}

function closeCampaignModal() {
  document.getElementById('campaignModal').style.display = 'none';
}

function generateCampaignTemplate() {
  const type = document.getElementById('campType').value;
  const audience = document.getElementById('campAudience').value;
  const companyName = document.title.replace(' CRM','') || 'our company';

  const templates = {
    're-engagement': `Hi {name},\n\nIt's been a while since we last connected! Spring is the perfect time to tackle those outdoor projects you've been thinking about.\n\nWe'd love to offer you a free consultation to discuss your vision. As a valued past contact, you'll receive priority scheduling.\n\nReply to this email or book a time at {calendly_link}.\n\nBest,\n${companyName}`,
    'referral': `Hi {name},\n\nThank you for trusting us with your project! We're so glad you're happy with the results.\n\nIf you know anyone who could use our services, we'd truly appreciate the referral. As a thank you, we offer a $100 credit toward any future service for each successful referral.\n\nSimply have them mention your name when they reach out!\n\nWarm regards,\n${companyName}`,
    'seasonal': `Hi {name},\n\nSpring is here and it's the perfect time to refresh your outdoor space!\n\nWe're currently booking spring projects and offering early-bird pricing for estimates scheduled this month.\n\nSchedule your free consultation: {calendly_link}\n\nBest,\n${companyName}`,
    'newsletter': `Hi {name},\n\nHere's your monthly update from ${companyName}:\n\n- Recently completed projects\n- Seasonal tips for your landscape\n- Special offers for our community\n\nVisit our website to learn more or reply to schedule a consultation.\n\nBest,\n${companyName}`,
  };

  document.getElementById('campBody').value = templates[type] || templates['re-engagement'];
  toast('Template generated');
}

async function saveCampaign() {
  const name = document.getElementById('campName').value.trim();
  const type = document.getElementById('campType').value;
  const audience = document.getElementById('campAudience').value;
  const body = document.getElementById('campBody').value.trim();

  if (!name) { toastError('Enter a campaign name'); return; }
  if (!body) { toastError('Enter a message body'); return; }

  try {
    await api('/api/marketing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, campaign_type: type, targetSegment: audience, body })
    });
    closeCampaignModal();
    toast('Campaign created');
    loadMarketing();
  } catch(e) {
    toastError('Failed to create campaign');
  }
}

/* ─── APPROVALS PAGE ────────────────────────────────────────────── */
let allApprovals = [];

async function loadApprovals() {
  allApprovals = await api('/api/approvals') || [];
  renderApprovals();
}

function renderApprovals() {
  const el = document.getElementById('approvalsList');
  if (!el) return;

  if (allApprovals.length === 0) {
    el.innerHTML = `
      <div class="empty">
        <div class="empty-icon">✓</div>
        <div class="empty-title">All clear!</div>
        <div class="empty-sub">No documents waiting for approval</div>
      </div>`;
    return;
  }

  const typeIcons = { proposal: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>', contract: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>', template: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>' };
  const typeColors = { proposal: 'badge-gold', contract: 'badge-blue', template: 'badge-gray' };

  el.innerHTML = allApprovals.map((item, idx) => {
    const icon  = typeIcons[item.type]  || '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
    const badge = typeColors[item.type] || 'badge-gray';
    const val   = item.jobValue ? `<span style="color:var(--gold);font-weight:800">${item.jobValue}</span>` : '';
    return `
      <div class="approval-card" id="apCard-${idx}">
        <div class="approval-card-header">
          <span class="badge ${badge}">${icon} ${item.label || item.type}</span>
          ${item.jobId ? `<span style="font-size:11px;color:var(--text3)">${item.jobId}</span>` : ''}
        </div>
        <div class="approval-client">${item.clientName || '—'}</div>
        <div class="approval-sub">${item.serviceType || '—'} ${val ? '· ' + val : ''}</div>
        <div class="approval-actions">
          ${item.docLink
            ? `<a class="btn btn-secondary" href="${item.docLink}" target="_blank" style="flex:1;text-align:center"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> View Doc</a>`
            : `<button class="btn btn-secondary" disabled style="flex:1;opacity:.4">No Link</button>`
          }
          <button class="btn btn-green" style="flex:1" onclick="approveItem(${idx}, event)">✓ Approve</button>
          <button class="btn btn-danger" style="flex:1" onclick="flagItem(${idx}, event)"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg> Flag</button>
        </div>
      </div>`;
  }).join('');
}

async function approveItem(idx, e) {
  e?.stopPropagation();
  const item = allApprovals[idx];
  if (!item) return;
  const btn = e?.currentTarget;
  if (btn) { btn.textContent = '…'; btn.disabled = true; }

  if (!usingDemo) {
    try {
      const res = await fetch(`/api/jobs/${item._row}/approve`, {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ type: item.type }),
      });
      if (!res.ok) throw new Error('Failed');
    } catch {
      toast('! Could not approve — try again');
      if (btn) { btn.textContent = '✓ Approve'; btn.disabled = false; }
      return;
    }
  }

  // Remove from list and re-render
  allApprovals.splice(idx, 1);
  renderApprovals();
  toast(`✓ ${item.label} approved — sending now`);
  // Update dashboard badge
  const badge = document.getElementById('dashApprovalBadge');
  const desc  = document.getElementById('dashApprovalDesc');
  if (allApprovals.length === 0) {
    if (badge) badge.style.display = 'none';
    if (desc)  desc.textContent = 'All clear';
  } else {
    if (desc) desc.textContent = `${allApprovals.length} waiting for review`;
  }
}

async function flagItem(idx, e) {
  e?.stopPropagation();
  const item = allApprovals[idx];
  if (!item) return;
  const btn = e?.currentTarget;
  if (btn) { btn.textContent = '…'; btn.disabled = true; }

  if (!usingDemo) {
    try {
      const res = await fetch(`/api/jobs/${item._row}/flag`, {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ type: item.type }),
      });
      if (!res.ok) throw new Error('Failed');
    } catch {
      toast('! Could not flag — try again');
      if (btn) { btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg> Flag'; btn.disabled = false; }
      return;
    }
  }

  allApprovals.splice(idx, 1);
  renderApprovals();
  toast(`${item.label} flagged — marked "Needs Revision"`);
  const badge = document.getElementById('dashApprovalBadge');
  const desc  = document.getElementById('dashApprovalDesc');
  if (allApprovals.length === 0) {
    if (badge) badge.style.display = 'none';
    if (desc)  desc.textContent = 'All clear';
  } else {
    if (desc) desc.textContent = `${allApprovals.length} waiting for review`;
  }
}

/* ─── CONVERSATIONS PAGE ────────────────────────────────────────── */
let allConversations = [], filteredConversations = [];

async function loadConversations() {
  const el = document.getElementById('convList');
  allConversations = await api('/api/conversations') || [];
  filteredConversations = allConversations;
  renderConversations();
}

function filterConversations() {
  const q = document.getElementById('convSearch')?.value?.toLowerCase() || '';
  filteredConversations = q
    ? allConversations.filter(c =>
        (c.name || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.project || '').toLowerCase().includes(q))
    : allConversations;
  renderConversations();
}

function renderConversations() {
  const el = document.getElementById('convList');
  if (!el) return;

  if (!filteredConversations.length) {
    el.innerHTML = `
      <div class="empty">
        <div class="empty-icon"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>
        <div class="empty-title">No conversations yet</div>
        <div class="empty-sub">Email threads will appear here once the AI sends outreach</div>
      </div>`;
    return;
  }

  el.innerHTML = filteredConversations.map((c, i) => {
    const ini = (c.name || '?').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
    const isJob = c.source === 'job';
    const sourceLabel = isJob ? `${c.jobId || 'Job'}` : 'Lead';
    const sourceBg = isJob ? 'rgba(45,122,30,0.08)' : 'rgba(37,99,235,0.08)';
    const sourceColor = isJob ? 'var(--gold)' : 'var(--blue)';
    const time = c.lastContact ? relTime(c.lastContact) : '';
    const statusBadge = c.status
      ? `<span class="badge ${statusColor(c.status, c.source)}" style="font-size:9px">${c.status}</span>`
      : '';
    const jobClick = isJob && c._row ? ` onclick="event.stopPropagation();closeModal('threadModal');navigate('jobs');setTimeout(()=>{const idx=allJobs.findIndex(j=>(j._row||j.id)===${c._row});if(idx>=0)showJobDetail(idx)},200)"` : '';
    return `
      <div class="conv-item" onclick="openThread(${i})">
        <div class="conv-avatar">${ini}</div>
        <div class="conv-body">
          <div class="conv-name">${c.name || 'Unknown'}</div>
          <div class="conv-meta">${c.project || c.email || ''} ${statusBadge}</div>
        </div>
        <div class="conv-right">
          <div class="conv-time">${time}</div>
          <div class="conv-source" style="background:${sourceBg};color:${sourceColor};padding:2px 8px;border-radius:6px;font-size:10px;font-weight:700;cursor:${isJob?'pointer':'default'}"${jobClick}>${sourceLabel}</div>
        </div>
      </div>`;
  }).join('');
}

async function openThread(idx) {
  const conv = filteredConversations[idx];
  if (!conv) return;

  document.getElementById('threadModalName').textContent = conv.name || '—';
  document.getElementById('threadModalSub').textContent  =
    `${conv.project || conv.email || ''} · ${conv.source === 'job' ? conv.jobId || 'Job' : 'Lead'}`;
  document.getElementById('threadModalBody').innerHTML =
    '<div style="padding:20px;text-align:center;color:var(--text3);font-size:13px">Loading thread…</div>';

  document.getElementById('threadModal').classList.add('open');

  try {
    const res  = await fetch(`/api/thread/${encodeURIComponent(conv.threadId)}`);
    const msgs = res.ok ? await res.json() : [];

    if (!msgs.length) {
      document.getElementById('threadModalBody').innerHTML =
        '<div style="padding:20px;text-align:center;color:var(--text3);font-size:13px">No messages found</div>';
      return;
    }

    // Detect which email belongs to our company (outbound = AI-sent)
    const settingsEmail = (window._companyEmail || '').toLowerCase();
    document.getElementById('threadModalBody').innerHTML = msgs.map(m => {
      const from = m.from || '';
      const date = m.date ? new Date(m.date).toLocaleString('en-US',
        { month:'short', day:'numeric', hour:'numeric', minute:'2-digit', hour12:true }) : '';
      const body = (m.body || '').trim().slice(0, 1200);
      const fromLower = from.toLowerCase();
      const isOutbound = settingsEmail && fromLower.includes(settingsEmail) || fromLower.includes('noreply') || fromLower.includes('system');
      const aiBadge = isOutbound ? '<span style="background:rgba(45,122,30,0.1);color:var(--gold);font-size:9px;font-weight:700;padding:2px 6px;border-radius:4px;margin-left:6px;letter-spacing:.3px">AI SENT</span>' : '';
      const msgBg = isOutbound ? 'background:rgba(45,122,30,0.03);border-left:3px solid var(--gold)' : 'border-left:3px solid var(--border)';
      return `
        <div class="thread-message" style="${msgBg}">
          <div class="thread-msg-header">
            <div class="thread-msg-from">${from}${aiBadge}</div>
            <div class="thread-msg-date">${date}</div>
          </div>
          <div class="thread-msg-body">${body}</div>
        </div>`;
    }).join('');
  } catch (e) {
    document.getElementById('threadModalBody').innerHTML =
      `<div style="padding:20px;color:var(--red);font-size:13px">Error: ${e.message}</div>`;
  }
}

function statusColor(status, source) {
  const s = (status || '').toLowerCase();
  if (source === 'lead') {
    if (s.includes('hot') || s.includes('new')) return 'badge-red';
    if (s.includes('warm') || s.includes('contact')) return 'badge-yellow';
    if (s.includes('convert')) return 'badge-green';
    return 'badge-gray';
  }
  if (s.includes('progress') || s.includes('active')) return 'badge-blue';
  if (s.includes('complete')) return 'badge-green';
  return 'badge-gray';
}

// ── SMS CONVERSATIONS ──────────────────────────────────────────────────────

let _activeConvTab = 'email';

function switchConvTab(tab) {
  _activeConvTab = tab;
  const emailPanel = document.getElementById('convPanelEmail');
  const smsPanel   = document.getElementById('convPanelSms');
  const emailBtn   = document.getElementById('convTabEmail');
  const smsBtn     = document.getElementById('convTabSms');

  if (tab === 'sms') {
    if (emailPanel) emailPanel.style.display = 'none';
    if (smsPanel)   smsPanel.style.display   = 'block';
    if (emailBtn) { emailBtn.style.background = 'var(--card2)'; emailBtn.style.color = 'var(--text2)'; emailBtn.style.fontWeight = '600'; }
    if (smsBtn)   { smsBtn.style.background   = 'var(--gold)';  smsBtn.style.color   = '#000';         smsBtn.style.fontWeight  = '700'; }
    loadSmsConversations();
  } else {
    if (emailPanel) emailPanel.style.display = 'block';
    if (smsPanel)   smsPanel.style.display   = 'none';
    if (emailBtn) { emailBtn.style.background = 'var(--gold)';  emailBtn.style.color = '#000';         emailBtn.style.fontWeight = '700'; }
    if (smsBtn)   { smsBtn.style.background   = 'var(--card2)'; smsBtn.style.color   = 'var(--text2)'; smsBtn.style.fontWeight  = '600'; }
  }
}

async function loadSmsConversations() {
  const el = document.getElementById('smsConversations');
  if (!el) return;
  el.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text2)">Loading SMS…</div>';

  try {
    const res  = await fetch('/api/sms');
    const msgs = await res.json();

    if (!Array.isArray(msgs) || !msgs.length) {
      el.innerHTML = `
        <div style="padding:32px;text-align:center;color:var(--text2)">
          <div style="font-size:32px;margin-bottom:10px"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg></div>
          <div style="font-weight:700;margin-bottom:6px">No SMS yet</div>
          <div style="font-size:13px">Texts will appear here when clients or leads text your Twilio number.</div>
        </div>`;
      return;
    }

    // Group by phone number
    const byPhone = {};
    msgs.forEach(m => {
      if (!byPhone[m.phone]) byPhone[m.phone] = { name: m.name, phone: m.phone, messages: [] };
      byPhone[m.phone].messages.push(m);
    });

    el.innerHTML = Object.values(byPhone).map(conv => {
      const last  = conv.messages[0];
      const count = conv.messages.length;
      const safeName = (conv.name || '').replace(/'/g, '&#39;');
      return `
        <div style="background:var(--card);border:1px solid var(--border);border-radius:var(--r);padding:14px 16px;margin-bottom:8px;cursor:pointer" onclick="openSmsThread('${conv.phone}', '${safeName}')">
          <div style="display:flex;align-items:center;gap:12px">
            <div style="width:40px;height:40px;border-radius:50%;background:rgba(191,148,56,.12);border:1px solid rgba(191,148,56,.25);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg></div>
            <div style="flex:1;min-width:0">
              <div style="font-size:15px;font-weight:700;color:var(--text1)">${conv.name || conv.phone}</div>
              <div style="font-size:12px;color:var(--text2);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${last.direction === 'INBOUND' ? '← ' : '→ '}${last.message}</div>
            </div>
            <div style="font-size:11px;color:var(--text3);text-align:right;flex-shrink:0">
              <div>${count} msg${count !== 1 ? 's' : ''}</div>
              <div style="margin-top:3px">${last.type || ''}</div>
            </div>
          </div>
        </div>`;
    }).join('');
  } catch(e) {
    el.innerHTML = '<div style="padding:24px;text-align:center;color:var(--text2)">Could not load SMS</div>';
  }
}

function openSmsThread(phone, name) {
  const msg = prompt(`Reply to ${name || phone}:`);
  if (!msg) return;
  fetch('/api/sms/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: phone, message: msg, name })
  }).then(r => r.json()).then(data => {
    if (data.ok) {
      toastSuccess(`Sent to ${name || phone}`);
      loadSmsConversations();
    } else {
      toastError(data.error || 'Send failed');
    }
  }).catch(() => toastError('Send failed'));
}

function relTime(str) {
  try {
    const diff = (Date.now() - new Date(str)) / 1000;
    if (diff < 3600)   return Math.round(diff/60) + 'm ago';
    if (diff < 86400)  return Math.round(diff/3600) + 'h ago';
    if (diff < 604800) return Math.round(diff/86400) + 'd ago';
    return new Date(str).toLocaleDateString('en-US', { month:'short', day:'numeric' });
  } catch { return str; }
}

/* ─── SETTINGS PAGE ─────────────────────────────────────────────── */
// Notification event label → Settings tab key
const NOTIFY_EVENTS = [
  { key: 'Notify: New Lead',          label: 'New Lead',          icon: '' },
  { key: 'Notify: Proposal Approved', label: 'Proposal Approved', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3 6h7l-5.5 4 2 7L12 15l-6.5 4 2-7L2 8h7z"/></svg>' },
  { key: 'Notify: Proposal Declined', label: 'Proposal Declined', icon: '×' },
  { key: 'Notify: Payment Received',  label: 'Payment Received',  icon: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>' },
  { key: 'Notify: Kickoff Confirmed', label: 'Kickoff Confirmed', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' },
  { key: 'Notify: Change Order',      label: 'Change Order',      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>' },
  { key: 'Notify: Field Issue',       label: 'Field Issue',       icon: '!' },
  { key: 'Notify: Job Complete',      label: 'Job Complete',      icon: '✓' },
];

async function loadSettings() {
  const [s, me] = await Promise.all([api('/api/settings'), api('/api/me').catch(() => null)]);
  if (!s) return;
  const set = (id, val) => { const el = document.getElementById(id); if(el) el.value = val||''; };
  set('sCompanyName', s.companyName);
  set('sPhone',       s.phone);
  set('sEmail',       s.email);
  set('sAddress',     s.address);
  set('sOwnerName',   s.ownerName);
  set('sCalendly',    s.calendlyLink);
  set('sReviewLink',  s.googleReviewLink);
  set('sSignature',   s.emailSignature);
  // Business profile
  set('sEmailTone',   s.emailTone);
  set('sAboutUs',     s.aboutUs);
  set('sKeyPoints',   s.keySellingPoints);
  // Estimate settings
  set('sTargetMargin',    s.targetMargin || 25);
  set('sContingency',     s.contingencyPct || 10);
  set('sDefaultLaborRate', s.defaultLaborRate || 45);
  // Doc template IDs
  set('sProposalTemplateId', s.proposalTemplateId);
  set('sEstimateTemplateId', s.estimateTemplateId);
  set('sContractTemplateId', s.contractTemplateId);
  set('sKickoffTemplateId',  s.kickoffTemplateId);
  // Cache calendly link globally for use in lead modal
  _calendlyLink = s.calendlyLink || s.calendly_link || '';
  window._companyEmail = (s.email || '').toLowerCase();

  // Notification preferences
  const prefs = s.notifyPrefs || {};
  const notifyRow = document.getElementById('notifyPrefsRow');
  if (notifyRow) {
    notifyRow.innerHTML = NOTIFY_EVENTS.map(ev => {
      const val = prefs[ev.key] || 'email';
      return `<div class="settings-field">
        <span class="sfield-icon">${ev.icon}</span>
        <div class="sfield-body">
          <div class="sfield-label">${ev.label}</div>
          <select data-notify-key="${ev.key}" style="width:100%;background:transparent;border:none;color:var(--text);font-size:15px;outline:none;padding:2px 0">
            <option value="both"  ${val==='both'  ?'selected':''}>Both (email + text)</option>
            <option value="email" ${val==='email' ?'selected':''}>Email only</option>
            <option value="sms"   ${val==='sms'   ?'selected':''}>Text only</option>
            <option value="none"  ${val==='none'  ?'selected':''}>None (silent)</option>
          </select>
        </div>
      </div>`;
    }).join('');
  }

  // Show current user
  if (me) {
    const el = document.getElementById('currentUserDisplay');
    if (el) el.textContent = `${me.name} (${me.role})`;
  }

  // Team access list — show who has a login set
  const teamListEl = document.getElementById('settingsTeamList');
  if (teamListEl) {
    const team = await api('/api/team').catch(() => []) || [];
    if (team.length === 0) {
      teamListEl.innerHTML = `<div style="padding:12px 16px;font-size:13px;color:var(--text3)">No team members yet.</div>`;
    } else {
      const roleColors = { owner: '#f0c94a', sales: '#3B82F6', field: '#22C55E' };
      teamListEl.innerHTML = team.map(m => {
        const roleColor = roleColors[m.loginRole] || '#9A9A9A';
        const hasLogin = m.hasLogin;
        return `
        <div style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid var(--border)">
          <div style="width:38px;height:38px;border-radius:50%;background:var(--card2);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:var(--text2);flex-shrink:0">${initials(m.name)}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:14px;font-weight:700;color:var(--text)">${m.name}</div>
            <div style="font-size:12px;color:var(--text3)">${m.role || '—'}</div>
          </div>
          <div style="text-align:right;flex-shrink:0">
            ${hasLogin
              ? `<div style="font-size:11px;font-weight:700;color:${roleColor};background:rgba(255,255,255,0.05);border:1px solid ${roleColor}44;border-radius:6px;padding:3px 8px;margin-bottom:4px">${m.loginRole.toUpperCase()}</div>
                 <div style="font-size:11px;color:var(--text3)">@${m.loginUsername}</div>`
              : `<button onclick="showSetLoginModal(${m.id},'${m.name.replace(/'/g,"\\'")}','field')" style="font-size:11px;color:var(--text3);border:1px solid var(--border);background:var(--card2);border-radius:6px;padding:4px 10px;cursor:pointer">Set Login</button>`
            }
          </div>
        </div>`;
      }).join('');
    }
  }

  // Hide settings write for non-owner
  if (me && me.role !== 'owner') {
    document.querySelectorAll('#page-settings input, #page-settings select, #page-settings textarea').forEach(el => el.disabled = true);
    document.querySelectorAll('#page-settings button').forEach(el => el.style.display = 'none');
  }

  // QB section - rendered separately after the form
  const qbSection = document.getElementById('qbSection');
  if (qbSection) {
    fetch('/api/quickbooks/status')
      .then(r => r.ok ? r.json() : { connected: false })
      .catch(() => ({ connected: false }))
      .then(status => {
        if (status.connected) {
          qbSection.innerHTML = `
            <div style="background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.25);border-radius:var(--r);padding:16px;margin-bottom:16px">
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
                <div style="font-size:22px">✓</div>
                <div>
                  <div style="font-size:14px;font-weight:800;color:var(--green)">QuickBooks Connected</div>
                  <div style="font-size:12px;color:var(--text3)">${status.companyName || 'Company'} · ${status.environment || 'production'}</div>
                </div>
              </div>
              <button onclick="disconnectQB()" style="font-size:12px;color:var(--text3);background:none;border:1px solid var(--border);border-radius:8px;padding:6px 14px;cursor:pointer">Disconnect</button>
            </div>`;
        } else {
          qbSection.innerHTML = `
            <div style="background:var(--card);border:1px solid var(--border);border-radius:var(--r);padding:16px;margin-bottom:16px">
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
                <div style="font-size:22px"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></div>
                <div>
                  <div style="font-size:14px;font-weight:800">QuickBooks</div>
                  <div style="font-size:12px;color:var(--text3)">Two-way invoice &amp; payment sync</div>
                </div>
              </div>
              <button onclick="connectQB()" class="btn btn-primary" style="width:100%;padding:12px">Connect QuickBooks</button>
              ${status.error ? '<div style="font-size:11px;color:var(--red);margin-top:8px">' + status.error + '</div>' : ''}
            </div>`;
        }
      });
  }
}

async function saveSettings() {
  const get = id => document.getElementById(id)?.value || '';

  // Collect notification preferences from dynamic dropdowns
  const notifyPrefs = {};
  document.querySelectorAll('[data-notify-key]').forEach(el => {
    notifyPrefs[el.dataset.notifyKey] = el.value;
  });

  const body = {
    companyName:      get('sCompanyName'),
    phone:            get('sPhone'),
    email:            get('sEmail'),
    address:          get('sAddress'),
    ownerName:        get('sOwnerName'),
    calendlyLink:     get('sCalendly'),
    googleReviewLink: get('sReviewLink'),
    emailSignature:   get('sSignature'),
    emailTone:        get('sEmailTone'),
    aboutUs:          get('sAboutUs'),
    keySellingPoints: get('sKeyPoints'),
    targetMargin:     parseFloat(get('sTargetMargin')) || 25,
    contingencyPct:   parseFloat(get('sContingency'))  || 10,
    defaultLaborRate: parseFloat(get('sDefaultLaborRate')) || 45,
    proposalTemplateId: get('sProposalTemplateId').trim(),
    estimateTemplateId: get('sEstimateTemplateId').trim(),
    contractTemplateId: get('sContractTemplateId').trim(),
    kickoffTemplateId:  get('sKickoffTemplateId').trim(),
    notifyPrefs,
  };
  try {
    if (!usingDemo) {
      const res = await fetch('/api/settings', {
        method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error('Save failed');
    }
    // Update company name in header
    document.getElementById('companyName').textContent = body.companyName || '—';
    toast('✓ Settings saved');
  } catch(e) {
    toast('! Could not save settings');
  }
}

/* ─── MODAL HELPERS ─────────────────────────────────────────────── */
function openModal(id) {
  const overlay = document.getElementById(id);
  overlay.style.display = 'flex';
  requestAnimationFrame(() => overlay.classList.add('open'));
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  const overlay = document.getElementById(id);
  overlay.classList.remove('open');
  setTimeout(() => {
    overlay.style.display = 'none';
    document.body.style.overflow = '';
  }, 300);
}

// Swipe down to close modals
document.querySelectorAll('.modal-sheet').forEach(sheet => {
  let startY = 0;
  sheet.addEventListener('touchstart', e => { startY = e.touches[0].clientY; }, {passive:true});
  sheet.addEventListener('touchend', e => {
    const delta = e.changedTouches[0].clientY - startY;
    if (delta > 80) {
      const overlay = sheet.closest('.modal-overlay');
      if (overlay) closeModal(overlay.id);
    }
  }, {passive:true});
});

/* ─── PULL TO REFRESH ───────────────────────────────────────────── */
function initPullToRefresh() {
  let startY = 0, pulling = false;
  const pages = document.querySelector('.pages');
  pages.addEventListener('touchstart', e => {
    const page = document.querySelector('.page.active');
    if (page && page.scrollTop === 0) {
      startY = e.touches[0].clientY;
      pulling = true;
    }
  }, { passive: true });
  pages.addEventListener('touchend', e => {
    if (!pulling) return;
    const delta = e.changedTouches[0].clientY - startY;
    if (delta > 70) {
      refreshAll();
    }
    pulling = false;
  }, { passive: true });
}

/* ─── AI AGENT ACTIVITY STREAM ──────────────────────────────────── */
const agentEvents = [];   // in-memory log (max 200)
let sseConnected  = false;
let sseSource     = null;
let sseReconnectTimer = null;

function connectActivityStream() {
  if (sseSource) { sseSource.close(); sseSource = null; }

  try {
    sseSource = new EventSource('/api/activity-stream');

    sseSource.onopen = () => {
      sseConnected = true;
      setAgentStatus(true);
    };

    sseSource.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        if (event.type === 'connected') { setAgentStatus(true); return; }
        pushAgentEvent(event);
      } catch (_) {}
    };

    sseSource.onerror = () => {
      sseConnected = false;
      setAgentStatus(false);
      sseSource.close();
      sseSource = null;
      // Reconnect after 5s
      clearTimeout(sseReconnectTimer);
      sseReconnectTimer = setTimeout(connectActivityStream, 5000);
    };
  } catch (_) {
    setAgentStatus(false);
  }
}

function setAgentStatus(online) {
  const badges = ['dashLiveBadge', 'agentsLiveBadge'];
  badges.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.className = 'live-badge' + (online ? '' : ' offline');
    const textEl = el.querySelector('span:last-child') || el;
    if (id === 'agentsLiveText') {
      const t = document.getElementById('agentsLiveText');
      if (t) t.textContent = online ? 'LIVE' : 'OFFLINE';
    }
    el.innerHTML = `<span class="live-dot"></span>${online ? 'LIVE' : 'OFFLINE'}`;
  });
  // Show/hide badge on dashboard quick action
  const badge = document.getElementById('dashAgentBadge');
  if (badge) badge.style.display = online ? 'block' : 'none';
}

function pushAgentEvent(event) {
  agentEvents.unshift(event);           // newest first
  if (agentEvents.length > 200) agentEvents.pop();

  renderAgentLog('dashAgentLog',  agentEvents.slice(0, 5));  // dashboard: last 5
  renderAgentLog('agentsLog',     agentEvents);               // agents page: all
}

function renderAgentLog(containerId, events) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!events.length) {
    el.innerHTML = '<div class="agent-empty"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/><line x1="12" y1="3" x2="12" y2="1"/><circle cx="8" cy="16" r="1" fill="currentColor"/><circle cx="16" cy="16" r="1" fill="currentColor"/></svg> AI agents standing by — ready to assist</div>';
    return;
  }
  el.innerHTML = events.map(ev => {
    const dotClass = { info:'dot-info', success:'dot-success', warn:'dot-warn',
                       error:'dot-error', agent:'dot-agent' }[ev.level] || 'dot-info';
    const time = ev.ts ? new Date(ev.ts).toLocaleTimeString('en-US',
      { hour:'numeric', minute:'2-digit', hour12:true }) : '';
    const msg = String(ev.message || '').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    return `
      <div class="agent-event">
        <div class="agent-event-dot ${dotClass}"></div>
        <div class="agent-event-body">
          <div class="agent-event-line">
            <span class="agent-name">${ev.agent || 'Agent'}</span> — ${msg}
          </div>
          ${time ? `<div class="agent-event-time">${time}</div>` : ''}
        </div>
      </div>`;
  }).join('');
  // Auto-scroll agents page log to show newest
  if (containerId === 'agentsLog') el.scrollTop = 0;
}

/* ─── MANUAL TRIGGER ────────────────────────────────────────────── */
async function triggerAgent(type) {
  const rowInput = document.getElementById('triggerRow');
  const rowNumber = rowInput ? parseInt(rowInput.value) : null;

  if (!rowNumber || rowNumber < 2) {
    toast('Enter a valid row number first (≥ 2)');
    return;
  }

  // Visual feedback
  const btns = document.querySelectorAll('.trigger-btn');
  btns.forEach(b => { if (b.getAttribute('onclick')?.includes(type)) b.classList.add('running'); });
  toast(`Firing ${type} on row ${rowNumber}…`, 2000);

  try {
    const res = await fetch('/webhook/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-internal': '1' },
      body: JSON.stringify({ type, rowNumber }),
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    toast(`✓ Agent triggered — watch the live feed`);
  } catch (e) {
    toast(`× Trigger failed: ${e.message}`, 3000);
  }

  setTimeout(() => {
    btns.forEach(b => b.classList.remove('running'));
  }, 3000);
}

/* ─── INIT ──────────────────────────────────────────────────────── */
window.addEventListener('DOMContentLoaded', () => {
  // Render immediately — never block on async calls
  currentUser = { name: '', role: 'owner' }; // safe default
  applyRoleNav(currentUser.role);
  navigate('dashboard');
  initPullToRefresh();
  connectActivityStream();

  // Then load actual role and update if different
  fetch('/api/me')
    .then(r => r.ok ? r.json() : null)
    .catch(() => null)
    .then(me => {
      if (me?.role) {
        currentUser = { name: me.name || '', role: me.role };
        applyRoleNav(me.role);
        // Update greeting
        if (me.name && me.name !== 'Owner') {
          const greetEl = document.getElementById('greetSub');
          if (greetEl) greetEl.textContent = greet() + `, ${me.name}`;
        }
      }
    });

  // Pre-load settings
  api('/api/settings').then(s => {
    if (s) _calendlyLink = s.calendlyLink || s.calendly_link || '';
  });
});

/* ─── FIELD UPDATE PAGE (now Job Site Estimate) ─────────────────── */
let _fieldJobs = [];
let _fieldPhases = {};
let _expandedFieldRow = null;

async function loadField() {
  // page-field is now the Job Site Estimate form — just ensure areas are initialized
  if (!estAreaCount) estAddArea('Front Yard');
  return; // no async data needed
  const el = document.getElementById('fieldJobList');
  if (!el) return;

  try {
    const jobs = await api('/api/jobs') || [];
    _fieldJobs = jobs.filter(j => {
      const s = (j.jobStatus || '').toLowerCase();
      return s.includes('progress') || s.includes('planning');
    });

    if (_fieldJobs.length === 0) {
      el.innerHTML = `<div style="text-align:center;padding:40px 0;color:var(--text3)">
        <div style="font-size:40px;margin-bottom:8px"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/></svg></div>
        <div style="font-size:15px;font-weight:600">No active jobs</div>
        <div style="font-size:13px;margin-top:4px">Jobs in progress will appear here</div>
      </div>`;
      return;
    }

    el.innerHTML = _fieldJobs.map(j => {
      const name = j.clientName || `${j.firstName||''} ${j.lastName||''}`.trim() || 'Unknown';
      const type = j.serviceType || 'Project';
      const status = j.jobStatus || 'In Progress';
      const row = j._row;
      return `
        <div class="field-job-card" id="field-card-${row}" onclick="toggleFieldCard(${row})">
          <div class="field-job-header">
            <div>
              <div class="field-job-name">${name}</div>
              <div class="field-job-type">${type} · Row ${row}</div>
            </div>
            <div>${statusBadge(status)}</div>
          </div>
          <div class="field-update-form" id="field-form-${row}">
            <div style="font-size:13px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Today's Progress</div>
            <textarea class="field-textarea" id="field-note-${row}" placeholder="What got done today? Any issues? Materials needed?"></textarea>

            <div class="field-notify-row">
              <input type="checkbox" id="field-notify-${row}" style="width:18px;height:18px;accent-color:var(--gold)">
              <label for="field-notify-${row}">Send client a progress update email</label>
            </div>

            <div style="font-size:13px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.5px;margin:14px 0 8px">Phases</div>
            <div class="field-phase-list" id="field-phases-${row}">
              <div style="color:var(--text3);font-size:13px">Loading phases…</div>
            </div>

            <!-- Photo Upload -->
            <div style="margin:14px 0 0">
              <div style="font-size:13px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg> Add Photo</div>
              <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
                <label style="display:flex;align-items:center;gap:6px;background:var(--bg2,#F4F5F7);border:1px dashed var(--border);border-radius:10px;padding:10px 16px;cursor:pointer;font-size:14px;font-weight:600;color:var(--text2)">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg> Choose Photo
                  <input type="file" accept="image/*" capture="environment" id="photo-input-${row}" style="display:none"
                    onchange="previewPhoto(${row}, this)">
                </label>
                <div id="photo-preview-${row}" style="display:none;align-items:center;gap:8px">
                  <img id="photo-thumb-${row}" style="width:52px;height:52px;border-radius:8px;object-fit:cover" src="">
                  <input id="photo-caption-${row}" placeholder="Caption (optional)" style="border:1px solid var(--border);border-radius:8px;padding:8px 10px;font-size:13px;flex:1;min-width:0">
                  <button onclick="uploadPhoto(${row}, event)" style="background:var(--navy);color:#fff;border:none;border-radius:8px;padding:8px 14px;font-size:13px;font-weight:700;cursor:pointer" id="upload-btn-${row}">Upload</button>
                </div>
              </div>
            </div>

            <div class="field-actions">
              <button class="btn btn-gold" style="flex:1;font-size:15px;padding:14px" onclick="submitFieldUpdate(${row}, event)">✓ Log Update</button>
            </div>

            <div class="field-issue-section">
              <div class="field-issue-title">! Flag an Issue</div>
              <div class="severity-chips" id="sev-chips-${row}">
                <button class="severity-chip low" onclick="setSeverity(${row},'Low',this)"><span style="color:#16A34A">●</span> Low</button>
                <button class="severity-chip medium" onclick="setSeverity(${row},'Medium',this)"><span style="color:#D97706">●</span> Medium</button>
                <button class="severity-chip high" onclick="setSeverity(${row},'High',this)"><span style="color:#DC2626">●</span> High</button>
              </div>
              <textarea class="field-textarea" id="field-issue-${row}" placeholder="Describe the issue — owner will be notified immediately via text and email" style="min-height:70px"></textarea>
              <button class="btn btn-danger" style="width:100%;margin-top:10px;padding:13px;font-size:15px" onclick="submitFieldIssue(${row}, event)"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg> Alert Owner Now</button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Load phases for all active jobs
    for (const j of _fieldJobs) {
      loadFieldPhases(j._row, j.jobId);
    }

  } catch (e) {
    el.innerHTML = `<div style="color:var(--red);padding:20px">Failed to load jobs: ${e.message}</div>`;
  }
}

function toggleFieldCard(row) {
  const form = document.getElementById(`field-form-${row}`);
  if (!form) return;
  const isOpen = form.classList.contains('open');
  // Close all others
  document.querySelectorAll('.field-update-form.open').forEach(f => f.classList.remove('open'));
  if (!isOpen) form.classList.add('open');
}

async function loadFieldPhases(row, jobId) {
  const el = document.getElementById(`field-phases-${row}`);
  if (!el) return;
  try {
    const phases = await api('/api/phases?jobId=' + encodeURIComponent(jobId || '')) || [];
    if (!phases.length) {
      el.innerHTML = `<div style="color:var(--text3);font-size:13px">No phases set up yet</div>`;
      return;
    }
    _fieldPhases[row] = phases;
    el.innerHTML = phases.map((p, pi) => {
      const pName    = g(p,'Phase','Phase Name','name','phaseName');
      const pTrade   = g(p,'Trade','Assigned Trade','trade');
      const pStatus  = g(p,'Status','Phase Status','phaseStatus') || '';
      const pRow     = p.__row || p._row || (pi + 2);
      const done     = pStatus.toLowerCase().includes('complete') || pStatus.toLowerCase().includes('done');
      const estCost  = g(p,'estCost','Estimated Cost','Est Cost') || '';
      const actCost  = g(p,'actualCost','Actual Cost','Actual') || '';
      return `
        <div class="field-phase-row" onclick="toggleFieldPhase(${row}, ${pRow}, this)">
          <div class="field-check ${done?'done':''}" id="fcheck-${pRow}">${done?'✓':''}</div>
          <div style="flex:1">
            <div class="field-phase-name">${pName||'—'}</div>
            <div class="field-phase-trade">${pTrade||''}</div>
            <div style="display:flex;gap:12px;margin-top:5px;align-items:center" onclick="event.stopPropagation()">
              ${estCost ? `<span style="font-size:11px;color:var(--text3)">Est: $${parseFloat(String(estCost).replace(/[^0-9.]/g,'')).toLocaleString()}</span>` : ''}
              <input type="number" placeholder="Actual $" value="${actCost ? parseFloat(String(actCost).replace(/[^0-9.]/g,'')) : ''}"
                style="width:90px;background:var(--bg2,#F4F5F7);border:1px solid var(--border);border-radius:7px;padding:4px 8px;font-size:12px;color:var(--text1)"
                id="actual-cost-${pRow}"
                onchange="saveActualCost(${pRow}, this.value)">
            </div>
          </div>
        </div>
      `;
    }).join('');
  } catch (e) {
    el.innerHTML = `<div style="color:var(--text3);font-size:13px">Could not load phases</div>`;
  }
}

async function toggleFieldPhase(jobRow, phaseRow, el) {
  const check = document.getElementById(`fcheck-${phaseRow}`);
  if (!check) return;
  const isDone = check.classList.contains('done');
  const newStatus = isDone ? 'In Progress' : 'Complete';
  check.classList.toggle('done', !isDone);
  check.textContent = !isDone ? '✓' : '';
  try {
    if (!usingDemo) {
      await fetch(`/api/phases/${phaseRow}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
    }
    toast(!isDone ? '✓ Phase marked complete' : 'Phase reopened');
  } catch { toast('! Could not update phase'); }
}

let _severityMap = {};
function setSeverity(row, level, btn) {
  _severityMap[row] = level;
  document.querySelectorAll(`#sev-chips-${row} .severity-chip`).forEach(c => {
    c.classList.remove('active-sev');
  });
  btn.classList.add('active-sev');
}

async function submitFieldUpdate(row, e) {
  e.stopPropagation();
  const noteEl  = document.getElementById(`field-note-${row}`);
  const notifyEl = document.getElementById(`field-notify-${row}`);
  const note = noteEl?.value?.trim();
  if (!note) { toast('! Add a note before logging'); return; }

  const btn = e.target;
  btn.disabled = true;
  btn.textContent = 'Saving…';

  try {
    const res = await fetch(`/api/jobs/${row}/field-update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note, notifyClient: notifyEl?.checked || false }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    toast(`✓ Update logged at ${data.timestamp}`);
    noteEl.value = '';
    if (notifyEl) notifyEl.checked = false;
    document.getElementById(`field-form-${row}`)?.classList.remove('open');
  } catch (err) {
    toast(`× ${err.message}`, 3000);
  } finally {
    btn.disabled = false;
    btn.textContent = '✓ Log Update';
  }
}

async function submitFieldIssue(row, e) {
  e.stopPropagation();
  const issueEl = document.getElementById(`field-issue-${row}`);
  const issue = issueEl?.value?.trim();
  const severity = _severityMap[row] || 'Unknown';
  if (!issue) { toast('! Describe the issue first'); return; }

  const btn = e.target;
  btn.disabled = true;
  btn.textContent = 'Sending alert…';

  try {
    const res = await fetch(`/api/jobs/${row}/field-issue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ issue, severity }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    toast(`Owner alerted via text + email`);
    issueEl.value = '';
    _severityMap[row] = null;
    document.querySelectorAll(`#sev-chips-${row} .severity-chip`).forEach(c => c.classList.remove('active-sev'));
  } catch (err) {
    toast(`× ${err.message}`, 3000);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg> Alert Owner Now';
  }
}

// ─── ACTUAL COST SAVING ───────────────────────────────────────────────────────
async function saveActualCost(phaseRow, value) {
  if (!value && value !== 0) return;
  try {
    await fetch(`/api/phases/${phaseRow}/actual-cost`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ actualCost: parseFloat(value) || 0 }),
    });
    toast('Actual cost saved');
  } catch (err) {
    toast(`× Could not save cost: ${err.message}`, 3000);
  }
}

// ─── PHOTO LOG ────────────────────────────────────────────────────────────────

function previewPhoto(row, input) {
  const file = input.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const thumb   = document.getElementById(`photo-thumb-${row}`);
    const preview = document.getElementById(`photo-preview-${row}`);
    if (thumb)   thumb.src = e.target.result;
    if (preview) preview.style.display = 'flex';
  };
  reader.readAsDataURL(file);
}

async function uploadPhoto(row, e) {
  e.stopPropagation();
  const input   = document.getElementById(`photo-input-${row}`);
  const caption = document.getElementById(`photo-caption-${row}`)?.value?.trim() || '';
  const btn     = document.getElementById(`upload-btn-${row}`);
  const file    = input?.files?.[0];
  if (!file) { toast('! Choose a photo first'); return; }

  btn.disabled    = true;
  btn.textContent = 'Uploading…';

  try {
    const reader = new FileReader();
    const imageData = await new Promise((resolve, reject) => {
      reader.onload  = e => resolve(e.target.result.split(',')[1]); // base64 part only
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const res = await fetch(`/api/jobs/${row}/photos`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ imageData, mimeType: file.type, caption }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    toast(`Photo uploaded!`);
    // Hide preview
    document.getElementById(`photo-preview-${row}`).style.display = 'none';
    input.value = '';
    if (document.getElementById(`photo-caption-${row}`)) document.getElementById(`photo-caption-${row}`).value = '';
  } catch (err) {
    toast(`× Upload failed: ${err.message}`, 4000);
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Upload';
  }
}

// ─── SCHEDULE / CALENDAR ─────────────────────────────────────────────────────

const CAL_COLORS = {
  '9': '#3F51B5', '7': '#039BE5', '5': '#F6BF26', '11': '#D50000',
  '8': '#616161', '1': '#7986CB', '2': '#33B679', '10': '#0B8043',
};

// ── DAILY DISPATCH ────────────────────────────────────────────
async function loadDispatch() {
  const list   = document.getElementById('dispatchList');
  const dateEl = document.getElementById('dispatchDate');
  if (!list) return;

  const today = new Date();
  if (dateEl) {
    dateEl.textContent = today.toLocaleDateString('en-US', { weekday:'long', month:'short', day:'numeric' });
  }

  try {
    const res  = await fetch('/api/jobs');
    const jobs = await res.json();

    const active = (jobs || []).filter(j => {
      const s = (j.status || '').toLowerCase();
      return s.includes('active') || s.includes('progress') || s.includes('planning');
    });

    if (!active.length) {
      list.innerHTML = '<div style="background:var(--card);border:1px solid var(--border);border-radius:var(--r);padding:14px 16px;font-size:13px;color:var(--text2);text-align:center">No active jobs today</div>';
      return;
    }

    // Render cards immediately
    list.innerHTML = active.map((j, i) => {
      const initials = (j.clientName||'?').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
      const cardId   = `dispatch-card-${i}`;
      return `
        <div id="${cardId}" style="background:var(--card);border:1px solid var(--border);border-radius:var(--r);padding:14px 16px;margin-bottom:8px">
          <div style="display:flex;align-items:center;gap:12px">
            <div style="width:36px;height:36px;border-radius:10px;background:rgba(191,148,56,.12);border:1px solid rgba(191,148,56,.25);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:var(--gold);flex-shrink:0">${i+1}</div>
            <div style="flex:1;min-width:0">
              <div style="font-size:15px;font-weight:700;color:var(--text1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${j.clientName || '—'}</div>
              <div style="font-size:12px;color:var(--text2);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${j.projectType || ''} ${j.address ? '· ' + j.address : ''}</div>
              <div style="display:flex;align-items:center;gap:6px;margin-top:5px;flex-wrap:wrap">
                <span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:6px;background:rgba(191,148,56,.1);color:var(--gold)">${j.status || 'Active'}</span>
                ${j.sub ? `<span style="font-size:11px;color:var(--text2)"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="3" y1="1" x2="21" y2="1"/></svg> ${j.sub}</span>` : ''}
                ${j.jobId ? `<span style="font-size:11px;color:var(--text3)">${j.jobId}</span>` : ''}
              </div>
              <!-- Weather badge injected here -->
              <div id="${cardId}-weather" style="margin-top:6px"></div>
            </div>
            ${j.address ? `<a href="https://maps.google.com/?q=${encodeURIComponent(j.address)}" target="_blank" style="padding:8px 12px;background:rgba(59,130,246,.1);border:1px solid rgba(59,130,246,.25);border-radius:10px;font-size:12px;font-weight:700;color:#3B82F6;text-decoration:none;flex-shrink:0"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg></a>` : ''}
          </div>
        </div>
      `;
    }).join('');

    // Fetch weather for each job with an address (background, non-blocking)
    active.forEach((j, i) => {
      if (!j.address) return;
      const weatherEl = document.getElementById(`dispatch-card-${i}-weather`);
      if (!weatherEl) return;

      fetch(`/api/weather?address=${encodeURIComponent(j.address)}`)
        .then(r => r.json())
        .then(data => {
          if (!data.alerts?.length) return;
          weatherEl.innerHTML = `
            <div style="display:flex;flex-wrap:wrap;gap:4px">
              ${data.alerts.map(a => `
                <span style="font-size:11px;font-weight:700;padding:3px 8px;border-radius:6px;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.2);color:#DC2626">
                  ${a.icon} ${a.detail}
                </span>
              `).join('')}
            </div>
          `;
        })
        .catch(() => {}); // Silently ignore weather failures
    });

  } catch(e) {
    list.innerHTML = '<div style="padding:14px;color:var(--text2);font-size:13px;text-align:center">Could not load dispatch</div>';
  }
}

async function loadSchedule() {
  loadDispatch();
  const el = document.getElementById('scheduleList');
  if (!el) return;
  el.innerHTML = `<div class="skel-item"><div class="skel-avatar skeleton"></div><div class="skel-lines"><div class="skel-line w60 skeleton"></div><div class="skel-line w40 skeleton"></div></div></div>`.repeat(3);

  try {
    const events = await api('/api/calendar/events?days=60') || [];
    if (!events.length) {
      el.innerHTML = `<div style="text-align:center;padding:40px 0;color:var(--text3)">
        <div style="font-size:40px;margin-bottom:8px"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div>
        <div style="font-size:15px;font-weight:600">No upcoming events</div>
        <div style="font-size:13px;margin-top:4px">Hit "Sync All" to push jobs &amp; phases to Google Calendar</div>
      </div>`;
      return;
    }

    // Group by date
    const byDate = {};
    events.forEach(e => {
      const dateKey = e.start ? new Date(e.start).toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' }) : 'Unknown';
      if (!byDate[dateKey]) byDate[dateKey] = [];
      byDate[dateKey].push(e);
    });

    el.innerHTML = Object.entries(byDate).map(([date, evs]) => `
      <div style="margin-bottom:16px">
        <div style="font-size:12px;font-weight:800;color:var(--text3);text-transform:uppercase;letter-spacing:1px;padding:0 4px;margin-bottom:6px">${date}</div>
        ${evs.map(e => {
          const color  = CAL_COLORS[e.color] || '#039BE5';
          const timeStr = e.start && e.start.includes('T')
            ? new Date(e.start).toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' })
            : 'All day';
          return `
            <div style="background:var(--card);border-radius:10px;padding:12px 14px;margin-bottom:6px;display:flex;gap:12px;align-items:center;border-left:4px solid ${color}">
              <div style="flex:1;min-width:0">
                <div style="font-weight:700;color:var(--text1);font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e.title}</div>
                <div style="font-size:12px;color:var(--text2);margin-top:2px">${timeStr}${e.location ? ' · ' + e.location : ''}</div>
              </div>
              ${e.link ? `<a href="${e.link}" target="_blank" style="color:var(--text3);font-size:11px;white-space:nowrap;text-decoration:none;padding:4px 10px;border:1px solid var(--border);border-radius:8px">Open ↗</a>` : ''}
            </div>
          `;
        }).join('')}
      </div>
    `).join('');
  } catch (err) {
    el.innerHTML = `<div style="color:var(--text2);padding:20px;text-align:center;font-size:14px">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> Google Calendar not connected yet — or no events in the next 60 days.<br>
      <span style="font-size:12px;color:var(--text3)">Hit "Sync All" after setting up your calendar credentials.</span>
    </div>`;
  }
}

async function syncAllToCalendar() {
  const btn = document.querySelector('[onclick="syncAllToCalendar()"]');
  if (btn) { btn.disabled = true; btn.textContent = 'Syncing…'; }
  try {
    await fetch('/api/calendar/sync', { method: 'POST' });
    toast('Calendar sync started — events will appear in Google Calendar shortly!');
    setTimeout(loadSchedule, 3000);
  } catch (err) {
    toast(`× Sync failed: ${err.message}`, 3000);
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg> Sync All'; }
  }
}

// ─── ANALYTICS ───────────────────────────────────────────────────────────────

function fmt$(n) {
  if (!n && n !== 0) return '—';
  return '$' + Math.round(n).toLocaleString();
}

// Render one animated bar chart row (pure CSS)
function _barItem(label, value, maxValue, color, formattedValue, subLabel) {
  const pct = maxValue > 0 ? Math.min(100, Math.round((value / maxValue) * 100)) : 0;
  return `
    <div style="margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px">
        <span style="font-size:13px;font-weight:600;color:var(--text)">${label}</span>
        <span style="font-size:13px;font-weight:800;color:${color}">${formattedValue}</span>
      </div>
      <div style="height:8px;background:var(--border);border-radius:999px;overflow:hidden">
        <div style="height:100%;width:0%;background:${color};border-radius:999px;transition:width 1s ease" data-tw="${pct}%"></div>
      </div>
      <div style="font-size:11px;color:var(--text3);margin-top:3px">${subLabel !== undefined ? subLabel : (pct + '% of top')}</div>
    </div>
  `;
}

// Animate all bar elements within a container after insertion
function _animateBars(container) {
  if (!container) return;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      container.querySelectorAll('[data-tw]').forEach(bar => {
        bar.style.width = bar.getAttribute('data-tw');
      });
    });
  });
}

// Map a lead source name to a brand color
function _sourceColor(source) {
  const s = (source || '').toLowerCase();
  if (s.includes('referral') || s.includes('refer')) return 'var(--gold)';
  if (s.includes('google'))   return '#4285F4';
  if (s.includes('facebook') || s.includes('fb')) return '#1877F2';
  if (s.includes('instagram')) return '#E1306C';
  if (s.includes('yelp'))     return '#D32323';
  if (s.includes('website') || s.includes('web')) return 'var(--green)';
  return 'var(--text2)';
}

// Color a team score (0–5 rating or 0–100 score)
function _scoreColor(score) {
  if (score === null || score === undefined || isNaN(Number(score))) return 'var(--text2)';
  const n = Number(score);
  // Handle 0-5 rating scale (max 5)
  const normalized = n <= 5 ? (n / 5) * 100 : n;
  if (normalized >= 80) return 'var(--green)';
  if (normalized >= 60) return 'var(--gold)';
  return 'var(--red)';
}

/* ─── SVG CHART HELPERS ────────────────────────────────────────── */

function renderBarChart(containerId, data, opts = {}) {
  const el = document.getElementById(containerId);
  if (!el || !data?.length) return;
  const h = opts.height || 200, barW = opts.barWidth || 40, gap = opts.gap || 12;
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const w = data.length * (barW + gap) + gap;
  const colors = opts.colors || ['#3D6B35'];
  const targetLine = opts.targetLine;

  el.innerHTML = `
    <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:20px;overflow-x:auto">
      ${opts.title ? `<div style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:16px">${opts.title}</div>` : ''}
      <svg width="${w}" height="${h + 30}" viewBox="0 0 ${w} ${h + 30}" style="display:block">
        ${targetLine !== undefined ? `
          <line x1="0" y1="${h - (targetLine / maxVal) * h}" x2="${w}" y2="${h - (targetLine / maxVal) * h}"
                stroke="var(--red)" stroke-width="1" stroke-dasharray="4 3" opacity="0.6"/>
          <text x="${w - 4}" y="${h - (targetLine / maxVal) * h - 4}" fill="var(--red)" font-size="9" text-anchor="end" font-weight="600">${targetLine}% target</text>
        ` : ''}
        ${data.map((d, i) => {
          const barH = (d.value / maxVal) * h;
          const x = gap + i * (barW + gap);
          const y = h - barH;
          const color = d.color || colors[i % colors.length];
          return `
            <rect x="${x}" y="${h}" width="${barW}" height="0" rx="4" fill="${color}" opacity="0.85">
              <animate attributeName="height" from="0" to="${barH}" dur="0.6s" fill="freeze" begin="${i * 0.05}s"/>
              <animate attributeName="y" from="${h}" to="${y}" dur="0.6s" fill="freeze" begin="${i * 0.05}s"/>
            </rect>
            <text x="${x + barW/2}" y="${y - 6}" fill="var(--text)" font-size="11" font-weight="700" text-anchor="middle"
                  opacity="0"><animate attributeName="opacity" from="0" to="1" dur="0.3s" fill="freeze" begin="${0.4 + i * 0.05}s"/>${d.label2 || ''}</text>
            <text x="${x + barW/2}" y="${h + 16}" fill="var(--text3)" font-size="10" text-anchor="middle" font-weight="500">${d.label}</text>
          `;
        }).join('')}
        <line x1="0" y1="${h}" x2="${w}" y2="${h}" stroke="var(--border)" stroke-width="1"/>
      </svg>
    </div>`;
}

function renderDonutChart(containerId, data, opts = {}) {
  const el = document.getElementById(containerId);
  if (!el || !data?.length) return;
  const size = opts.size || 180, stroke = opts.stroke || 28;
  const r = (size - stroke) / 2, cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  const total = data.reduce((s, d) => s + d.value, 0);
  const colors = ['#3D6B35', '#F59E0B', '#3B82F6', '#EC4899', '#8B5CF6', '#EF4444', '#06B6D4'];

  let offset = 0;
  const segments = data.map((d, i) => {
    const pct = total > 0 ? d.value / total : 0;
    const dash = pct * circ;
    const seg = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${d.color || colors[i % colors.length]}"
      stroke-width="${stroke}" stroke-dasharray="${dash} ${circ - dash}" stroke-dashoffset="${-offset}"
      transform="rotate(-90 ${cx} ${cy})" style="transition:stroke-dashoffset 0.8s ease">
      <animate attributeName="stroke-dasharray" from="0 ${circ}" to="${dash} ${circ - dash}" dur="0.8s" fill="freeze" begin="${i * 0.1}s"/>
    </circle>`;
    offset += dash;
    return seg;
  });

  el.innerHTML = `
    <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:20px">
      ${opts.title ? `<div style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:16px">${opts.title}</div>` : ''}
      <div style="display:flex;align-items:center;gap:24px;flex-wrap:wrap">
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="flex-shrink:0">
          <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--border)" stroke-width="${stroke}"/>
          ${segments.join('')}
          <text x="${cx}" y="${cy - 6}" fill="var(--text)" font-size="22" font-weight="800" text-anchor="middle" dominant-baseline="middle">${total}</text>
          <text x="${cx}" y="${cy + 14}" fill="var(--text3)" font-size="10" text-anchor="middle">total</text>
        </svg>
        <div style="display:flex;flex-direction:column;gap:8px;min-width:120px">
          ${data.map((d, i) => `
            <div style="display:flex;align-items:center;gap:8px">
              <span style="width:10px;height:10px;border-radius:3px;background:${d.color || colors[i % colors.length]};flex-shrink:0"></span>
              <span style="font-size:12px;color:var(--text);font-weight:500">${d.label}</span>
              <span style="font-size:12px;color:var(--text3);margin-left:auto;font-weight:700">${d.value}</span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>`;
}

function renderFunnelChart(containerId, stages) {
  const el = document.getElementById(containerId);
  if (!el || !stages?.length) return;
  const maxVal = Math.max(stages[0]?.value || 1, 1);
  const barH = 36, gap = 4;
  const h = stages.length * (barH + gap);
  const colors = ['#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899', '#22C55E'];

  el.innerHTML = `
    <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:20px">
      ${`<div style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:16px">Conversion Funnel</div>`}
      <div style="display:flex;flex-direction:column;gap:${gap}px">
        ${stages.map((s, i) => {
          const pct = Math.max(20, (s.value / maxVal) * 100);
          const color = s.color || colors[i % colors.length];
          const convRate = i > 0 && stages[i-1].value > 0 ? Math.round((s.value / stages[i-1].value) * 100) : null;
          return `
            <div style="display:flex;align-items:center;gap:12px">
              <div style="width:100%;max-width:${pct}%;background:${color}18;border-radius:8px;padding:8px 14px;display:flex;align-items:center;justify-content:space-between;border-left:3px solid ${color};transition:max-width 0.8s ease">
                <span style="font-size:13px;font-weight:600;color:var(--text)">${s.label}</span>
                <span style="font-size:14px;font-weight:800;color:${color}">${s.value}</span>
              </div>
              ${convRate !== null ? `<span style="font-size:10px;color:var(--text3);font-weight:600;flex-shrink:0;width:40px">${convRate}%</span>` : `<span style="width:40px"></span>`}
            </div>`;
        }).join('')}
      </div>
    </div>`;
}

async function renderAnalyticsCharts(profitData, sourcesData) {
  // Revenue bar chart — fetch real data, fall back to demo
  const [realRevenue, realFunnel, realReferrals] = await Promise.all([
    api('/api/analytics/revenue-by-month').catch(() => null),
    api('/api/analytics/funnel').catch(() => null),
    api('/api/analytics/referrals').catch(() => null),
  ]);

  const revenueData = (realRevenue?.length ? realRevenue : null) || DEMO.summary?.revenueByMonth || [];
  if (revenueData.length) {
    renderBarChart('analyticsRevenueChart', revenueData, {
      title: 'Revenue by Month', height: 180, barWidth: 44, gap: 16,
      colors: ['#3D6B35']
    });
  }

  // Conversion funnel — real API first, then compute from leads, then demo
  const funnelData = (realFunnel?.length && realFunnel[0].value > 0) ? realFunnel : null;
  if (funnelData) {
    renderFunnelChart('analyticsFunnelChart', funnelData);
  } else if (allLeads?.length) {
    const stages = [
      { label: 'Total Leads', value: allLeads.length },
      { label: 'Contacted', value: allLeads.filter(l => !/new/i.test(g(l,'leadStatus','Status','status') || 'new')).length },
      { label: 'Qualified', value: allLeads.filter(l => /qualified|proposal|booked|converted/i.test(g(l,'leadStatus','Status','status') || '')).length },
      { label: 'Proposal Sent', value: allLeads.filter(l => /proposal|booked|converted/i.test(g(l,'leadStatus','Status','status') || '')).length },
      { label: 'Won', value: allLeads.filter(l => /converted|won/i.test(g(l,'leadStatus','Status','status') || '')).length },
    ];
    renderFunnelChart('analyticsFunnelChart', stages);
  } else if (DEMO.summary?.conversionFunnel) {
    renderFunnelChart('analyticsFunnelChart', DEMO.summary.conversionFunnel);
  }

  // Lead sources donut — real API first, then demo
  if (sourcesData?.length) {
    renderDonutChart('analyticsSourcesChart', sourcesData.map(s => ({ label: s.source, value: s.leads })), { title: 'Lead Sources' });
  } else if (DEMO.summary?.leadSourcesChart) {
    renderDonutChart('analyticsSourcesChart', DEMO.summary.leadSourcesChart, { title: 'Lead Sources' });
  }

  // Referral leaderboard — use real API data first
  const refEl = document.getElementById('analyticsReferrals');
  if (refEl) {
    const displayData = (realReferrals?.length ? realReferrals : null) || [
      { name: 'Sarah Chen', count: 3 },
      { name: 'The Hendersons', count: 2 },
      { name: 'Tom Bradley', count: 1 },
    ];

    if (displayData.length) {
      refEl.innerHTML = `
        <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:20px">
          <div style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:14px">Referral Leaderboard</div>
          ${displayData.map((r, i) => `
            <div style="display:flex;align-items:center;gap:12px;padding:10px 0;${i < displayData.length - 1 ? 'border-bottom:1px solid var(--border)' : ''}">
              <div style="width:28px;height:28px;border-radius:50%;background:${i === 0 ? 'var(--gold)' : 'var(--card2)'};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:${i === 0 ? '#fff' : 'var(--text3)'};flex-shrink:0">${i + 1}</div>
              <div style="flex:1;font-size:14px;font-weight:600;color:var(--text)">${r.name}</div>
              <div style="font-size:13px;font-weight:700;color:var(--gold)">${r.count} referral${r.count !== 1 ? 's' : ''}</div>
            </div>
          `).join('')}
        </div>`;
    }
  }

  // Profit margins bar chart — real data first, then demo
  if (profitData?.jobs?.length) {
    const bars = profitData.jobs.filter(j => j.margin !== null && j.margin !== undefined).map(j => ({
      label: j.clientName?.split(' ')[0] || 'Job',
      value: j.margin,
      label2: j.margin + '%',
      color: j.margin >= 25 ? '#22C55E' : j.margin >= 15 ? '#F59E0B' : '#EF4444'
    }));
    if (bars.length) renderBarChart('analyticsMarginChart', bars, { title: 'Profit Margins by Job', height: 180, barWidth: 44, gap: 16, targetLine: 25 });
  } else if (DEMO.summary?.jobMargins) {
    renderBarChart('analyticsMarginChart', DEMO.summary.jobMargins, {
      title: 'Profit Margins by Job', height: 180, barWidth: 44, gap: 16,
      targetLine: 25
    });
  }
}

// Summary 2x2 stat grid at the top of analytics
function renderAnalyticsSummary(profitData, sourcesData, teamData) {
  const el = document.getElementById('analyticsSummary');
  if (!el) return;

  const totalRevenue = profitData?.summary?.total    || 0;
  const jobCount     = profitData?.summary?.jobCount || 0;
  const avgJobVal    = jobCount > 0 ? Math.round(totalRevenue / jobCount) : 0;
  const avgMargin    = profitData?.summary?.avgMargin;
  const marginColor  = avgMargin === null || avgMargin === undefined ? 'var(--text2)'
    : avgMargin >= 30 ? 'var(--green)' : avgMargin >= 15 ? 'var(--gold)' : 'var(--red)';

  // Avg customer satisfaction from team ratings (0–5)
  let satLabel = '—';
  if (teamData?.length) {
    const rated = teamData.filter(t => t.avgRating !== null && t.avgRating !== undefined && t.avgRating !== '');
    if (rated.length) {
      const avg = rated.reduce((s, t) => s + parseFloat(t.avgRating || 0), 0) / rated.length;
      satLabel = '★ ' + avg.toFixed(1);
    }
  }

  const tiles = [
    { label: 'Total Pipeline',  value: fmt$(totalRevenue),                  color: 'var(--gold)'  },
    { label: 'Jobs in System',  value: jobCount > 0 ? String(jobCount) : '—', color: 'var(--text)'  },
    { label: 'Avg Job Value',   value: avgJobVal > 0 ? fmt$(avgJobVal) : '—', color: 'var(--blue)'  },
    { label: 'Avg Rating',      value: satLabel,                              color: 'var(--green)' },
  ];

  el.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      ${tiles.map(t => `
        <div style="background:var(--card);border:1px solid var(--border);border-radius:var(--r);padding:14px">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text3);margin-bottom:6px">${t.label}</div>
          <div style="font-size:22px;font-weight:800;color:${t.color};letter-spacing:-.5px">${t.value}</div>
        </div>
      `).join('')}
    </div>
  `;
}

/* ─── INVENTORY / MATERIALS ─────────────────────────────────────── */
let _invData = null;
let _invFilter = 'all';

function invFilter(btn, jobId) {
  document.querySelectorAll('.inv-chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  _invFilter = jobId;
  renderInventoryContent();
}

function renderInventoryContent() {
  const el = document.getElementById('inventoryContent');
  if (!el || !_invData) return;

  const { items: allItems, byJob: allByJob } = _invData;

  // Filter items
  const items = _invFilter === 'all'
    ? allItems
    : allItems.filter(it => it.jobId === _invFilter);

  if (!items.length) {
    el.innerHTML = '<div class="empty-notes">No materials for this selection.</div>';
    return;
  }

  // Group by category overall for summary
  const grandTotal = items.reduce((s, it) => s + (parseFloat((it.totalCost || '').replace(/[$,]/g, '')) || 0), 0);
  const categoryTotals = {};
  items.forEach(it => {
    const cat = it.category || 'Other';
    if (!categoryTotals[cat]) categoryTotals[cat] = { count: 0, total: 0 };
    categoryTotals[cat].count++;
    categoryTotals[cat].total += parseFloat((it.totalCost || '').replace(/[$,]/g, '')) || 0;
  });

  let html = `
    <div class="inv-summary-bar">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <div style="font-size:13px;font-weight:700;color:var(--text3)">TOTAL MATERIALS</div>
        <div style="font-size:22px;font-weight:900;color:var(--gold)">${formatCurrency(grandTotal)}</div>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">
        ${Object.entries(categoryTotals).map(([cat, s]) =>
          `<span style="background:var(--card2);border:1px solid var(--border);border-radius:99px;padding:3px 10px;font-size:11px;color:var(--text2)">${cat} <strong style="color:var(--text)">${s.count}</strong></span>`
        ).join('')}
      </div>
    </div>`;

  // Group by job
  const byJobMap = {};
  items.forEach(it => {
    const k = it.jobId || '—';
    if (!byJobMap[k]) byJobMap[k] = { jobId: it.jobId, clientName: it.clientName, updatedAt: it.updatedAt, items: [] };
    byJobMap[k].items.push(it);
  });

  Object.values(byJobMap).forEach(jg => {
    const jobTotal = jg.items.reduce((s, it) => s + (parseFloat((it.totalCost || '').replace(/[$,]/g, '')) || 0), 0);
    const cats = {};
    jg.items.forEach(it => {
      const c = it.category || 'Other';
      if (!cats[c]) cats[c] = [];
      cats[c].push(it);
    });

    html += `<div class="inv-job-card">
      <div class="inv-job-header">
        <div>
          <div class="inv-job-name">${jg.clientName || jg.jobId}</div>
          <div class="inv-job-sub">Job ${jg.jobId}${jg.updatedAt ? ' · Updated ' + jg.updatedAt : ''}</div>
        </div>
        <div class="inv-job-total">${formatCurrency(jobTotal)}</div>
      </div>`;

    Object.entries(cats).forEach(([cat, catItems]) => {
      const catTotal = catItems.reduce((s, it) => s + (parseFloat((it.totalCost || '').replace(/[$,]/g, '')) || 0), 0);
      html += `<div class="inv-cat-header"><span>${cat}</span><span>${formatCurrency(catTotal)}</span></div>`;
      catItems.forEach(it => {
        html += `
          <div class="inv-item">
            <div>
              <div class="inv-item-name">${it.item}</div>
              <div class="inv-item-meta">${it.quantity} · ${it.unitCost}</div>
              <div class="inv-item-source"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg> ${it.bestSource || '—'}</div>
            </div>
            <div class="inv-item-cost">${it.totalCost || '—'}</div>
          </div>`;
      });
    });

    html += '</div>';
  });

  el.innerHTML = html;
}

/* ─── INVENTORY TAB SWITCHING ───────────────────────────────────── */
let _invActiveTab = 'materials';

function switchInvTab(tab) {
  _invActiveTab = tab;
  document.getElementById('invTabMaterials').classList.toggle('active', tab === 'materials');
  document.getElementById('invTabEquipment').classList.toggle('active', tab === 'equipment');
  document.getElementById('invMaterialFilters').style.display = tab === 'materials' ? '' : 'none';
  document.getElementById('inventoryContent').style.display  = tab === 'materials' ? '' : 'none';
  document.getElementById('equipmentContent').style.display  = tab === 'equipment'  ? '' : 'none';
  if (tab === 'equipment' && !_eqLoaded) loadEquipment();
}

/* ─── EQUIPMENT ─────────────────────────────────────────────────── */
let _allEquipment = [];
let _eqLoaded = false;

const EQ_ICONS = {
  Vehicle: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13" rx="2" ry="2"/><path d="M16 8h4l3 5v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>', Trailer: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13" rx="2" ry="2"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="18" r="3"/></svg>', Ladder: '🪜', Scaffold: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/></svg>',
  'Power Tool': '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>', 'Hand Tool': '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>', Safety: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a8 8 0 0 0-8 8v12h16V10a8 8 0 0 0-8-8z"/><path d="M12 2v20"/></svg>', Other: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
};

async function loadEquipment() {
  _eqLoaded = true;
  const list = document.getElementById('eqList');
  const summary = document.getElementById('eqSummaryLine');
  if (!list) return;

  let data = await api('/api/equipment');
  if (!data?.length && usingDemo) data = DEMO.equipment;
  _allEquipment = data || [];
  renderEquipment();
}

function renderEquipment() {
  const list = document.getElementById('eqList');
  const summary = document.getElementById('eqSummaryLine');
  if (!list) return;

  const items = _allEquipment.filter(e => e.status !== 'Retired');

  const available   = items.filter(e => e.status === 'Available').length;
  const inUse       = items.filter(e => e.status === 'In Use').length;
  const maintenance = items.filter(e => e.status === 'Maintenance').length;
  if (summary) summary.textContent = `${items.length} items · ${available} available · ${inUse} in use${maintenance ? ' · ' + maintenance + ' maintenance' : ''}`;

  if (!items.length) {
    list.innerHTML = '<div class="empty-notes">No equipment yet — tap + Add to get started.</div>';
    return;
  }

  // Group by category
  const cats = {};
  items.forEach(eq => {
    const c = eq.category || 'Other';
    if (!cats[c]) cats[c] = [];
    cats[c].push(eq);
  });

  list.innerHTML = Object.entries(cats).map(([cat, eqs]) => `
    <div style="font-size:11px;font-weight:700;color:var(--text3);letter-spacing:.5px;text-transform:uppercase;padding:8px 0 6px">${cat}</div>
    ${eqs.map(eq => {
      const statusKey = (eq.status || 'available').toLowerCase().replace(' ', '');
      const icon = EQ_ICONS[eq.category] || '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>';
      const assignedInfo = eq.assignedJob ? ` · ${eq.assignedJob}${eq.assignedTo ? ' / ' + eq.assignedTo : ''}` : '';
      const eqRow = eq._row;
      const availBtn = eq.status === 'Available'
        ? `<button class="eq-action-btn" data-eq-row="${eqRow}" onclick="event.stopPropagation();promptAssignEquipment(this)">Assign to Job</button>`
        : eq.status === 'In Use'
        ? `<button class="eq-action-btn" data-eq-row="${eqRow}" onclick="event.stopPropagation();releaseEquipment(this)">Release</button>`
        : '';
      const valDisplay = eq.value ? `<div style="margin-left:auto;font-size:12px;font-weight:700;color:var(--text3)">${eq.value}</div>` : '';
      return `
        <div class="eq-card" id="eq-card-${eqRow}" data-eq-row="${eqRow}" onclick="toggleEqCard(${eqRow})">
          <div class="eq-row">
            <div class="eq-icon">${icon}</div>
            <div class="eq-body">
              <div class="eq-name">${eq.name}</div>
              <div class="eq-meta">${eq.makeModel || eq.category}${assignedInfo}</div>
            </div>
            <span class="eq-status ${statusKey}">${eq.status}</span>
          </div>
          <div class="eq-actions">
            <button class="eq-action-btn primary" data-eq-row="${eqRow}" onclick="event.stopPropagation();openEditEquipment(${eqRow})">Edit</button>
            ${availBtn}
            ${valDisplay}
          </div>
        </div>`;
    }).join('')}
  `).join('');
}

function toggleEqCard(row) {
  const card = document.getElementById('eq-card-' + row);
  if (card) card.classList.toggle('expanded');
}

function openAddEquipment() {
  document.getElementById('eqModalTitle').textContent = 'Add Equipment';
  document.getElementById('eqName').value      = '';
  document.getElementById('eqCategory').value  = 'Vehicle';
  document.getElementById('eqMakeModel').value = '';
  document.getElementById('eqStatus').value    = 'Available';
  document.getElementById('eqValue').value     = '';
  document.getElementById('eqNotes').value     = '';
  document.getElementById('eqEditRow').value   = '';
  document.getElementById('eqDeleteBtn').style.display = 'none';
  openModal('equipmentModal');
}

function openEditEquipment(row) {
  const eq = _allEquipment.find(e => e._row === row);
  if (!eq) return;
  document.getElementById('eqModalTitle').textContent = 'Edit Equipment';
  document.getElementById('eqName').value      = eq.name || '';
  document.getElementById('eqCategory').value  = eq.category || 'Other';
  document.getElementById('eqMakeModel').value = eq.makeModel || '';
  document.getElementById('eqStatus').value    = eq.status || 'Available';
  document.getElementById('eqValue').value     = eq.value || '';
  document.getElementById('eqNotes').value     = eq.notes || '';
  document.getElementById('eqEditRow').value   = row;
  document.getElementById('eqDeleteBtn').style.display = 'inline-flex';
  openModal('equipmentModal');
}

async function saveEquipment() {
  const name = document.getElementById('eqName').value.trim();
  if (!name) { toast('! Name is required'); return; }
  const editRow = document.getElementById('eqEditRow').value;
  const body = {
    name,
    category:  document.getElementById('eqCategory').value,
    makeModel: document.getElementById('eqMakeModel').value.trim(),
    status:    document.getElementById('eqStatus').value,
    value:     document.getElementById('eqValue').value.trim(),
    notes:     document.getElementById('eqNotes').value.trim(),
  };
  try {
    let res;
    if (editRow) {
      res = await fetch(`/api/equipment/${editRow}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
    } else {
      res = await fetch('/api/equipment', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
    }
    if (!res.ok) throw new Error('Save failed');
    toast(editRow ? '✓ Equipment updated' : '✓ Equipment added');
    closeModal('equipmentModal');
    _eqLoaded = false;
    loadEquipment();
  } catch { toast('! Could not save — check connection'); }
}

async function deleteEquipment() {
  const row = document.getElementById('eqEditRow').value;
  if (!row || !confirm('Remove this equipment item?')) return;
  try {
    await fetch(`/api/equipment/${row}`, { method:'DELETE' });
    toast('Removed');
    closeModal('equipmentModal');
    _eqLoaded = false;
    loadEquipment();
  } catch { toast('! Could not delete'); }
}

async function promptAssignEquipment(btn) {
  const row = parseInt(btn.dataset.eqRow, 10);
  const eq = _allEquipment.find(e => e._row === row);
  if (!eq) return;
  const jobId = prompt(`Assign "${eq.name}" to which Job ID? (e.g. JOB-001)`);
  if (!jobId) return;
  const assignedTo = prompt('Assigned to which person? (optional)') || '';
  try {
    const res = await fetch(`/api/equipment/${row}/assign`, {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ jobId: jobId.trim().toUpperCase(), assignedTo }),
    });
    if (!res.ok) throw new Error();
    toast(`✓ Assigned to ${jobId}`);
    _eqLoaded = false;
    loadEquipment();
  } catch { toast('! Could not assign'); }
}

async function releaseEquipment(btn) {
  const row = parseInt(btn.dataset.eqRow, 10);
  const eq = _allEquipment.find(e => e._row === row);
  if (!eq || !confirm(`Release "${eq.name}" back to Available?`)) return;
  try {
    await fetch(`/api/equipment/${row}/release`, { method:'POST' });
    toast('✓ Released — now Available');
    _eqLoaded = false;
    loadEquipment();
  } catch { toast('! Could not release'); }
}

async function loadInventory() {
  const el = document.getElementById('inventoryContent');
  if (!el) return;
  _eqLoaded = false; // reset so equipment reloads fresh

  el.innerHTML = '<div class="skeleton" style="height:80px;border-radius:12px;margin-bottom:12px"></div><div class="skeleton" style="height:80px;border-radius:12px;margin-bottom:12px"></div>';

  let data = await api('/api/inventory');

  // If live but empty (Job Materials tab not populated yet), show demo data
  if (!data?.items?.length) {
    if (usingDemo) {
      data = DEMO.inventory;
    } else {
      el.innerHTML = `
        <div style="text-align:center;padding:40px 20px;color:var(--text3)">
          <div style="font-size:40px;margin-bottom:12px"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg></div>
          <div style="font-size:16px;font-weight:700;color:var(--text2);margin-bottom:8px">No Materials Yet</div>
          <div style="font-size:13px;line-height:1.6">Materials will appear here after the <strong style="color:var(--text)">Pricing Agent</strong> runs on a job.<br><br>Go to a Job → tap the Estimate <strong style="color:var(--gold)">Generate</strong> button to populate this page.</div>
        </div>`;
      return;
    }
  }

  // Store globally and render
  _invData = data;
  _invFilter = 'all';

  // Build filter chips by job
  const filterRow = document.querySelector('.inv-filter-row');
  if (filterRow) {
    const uniqueJobs = [...new Map(data.items.map(it => [it.jobId, it])).values()];
    const chips = uniqueJobs.map(it =>
      `<button class="inv-chip" onclick="invFilter(this,'${it.jobId}')">${it.clientName || it.jobId}</button>`
    ).join('');
    // Replace placeholder button with real chips, keep "All Jobs"
    filterRow.innerHTML = `<button class="inv-chip active" onclick="invFilter(this,'all')">All Jobs</button>${chips}`;
  }

  renderInventoryContent();
}

// ── GOALS & TARGETS ───────────────────────────────────────────────────────────
let _goals = null;

async function loadGoals() {
  try {
    const res = await fetch('/api/goals');
    _goals = await res.json();
  } catch (_) {
    _goals = { revenueGoal: 0, leadsGoal: 0, conversionGoal: 0, jobsGoal: 0 };
  }
}

function renderGoals(actuals) {
  const el = document.getElementById('analyticsGoals');
  if (!el) return;

  const goals = _goals || { revenueGoal: 0, leadsGoal: 0, conversionGoal: 0, jobsGoal: 0 };

  const hasGoals = goals.revenueGoal || goals.leadsGoal || goals.conversionGoal || goals.jobsGoal;
  if (!hasGoals) {
    el.innerHTML = `
      <div style="background:var(--card);border:1px dashed var(--border);border-radius:var(--r);padding:20px;text-align:center;margin-bottom:4px">
        <div style="font-size:24px;margin-bottom:8px"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg></div>
        <div style="font-size:14px;font-weight:700;color:var(--text1);margin-bottom:4px">Set your monthly goals</div>
        <div style="font-size:13px;color:var(--text2);margin-bottom:14px">Track revenue, leads, conversion rate and jobs against your targets.</div>
        <button class="btn btn-gold" style="padding:10px 20px" onclick="openGoalsModal()">Set Goals →</button>
      </div>
    `;
    return;
  }

  const metrics = [
    {
      label:  'Revenue',
      icon:   '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
      actual: actuals?.revenue  || 0,
      goal:   goals.revenueGoal || 0,
      format: v => '$' + Math.round(v).toLocaleString(),
    },
    {
      label:  'New Leads',
      icon:   '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
      actual: actuals?.leads    || 0,
      goal:   goals.leadsGoal   || 0,
      format: v => Math.round(v).toString(),
    },
    {
      label:  'Jobs Done',
      icon:   '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
      actual: actuals?.jobs     || 0,
      goal:   goals.jobsGoal    || 0,
      format: v => Math.round(v).toString(),
    },
    {
      label:  'Conversion',
      icon:   '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
      actual: actuals?.conversion || 0,
      goal:   goals.conversionGoal || 0,
      format: v => Math.round(v) + '%',
    },
  ].filter(m => m.goal > 0);

  if (!metrics.length) return;

  el.innerHTML = `
    <div style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text2);margin-bottom:12px"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg> This Month vs Goals</div>
    ${metrics.map(m => {
      const pct     = m.goal > 0 ? Math.min(100, Math.round((m.actual / m.goal) * 100)) : 0;
      const onTrack = pct >= 70;
      const color   = pct >= 100 ? 'var(--green)' : pct >= 70 ? 'var(--gold)' : 'var(--red)';
      const barColor = pct >= 100 ? '#22C55E' : pct >= 70 ? '#BF9438' : '#EF4444';
      return `
        <div style="background:var(--card);border:1px solid var(--border);border-radius:var(--r);padding:14px 16px;margin-bottom:10px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
            <div style="display:flex;align-items:center;gap:8px">
              <span style="font-size:18px">${m.icon}</span>
              <span style="font-size:14px;font-weight:700;color:var(--text1)">${m.label}</span>
            </div>
            <div style="text-align:right">
              <span style="font-size:15px;font-weight:800;color:${color}">${m.format(m.actual)}</span>
              <span style="font-size:12px;color:var(--text2)"> / ${m.format(m.goal)}</span>
            </div>
          </div>
          <div style="height:8px;background:var(--border);border-radius:999px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:${barColor};border-radius:999px;transition:width 1s ease"></div>
          </div>
          <div style="display:flex;justify-content:space-between;margin-top:5px">
            <span style="font-size:11px;color:${color};font-weight:700">${pct}% of goal</span>
            <span style="font-size:11px;color:var(--text3)">${pct >= 100 ? '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3 6h7l-5.5 4 2 7L12 15l-6.5 4 2-7L2 8h7z"/></svg> Goal hit!' : onTrack ? '✓ On track' : '! Behind'}</span>
          </div>
        </div>
      `;
    }).join('')}
  `;
}

function openGoalsModal() {
  if (_goals) {
    const set = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val; };
    set('goalRevenue',    _goals.revenueGoal    || '');
    set('goalLeads',      _goals.leadsGoal      || '');
    set('goalConversion', _goals.conversionGoal || '');
    set('goalJobs',       _goals.jobsGoal       || '');
  }
  openModal('goalsModal');
}

async function saveGoals() {
  const btn = document.querySelector('#goalsModal .btn-gold');
  if (btn) { btn.textContent = 'Saving…'; btn.disabled = true; }
  try {
    const res = await fetch('/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        revenueGoal:    parseFloat(document.getElementById('goalRevenue')?.value)    || 0,
        leadsGoal:      parseInt(document.getElementById('goalLeads')?.value)        || 0,
        conversionGoal: parseFloat(document.getElementById('goalConversion')?.value) || 0,
        jobsGoal:       parseInt(document.getElementById('goalJobs')?.value)         || 0,
        period: 'Monthly',
      }),
    });
    if (!res.ok) throw new Error((await res.json()).error);
    await loadGoals();
    toast('Goals saved!');
    closeModal('goalsModal');
    loadAnalytics();
  } catch (e) {
    toast('! Save failed: ' + e.message);
  } finally {
    if (btn) { btn.textContent = 'Save Goals'; btn.disabled = false; }
  }
}

async function loadAnalytics() {
  const [profitEl, sourcesEl, teamEl] = [
    document.getElementById('analyticsProfit'),
    document.getElementById('analyticsLeadSources'),
    document.getElementById('analyticsTeam'),
  ];

  // Load goals and analytics data in parallel
  const [profitData, sourcesData, teamData] = await Promise.all([
    loadGoals(),
    api('/api/analytics/profitability').catch(() => null),
    api('/api/analytics/lead-sources').catch(() => null),
    api('/api/analytics/team').catch(() => null),
  ]).then(results => results.slice(1));

  // ── SUMMARY CARD ──
  renderAnalyticsSummary(profitData, sourcesData, teamData);

  // ── VISUAL CHARTS ──
  renderAnalyticsCharts(profitData, sourcesData);

  // ── PROFITABILITY ──
  if (profitEl && profitData) {
    const { jobs, summary } = profitData;
    const marginColor = m => m === null || m === undefined ? 'var(--text3)' : m >= 30 ? 'var(--green)' : m >= 15 ? 'var(--gold)' : 'var(--red)';

    // Build job bars: use contractVal as the bar metric
    const maxVal = jobs.length ? Math.max(...jobs.map(j => j.contractVal || 0), 1) : 1;

    profitEl.innerHTML = `
      <div style="font-size:16px;font-weight:700;color:var(--text);margin-bottom:12px">Job Profitability</div>
      <div style="background:var(--card);border:1px solid var(--border);border-radius:var(--r);padding:16px;margin-bottom:14px">
        ${jobs.length ? jobs.map(j => {
          const pct = maxVal > 0 ? Math.min(100, Math.round(((j.contractVal || 0) / maxVal) * 100)) : 0;
          const mColor = marginColor(j.margin);
          const barColor = j.overBudget ? 'var(--red)' : j.margin !== null && j.margin >= 30 ? 'var(--green)' : j.margin !== null && j.margin >= 15 ? 'var(--gold)' : 'var(--blue)';
          return `
            <div style="margin-bottom:16px">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:5px">
                <div>
                  <div style="font-size:13px;font-weight:700;color:var(--text)">${j.clientName}</div>
                  <div style="font-size:11px;color:var(--text3)">${j.projectType || ''}${j.projectType && j.jobId ? ' · ' : ''}${j.jobId || ''}</div>
                </div>
                <div style="text-align:right;flex-shrink:0;margin-left:10px">
                  <div style="font-size:13px;font-weight:800;color:var(--gold)">${fmt$(j.contractVal)}</div>
                  ${j.margin !== null && j.margin !== undefined ? `<div style="font-size:11px;font-weight:700;color:${mColor}">${j.margin}% margin</div>` : ''}
                </div>
              </div>
              <div style="height:8px;background:var(--border);border-radius:999px;overflow:hidden">
                <div style="height:100%;width:0%;background:${barColor};border-radius:999px;transition:width 1s ease" data-tw="${pct}%"></div>
              </div>
              <div style="display:flex;gap:12px;margin-top:4px;font-size:11px;color:var(--text3)">
                <span>${j.phasesDone}/${j.totalPhases} phases</span>
                ${j.estCost > 0 ? `<span>Est cost: ${fmt$(j.estCost)}</span>` : ''}
                ${j.actualCost > 0 ? `<span>Actual: ${fmt$(j.actualCost)}</span>` : ''}
                ${j.overBudget ? `<span style="color:var(--red);font-weight:700">Over budget</span>` : ''}
              </div>
            </div>
          `;
        }).join('') : `<div style="color:var(--text3);font-size:14px;padding:8px 0">No jobs with contract values yet.</div>`}
      </div>
    `;
    _animateBars(profitEl);
  } else if (profitEl) {
    profitEl.innerHTML = `<div style="color:var(--text3);font-size:14px;padding:20px 0">No profitability data yet — add job values and phases to get started.</div>`;
  }

  // ── LEAD SOURCES ──
  if (sourcesEl && sourcesData?.length) {
    const maxLeads = Math.max(...sourcesData.map(s => s.leads || 0), 1);
    sourcesEl.innerHTML = `
      <div style="background:var(--card);border:1px solid var(--border);border-radius:var(--r);padding:16px">
        ${sourcesData.map(s => {
          const color = _sourceColor(s.source);
          const pct   = Math.round(((s.leads || 0) / maxLeads) * 100);
          return `
            <div style="margin-bottom:16px">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px">
                <span style="font-size:13px;font-weight:700;color:var(--text)">${s.source}</span>
                <span style="font-size:13px;font-weight:800;color:${color}">${s.leads} lead${s.leads !== 1 ? 's' : ''}</span>
              </div>
              <div style="height:8px;background:var(--border);border-radius:999px;overflow:hidden">
                <div style="height:100%;width:0%;background:${color};border-radius:999px;transition:width 1s ease" data-tw="${pct}%"></div>
              </div>
              <div style="display:flex;gap:12px;margin-top:4px;font-size:11px;color:var(--text3)">
                <span>${s.conversionRate}% close rate</span>
                <span>${s.converted} converted</span>
                ${s.totalValue > 0 ? `<span>${fmt$(s.totalValue)} revenue</span>` : ''}
                ${s.avgJobValue > 0 ? `<span>Avg ${fmt$(s.avgJobValue)}/job</span>` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
    _animateBars(sourcesEl);
  } else if (sourcesEl) {
    sourcesEl.innerHTML = `<div style="color:var(--text3);font-size:14px;padding:8px 0">No lead source data yet — add "How did you hear about us?" to your lead form.</div>`;
  }

  // ── TEAM PERFORMANCE ──
  if (teamEl && teamData?.length) {
    const active = teamData.filter(t => /yes|active/i.test(t.active || ''));
    const members = active.length ? active : teamData;
    // Max revenue for bar scaling
    const maxRev = Math.max(...members.map(t => t.totalRevenue || 0), 1);

    teamEl.innerHTML = `
      <div style="background:var(--card);border:1px solid var(--border);border-radius:var(--r);padding:16px">
        ${members.map(t => {
          const rating    = t.avgRating !== null && t.avgRating !== undefined && t.avgRating !== '' ? parseFloat(t.avgRating) : null;
          const ratingPct = rating !== null ? Math.round((rating / 5) * 100) : 0;
          const rColor    = _scoreColor(rating);
          const revPct    = maxRev > 0 ? Math.min(100, Math.round(((t.totalRevenue || 0) / maxRev) * 100)) : 0;
          return `
            <div style="margin-bottom:20px">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                <div>
                  <div style="font-size:13px;font-weight:700;color:var(--text)">${t.name}</div>
                  <div style="font-size:11px;color:var(--text3)">${t.role || ''}</div>
                </div>
                ${rating !== null ? `<div style="font-size:16px;font-weight:800;color:${rColor}">★ ${rating.toFixed(1)}</div>` : ''}
              </div>
              ${rating !== null ? `
                <div style="height:8px;background:var(--border);border-radius:999px;overflow:hidden;margin-bottom:3px">
                  <div style="height:100%;width:0%;background:${rColor};border-radius:999px;transition:width 1s ease" data-tw="${ratingPct}%"></div>
                </div>
                <div style="font-size:11px;color:var(--text3);margin-bottom:8px">${ratingPct}% satisfaction score</div>
              ` : ''}
              ${t.totalRevenue > 0 ? `
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
                  <span style="font-size:11px;color:var(--text3)">Revenue</span>
                  <span style="font-size:11px;font-weight:700;color:var(--gold)">${fmt$(t.totalRevenue)}</span>
                </div>
                <div style="height:5px;background:var(--border);border-radius:999px;overflow:hidden;margin-bottom:6px">
                  <div style="height:100%;width:0%;background:var(--gold);border-radius:999px;transition:width 1.1s ease" data-tw="${revPct}%"></div>
                </div>
              ` : ''}
              <div style="display:flex;gap:12px;flex-wrap:wrap;font-size:11px;color:var(--text3)">
                ${t.jobsClosed > 0 ? `<span>${t.jobsClosed} jobs closed</span>` : ''}
                ${t.phasesAssigned > 0 ? `<span>${t.phasesDone}/${t.phasesAssigned} phases done</span>` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
    _animateBars(teamEl);
  } else if (teamEl) {
    teamEl.innerHTML = `<div style="color:var(--text3);font-size:14px;padding:8px 0">No team data yet.</div>`;
  }

  // ── GOALS ──
  const totalLeads     = (sourcesData || []).reduce((s, src) => s + (src.leads || 0), 0);
  const totalConverted = (sourcesData || []).reduce((s, src) => s + (src.converted || 0), 0);
  const conversionRate = totalLeads > 0 ? Math.round((totalConverted / totalLeads) * 100) : 0;
  renderGoals({
    revenue:    profitData?.summary?.total    || 0,
    leads:      totalLeads,
    jobs:       profitData?.summary?.jobCount || 0,
    conversion: conversionRate,
  });
}

/* ─── QUICKBOOKS ─────────────────────────────────────────────────── */
function connectQB() {
  const popup = window.open('/api/quickbooks/connect', 'qb-connect', 'width=600,height=700,scrollbars=yes');
  const handler = (e) => {
    if (e.data?.qbConnected) {
      toast('✓ QuickBooks connected — ' + (e.data.company || ''));
      window.removeEventListener('message', handler);
      loaded['settings'] = false;
      navigate('settings');
    } else if (e.data?.qbError) {
      toast('! QB connection failed: ' + e.data.qbError);
      window.removeEventListener('message', handler);
    }
  };
  window.addEventListener('message', handler);
}

async function disconnectQB() {
  if (!confirm('Disconnect QuickBooks? Invoice sync will stop until reconnected.')) return;
  try {
    await fetch('/api/quickbooks/disconnect', { method: 'POST' });
    toast('QuickBooks disconnected');
    loaded['settings'] = false;
    navigate('settings');
  } catch { toast('! Could not disconnect'); }
}

/* ─── JOB SITE ESTIMATE FORM ────────────────────────────────────── */
const EST_SCOPE_ITEMS = [
  { key: 'hardscape',    label: 'Hardscape (Patio/Walkway)', unit: 'sq ft'  },
  { key: 'softscape',    label: 'Softscape (Planting)',      unit: 'sq ft'  },
  { key: 'sod',          label: 'Sod / Turf',                unit: 'sq ft'  },
  { key: 'mulch',        label: 'Mulch / Rock',              unit: 'cu yds' },
  { key: 'irrigation',   label: 'Irrigation',                unit: 'zones'  },
  { key: 'grading',      label: 'Grading / Drainage',        unit: 'sq ft'  },
  { key: 'retaining',    label: 'Retaining Wall',            unit: 'lin ft' },
  { key: 'fencing',      label: 'Fencing',                   unit: 'lin ft' },
  { key: 'lighting',     label: 'Landscape Lighting',        unit: 'fixtures'},
  { key: 'trees',        label: 'Trees',                     unit: 'qty'    },
  { key: 'shrubs',       label: 'Shrubs / Perennials',       unit: 'qty'    },
  { key: 'pergola',      label: 'Pergola / Structure',       unit: 'sq ft'  },
  { key: 'firepit',      label: 'Fire Pit / Outdoor Kitchen',unit: 'qty'    },
  { key: 'demolition',   label: 'Demo / Clearing',           unit: 'est hrs'},
  { key: 'cleanup',      label: 'Final Cleanup',             unit: 'est hrs'},
  { key: 'custom',       label: 'Other / Custom',            unit: null     },
];

let estAreaCount = 0;

function estBuildScopeGrid(roomId) {
  return EST_SCOPE_ITEMS.map(item => {
    const measureHtml = item.key === 'custom'
      ? `<div class="est-measure" style="display:none"><input type="text" placeholder="Describe…" onclick="event.stopPropagation()" style="width:100%;background:rgba(0,0,0,.3);border:1px solid var(--border);border-radius:6px;padding:4px 8px;font-size:12px;color:var(--text);font-family:inherit"></div>`
      : `<div class="est-measure"><input type="number" min="0" placeholder="0" onclick="event.stopPropagation()"><span>${item.unit}</span></div>`;
    return `<button type="button" class="est-scope-btn" data-key="${item.key}" onclick="estToggleScope(this)">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <span class="est-scope-name">${item.label}</span>
        <span class="est-scope-check">✓</span>
      </div>
      ${measureHtml}
    </button>`;
  }).join('');
}

function estBuildArea(idx, isFirst) {
  const removeBtn = isFirst ? '' : `<button type="button" class="est-remove-room" onclick="estRemoveArea(this)" title="Remove">×</button>`;
  return `<div class="est-area-card" data-room-idx="${idx}">
    <div class="est-area-hdr">
      <div class="est-area-num">${idx}</div>
      <input class="est-area-name" type="text" placeholder="Area name (e.g. Front Yard)">
      ${removeBtn}
    </div>
    <div class="est-scope-grid">${estBuildScopeGrid(idx)}</div>
    <div style="margin-bottom:4px"><span style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:var(--text3)">Material Grade</span></div>
    <div class="est-grade-row">
      <button type="button" class="est-grade-btn" data-grade="budget" onclick="estSelectGrade(this)"><span class="g-name">Budget</span><span class="g-sub">Cost-effective</span></button>
      <button type="button" class="est-grade-btn sel-standard" data-grade="standard" onclick="estSelectGrade(this)"><span class="g-name">Standard</span><span class="g-sub">Best value</span></button>
      <button type="button" class="est-grade-btn" data-grade="premium" onclick="estSelectGrade(this)"><span class="g-name">Premium</span><span class="g-sub">High-end</span></button>
    </div>
  </div>`;
}

function estAddArea(defaultName) {
  estAreaCount++;
  const container = document.getElementById('estAreasContainer');
  if (!container) return;
  const div = document.createElement('div');
  div.innerHTML = estBuildArea(estAreaCount, estAreaCount === 1);
  const card = div.firstElementChild;
  container.appendChild(card);
  if (defaultName) card.querySelector('.est-area-name').value = defaultName;
  if (estAreaCount > 1) card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  estRenumber();
}

function estRemoveArea(btn) {
  btn.closest('.est-area-card').remove();
  estRenumber();
}

function estRenumber() {
  document.querySelectorAll('#estAreasContainer .est-area-card').forEach((c, i) => {
    const num = c.querySelector('.est-area-num');
    if (num) num.textContent = i + 1;
    c.setAttribute('data-room-idx', i + 1);
  });
}

function estToggleScope(btn) {
  btn.classList.toggle('active');
  const measure = btn.querySelector('.est-measure');
  if (measure) {
    measure.style.display = btn.classList.contains('active') ? 'flex' : 'none';
    if (btn.classList.contains('active')) {
      const inp = measure.querySelector('input');
      if (inp) setTimeout(() => inp.focus(), 50);
    }
  }
}

function estSelectGrade(btn) {
  const row = btn.closest('.est-grade-row');
  row.querySelectorAll('.est-grade-btn').forEach(b => b.classList.remove('sel-budget','sel-standard','sel-premium'));
  btn.classList.add('sel-' + btn.dataset.grade);
}

function estCollectData() {
  const rooms = [];
  document.querySelectorAll('#estAreasContainer .est-area-card').forEach(card => {
    const roomName = card.querySelector('.est-area-name')?.value?.trim() || 'Room';
    const grade = card.querySelector('.est-grade-btn.sel-budget') ? 'budget'
                : card.querySelector('.est-grade-btn.sel-premium') ? 'premium'
                : 'standard';
    const scope = [];
    card.querySelectorAll('.est-scope-btn.active').forEach(btn => {
      const key = btn.dataset.key;
      const inp = btn.querySelector('.est-measure input');
      const unit = btn.querySelector('.est-measure span')?.textContent || '';
      scope.push({ item: key, measurement: inp?.value?.trim() || '', unit });
    });
    if (scope.length) rooms.push({ room: roomName, grade, scope });
  });
  return {
    source: 'job_site_form',
    clientName: document.getElementById('estClientName')?.value?.trim() || '',
    clientPhone: document.getElementById('estClientPhone')?.value?.trim() || '',
    jobAddress: document.getElementById('estAddress')?.value?.trim() || '',
    projectType: document.getElementById('estProjectType')?.value?.trim() || '',
    startDate: document.getElementById('estStartDate')?.value || '',
    duration: document.getElementById('estDuration')?.value?.trim() || '',
    notes: document.getElementById('estNotes')?.value?.trim() || '',
    rooms,
  };
}

async function submitEstimateForm(e) {
  e.preventDefault();
  const payload = estCollectData();

  if (!payload.clientName) {
    const f = document.getElementById('estClientName');
    if (f) { f.focus(); f.style.borderColor = 'var(--red)'; setTimeout(() => f.style.borderColor = '', 1800); }
    toast('! Enter a client name first');
    return;
  }
  if (!payload.rooms.length) {
    toast('! Select at least one scope item');
    return;
  }

  const btn = document.getElementById('estSubmitBtn');
  const lbl = document.getElementById('estSubmitLabel');
  btn.classList.add('loading');
  lbl.textContent = 'Sending to Agent…';

  try {
    const res = await fetch('/api/estimate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!res.ok) throw new Error(res.status);
    showEstSuccess();
  } catch (err) {
    console.warn('Estimate endpoint:', err.message);
    console.log(JSON.stringify(payload, null, 2));
    showEstSuccess(); // show success anyway in demo/dev mode
  }
}

function showEstSuccess() {
  const btn = document.getElementById('estSubmitBtn');
  const lbl = document.getElementById('estSubmitLabel');
  const success = document.getElementById('estSuccess');
  btn.classList.remove('loading');
  btn.style.display = 'none';
  success.classList.add('visible');
  success.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  // Reset after 10s
  setTimeout(() => {
    btn.style.display = '';
    lbl.textContent = 'Send to Estimate Agent';
    success.classList.remove('visible');
    document.getElementById('estAreasContainer').innerHTML = '';
    estAreaCount = 0;
    estAddArea('Front Yard');
    document.getElementById('estClientName').value = '';
    document.getElementById('estClientPhone').value = '';
    document.getElementById('estAddress').value = '';
    document.getElementById('estProjectType').value = '';
    document.getElementById('estNotes').value = '';
  }, 10000);
}

// Pre-fill estimate form from a lead or job context
function openEstimateForClient(name, address) {
  if (name) document.getElementById('estClientName').value = name;
  if (address) document.getElementById('estAddress').value = address;
  navigate('field');
}

// Initialize on first visit
const _origNavigate = navigate;
// Init first room when field page is first opened
document.addEventListener('DOMContentLoaded', () => {
  // pre-init the room so it's ready on first open
  if (!estAreaCount) estAddArea('Front Yard');
});

// ── PHOTO UPLOAD ──────────────────────────────────────────────
let photoModalJobRow = null;
let photoModalJobId  = null;
let photoFileData    = null;

function openPhotoModal() {
  // Get current job context from the open job modal
  photoModalJobRow = window._openJobRow || null;
  photoModalJobId  = window._openJobId  || null;
  if (!photoModalJobRow) { toast('Open a job first'); return; }
  closeModal('jobModal');
  document.getElementById('photoModalSub').textContent = `Photos for ${window._openJobClient || 'this job'} — visible to client automatically`;
  document.getElementById('photoPreviewWrap').style.display = 'none';
  photoFileData = null;
  loadPhotoModalGrid();
  openModal('photoModal');
}

async function loadPhotoModalGrid() {
  if (!photoModalJobId) return;
  const grid = document.getElementById('photoModalGrid');
  grid.innerHTML = '<div style="font-size:12px;color:var(--text2);text-align:center;padding:8px">Loading photos…</div>';
  try {
    const res    = await fetch(`/api/jobs/${photoModalJobId}/photos`);
    const photos = await res.json();
    if (!photos?.length) {
      grid.innerHTML = '<div style="font-size:13px;color:var(--text2);text-align:center;padding:8px">No photos yet</div>';
      return;
    }
    grid.innerHTML = `
      <div style="font-size:12px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">${photos.length} Photo${photos.length!==1?'s':''}</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">
        ${photos.map(p => `
          <div>
            <img src="${p.photoUrl}" style="width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:8px;cursor:pointer"
                 onclick="openLightboxModal('${p.photoUrl}','${(p.caption||p.timestamp||'').replace(/'/g,"&#39;")}')">
            ${p.caption ? `<div style="font-size:10px;color:var(--text2);text-align:center;margin-top:2px">${p.caption}</div>` : ''}
          </div>
        `).join('')}
      </div>
    `;
  } catch(e) {
    grid.innerHTML = '<div style="font-size:13px;color:var(--text2);text-align:center">Could not load photos</div>';
  }
}

function handlePhotoSelected() {
  const file = document.getElementById('photoFileInput').files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const dataUrl = e.target.result;
    document.getElementById('photoPreview').src = dataUrl;
    document.getElementById('photoPreviewWrap').style.display = 'block';
    // Store base64 without the data URL prefix
    const parts = dataUrl.split(',');
    photoFileData = { base64: parts[1], mimeType: file.type };
  };
  reader.readAsDataURL(file);
}

async function uploadPhotoModal() {
  if (!photoFileData || !photoModalJobRow) return;
  const caption = document.getElementById('photoCaption').value;
  const btn = document.getElementById('photoUploadBtn');
  btn.textContent = 'Uploading…';
  btn.disabled = true;
  try {
    const res  = await fetch(`/api/jobs/${photoModalJobRow}/photos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobId:       photoModalJobId,
        caption,
        imageData: photoFileData.base64,
        mimeType:    photoFileData.mimeType
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    toast('Photo uploaded — visible on client portal');
    document.getElementById('photoPreviewWrap').style.display = 'none';
    document.getElementById('photoFileInput').value = '';
    photoFileData = null;
    loadPhotoModalGrid();
  } catch(e) {
    toast('× Upload failed: ' + e.message);
  } finally {
    btn.textContent = 'Upload Photo';
    btn.disabled = false;
  }
}

function openLightboxModal(url, caption) {
  // Reuse existing lightbox if available, otherwise simple alert
  const lb = document.getElementById('photoLightbox');
  if (lb) {
    document.getElementById('lbImg').src = url;
    document.getElementById('lbCaption').textContent = caption || '';
    lb.style.display = 'flex';
  }
}

// ── RECURRING JOBS ─────────────────────────────────────────────
let recurringFilter = 'all';
let recurringData   = [];

async function loadRecurring() {
  const list = document.getElementById('recurringList');
  if (!list) return;
  list.innerHTML = '<div class="skel-item"><div class="skel-avatar skeleton"></div><div class="skel-lines"><div class="skel-line w60 skeleton"></div><div class="skel-line w40 skeleton"></div></div></div>'.repeat(3);

  try {
    const res = await fetch('/api/recurring');
    recurringData = await res.json();

    // Check for due soon (next 7 days)
    const today  = new Date();
    const week   = new Date(today); week.setDate(week.getDate() + 7);
    const dueSoon = recurringData.filter(r => {
      if (!r.nextDate) return false;
      const d = new Date(r.nextDate);
      return d >= today && d <= week;
    });
    const banner = document.getElementById('recurringDueBanner');
    if (banner) {
      if (dueSoon.length) {
        banner.style.display = 'block';
        banner.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> ${dueSoon.length} service${dueSoon.length>1?'s':''} due in the next 7 days`;
      } else {
        banner.style.display = 'none';
      }
    }

    renderRecurringList();
  } catch(e) {
    list.innerHTML = '<div style="padding:32px;text-align:center;color:var(--text2)">Could not load recurring jobs</div>';
  }
}

function setRecurringFilter(btn) {
  document.querySelectorAll('[data-rfilter]').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  recurringFilter = btn.dataset.rfilter;
  renderRecurringList();
}

function renderRecurringList() {
  const list = document.getElementById('recurringList');
  if (!list) return;

  const items = recurringFilter === 'all'
    ? recurringData
    : recurringData.filter(r => r.frequency === recurringFilter);

  if (!items.length) {
    list.innerHTML = `<div style="text-align:center;padding:40px 20px;color:var(--text2)"><div style="font-size:32px;margin-bottom:10px"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg></div><div style="font-size:15px;font-weight:700;color:var(--text1);margin-bottom:6px">No recurring jobs yet</div><div style="font-size:13px">Add recurring services to auto-schedule jobs for regular clients.</div></div>`;
    return;
  }

  list.innerHTML = items.map(r => {
    const today   = new Date();
    const nextD   = r.nextDate ? new Date(r.nextDate) : null;
    const daysOut = nextD ? Math.ceil((nextD - today) / 86400000) : null;
    const urgentColor = daysOut !== null && daysOut <= 3 ? 'var(--red)' : daysOut !== null && daysOut <= 7 ? 'var(--gold)' : 'var(--text2)';
    const dueLabel = daysOut === null ? '—' : daysOut < 0 ? `${Math.abs(daysOut)}d overdue` : daysOut === 0 ? 'Due today' : `Due in ${daysOut}d`;

    const freqColors = { Weekly:'var(--green)', 'Bi-Weekly':'var(--gold)', Monthly:'var(--blue)', Quarterly:'var(--text2)' };
    const freqColor  = freqColors[r.frequency] || 'var(--text2)';

    return `
      <div style="background:var(--card);border:1px solid var(--border);border-radius:var(--r);padding:14px 16px;margin-bottom:10px">
        <div style="display:flex;align-items:flex-start;gap:12px">
          <div style="width:40px;height:40px;border-radius:10px;background:rgba(191,148,56,.1);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg></div>
          <div style="flex:1;min-width:0">
            <div style="font-size:15px;font-weight:700;color:var(--text1)">${r.clientName}</div>
            <div style="font-size:13px;color:var(--text2);margin-top:1px">${r.serviceType}${r.address ? ' · ' + r.address : ''}</div>
            <div style="display:flex;align-items:center;gap:6px;margin-top:6px;flex-wrap:wrap">
              <span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:6px;background:rgba(191,148,56,.1);color:${freqColor}">${r.frequency}</span>
              ${r.price ? `<span style="font-size:11px;font-weight:700;color:var(--green)">${r.price}</span>` : ''}
              ${r.assignedTo ? `<span style="font-size:11px;color:var(--text2)"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="3" y1="1" x2="21" y2="1"/></svg> ${r.assignedTo}</span>` : ''}
            </div>
            ${r.nextDate ? `<div style="font-size:12px;margin-top:6px;font-weight:600;color:${urgentColor}"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> ${dueLabel} · Next: ${r.nextDate}</div>` : ''}
          </div>
        </div>
        <div style="display:flex;gap:8px;margin-top:12px">
          <button onclick="runRecurringJob(${r.row}, '${r.clientName.replace(/'/g,"&#39;")}')" style="flex:1;padding:9px;border-radius:10px;font-size:13px;font-weight:700;background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.25);color:var(--green);cursor:pointer">▸ Run Now</button>
        </div>
      </div>
    `;
  }).join('');
}

function openAddRecurringModal() {
  // Set default next date to tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const el = document.getElementById('rNextDate');
  if (el) el.value = tomorrow.toISOString().split('T')[0];
  openModal('addRecurringModal');
}

async function saveRecurringJob() {
  const clientName  = document.getElementById('rClientName')?.value?.trim();
  const serviceType = document.getElementById('rServiceType')?.value;
  const frequency   = document.getElementById('rFrequency')?.value;
  if (!clientName) { toast('× Client name required'); return; }

  const btn = document.querySelector('#addRecurringModal .btn-gold');
  if (btn) { btn.textContent = 'Saving…'; btn.disabled = true; }

  try {
    const res = await fetch('/api/recurring', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientName,
        address:     document.getElementById('rAddress')?.value?.trim()    || '',
        serviceType,
        frequency,
        nextDate:    document.getElementById('rNextDate')?.value           || '',
        price:       document.getElementById('rPrice')?.value?.trim()      || '',
        assignedTo:  document.getElementById('rAssignedTo')?.value?.trim() || '',
        notes:       document.getElementById('rNotes')?.value?.trim()      || ''
      })
    });
    if (!res.ok) throw new Error((await res.json()).error);
    toast('✓ Recurring job saved');
    closeModal('addRecurringModal');
    loadRecurring();
  } catch(e) {
    toast('× Save failed: ' + e.message);
  } finally {
    if (btn) { btn.textContent = 'Save Job'; btn.disabled = false; }
  }
}

async function runRecurringJob(row, clientName) {
  if (!confirm(`Create a new job for ${clientName} now?`)) return;
  try {
    const res  = await fetch(`/api/recurring/${row}/run`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    toast(`✓ Job ${data.jobId} created for ${clientName}`);
    loadRecurring();
  } catch(e) {
    toast('× Failed: ' + e.message);
  }
}

// ── TASKS ─────────────────────────────────────────────────────
let tasksData   = [];
let taskFilter  = 'open';

async function loadTasks() {
  const list = document.getElementById('tasksList');
  if (list) list.innerHTML = '<div class="skel-item"><div class="skel-avatar skeleton"></div><div class="skel-lines"><div class="skel-line w60 skeleton"></div><div class="skel-line w40 skeleton"></div></div></div>'.repeat(3);

  try {
    const res = await fetch('/api/tasks');
    tasksData  = await res.json();
    renderTasksList();
    updateDashTasksStrip();
    // Update summary line
    const open = tasksData.filter(t => t.status === 'Open').length;
    const high = tasksData.filter(t => t.status === 'Open' && t.priority === 'High').length;
    const summaryEl = document.getElementById('tasksSummaryLine');
    if (summaryEl) summaryEl.textContent = `${open} open${high ? ` · ${high} high priority` : ''}`;
    // Update More badge
    const moreDesc = document.getElementById('moreTaskDesc');
    if (moreDesc) moreDesc.textContent = open ? `${open} open` : 'Action items';
  } catch(e) {
    if (list) list.innerHTML = '<div style="padding:24px;text-align:center;color:var(--text2)">Could not load tasks</div>';
  }
}

function setTaskFilter(btn) {
  document.querySelectorAll('[data-tfilter]').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  taskFilter = btn.dataset.tfilter;
  renderTasksList();
}

function renderTasksList() {
  const list = document.getElementById('tasksList');
  if (!list) return;

  let items = tasksData;
  if (taskFilter === 'open')     items = tasksData.filter(t => t.status === 'Open');
  if (taskFilter === 'high')     items = tasksData.filter(t => t.status === 'Open' && t.priority === 'High');
  if (taskFilter === 'complete') items = tasksData.filter(t => t.status === 'Complete');

  if (!items.length) {
    list.innerHTML = `<div style="text-align:center;padding:40px 20px;color:var(--text2)"><div style="font-size:32px;margin-bottom:10px">✓</div><div style="font-size:15px;font-weight:700;color:var(--text1);margin-bottom:6px">${taskFilter === 'complete' ? 'No completed tasks' : 'All clear!'}</div><div style="font-size:13px">No ${taskFilter === 'all' ? '' : taskFilter + ' '}tasks right now.</div></div>`;
    return;
  }

  const today = new Date(); today.setHours(0,0,0,0);

  list.innerHTML = items.map(t => {
    const isComplete = t.status === 'Complete';
    const dueDate    = t.dueDate ? new Date(t.dueDate) : null;
    const isOverdue  = dueDate && dueDate < today && !isComplete;
    const isDueToday = dueDate && dueDate.toDateString() === today.toDateString();
    const dueTxt     = !dueDate ? '' : isOverdue ? `! Overdue · ${t.dueDate}` : isDueToday ? '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> Due today' : `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> ${t.dueDate}`;
    const prioColor  = t.priority === 'High' ? 'var(--red)' : t.priority === 'Low' ? 'var(--text3)' : 'var(--text2)';
    const prioDot    = t.priority === 'High' ? '<span style="color:#DC2626">●</span>' : t.priority === 'Low' ? '○' : '<span style="color:#D97706">●</span>';

    return `
      <div style="background:var(--card);border:1px solid ${isOverdue ? 'rgba(239,68,68,.3)' : 'var(--border)'};border-radius:var(--r);padding:14px 16px;margin-bottom:8px;${isComplete ? 'opacity:.6' : ''}">
        <div style="display:flex;align-items:flex-start;gap:12px">
          <button onclick="${isComplete ? '' : `completeTask(${t.row})`}" style="width:22px;height:22px;border-radius:6px;border:2px solid ${isComplete ? 'var(--green)' : 'var(--border)'};background:${isComplete ? 'var(--green)' : 'transparent'};display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;margin-top:1px;font-size:12px;color:#fff">
            ${isComplete ? '✓' : ''}
          </button>
          <div style="flex:1;min-width:0">
            <div style="font-size:15px;font-weight:700;color:var(--text1);${isComplete ? 'text-decoration:line-through' : ''}">${t.title}</div>
            <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:5px;align-items:center">
              ${t.assignedTo ? `<span style="font-size:11px;color:var(--text2)"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> ${t.assignedTo}</span>` : ''}
              ${t.clientName ? `<span style="font-size:11px;color:var(--text2)"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> ${t.clientName}</span>` : ''}
              ${t.jobId ? `<span style="font-size:11px;color:var(--text3)">${t.jobId}</span>` : ''}
              <span style="font-size:11px;color:${prioColor}">${prioDot} ${t.priority}</span>
            </div>
            ${dueTxt ? `<div style="font-size:12px;margin-top:4px;color:${isOverdue ? 'var(--red)' : isDueToday ? 'var(--gold)' : 'var(--text2)'};font-weight:${isOverdue||isDueToday?'700':'400'}">${dueTxt}</div>` : ''}
            ${t.notes ? `<div style="font-size:12px;color:var(--text2);margin-top:4px;font-style:italic">${t.notes}</div>` : ''}
          </div>
          <button onclick="deleteTask(${t.row})" style="padding:4px 8px;border-radius:6px;border:none;background:transparent;color:var(--text3);cursor:pointer;font-size:16px;flex-shrink:0">×</button>
        </div>
      </div>
    `;
  }).join('');
}

function updateDashTasksStrip() {
  const strip = document.getElementById('dashTasksStrip');
  if (!strip) return;
  const open = tasksData.filter(t => t.status === 'Open').slice(0, 3);
  if (!open.length) {
    strip.innerHTML = '<div style="background:var(--card);border:1px solid var(--border);border-radius:var(--r);padding:12px 16px;font-size:13px;color:var(--text2)">✓ No open tasks</div>';
    return;
  }
  strip.innerHTML = open.map(t => `
    <div style="background:var(--card);border:1px solid ${t.priority==='High'?'rgba(239,68,68,.3)':'var(--border)'};border-radius:var(--r);padding:12px 16px;margin-bottom:8px;display:flex;align-items:center;gap:12px" onclick="navigate('tasks')">
      <div style="font-size:18px">${t.priority==='High'?'<span style="color:#DC2626">●</span>':'<span style="color:#D97706">●</span>'}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:14px;font-weight:700;color:var(--text1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t.title}</div>
        <div style="font-size:12px;color:var(--text2)">${t.assignedTo||'Unassigned'}${t.dueDate?' · Due '+t.dueDate:''}</div>
      </div>
    </div>
  `).join('') + (tasksData.filter(t=>t.status==='Open').length > 3 ? `<div style="font-size:12px;color:var(--gold);font-weight:600;padding:4px 0;cursor:pointer" onclick="navigate('tasks')">+ ${tasksData.filter(t=>t.status==='Open').length - 3} more tasks →</div>` : '');
}

function openAddTaskModal() {
  // Set default due date to tomorrow
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const el = document.getElementById('taskDueDate');
  if (el) el.value = tomorrow.toISOString().split('T')[0];
  openModal('addTaskModal');
}

async function saveTask() {
  const title = document.getElementById('taskTitle')?.value?.trim();
  if (!title) { toast('× Task title required'); return; }
  const btn = document.querySelector('#addTaskModal .btn-gold');
  if (btn) { btn.textContent = 'Saving…'; btn.disabled = true; }
  try {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        assignedTo:  document.getElementById('taskAssignedTo')?.value?.trim() || '',
        dueDate:     document.getElementById('taskDueDate')?.value || '',
        priority:    document.getElementById('taskPriority')?.value || 'Normal',
        clientName:  document.getElementById('taskClientName')?.value?.trim() || '',
        jobId:       document.getElementById('taskJobId')?.value?.trim() || '',
        notes:       document.getElementById('taskNotes')?.value?.trim() || '',
      })
    });
    if (!res.ok) throw new Error((await res.json()).error);
    toast('✓ Task saved');
    closeModal('addTaskModal');
    // Clear form
    ['taskTitle','taskAssignedTo','taskClientName','taskJobId','taskNotes'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
    loadTasks();
  } catch(e) {
    toast('× Save failed: ' + e.message);
  } finally {
    if (btn) { btn.textContent = 'Save Task'; btn.disabled = false; }
  }
}

async function completeTask(row) {
  try {
    await fetch(`/api/tasks/${row}/complete`, { method: 'POST' });
    toast('✓ Task complete!');
    loadTasks();
  } catch(e) {
    toast('× Failed: ' + e.message);
  }
}

async function deleteTask(row) {
  if (!confirm('Delete this task?')) return;
  try {
    await fetch(`/api/tasks/${row}`, { method: 'DELETE' });
    toast('Task deleted');
    loadTasks();
  } catch(e) {
    toast('× Failed: ' + e.message);
  }
}

// ─── AI CHAT ─────────────────────────────────────────────────────────────────

let chatHistory = [];
let chatOpen = false;

function toggleChat() {
  chatOpen = !chatOpen;
  const modal = document.getElementById('chatModal');
  if (modal) modal.style.display = chatOpen ? 'flex' : 'none';
  if (chatOpen) {
    setTimeout(() => document.getElementById('chatInput')?.focus(), 100);
    scrollChatToBottom();
  }
}

function clearChat() {
  chatHistory = [];
  const msgs = document.getElementById('chatMessages');
  if (msgs) msgs.innerHTML = `<div class="chat-msg assistant" style="background:var(--surface);border-radius:12px;padding:12px 14px;max-width:85%;align-self:flex-start;font-size:14px;line-height:1.5">Chat cleared. What would you like to know?</div>`;
}

function scrollChatToBottom() {
  const msgs = document.getElementById('chatMessages');
  if (msgs) msgs.scrollTop = msgs.scrollHeight;
}

function appendChatMessage(role, text) {
  const msgs = document.getElementById('chatMessages');
  if (!msgs) return;
  const isUser = role === 'user';
  const div = document.createElement('div');
  div.className = `chat-msg ${role}`;
  div.style.cssText = `background:${isUser ? 'var(--gold)' : 'var(--surface)'};border-radius:12px;padding:12px 14px;max-width:85%;align-self:${isUser ? 'flex-end' : 'flex-start'};font-size:14px;line-height:1.6;color:${isUser ? '#000' : 'var(--text)'};white-space:pre-wrap;word-break:break-word`;
  // Convert **bold** markdown
  div.innerHTML = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
  msgs.appendChild(div);
  scrollChatToBottom();
}

function appendTypingIndicator() {
  const msgs = document.getElementById('chatMessages');
  if (!msgs) return;
  const div = document.createElement('div');
  div.id = 'chatTyping';
  div.style.cssText = 'background:var(--surface);border-radius:12px;padding:12px 14px;max-width:85%;align-self:flex-start;font-size:20px;color:var(--mist)';
  div.textContent = '...';
  msgs.appendChild(div);
  scrollChatToBottom();
}

function removeTypingIndicator() {
  document.getElementById('chatTyping')?.remove();
}

async function sendChat() {
  const input = document.getElementById('chatInput');
  const text = input?.value?.trim();
  if (!text) return;

  input.value = '';
  input.style.height = 'auto';

  appendChatMessage('user', text);
  chatHistory.push({ role: 'user', content: text });
  appendTypingIndicator();

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: chatHistory }),
    });
    const data = await res.json();

    removeTypingIndicator();

    const reply = data?.reply || 'Sorry, I could not get a response.';
    chatHistory.push({ role: 'assistant', content: reply });
    appendChatMessage('assistant', reply);
  } catch (e) {
    removeTypingIndicator();
    appendChatMessage('assistant', 'Sorry, something went wrong. Please try again.');
  }
}

// Expose chat functions globally so onclick attributes can find them
window.toggleChat = toggleChat;
window.clearChat = clearChat;
window.sendChat = sendChat;

// Wire up chat button after DOM loads
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('chatBtn');
  if (btn) btn.addEventListener('click', toggleChat);
});
