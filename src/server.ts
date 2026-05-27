import "dotenv/config";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { cors } from "hono/cors";
import {
  lookupGuestByProxyKey,
  lookupGuestById,
  extractProxyKey,
  guestDisplayName,
} from "./luma.js";
import { insertCheckin, findCheckin, countCheckins, recentCheckins } from "./db.js";

const app = new Hono();
app.use("*", cors());

const EVENT_ID = process.env.LUMA_EVENT_ID || "";

app.post("/api/check-in", async (c) => {
  const { qr_data } = await c.req.json<{ qr_data: string }>();

  if (!qr_data) {
    return c.json({ ok: false, error: "No QR data provided" }, 400);
  }

  if (!EVENT_ID) {
    return c.json({ ok: false, error: "LUMA_EVENT_ID not configured" }, 500);
  }

  try {
    // Try to extract proxy_key from URL-style QR
    const pk = extractProxyKey(qr_data);

    let guest;
    if (pk) {
      guest = await lookupGuestByProxyKey(EVENT_ID, pk);
    } else {
      // Treat raw QR data as a guest ID or ticket key
      guest = await lookupGuestById(EVENT_ID, qr_data.trim());
    }

    if (!guest) {
      return c.json({ ok: false, error: "Guest not found" }, 404);
    }

    if (guest.approval_status !== "approved") {
      return c.json({
        ok: false,
        error: `Registration status: ${guest.approval_status}`,
        guest_name: guestDisplayName(guest),
      }, 403);
    }

    // Check if already checked in locally
    const existing = findCheckin.get({ guest_id: guest.id });
    if (existing) {
      return c.json({
        ok: false,
        error: "Already checked in",
        guest_name: guestDisplayName(guest),
        already_checked_in: true,
      }, 409);
    }

    // Record check-in
    insertCheckin.run({
      guest_id: guest.id,
      guest_name: guestDisplayName(guest),
      guest_email: guest.user_email,
    });

    const stats = countCheckins.get() as { count: number };

    return c.json({
      ok: true,
      guest_name: guestDisplayName(guest),
      total_checkins: stats.count,
    });
  } catch (err: any) {
    console.error("Check-in error:", err.message);
    const msg = err.message?.includes("404")
      ? "Guest not found — is this a valid Luma ticket?"
      : err.message?.includes("401")
        ? "API authentication failed"
        : "Something went wrong — please try again";
    return c.json({ ok: false, error: msg }, 500);
  }
});

app.get("/api/stats", (c) => {
  const stats = countCheckins.get() as { count: number };
  const recent = recentCheckins.all();
  return c.json({ total: stats.count, recent });
});

app.get("/*", serveStatic({ root: "./public" }));

const port = parseInt(process.env.PORT || "3000");
console.log(`Check-in kiosk running → http://localhost:${port}`);
serve({ fetch: app.fetch, port });
