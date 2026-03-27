/**
 * Equipment service — PostgreSQL CRUD
 */
const { getAll, getOne, insertOne, updateOne } = require('../db');

const COMPANY_ID = 1;

function formatEquipment(r) {
  return {
    _row:         r.id,
    id:           r.id,
    name:         r.name || '',
    category:     r.category || '',
    serialNumber: r.serial_number || '',
    assignedTo:   r.assigned_to || '',
    assignedJob:  r.assigned_job || '',
    status:       r.status || 'available',  // available, in-use, maintenance, retired
    condition:    r.condition || 'good',
    purchaseDate: r.purchase_date || null,
    purchaseCost: parseFloat(r.purchase_cost || 0),
    location:     r.location || '',
    notes:        r.notes || '',
    createdAt:    r.created_at,
  };
}

async function getEquipment(status) {
  let sql = `SELECT * FROM equipment WHERE company_id = $1`;
  const params = [COMPANY_ID];
  if (status) { sql += ` AND status = $2`; params.push(status); }
  sql += ` ORDER BY name ASC`;
  const rows = await getAll(sql, params);
  return rows.map(formatEquipment);
}

async function getEquipmentItem(id) {
  const r = await getOne(`SELECT * FROM equipment WHERE id = $1 AND company_id = $2`, [id, COMPANY_ID]);
  return r ? formatEquipment(r) : null;
}

async function createEquipment(data) {
  return insertOne(`
    INSERT INTO equipment (company_id, name, category, serial_number, status, condition,
      purchase_date, purchase_cost, location, notes)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
  `, [
    COMPANY_ID,
    data.name || '',
    data.category || '',
    data.serialNumber || data.serial_number || '',
    data.status || 'available',
    data.condition || 'good',
    data.purchaseDate || data.purchase_date || null,
    parseFloat(data.purchaseCost || data.purchase_cost || 0) || null,
    data.location || '',
    data.notes || '',
  ]);
}

async function updateEquipmentStatus(id, status, assignedTo, assignedJob) {
  return updateOne(
    `UPDATE equipment SET status = $1, assigned_to = $2, assigned_job = $3, updated_at = NOW()
     WHERE id = $4 AND company_id = $5`,
    [status, assignedTo || null, assignedJob || null, id, COMPANY_ID]
  );
}

async function updateEquipment(id, data) {
  const allowed = ['name','category','serial_number','status','condition',
    'purchase_date','purchase_cost','location','notes','assigned_to','assigned_job'];
  const sets = [];
  const vals = [];
  let idx = 1;
  for (const [k, v] of Object.entries(data)) {
    if (allowed.includes(k)) { sets.push(`${k} = $${idx++}`); vals.push(v); }
  }
  if (!sets.length) throw new Error('No valid fields to update');
  vals.push(id, COMPANY_ID);
  return updateOne(
    `UPDATE equipment SET ${sets.join(', ')}, updated_at = NOW()
     WHERE id = $${idx++} AND company_id = $${idx}`,
    vals
  );
}

module.exports = {
  getEquipment, getEquipmentItem, createEquipment,
  updateEquipmentStatus, updateEquipment, formatEquipment,
};
