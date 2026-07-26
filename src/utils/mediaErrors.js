export function microphoneErrorMessage(error, fallback = 'type instead') {
  const action = `You can ${fallback}.`;

  switch (error?.name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return `Microphone access is blocked. Allow microphone permission in your browser settings, then try again. ${action}`;
    case 'NotReadableError':
    case 'TrackStartError':
      return `The microphone is being used by another app. Close it there, then try again. ${action}`;
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return `No microphone was found. Connect a microphone and try again. ${action}`;
    case 'OverconstrainedError':
    case 'ConstraintNotSatisfiedError':
      return `The selected microphone is unavailable. Choose another microphone in your browser settings. ${action}`;
    case 'AbortError':
      return `Microphone recording was interrupted. Try once more. ${action}`;
    default:
      return `Voice recording is not available in this browser or connection. ${action}`;
  }
}
