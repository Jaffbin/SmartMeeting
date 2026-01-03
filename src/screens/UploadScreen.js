import * as DocumentPicker from 'expo-document-picker';
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
import { StorageService } from '../services/StorageService';
import { ErrorHandler } from '../utils/ErrorHandler';

const SUPPORTED_FORMATS = {
  'audio/mpeg': ['.mp3'],
  'audio/wav': ['.wav'],
  'audio/x-wav': ['.wav'],
  'audio/mp4': ['.m4a', '.mp4'],
  'audio/x-m4a': ['.m4a'],
  'audio/aac': ['.aac'],
  'audio/ogg': ['.ogg'],
  'audio/webm': ['.webm'],
};

const SUPPORTED_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.mp4', '.aac', '.ogg', '.webm'];

const UploadScreen = ({ navigation }) => {
  const [file, setFile] = useState(null);
  const [meetingTitle, setMeetingTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/*'],
        copyToCacheDirectory: true,
      });
  
      if (!result.canceled) {
        const selectedFile = result.assets[0];
        
        const maxSize = 20 * 1024 * 1024; 
        const fileSizeMB = (selectedFile.size / 1024 / 1024).toFixed(2);
        
        if (selectedFile.size > maxSize) {
          Alert.alert(
            'File Too Large',
            `This audio file is ${fileSizeMB}MB.\n\n` +
            `Maximum allowed size: 20MB\n\n` +
            `💡 Tips:\n` +
            `• Use a shorter recording\n` +
            `• Compress the audio file\n` +
            `• Record at lower quality`,
            [{ text: 'OK' }]
          );
          return;
        }
        
        if (selectedFile.size < 1024) { 
          Alert.alert(
            'Invalid File',
            'This file appears to be empty or corrupted.\n\n' +
            'Please select a valid audio file.',
            [{ text: 'OK' }]
          );
          return;
        }
        
        setFile(selectedFile);
        console.log('✅ File selected:', {
          name: selectedFile.name,
          size: `${fileSizeMB}MB`,
          type: selectedFile.mimeType || 'Unknown'
        });
      }
    } catch (error) {
      console.error('❌ Pick file error:', error);
      Alert.alert('Error', 'Failed to pick file. Please try again.');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      Alert.alert('Error', 'Please select an audio file first');
      return;
    }

    if (!meetingTitle.trim()) {
      Alert.alert('Error', 'Please enter a meeting title');
      return;
    }

    setUploading(true);
    try {
      console.log('🚀 Starting upload and transcription...');
      console.log('📎 File URI:', file.uri);

      const result = await StorageService.uploadAndTranscribe(
        file.uri,
        meetingTitle.trim()
      );

      console.log('✅ Upload successful:', result);

      Alert.alert(
        'Success',
        'Audio uploaded! AI transcription is processing in the background.',
        [
          {
            text: 'OK',
            onPress: () => {
              setFile(null);
              setMeetingTitle('');
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

  const resetSelection = () => {
    setFile(null);
    setMeetingTitle('');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.icon}>📁</Text>
        <Text style={styles.title}>Upload Audio File</Text>

        {!file ? (
          <>
            <Text style={styles.description}>
              Select an audio file for transcription and task extraction
            </Text>

            <TouchableOpacity style={styles.pickButton} onPress={pickFile}>
              <Text style={styles.pickButtonText}>📂 Select Audio File</Text>
            </TouchableOpacity>

            <View style={styles.supportedFormats}>
              <Text style={styles.supportedTitle}>✅ Supported Formats:</Text>
              <Text style={styles.supportedText}>
                🎵 MP3, WAV, M4A, AAC, OGG, WebM
              </Text>
              <Text style={styles.supportedSubtext}>
                Maximum size: 20MB
              </Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.fileInfo}>
              <Text style={styles.fileIcon}>🎵</Text>
              <Text style={styles.fileName}>{file.name}</Text>
              
              <Text style={styles.fileFormat}>
                {file.mimeType || 'Unknown format'}
              </Text>
              
              <Text style={[
                styles.fileSize,
                file.size > 15 * 1024 * 1024 && styles.fileSizeWarning,
                file.size > 18 * 1024 * 1024 && styles.fileSizeDanger,
              ]}>
                {(file.size / 1024 / 1024).toFixed(2)} MB
                {file.size > 15 * 1024 * 1024 && ' ⚠️'}
                {file.size > 18 * 1024 * 1024 && ' (Near Limit!)'}
              </Text>
              
              <Text style={styles.validationCheck}>✅ Valid audio format</Text>
            </View>

            {file.size > 15 * 1024 * 1024 && (
              <View style={styles.warningBox}>
                <Text style={styles.warningIcon}>⚠️</Text>
                <Text style={styles.warningText}>
                  Large file detected! For faster processing, consider:
                  {'\n'}• Recording at lower quality
                  {'\n'}• Using a shorter duration
                  {'\n'}• Compressing the audio file
                </Text>
              </View>
            )}

            <TextInput
              style={styles.input}
              placeholder="Enter meeting title"
              placeholderTextColor={theme.placeholder}
              value={meetingTitle}
              onChangeText={setMeetingTitle}
              editable={!uploading}
            />

            <TouchableOpacity
              style={[styles.uploadButton, uploading && styles.buttonDisabled]}
              onPress={handleUpload}
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={[styles.buttonText, { marginLeft: 10 }]}>
                    Uploading...
                  </Text>
                </>
              ) : (
                <Text style={styles.buttonText}>
                  🚀 Upload & Process
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.resetButton, uploading && styles.buttonDisabled]}
              onPress={resetSelection}
              disabled={uploading}
            >
              <Text style={styles.buttonText}>
                🔄 Pick Another File
              </Text>
            </TouchableOpacity>
          </>
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
  icon: {
    fontSize: 80,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: theme.text,
  },
  description: {
    fontSize: 16,
    color: theme.textSecondary,
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  pickButton: {
    backgroundColor: theme.success,
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 25,
    marginBottom: 30,
  },
  pickButtonText: {
    color: theme.textInverse,
    fontSize: 18,
    fontWeight: 'bold',
  },
  fileInfo: {
    backgroundColor: theme.surface,
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
    ...Platform.select({
      ios: {
        shadowColor: theme.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  fileIcon: {
    fontSize: 48,
    marginBottom: 10,
  },
  fileName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  fileFormat: {
    fontSize: 12,
    color: theme.textTertiary,
    marginBottom: 4,
    fontStyle: 'italic',
  },
  fileSize: {
    fontSize: 14,
    color: theme.textSecondary,
  },
  fileSizeWarning: {
    color: theme.warning,
    fontWeight: '600',
  },
  fileSizeDanger: {
    color: theme.error,
    fontWeight: 'bold',
  },
  validationCheck: {
    fontSize: 12,
    color: theme.success,
    marginTop: 8,
    fontWeight: '600',
  },
  warningBox: {
    backgroundColor: theme.warning + '20',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: theme.warning,
    width: '100%',
  },
  warningIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  warningText: {
    fontSize: 13,
    color: theme.text,
    lineHeight: 20,
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
  uploadButton: {
    backgroundColor: theme.primary,
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 25,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  resetButton: {
    backgroundColor: theme.warning,
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 25,
    width: '100%',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: theme.textInverse,
    fontSize: 18,
    fontWeight: 'bold',
  },
  supportedFormats: {
    marginTop: 20,
    alignItems: 'center',
  },
  supportedTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.text,
    marginBottom: 5,
  },
  supportedText: {
    fontSize: 14,
    color: theme.textSecondary,
  },
  supportedSubtext: {
    fontSize: 12,
    color: theme.textTertiary,
    marginTop: 4,
    fontStyle: 'italic',
  },
});

export default UploadScreen;