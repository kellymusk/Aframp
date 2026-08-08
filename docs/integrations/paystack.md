# Paystack Integration & Webhook Guide

This guide covers setting up Paystack payments, configuring webhooks in the Paystack Dashboard, verifying HMAC signatures, and testing webhooks locally.

---

## 1. Prerequisites & Credentials

Obtain your API keys from the [Paystack Dashboard](https://dashboard.paystack.com/#/settings/developer):

- `PAYSTACK_SECRET_KEY`: Secret key starting with `sk_test_` (sandbox) or `sk_live_` (production).
- `PAYSTACK_PUBLIC_KEY`: Public key starting with `pk_test_` or `pk_live_`.

Add these to your `.env.local` file:

```env
PAYSTACK_SECRET_KEY=<YOUR_PAYSTACK_SECRET_KEY>
PAYSTACK_PUBLIC_KEY=<YOUR_PAYSTACK_PUBLIC_KEY>
```

---

## 2. Configuring Webhooks in Paystack Dashboard

1. Log into your **Paystack Dashboard**.
2. Navigate to **Settings** > **API Keys & Webhooks**.
3. Under **Webhook URL**, enter your endpoint:
   - Production: `https://yourdomain.com/api/paystack/webhook`
   - Local Development: `https://<your-ngrok-subdomain>.ngrok-free.app/api/paystack/webhook`
4. Click **Save Changes**.

---

## 3. Webhook HMAC Signature Verification

Paystack signs all webhook events using SHA-512 HMAC with your `PAYSTACK_SECRET_KEY` in the `x-paystack-signature` HTTP header.

### HMAC Verification Code Pattern (`crypto` module)

```typescript
import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const signature = req.headers.get('x-paystack-signature');
  const rawBody = await req.text();

  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  // Calculate HMAC SHA-512 digest
  const hash = crypto
    .createHmac('sha512', secret)
    .update(rawBody)
    .digest('hex');

  // Verify signature matching
  if (hash !== signature) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const event = JSON.parse(rawBody);

  // Handle event
  switch (event.event) {
    case 'charge.success':
      // Payment received for onramp flow
      const { reference, amount, customer } = event.data;
      console.log(`Payment successful for ref ${reference}: ${amount / 100} NGN`);
      break;

    case 'transfer.success':
      // Offramp transfer payout complete
      console.log(`Transfer payout complete: ${event.data.transfer_code}`);
      break;

    case 'transfer.failed':
      // Offramp transfer payout failed
      console.log(`Transfer failed: ${event.data.transfer_code}`);
      break;

    default:
      console.log(`Unhandled event type: ${event.event}`);
  }

  return NextResponse.json({ status: 'success' });
}
```

---

## 4. Expected Webhook Event Payload Structure

### `charge.success` Event Payload

```json
{
  "event": "charge.success",
  "data": {
    "id": 3007093570,
    "domain": "test",
    "status": "success",
    "reference": "aframp_onramp_ref_982341",
    "amount": 500000,
    "currency": "NGN",
    "channel": "card",
    "paid_at": "2026-07-29T08:00:00.000Z",
    "customer": {
      "id": 123456,
      "email": "user@example.com",
      "customer_code": "CUS_xxxxxx"
    },
    "metadata": {
      "orderId": "ord_12345678",
      "walletAddress": "G...STELLAR_ADDRESS"
    }
  }
}
```

---

## 5. Local Webhook Testing Guide

### Option A: Using ngrok

1. Start your local Next.js server:
   ```bash
   npm run dev
   ```
2. Start ngrok tunnel on port 3000:
   ```bash
   ngrok http 3000
   ```
3. Copy the HTTPS URL provided by ngrok (e.g. `https://a1b2c3d4.ngrok-free.app`).
4. Update the **Webhook URL** in the Paystack Dashboard to:
   `https://a1b2c3d4.ngrok-free.app/api/paystack/webhook`

### Option B: Triggering via `curl`

To simulate a `charge.success` event locally with a custom HMAC header:

```bash
# Calculate HMAC using node
PAYSTACK_SECRET="YOUR_PAYSTACK_SECRET_KEY"
PAYLOAD='{"event":"charge.success","data":{"reference":"aframp_test_ref","amount":500000,"currency":"NGN"}}'
SIGNATURE=$(node -e "console.log(require('crypto').createHmac('sha512', process.env.PAYSTACK_SECRET).update(process.env.PAYLOAD).digest('hex'))")

# Send request to local endpoint
curl -X POST http://localhost:3000/api/paystack/webhook \
  -H "Content-Type: application/json" \
  -H "x-paystack-signature: $SIGNATURE" \
  -d "$PAYLOAD"
```
