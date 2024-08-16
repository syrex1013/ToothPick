import express from "express";
import net from "net";
import cors from "cors";
import { WebSocketServer } from "ws";
import sqlite3 from "sqlite3";
import { open } from "sqlite";

const apiPort = 8000;
const wsPort = 80;
const app = express();

app.use(cors());
app.use(express.json());

let currentServer = null;
const clients = [];
const wsClients = [];

// Initialize SQLite database
const dbPromise = open({
  filename: "./toothpick.db",
  driver: sqlite3.Database,
});

async function initializeDatabase() {
  const db = await dbPromise;
  await db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      address TEXT,
      port INTEGER, 
      lastActivity INTEGER
    )
  `);
  await db.exec(`
    CREATE TABLE IF NOT EXISTS listeners (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      port INTEGER
    )
  `);
  await db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ip TEXT,
      task TEXT,
      status TEXT,
      output TEXT
    )
  `);
}

initializeDatabase();

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

app.get("/api/v1/tasks", async (_req, res) => {
  const db = await dbPromise;
  const rows = await db.all("SELECT * FROM tasks");
  res.json(rows);
});

app.get("/api/v1/tasks/:id", async (req, res) => {
  const { id } = req.params;
  const db = await dbPromise;
  const task = await db.get("SELECT * FROM tasks WHERE id = ?", id);
  if (task) {
    res.json(task);
  } else {
    res.status(404).json({ error: "Task not found" });
  }
});

app.post("/api/v1/tasks", async (req, res) => {
  const { ip, task, status } = req.body;
  const db = await dbPromise;
  await db.run(
    "INSERT INTO tasks (ip, task, status) VALUES (?, ?, ?)",
    ip,
    task,
    status
  );
  res.status(201).json({ message: "Task added successfully" });
});

app.delete("/api/v1/tasks/:id", async (req, res) => {
  const { id } = req.params;
  const db = await dbPromise;
  await db.run("DELETE FROM tasks WHERE id = ?", id);
  res.status(200).json({ message: "Task deleted successfully" });
});

app.get("/api/v1/clients", async (_req, res) => {
  const db = await dbPromise;
  const rows = await db.all("SELECT address, lastActivity FROM clients");
  const now = Date.now();
  const clientList = rows.map((client) => ({
    address: client.address,
    status: now - client.lastActivity < 65000 ? "Active" : "Offline", // 65 seconds threshold
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

app.post("/api/v1/sendCommand", async (req, res) => {
  const { address, command } = req.body;
  const client = clients.find((c) => c.address === address);
  if (!client) {
    return res.status(404).json({ error: "Client not found" });
  }

  try {
    const output = await sendCommandToClient(client, command);
    console.log("Output received, updating database...");

    const db = await dbPromise;
    const result = await db.run(
      "UPDATE tasks SET output = ?, status = ? WHERE ip = ? AND task = ?",
      output,
      "Completed",
      address,
      command
    );

    if (result.changes > 0) {
      console.log("Database updated successfully.");
    } else {
      console.error("Failed to update the database.");
    }

    res.json({ output });
  } catch (error) {
    console.error("Error sending command to client:", error);
    res.status(500).json({ error: "Failed to send command" });
  }
});

async function sendPendingTasks(client) {
  const db = await dbPromise;
  const pendingTasks = await db.all(
    "SELECT * FROM tasks WHERE ip = ? AND status = 'Pending'",
    client.address
  );

  for (const task of pendingTasks) {
    try {
      const output = await sendCommandToClient(client, task.task);
      const result = await db.run(
        "UPDATE tasks SET output = ?, status = ? WHERE id = ?",
        output,
        "Completed",
        task.id
      );

      if (result.changes > 0) {
        console.log(`Task ${task.id} updated with output.`);
      } else {
        console.error(`Failed to update task ${task.id}.`);
      }
    } catch (error) {
      console.error("Failed to send pending task:", error);
      await db.run(
        "UPDATE tasks SET status = ? WHERE id = ?",
        "Failed",
        task.id
      );
    }
  }
}

function sendCommandToClient(client, command) {
  return new Promise((resolve, reject) => {
    let response = "";

    client.socket.on("data", async (data) => {
      response += data.toString();

      if (response.endsWith("\n")) {
        const trimmedResponse = response.trim();
        try {
          const jsonResponse = JSON.parse(trimmedResponse);

          if (jsonResponse.message === "ping") {
            response = "";
          } else {
            console.log("Received output from client:", jsonResponse.message); // Log the received output

            // Update the database
            const db = await dbPromise;
            const result = await db.run(
              "UPDATE tasks SET output = ?, status = ? WHERE ip = ? AND task = ?",
              jsonResponse.message,
              "Completed",
              client.address,
              command
            );

            if (result.changes > 0) {
              console.log("Database updated successfully.");

              // Broadcast the updated task to all WebSocket clients
              broadcastTaskUpdate(
                client.address,
                command,
                "Completed",
                jsonResponse.message
              );
            } else {
              console.error("Failed to update the database.");
            }

            resolve(jsonResponse.message);
          }
        } catch (error) {
          console.error("Failed to parse JSON response:", error);
          reject("Invalid JSON response");
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

    if (clientIP.startsWith("::ffff:")) {
      clientIP = clientIP.replace("::ffff:", "");
    }

    const clientAddress = `${clientIP}:${clientPort}`;

    let client = clients.find((c) => c.address.startsWith(clientIP));
    if (client) {
      client.address = clientIP;
      client.port = clientPort;
      client.lastActivity = Date.now();
    } else {
      client = {
        address: clientIP,
        port: clientPort,
        lastActivity: Date.now(),
        socket,
      };
      clients.push(client);
    }

    console.log("Client connected:", clientAddress);
    broadcastClients();
    saveClientToDatabase(client);
    sendPendingTasks(client); // Send any pending tasks to the client

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

  currentServer.listen(port, async () => {
    console.log(`TCP server listening on port ${port}`);
    await saveListenerToDatabase(port);
    res.json({ message: `TCP server started on port ${port}` });
  });

  currentServer.on("error", (err) => {
    console.error("Server error:", err);
    res.status(500).json({ error: "Failed to start TCP server" });
  });
}

async function saveClientToDatabase(client) {
  const db = await dbPromise;
  const existingClient = await db.get(
    "SELECT id FROM clients WHERE address = ?",
    client.address
  );

  if (existingClient) {
    await db.run(
      "UPDATE clients SET port = ?, lastActivity = ? WHERE address = ?",
      client.port,
      client.lastActivity,
      client.address
    );
  } else {
    await db.run(
      "INSERT INTO clients (address, port, lastActivity) VALUES (?, ?, ?)",
      client.address,
      client.port,
      client.lastActivity
    );
  }
}

async function saveListenerToDatabase(port) {
  const db = await dbPromise;
  await db.run("INSERT INTO listeners (port) VALUES (?)", port);
}

async function updateClientActivityInDatabase(client) {
  const db = await dbPromise;
  await db.run(
    "UPDATE clients SET lastActivity = ?, port = ? WHERE address = ?",
    client.lastActivity,
    client.port,
    client.address
  );
}

function broadcastClients() {
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
function broadcastTaskUpdate(ip, task, status, output) {
  const updatedTask = JSON.stringify({
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

app.listen(apiPort, () => {
  console.log("API server listening on port", apiPort);
  console.log("WebSocket server listening on port", wsPort);
});
