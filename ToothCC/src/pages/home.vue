<template>
  <v-container class="text-center py-10">
    <v-row justify="center">
      <v-col cols="12" md="8">
        <h1 class="display-1 font-weight-bold">TOOTHPICK COMMAND & CONTROL</h1>
        <p class="subtitle-1">
          A powerful command and control system for red team operations,
          designed for stealth, speed, and efficiency.
        </p>
      </v-col>
    </v-row>
    <v-row justify="center" class="mt-5">
      <v-col cols="12" md="4">
        <v-card
          class="pa-5 elevation-3"
          style="border-radius: 15px; transition: transform 0.3s"
        >
          <v-card-title>
            <v-icon left>mdi-cog</v-icon>
            Stealth Mode
          </v-card-title>
          <v-card-text>
            Toothpick is fully undetectable (FUD) and supersmall (<5kb),
            allowing it to slip past defenses undetected.
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="4">
        <v-card
          class="pa-5 elevation-3"
          style="border-radius: 15px; transition: transform 0.3s"
        >
          <v-card-title>
            <v-icon left>mdi-speedometer</v-icon>
            Optimized Performance
          </v-card-title>
          <v-card-text>
            The project is optimized for speed, ensuring rapid execution of
            commands and operations in a live environment.
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="4">
        <v-card
          class="pa-5 elevation-3"
          style="border-radius: 15px; transition: transform 0.3s"
        >
          <v-card-title>
            <v-icon left>mdi-shield-check</v-icon>
            Persistent and Fileless
          </v-card-title>
          <v-card-text>
            Toothpick is persistent and fileless, making it difficult to detect
            and remove, maintaining control in hostile environments.
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
    <v-row justify="center" class="mt-5">
      <v-col cols="12" md="8">
        <v-btn
          color="dark"
          href="https://github.com/syrex1013/ToothPick"
          target="_blank"
          class="mx-2"
        >
          <v-icon left>mdi-star</v-icon>
          Star on GitHub
        </v-btn>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup></script>
