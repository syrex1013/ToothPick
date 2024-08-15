import net from "net";
import readline from "readline";
import chalk from "chalk";

let clients = [];
let currentClient = null;
const verbose = process.argv.includes("-v");

const server = net.createServer((socket) => {
  socket.id = clients.length + 1;
  clients.push(socket);

  if (verbose) {
    console.log(chalk.green(`Client ${socket.id} connected`));
  }

  socket.on("end", () => {
    if (verbose) {
      console.log(chalk.red(`Client ${socket.id} disconnected`));
    }
    clients = clients.filter((client) => client.id !== socket.id);
    if (currentClient === socket) {
      currentClient = null;
    }
  });

  socket.on("data", (data) => {
    if (data.toString().trim() !== "ping") {
      console.log(
        chalk.yellow(`Client ${socket.id} says: ${data.toString().trim()}`)
      );
    }
  });

  socket.on("error", (err) => {
    console.log(chalk.red(`Error with Client ${socket.id}: ${err.message}`));
    clients = clients.filter((client) => client.id !== socket.id);
    if (currentClient === socket) {
      currentClient = null;
    }
  });
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "> ",
});

rl.on("line", (line) => {
  const input = line.trim();

  if (input === "list") {
    console.log(chalk.blue("Connected Clients:"));
    clients.forEach((client) => {
      console.log(
        chalk.blue(
          `Client ${client.id} - ${client.remoteAddress}:${client.remotePort}`
        )
      );
    });
  } else if (input.startsWith("select")) {
    const clientId = parseInt(input.split(" ")[1], 10);
    currentClient = clients.find((client) => client.id === clientId);

    if (currentClient) {
      console.log(chalk.green(`Selected Client ${currentClient.id}`));
    } else {
      console.log(chalk.red(`Client ${clientId} not found`));
    }
  } else if (input.startsWith("send")) {
    if (currentClient) {
      const command = input.substring(5);
      currentClient.write(command + "\n");
      console.log(
        chalk.green(`Sent to Client ${currentClient.id}: ${command}`)
      );
    } else {
      console.log(chalk.red("No client selected"));
    }
  } else if (input === "clear") {
    console.clear();
  } else if (input === "exit") {
    console.log(chalk.yellow("Exiting..."));
    rl.close();
    process.exit(0);
  } else {
    console.log(chalk.cyan("Commands:"));
    console.log(chalk.cyan("list         - List all connected clients"));
    console.log(chalk.cyan("select <id>  - Select a client by ID"));
    console.log(
      chalk.cyan("send <cmd>   - Send a command to the selected client")
    );
    console.log(chalk.cyan("clear        - Clear the terminal screen"));
    console.log(chalk.cyan("exit         - Exit the server"));
  }

  rl.prompt();
});

server.listen(8080, () => {
  console.log(chalk.green("Server listening on port 8080"));
  rl.prompt();
});
