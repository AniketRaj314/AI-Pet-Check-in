const LUMA_BASE = "https://public-api.luma.com/v1";

function headers() {
  return {
    Authorization: `Bearer ${process.env.LUMA_API_KEY}`,
    "Content-Type": "application/json",
  };
}

export interface LumaGuest {
  id: string;
  user_name: string | null;
  user_first_name: string | null;
  user_last_name: string | null;
  user_email: string;
  approval_status: string;
  checked_in_at: string | null;
  event_tickets: Array<{ checked_in_at: string | null }>;
}

export async function lookupGuestByProxyKey(
  eventId: string,
  proxyKey: string
): Promise<LumaGuest> {
  const url = new URL(`${LUMA_BASE}/event/get-guest`);
  url.searchParams.set("event_id", eventId);
  url.searchParams.set("proxy_key", proxyKey);

  const res = await fetch(url.toString(), { headers: headers() });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Luma API error ${res.status}: ${body}`);
  }
  const data = await res.json();
  return data.guest;
}

export async function lookupGuestById(
  eventId: string,
  guestId: string
): Promise<LumaGuest> {
  const url = new URL(`${LUMA_BASE}/event/get-guest`);
  url.searchParams.set("event_id", eventId);
  url.searchParams.set("id", guestId);

  const res = await fetch(url.toString(), { headers: headers() });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Luma API error ${res.status}: ${body}`);
  }
  const data = await res.json();
  return data.guest;
}

export function extractProxyKey(qrData: string): string | null {
  try {
    const url = new URL(qrData);
    return url.searchParams.get("pk");
  } catch {
    // Not a URL — might be a raw ID or key
    return null;
  }
}

export function guestDisplayName(guest: LumaGuest): string {
  if (guest.user_name) return guest.user_name;
  const parts = [guest.user_first_name, guest.user_last_name].filter(Boolean);
  if (parts.length) return parts.join(" ");
  return guest.user_email;
}
