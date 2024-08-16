// websocket-server.mjs
import { WebSocketServer } from "ws";
const wsPort = 80;
const wsClients = [];

export function startWebSocketServer() {
  const wss = new WebSocketServer({ port: wsPort });

  wss.on("connection", (ws) => {
    wsClients.push(ws);
    ws.on("close", () => {
      const index = wsClients.indexOf(ws);
      if (index !== -1) {
        wsClients.splice(index, 1);
      }
    });
  });

  console.log(`WebSocket server listening on port ${wsPort}`);
  return wsClients;
}

export function broadcastClients(clients) {
  const now = Date.now();
  const clientList = clients.map((client) => ({
    address: client.address,
    status: now - client.lastActivity < 65000 ? "Active" : "Offline",
  }));
  const data = JSON.stringify(clientList);
  wsClients.forEach((ws) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(data);
    }
  });
}

export function broadcastTaskUpdate(id, ip, task, status, output) {
  const updatedTask = JSON.stringify({
    id,
    ip,
    task,
    status,
    output,
  });

  wsClients.forEach((ws) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(updatedTask);
    }
  });
}
