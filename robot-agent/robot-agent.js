#!/usr/bin/env node

// Robot agent — runs on the laptop with the DOBOT controller.
// Listens for check-in events via SSE and triggers the robot arm
// via the DOBOT controller's HTTP API.

const http = require("http");
const https = require("https");

// --- Config ---
const SERVER_URL = process.env.SERVER_URL || "http://localhost:3000";
const ROBOT_URL = process.env.ROBOT_URL || "http://192.168.0.69:9015";

// --- Trigger robot via HTTP ---
function triggerRobot(guestName) {
  const url = `${ROBOT_URL}/checkin/yes`;

  http.get(url, (res) => {
    let body = "";
    res.on("data", (chunk) => (body += chunk));
    res.on("end", () => {
      console.log(`[ROBOT] Triggered for ${guestName} → ${res.statusCode} ${body.trim()}`);
    });
  }).on("error", (err) => {
    console.error(`[ROBOT ERROR] ${err.message}`);
  });
}

// --- SSE listener ---
function connectSSE() {
  const url = `${SERVER_URL}/api/checkin-stream`;
  const client = url.startsWith("https") ? https : http;

  console.log(`[SSE] Connecting to ${url} ...`);

  client.get(url, (res) => {
    if (res.statusCode !== 200) {
      console.error(`[SSE] Server returned ${res.statusCode}, retrying in 5s...`);
      setTimeout(connectSSE, 5000);
      return;
    }

    console.log("[SSE] Connected — waiting for check-ins");

    let buffer = "";

    res.on("data", (chunk) => {
      buffer += chunk.toString();

      const parts = buffer.split("\n\n");
      buffer = parts.pop();

      for (const part of parts) {
        const lines = part.split("\n");
        let event = "";
        let data = "";

        for (const line of lines) {
          if (line.startsWith("event:")) event = line.slice(6).trim();
          if (line.startsWith("data:")) data = line.slice(5).trim();
        }

        if (event === "checkin" && data) {
          try {
            const payload = JSON.parse(data);
            console.log(`[SSE] Check-in: ${payload.guest_name} (#${payload.total})`);
            triggerRobot(payload.guest_name);
          } catch (err) {
            console.error("[SSE] Bad payload:", data);
          }
        }
      }
    });

    res.on("end", () => {
      console.log("[SSE] Connection closed, reconnecting in 3s...");
      setTimeout(connectSSE, 3000);
    });

    res.on("error", (err) => {
      console.error(`[SSE] Error: ${err.message}, reconnecting in 5s...`);
      setTimeout(connectSSE, 5000);
    });
  }).on("error", (err) => {
    console.error(`[SSE] Connection failed: ${err.message}, retrying in 5s...`);
    setTimeout(connectSSE, 5000);
  });
}

// --- Boot ---
console.log("=== DOBOT Check-in Robot Agent ===");
console.log(`Server: ${SERVER_URL}`);
console.log(`Robot:  ${ROBOT_URL}`);
console.log("");

connectSSE();
