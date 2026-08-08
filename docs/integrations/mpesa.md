# M-Pesa Daraja Integration & Local Testing Guide

This guide details configuring Safaricom M-Pesa Daraja STK Push (Lipa Na M-Pesa Online), setting up sandbox/production environments, testing callbacks locally via ngrok, and testing endpoints with `curl`.

---

## 1. Obtaining M-Pesa Credentials

1. Register or log in to the [Safaricom Developer Portal (Daraja)](https://developer.safaricom.co.ke/).
2. Navigate to **My Apps** and create a new sandbox app with **Lipa Na M-Pesa Online API** enabled.
3. Copy the following credentials generated for your app:
   - **Consumer Key**: API Key for OAuth authentication.
   - **Consumer Secret**: API Secret for OAuth authentication.
   - **Business Shortcode**: Test shortcode (typically `174379` for sandbox).
   - **Passkey**: Lipa Na M-Pesa Online passkey (found in the Daraja documentation / Sandbox portal).

---

## 2. Environment Variables Configuration

Add the following variables to your `.env.local` file:

```env
# Sandbox vs Production: 'sandbox' or 'production'
MPESA_ENVIRONMENT=sandbox

MPESA_CONSUMER_KEY=your_daraja_consumer_key
MPESA_CONSUMER_SECRET=your_daraja_consumer_secret
MPESA_SHORTCODE=174379
MPESA_PASSKEY=bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919
MPESA_CALLBACK_URL=https://<your-ngrok-subdomain>.ngrok-free.app/api/payments/mpesa/callback
```

---

## 3. Switching Between Sandbox and Production

The system dynamically selects the API base URL based on `MPESA_ENVIRONMENT`:

| Environment | Base URL | Shortcode Type |
|---|---|---|
| **Sandbox** | `https://sandbox.safaricom.co.ke` | Paybill `174379` (Default Test) |
| **Production** | `https://api.safaricom.co.ke` | Live Business Paybill / Till Number |

To switch to production:
1. Go to Daraja Portal and apply for **Go Live**.
2. Complete verification and obtain your production credentials.
3. Update `MPESA_ENVIRONMENT=production` and replace keys with live values.

---

## 4. Local Callback Setup with ngrok

M-Pesa requires a publicly accessible HTTPS callback URL to deliver STK Push transaction statuses.

1. Start your local dev server:
   ```bash
   npm run dev
   ```
2. Open an ngrok tunnel on port 3000:
   ```bash
   ngrok http 3000
   ```
3. Copy the ngrok HTTPS forwarding URL (e.g., `https://c4b3a210.ngrok-free.app`).
4. Update `MPESA_CALLBACK_URL` in `.env.local`:
   ```env
   MPESA_CALLBACK_URL=https://c4b3a210.ngrok-free.app/api/payments/mpesa/callback
   ```

---

## 5. Testing STK Push via `curl`

To trigger an STK Push payment prompt to a test phone number (e.g. `254700000000`):

```bash
curl -X POST http://localhost:3000/api/payments/mpesa/stkpush \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "254700000000",
    "amount": 100,
    "accountReference": "AFRAMP-ONRAMP",
    "transactionDesc": "Aframp Crypto Onramp Deposit"
  }'
```

### Expected STK Push Response

```json
{
  "MerchantRequestID": "29115-34620561-1",
  "CheckoutRequestID": "ws_CO_29072026081512345678",
  "ResponseCode": "0",
  "ResponseDescription": "Success. Request accepted for processing",
  "CustomerMessage": "Success. Request accepted for processing"
}
```

### Expected Callback Payload from Safaricom

When the user enters their M-Pesa PIN on their phone, Safaricom sends a POST request to your `MPESA_CALLBACK_URL`:

```json
{
  "Body": {
    "stkCallback": {
      "MerchantRequestID": "29115-34620561-1",
      "CheckoutRequestID": "ws_CO_29072026081512345678",
      "ResultCode": 0,
      "ResultDesc": "The service request is processed successfully.",
      "CallbackMetadata": {
        "Item": [
          { "Name": "Amount", "Value": 100 },
          { "Name": "MpesaReceiptNumber", "Value": "QHK789XYZ" },
          { "Name": "TransactionDate", "Value": 20260729081530 },
          { "Name": "PhoneNumber", "Value": 254700000000 }
        ]
      }
    }
  }
}
```
