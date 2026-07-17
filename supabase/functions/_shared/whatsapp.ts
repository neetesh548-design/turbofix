// WhatsApp Cloud API client for Supabase Edge Functions
// Uses environment variables for configuration

const getConfig = () => {
  const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN") ?? "";
  const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") ?? "";
  const apiVersion = Deno.env.get("WHATSAPP_API_VERSION") ?? "v20.0";
  return { accessToken, phoneNumberId, apiVersion };
};

/**
 * Returns true if both WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID are set.
 */
export function isConfigured(): boolean {
  const token = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
  const phoneId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
  return !!token && !!phoneId;
}

/**
 * Downloads media from the WhatsApp Cloud API.
 * First retrieves the media URL, then downloads the binary content.
 */
export async function downloadMedia(mediaId: string): Promise<Uint8Array> {
  const { accessToken, apiVersion } = getConfig();

  // Step 1: Get the media URL
  const metadataUrl = `https://graph.facebook.com/${apiVersion}/${mediaId}`;
  const metadataRes = await fetch(metadataUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!metadataRes.ok) {
    const errorBody = await metadataRes.text();
    console.error(
      `WhatsApp API error fetching media metadata: ${metadataRes.status}`,
      errorBody,
    );
    throw new Error(
      `Failed to get media URL: ${metadataRes.status} ${errorBody}`,
    );
  }

  const metadata = await metadataRes.json();
  const mediaUrl: string = metadata.url;

  if (!mediaUrl) {
    console.error("WhatsApp API returned no media URL", metadata);
    throw new Error("No media URL returned from WhatsApp API");
  }

  // Step 2: Download the actual media binary
  const mediaRes = await fetch(mediaUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!mediaRes.ok) {
    const errorBody = await mediaRes.text();
    console.error(
      `WhatsApp API error downloading media: ${mediaRes.status}`,
      errorBody,
    );
    throw new Error(
      `Failed to download media: ${mediaRes.status} ${errorBody}`,
    );
  }

  const arrayBuffer = await mediaRes.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

/**
 * Sends a text message via the WhatsApp Cloud API.
 * The `to` param should be digits only (e.g., "919876543210"), no "+" prefix.
 */
export async function sendTextMessage(
  to: string,
  body: string,
): Promise<void> {
  const { accessToken, phoneNumberId, apiVersion } = getConfig();

  const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.error(
      `WhatsApp API error sending text message: ${res.status}`,
      errorBody,
    );
    throw new Error(
      `Failed to send text message: ${res.status} ${errorBody}`,
    );
  }
}

/**
 * Sends a template message via the WhatsApp Cloud API.
 * The `to` param should be digits only (e.g., "919876543210"), no "+" prefix.
 */
export async function sendTemplateMessage(
  to: string,
  templateName: string,
  languageCode: string,
  params: string[],
): Promise<void> {
  const { accessToken, phoneNumberId, apiVersion } = getConfig();

  const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
      components: [
        {
          type: "body",
          parameters: params.map((p) => ({ type: "text", text: p })),
        },
      ],
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.error(
      `WhatsApp API error sending template message: ${res.status}`,
      errorBody,
    );
    throw new Error(
      `Failed to send template message: ${res.status} ${errorBody}`,
    );
  }
}
