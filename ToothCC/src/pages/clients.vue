<template>
  <v-container>
    <v-card>
      <v-card-title>Client Data</v-card-title>
      <v-card-text>
        <v-data-table
          :headers="headers"
          :items="clients"
          class="elevation-1"
          item-value="address"
          v-model:single-select="selectedClient"
        >
          <template v-slot:item.status="{ item }">
            <v-chip :color="getStatusColor(item.status)" dark>{{
              item.status
            }}</v-chip>
          </template>
          <template v-slot:item="{ item, select }">
            <tr>
              <td>
                <v-checkbox
                  :input-value="selectedClient === item.address"
                  @click="toggleSelect(item.address)"
                ></v-checkbox>
              </td>
              <td>{{ item.id }}</td>
              <td>{{ item.address }}</td>
              <td>
                <v-chip :color="getStatusColor(item.status)" dark>{{
                  item.status
                }}</v-chip>
              </td>
              <td>{{ item.task }}</td>
            </tr>
          </template>
        </v-data-table>
        <v-form @submit.prevent="sendCommand">
          <v-text-field
            v-model="command"
            label="Command"
            :disabled="!selectedClient || waitingForResponse"
          ></v-text-field>
          <v-btn type="submit" :disabled="!selectedClient || waitingForResponse"
            >Send Command</v-btn
          >
        </v-form>
        <v-card v-if="output">
          <v-card-title>Output</v-card-title>
          <v-card-text>{{ output }}</v-card-text>
        </v-card>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import axios from "axios";

const headers = [
  { title: "Select", value: "select" },
  { title: "ID", value: "id" },
  { title: "IP", value: "address" },
  { title: "Status", value: "status" },
  { title: "Task", value: "task" },
];

const clients = ref([]);
const selectedClient = ref(null);
const command = ref("");
const output = ref("");
const waitingForResponse = ref(false);

function getStatusColor(status) {
  switch (status) {
    case "Active":
      return "green";
    case "Offline":
      return "red";
    case "Executing task...":
      return "orange";
    default:
      return "grey";
  }
}

function toggleSelect(address) {
  if (selectedClient.value === address) {
    selectedClient.value = null;
  } else {
    selectedClient.value = address;
  }
}

function sendCommand() {
  if (!selectedClient.value || !command.value) return;

  const client = clients.value.find(
    (client) => client.address === selectedClient.value
  );
  if (client) {
    client.status = "Executing task...";
  }

  waitingForResponse.value = true;

  axios
    .post("http://localhost:8000/api/v1/sendCommand", {
      address: selectedClient.value,
      command: command.value,
    })
    .then((response) => {
      output.value = response.data.output;
      if (client) {
        client.status = "Active"; // or any other status based on the response
      }
    })
    .catch((error) => {
      console.error("Error sending command:", error);
      if (client) {
        client.status = "Active"; // or handle the error status
      }
    })
    .finally(() => {
      waitingForResponse.value = false;
    });
}

let ws;
onMounted(() => {
  // Fetch the current client list
  axios
    .get("http://localhost:8000/api/v1/clients")
    .then((response) => {
      clients.value = response.data.map((client, index) => ({
        id: index + 1,
        address: client.address,
        status: client.status,
        task: `Task ${index + 1}`, // Example task, you can modify as needed
        waitingForOutput: false,
      }));
    })
    .catch((error) => {
      console.error("Error fetching clients:", error);
    });

  // Set up WebSocket connection
  ws = new WebSocket("ws://localhost:80");
  ws.onmessage = (event) => {
    clients.value = JSON.parse(event.data).map((client, index) => ({
      id: index + 1,
      address: client.address,
      status: client.status,
      task: `Task ${index + 1}`, // Example task, you can modify as needed
      waitingForOutput: false,
    }));
  };
  ws.onclose = () => {
    console.log("WebSocket connection closed");
  };
});
onUnmounted(() => {
  if (ws) {
    ws.close();
  }
});
</script>

<style scoped>
.v-card {
  margin-top: 20px;
}
</style>
