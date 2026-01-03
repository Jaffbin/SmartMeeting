import NetInfo from '@react-native-community/netinfo';
import { Audio } from 'expo-av';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { OfflineQueue } from '../services/OfflineQueue';
import { StorageService } from '../services/StorageService';
import { ErrorHandler } from '../utils/ErrorHandler';

const RecordingScreen = ({ navigation }) => {
  const [recording, setRecording] = useState(null);
  const [recordingUri, setRecordingUri] = useState(null);
  const [sound, setSound] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [meetingTitle, setMeetingTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const MAX_RECORDING_DURATION = 600;

    
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const startRecording = async () => {
  try {
    const permission = await Audio.requestPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Denied', 'Microphone access is required');
      return;
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY,
      (status) => {
        if (status.isRecording) {
          const currentDuration = Math.floor(status.durationMillis / 1000);
          setRecordingDuration(currentDuration);
          
          if (currentDuration >= MAX_RECORDING_DURATION) {
            console.log('⏱️ Max duration reached, stopping recording');
            stopRecording();
            Alert.alert(
              'Recording Limit Reached',
              `Maximum recording duration is ${MAX_RECORDING_DURATION / 60} minutes to ensure file size stays under 20MB.`,
              [{ text: 'OK' }]
            );
          }
        }
      },
      100
    );

    setRecording(recording);
    setIsRecording(true);
    console.log('✅ Recording started');
  } catch (err) {
    console.error('❌ Recording failed:', err);
    Alert.alert('Error', `Failed to start recording: ${err.message}`);
  }
};

  const stopRecording = async () => {
    try {
      console.log('⏸️ Stopping recording...');
      setIsRecording(false);
      
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      
      setRecordingUri(uri);
      setRecording(null);
      
      console.log('✅ Recording saved:', uri);
    } catch (error) {
      console.error('❌ Stop failed:', error);
      Alert.alert('Error', `Failed to stop: ${error.message}`);
    }
  };

  const playRecording = async () => {
    try {
      if (isPlaying && sound) {
        await sound.pauseAsync();
        setIsPlaying(false);
      } else if (sound) {
        await sound.playAsync();
        setIsPlaying(true);
      } else {
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: recordingUri },
          { shouldPlay: true },
          (status) => {
            if (status.didJustFinish) {
              setIsPlaying(false);
            }
          }
        );
        setSound(newSound);
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('❌ Play failed:', error);
      Alert.alert('Error', `Failed to play: ${error.message}`);
    }
  };

  const handleUpload = async () => {
    if (!recordingUri) {
      Alert.alert('Error', 'No recording to upload');
      return;
    }

    if (!meetingTitle.trim()) {
      Alert.alert('Error', 'Please enter a meeting title');
      return;
    }

    setUploading(true);
    try {
      const isConnected = await NetInfo.fetch().then(s => s.isConnected);
      
      if (!isConnected) {
        await OfflineQueue.queueRecording(recordingUri, meetingTitle.trim());
        Alert.alert(
          'Saved Offline',
          'No internet connection. Recording saved and will upload when online.',
          [
            {
              text: 'OK',
              onPress: () => {
                if (sound) {
                  sound.unloadAsync();
                }
                navigation.goBack();
              }
            }
          ]
        );
        return;
      }

      console.log('🚀 Starting upload and transcription...');
      const result = await StorageService.uploadAndTranscribe(
        recordingUri, 
        meetingTitle.trim()
      );
      
      console.log('✅ Upload successful:', result);
      
      Alert.alert(
        'Success',
        'Recording uploaded! AI transcription is processing in the background.',
        [
          {
            text: 'OK',
            onPress: () => {
              if (sound) {
                sound.unloadAsync();
              }
              navigation.goBack();
            }
          }
        ]
      );
    } catch (error) {
      const message = ErrorHandler.handle(error, 'upload');
      Alert.alert('Upload Failed', message);
    } finally {
      setUploading(false);
    }
  };

  const resetRecording = async () => {
    try {
      if (sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
        setSound(null);
      }
      
      setRecordingUri(null);
      setIsPlaying(false);
      setMeetingTitle('');
      setRecordingDuration(0);
    } catch (error) {
      console.error('❌ Reset failed:', error);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>
            {isRecording ? '🔴' : recordingUri ? '✅' : '🎙️'}
          </Text>
        </View>

        <Text style={styles.title}>
          {isRecording 
            ? 'Recording...' 
            : recordingUri 
            ? 'Recording Complete' 
            : 'Ready to Record'}
        </Text>

        {isRecording && (
          <Text style={styles.duration}>
            {recordingDuration}s
          </Text>
        )}

        {!recordingUri && (
          <TouchableOpacity
            style={[
              styles.button,
              isRecording ? styles.stopButton : styles.startButton
            ]}
            onPress={isRecording ? stopRecording : startRecording}
          >
            <Text style={styles.buttonText}>
              {isRecording ? 'Stop Recording' : 'Start Recording'}
            </Text>
          </TouchableOpacity>
        )}

        {recordingUri && !isRecording && (
          <View style={styles.uploadSection}>
            <Text style={styles.savedText}>✅ Recording saved!</Text>
            
            <TouchableOpacity
              style={[styles.button, styles.playButton]}
              onPress={playRecording}
            >
              <Text style={styles.buttonText}>
                {isPlaying ? '⏸ Pause' : '▶️ Play Recording'}
              </Text>
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              placeholder="Enter meeting title"
              placeholderTextColor={theme.placeholder}
              value={meetingTitle}
              onChangeText={setMeetingTitle}
              editable={!uploading}
            />

            <TouchableOpacity
              style={[styles.button, styles.uploadButton]}
              onPress={handleUpload}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Upload & Process</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.resetButton]}
              onPress={resetRecording}
              disabled={uploading}
            >
              <Text style={styles.buttonText}>Record Again</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const createStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  iconContainer: {
    marginBottom: 30,
  },
  icon: {
    fontSize: 100,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.text,
    marginBottom: 20,
  },
  duration: {
    fontSize: 18,
    color: theme.error,
    marginBottom: 10,
    fontWeight: '600',
  },
  savedText: {
    fontSize: 16,
    color: theme.success,
    marginBottom: 20,
    textAlign: 'center',
  },
  uploadSection: {
    width: '100%',
    alignItems: 'center',
  },
  input: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 15,
    borderRadius: 8,
    fontSize: 16,
    width: '100%',
    marginBottom: 20,
    color: theme.text,
  },
  button: {
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 25,
    marginVertical: 10,
    minWidth: 200,
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: theme.primary,
  },
  stopButton: {
    backgroundColor: theme.error,
  },
  playButton: {
    backgroundColor: theme.success,
  },
  uploadButton: {
    backgroundColor: theme.primary,
  },
  resetButton: {
    backgroundColor: theme.warning,
  },
  buttonText: {
    color: theme.textInverse,
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default RecordingScreen;