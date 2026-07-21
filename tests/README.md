# QRGateway E2E Testing

Comprehensive Playwright test suite for TurboFix QRGateway component with worst-case scenario coverage.

## What's Tested

### Network & Connectivity
- ✅ Offline submission and queuing
- ✅ Transient network failures with retry logic
- ✅ API timeout handling
- ✅ Network instability simulation
- ✅ Offline sync on reconnection

### Permissions & Access
- ✅ Microphone permission denied
- ✅ Camera permission denied
- ✅ SpeechRecognition API unavailable
- ✅ Storage quota exceeded
- ✅ speechSynthesis API failure

### Voice & Speech
- ✅ No speech detected
- ✅ Transcription API failure
- ✅ SpeechRecognition unavailable
- ✅ Rapid language switches without state corruption

### Input Validation
- ✅ Invalid phone number formats
- ✅ Very long issue descriptions (10KB+)
- ✅ Special characters and encoding
- ✅ Empty/whitespace-only submissions
- ✅ Concurrent form submissions

### Photo Upload
- ✅ Corrupted image files
- ✅ Very large files (>50MB)
- ✅ Storage upload failures
- ✅ File type validation

### State Management
- ✅ Back button handling
- ✅ Phone persistence across reloads
- ✅ Machine details fetch failure
- ✅ Duplicate detection failure
- ✅ Rapid language changes
- ✅ Zero-width screen edge case

## Installation

```bash
npm install
```

This installs `@playwright/test` and all dependencies.

## Running Tests

### All QRGateway Tests
```bash
npm run test:qr
```

### With Visual UI
```bash
npm run test:qr:headed
```

### Debug Mode
```bash
npm run test:qr:debug
```

### Chromium Only
```bash
npm run test:qr:chromium
```

### Mobile Browsers
```bash
npm run test:qr:mobile
```

### View Test Report
```bash
npm run test:report
```

## Test Structure

```
tests/
├── qr-gateway.spec.ts          # Main test suite (30+ tests)
├── fixtures/
│   └── qr-gateway.fixture.ts   # Test fixtures and helpers
├── utils/
│   └── qr-gateway-helpers.ts   # QRGatewayTestHelper class
└── README.md
```

## Key Test Scenarios

### 1. Offline Submission
Tests that when the device is offline, tickets are saved to localStorage and synced when online.

```typescript
await page.context().setOffline(true);
// ... fill and submit form
const queue = await page.evaluate(() => 
  localStorage.getItem('tf_offline_tickets')
);
expect(queue).toBeTruthy();
```

### 2. Microphone Permission Denied
Tests graceful fallback to text input when microphone access is denied.

```typescript
await page.context().grantPermissions([]);
// ... try to use voice input
// Should show error and fallback to text
```

### 3. Network Retry Logic
Tests that transient network failures trigger retry attempts.

```typescript
await page.context().route('**/functions/v1/*', route => {
  if (Math.random() > 0.5) route.abort('failed');
  else route.continue();
});
// ... submit form, should handle gracefully
```

### 4. Input Validation
Tests various invalid inputs are handled properly.

```typescript
const testCases = [
  { input: 'abcdefghij', shouldPass: false },
  { input: '123', shouldPass: false },
  { input: '9876543210', shouldPass: true },
];
```

## Helper Class: QRGatewayTestHelper

A utility class with pre-built methods for common operations:

```typescript
const helper = new QRGatewayTestHelper(page);

// Navigation
await helper.navigateToQRGateway('machine-001', 'CNC Lathe 1', 'Shop Floor A');

// Form operations
await helper.completePhoneGate('9876543210');
await helper.submitTextIssue('Machine overheating', 'unsafe');
await helper.reviewAndConfirm('Updated description');
await helper.submitForm();

// Offline operations
await helper.goOffline();
const queue = await helper.getOfflineQueue();
await helper.goOnline();

// Verification
await helper.isSubmissionSuccessful();
await helper.waitForError(5000);
```

## Browser Coverage

Tests run on:
- ✅ Chromium (Desktop)
- ✅ Firefox (Desktop)
- ✅ WebKit (Desktop Safari)
- ✅ Chrome Mobile (Pixel 5)
- ✅ Safari Mobile (iPhone 12)

## Continuous Integration

Set `CI=true` environment variable to:
- Run with single worker (serialized)
- Retry failed tests 2 times
- Record videos on failure
- Generate JUnit XML report

```bash
CI=true npm run test:qr
```

## Test Reports

After running tests, reports are available at:
- HTML Report: `playwright-report/index.html`
- JSON Report: `test-results.json`
- JUnit XML: `test-results.xml`

View with:
```bash
npm run test:report
```

## Debugging

### Debug Mode
```bash
npm run test:qr:debug
```

Opens Playwright Inspector with test paused.

### Headed Mode
```bash
npm run test:qr:headed
```

Runs tests in visible browser window.

### Screenshots & Videos
On test failure, automatically captures:
- Screenshots in `test-results/`
- Videos in `test-results/videos/`

## Common Issues

### Port Already in Use
If port 5173 is in use:
```bash
lsof -i :5173
kill -9 <PID>
```

### Playwright Installation Issues
```bash
npx playwright install
```

### Slow Tests
Reduce worker count:
```bash
npx playwright test --workers=1
```

## Adding New Tests

1. Add test to `qr-gateway.spec.ts`:
```typescript
test('should handle new scenario', async ({ page }) => {
  const helper = new QRGatewayTestHelper(page);
  await helper.navigateToQRGateway();
  // ... test logic
});
```

2. Use helper methods from `QRGatewayTestHelper` for common operations

3. Run tests to verify

## Contributing

When adding new features to QRGateway:
1. Add corresponding test cases
2. Ensure all 30+ tests still pass
3. Test mobile scenarios with `npm run test:qr:mobile`
4. Check report for any flaky tests

## Performance

Typical test run times:
- Full suite (30 tests): ~5-10 minutes
- Single browser: ~2-3 minutes
- Debug mode: ~1-2 minutes (interactive)

## Known Limitations

1. **Audio Mocking**: SpeechRecognition and Web Audio APIs are mocked via `addInitScript`
2. **Camera**: Camera permission denials don't fully simulate device camera
3. **Storage**: localStorage quota tests simulate programmatically, not actual disk limits

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Testing Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)
- [CI/CD Integration](https://playwright.dev/docs/ci)
