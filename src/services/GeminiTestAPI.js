import { GEMINI_API_KEY, GEMINI_API_URL } from '../config/gemini';

export const testGeminiConnection = async () => {
  try {
    console.log('🧪 Testing Gemini 2.5 API connection...');

    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'x-goog-api-key': GEMINI_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: 'Say "Hello from Gemini!" in exactly 3 words.'
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 50,
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0]) {
      throw new Error('Invalid API response structure');
    }

    const text = data.candidates[0].content.parts[0].text;
    
    console.log('✅ API Test Success!');
    console.log('📝 Response:', text);
    
    return {
      success: true,
      response: text,
      model: 'gemini-2.5-flash'
    };

  } catch (error) {
    console.error('❌ API Test Failed:', error);
    throw new Error(`Gemini API test failed: ${error.message}`);
  }
};

export const testAudioTranscription = async (audioUrl) => {
  try {
    console.log('🧪 Testing audio transcription...');
    console.log('📎 Audio URL:', audioUrl);

    const audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok) {
      throw new Error(`Failed to download audio: ${audioResponse.status}`);
    }
    
    const audioBlob = await audioResponse.blob();
    console.log('📦 Audio size:', (audioBlob.size / 1024 / 1024).toFixed(2), 'MB');

    // check size limit (e.g., 20MB)
    if (audioBlob.size > 20 * 1024 * 1024) {
      throw new Error('Audio file too large (max 20MB)');
    }

    // transcode to base64
    const base64Audio = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(audioBlob);
    });

    console.log('🚀 Calling Gemini API for transcription...');

    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'x-goog-api-key': GEMINI_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: 'Transcribe this audio and provide a brief summary.' },
              {
                inline_data: {
                  mime_type: 'audio/m4a',
                  data: base64Audio
                }
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2048,
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const text = data.candidates[0].content.parts[0].text;

    console.log('✅ Transcription test successful');
    console.log('📝 Preview:', text.substring(0, 200) + '...');

    return {
      success: true,
      transcription: text
    };

  } catch (error) {
    console.error('❌ Transcription test failed:', error);
    throw error;
  }
};