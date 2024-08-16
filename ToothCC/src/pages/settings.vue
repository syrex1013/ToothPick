<template>
  <v-container>
    <v-card>
      <v-card-title>Settings</v-card-title>
      <v-alert
        v-if="alertMessage"
        :type="alertType"
        dismissible
        @input="alertMessage = ''"
      >
        {{ alertMessage }}
      </v-alert>
      <v-card-text>
        <v-form @submit.prevent="saveSettings">
          <v-text-field
            v-model="listeningPort"
            label="Listening Port"
            type="number"
            required
          ></v-text-field>
          <v-btn type="submit" color="primary">Save</v-btn>
        </v-form>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import axios from "axios";
import { store } from "../store";

const listeningPort = ref("");
const router = useRouter();
const alertMessage = ref("");
const alertType = ref("success");

function saveSettings() {
  if (listeningPort.value) {
    startListening(listeningPort.value);
  }
}

function startListening(port) {
  axios
    .post("http://localhost:8000/api/v1/updatePort", { port })
    .then((response) => {
      alertMessage.value = `Server started on port ${port}`;
      alertType.value = "success";
      store.currentPort = port; // Update the global state
    })
    .catch((error) => {
      alertMessage.value = "Error starting server: " + error.message;
      alertType.value = "error";
    });
}
</script>

<style scoped>
.v-card {
  margin-top: 20px;
}
</style>
