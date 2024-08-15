import express from "express";
import net from "net";
import cors from "cors";
import { WebSocketServer } from "ws";
import sqlite3 from "sqlite3";
import { open } from "sqlite";

const port = 8000;
const app = express();

app.use(cors());
app.use(express.json());

let currentServer = null;
const clients = [];
const wsClients = [];

// Initialize SQLite database
const dbPromise = open({
  filename: "./clients.db",
  driver: sqlite3.Database,
});

async function initializeDatabase() {
  const db = await dbPromise;
  await db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      address TEXT,
      lastActivity INTEGER
    )
  `);
}

initializeDatabase();

const wss = new WebSocketServer({ port: 8080 });

wss.on("connection", (ws) => {
  wsClients.push(ws);
  ws.on("close", () => {
    const index = wsClients.indexOf(ws);
    if (index !== -1) {
      wsClients.splice(index, 1);
    }
  });
});

app.get("/api/v1/hello", (_req, res) => {
  res.json({ message: "Hello, world!" });
});

app.get("/api/v1/clients", async (_req, res) => {
  const db = await dbPromise;
  const rows = await db.all("SELECT address, lastActivity FROM clients");
  const now = Date.now();
  const clientList = rows.map((client) => ({
    address: client.address,
    status: now - client.lastActivity < 30000 ? "Active" : "Offline", // 30 seconds threshold
  }));
  res.json(clientList);
});

app.post("/api/v1/updatePort", (req, res) => {
  const newPort = req.body.port;
  if (!newPort) {
    return res.status(400).json({ error: "Invalid port number" });
  }

  if (currentServer) {
    closeServerAndClients(() => {
      startNewServer(newPort, res);
    });
  } else {
    startNewServer(newPort, res);
  }
});

app.post("/api/v1/sendCommand", (req, res) => {
  const { address, command } = req.body;
  const client = clients.find((c) => c.address === address);
  if (!client) {
    return res.status(404).json({ error: "Client not found" });
  }

  sendCommandToClient(client, command)
    .then((output) => {
      res.json({ output });
    })
    .catch((error) => {
      console.error("Error sending command to client:", error);
      res.status(500).json({ error: "Failed to send command" });
    });
});

function sendCommandToClient(client, command) {
  return new Promise((resolve, reject) => {
    let response = "";

    client.socket.on("data", (data) => {
      response += data.toString();

      if (response.endsWith("\n")) {
        const trimmedResponse = response.trim();

        if (trimmedResponse === "ping") {
          response = "";
        } else {
          resolve(trimmedResponse);
        }
      }
    });

    client.socket.on("error", (err) => {
      reject(err);
    });

    client.socket.write(command + "\n", (err) => {
      if (err) {
        reject(err);
      }
    });
  });
}

function closeServerAndClients(callback) {
  clients.forEach((client) => {
    client.socket.end();
  });
  clients.length = 0;

  if (currentServer) {
    currentServer.close((err) => {
      if (err) {
        console.error("Error closing existing server:", err);
        return;
      }
      console.log("Existing server closed");
      callback();
    });
  } else {
    callback();
  }
}

async function startNewServer(port, res) {
  currentServer = net.createServer((socket) => {
    let clientIP = socket.remoteAddress;
    const clientPort = socket.remotePort;

    // Remove the ::ffff: prefix if it exists
    if (clientIP.startsWith("::ffff:")) {
      clientIP = clientIP.replace("::ffff:", "");
    }

    const clientAddress = `${clientIP}:${clientPort}`;

    let client = clients.find((c) => c.address.startsWith(clientIP));
    if (client) {
      client.address = clientAddress;
      client.lastActivity = Date.now();
    } else {
      client = { address: clientAddress, lastActivity: Date.now(), socket };
      clients.push(client);
    }

    console.log("Client connected:", clientAddress);
    broadcastClients();
    saveClientToDatabase(client);

    socket.on("data", (data) => {
      console.log("Received data:", data.toString());
      client.lastActivity = Date.now();
      updateClientActivityInDatabase(client);
      broadcastClients();
    });

    socket.on("end", () => {
      console.log("Client disconnected:", clientAddress);
      const index = clients.indexOf(client);
      if (index !== -1) {
        clients.splice(index, 1);
      }
      broadcastClients();
    });

    socket.on("error", (err) => {
      console.error("Socket error:", err);
      const index = clients.indexOf(client);
      if (index !== -1) {
        clients.splice(index, 1);
      }
      broadcastClients();
    });
  });

  currentServer.listen(port, () => {
    console.log(`TCP server listening on port ${port}`);
    res.json({ message: `TCP server started on port ${port}` });
  });

  currentServer.on("error", (err) => {
    console.error("Server error:", err);
    res.status(500).json({ error: "Failed to start TCP server" });
  });
}

async function saveClientToDatabase(client) {
  const db = await dbPromise;
  await db.run(
    "INSERT INTO clients (address, lastActivity) VALUES (?, ?)",
    client.address,
    client.lastActivity
  );
}

async function updateClientActivityInDatabase(client) {
  const db = await dbPromise;
  await db.run(
    "UPDATE clients SET lastActivity = ? WHERE address = ?",
    client.lastActivity,
    client.address
  );
}

function broadcastClients() {
  const now = Date.now();
  const clientList = clients.map((client) => ({
    address: client.address,
    status: now - client.lastActivity < 60000 ? "Active" : "Offline", // 60 seconds threshold
  }));
  const data = JSON.stringify(clientList);
  wsClients.forEach((ws) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(data);
    }
  });
}

app.listen(port, () => {
  console.log("HTTP server listening on port", port);
});
