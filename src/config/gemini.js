import Constants from 'expo-constants';

export const GEMINI_API_KEY = Constants.expoConfig?.extra?.geminiApiKey || 
  process.env.GEMINI_API_KEY;

export const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

export const GEMINI_MODELS = {
  FLASH_25: 'gemini-2.5-flash',
  PRO_25: 'gemini-2.5-pro',
};