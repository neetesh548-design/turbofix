# QRGateway Testing - Quick Start Guide

## 30-Second Setup

```bash
cd /Users/nkumarsoni/TurboFix
npm install
npm run test:qr
```

## One-Liner Commands

```bash
# Run all QRGateway tests
npm run test:qr

# See tests running in browser
npm run test:qr:headed

# Debug with Playwright Inspector
npm run test:qr:debug

# Test on Chromium only
npm run test:qr:chromium

# Test on mobile (Chrome + Safari)
npm run test:qr:mobile

# View results
npm run test:report
```

## What Gets Tested

### 30+ Worst-Case Scenarios:

**Network Issues (6 tests)**
- ✅ Offline submission → saves to queue
- ✅ Network timeout → retry & succeed
- ✅ Transient failures → auto-retry
- ✅ Offline sync → syncs on reconnect
- ✅ API errors → graceful fallback

**Permissions (5 tests)**
- ✅ Microphone denied → fallback to text
- ✅ Camera denied → still submittable
- ✅ SpeechRecognition unavailable → text only
- ✅ Storage full → queue or error
- ✅ Audio feedback disabled → still works

**Voice Input (4 tests)**
- ✅ No speech detected → try again or text
- ✅ Transcription fails → use text fallback
- ✅ Language switches → state preserved
- ✅ Rapid changes → no corruption

**Input Validation (5 tests)**
- ✅ Invalid phone numbers → rejected
- ✅ 10KB+ text → handled correctly
- ✅ Special chars → XSS safe
- ✅ Empty input → validation error
- ✅ Rapid submissions → no duplicates

**Photos (3 tests)**
- ✅ Corrupted images → handled
- ✅ Huge files (50MB+) → size handling
- ✅ Upload fails → submission continues

**State Management (4 tests)**
- ✅ Back button → works correctly
- ✅ Phone persists → across reloads
- ✅ Machine details → fetch fails gracefully
- ✅ Zero-width screen → still usable

## Test Output

Tests produce:
- **HTML Report** → `playwright-report/index.html`
- **JSON Results** → `test-results.json`
- **Video on Failure** → `test-results/videos/`
- **Screenshots** → `test-results/`

```bash
npm run test:report  # Opens HTML report in browser
```

## Troubleshooting

### Port Already In Use
```bash
lsof -i :5173
kill -9 <PID>
npm run test:qr
```

### Playwright Not Installed
```bash
npm install
npx playwright install
npm run test:qr
```

### Tests Timing Out
```bash
npm run test:qr -- --timeout=60000  # Increase timeout
```

### Run Single Test
```bash
npx playwright test -g "offline submission"
```

### Verbose Output
```bash
npm run test:qr:debug
```

## File Structure

```
tests/
├── qr-gateway.spec.ts          # 30+ tests
├── fixtures/
│   └── qr-gateway.fixture.ts   # Helper fixtures
├── utils/
│   └── qr-gateway-helpers.ts   # QRGatewayTestHelper class
└── README.md                    # Full documentation
```

## Browser Coverage

Automatically tests on:
- ✅ Chrome (Desktop)
- ✅ Firefox (Desktop)
- ✅ Safari (Desktop)
- ✅ Chrome (Mobile - Pixel 5)
- ✅ Safari (Mobile - iPhone 12)

## Performance

- Full suite: **5-10 minutes**
- Single browser: **2-3 minutes**
- Debug mode: **1-2 minutes**

## CI/CD

Tests run automatically on:
- Every push to `main` or `develop`
- Every pull request
- Multiple Node versions (18.x, 20.x)
- Multiple browsers

Check `.github/workflows/e2e-tests.yml` for details.

## Helper Class Usage

```typescript
import { QRGatewayTestHelper } from './utils/qr-gateway-helpers';

const helper = new QRGatewayTestHelper(page);

// Navigate
await helper.navigateToQRGateway('machine-001', 'CNC Lathe 1', 'Shop Floor A');

// Fill form
await helper.completePhoneGate('9876543210');
await helper.submitTextIssue('Machine overheating', 'unsafe');

// Submit
await helper.reviewAndConfirm();
await helper.submitForm();

// Verify
expect(await helper.isSubmissionSuccessful()).toBeTruthy();
```

## Common Test Patterns

### Test Offline Scenario
```typescript
await helper.goOffline();
await helper.submitForm();
const queue = await helper.getOfflineQueue();
expect(queue.length).toBeGreaterThan(0);
```

### Test Permission Denied
```typescript
await page.context().grantPermissions([]);
// Try to use feature
// Should fallback gracefully
```

### Test Input Validation
```typescript
const testCases = [
  { input: '123', shouldPass: false },
  { input: '9876543210', shouldPass: true },
];
```

## Documentation

Full details in:
- 📖 `tests/README.md` - Complete guide
- 📋 `QR_GATEWAY_TEST_SUMMARY.md` - Test matrix

## Git Integration

All tests are committed:
```bash
git log --oneline | grep -i "test\|qr"
# 7434814 test(qr-gateway): Add comprehensive Playwright E2E test suite
# 5b7a946 docs: Add comprehensive QRGateway test suite documentation
```

## Support

Need help?
1. Check `tests/README.md` for detailed docs
2. Check `QR_GATEWAY_TEST_SUMMARY.md` for matrix
3. Run `npm run test:qr:debug` for interactive debugging
4. Check Playwright Inspector with `npm run test:qr:headed`

---

**Happy Testing! 🎉**

All 30+ test cases ensure QRGateway is production-ready across all devices and network conditions.
