import express from "express";
import net from "net";
import cors from "cors";
import { WebSocketServer } from "ws";

const port = 8000;
const app = express();

app.use(cors());
app.use(express.json());

let currentServer = null;
const clients = [];
const wsClients = [];

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

app.get("/api/v1/clients", (_req, res) => {
  const now = Date.now();
  const clientList = clients.map((client) => ({
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

  // Assuming you have a way to send the command to the client and get the output
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

    // Listen for data from the client
    client.socket.on("data", (data) => {
      response += data.toString();

      // Assuming the response ends with a newline character
      if (response.endsWith("\n")) {
        const trimmedResponse = response.trim();

        // Check if the response is "ping"
        if (trimmedResponse === "ping") {
          response = ""; // Reset the response and wait for the next one
        } else {
          resolve(trimmedResponse);
        }
      }
    });

    // Handle socket errors
    client.socket.on("error", (err) => {
      reject(err);
    });

    // Send the command to the client
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

function startNewServer(port, res) {
  currentServer = net.createServer((socket) => {
    const clientIP = socket.remoteAddress;
    const clientPort = socket.remotePort;
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

    socket.on("data", (data) => {
      console.log("Received data:", data.toString());
      client.lastActivity = Date.now();
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
