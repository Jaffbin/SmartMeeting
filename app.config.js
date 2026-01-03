export default {
  expo: {
    name: "SmartMeeting",
    slug: "smartmeeting",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    splash: {
      image: "./assets/images/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    android: {
      package: "com.smartmeeting",
      permissions: [
        "RECORD_AUDIO",
        "android.permission.RECORD_AUDIO",
        "android.permission.MODIFY_AUDIO_SETTINGS"
      ],
      adaptiveIcon: {
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundColor: "#ffffff"
      }
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.smartmeeting",
      infoPlist: {
        NSMicrophoneUsageDescription: "This app needs access to the microphone to record meetings.",
        ITSAppUsesNonExemptEncryption: false
      }
    },
    plugins: [
      "expo-av",
      "expo-audio",
      "expo-web-browser"
    ],
    "updates": {
      "enabled": false,
      "fallbackToCacheTimeout": 0,
      "checkAutomatically": "NEVER",
      "url": null
    },
    extra: {
      eas: {
        projectId: "47d0b539-2b3a-40f5-9f6a-447399fc3a1c"
      },
      firebaseApiKey: process.env.FIREBASE_API_KEY,
      geminiApiKey: process.env.GEMINI_API_KEY
    }
  }
};

