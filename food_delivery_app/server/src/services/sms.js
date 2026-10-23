/**
 * SMS gateway dispatch for OTP delivery — server/src/services/sms.js
 *
 * Configured via env (see .env.example):
 *   SMS_PROVIDER      'africastalking' | 'twilio' | unset (dev mode)
 *   AT_USERNAME       Africa's Talking username (use 'sandbox' for testing)
 *   AT_API_KEY        Africa's Talking API key
 *   AT_SENDER_ID      optional approved alphanumeric sender ID
 *   TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM  Twilio credentials
 *
 * When no provider is configured the code stays in the local server log and
 * the dev response (see routes/otp.js) so phone login remains testable.
 */
'use strict';

function configured() {
    const provider = (process.env.SMS_PROVIDER || '').toLowerCase();
    if (provider === 'africastalking') {
        return process.env.AT_API_KEY && process.env.AT_USERNAME ? 'africastalking' : null;
    }
    if (provider === 'twilio') {
        return process.env.TWILIO_ACCOUNT_SID &&
            process.env.TWILIO_AUTH_TOKEN &&
            process.env.TWILIO_FROM
            ? 'twilio'
            : null;
    }
    return null;
}

async function sendAfricasTalking(phone, message) {
    const body = new URLSearchParams({
        username: process.env.AT_USERNAME,
        to: phone,
        message,
    });
    if (process.env.AT_SENDER_ID) body.set('from', process.env.AT_SENDER_ID);
    const res = await fetch('https://api.africastalking.com/version1/messaging', {
        method: 'POST',
        headers: {
            apiKey: process.env.AT_API_KEY,
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
        },
        body,
    });
    if (!res.ok) {
        throw new Error(`Africa's Talking HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    }
    const data = await res.json();
    const status =
        data &&
        data.SMSMessageData &&
        data.SMSMessageData.Recipients &&
        data.SMSMessageData.Recipients[0] &&
        data.SMSMessageData.Recipients[0].status;
    if (status && !/success/i.test(status)) {
        throw new Error(`Africa's Talking recipient status: ${status}`);
    }
}

async function sendTwilio(phone, message) {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const auth = Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: 'POST',
        headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            To: phone,
            From: process.env.TWILIO_FROM,
            Body: message,
        }),
    });
    if (!res.ok) {
        throw new Error(`Twilio HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    }
}

/** Resolves when delivery was at least accepted by the gateway; throws otherwise. */
async function sendSms(phone, code) {
    const provider = configured();
    if (!provider) {
        console.log(
            `[OTP] SMS to ${phone}: code ${code} (dev delivery — no SMS gateway configured)`
        );
        return { sent: false, provider: null };
    }
    const message = `Your SmartSoko verification code is ${code}. It expires in 5 minutes.`;
    if (provider === 'africastalking') await sendAfricasTalking(phone, message);
    else await sendTwilio(phone, message);
    return { sent: true, provider };
}

module.exports = { sendSms, configured };
