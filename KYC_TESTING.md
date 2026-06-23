# KYC Testing Guide

## Quick Start Testing

### 1. Start the Development Server
```bash
npm run dev
```

### 2. Access KYC Page
Navigate to: `http://localhost:3000/kyc`

### 3. Complete the Flow
- Upload ID front image
- Upload ID back image
- Take selfie or upload photo
- Review documents
- Click "Submit KYC"
- Wait for verification (5-15 seconds)
- See approval/rejection

### 4. Test Dashboard Access
Navigate to: `http://localhost:3000/dashboard`
- Should show KYC modal if not verified
- Should unlock after approval

## Manual Testing Checklist

### ID Upload Component
- [ ] Drag and drop ID front image
- [ ] See preview with checkmark
- [ ] Click X to clear image
- [ ] Select file via button
- [ ] Repeat for ID back
- [ ] Validate file type error
- [ ] Validate file size error

### Selfie Component
- [ ] Click "Take Selfie" button
- [ ] Grant camera permission
- [ ] See camera preview
- [ ] Click "Capture" button
- [ ] See captured image
- [ ] Click X to retake
- [ ] Test "Upload Photo" fallback
- [ ] Test camera permission denial

### Form Flow
- [ ] Step 1: Upload both ID images
- [ ] Click "Next" → Step 2
- [ ] Upload selfie
- [ ] Click "Next" → Step 3
- [ ] See all 3 images in review
- [ ] Click "Submit KYC"
- [ ] See loading state
- [ ] See submission confirmation

### Status Polling
- [ ] See "Verification in Progress"
- [ ] See polling indicator (blue dot)
- [ ] Wait 5-15 seconds
- [ ] See status update (approved/rejected)
- [ ] Check localStorage for status

### Dashboard Integration
- [ ] Visit /dashboard without KYC
- [ ] See KYC modal
- [ ] Complete KYC
- [ ] See dashboard unlock
- [ ] Refresh page
- [ ] Dashboard still unlocked (localStorage)

### Error Handling
- [ ] Try uploading non-image file
- [ ] Try uploading file > 5MB
- [ ] Try submitting without all images
- [ ] Check error messages are clear
- [ ] Verify form recovers from errors

## API Testing

### Test Submission Endpoint

```bash
# 1. Create test images (base64)
# Use any JPEG/PNG/WebP image

# 2. Submit KYC
curl -X POST http://localhost:3000/api/kyc/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "idFront": "base64_string_here",
    "idBack": "base64_string_here",
    "selfie": "base64_string_here"
  }'

# Response:
# {
#   "submissionId": "kyc_1234567890_abc123",
#   "status": "pending",
#   "expiresAt": 1735689600000
# }
```

### Test Status Endpoint

```bash
# 1. Get submissionId from above response

# 2. Check status immediately
curl http://localhost:3000/api/kyc/status/kyc_1234567890_abc123

# Response:
# {
#   "submissionId": "kyc_1234567890_abc123",
#   "status": "pending",
#   "step": "submitted",
#   "expiresAt": 1735689600000
# }

# 3. Wait 5-15 seconds and check again
curl http://localhost:3000/api/kyc/status/kyc_1234567890_abc123

# Response (after verification):
# {
#   "submissionId": "kyc_1234567890_abc123",
#   "status": "approved",
#   "step": "review",
#   "expiresAt": 1735689600000
# }
```

### Test Error Cases

```bash
# Missing required field
curl -X POST http://localhost:3000/api/kyc/initiate \
  -H "Content-Type: application/json" \
  -d '{"idFront": "base64"}'

# Response (422):
# {
#   "error": "Validation failed",
#   "details": {
#     "fieldErrors": {
#       "idBack": ["ID back image is required"],
#       "selfie": ["Selfie image is required"]
#     }
#   }
# }

# Invalid submission ID
curl http://localhost:3000/api/kyc/status/invalid_id

# Response (404):
# {
#   "error": "Submission not found"
# }
```

## Browser DevTools Testing

### Check localStorage
```javascript
// In browser console
localStorage.getItem('kyc:status')
// Returns: 'pending' | 'approved' | 'rejected' | 'expired' | null

localStorage.getItem('kyc:submissionId')
// Returns: 'kyc_1234567890_abc123' | null

// Clear KYC state
localStorage.removeItem('kyc:status')
localStorage.removeItem('kyc:submissionId')
```

### Check Network Requests
1. Open DevTools → Network tab
2. Complete KYC form
3. Look for:
   - POST `/api/kyc/initiate` (202 status)
   - Multiple GET `/api/kyc/status/[id]` (200 status)
4. Check request/response bodies

### Check Console
1. Open DevTools → Console tab
2. Look for any errors
3. Check for polling logs (if added)

## Simulated Verification Testing

### Test Approval (85% chance)
```
1. Submit KYC
2. Wait 5-15 seconds
3. See "Verified" status
4. Dashboard unlocks
```

### Test Rejection (15% chance)
```
1. Submit KYC multiple times
2. Eventually see "Verification Failed"
3. See error message
4. Click "Resubmit"
5. Try again
```

### Test Expiration
```
1. Submit KYC
2. Wait for approval
3. Manually set expiration in past:
   localStorage.setItem('kyc:status', 'expired')
4. Refresh page
5. See "Verification Expired"
6. Click "Resubmit"
```

## Performance Testing

### Test Polling Performance
```javascript
// In browser console
// Monitor polling requests
let count = 0
const originalFetch = window.fetch
window.fetch = function(...args) {
  if (args[0].includes('/api/kyc/status')) {
    count++
    console.log(`Polling request #${count}`)
  }
  return originalFetch.apply(this, args)
}
```

### Test File Upload Performance
```javascript
// Test with different file sizes
// 1MB, 2MB, 3MB, 4MB, 5MB
// Check upload time in Network tab
```

## Cross-Browser Testing

### Test in Different Browsers
- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Safari
- [ ] Edge

### Test Camera Access
- [ ] Chrome (works)
- [ ] Firefox (works)
- [ ] Safari (works)
- [ ] Edge (works)

### Test File Upload
- [ ] All browsers (should work)

## Mobile Testing

### Test on Mobile Device
```bash
# Get local IP
ipconfig getifaddr en0  # macOS
hostname -I            # Linux
ipconfig               # Windows

# Access from mobile
http://[YOUR_IP]:3000/kyc
```

### Test Mobile Features
- [ ] Drag-drop on mobile (may not work)
- [ ] File upload on mobile (works)
- [ ] Camera on mobile (works)
- [ ] Touch interactions
- [ ] Responsive layout

## Accessibility Testing

### Keyboard Navigation
- [ ] Tab through form
- [ ] Enter to submit
- [ ] Escape to close modal
- [ ] Focus visible on all elements

### Screen Reader Testing
- [ ] Use NVDA (Windows) or VoiceOver (Mac)
- [ ] Test form labels
- [ ] Test button labels
- [ ] Test error messages
- [ ] Test status updates

### Color Contrast
- [ ] Check with WebAIM contrast checker
- [ ] Verify WCAG AA compliance
- [ ] Test with color blindness simulator

## Edge Cases

### Test Edge Cases
- [ ] Very large images (5MB+)
- [ ] Very small images (< 100x100)
- [ ] Corrupted image files
- [ ] Rapid form submissions
- [ ] Network timeout during upload
- [ ] Network timeout during polling
- [ ] Browser tab closed during polling
- [ ] Multiple tabs open
- [ ] localStorage disabled
- [ ] Camera permission denied
- [ ] Camera not available

## Regression Testing

### After Code Changes
- [ ] Run full manual test flow
- [ ] Check all error cases
- [ ] Verify localStorage persistence
- [ ] Test dashboard unlock
- [ ] Check API responses
- [ ] Verify UI updates

## Performance Benchmarks

### Expected Performance
- Form load: < 1s
- Image upload: < 5s (depends on file size)
- Status polling: < 500ms per request
- Dashboard unlock: < 1s after approval

### Monitor Performance
```javascript
// In browser console
performance.mark('kyc-start')
// ... complete KYC flow ...
performance.mark('kyc-end')
performance.measure('kyc-flow', 'kyc-start', 'kyc-end')
console.log(performance.getEntriesByName('kyc-flow')[0])
```

## Debugging Tips

### Enable Logging
Add to components:
```typescript
console.log('KYC Status:', kycStatus)
console.log('Submission ID:', submissionId)
console.log('Is Verified:', isVerified)
```

### Check State
```javascript
// In browser console
// Check context state
const state = localStorage.getItem('kyc:status')
const submissionId = localStorage.getItem('kyc:submissionId')
console.log({ state, submissionId })
```

### Monitor API Calls
```javascript
// In browser console
// Monitor all API calls
window.addEventListener('fetch', (e) => {
  if (e.request.url.includes('/api/kyc')) {
    console.log('KYC API Call:', e.request)
  }
})
```

## Test Data

### Sample Images
Use any JPEG/PNG/WebP images:
- ID images: 1280x720 or larger
- Selfie: 640x480 or larger
- Max 5MB each

### Generate Test Base64
```javascript
// In browser console
const file = document.querySelector('input[type="file"]').files[0]
const reader = new FileReader()
reader.onload = (e) => {
  const base64 = e.target.result.split(',')[1]
  console.log(base64)
}
reader.readAsDataURL(file)
```

## Continuous Testing

### Automated Tests (Future)
```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e
```

## Support

For issues during testing:
1. Check browser console for errors
2. Check Network tab for API responses
3. Verify localStorage state
4. Clear cache and retry
5. Try different browser
6. Check file formats and sizes

---

**Happy Testing!** 🚀
