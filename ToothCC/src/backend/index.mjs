import express from "express";
import net from "net";
import cors from "cors";
import * as db from "./database.mjs";
import {
  startWebSocketServer,
  broadcastClients,
  broadcastTaskUpdate,
} from "./websocketServer.mjs";

const apiPort = 8000;
const app = express();

app.use(cors());
app.use(express.json());

let currentServer = null;
const clients = [];

db.initializeDatabase();
startWebSocketServer();

app.get("/api/v1/tasks", async (_req, res) => {
  const rows = await db.getAllTasks();
  res.json(rows);
});

app.get("/api/v1/tasks/:id", async (req, res) => {
  const { id } = req.params;
  const task = await db.getTaskById(id);
  if (task) {
    res.json(task);
  } else {
    res.status(404).json({ error: "Task not found" });
  }
});

app.post("/api/v1/tasks", async (req, res) => {
  const { ip, task, status } = req.body;
  await db.createTask(ip, task, status);
  res.status(201).json({ message: "Task added successfully" });
});

app.delete("/api/v1/tasks/:id", async (req, res) => {
  const { id } = req.params;
  await db.deleteTaskById(id);
  res.status(200).json({ message: "Task deleted successfully" });
});

app.get("/api/v1/clients", async (_req, res) => {
  const rows = await db.getClients();
  const now = Date.now();
  const clientList = rows.map((client) => ({
    address: client.address,
    status: now - client.lastActivity < 65000 ? "Active" : "Offline",
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
    await db.updateTaskOutput(output, "Completed", address, command);
    res.json({ output });
  } catch (error) {
    console.error("Error sending command to client:", error);
    res.status(500).json({ error: "Failed to send command" });
  }
});

async function sendPendingTasks(client) {
  const pendingTasks = await db.getPendingTasksForIP(client.address);
  console.log("Sending pending tasks to client:", pendingTasks);
  console.log("Client address:", client.address);
  for (const task of pendingTasks) {
    try {
      const output = await sendCommandToClient(client, task);
      await db.updateTaskOutputById(output, "Completed", task.id);
    } catch (error) {
      console.error("Failed to send pending task:", error);
      await db.updateTaskStatusById("Failed", task.id);
    }
  }
}

function sendCommandToClient(client, task) {
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
            await db.updateTaskOutputById(
              jsonResponse.message,
              "Completed",
              task.id
            );

            // Broadcast the updated task to all WebSocket clients
            broadcastTaskUpdate(
              task.id,
              client.address,
              task.task,
              "Completed",
              jsonResponse.message
            );

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

    client.socket.write(task.task + "\n", (err) => {
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

async function updateClientModeInDatabase(client, mode) {
  await db.updateClientMode(client.address, mode);
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
    broadcastClients(clients);
    db.saveClientToDatabase(client);
    sendPendingTasks(client); // Send any pending tasks to the client

    socket.on("data", (data) => {
      console.log("Received data:", data.toString());
      client.lastActivity = Date.now();
      try {
        data = data.toString().trim();
        data = JSON.parse(data);
        if (data.message == "ping") {
          const mode = data.mode;
          updateClientModeInDatabase(client, mode);
        }
      } catch (error) {
        console.error("Failed to parse JSON data:", error);
        return;
      }
      db.updateClientActivity(client);
      broadcastClients(clients);
    });

    socket.on("end", () => {
      console.log("Client disconnected:", clientAddress);
      const index = clients.indexOf(client);
      if (index !== -1) {
        clients.splice(index, 1);
      }
      broadcastClients(clients);
    });

    socket.on("error", (err) => {
      console.error("Socket error:", err);
      const index = clients.indexOf(client);
      if (index !== -1) {
        clients.splice(index, 1);
      }
      broadcastClients(clients);
    });
  });

  currentServer.listen(port, async () => {
    console.log(`TCP server listening on port ${port}`);
    await db.saveListener(port);
    res.json({ message: `TCP server started on port ${port}` });
  });

  currentServer.on("error", (err) => {
    console.error("Server error:", err);
    res.status(500).json({ error: "Failed to start TCP server" });
  });
}

app.listen(apiPort, () => {
  console.log("API server listening on port", apiPort);
});
