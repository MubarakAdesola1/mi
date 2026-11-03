require("dotenv").config({ path: ".env.local" });

const clients = new Set();

function addClient(res) {
  clients.add(res);
  res.on("close", () => {
    clients.delete(res);
  });
}

function broadcastEvent(eventType, payload) {
  const data = JSON.stringify({
    type: eventType,
    payload,
    timestamp: new Date().toISOString(),
  });

  for (const client of clients) {
    client.write(`data: ${data}\n\n`);
  }
}

function getRealtimeConfig() {
  return {
    url: process.env.NEON_REALTIME_URL || null,
    active: !!process.env.NEON_REALTIME_URL,
    clientCount: clients.size,
  };
}

module.exports = {
  addClient,
  broadcastEvent,
  getRealtimeConfig,
};

