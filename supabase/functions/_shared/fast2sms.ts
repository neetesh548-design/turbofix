// Fast2SMS API client for Supabase Edge Functions
// https://docs.fast2sms.com/reference/authorization

export function isConfigured(): boolean {
  const apiKey = Deno.env.get("FAST2SMS_API_KEY");
  return !!apiKey && apiKey.trim().length > 0;
}

/**
 * Sends an SMS message via Fast2SMS API using authorization header.
 * @param phone 10-digit mobile number or format with country code
 * @param message Text message content
 * @param otp Optional 6-digit OTP code if using route "otp"
 */
export async function sendSmsMessage(
  phone: string,
  message: string,
  otp?: string,
): Promise<void> {
  const apiKey = Deno.env.get("FAST2SMS_API_KEY") ?? "";
  const route = (Deno.env.get("FAST2SMS_ROUTE") ?? "otp").toLowerCase();

  if (!apiKey) {
    console.log("Fast2SMS API key not set, skipping SMS send.");
    return;
  }

  let phoneClean = phone.replace(/\D/g, "");
  if (phoneClean.length > 10 && phoneClean.startsWith("91")) {
    phoneClean = phoneClean.slice(2);
  }

  if (phoneClean.length !== 10) {
    throw new Error(`Invalid phone number for Fast2SMS: ${phone}`);
  }

  const url = "https://www.fast2sms.com/dev/bulkV2";

  let payload: Record<string, unknown>;

  if (route === "otp" && otp) {
    payload = {
      route: "otp",
      variables_values: otp,
      numbers: phoneClean,
    };
  } else {
    payload = {
      route: "q",
      message,
      language: "english",
      flash: 0,
      numbers: phoneClean,
    };
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "authorization": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.error(`Fast2SMS API error: ${res.status}`, errorBody);
    throw new Error(`Failed to send SMS via Fast2SMS: ${res.status} ${errorBody}`);
  }
}
