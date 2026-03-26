/* ─── DEMO DATA (fallback when API is unreachable) ─────────────── */
const DEMO = {
  summary: {
    newLeads: 6, activeJobs: 4, pipelineValue: 187500, conversionRate: '31%',
    companyName: 'Summit Remodeling',
    activity: [
      { text: '<strong>Marcus Johnson</strong> submitted a new lead — Kitchen Remodel', time: '2 hours ago' },
      { text: '<strong>Sarah Chen</strong> signed the contract for bathroom renovation', time: '5 hours ago' },
      { text: '<strong>Rivera Family</strong> — proposal viewed 3 times', time: 'Yesterday' },
      { text: 'Deposit invoice paid by <strong>The Hendersons</strong>', time: '2 days ago' },
      { text: '<strong>Tom Bradley</strong> — 30-day check-in sent automatically', time: '3 days ago' },
    ]
  },
  leads: [
    { __row: 2, 'First Name': 'Marcus', 'Last Name': 'Johnson', Email: 'marcus@email.com', Phone: '555-0101', 'Project Type': 'Kitchen Remodel', Budget: '$45,000', Status: 'New', 'AI Score': '88', 'Score Label': 'Hot', 'Last Contact': '', Notes: 'Wants to start ASAP. Has kids — prefers weekend work.', 'Assigned Rep': 'Chase', 'Timestamp': '2026-03-21' },
    { __row: 3, 'First Name': 'Diana', 'Last Name': 'Rivera', Email: 'diana@email.com', Phone: '555-0202', 'Project Type': 'Bathroom Renovation', Budget: '$28,000', Status: 'Proposal Sent', 'AI Score': '74', 'Score Label': 'Warm', 'Last Contact': '2026-03-20', Notes: 'Comparing 3 contractors. Liked our online reviews.', 'Assigned Rep': 'Spencer', 'Timestamp': '2026-03-19' },
    { __row: 4, 'First Name': 'Kevin', 'Last Name': 'Park', Email: 'kevin@email.com', Phone: '555-0303', 'Project Type': 'Deck Addition', Budget: '$18,000', Status: 'Contacted', 'AI Score': '61', 'Score Label': 'Warm', 'Last Contact': '2026-03-18', Notes: 'Budget flexible. Wants composite decking.', 'Assigned Rep': 'Chase', 'Timestamp': '2026-03-17' },
    { __row: 5, 'First Name': 'Priya', 'Last Name': 'Mehta', Email: 'priya@email.com', Phone: '555-0404', 'Project Type': 'Basement Finish', Budget: '$55,000', Status: 'Consultation Booked', 'AI Score': '92', 'Score Label': 'Hot', 'Last Contact': '2026-03-22', Notes: 'High budget, motivated. Consultation on March 25.', 'Assigned Rep': 'Spencer', 'Timestamp': '2026-03-22' },
    { __row: 6, 'First Name': 'Tom', 'Last Name': 'Bradley', Email: 'tom@email.com', Phone: '555-0505', 'Project Type': 'Window Replacement', Budget: '$12,000', Status: 'Lost', 'AI Score': '42', 'Score Label': 'Cold', 'Last Contact': '2026-03-10', Notes: 'Went with another contractor. Price was the deciding factor.', 'Assigned Rep': '', 'Timestamp': '2026-03-05' },
    { __row: 7, 'First Name': 'Linda', 'Last Name': 'Foster', Email: 'linda@email.com', Phone: '555-0606', 'Project Type': 'Full Kitchen + Bath', Budget: '$80,000', Status: 'New', 'AI Score': '85', 'Score Label': 'Hot', 'Last Contact': '', Notes: 'Large project. Referred by Sarah Chen.', 'Assigned Rep': '', 'Timestamp': '2026-03-23' },
  ],
  jobs: [
    { __row: 2, 'Job ID': 'JOB-001', 'Client Name': 'Sarah Chen', 'Project Type': 'Bathroom Renovation', 'Job Value': '$28,500', Status: 'In Progress', 'Start Date': '2026-03-01', 'End Date': '2026-03-30', 'Deposit Status': 'Paid', 'Final Invoice Status': 'Pending', 'Proposal Link': 'https://docs.google.com', 'Contract Link': 'https://docs.google.com', 'Kickoff Doc Link': 'https://docs.google.com', 'Assigned Crew': 'Mike T., Carlos R.', 'Job Notes': 'Demo complete. Tile work starts Monday.' },
    { __row: 3, 'Job ID': 'JOB-002', 'Client Name': 'The Hendersons', 'Project Type': 'Kitchen Remodel', 'Job Value': '$62,000', Status: 'In Progress', 'Start Date': '2026-02-15', 'End Date': '2026-04-10', 'Deposit Status': 'Paid', 'Final Invoice Status': 'Pending', 'Proposal Link': 'https://docs.google.com', 'Contract Link': 'https://docs.google.com', 'Kickoff Doc Link': '', 'Assigned Crew': 'Spencer, Chase', 'Job Notes': 'Cabinets installed. Countertops arriving Friday.' },
    { __row: 4, 'Job ID': 'JOB-003', 'Client Name': 'Raj Patel', 'Project Type': 'Basement Finish', 'Job Value': '$48,000', Status: 'Planning', 'Start Date': '2026-04-01', 'End Date': '2026-05-20', 'Deposit Status': 'Invoiced', 'Final Invoice Status': 'Pending', 'Proposal Link': 'https://docs.google.com', 'Contract Link': 'https://docs.google.com', 'Kickoff Doc Link': '', 'Assigned Crew': '', 'Job Notes': 'Contract signed. Awaiting deposit.' },
    { __row: 5, 'Job ID': 'JOB-004', 'Client Name': 'Tom Bradley', 'Project Type': 'Deck Addition', 'Job Value': '$22,000', Status: 'Complete', 'Start Date': '2026-01-10', 'End Date': '2026-02-28', 'Deposit Status': 'Paid', 'Final Invoice Status': 'Paid', 'Proposal Link': '', 'Contract Link': '', 'Kickoff Doc Link': '', 'Assigned Crew': 'Mike T.', 'Job Notes': 'Completed on time. Great feedback from client.' },
    { __row: 6, 'Job ID': 'JOB-005', 'Client Name': 'Garcia Family', 'Project Type': 'Window Replacement', 'Job Value': '$16,500', Status: 'In Progress', 'Start Date': '2026-03-18', 'End Date': '2026-03-25', 'Deposit Status': 'Paid', 'Final Invoice Status': 'Pending', 'Proposal Link': 'https://docs.google.com', 'Contract Link': 'https://docs.google.com', 'Kickoff Doc Link': 'https://docs.google.com', 'Assigned Crew': 'Carlos R.', 'Job Notes': '12 of 14 windows complete.' },
  ],
  phases: {
    'JOB-001': [
      { __row: 10, 'Job ID': 'JOB-001', Phase: 'Demo', Status: 'Complete', 'Completed Date': '2026-03-05' },
      { __row: 11, 'Job ID': 'JOB-001', Phase: 'Rough Plumbing', Status: 'Complete', 'Completed Date': '2026-03-10' },
      { __row: 12, 'Job ID': 'JOB-001', Phase: 'Tile Work', Status: 'In Progress', 'Completed Date': '' },
      { __row: 13, 'Job ID': 'JOB-001', Phase: 'Fixtures', Status: 'Pending', 'Completed Date': '' },
      { __row: 14, 'Job ID': 'JOB-001', Phase: 'Final Inspection', Status: 'Pending', 'Completed Date': '' },
    ]
  },
  clients: [
    { __row: 2, 'First Name': 'Sarah', 'Last Name': 'Chen', Email: 'sarah@email.com', Phone: '555-1001', 'Lifetime Value': '$28,500', 'Number of Jobs': '1', 'Last Job': 'Bathroom Renovation', 'Satisfaction Score': '9/10', 'Referrals Given': '1', Notes: 'Excellent client. Referred Linda Foster.' },
    { __row: 3, 'First Name': 'The', 'Last Name': 'Hendersons', Email: 'henderson@email.com', Phone: '555-1002', 'Lifetime Value': '$62,000', 'Number of Jobs': '1', 'Last Job': 'Kitchen Remodel', 'Satisfaction Score': '10/10', 'Referrals Given': '0', Notes: 'Huge project. Very pleased with progress.' },
    { __row: 4, 'First Name': 'Tom', 'Last Name': 'Bradley', Email: 'tombradley@email.com', Phone: '555-1003', 'Lifetime Value': '$22,000', 'Number of Jobs': '1', 'Last Job': 'Deck Addition', 'Satisfaction Score': '8/10', 'Referrals Given': '0', Notes: 'Happy client. May want landscaping next year.' },
    { __row: 5, 'First Name': 'Raj', 'Last Name': 'Patel', Email: 'raj@email.com', Phone: '555-1004', 'Lifetime Value': '$48,000', 'Number of Jobs': '1', 'Last Job': 'Basement Finish', 'Satisfaction Score': '', 'Referrals Given': '0', Notes: 'New client — job starts April.' },
  ],
  team: [
    { __row: 2, Name: 'Spencer Walraven', Role: 'Owner / Project Manager', Email: 'spencer@summitremodeling.com', Phone: '555-2001', Type: 'Crew', Active: 'Yes', 'Active Jobs': 2 },
    { __row: 3, Name: 'Chase Miller', Role: 'Sales Rep', Email: 'chase@summitremodeling.com', Phone: '555-2002', Type: 'Crew', Active: 'Yes', 'Active Jobs': 1 },
    { __row: 4, Name: 'Mike Torres', Role: 'Lead Carpenter', Email: 'mike@email.com', Phone: '555-2003', Type: 'Crew', Active: 'Yes', 'Active Jobs': 2 },
    { __row: 5, Name: 'Carlos Rivera', Role: 'Tile & Flooring', Email: 'carlos@email.com', Phone: '555-2004', Type: 'Crew', Active: 'Yes', 'Active Jobs': 2 },
    { __row: 6, Name: 'ABC Plumbing Co.', Role: 'Plumbing Subcontractor', Email: 'contact@abcplumbing.com', Phone: '555-3001', Type: 'Subcontractor', Active: 'Yes', 'Active Jobs': 1 },
    { __row: 7, Name: 'Elite Electric', Role: 'Electrical Subcontractor', Email: 'info@eliteelectric.com', Phone: '555-3002', Type: 'Subcontractor', Active: 'No', 'Active Jobs': 0 },
  ],
  alerts: [
    { type: 'urgent', icon: '🔥', title: 'Hot lead not contacted', desc: 'Linda Foster submitted 2 hours ago — Score 85. No contact made yet.', tag: 'Lead: Linda Foster' },
    { type: 'urgent', icon: '🔥', title: 'Hot lead not contacted', desc: 'Marcus Johnson submitted yesterday — Score 88. No contact made yet.', tag: 'Lead: Marcus Johnson' },
    { type: 'warning', icon: '⏰', title: 'Deposit overdue — Raj Patel', desc: 'Contract signed 5 days ago. Deposit invoice still unpaid. Job start date is April 1.', tag: 'Job: JOB-003' },
    { type: 'info', icon: '📋', title: 'Consultation tomorrow', desc: 'Priya Mehta consultation scheduled for March 25. Prep estimate before meeting.', tag: 'Lead: Priya Mehta' },
  ],
  marketing: [
    { __row: 2, 'Campaign Name': 'Spring Remodel Promo', Type: 'seasonal', Description: 'Seasonal promotion targeting past clients for spring projects.', 'Target Audience': 'Past clients + leads', Status: 'Ready', 'Send Now': '' },
    { __row: 3, 'Campaign Name': 'Referral Thank You', Type: 'referral', Description: 'Reward clients who refer new leads with a thank-you and gift card offer.', 'Target Audience': 'Current clients', Status: 'Ready', 'Send Now': '' },
    { __row: 4, 'Campaign Name': 'We Miss You', Type: 're-engagement', Description: 'Re-engage leads who went cold in the last 60–90 days.', 'Target Audience': 'Cold leads', Status: 'Ready', 'Send Now': '' },
    { __row: 5, 'Campaign Name': 'Summer Deck Special', Type: 'seasonal', Description: '10% off deck projects booked before June 1.', 'Target Audience': 'All leads', Status: 'Sent', 'Send Now': 'Yes' },
  ],
  settings: {
    companyName: 'Summit Remodeling',
    phone: '(555) 555-0100',
    email: 'hello@summitremodeling.com',
    address: '123 Builder Lane, Nashville, TN 37201',
    ownerName: 'Spencer Walraven',
    calendlyLink: 'https://calendly.com/summit/30min',
    googleReviewLink: 'https://g.page/r/review',
    emailSignature: 'Spencer Walraven | Summit Remodeling | (555) 555-0100',
  },
  approvals: [
    { _row: 3, jobId: 'JOB-002', clientName: 'The Hendersons', serviceType: 'Kitchen Remodel', jobValue: '$62,000', type: 'proposal', label: 'Proposal', docLink: 'https://docs.google.com' },
    { _row: 4, jobId: 'JOB-003', clientName: 'Raj Patel',      serviceType: 'Basement Finish',  jobValue: '$48,000', type: 'contract', label: 'Contract', docLink: 'https://docs.google.com' },
  ],
  inventory: {
    items: [
      { jobId:'JOB-001', clientName:'Sarah Chen',      category:'Tile',              item:'12x24 Porcelain Floor Tile',      quantity:'180 sq ft',   unitCost:'$4.20/sq ft',  totalCost:'$756',    bestSource:'Floor & Decor' },
      { jobId:'JOB-001', clientName:'Sarah Chen',      category:'Tile',              item:'4x12 Subway Wall Tile',           quantity:'120 sq ft',   unitCost:'$2.80/sq ft',  totalCost:'$336',    bestSource:'Home Depot' },
      { jobId:'JOB-001', clientName:'Sarah Chen',      category:'Plumbing',          item:'Delta Faucet Set',                quantity:'1 set',        unitCost:'$285/set',     totalCost:'$285',    bestSource:'Ferguson Supply' },
      { jobId:'JOB-001', clientName:'Sarah Chen',      category:'Plumbing',          item:'Rain Shower Head',               quantity:'1 ea',         unitCost:'$195/ea',      totalCost:'$195',    bestSource:'Amazon / Ferguson' },
      { jobId:'JOB-002', clientName:'The Hendersons',  category:'Cabinets',          item:'Semi-Custom Shaker Cabinets',    quantity:'22 linear ft', unitCost:'$485/lin ft',  totalCost:'$10,670', bestSource:'Lowes / local cabinet shop' },
      { jobId:'JOB-002', clientName:'The Hendersons',  category:'Countertops',       item:'Quartz Countertop (3cm)',        quantity:'55 sq ft',     unitCost:'$68/sq ft',    totalCost:'$3,740',  bestSource:'Local stone yard' },
      { jobId:'JOB-002', clientName:'The Hendersons',  category:'Appliances',        item:'Stainless Steel Dishwasher',     quantity:'1 ea',         unitCost:'$749/ea',      totalCost:'$749',    bestSource:'Best Buy / Home Depot' },
      { jobId:'JOB-002', clientName:'The Hendersons',  category:'Hardware',          item:'Cabinet Pulls (brushed nickel)', quantity:'32 ea',        unitCost:'$8.50/ea',     totalCost:'$272',    bestSource:'Amazon / Lowes' },
    ],
    byJob: [
      { jobId:'JOB-001', clientName:'Sarah Chen',     updatedAt:'3/20/2026', items: [] },
      { jobId:'JOB-002', clientName:'The Hendersons', updatedAt:'3/22/2026', items: [] },
    ],
  },
  equipment: [
    { _row:2, equipmentId:'EQ-001', name:'2022 Ford F-250',             category:'Vehicle',    makeModel:'Ford F-250 XLT',    status:'In Use',     assignedTo:'Mike T.',  assignedJob:'JOB-001', value:'$45,000', notes:'Main work truck' },
    { _row:3, equipmentId:'EQ-002', name:'2019 Trailer',                category:'Trailer',    makeModel:'Big Tex 14OA',      status:'Available',  assignedTo:'',         assignedJob:'',        value:'$8,500',  notes:'Material hauler' },
    { _row:4, equipmentId:'EQ-003', name:'24ft Extension Ladder',       category:'Ladder',     makeModel:'Werner D1524-2',    status:'Available',  assignedTo:'',         assignedJob:'',        value:'$280',    notes:'' },
    { _row:5, equipmentId:'EQ-004', name:'DeWalt Tile Saw',             category:'Power Tool', makeModel:'DeWalt D24000S',    status:'Maintenance',assignedTo:'',         assignedJob:'',        value:'$650',    notes:'Blade needs replacing' },
    { _row:6, equipmentId:'EQ-005', name:'Scaffold Set (4 sections)',   category:'Scaffold',   makeModel:'Bil-Jax 4x5',       status:'Available',  assignedTo:'',         assignedJob:'',        value:'$1,200',  notes:'Stored in bay 2' },
    { _row:7, equipmentId:'EQ-006', name:'2021 Ford Transit Van',       category:'Vehicle',    makeModel:'Ford Transit 250',  status:'Available',  assignedTo:'',         assignedJob:'',        value:'$38,000', notes:'Cargo van — crew transport' },
  ],
};

/* ─── STATE ────────────────────────────────────────────────────── */
const loaded = {};
let allLeads = [], allJobs = [], allClients = [], allTeam = [], allMarketing = [];
let leadFilter = 'all', jobFilter = 'all', teamFilter = 'all', mktgFilter = 'all';
let usingDemo = false;
let _calendlyLink = '';
let currentUser = { name: '', role: 'owner' };

/* ─── GREETING ──────────────────────────────────────────────────── */
function greet() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

/* ─── ROLE NAV ──────────────────────────────────────────────────── */
function applyRoleNav(role) {
  const nav = document.getElementById('bottomNav');
  if (!nav) return;

  const configs = {
    owner: [
      { page: 'dashboard', icon: '🏠', label: 'Home' },
      { page: 'leads',     icon: '👤', label: 'Leads',    badge: 'leadsNavBadge' },
      { page: 'jobs',      icon: '🔨', label: 'Jobs' },
      { page: 'schedule',  icon: '🗓️', label: 'Schedule' },
      { page: 'more',      icon: '☰',  label: 'More' },
    ],
    sales: [
      { page: 'dashboard', icon: '🏠', label: 'Home' },
      { page: 'leads',     icon: '👤', label: 'Leads',    badge: 'leadsNavBadge' },
      { page: 'jobs',      icon: '🔨', label: 'Jobs' },
      { page: 'alerts',    icon: '🔔', label: 'Alerts',   dot: 'alertsNavDot' },
      { page: 'more',      icon: '☰',  label: 'More' },
    ],
    field: [
      { page: 'dashboard', icon: '🏠', label: 'Home' },
      { page: 'jobs',      icon: '🔨', label: 'Jobs' },
      { page: 'field',     icon: '📋', label: 'Field' },
      { page: 'schedule',  icon: '🗓️', label: 'Schedule' },
      { page: 'more',      icon: '☰',  label: 'More' },
    ],
  };

  const items = configs[role] || configs.owner;
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

    if (!events.length) {
      el.innerHTML = '<div class="cal-evt-empty">📭 Nothing scheduled today</div>';
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
    el.innerHTML = '<div class="cal-evt-empty">📭 No schedule data available</div>';
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
      <div class="kpi-sub">This month</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Active Jobs</div>
      <div class="kpi-value green">${data.activeJobs ?? '—'}</div>
      <div class="kpi-sub">In progress</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Pipeline</div>
      <div class="kpi-value gold">${formatCurrency(data.pipelineValue)}</div>
      <div class="kpi-sub">Open opportunities</div>
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
    pills.push(`<button class="dash-pill blue" onclick="navigate('field')">📋 Log Today's Update</button>`);
    el.innerHTML = pills.join('');
    return;
  }
  if (urgentCount > 0) {
    pills.push(`<button class="dash-pill red" onclick="navigate('alerts')">🔥 ${urgentCount} Alert${urgentCount > 1 ? 's' : ''} Need Attention</button>`);
  } else {
    pills.push(`<div class="dash-pill green" style="cursor:default">✅ No urgent alerts</div>`);
  }
  if (approvalCount > 0) {
    pills.push(`<button class="dash-pill gold" onclick="navigate('approvals')">✅ ${approvalCount} Pending Approval${approvalCount > 1 ? 's' : ''}</button>`);
  }
  el.innerHTML = pills.join('');
}

function renderDashQuickActions(role) {
  const el = document.getElementById('dashQuickActions');
  if (!el) return;

  const sets = {
    owner: [
      { icon:'👤', name:'Leads',        desc:'View pipeline',        page:'leads' },
      { icon:'🔨', name:'Jobs',         desc:'Active projects',       page:'jobs' },
      { icon:'📦', name:'Inventory',    desc:'Materials & suppliers', page:'inventory' },
      { icon:'📢', name:'Marketing',    desc:'Campaigns',             page:'marketing' },
      { icon:'🤖', name:'AI Agents',    desc:'Live activity',         page:'agents' },
      { icon:'📊', name:'Analytics',    desc:'Revenue & trends',      page:'analytics' },
    ],
    sales: [
      { icon:'👤', name:'Leads',        desc:'My pipeline',      page:'leads' },
      { icon:'🔨', name:'Jobs',         desc:'Active projects',  page:'jobs' },
      { icon:'✅', name:'Approvals',    desc:'Review queue',     page:'approvals' },
      { icon:'💬', name:'Conversations',desc:'Email threads',    page:'conversations' },
    ],
    field: [
      { icon:'🔨', name:'My Jobs',      desc:'Active projects',  page:'jobs' },
      { icon:'📋', name:'Field Update', desc:'Log progress',     page:'field' },
      { icon:'🗓️', name:'Schedule',    desc:'Upcoming work',    page:'schedule' },
      { icon:'💬', name:'Conversations',desc:'Messages',         page:'conversations' },
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
function toast(msg, dur = 2200) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), dur);
}

/* ─── API FETCH W/ DEMO FALLBACK ────────────────────────────────── */
async function api(path) {
  try {
    const res = await fetch(path);
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
  dot.title = state === 'live' ? 'Connected to Google Sheets ✓'
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
  field: 'Field Updates',
};

function navigate(page) {
  // Update pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById('page-' + page);
  if (el) el.classList.add('active');

  // Update nav
  document.querySelectorAll('.nav-item').forEach(n => {
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
    else if (page === 'conversations') loadConversations();
    else if (page === 'field')         loadField();
    else if (page === 'analytics')     loadAnalytics();
    else if (page === 'schedule')      loadSchedule();
    else if (page === 'inventory')     loadInventory();
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

  // Today's schedule strip + summary in parallel
  const [data] = await Promise.all([
    api('/api/summary'),
    loadTodayStrip(),
  ]);
  if (!data) return;

  const cn = data.companyName || '—';
  document.getElementById('companyName').textContent = cn;
  if (cn !== '—') document.title = cn + ' CRM';

  // Role-specific KPIs
  renderDashKPIs(data, currentUser.role);

  // Activity feed
  const feed = document.getElementById('activityFeed');
  const items = data.activity || [];
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

  // Load alerts + approvals in parallel for status pills + nav badges
  const [alerts, pending] = await Promise.all([
    loaded['alerts-count']   ? Promise.resolve(null) : api('/api/alerts').catch(() => []),
    loaded['approvals-count'] || currentUser.role === 'field'
      ? Promise.resolve(null)
      : api('/api/approvals').catch(() => []),
  ]);

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
async function loadLeads() {
  allLeads = await api('/api/leads') || [];
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
  renderLeads();
}

function filterLeads() { renderLeads(); }

function renderLeads() {
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
    el.innerHTML = `<div class="empty"><div class="empty-icon">👤</div><div class="empty-title">No leads found</div><div class="empty-sub">Try a different filter</div></div>`;
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

    return `
      <div class="list-item" onclick="showLeadDetail(${idx})">
        <div class="item-avatar" style="background:${sc==='hot'?'rgba(239,68,68,.12)':sc==='warm'?'rgba(245,158,11,.12)':'rgba(59,130,246,.1)'}">
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
    </div>
    <div class="modal-section">
      <div class="modal-section-label">Notes</div>
      <textarea class="note-editor" id="lmNoteText" placeholder="Add a note after your call…">${notes||''}</textarea>
      <button class="save-note-btn" onclick="saveLeadNote()">💾 Save Note</button>
    </div>
  `;

  // Handle convert / lost / calendly button states
  const convertBtn  = document.getElementById('lmConvertBtn');
  const lostBtn     = document.getElementById('lmLostBtn');
  const calendlyBtn = document.getElementById('lmCalendly');
  const isConverted = (status || '').toLowerCase().includes('convert');
  const isLost      = (status || '').toLowerCase().includes('lost');

  if (isConverted) {
    convertBtn.textContent = '✅ Converted';
    convertBtn.disabled = true;
    convertBtn.className = 'btn btn-green';
  } else {
    convertBtn.textContent = '🎉 Convert';
    convertBtn.disabled = false;
    convertBtn.className = 'btn btn-green';
  }

  if (isLost) {
    lostBtn.textContent = '❌ Already Lost';
    lostBtn.disabled = true;
  } else {
    lostBtn.textContent = '❌ Lost';
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

    btn.textContent = '✅ Converted!';
    btn.style.background = 'rgba(34,197,94,.25)';
    btn.style.color = 'var(--green)';

    toast(`🎉 ${name} marked as Converted!`, 3000);

    // Re-render list behind modal
    renderLeads();

    // Close modal after a beat
    setTimeout(() => closeModal('leadModal'), 1200);

  } catch(e) {
    btn.textContent = '🎉 Mark as Converted';
    btn.disabled = false;
    toast('⚠️ Could not update — try again');
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
    btn.textContent = '❌ Marked Lost';
    toast(`${name} marked as Lost`);
    renderLeads();
    setTimeout(() => closeModal('leadModal'), 1000);
  } catch {
    btn.textContent = '❌ Lost'; btn.disabled = false;
    toast('⚠️ Could not update — try again');
  }
}

/* ─── SAVE LEAD NOTE ─────────────────────────────────────────────── */
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
    toast('💾 Note saved');
    setTimeout(() => {
      if (btn) { btn.textContent = '💾 Save Note'; btn.disabled = false; btn.style.color = ''; }
    }, 2000);
  } catch {
    if (btn) { btn.textContent = '💾 Save Note'; btn.disabled = false; }
    toast('⚠️ Could not save note');
  }
}

/* ─── JOBS PAGE ─────────────────────────────────────────────────── */
async function loadJobs() {
  allJobs = await api('/api/jobs') || [];
  renderJobs();
}

function setJobFilter(btn) {
  document.querySelectorAll('#page-jobs .chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  jobFilter = btn.dataset.filter;
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
    el.innerHTML = `<div class="empty"><div class="empty-icon">🔨</div><div class="empty-title">No jobs found</div><div class="empty-sub">Try a different filter</div></div>`;
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
    if (deposit && deposit.toLowerCase().includes('paid')) icons += '💰';
    if (invoice && invoice.toLowerCase().includes('paid')) icons += '✅';
    if (invoice && invoice.toLowerCase().includes('overdue')) icons += '⚠️';

    return `
      <div class="list-item" onclick="showJobDetail(${idx})">
        <div class="item-avatar" style="font-size:22px">🔨</div>
        <div class="item-body">
          <div class="item-name">${client}</div>
          <div class="item-sub">${project}${jobId?' · '+jobId:''}</div>
        </div>
        <div class="item-right">
          <div class="item-value">${value ? formatCurrency(value) : '—'}</div>
          <div style="margin-top:4px">${statusBadge(status)}</div>
        </div>
        <span class="chevron">›</span>
      </div>
    `;
  }).join('');
}

async function showJobDetail(idx) {
  const j = allJobs[idx];
  if (!j) return;
  _currentJobRow = j.__row || j._row;
  const client  = g(j,'clientName','Client Name','Client') || `${g(j,'firstName','First Name')} ${g(j,'lastName','Last Name')}`.trim() || 'Unknown';
  const project = g(j,'serviceType','Service Type','Project Type') || '—';
  const jobId   = g(j,'jobId','Job ID');
  const value   = g(j,'totalJobValue','Total Job Value','Job Value','Contract Value');
  const status  = g(j,'jobStatus','Job Status','Status');
  const start   = g(j,'startDate','Site Visit Date','Kickoff Date','Start Date');
  const end     = g(j,'endDate','Est. Completion','Estimated End','End Date');
  const crew    = g(j,'salesperson','Salesperson','Assigned Crew','Crew');
  const notes   = g(j,'jobNotes','Job Notes','Notes');
  const deposit = g(j,'depositPaid','Deposit Paid','Deposit Invoice Paid');
  const invoice = g(j,'finalPaid','Final Invoice Paid','Final Paid');
  const proposalLink  = g(j,'proposalLink','Proposal Doc Link','Proposal Link');
  const contractLink  = g(j,'contractLink','Contract Doc Link','Contract Link');
  const kickoffLink   = g(j,'kickoffDocLink','Kickoff Doc Link','Kickoff Link');
  const estimateLink  = g(j,'estimateDocLink','Estimate Doc Link','Estimate Link');

  document.getElementById('jmTitle').textContent = client;
  document.getElementById('jmSub').textContent   = `${project}${jobId?' · '+jobId:''}`;

  // Load phases
  let phasesHTML = '<div class="text-dim fs13">No phases found</div>';
  let phaseData = [];
  try {
    phaseData = await api('/api/phases?jobId=' + encodeURIComponent(jobId)) || [];
    if (phaseData.length > 0) {
      phasesHTML = phaseData.map((p, pi) => {
        const pName   = g(p,'Phase','Phase Name','name','phaseName');
        const pStatus = g(p,'Status','Phase Status','phase_status','phaseStatus');
        const pDate   = g(p,'Completed Date','Completion Date','completionDate','date');
        const pRow    = p.__row || p._row || (pi + 2);
        const done    = pStatus && (pStatus.toLowerCase().includes('complete') || pStatus.toLowerCase().includes('done'));
        return `
          <div class="phase-item" id="phase-row-${pRow}">
            <div class="phase-check ${done?'done':''}" onclick="togglePhase(${pRow}, this)">${done?'✓':''}</div>
            <div class="phase-name">${pName||'—'}</div>
            <div class="phase-date">${pDate||(done?'Complete':pStatus||'Pending')}</div>
          </div>
        `;
      }).join('');
    }
  } catch(e) {}

  const jobStatuses = ['Planning','In Progress','Complete','Invoiced'];
  const statusSwitcher = `
    <div class="status-switcher">
      ${jobStatuses.map(s => {
        const isActive = (status||'').toLowerCase() === s.toLowerCase() ||
                         (status||'').toLowerCase().includes(s.toLowerCase().split(' ')[0]);
        return `<button class="status-pill ${isActive?'active-pill':''}" onclick="changeJobStatus('${s}', this)">${s}</button>`;
      }).join('')}
    </div>
  `;

  document.getElementById('jmBody').innerHTML = `
    <div class="modal-section">
      <div class="modal-section-label">Job Status</div>
      ${statusSwitcher}
    </div>
    <div class="modal-section">
      <div class="modal-section-label">Job Details</div>
      <div class="detail-row"><div class="detail-key">Status</div><div class="detail-val" id="jmStatusBadge">${statusBadge(status)}</div></div>
      <div class="detail-row"><div class="detail-key">Contract Value</div><div class="detail-val text-gold fw800">${value?formatCurrency(value):'—'}</div></div>
      <div class="detail-row"><div class="detail-key">Start Date</div><div class="detail-val">${start||'—'}</div></div>
      <div class="detail-row"><div class="detail-key">End Date</div><div class="detail-val">${end||'—'}</div></div>
      <div class="detail-row"><div class="detail-key">Crew</div><div class="detail-val">${crew||'—'}</div></div>
    </div>

    <div class="modal-section">
      <div class="modal-section-label">Invoices</div>
      <div class="inv-row">
        <div class="inv-label">Deposit</div>
        <div>${statusBadge(deposit||'Pending')}</div>
      </div>
      <div class="inv-row">
        <div class="inv-label">Final Invoice</div>
        <div>${statusBadge(invoice||'Pending')}</div>
      </div>
    </div>

    <div class="modal-section">
      <div class="modal-section-label">Documents</div>
      ${[
        {name:'Estimate',    icon:'💰', link:estimateLink, event:'generate_estimate'},
        {name:'Proposal',    icon:'📄', link:proposalLink, event:'generate_proposal'},
        {name:'Contract',    icon:'📝', link:contractLink, event:'generate_contract'},
        {name:'Kickoff Doc', icon:'🚀', link:kickoffLink,  event:'plan_project'},
      ].map(d => `
        <div class="doc-link">
          <div class="doc-icon">${d.icon}</div>
          <div class="doc-name">${d.name}</div>
          ${d.link
            ? `<a class="doc-btn" href="${d.link}" target="_blank">Open ↗</a>`
            : `<button class="doc-btn" style="color:var(--gold);cursor:pointer"
                 onclick="triggerDocGen('${d.event}',${_currentJobRow})">Generate</button>`}
        </div>
      `).join('')}
    </div>

    <div class="modal-section">
      <div class="modal-section-label">Job Phases</div>
      ${phasesHTML}
    </div>

    ${notes ? `
    <div class="modal-section">
      <div class="modal-section-label">Notes</div>
      <div class="notes-box">${notes}</div>
    </div>` : ''}

    ${jobId ? `
    <div class="modal-section">
      <div class="modal-section-label">Client Status Page</div>
      <div style="display:flex;align-items:center;gap:10px;background:var(--card2);border:1px solid var(--border);border-radius:10px;padding:12px">
        <div style="flex:1;font-size:13px;color:var(--text2);word-break:break-all">${location.origin}/status/${jobId}</div>
        <button class="btn btn-secondary" style="padding:8px 14px;font-size:13px;flex-shrink:0" onclick="copyStatusLink('${jobId}')">Copy</button>
        <a href="/status/${jobId}" target="_blank" class="btn btn-secondary" style="padding:8px 14px;font-size:13px;flex-shrink:0;text-decoration:none">Open ↗</a>
      </div>
    </div>` : ''}
  `;

  openModal('jobModal');
}

function copyStatusLink(jobId) {
  const url = `${location.origin}/status/${jobId}`;
  navigator.clipboard.writeText(url).then(() => toast('✅ Status link copied!')).catch(() => {
    const el = document.createElement('textarea');
    el.value = url; document.body.appendChild(el); el.select();
    document.execCommand('copy'); document.body.removeChild(el);
    toast('✅ Status link copied!');
  });
}

/* ─── CHANGE ORDER MODAL ─────────────────────────────────────────── */
// ─── KICKOFF SCHEDULER ────────────────────────────────────────────────────────
async function syncJobToCalendar() {
  if (!_currentJobRow) { toast('⚠️ No job selected'); return; }
  try {
    const res  = await fetch(`/api/jobs/${_currentJobRow}/sync-calendar`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    toast(`📅 ${data.created} event${data.created !== 1 ? 's' : ''} synced to Google Calendar!`);
  } catch (err) {
    toast(`❌ ${err.message}`, 3000);
  }
}

async function sendKickoffSchedule() {
  if (!_currentJobRow) { toast('⚠️ No job selected'); return; }
  const confirmed = confirm('Send kickoff date options to the client? They\'ll get 3 date choices by email.');
  if (!confirmed) return;
  try {
    const res  = await fetch(`/api/jobs/${_currentJobRow}/kickoff-schedule`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    toast(`🗓️ Kickoff scheduling email sent! Dates offered: ${(data.datesOffered||[]).join(', ')}`);
    closeModal('jobModal');
  } catch (err) {
    toast(`❌ ${err.message}`, 3000);
  }
}

// ─── DAILY BRIEFING ───────────────────────────────────────────────────────────
async function sendDailyBriefing() {
  const btn = document.getElementById('briefingBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
  try {
    await fetch('/api/briefing/send', { method: 'POST' });
    toast('☀️ Briefing sent to owner email!');
  } catch (err) {
    toast(`❌ ${err.message}`, 3000);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '☀️ Send Briefing'; }
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
  if (!desc) { toast('⚠️ Describe what is changing first'); return; }
  if (!_currentJobRow) { toast('⚠️ No job selected'); return; }

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
    toast('✅ Change order generating — client will receive email shortly');
  } catch (err) {
    toast(`❌ ${err.message}`, 3000);
    btn.disabled = false;
    btn.textContent = 'Generate & Send';
  }
}

/* ─── CHANGE JOB STATUS ─────────────────────────────────────────── */
async function changeJobStatus(newStatus, btn) {
  if (!_currentJobRow) return;
  // Update pill UI immediately
  document.querySelectorAll('.status-pill').forEach(p => p.classList.remove('active-pill'));
  btn.classList.add('active-pill');
  // Update the badge in detail rows
  const badgeEl = document.getElementById('jmStatusBadge');
  if (badgeEl) badgeEl.innerHTML = statusBadge(newStatus);
  // Update local state
  const job = allJobs.find(j => (j.__row||j._row) === _currentJobRow);
  if (job) {
    if (job['Status'] !== undefined)     job['Status'] = newStatus;
    if (job['Job Status'] !== undefined) job['Job Status'] = newStatus;
    if (job['jobStatus'] !== undefined)  job['jobStatus'] = newStatus;
  }
  try {
    if (!usingDemo) {
      await fetch(`/api/jobs/${_currentJobRow}/status`, {
        method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ status: newStatus })
      });
    }
    toast(`✓ Job moved to ${newStatus}`);
    renderJobs();
  } catch {
    toast('⚠️ Could not update status');
  }
}

/* ─── GENERATE DOCUMENT ─────────────────────────────────────────── */
async function triggerDocGen(eventType, rowNumber) {
  if (usingDemo) { toast('⚠️ Connect to Google Sheets to generate documents'); return; }
  const btn = event?.target;
  if (btn) { btn.textContent = '⏳ Generating…'; btn.disabled = true; }
  try {
    const res = await fetch('/webhook/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: eventType, rowNumber }),
    });
    if (res.ok) {
      toast('✓ Agent started — doc will appear in a minute');
      if (btn) { btn.textContent = '⏳ Working…'; }
      // Refresh the job after 90s so the new link appears
      setTimeout(() => {
        delete loaded['jobs'];
        allJobs = [];
        if (document.querySelector('.page.active')?.id === 'page-jobs') loadJobs();
      }, 90000);
    } else {
      toast('⚠️ Could not start agent');
      if (btn) { btn.textContent = 'Generate'; btn.disabled = false; }
    }
  } catch {
    toast('⚠️ Network error');
    if (btn) { btn.textContent = 'Generate'; btn.disabled = false; }
  }
}

/* ─── TOGGLE PHASE COMPLETE ─────────────────────────────────────── */
async function togglePhase(row, checkEl) {
  const isDone    = checkEl.classList.contains('done');
  const newStatus = isDone ? 'Pending' : 'Complete';
  // Update UI immediately
  checkEl.classList.toggle('done', !isDone);
  checkEl.textContent = isDone ? '' : '✓';
  const dateEl = checkEl.closest('.phase-item')?.querySelector('.phase-date');
  if (dateEl) dateEl.textContent = isDone ? 'Pending' : new Date().toLocaleDateString('en-US');
  try {
    if (!usingDemo) {
      await fetch(`/api/phases/${row}/status`, {
        method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ status: newStatus })
      });
    }
    toast(isDone ? 'Phase marked Pending' : '✓ Phase complete!');
  } catch {
    // Revert UI
    checkEl.classList.toggle('done', isDone);
    checkEl.textContent = isDone ? '✓' : '';
    toast('⚠️ Could not update phase');
  }
}

/* ─── CLIENTS PAGE ──────────────────────────────────────────────── */
async function loadClients() {
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
    el.innerHTML = `<div class="empty"><div class="empty-icon">🤝</div><div class="empty-title">No clients yet</div><div class="empty-sub">Clients appear here after jobs are completed</div></div>`;
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
        <div class="item-avatar" style="font-size:20px">🤝</div>
        <div class="item-body">
          <div class="item-name">${name}</div>
          <div class="item-sub">${last||'—'}${jobs?' · '+jobs+' job'+(parseInt(jobs)>1?'s':''):''}</div>
        </div>
        <div class="item-right">
          <div class="item-value">${ltv?formatCurrency(ltv):'—'}</div>
          ${sat?`<div class="item-label">⭐ ${sat}</div>`:''}
        </div>
        <span class="chevron">›</span>
      </div>
    `;
  }).join('');
}

function showClientDetail(idx) {
  const c = allClients[idx];
  if (!c) return;
  const firstName = g(c,'First Name','firstName','first_name');
  const lastName  = g(c,'Last Name','lastName','last_name');
  const name   = g(c,'Full Name','fullName') || `${firstName} ${lastName}`.trim() || 'Unknown';
  const email  = g(c,'Email','email');
  const phone  = g(c,'Phone','phone','Phone Number');
  const ltv    = g(c,'Lifetime Value','lifetimeValue','LTV');
  const jobs   = g(c,'Jobs Completed','jobsCompleted','Total Jobs','totalJobs','Number of Jobs');
  const last   = g(c,'Last Job','lastJob','Last Job Type','Last Project');
  const sat    = g(c,'AI Score','aiScore','Satisfaction Score','Satisfaction');
  const refs   = g(c,'Referral Potential','referralScore','Referral Score','Referrals Given');
  const notes  = g(c,'Notes','notes','Customer Profile','customerProfile');
  const addr   = g(c,'Street Address','address','Address');

  document.getElementById('cmName').textContent = name;
  document.getElementById('cmSub').textContent  = email || phone || '—';
  document.getElementById('cmCall').href  = phone ? 'tel:' + phone.replace(/\D/g,'') : '#';
  document.getElementById('cmEmail').href = email ? 'mailto:' + email : '#';

  document.getElementById('cmBody').innerHTML = `
    <div class="modal-section">
      <div class="modal-section-label">Client Profile</div>
      <div class="detail-row"><div class="detail-key">Lifetime Value</div><div class="detail-val text-gold fw800">${ltv?formatCurrency(ltv):'—'}</div></div>
      <div class="detail-row"><div class="detail-key">Total Jobs</div><div class="detail-val">${jobs||'—'}</div></div>
      <div class="detail-row"><div class="detail-key">Last Project</div><div class="detail-val">${last||'—'}</div></div>
      <div class="detail-row"><div class="detail-key">Satisfaction</div><div class="detail-val">${sat?'⭐ '+sat:'—'}</div></div>
      <div class="detail-row"><div class="detail-key">Referrals Given</div><div class="detail-val">${refs||'0'}</div></div>
      ${addr?`<div class="detail-row"><div class="detail-key">Address</div><div class="detail-val">${addr}</div></div>`:''}
      <div class="detail-row"><div class="detail-key">Phone</div><div class="detail-val">${phone||'—'}</div></div>
      <div class="detail-row"><div class="detail-key">Email</div><div class="detail-val" style="word-break:break-all">${email||'—'}</div></div>
    </div>
    ${notes?`
    <div class="modal-section">
      <div class="modal-section-label">Notes</div>
      <div class="notes-box">${notes}</div>
    </div>`:''}
  `;

  openModal('clientModal');
}

/* ─── ALERTS PAGE ───────────────────────────────────────────────── */
async function loadAlerts() {
  const alerts = await api('/api/alerts') || [];
  const el = document.getElementById('alertsList');

  // Update badge
  const urgentCount = alerts.filter(a => a.type === 'urgent').length;
  document.getElementById('alertBadge').style.display = urgentCount > 0 ? 'block' : 'none';
  document.getElementById('alertsNavDot').style.display = urgentCount > 0 ? 'block' : 'none';

  if (alerts.length === 0) {
    el.innerHTML = `<div class="empty"><div class="empty-icon">✅</div><div class="empty-title">All clear!</div><div class="empty-sub">No alerts right now. Great work keeping everything on track.</div></div>`;
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
    el.innerHTML = `<div class="empty"><div class="empty-icon">👥</div><div class="empty-title">No team members</div><div class="empty-sub">Add your crew to the Team tab in your spreadsheet</div></div>`;
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
    return `
      <div class="team-item" onclick="showTeamDetail(${globalIdx})" style="cursor:pointer">
        <div class="team-avatar" style="color:${isOn?'var(--gold)':'var(--text3)'}">${ini}</div>
        <div class="team-body">
          <div class="team-name">${name}</div>
          <div class="team-role">${role}</div>
          <div class="team-meta">${isOn?'<span class="text-green fw700">Active</span>':'<span class="text-dim">Inactive</span>'}${jobs?' · '+jobs+' job'+(parseInt(jobs)>1?'s':''):''}</div>
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

  document.getElementById('tmBody').innerHTML = `
    <div class="modal-section">
      <div class="modal-section-label">Details</div>
      <div class="detail-row"><div class="detail-key">Type</div><div class="detail-val">${type}</div></div>
      <div class="detail-row"><div class="detail-key">Trade</div><div class="detail-val">${trade}</div></div>
      <div class="detail-row"><div class="detail-key">Rate</div><div class="detail-val">${rate}</div></div>
      <div class="detail-row"><div class="detail-key">Status</div><div class="detail-val">${isOn?'<span class="text-green fw700">Active</span>':'<span class="text-dim">Inactive</span>'}</div></div>
      <div class="detail-row"><div class="detail-key">Phone</div><div class="detail-val">${phone||'—'}</div></div>
      <div class="detail-row"><div class="detail-key">Email</div><div class="detail-val" style="word-break:break-all">${email||'—'}</div></div>
    </div>
    <div class="modal-section">
      <div class="modal-section-label">Current Assignment</div>
      <div style="color:var(--text2);font-size:14px">${jobs}</div>
    </div>
    <div class="modal-section">
      <div class="modal-section-label">Notes</div>
      <div style="color:var(--text2);font-size:14px">${notes}</div>
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

function copySubLink(encodedName) {
  const url = `${location.origin}/sub/${encodedName}`;
  navigator.clipboard.writeText(url).then(() => toast('✅ Sub portal link copied!')).catch(() => {
    const el = document.createElement('textarea');
    el.value = url; document.body.appendChild(el); el.select();
    document.execCommand('copy'); document.body.removeChild(el);
    toast('✅ Sub portal link copied!');
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
    toast('⚠️ Could not update');
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
    el.innerHTML = `<div class="empty"><div class="empty-icon">📢</div><div class="empty-title">No campaigns</div><div class="empty-sub">Add campaigns to the Marketing Library tab in your spreadsheet</div></div>`;
    return;
  }

  const icons = { 'seasonal':'🌸', 'referral':'🤝', 're-engagement':'🔄', 'default':'📢' };

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
    toast('🚀 Campaign launched!');
  } catch(e) {
    btn.textContent = 'Launch';
    toast('⚠️ Launch failed');
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
        <div class="empty-icon">✅</div>
        <div class="empty-title">All clear!</div>
        <div class="empty-sub">No documents waiting for approval</div>
      </div>`;
    return;
  }

  const typeIcons = { proposal: '📄', contract: '📝', template: '📋' };
  const typeColors = { proposal: 'badge-gold', contract: 'badge-blue', template: 'badge-gray' };

  el.innerHTML = allApprovals.map((item, idx) => {
    const icon  = typeIcons[item.type]  || '📄';
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
            ? `<a class="btn btn-secondary" href="${item.docLink}" target="_blank" style="flex:1;text-align:center">👁 View Doc</a>`
            : `<button class="btn btn-secondary" disabled style="flex:1;opacity:.4">No Link</button>`
          }
          <button class="btn btn-green" style="flex:1" onclick="approveItem(${idx}, event)">✅ Approve</button>
          <button class="btn btn-danger" style="flex:1" onclick="flagItem(${idx}, event)">🚩 Flag</button>
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
      toast('⚠️ Could not approve — try again');
      if (btn) { btn.textContent = '✅ Approve'; btn.disabled = false; }
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
      toast('⚠️ Could not flag — try again');
      if (btn) { btn.textContent = '🚩 Flag'; btn.disabled = false; }
      return;
    }
  }

  allApprovals.splice(idx, 1);
  renderApprovals();
  toast(`🚩 ${item.label} flagged — marked "Needs Revision"`);
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
        <div class="empty-icon">💬</div>
        <div class="empty-title">No conversations yet</div>
        <div class="empty-sub">Email threads will appear here once the AI sends outreach</div>
      </div>`;
    return;
  }

  el.innerHTML = filteredConversations.map((c, i) => {
    const initials = (c.name || '?').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
    const sourceLabel = c.source === 'job' ? `Job ${c.jobId || ''}` : 'Lead';
    const time = c.lastContact ? relTime(c.lastContact) : '';
    const statusBadge = c.status
      ? `<span class="badge ${statusColor(c.status, c.source)}" style="font-size:9px">${c.status}</span>`
      : '';
    return `
      <div class="conv-item" onclick="openThread(${i})">
        <div class="conv-avatar">${initials}</div>
        <div class="conv-body">
          <div class="conv-name">${c.name || '—'}</div>
          <div class="conv-meta">${c.project || c.email || '—'} ${statusBadge}</div>
        </div>
        <div class="conv-right">
          <div class="conv-time">${time}</div>
          <div class="conv-source">${sourceLabel}</div>
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

    document.getElementById('threadModalBody').innerHTML = msgs.map(m => {
      const from = m.from || '';
      const date = m.date ? new Date(m.date).toLocaleString('en-US',
        { month:'short', day:'numeric', hour:'numeric', minute:'2-digit', hour12:true }) : '';
      const body = (m.body || '').trim().slice(0, 1200);
      return `
        <div class="thread-message">
          <div class="thread-msg-header">
            <div class="thread-msg-from">${from}</div>
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
  { key: 'Notify: New Lead',          label: 'New Lead',          icon: '👋' },
  { key: 'Notify: Proposal Approved', label: 'Proposal Approved', icon: '🎉' },
  { key: 'Notify: Proposal Declined', label: 'Proposal Declined', icon: '❌' },
  { key: 'Notify: Payment Received',  label: 'Payment Received',  icon: '💰' },
  { key: 'Notify: Kickoff Confirmed', label: 'Kickoff Confirmed', icon: '🗓️' },
  { key: 'Notify: Change Order',      label: 'Change Order',      icon: '📝' },
  { key: 'Notify: Field Issue',       label: 'Field Issue',       icon: '⚠️' },
  { key: 'Notify: Job Complete',      label: 'Job Complete',      icon: '✅' },
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
  // Cache calendly link globally for use in lead modal
  _calendlyLink = s.calendlyLink || s.calendly_link || '';

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

  // Hide settings write for non-owner
  if (me && me.role !== 'owner') {
    document.querySelectorAll('#page-settings input, #page-settings select, #page-settings textarea').forEach(el => el.disabled = true);
    document.querySelectorAll('#page-settings button').forEach(el => el.style.display = 'none');
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
    toast('⚠️ Could not save settings');
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
    el.innerHTML = '<div class="agent-empty">Waiting for agent activity…</div>';
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
  toast(`🤖 Firing ${type} on row ${rowNumber}…`, 2000);

  try {
    const res = await fetch('/webhook/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, rowNumber }),
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    toast(`✅ Agent triggered — watch the live feed`);
  } catch (e) {
    toast(`❌ Trigger failed: ${e.message}`, 3000);
  }

  setTimeout(() => {
    btns.forEach(b => b.classList.remove('running'));
  }, 3000);
}

/* ─── INIT ──────────────────────────────────────────────────────── */
window.addEventListener('DOMContentLoaded', () => {
  // Start rendering immediately with default role — don't block on /api/me
  applyRoleNav(currentUser.role);
  navigate('dashboard');
  initPullToRefresh();
  connectActivityStream();

  // Load user role in background — update nav if role differs from default
  fetch('/api/me')
    .then(r => r.ok ? r.json() : null)
    .catch(() => null)
    .then(me => {
      if (me?.role) {
        const prevRole = currentUser.role;
        currentUser = { name: me.name || '', role: me.role };
        // Rebuild nav only if role actually changed
        if (me.role !== prevRole) applyRoleNav(me.role);
        // Update greeting name if dashboard is still active
        const greetEl = document.getElementById('greetSub');
        if (greetEl && me.name && me.name !== 'Owner') {
          greetEl.textContent = greet() + `, ${me.name}`;
        }
      }
    });

  // Pre-load settings for Calendly link
  api('/api/settings').then(s => {
    if (s) _calendlyLink = s.calendlyLink || s.calendly_link || '';
  });

  // Demo banner
  setTimeout(() => {
    if (usingDemo) toast('📋 Demo mode — connect to Google Sheets for live data', 3500);
  }, 1500);
});

/* ─── FIELD UPDATE PAGE ──────────────────────────────────────────── */
let _fieldJobs = [];
let _fieldPhases = {};
let _expandedFieldRow = null;

async function loadField() {
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
        <div style="font-size:40px;margin-bottom:8px">🏗️</div>
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
              <div style="font-size:13px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">📸 Add Photo</div>
              <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
                <label style="display:flex;align-items:center;gap:6px;background:var(--bg2,#F4F5F7);border:1px dashed var(--border);border-radius:10px;padding:10px 16px;cursor:pointer;font-size:14px;font-weight:600;color:var(--text2)">
                  📷 Choose Photo
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
              <button class="btn btn-gold" style="flex:1;font-size:15px;padding:14px" onclick="submitFieldUpdate(${row}, event)">✅ Log Update</button>
            </div>

            <div class="field-issue-section">
              <div class="field-issue-title">⚠️ Flag an Issue</div>
              <div class="severity-chips" id="sev-chips-${row}">
                <button class="severity-chip low" onclick="setSeverity(${row},'Low',this)">🟢 Low</button>
                <button class="severity-chip medium" onclick="setSeverity(${row},'Medium',this)">🟡 Medium</button>
                <button class="severity-chip high" onclick="setSeverity(${row},'High',this)">🔴 High</button>
              </div>
              <textarea class="field-textarea" id="field-issue-${row}" placeholder="Describe the issue — owner will be notified immediately via text and email" style="min-height:70px"></textarea>
              <button class="btn btn-danger" style="width:100%;margin-top:10px;padding:13px;font-size:15px" onclick="submitFieldIssue(${row}, event)">🚨 Alert Owner Now</button>
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
  } catch { toast('⚠️ Could not update phase'); }
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
  if (!note) { toast('⚠️ Add a note before logging'); return; }

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
    toast(`✅ Update logged at ${data.timestamp}`);
    noteEl.value = '';
    if (notifyEl) notifyEl.checked = false;
    document.getElementById(`field-form-${row}`)?.classList.remove('open');
  } catch (err) {
    toast(`❌ ${err.message}`, 3000);
  } finally {
    btn.disabled = false;
    btn.textContent = '✅ Log Update';
  }
}

async function submitFieldIssue(row, e) {
  e.stopPropagation();
  const issueEl = document.getElementById(`field-issue-${row}`);
  const issue = issueEl?.value?.trim();
  const severity = _severityMap[row] || 'Unknown';
  if (!issue) { toast('⚠️ Describe the issue first'); return; }

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
    toast(`🚨 Owner alerted via text + email`);
    issueEl.value = '';
    _severityMap[row] = null;
    document.querySelectorAll(`#sev-chips-${row} .severity-chip`).forEach(c => c.classList.remove('active-sev'));
  } catch (err) {
    toast(`❌ ${err.message}`, 3000);
  } finally {
    btn.disabled = false;
    btn.textContent = '🚨 Alert Owner Now';
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
    toast('💰 Actual cost saved');
  } catch (err) {
    toast(`❌ Could not save cost: ${err.message}`, 3000);
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
  if (!file) { toast('⚠️ Choose a photo first'); return; }

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

    toast(`📸 Photo uploaded!`);
    // Hide preview
    document.getElementById(`photo-preview-${row}`).style.display = 'none';
    input.value = '';
    if (document.getElementById(`photo-caption-${row}`)) document.getElementById(`photo-caption-${row}`).value = '';
  } catch (err) {
    toast(`❌ Upload failed: ${err.message}`, 4000);
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

async function loadSchedule() {
  const el = document.getElementById('scheduleList');
  if (!el) return;
  el.innerHTML = `<div class="skel-item"><div class="skel-avatar skeleton"></div><div class="skel-lines"><div class="skel-line w60 skeleton"></div><div class="skel-line w40 skeleton"></div></div></div>`.repeat(3);

  try {
    const events = await api('/api/calendar/events?days=60') || [];
    if (!events.length) {
      el.innerHTML = `<div style="text-align:center;padding:40px 0;color:var(--text3)">
        <div style="font-size:40px;margin-bottom:8px">🗓️</div>
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
      📅 Google Calendar not connected yet — or no events in the next 60 days.<br>
      <span style="font-size:12px;color:var(--text3)">Hit "Sync All" after setting up your calendar credentials.</span>
    </div>`;
  }
}

async function syncAllToCalendar() {
  const btn = document.querySelector('[onclick="syncAllToCalendar()"]');
  if (btn) { btn.disabled = true; btn.textContent = 'Syncing…'; }
  try {
    await fetch('/api/calendar/sync', { method: 'POST' });
    toast('🗓️ Calendar sync started — events will appear in Google Calendar shortly!');
    setTimeout(loadSchedule, 3000);
  } catch (err) {
    toast(`❌ Sync failed: ${err.message}`, 3000);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '🔄 Sync All'; }
  }
}

// ─── ANALYTICS ───────────────────────────────────────────────────────────────

function fmt$(n) {
  if (!n && n !== 0) return '—';
  return '$' + Math.round(n).toLocaleString();
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
              <div class="inv-item-source">🛒 ${it.bestSource || '—'}</div>
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
  Vehicle: '🚛', Trailer: '🚜', Ladder: '🪜', Scaffold: '🏗️',
  'Power Tool': '⚙️', 'Hand Tool': '🔧', Safety: '🦺', Other: '📦',
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
      const icon = EQ_ICONS[eq.category] || '📦';
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
  if (!name) { toast('⚠️ Name is required'); return; }
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
  } catch { toast('⚠️ Could not save — check connection'); }
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
  } catch { toast('⚠️ Could not delete'); }
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
  } catch { toast('⚠️ Could not assign'); }
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
  } catch { toast('⚠️ Could not release'); }
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
          <div style="font-size:40px;margin-bottom:12px">📦</div>
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

async function loadAnalytics() {
  const [profitEl, sourcesEl, teamEl] = [
    document.getElementById('analyticsProfit'),
    document.getElementById('analyticsLeadSources'),
    document.getElementById('analyticsTeam'),
  ];

  // Load all three in parallel
  const [profitData, sourcesData, teamData] = await Promise.all([
    api('/api/analytics/profitability').catch(() => null),
    api('/api/analytics/lead-sources').catch(() => null),
    api('/api/analytics/team').catch(() => null),
  ]);

  // ── PROFITABILITY ──
  if (profitEl && profitData) {
    const { jobs, summary } = profitData;
    const marginColor = m => m === null ? 'var(--text3)' : m >= 30 ? '#22C55E' : m >= 15 ? '#F59E0B' : '#EF4444';
    profitEl.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:14px">
        <div style="background:var(--card);border-radius:12px;padding:14px;text-align:center">
          <div style="font-size:20px;font-weight:800;color:var(--navy)">${fmt$(summary.total)}</div>
          <div style="font-size:11px;color:var(--text3);margin-top:2px">Total Pipeline</div>
        </div>
        <div style="background:var(--card);border-radius:12px;padding:14px;text-align:center">
          <div style="font-size:20px;font-weight:800;color:${marginColor(summary.avgMargin)}">${summary.avgMargin !== null ? summary.avgMargin + '%' : '—'}</div>
          <div style="font-size:11px;color:var(--text3);margin-top:2px">Avg Margin</div>
        </div>
        <div style="background:var(--card);border-radius:12px;padding:14px;text-align:center">
          <div style="font-size:20px;font-weight:800;color:var(--navy)">${summary.jobCount}</div>
          <div style="font-size:11px;color:var(--text3);margin-top:2px">Total Jobs</div>
        </div>
      </div>
      <div style="font-size:16px;font-weight:700;color:var(--text1);margin-bottom:10px">Job Profitability</div>
      ${jobs.map(j => `
        <div style="background:var(--card);border-radius:12px;padding:14px;margin-bottom:8px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
            <div>
              <div style="font-weight:700;color:var(--text1)">${j.clientName}</div>
              <div style="font-size:12px;color:var(--text2)">${j.projectType || ''} · ${j.jobId}</div>
            </div>
            <div style="text-align:right">
              <div style="font-weight:800;color:var(--navy)">${fmt$(j.contractVal)}</div>
              ${j.margin !== null ? `<div style="font-size:12px;font-weight:700;color:${marginColor(j.margin)}">${j.margin}% margin</div>` : ''}
            </div>
          </div>
          ${j.overBudget ? `<div style="background:#FEF2F2;color:#DC2626;font-size:12px;font-weight:600;padding:6px 10px;border-radius:8px;margin-top:4px">⚠️ Over estimated budget — review actual costs</div>` : ''}
          <div style="display:flex;gap:16px;margin-top:8px;font-size:12px;color:var(--text2)">
            <span>Est: ${fmt$(j.estCost)}</span>
            ${j.actualCost > 0 ? `<span>Actual: ${fmt$(j.actualCost)}</span>` : ''}
            <span>${j.phasesDone}/${j.totalPhases} phases done</span>
          </div>
        </div>
      `).join('')}
    `;
  } else if (profitEl) {
    profitEl.innerHTML = `<div style="color:var(--text3);font-size:14px;padding:20px 0">No profitability data yet — add job values and phases to get started.</div>`;
  }

  // ── LEAD SOURCES ──
  if (sourcesEl && sourcesData?.length) {
    const max = Math.max(...sourcesData.map(s => s.leads), 1);
    sourcesEl.innerHTML = sourcesData.map(s => `
      <div style="background:var(--card);border-radius:12px;padding:14px;margin-bottom:8px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <div style="font-weight:700;color:var(--text1)">${s.source}</div>
          <div style="font-size:12px;color:var(--text2)">${s.leads} lead${s.leads !== 1 ? 's' : ''} · ${s.conversionRate}% close rate</div>
        </div>
        <div style="background:#F4F5F7;border-radius:99px;height:6px;overflow:hidden">
          <div style="background:var(--navy);height:100%;width:${Math.round((s.leads / max) * 100)}%;border-radius:99px;transition:width .5s"></div>
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:6px;font-size:12px;color:var(--text2)">
          <span>${s.converted} converted</span>
          <span>${s.totalValue > 0 ? fmt$(s.totalValue) + ' revenue' : 'No revenue tracked'}</span>
          ${s.avgJobValue > 0 ? `<span>Avg ${fmt$(s.avgJobValue)}/job</span>` : ''}
        </div>
      </div>
    `).join('');
  } else if (sourcesEl) {
    sourcesEl.innerHTML = `<div style="color:var(--text3);font-size:14px;padding:8px 0">No lead source data yet — add "How did you hear about us?" to your lead form.</div>`;
  }

  // ── TEAM PERFORMANCE ──
  if (teamEl && teamData?.length) {
    const active = teamData.filter(t => /yes|active/i.test(t.active || ''));
    teamEl.innerHTML = (active.length ? active : teamData).map(t => `
      <div style="background:var(--card);border-radius:12px;padding:14px;margin-bottom:8px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
          <div>
            <div style="font-weight:700;color:var(--text1)">${t.name}</div>
            <div style="font-size:12px;color:var(--text2)">${t.role || ''}</div>
          </div>
          ${t.avgRating !== null ? `<div style="font-size:18px;font-weight:800;color:var(--gold)">★ ${t.avgRating}</div>` : ''}
        </div>
        <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:12px;color:var(--text2)">
          ${t.jobsClosed > 0 ? `<span>🏆 ${t.jobsClosed} jobs closed</span>` : ''}
          ${t.totalRevenue > 0 ? `<span>💰 ${fmt$(t.totalRevenue)} revenue</span>` : ''}
          ${t.phasesAssigned > 0 ? `<span>📋 ${t.phasesDone}/${t.phasesAssigned} phases done</span>` : ''}
        </div>
      </div>
    `).join('');
  } else if (teamEl) {
    teamEl.innerHTML = `<div style="color:var(--text3);font-size:14px;padding:8px 0">No team data yet.</div>`;
  }
}
