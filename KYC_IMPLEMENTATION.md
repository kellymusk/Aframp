# KYC (Know Your Customer) Implementation Guide

## Overview

This document describes the complete KYC verification flow implemented in Aframp. The system allows users to submit identity documents (ID front/back + selfie) for verification, with real-time status polling and dashboard integration.

## Architecture

### Components

#### Backend API Routes

**`/api/kyc/initiate` (POST)**
- Accepts base64-encoded images (ID front, ID back, selfie)
- Validates file sizes and formats
- Creates a KYC submission record
- Returns `submissionId` for tracking
- Simulates async verification (5-15 seconds)
- Status: 202 (Accepted) for async processing

**`/api/kyc/status/[submissionId]` (GET)**
- Polls current verification status
- Returns: `pending`, `approved`, `rejected`, or `expired`
- Checks expiration (30 days)
- Includes verification notes if rejected

### Frontend Components

**`KycForm`** (`components/kyc/kyc-form.tsx`)
- Main form component with step-based UI
- Steps: ID Upload → Selfie → Review → Submitted
- Manages form state and submission
- Integrates status polling

**`IdUpload`** (`components/kyc/id-upload.tsx`)
- Drag-and-drop file upload for ID documents
- Supports JPEG, PNG, WebP
- Max 5MB per file
- Shows preview with clear button

**`SelfieUpload`** (`components/kyc/selfie-upload.tsx`)
- Camera capture or file upload
- Real-time camera access with fallback
- Captures frame and converts to file
- Error handling for camera access

**`KycStatusDisplay`** (`components/kyc/kyc-status.tsx`)
- Shows verification status with icons
- Displays verification notes
- Polling indicator for pending status
- Step indicator for form progress

**`KycDashboardGuard`** (`components/kyc/kyc-dashboard-guard.tsx`)
- Wraps dashboard content
- Enforces KYC verification requirement
- Shows modal if not verified
- Displays status badge in header

**`KycModal`** (`components/kyc/kyc-modal.tsx`)
- Dialog wrapper for KYC form
- Triggered when verification required

### Hooks

**`useKycForm`** (`hooks/use-kyc-form.ts`)
- Manages form state (images, submission ID, errors)
- File validation (type, size)
- Base64 encoding
- API submission
- Reset functionality

**`useKycStatusPolling`** (`hooks/use-kyc-status-polling.ts`)
- Polls status every 5 seconds (configurable)
- Stops on terminal state (approved/rejected/expired)
- Triggers callbacks on status change
- Integrates with KYC context

### Context

**`KycProvider`** (`contexts/kyc-context.tsx`)
- Global KYC state management
- Persists to localStorage
- Provides: `kycStatus`, `submissionId`, `isVerified`
- Methods: `setSubmissionId`, `updateKycStatus`, `clearKyc`

### Types

**`types/kyc.ts`**
```typescript
type KycStatus = 'pending' | 'approved' | 'rejected' | 'expired'
type KycSubmissionStep = 'id_upload' | 'selfie_upload' | 'review' | 'submitted'

interface KycSubmission {
  id: string
  userId: string
  status: KycStatus
  step: KycSubmissionStep
  documents: KycDocument[]
  createdAt: number
  updatedAt: number
  expiresAt: number
  verificationNotes?: string
}
```

## User Flow

### 1. Dashboard Access
```
User visits /dashboard
  ↓
KycDashboardGuard checks kycStatus
  ↓
If not verified → Show KycModal
  ↓
User completes KYC → Dashboard unlocked
```

### 2. KYC Submission
```
Step 1: ID Upload
  - Upload ID front (drag-drop or select)
  - Upload ID back (drag-drop or select)
  - Click "Next"

Step 2: Selfie
  - Take selfie (camera) or upload photo
  - Click "Next"

Step 3: Review
  - Review all 3 images
  - Click "Submit KYC"

Step 4: Verification
  - Status polling begins (5s interval)
  - Shows "Verification in Progress"
  - Simulated verification: 5-15 seconds
  - 85% approval rate
```

### 3. Status Outcomes
```
Approved (85% chance)
  ↓
Dashboard unlocked
User can access all features

Rejected (15% chance)
  ↓
Show error message
User can resubmit

Expired (after 30 days)
  ↓
Show expiration message
User must resubmit
```

## Integration Points

### Dashboard Integration
```typescript
// In dashboard-page-client.tsx
<KycDashboardGuard>
  <DashboardContent />
</KycDashboardGuard>
```

### Layout Integration
```typescript
// In app/layout.tsx
<KycProvider>
  {children}
</KycProvider>
```

### Usage in Components
```typescript
import { useKyc } from '@/contexts/kyc-context'

function MyComponent() {
  const { kycStatus, isVerified } = useKyc()
  
  if (!isVerified) {
    return <div>Please complete KYC</div>
  }
  
  return <div>Protected content</div>
}
```

## API Contracts

### POST /api/kyc/initiate

**Request:**
```json
{
  "idFront": "base64_string",
  "idBack": "base64_string",
  "selfie": "base64_string"
}
```

**Response (202):**
```json
{
  "submissionId": "kyc_1234567890_abc123",
  "status": "pending",
  "expiresAt": 1735689600000
}
```

**Error (422):**
```json
{
  "error": "Validation failed",
  "details": {
    "fieldErrors": {
      "idFront": ["ID front image is required"]
    }
  }
}
```

### GET /api/kyc/status/[submissionId]

**Response (200):**
```json
{
  "submissionId": "kyc_1234567890_abc123",
  "status": "approved",
  "step": "review",
  "expiresAt": 1735689600000
}
```

**Response (404):**
```json
{
  "error": "Submission not found"
}
```

## Storage

### In-Memory Store (Current)
```typescript
// app/api/kyc/initiate/route.ts
const kycStore = new Map<string, KycSubmission>()
```

### Production Migration
Replace with database queries:
```sql
-- Create table
CREATE TABLE kyc_submissions (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL,
  step VARCHAR(50) NOT NULL,
  documents JSONB NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  verification_notes TEXT,
  INDEX idx_user_id (user_id),
  INDEX idx_status (status)
);

-- Query status
SELECT * FROM kyc_submissions 
WHERE id = $1 AND expires_at > NOW();
```

## localStorage Schema

```typescript
// KYC status
localStorage.setItem('kyc:status', 'approved')

// Submission ID
localStorage.setItem('kyc:submissionId', 'kyc_1234567890_abc123')
```

## File Validation

**Supported Formats:**
- JPEG (image/jpeg)
- PNG (image/png)
- WebP (image/webp)

**Size Limits:**
- Max 5MB per file
- Recommended: 2-3MB for optimal upload speed

**Dimensions:**
- Recommended: 1280x720 or higher
- Minimum: 640x480

## Error Handling

### File Upload Errors
```
"Only JPEG, PNG, and WebP images are allowed"
"File size must be less than 5MB"
"Failed to process image. Please try again."
```

### Camera Errors
```
"NotAllowedError: Permission denied"
"NotFoundError: No camera device found"
```

### API Errors
```
"Validation failed" (422)
"Submission not found" (404)
"Failed to submit KYC" (500)
```

## Testing

### Manual Testing Checklist
- [ ] Upload ID front (drag-drop)
- [ ] Upload ID back (select file)
- [ ] Take selfie (camera)
- [ ] Upload selfie (file)
- [ ] Review all images
- [ ] Submit KYC
- [ ] Poll status (5s interval)
- [ ] Verify approval/rejection
- [ ] Check localStorage persistence
- [ ] Test modal close/reopen
- [ ] Test camera permission denial
- [ ] Test file size validation
- [ ] Test file type validation

### Simulated Verification
- Approval: 85% chance
- Rejection: 15% chance
- Delay: 5-15 seconds

## Security Considerations

### Current Implementation
- Base64 encoding for image transmission
- File type validation (MIME type)
- File size limits (5MB)
- Expiration (30 days)

### Production Recommendations
1. **Encryption**: Encrypt images in transit (HTTPS) and at rest
2. **Storage**: Use secure blob storage (S3, GCS) with encryption
3. **Access Control**: Implement proper authentication/authorization
4. **Audit Logging**: Log all KYC submissions and status changes
5. **Data Retention**: Implement data deletion after verification period
6. **Third-Party Integration**: Use established KYC providers (Onfido, IDology, etc.)
7. **Rate Limiting**: Implement per-user submission limits
8. **GDPR Compliance**: Implement data export/deletion endpoints

## Performance Optimization

### Current
- Polling interval: 5 seconds
- Simulated verification: 5-15 seconds

### Production Optimization
1. **Exponential Backoff**: Increase polling interval over time
2. **Webhook Integration**: Use webhooks instead of polling
3. **Image Compression**: Compress images before upload
4. **Lazy Loading**: Load components on demand
5. **Caching**: Cache verification status

## Future Enhancements

1. **Liveness Detection**: Verify selfie is live (not a photo)
2. **Document OCR**: Extract data from ID documents
3. **Face Matching**: Compare ID photo with selfie
4. **Multi-Language**: Support multiple languages
5. **Accessibility**: Improve screen reader support
6. **Mobile Optimization**: Better mobile camera UX
7. **Batch Processing**: Handle multiple submissions
8. **Webhook Notifications**: Real-time status updates
9. **Admin Dashboard**: Review and manage submissions
10. **Retry Logic**: Automatic retry on failure

## Troubleshooting

### Camera Not Working
1. Check browser permissions
2. Verify HTTPS (required for camera access)
3. Try different browser
4. Fall back to file upload

### Status Not Updating
1. Check network tab for API calls
2. Verify submissionId in localStorage
3. Check browser console for errors
4. Refresh page to restart polling

### Images Not Uploading
1. Check file size (max 5MB)
2. Verify file format (JPEG/PNG/WebP)
3. Check network connection
4. Try different file

### Dashboard Not Unlocking
1. Check localStorage for kyc:status
2. Verify KycProvider in layout
3. Check browser console for errors
4. Clear localStorage and retry

## Support

For issues or questions:
1. Check browser console for errors
2. Review network tab for API responses
3. Check localStorage state
4. Verify file formats and sizes
5. Test in different browser
