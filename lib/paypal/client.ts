import { getPaypalSettingsForServer } from "@/lib/admin/integration-settings-server";

type PayPalEnv = "sandbox" | "live";

export function getPaypalEnv(): PayPalEnv {
  return process.env.PAYPAL_ENVIRONMENT === "live" ? "live" : "sandbox";
}

function baseUrl(env: PayPalEnv) {
  return env === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

async function getAccessToken(env: PayPalEnv): Promise<string> {
  const settings = await getPaypalSettingsForServer();
  const clientId = env === "live" ? settings.liveClientId : settings.sandboxClientId;
  const secret = env === "live" ? settings.liveSecret : settings.sandboxSecret;

  if (!clientId || !secret) {
    throw new Error("PayPal credentials not configured. Set them in Super Admin › Integrations.");
  }

  const resp = await fetch(`${baseUrl(env)}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString("base64")}`,
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });

  const data = (await resp.json()) as { access_token?: string; error_description?: string };
  if (!resp.ok) throw new Error(data.error_description ?? "Failed to obtain PayPal access token.");
  return data.access_token!;
}

export async function getPublicPaypalClientId(): Promise<{ clientId: string; environment: PayPalEnv }> {
  const settings = await getPaypalSettingsForServer();
  const env = getPaypalEnv();
  const clientId = env === "live" ? settings.liveClientId : settings.sandboxClientId;
  return { clientId, environment: env };
}

export async function createPaypalOrder(amountUsd: string): Promise<{ orderId: string }> {
  const env = getPaypalEnv();
  const token = await getAccessToken(env);

  const resp = await fetch(`${baseUrl(env)}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "PayPal-Request-Id": `act-${Date.now()}`,
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: { currency_code: "USD", value: amountUsd },
          description: "Arizona Christian Tuition STO donation",
        },
      ],
    }),
    cache: "no-store",
  });

  const data = (await resp.json()) as { id?: string; message?: string };
  if (!resp.ok) throw new Error(data.message ?? "Failed to create PayPal order.");
  return { orderId: data.id! };
}

/** Who paid, as PayPal reports it on the captured order. */
export type PaypalPayer = {
  email: string | null;
  givenName: string | null;
  surname: string | null;
};

export async function capturePaypalOrder(orderId: string): Promise<{
  captureId: string;
  status: string;
  amountUsd: string;
  payer: PaypalPayer;
}> {
  const env = getPaypalEnv();
  const token = await getAccessToken(env);

  const resp = await fetch(`${baseUrl(env)}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      // Full order body, so the payer comes back with the capture.
      Prefer: "return=representation",
    },
    cache: "no-store",
  });

  const data = (await resp.json()) as {
    status?: string;
    message?: string;
    payer?: { email_address?: string; name?: { given_name?: string; surname?: string } };
    purchase_units?: Array<{
      payments?: {
        captures?: Array<{ id: string; amount?: { value: string } }>;
      };
    }>;
  };

  if (!resp.ok) throw new Error(data.message ?? "Failed to capture PayPal order.");

  const capture = data.purchase_units?.[0]?.payments?.captures?.[0];
  return {
    captureId: capture?.id ?? "",
    status: data.status ?? "",
    amountUsd: capture?.amount?.value ?? "0.00",
    payer: {
      email: data.payer?.email_address?.trim().toLowerCase() || null,
      givenName: data.payer?.name?.given_name?.trim() || null,
      surname: data.payer?.name?.surname?.trim() || null,
    },
  };
}

export async function verifyPaypalWebhook(opts: {
  webhookId: string;
  transmissionId: string;
  transmissionTime: string;
  certUrl: string;
  transmissionSig: string;
  authAlgo: string;
  body: string;
}): Promise<boolean> {
  const env = getPaypalEnv();
  const token = await getAccessToken(env);

  const resp = await fetch(`${baseUrl(env)}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      transmission_id: opts.transmissionId,
      transmission_time: opts.transmissionTime,
      cert_url: opts.certUrl,
      auth_algo: opts.authAlgo,
      transmission_sig: opts.transmissionSig,
      webhook_id: opts.webhookId,
      webhook_event: JSON.parse(opts.body),
    }),
    cache: "no-store",
  });

  const data = (await resp.json()) as { verification_status?: string };
  return data.verification_status === "SUCCESS";
}
