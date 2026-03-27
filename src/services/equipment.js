/**
 * Equipment service — PostgreSQL CRUD
 */
const { getAll, getOne, insertOne, updateOne, query } = require('../db');

const COMPANY_ID = 1;

function formatEquipment(r) {
  return {
    _row:          r.id,
    id:            r.id,
    name:          r.name           || '',
    type:          r.type           || '',
    serialNumber:  r.serial_number  || '',
    status:        r.status         || 'available',
    assignedTo:    r.assigned_to    || '',
    assignedJobId: r.assigned_job_id || null,
    purchaseDate:  r.purchase_date  || null,
    purchaseCost:  r.purchase_price || 0,
    notes:         r.notes          || '',
    createdAt:     r.created_at,
  };
}

async function getEquipment() {
  const rows = await getAll(
    `SELECT * FROM equipment WHERE company_id = $1 ORDER BY name ASC`,
    [COMPANY_ID]
  );
  return rows.map(formatEquipment);
}

async function createEquipment(data) {
  return insertOne(`
    INSERT INTO equipment (company_id, name, type, serial_number, status, assigned_to, assigned_job_id, purchase_date, purchase_price, notes)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
  `, [
    COMPANY_ID,
    data.name            || '',
    data.type            || null,
    data.serialNumber    || data.serial_number  || null,
    data.status          || 'available',
    data.assignedTo      || data.assigned_to    || null,
    data.assignedJobId   || data.assigned_job_id || null,
    data.purchaseDate    || data.purchase_date  || null,
    parseFloat(data.purchaseCost || data.purchase_price || 0) || null,
    data.notes           || null,
  ]);
}

async function updateEquipmentStatus(id, status, assignedTo, assignedJobId) {
  return updateOne(
    `UPDATE equipment SET status = $1, assigned_to = $2, assigned_job_id = $3, updated_at = NOW()
     WHERE id = $4 AND company_id = $5`,
    [status, assignedTo || null, assignedJobId || null, id, COMPANY_ID]
  );
}

async function deleteEquipment(id) {
  return query(
    `DELETE FROM equipment WHERE id = $1 AND company_id = $2`,
    [id, COMPANY_ID]
  );
}

module.exports = {
  formatEquipment,
  getEquipment,
  createEquipment,
  updateEquipmentStatus,
  deleteEquipment,
};
