<template>
  <v-app-bar app>
    <v-app-bar-nav-icon @click="toggleDrawer" />
    <v-toolbar-title>TOOTHPICK Admin</v-toolbar-title>
  </v-app-bar>

  <v-navigation-drawer app fixed v-model="drawer" class="pa-4">
    <v-list>
      <v-list-item
        link
        @click="navigateTo('home')"
        :class="{ 'v-list-item--active': currentView === 'home' }"
      >
        <v-list-item-title>Home</v-list-item-title>
      </v-list-item>
      <v-list-item
        link
        @click="navigateTo('Tasks')"
        :class="{ 'v-list-item--active': currentView === 'tasks' }"
      >
        <v-list-item-title>Tasks</v-list-item-title>
      </v-list-item>
      <v-list-item
        link
        @click="navigateTo('settings')"
        :class="{ 'v-list-item--active': currentView === 'settings' }"
      >
        <v-list-item-title>Settings</v-list-item-title>
      </v-list-item>
    </v-list>
  </v-navigation-drawer>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";

const drawer = ref(true);
const router = useRouter();
const currentView = ref("");

function navigateTo(view) {
  currentView.value = view;
  router.push(`/${view}`);
}

function toggleDrawer() {
  drawer.value = !drawer.value;
}
</script>

<style scoped>
.v-list-item--active {
  background-color: #007bff;
  color: white;
}
</style>
