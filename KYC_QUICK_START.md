# KYC Quick Start Guide

## What Was Built

A complete KYC (Know Your Customer) verification flow with:
- ✅ Frontend form for ID upload (front/back) and selfie
- ✅ Backend API integration (`/api/kyc/initiate` and `/api/kyc/status`)
- ✅ Real-time status polling (5-second intervals)
- ✅ Dashboard unlock after KYC approval
- ✅ localStorage persistence
- ✅ Full error handling and validation

## File Structure

```
Aframp/
├── types/kyc.ts                              # Type definitions
├── contexts/kyc-context.tsx                  # Global KYC state
├── hooks/
│   ├── use-kyc-form.ts                      # Form state management
│   └── use-kyc-status-polling.ts            # Status polling hook
├── components/kyc/
│   ├── id-upload.tsx                        # ID document upload
│   ├── selfie-upload.tsx                    # Selfie capture/upload
│   ├── kyc-form.tsx                         # Main form component
│   ├── kyc-status.tsx                       # Status display
│   ├── kyc-modal.tsx                        # Modal wrapper
│   └── kyc-dashboard-guard.tsx              # Dashboard protection
├── app/
│   ├── api/kyc/
│   │   ├── initiate/route.ts               # Submit KYC
│   │   └── status/[submissionId]/route.ts  # Check status
│   ├── kyc/page.tsx                        # KYC page
│   └── layout.tsx                          # Updated with KycProvider
└── KYC_IMPLEMENTATION.md                    # Full documentation
```

## How to Use

### 1. Access KYC Page
```
Navigate to: /kyc
```

### 2. Complete Verification
- Upload ID front (drag-drop or select)
- Upload ID back (drag-drop or select)
- Take selfie (camera or upload)
- Review documents
- Submit

### 3. Status Polling
- Automatically polls every 5 seconds
- Shows "Verification in Progress"
- Simulated verification: 5-15 seconds
- 85% approval rate

### 4. Dashboard Access
- After approval, dashboard unlocks
- KYC status persisted in localStorage
- User can access all features

## API Endpoints

### POST /api/kyc/initiate
Submit KYC documents

**Request:**
```bash
curl -X POST http://localhost:3000/api/kyc/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "idFront": "base64_string",
    "idBack": "base64_string",
    "selfie": "base64_string"
  }'
```

**Response:**
```json
{
  "submissionId": "kyc_1234567890_abc123",
  "status": "pending",
  "expiresAt": 1735689600000
}
```

### GET /api/kyc/status/[submissionId]
Check verification status

**Request:**
```bash
curl http://localhost:3000/api/kyc/status/kyc_1234567890_abc123
```

**Response:**
```json
{
  "submissionId": "kyc_1234567890_abc123",
  "status": "approved",
  "step": "review",
  "expiresAt": 1735689600000
}
```

## Component Usage

### Basic Usage
```typescript
import { KycForm } from '@/components/kyc/kyc-form'

export function MyPage() {
  return (
    <KycForm
      onComplete={() => {
        console.log('KYC complete!')
      }}
    />
  )
}
```

### With Modal
```typescript
import { KycModal } from '@/components/kyc/kyc-modal'
import { useState } from 'react'

export function MyComponent() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button onClick={() => setOpen(true)}>
        Start KYC
      </button>
      <KycModal open={open} onOpenChange={setOpen} />
    </>
  )
}
```

### Dashboard Protection
```typescript
import { KycDashboardGuard } from '@/components/kyc/kyc-dashboard-guard'

export function Dashboard() {
  return (
    <KycDashboardGuard>
      <div>Protected dashboard content</div>
    </KycDashboardGuard>
  )
}
```

### Check KYC Status
```typescript
import { useKyc } from '@/contexts/kyc-context'

export function MyComponent() {
  const { kycStatus, isVerified, submissionId } = useKyc()

  return (
    <div>
      Status: {kycStatus}
      Verified: {isVerified ? 'Yes' : 'No'}
      Submission: {submissionId}
    </div>
  )
}
```

## Testing

### Manual Test Flow
1. Go to `/kyc`
2. Upload ID front image
3. Upload ID back image
4. Take selfie or upload photo
5. Review documents
6. Click "Submit KYC"
7. Wait for verification (5-15 seconds)
8. See approval/rejection
9. Go to `/dashboard` - should be unlocked

### Test Files
Use any JPEG/PNG/WebP images:
- ID images: 1280x720 or larger
- Selfie: 640x480 or larger
- Max 5MB each

### Simulated Verification
- Approval: 85% chance
- Rejection: 15% chance
- Delay: 5-15 seconds

## localStorage Keys

```typescript
// KYC status
localStorage.getItem('kyc:status')
// Returns: 'pending' | 'approved' | 'rejected' | 'expired' | null

// Submission ID
localStorage.getItem('kyc:submissionId')
// Returns: 'kyc_1234567890_abc123' | null
```

## Customization

### Change Polling Interval
```typescript
// In useKycStatusPolling hook
const { checkStatus } = useKycStatusPolling({
  submissionId,
  pollInterval: 10000, // 10 seconds instead of 5
})
```

### Change Approval Rate
```typescript
// In app/api/kyc/initiate/route.ts
const shouldApprove = Math.random() > 0.30 // 70% instead of 85%
```

### Change Verification Delay
```typescript
// In app/api/kyc/initiate/route.ts
const delay = 10000 + Math.random() * 20000 // 10-30 seconds
```

### Customize UI
All components use Tailwind CSS and Radix UI. Modify:
- Colors: Update `bg-blue-600`, `text-green-600`, etc.
- Spacing: Update `p-4`, `gap-3`, etc.
- Animations: Update Framer Motion props

## Production Checklist

- [ ] Replace in-memory store with database
- [ ] Implement real KYC provider (Onfido, IDology, etc.)
- [ ] Add encryption for image transmission
- [ ] Implement proper authentication
- [ ] Add rate limiting per user
- [ ] Add audit logging
- [ ] Implement webhook notifications
- [ ] Add GDPR data deletion
- [ ] Set up monitoring/alerts
- [ ] Test with real documents
- [ ] Security audit
- [ ] Load testing

## Troubleshooting

### Camera Not Working
- Check browser permissions
- Verify HTTPS (required for camera)
- Try different browser
- Fall back to file upload

### Status Not Updating
- Check network tab for API calls
- Verify submissionId in localStorage
- Check browser console for errors
- Refresh page

### Images Not Uploading
- Check file size (max 5MB)
- Verify file format (JPEG/PNG/WebP)
- Check network connection
- Try different file

### Dashboard Not Unlocking
- Check localStorage for kyc:status
- Verify KycProvider in layout
- Check browser console
- Clear localStorage and retry

## Support

For detailed documentation, see: `KYC_IMPLEMENTATION.md`

For issues:
1. Check browser console for errors
2. Check network tab for API responses
3. Verify localStorage state
4. Check file formats and sizes
5. Test in different browser
