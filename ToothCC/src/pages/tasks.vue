<template>
  <v-container>
    <v-card>
      <v-card-title>Previous Tasks</v-card-title>
      <v-card-text>
        <v-data-table :headers="headers" :items="tasks" class="elevation-1">
          <template v-slot:item.status="{ item }">
            <v-chip :color="getStatusColor(item.status)" dark>
              {{ item.status }}
            </v-chip>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>

    <v-card class="mt-5">
      <v-card-title>Send New Task</v-card-title>
      <v-card-text>
        <v-form @submit.prevent="sendTask">
          <v-select
            v-model="selectedClient"
            :items="clients"
            item-text="address"
            item-value="address"
            label="Select Client"
            required
          ></v-select>
          <v-text-field
            v-model="newTask.task"
            label="Task"
            required
          ></v-text-field>
          <v-btn type="submit" color="primary">Send</v-btn>
        </v-form>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from "vue";
import axios from "axios";

const headers = [
  { title: "ID", value: "id" },
  { title: "IP", value: "ip" },
  { title: "Task Status", value: "status" },
  { title: "Task data", value: "task" },
];

const tasks = ref([
  { id: 1, ip: "192.168.1.1", status: "Active", task: "Task 1" },
  { id: 2, ip: "192.168.1.2", status: "Inactive", task: "Task 2" },
  { id: 3, ip: "192.168.1.3", status: "Active", task: "Task 3" },
  { id: 4, ip: "192.168.1.4", status: "Pending", task: "Task 4" },
]);

const newTask = ref({
  task: "",
});

const clients = ref([]);
const selectedClient = ref(null);

onMounted(() => {
  axios
    .get("http://localhost:8000/api/v1/clients")
    // .then((response) => {
    //   clients.value = response.data.map(
    //     (client, index) => `Client ${index} - ${client.address}`
    //   );
    .then((response) => {
      clients.value = response.data.map((client, index) => client.address);
    })
    .catch((error) => {
      console.error("Error fetching clients:", error);
    });
});

function getStatusColor(status) {
  switch (status) {
    case "Active":
      return "green";
    case "Inactive":
      return "red";
    case "Pending":
      return "orange";
    default:
      return "grey";
  }
}

function sendTask() {
  if (selectedClient.value && newTask.value.task) {
    // Add the new task to the tasks array
    tasks.value.push({
      id: tasks.value.length + 1,
      ip: selectedClient.value,
      status: "Pending",
      task: newTask.value.task,
    });

    // Send message (task) to client
    axios.post("http://localhost:8000/api/v1/sendCommand", {
      address: selectedClient.value,
      command: newTask.value.task,
    });
    // Clear the form
    selectedClient.value = null;
    newTask.value.task = "";
  }
}
</script>

<style scoped>
.v-card {
  margin-top: 20px;
}
</style>
