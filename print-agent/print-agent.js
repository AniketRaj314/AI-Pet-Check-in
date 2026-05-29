#!/usr/bin/env node

// Print agent — runs on the Pi, listens for check-in events via SSE,
// and prints a name label on the TSC printer via TSPL commands.

const fs = require("fs");
const http = require("http");
const https = require("https");

// --- Config ---
const SERVER_URL = process.env.SERVER_URL || "http://localhost:3000";
const PRINTER_DEV = process.env.PRINTER_DEV || "/dev/usb/lp0";
const LABEL_WIDTH = 70;  // mm
const LABEL_HEIGHT = 20; // mm
const GAP = 3;           // mm

// --- TSPL label printing ---
function printLabel(guestName, checkinNumber) {
  const nameText = guestName.toUpperCase();

  // 8 dots/mm → 70mm = 560 dots, 20mm = 160 dots
  const centerX = Math.round((LABEL_WIDTH * 8) / 2); // 280
  const centerY = Math.round((LABEL_HEIGHT * 8) / 2); // 80

  const tspl = [
    `SIZE ${LABEL_WIDTH} mm, ${LABEL_HEIGHT} mm`,
    `GAP ${GAP} mm, 0 mm`,
    "DIRECTION 1",
    "CLS",
    `TEXT ${centerX},${centerY},"5",0,1,1,2,"${nameText}"`,
    "PRINT 1",
    "",
  ].join("\n");

  try {
    fs.writeFileSync(PRINTER_DEV, tspl);
    console.log(`[PRINT] ${nameText} (check-in #${checkinNumber})`);
  } catch (err) {
    console.error(`[PRINT ERROR] ${err.message}`);
  }
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

      // SSE messages are delimited by double newlines
      const parts = buffer.split("\n\n");
      buffer = parts.pop(); // keep incomplete chunk

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
            printLabel(payload.guest_name, payload.total);
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
console.log("=== Luma Check-in Print Agent ===");
console.log(`Printer: ${PRINTER_DEV}`);
console.log(`Server:  ${SERVER_URL}`);
console.log("");

// Verify printer is accessible
try {
  fs.accessSync(PRINTER_DEV, fs.constants.W_OK);
  console.log("[OK] Printer device writable");
} catch {
  console.error(`[WARN] Cannot write to ${PRINTER_DEV} — check permissions (sudo usermod -a -G lp pi)`);
}

connectSSE();
