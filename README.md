# SmartMeeting - AI-Powered Meeting Transcription & Task Assignment

An intelligent mobile application that automatically transcribes meetings and extracts actionable tasks using AI technology.

## 📱 About

SmartMeeting is a React Native mobile application developed as a Final Year Project that helps teams document meetings efficiently. The app records or uploads meeting audio, transcribes it using AI, automatically identifies tasks, and sends email notifications to team members.

## ✨ Key Features

- **Audio Recording** - Record meetings directly in the app
- **Audio Upload** - Upload pre-recorded meetings (MP3, WAV, M4A, AAC, OGG)
- **AI Transcription** - Automatic speech-to-text conversion using Google Gemini API
- **Smart Task Extraction** - AI identifies action items and assignees from transcripts
- **Email Notifications** - Automatic task assignment emails to team members
- **Team Management** - Manage team member contacts and assignments
- **Meeting History** - Search and review past meetings
- **Dark Mode** - Light and dark theme support

## 🛠️ Technology Stack

- **Frontend**: React Native (Android)
- **AI Engine**: Google Gemini 2.5 Flash API
- **Backend**: Firebase (Authentication, Firestore, Cloud Storage, Cloud Functions)
- **Email Service**: Nodemailer (SMTP)
- **Audio Processing**: react-native-audio-recorder-player

## 📋 Requirements

- Node.js 14 or higher
- React Native development environment
- Android Studio (for Android development)
- Firebase account
- Google AI Studio API key (for Gemini API)

## 🚀 Installation

1. **Clone the repository**
```bash
git clone https://github.com/Jaffbin/SmartMeeting.git
cd SmartMeeting
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure Firebase**
- Create a Firebase project at [firebase.google.com](https://firebase.google.com)
- Download `google-services.json` (Android) and place in `android/app/`
- Enable Authentication, Firestore, and Cloud Storage

4. **Set up Gemini API**
- Get API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
- Add to environment configuration

5. **Configure environment variables**
Create `.env` file:
```
GEMINI_API_KEY=your_api_key_here
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_email
SMTP_PASSWORD=your_password
```

6. **Run the application**
```bash
# For Android
npx react-native run-android
```

## 📖 Usage

### Recording a Meeting
1. Open the app and login/register
2. Tap "Start Recording" on home page
3. Record your meeting (max 20MB)
4. Stop recording when finished
5. Wait for AI transcription to complete

### Uploading Audio
1. Tap "Upload Audio" on home page
2. Select audio file from device
3. Enter meeting title
4. Upload and wait for processing

### Managing Tasks
1. Open meeting from history
2. Review AI-extracted tasks
3. Edit task details (description, priority, assignees)
4. Add manual tasks if needed
5. Send email notifications to assignees

### Team Management
1. Go to Profile page
2. Add team members (name + email)
3. Use names in task assignments
4. System matches names to send emails

## 📂 Project Structure

```
SmartMeeting/
├── src/
│   ├── screens/          # App screens
│   │   ├── AuthScreen.js
│   │   ├── HomeScreen.js
│   │   ├── ProfileScreen.js
│   │   ├── RecordingScreen.js
│   │   ├── UploadScreen.js
│   │   └── MeetingDetailScreen.js
│   ├── services/         # API services
│   │   └── GeminiService.js
│   ├── components/       # Reusable components
│   └── utils/            # Helper functions
├── functions/            # Firebase Cloud Functions
│   └── index.js          # Email notification function
├── android/              # Android native code
└── ios/                  # iOS native code (future)
```

## 🔧 Configuration

### Firebase Cloud Functions (Email Notifications)

Deploy the email notification function:

```bash
cd functions
npm install
firebase deploy --only functions
```

### Audio File Limits
- Maximum file size: 20MB
- Supported formats: MP3, WAV, M4A, AAC, OGG
- Recommended: Clear audio, minimal background noise

## 🧪 Testing

The system has been tested with 31 users achieving:
- 75-90% transcription accuracy (clear audio)
- 80% task extraction accuracy (explicit tasks)
- 100% email delivery reliability

## ⚠️ Known Limitations

- English language only
- Requires internet connection (no offline mode)
- Best performance with clear audio and low background noise
- Task extraction works best with explicit action items
- 20MB file size limit

## 🔮 Future Enhancements

- Multi-language support
- Offline transcription capability
- iOS version
- Web interface
- Calendar integration
- Advanced analytics

## 📄 License

This project is developed as a Final Year Project for Southern University College.

## 👤 Author

**Wong Yong Bin**
- Student ID: B230051C
- Course: Bachelor of Information Technology (Software Engineering)
- Institution: Southern University College
- Supervisor: Ms Chan Ler-Kuan

## 🙏 Acknowledgments

- Google Gemini API for AI transcription
- Firebase for backend infrastructure
- React Native community for excellent documentation
- Southern University College for project guidance

## 📞 Support

For issues or questions:
1. Check existing issues on GitHub
2. Create new issue with details
3. Contact: [your-email@example.com]

## 🔗 Links

- [Firebase Documentation](https://firebase.google.com/docs)
- [Gemini API Documentation](https://ai.google.dev/gemini-api/docs)
- [React Native Documentation](https://reactnative.dev/docs/getting-started)

---

**Note**: This is an academic project developed for educational purposes. The system demonstrates AI integration for meeting automation and is not intended for commercial deployment without further development and testing.
