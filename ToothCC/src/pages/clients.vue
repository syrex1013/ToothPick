<template>
  <v-container>
    <v-card>
      <v-card-title>Client Data</v-card-title>
      <v-alert
        v-if="alertMessage"
        :type="alertType"
        dismissible
        @input="alertMessage = ''"
      >
        {{ alertMessage }}
      </v-alert>
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
          <template v-slot:item="{ item }">
            <tr>
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
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import axios from "axios";

const headers = [
  { title: "ID", value: "id" },
  { title: "IP", value: "address" },
  { title: "Status", value: "status" },
  { title: "Task", value: "task" },
];

const clients = ref([]);
const selectedClient = ref(null);
const alertMessage = ref("");
const alertType = ref("success");

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
      alertMessage.value = "Error fetching clients: " + error.message;
      alertType.value = "error";
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
