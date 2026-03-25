/**
 * Logger — SSE event bus + console logging
 * Broadcasts agent activity to any connected dashboard clients in real time.
 */

const EventEmitter = require('events');

class ActivityBus extends EventEmitter {}
const bus = new ActivityBus();
bus.setMaxListeners(100);

// All connected SSE clients
const clients = new Set();

// Register a new SSE response stream
function addClient(res) {
  clients.add(res);
  res.on('close', () => clients.delete(res));
}

// Broadcast a structured event to all connected dashboards
function broadcast(event) {
  const data = `data: ${JSON.stringify(event)}\n\n`;
  for (const res of clients) {
    try { res.write(data); } catch (_) { clients.delete(res); }
  }
  bus.emit('activity', event);
}

// Log levels map to dashboard event types
function log(level, agentName, message, meta = {}) {
  const colors = { info: 'blue', success: 'green', warn: 'amber', error: 'red', agent: 'purple' };
  const event = {
    id:        Date.now(),
    ts:        new Date().toISOString(),
    level,
    agent:     agentName,
    message,
    color:     colors[level] || 'blue',
    ...meta,
  };
  const prefix = `[${agentName}]`;
  if (level === 'error') console.error(prefix, message, meta.error || '');
  else console.log(prefix, message);
  broadcast(event);
  return event;
}

// Convenience helpers
const logger = {
  info:    (agent, msg, meta) => log('info',    agent, msg, meta),
  success: (agent, msg, meta) => log('success', agent, msg, meta),
  warn:    (agent, msg, meta) => log('warn',    agent, msg, meta),
  error:   (agent, msg, meta) => log('error',   agent, msg, meta),
  agent:   (agent, msg, meta) => log('agent',   agent, msg, meta),
};

module.exports = { logger, addClient, bus };
