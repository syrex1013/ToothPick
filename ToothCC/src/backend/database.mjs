import sqlite3 from "sqlite3";
import { open } from "sqlite";

const dbPromise = open({
  filename: "./toothpick.db",
  driver: sqlite3.Database,
});

export async function initializeDatabase() {
  const db = await dbPromise;
  await db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      address TEXT,
      port INTEGER, 
      lastActivity INTEGER,
      mode INTEGER
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

export async function getAllTasks() {
  const db = await dbPromise;
  return db.all("SELECT * FROM tasks");
}

export async function getTaskById(id) {
  const db = await dbPromise;
  return db.get("SELECT * FROM tasks WHERE id = ?", id);
}

export async function createTask(ip, task, status) {
  const db = await dbPromise;
  return db.run(
    "INSERT INTO tasks (ip, task, status) VALUES (?, ?, ?)",
    ip,
    task,
    status
  );
}

export async function deleteTaskById(id) {
  const db = await dbPromise;
  return db.run("DELETE FROM tasks WHERE id = ?", id);
}

export async function getPendingTasksForIP(ip) {
  const db = await dbPromise;
  return db.all("SELECT * FROM tasks WHERE ip = ? AND status = 'Pending'", ip);
}

export async function updateTaskOutput(output, status, ip, task) {
  const db = await dbPromise;
  return db.run(
    "UPDATE tasks SET output = ?, status = ? WHERE ip = ? AND task = ?",
    output,
    status,
    ip,
    task
  );
}
export async function updateTaskOutputById(output, status, id) {
  const db = await dbPromise;
  return db.run(
    "UPDATE tasks SET output = ?, status = ? WHERE id = ?",
    output,
    status,
    id
  );
}

export async function updateTaskStatusById(status, id) {
  const db = await dbPromise;
  return db.run("UPDATE tasks SET status = ? WHERE id = ?", status, id);
}
export async function getClients() {
  const db = await dbPromise;
  return db.all("SELECT address, lastActivity FROM clients");
}
export async function updateClientMode(address, mode) {
  const db = await dbPromise;
  return db.run("UPDATE clients SET mode = ? WHERE address = ?", mode, address);
}

export async function saveClientToDatabase(client) {
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

export async function updateClientActivity(client) {
  const db = await dbPromise;
  await db.run(
    "UPDATE clients SET lastActivity = ?, port = ? WHERE address = ?",
    client.lastActivity,
    client.port,
    client.address
  );
}

export async function saveListener(port) {
  const db = await dbPromise;
  await db.run("INSERT INTO listeners (port) VALUES (?)", port);
}
