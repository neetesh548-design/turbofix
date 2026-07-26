import { describe, expect, it } from 'vitest';
import { microphoneErrorMessage } from '../utils/mediaErrors';

describe('microphoneErrorMessage', () => {
  it.each([
    ['NotAllowedError', 'Allow microphone permission'],
    ['NotReadableError', 'being used by another app'],
    ['NotFoundError', 'No microphone was found'],
    ['OverconstrainedError', 'selected microphone is unavailable'],
    ['AbortError', 'recording was interrupted'],
  ])('explains %s failures', (name, expected) => {
    expect(microphoneErrorMessage({ name })).toContain(expected);
  });

  it('always includes the available fallback', () => {
    expect(microphoneErrorMessage(null, 'upload audio instead')).toContain('upload audio instead');
  });
});
