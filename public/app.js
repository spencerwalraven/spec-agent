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
  ]
};

/* ─── STATE ────────────────────────────────────────────────────── */
const loaded = {};
let allLeads = [], allJobs = [], allClients = [], allTeam = [], allMarketing = [];
let leadFilter = 'all', jobFilter = 'all', teamFilter = 'all', mktgFilter = 'all';
let usingDemo = false;
let _calendlyLink = '';

/* ─── GREETING ──────────────────────────────────────────────────── */
function greet() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
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
  agents: 'AI Agents', more: 'More'
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
    else if (page === 'approvals') loadApprovals();
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
  document.getElementById('greetSub').textContent = greet();
  const data = await api('/api/summary');
  if (!data) return;

  document.getElementById('companyName').textContent = data.companyName || '—';

  // KPI cards
  const kpiGrid = document.getElementById('kpiGrid');
  kpiGrid.innerHTML = `
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
      <div class="kpi-sub">Lead to client</div>
    </div>
  `;

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

  // Load alerts silently for badge
  if (!loaded['alerts-count']) {
    loaded['alerts-count'] = true;
    const alerts = await api('/api/alerts');
    const urgentCount = (alerts || []).filter(a => a.type === 'urgent').length;
    const badge = document.getElementById('alertBadge');
    const dot = document.getElementById('alertsNavDot');
    const dashDesc = document.getElementById('dashAlertDesc');
    if (urgentCount > 0) {
      badge.style.display = 'block';
      dot.style.display = 'block';
      if (dashDesc) dashDesc.textContent = `${urgentCount} urgent item${urgentCount > 1 ? 's' : ''}`;
    }
  }

  // Load approvals silently for dashboard badge
  if (!loaded['approvals-count']) {
    loaded['approvals-count'] = true;
    const pending = await api('/api/approvals');
    const count = (pending || []).length;
    const dashApprovalDesc = document.getElementById('dashApprovalDesc');
    const dashApprovalBadge = document.getElementById('dashApprovalBadge');
    if (count > 0) {
      if (dashApprovalDesc) dashApprovalDesc.textContent = `${count} waiting for review`;
      if (dashApprovalBadge) dashApprovalBadge.style.display = 'flex';
    } else {
      if (dashApprovalDesc) dashApprovalDesc.textContent = 'All clear';
    }
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
async function loadLeads() {
  allLeads = await api('/api/leads') || [];
  renderLeads();
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
        {name:'Proposal', icon:'📄', link: proposalLink},
        {name:'Contract', icon:'📝', link: contractLink},
        {name:'Kickoff Doc', icon:'🚀', link: kickoffLink},
      ].map(d => `
        <div class="doc-link">
          <div class="doc-icon">${d.icon}</div>
          <div class="doc-name">${d.name}</div>
          ${d.link ? `<a class="doc-btn" href="${d.link}" target="_blank">Open ↗</a>` : `<span style="font-size:12px;color:var(--text3)">No link</span>`}
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
  `;

  openModal('jobModal');
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
  `;
  openModal('teamModal');
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

/* ─── SETTINGS PAGE ─────────────────────────────────────────────── */
async function loadSettings() {
  const s = await api('/api/settings');
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
  // Cache calendly link globally for use in lead modal
  _calendlyLink = s.calendlyLink || s.calendly_link || '';
}

async function saveSettings() {
  const get = id => document.getElementById(id)?.value || '';
  const body = {
    companyName:   get('sCompanyName'),
    phone:         get('sPhone'),
    email:         get('sEmail'),
    address:       get('sAddress'),
    ownerName:     get('sOwnerName'),
    calendlyLink:  get('sCalendly'),
    googleReviewLink: get('sReviewLink'),
    emailSignature: get('sSignature'),
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
  navigate('dashboard');
  initPullToRefresh();
  connectActivityStream();   // start SSE feed

  // Pre-load settings to get Calendly link
  api('/api/settings').then(s => {
    if (s) _calendlyLink = s.calendlyLink || s.calendly_link || '';
  });

  // Show demo banner if needed
  setTimeout(() => {
    if (usingDemo) {
      toast('📋 Demo mode — connect to Google Sheets for live data', 3500);
    }
  }, 1500);
});
