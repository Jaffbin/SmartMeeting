export const ErrorHandler = {
  handle: (error, context = 'operation') => {
    console.error(`❌ ${context} error:`, error);
    
    const errorMessages = {
      'auth/network-request-failed': 'No internet connection. Please check your network.',
      'auth/user-not-found': 'Account not found. Please register first.',
      'auth/wrong-password': 'Incorrect password.',
      'auth/too-many-requests': 'Too many attempts. Please try again later.',
      
      'File too large': 'File exceeds 20MB limit. Please use a shorter recording or compress the audio.',
      'too large': 'Audio file is too large (max 20MB).',
      'File too small': 'File is too small or corrupted.',
      'too small': 'File appears to be empty or corrupted.',
      
      'Base64 conversion timed out': 'File processing timed out. The file may be too large.',
      'Failed to process audio': 'Could not process the audio file. Please try again.',
      'Gemini API error': 'AI transcription failed. Please try again later.',
      
      'Failed to download audio': 'Could not download audio file. Check your internet.',
      'Network request failed': 'Network error. Please check your connection.',
    };

    for (const [key, message] of Object.entries(errorMessages)) {
      if (error.code?.includes(key) || error.message?.includes(key)) {
        return message;
      }
    }

    if (context === 'upload') {
      return 'Upload failed. Please check your internet and try again.';
    } else if (context === 'transcription') {
      return 'Transcription failed. Please try again.';
    }

    return 'Something went wrong. Please try again.';
  }
};