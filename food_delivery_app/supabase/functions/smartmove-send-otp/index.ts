import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js";

const WEBEX_API_KEY = Deno.env.get("TEXTLOCAL_API_KEY") || "";
const WEBEX_SENDER = Deno.env.get("WEBEX_SENDER") || "SmartMove";

Deno.serve(async (req: Request) => {
  try {
    const { phone } = await req.json();
    if (!phone) {
      return new Response(JSON.stringify({ error: "Phone required" }), { status: 400 });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await supabase.from("otps").insert({
      phone,
      otp,
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    });

    if (!WEBEX_API_KEY) {
      console.log(`[NO API KEY] OTP for ${phone}: ${otp}`);
      return new Response(
        JSON.stringify({ success: true, sandbox: true, message: "OTP logged (no API key configured)" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    const body = {
      from: WEBEX_SENDER,
      message_body: `Your SmartMove verification code is: ${otp}`,
      to: [{ phone: [phone] }],
    };

    const response = await fetch("https://api.webexinteract.com/v1/sms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": WEBEX_API_KEY,
      },
      body: JSON.stringify(body),
    });

    const result = await response.json();
    console.log("Webex Interact response:", JSON.stringify(result));

    if (response.ok) {
      return new Response(
        JSON.stringify({ success: true, recipient: phone }),
        { headers: { "Content-Type": "application/json" } }
      );
    } else {
      const errMsg = result.errors?.[0]?.message || "Send failed";
      throw new Error(errMsg);
    }
  } catch (error) {
    console.error("Error sending OTP:", error);
    return new Response(
      JSON.stringify({ error: "Failed to send OTP" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
