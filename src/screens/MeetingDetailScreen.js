import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { deleteDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { auth, db } from '../config/firebase';
import { useTheme } from '../context/ThemeContext';
import { EmailService } from '../services/EmailService';
import { GeminiService } from '../services/GeminiService';
import { ErrorHandler } from '../utils/ErrorHandler';

const MeetingDetailScreen = ({ route, navigation }) => {
  const { meetingId } = route.params;
  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [sendingEmails, setSendingEmails] = useState(false);
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const { theme } = useTheme();
  const styles = createStyles(theme);

  // Task editing modal
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTaskIndex, setEditingTaskIndex] = useState(null);
  const [taskDescription, setTaskDescription] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [taskDeadline, setTaskDeadline] = useState('');
  const [taskPriority, setTaskPriority] = useState('Medium');

  // Team members for assignee selection
  const [teamMembers, setTeamMembers] = useState([]);

  useEffect(() => {
    loadMeeting();
    loadTeamMembers();

    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

  const loadMeeting = async () => {
    try {
      const docRef = doc(db, 'meetings', meetingId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setMeeting({
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate(),
        });
      }
    } catch (error) {
      console.error('Load meeting error:', error);
      const message = ErrorHandler.handle(error, 'load meeting');
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadTeamMembers = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setTeamMembers(userData.teamMembers || []);
      }
    } catch (error) {
      console.error('Load team members error:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadMeeting();
    loadTeamMembers();
  };

  const formatDuration = (seconds) => {
    if (!seconds || seconds <= 0) return null;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDownloadAudio = async () => {
    if (!meeting?.audioUrl) {
      Alert.alert('Error', 'No audio file available');
      return;
    }

    try {
      setDownloading(true);

      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Error', 'Sharing is not available on this device');
        return;
      }

      const fileName = `${meeting.title.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.m4a`;
      const fileUri = FileSystem.documentDirectory + fileName;

      console.log('📥 Downloading audio to:', fileUri);

      const downloadResult = await FileSystem.downloadAsync(
        meeting.audioUrl,
        fileUri
      );

      console.log('✅ Download complete:', downloadResult.uri);

      // Share the file
      await Sharing.shareAsync(downloadResult.uri, {
        mimeType: 'audio/m4a',
        dialogTitle: 'Save Audio File',
        UTI: 'public.audio'
      });

      Alert.alert('Success', 'Audio file ready to save');

    } catch (error) {
      console.error('❌ Download error:', error);

      let errorMessage = 'Failed to download audio file';

      if (error.message?.includes('Network request failed')) {
        errorMessage = 'Network error. Please check your internet connection.';
      } else if (error.message?.includes('404')) {
        errorMessage = 'Audio file not found. It may have been deleted.';
      } else if (error.message?.includes('storage/object-not-found')) {
        errorMessage = 'Audio file no longer exists in storage.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert('Download Failed', errorMessage);
    } finally {
      setDownloading(false);
    }
  };

  const handleExportMeeting = async () => {
  try {
    const exportText = `
===========================================
${meeting.title}
===========================================

Date: ${meeting.createdAt?.toLocaleDateString()} ${meeting.createdAt?.toLocaleTimeString()}
Status: ${meeting.status}
${meeting.duration ? `Duration: ${formatDuration(meeting.duration)}` : ''}

-------------------------------------------
SUMMARY
-------------------------------------------
${meeting.summary || 'No summary available'}

-------------------------------------------
TASKS (${meeting.tasks?.length || 0})
-------------------------------------------
${meeting.tasks && meeting.tasks.length > 0
      ? meeting.tasks.map((task, i) => `
${i + 1}. ${task.description}
   Assignee: ${task.assignee}
   Deadline: ${task.deadline}
   Priority: ${task.priority}
   Status: ${task.completed ? '✅ Completed' : '⏳ Pending'}
   ${task.completedAt ? `Completed on: ${new Date(task.completedAt).toLocaleDateString()}` : ''}
`).join('\n')
      : 'No tasks extracted'}

-------------------------------------------
FULL TRANSCRIPT
-------------------------------------------
${meeting.transcript || 'No transcript available'}

-------------------------------------------
Generated by Meeting Assistant
© 2025 All Rights Reserved
===========================================
    `.trim();

    const fileName = `${meeting.title.replace(/[^a-z0-9]/gi, '_')}_export.txt`;
    const fileUri = FileSystem.documentDirectory + fileName;

     await FileSystem.writeAsStringAsync(fileUri, exportText);

    await Sharing.shareAsync(fileUri, {
      mimeType: 'text/plain',
      dialogTitle: 'Export Meeting',
    });

    Alert.alert('Success', 'Meeting exported successfully');

  } catch (error) {
    console.error('Export error:', error);
    Alert.alert('Error', 'Failed to export meeting');
  }
};

  const handleRegenerateTranscription = () => {
    Alert.alert(
      'Regenerate Transcription',
      'This will re-process the audio file with AI. Previous transcription and tasks will be replaced. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Regenerate',
          style: 'destructive',
          onPress: regenerateTranscription
        }
      ]
    );
  };

  const regenerateTranscription = async () => {
    if (!meeting?.audioUrl) {
      Alert.alert('Error', 'No audio file available');
      return;
    }

    try {
      setRegenerating(true);

      const meetingRef = doc(db, 'meetings', meetingId);
      await updateDoc(meetingRef, {
        status: 'processing',
        transcript: '',
        summary: '',
        tasks: []
      });

      await loadMeeting();

      console.log('🔄 Starting regeneration...');

      const result = await GeminiService.transcribeAndExtractTasks(meeting.audioUrl);

      console.log('✅ Regeneration complete');

      await updateDoc(meetingRef, {
        status: 'completed',
        transcript: result.transcript,
        summary: result.summary,
        tasks: result.tasks.map(task => ({
          ...task,
          completed: false,
          completedAt: null
        })),
        processedAt: new Date().toISOString(),
        regeneratedAt: new Date().toISOString()
      });

      await loadMeeting();

      Alert.alert('Success', 'Transcription regenerated successfully!');

    } catch (error) {
      console.error('❌ Regeneration error:', error);

      try {
        await updateDoc(doc(db, 'meetings', meetingId), {
          status: 'failed',
          error: error.message
        });
        await loadMeeting();
      } catch (updateError) {
        console.error('Failed to update error status:', updateError);
      }

      const message = ErrorHandler.handle(error, 'regeneration');
      Alert.alert('Regeneration Failed', message);
    } finally {
      setRegenerating(false);
    }
  };

  const handleEditTask = (index) => {
    const task = meeting.tasks[index];
    setEditingTaskIndex(index);
    setTaskDescription(task.description);
    setTaskAssignee(task.assignee);
    setTaskDeadline(task.deadline);
    setTaskPriority(task.priority);
    setShowTaskModal(true);
  };

  const handleAddTask = () => {
    setEditingTaskIndex(null);
    setTaskDescription('');
    setTaskAssignee('Unassigned');
    setTaskDeadline('No deadline');
    setTaskPriority('Medium');
    setShowTaskModal(true);
  };

  const handleSaveTask = async () => {
    if (!taskDescription.trim()) {
      Alert.alert('Error', 'Please enter a task description');
      return;
    }

    try {
      const updatedTasks = [...(meeting.tasks || [])];
      const taskData = {
        description: taskDescription.trim(),
        assignee: taskAssignee.trim() || 'Unassigned',
        deadline: taskDeadline.trim() || 'No deadline',
        priority: taskPriority,
        completed: false,
        completedAt: null
      };

      if (editingTaskIndex !== null) {
        taskData.completed = updatedTasks[editingTaskIndex].completed || false;
        taskData.completedAt = updatedTasks[editingTaskIndex].completedAt || null;
        updatedTasks[editingTaskIndex] = taskData;
      } else {
        updatedTasks.push(taskData);
      }

      const meetingRef = doc(db, 'meetings', meetingId);
      await updateDoc(meetingRef, {
        tasks: updatedTasks
      });

      await loadMeeting();
      setShowTaskModal(false);

      Alert.alert('Success', editingTaskIndex !== null ? 'Task updated' : 'Task added');
    } catch (error) {
      console.error('❌ Save task error:', error);
      Alert.alert('Error', 'Failed to save task');
    }
  };

  const handleToggleTaskComplete = async (index) => {
    try {
      const updatedTasks = [...meeting.tasks];
      updatedTasks[index].completed = !updatedTasks[index].completed;
      updatedTasks[index].completedAt = updatedTasks[index].completed
        ? new Date().toISOString()
        : null;

      const meetingRef = doc(db, 'meetings', meetingId);
      await updateDoc(meetingRef, {
        tasks: updatedTasks
      });

      await loadMeeting();
    } catch (error) {
      console.error('Toggle task error:', error);
      Alert.alert('Error', 'Failed to update task');
    }
  };

  const handleDeleteTask = (index) => {
    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedTasks = meeting.tasks.filter((_, i) => i !== index);
              const meetingRef = doc(db, 'meetings', meetingId);
              await updateDoc(meetingRef, {
                tasks: updatedTasks
              });
              await loadMeeting();
              Alert.alert('Success', 'Task deleted');
            } catch (error) {
              console.error('❌ Delete task error:', error);
              Alert.alert('Error', 'Failed to delete task');
            }
          }
        }
      ]
    );
  };

  const handleSendEmails = async () => {
    if (!meeting?.tasks || meeting.tasks.length === 0) {
      Alert.alert('No Tasks', 'There are no tasks to send');
      return;
    }

    const assignedTasks = meeting.tasks.filter(
      task => task.assignee && task.assignee !== 'Unassigned'
    );

    if (assignedTasks.length === 0) {
      Alert.alert('No Assignments', 'All tasks are unassigned. Please assign tasks before sending emails.');
      return;
    }

    Alert.alert(
      'Send Task Emails',
      `Send email notifications for ${assignedTasks.length} assigned task${assignedTasks.length > 1 ? 's' : ''}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: sendTaskEmails
        }
      ]
    );
  };

  const sendTaskEmails = async () => {
    try {
      setSendingEmails(true);

      console.log('📧 Sending task assignment emails...');

      const result = await EmailService.sendTaskAssignmentEmails(
        meeting.tasks,
        meetingId,
        meeting.title || 'Meeting'
      );

      const meetingRef = doc(db, 'meetings', meetingId);
      await updateDoc(meetingRef, {
        emailSent: result.success,
        emailsSentCount: result.sent,
        emailsFailedCount: result.failed,
        lastEmailSentAt: new Date().toISOString()
      });

      if (result.success) {
        Alert.alert(
          'Emails Sent',
          `Successfully sent ${result.sent} email notification${result.sent > 1 ? 's' : ''}`
        );
      } else {
        Alert.alert(
          'Partial Success',
          `Sent ${result.sent} email(s), ${result.failed} failed.\n\nCheck that team members are configured correctly.`
        );
      }

    } catch (error) {
      console.error('❌ Send emails error:', error);
      Alert.alert('Error', 'Failed to send emails: ' + error.message);
    } finally {
      setSendingEmails(false);
    }
  };

  const handleShare = async () => {
    try {
      let shareText = `📝 ${meeting.title}\n\n`;

      if (meeting.summary) {
        shareText += `Summary:\n${meeting.summary}\n\n`;
      }

      if (meeting.tasks && meeting.tasks.length > 0) {
        shareText += `Tasks:\n`;
        meeting.tasks.forEach((task, index) => {
          shareText += `${index + 1}. ${task.description}`;
          if (task.assignee !== 'Unassigned') {
            shareText += ` (${task.assignee})`;
          }
          if (task.completed) {
            shareText += ` ✅`;
          }
          shareText += `\n`;
        });
      }

      await Share.share({
        message: shareText,
        title: meeting.title,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const playAudio = async () => {
    if (!meeting?.audioUrl) {
      Alert.alert('Error', 'No audio file available');
      return;
    }

    try {
      if (sound) {
        if (isPlaying) {
          await sound.pauseAsync();
          setIsPlaying(false);
        } else {
          await sound.playAsync();
          setIsPlaying(true);
        }
        return;
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: meeting.audioUrl },
        { shouldPlay: true }
      );

      setSound(newSound);
      setIsPlaying(true);

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          setIsPlaying(false);
        }
      });
    } catch (error) {
      console.error('Play audio error:', error);
      Alert.alert('Error', 'Failed to play audio');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Meeting',
      'Are you sure you want to delete this meeting? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'meetings', meetingId));
              Alert.alert('Success', 'Meeting deleted', [
                { text: 'OK', onPress: () => navigation.goBack() }
              ]);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete meeting');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={styles.loadingText}>Loading meeting...</Text>
      </View>
    );
  }

  if (!meeting) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>❌</Text>
        <Text style={styles.errorText}>Meeting not found</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const completedCount = meeting.tasks?.filter(t => t.completed).length || 0;
  const totalTasks = meeting.tasks?.length || 0;
  const completionPercentage = totalTasks > 0
    ? Math.round((completedCount / totalTasks) * 100)
    : 0;

  return (
    <>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>{meeting.title}</Text>
          <Text style={styles.date}>
            {meeting.createdAt?.toLocaleDateString()} {' '}
            {meeting.createdAt?.toLocaleTimeString()}
          </Text>

          {meeting.duration && formatDuration(meeting.duration) && (
            <Text style={styles.duration}>
              ⏱️ Duration: {formatDuration(meeting.duration)}
            </Text>
          )}

          <View style={[
            styles.statusBadge,
            meeting.status === 'completed' && styles.statusCompleted,
            meeting.status === 'processing' && styles.statusProcessing,
            meeting.status === 'failed' && styles.statusFailed,
          ]}>
            <Text style={styles.statusText}>
              {meeting.status === 'completed' && '✅ Completed'}
              {meeting.status === 'processing' && '🔄 Processing...'}
              {meeting.status === 'failed' && '❌ Failed'}
              {meeting.status === 'uploaded' && '📤 Uploaded'}
            </Text>
          </View>

          <View style={styles.actionButtons}>
            {meeting.audioUrl && (
              <TouchableOpacity
                style={styles.playButton}
                onPress={playAudio}
                disabled={!meeting.audioUrl}
              >
                <Text style={styles.buttonText}>
                  {isPlaying ? '⏸️ Pause' : '▶️ Play'}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.downloadButton}
              onPress={handleDownloadAudio}
              disabled={downloading || !meeting.audioUrl}
            >
              {downloading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.buttonText}>⬇️ Download</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.exportButton}
              onPress={handleExportMeeting}
            >
              <Text style={styles.buttonText}>📄 Export</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.shareButton}
              onPress={handleShare}
            >
              <Text style={styles.buttonText}>📤 Share</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.regenerateButton}
              onPress={handleRegenerateTranscription}
              disabled={regenerating || !meeting.audioUrl || meeting.status === 'processing'}
            >
              {regenerating ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.buttonText}>🔄 Regenerate</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDelete}
            >
              <Text style={styles.buttonText}>🗑️ Delete</Text>
            </TouchableOpacity>
          </View>
        </View>

        {(meeting.status === 'processing' || regenerating) && (
          <View style={styles.processingNote}>
            <ActivityIndicator color={theme.warning} style={{ marginBottom: 10 }} />
            <Text style={styles.processingText}>
              {regenerating
                ? '🔄 Regenerating transcription with AI...'
                : 'AI is transcribing your meeting. This may take 1-2 minutes.'}
              {'\n\n'}Pull down to refresh.
            </Text>
          </View>
        )}

        {meeting.summary && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📝 Summary</Text>
            <Text style={styles.summaryText}>{meeting.summary}</Text>
          </View>
        )}

        {meeting.status === 'completed' && (
          <View style={styles.section}>
            <View style={styles.tasksSectionHeader}>
              <View style={styles.tasksTitleContainer}>
                <Text style={styles.sectionTitle}>✅ Tasks ({totalTasks})</Text>
                {totalTasks > 0 && (
                  <View style={styles.completionStatsContainer}>
                    <Text style={styles.completionStats}>
                      {completedCount} completed • {completionPercentage}%
                    </Text>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${completionPercentage}%` }
                        ]}
                      />
                    </View>
                  </View>
                )}
              </View>
              <View style={styles.tasksActions}>
                <TouchableOpacity
                  style={styles.addTaskButton}
                  onPress={handleAddTask}
                >
                  <Text style={styles.addTaskButtonText}>➕ Add</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.sendEmailButton}
                  onPress={handleSendEmails}
                  disabled={sendingEmails || !meeting.tasks || meeting.tasks.length === 0}
                >
                  {sendingEmails ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.sendEmailButtonText}>📧 Send Emails</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {meeting.tasks && meeting.tasks.length > 0 ? (
              meeting.tasks.map((task, index) => (
                <View key={index} style={styles.taskCardContainer}>
                  <TouchableOpacity
                    style={styles.checkbox}
                    onPress={() => handleToggleTaskComplete(index)}
                  >
                    <Text style={styles.checkboxIcon}>
                      {task.completed ? '✅' : '⬜'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.taskCard,
                      task.completed && styles.taskCardCompleted
                    ]}
                    onPress={() => handleEditTask(index)}
                    onLongPress={() => handleDeleteTask(index)}
                  >
                    <View style={styles.taskHeader}>
                      <Text style={[
                        styles.taskDescription,
                        task.completed && styles.taskDescriptionCompleted
                      ]}>
                        {task.description}
                      </Text>
                      <View style={[
                        styles.priorityBadge,
                        task.priority === 'High' && styles.priorityHigh,
                        task.priority === 'Medium' && styles.priorityMedium,
                        task.priority === 'Low' && styles.priorityLow,
                      ]}>
                        <Text style={styles.priorityText}>
                          {task.priority === 'High' && '🔴'}
                          {task.priority === 'Medium' && '🟡'}
                          {task.priority === 'Low' && '🟢'}
                          {' '}{task.priority}
                        </Text>
                      </View>
                    </View>
                    {task.assignee !== 'Unassigned' && (
                      <Text style={styles.taskAssignee}>👤 {task.assignee}</Text>
                    )}
                    {task.deadline !== 'No deadline' && (
                      <Text style={styles.taskDeadline}>📅 {task.deadline}</Text>
                    )}
                    {task.completed && task.completedAt && (
                      <Text style={styles.completedAt}>
                        ✓ Completed on {new Date(task.completedAt).toLocaleDateString()}
                      </Text>
                    )}
                    <Text style={styles.taskHint}>Tap to edit • Long press to delete</Text>
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <View style={styles.emptyTasks}>
                <Text style={styles.emptyTasksIcon}>📋</Text>
                <Text style={styles.emptyTasksText}>No tasks extracted</Text>
                <Text style={styles.emptyTasksSubtext}>Tap &quot;Add&quot; to create a task manually</Text>
              </View>
            )}
          </View>
        )}

        {meeting.transcript && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📄 Full Transcript</Text>
            <Text style={styles.transcriptText}>{meeting.transcript}</Text>
          </View>
        )}

        <View style={styles.footer}>
          {meeting.processedAt && (
            <Text style={styles.footerText}>
              Processed: {new Date(meeting.processedAt).toLocaleString()}
            </Text>
          )}
          {meeting.regeneratedAt && (
            <Text style={styles.footerText}>
              Last regenerated: {new Date(meeting.regeneratedAt).toLocaleString()}
            </Text>
          )}
          {meeting.emailSent && meeting.lastEmailSentAt && (
            <Text style={styles.footerText}>
              Emails sent: {new Date(meeting.lastEmailSentAt).toLocaleString()}
            </Text>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={showTaskModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTaskModal(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalKeyboardView}
          >
            <ScrollView
              style={styles.modalScrollView}
              contentContainerStyle={styles.modalContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.modalHeader}>
                <TouchableOpacity
                  onPress={() => setShowTaskModal(false)}
                  style={styles.modalCloseButton}
                >
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>
                  {editingTaskIndex !== null ? '✏️ Edit Task' : '➕ Add Task'}
                </Text>
              </View>

              <Text style={styles.modalLabel}>Task Description *</Text>
              <TextInput
                style={[styles.modalInput, styles.multilineInput]}
                placeholder="Enter task description"
                placeholderTextColor={theme.placeholder}
                value={taskDescription}
                onChangeText={setTaskDescription}
                multiline
                numberOfLines={3}
                maxLength={500}
              />

              <Text style={styles.modalLabel}>Assign To</Text>

              <View style={styles.assigneeChipsContainer}>
                <TouchableOpacity
                  style={[
                    styles.assigneeChip,
                    taskAssignee === 'Unassigned' && styles.assigneeChipSelected
                  ]}
                  onPress={() => setTaskAssignee('Unassigned')}
                >
                  <Text style={[
                    styles.assigneeChipText,
                    taskAssignee === 'Unassigned' && styles.assigneeChipTextSelected
                  ]}>
                    ⭕ Unassigned
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.assigneeChip,
                    taskAssignee === 'Everyone' && styles.assigneeChipSelected
                  ]}
                  onPress={() => setTaskAssignee('Everyone')}
                >
                  <Text style={[
                    styles.assigneeChipText,
                    taskAssignee === 'Everyone' && styles.assigneeChipTextSelected
                  ]}>
                    👥 Everyone
                  </Text>
                </TouchableOpacity>
              </View>

              {teamMembers.length > 0 ? (
                <>
                  <Text style={styles.subLabel}>Team Members:</Text>
                  <View style={styles.assigneeChipsContainer}>
                    {teamMembers.map((member) => (
                      <TouchableOpacity
                        key={member.id}
                        style={[
                          styles.assigneeChip,
                          taskAssignee === member.name && styles.assigneeChipSelected
                        ]}
                        onPress={() => setTaskAssignee(member.name)}
                      >
                        <Text style={[
                          styles.assigneeChipText,
                          taskAssignee === member.name && styles.assigneeChipTextSelected
                        ]}>
                          👤 {member.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              ) : (
                <View style={styles.noTeamMembersHint}>
                  <Text style={styles.hintText}>
                    💡 No team members configured yet.
                  </Text>
                  <TouchableOpacity
                    style={styles.hintButton}
                    onPress={() => {
                      setShowTaskModal(false);
                      navigation.navigate('TeamMember');
                    }}
                  >
                    <Text style={styles.hintButtonText}>
                      Add Team Members →
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              <Text style={styles.subLabel}>Or enter custom name:</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Type assignee name"
                placeholderTextColor={theme.placeholder}
                value={taskAssignee}
                onChangeText={setTaskAssignee}
                maxLength={100}
              />

              <Text style={styles.modalLabel}>Deadline</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g., Friday, Dec 20, Next week"
                placeholderTextColor={theme.placeholder}
                value={taskDeadline}
                onChangeText={setTaskDeadline}
                maxLength={100}
              />

              <Text style={styles.modalLabel}>Priority</Text>
              <View style={styles.prioritySelector}>
                {['High', 'Medium', 'Low'].map(priority => (
                  <TouchableOpacity
                    key={priority}
                    style={[
                      styles.priorityOption,
                      taskPriority === priority && styles.priorityOptionSelected,
                      priority === 'High' && styles.priorityHighBorder,
                      priority === 'Medium' && styles.priorityMediumBorder,
                      priority === 'Low' && styles.priorityLowBorder,
                    ]}
                    onPress={() => setTaskPriority(priority)}
                  >
                    <Text style={[
                      styles.priorityOptionText,
                      taskPriority === priority && styles.priorityOptionTextSelected
                    ]}>
                      {priority === 'High' && '🔴'}
                      {priority === 'Medium' && '🟡'}
                      {priority === 'Low' && '🟢'}
                      {' '}{priority}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalCancelButton]}
                  onPress={() => setShowTaskModal(false)}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.modalConfirmButton]}
                  onPress={handleSaveTask}
                >
                  <Text style={[styles.modalButtonText, { color: 'white' }]}>
                    Save Task
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  );
};

const createStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.background,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: theme.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.background,
    padding: 20,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  errorText: {
    fontSize: 18,
    color: theme.textSecondary,
    marginBottom: 30,
  },
  backButton: {
    backgroundColor: theme.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: theme.textInverse,
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    backgroundColor: theme.surface,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: theme.text,
  },
  date: {
    fontSize: 14,
    color: theme.textSecondary,
    marginBottom: 4,
  },
  duration: {
    fontSize: 13,
    color: theme.textSecondary,
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 15,
  },
  statusCompleted: {
    backgroundColor: theme.statusCompleted,
  },
  statusProcessing: {
    backgroundColor: theme.statusProcessing,
  },
  statusFailed: {
    backgroundColor: theme.statusFailed,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.text,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  playButton: {
    flex: 1,
    backgroundColor: theme.success,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  downloadButton: {
    flex: 1,
    backgroundColor: theme.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  exportButton: {
    flex: 1,
    backgroundColor: theme.accent,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  shareButton: {
    flex: 1,
    backgroundColor: theme.info,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  regenerateButton: {
    flex: 1,
    backgroundColor: theme.warning,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteButton: {
    flex: 1,
    backgroundColor: theme.error,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: theme.textInverse,
    fontSize: 13,
    fontWeight: '600',
  },
  processingNote: {
    backgroundColor: theme.statusProcessing,
    padding: 20,
    margin: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  processingText: {
    fontSize: 14,
    color: theme.text,
    textAlign: 'center',
    lineHeight: 20,
  },
  section: {
    backgroundColor: theme.surface,
    padding: 20,
    marginTop: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: theme.text,
  },
  summaryText: {
    fontSize: 15,
    lineHeight: 24,
    color: theme.text,
  },
  tasksSectionHeader: {
    marginBottom: 15,
  },
  tasksTitleContainer: {
    marginBottom: 12,
  },
  completionStatsContainer: {
    marginTop: 8,
  },
  completionStats: {
    fontSize: 13,
    color: theme.success,
    marginBottom: 6,
    fontWeight: '600',
  },
  progressBar: {
    height: 6,
    backgroundColor: theme.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.success,
    borderRadius: 3,
  },
  tasksActions: {
    flexDirection: 'row',
    gap: 8,
  },
  addTaskButton: {
    backgroundColor: theme.success,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addTaskButtonText: {
    color: theme.textInverse,
    fontSize: 12,
    fontWeight: '600',
  },
  sendEmailButton: {
    backgroundColor: theme.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  sendEmailButtonText: {
    color: theme.textInverse,
    fontSize: 12,
    fontWeight: '600',
  },
  taskCardContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  checkbox: {
    marginRight: 10,
    marginTop: 15,
  },
  checkboxIcon: {
    fontSize: 24,
  },
  taskCard: {
    flex: 1,
    backgroundColor: theme.surfaceAlt,
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: theme.primary,
  },
  taskCardCompleted: {
    opacity: 0.6,
    backgroundColor: theme.surfaceAlt,
    borderLeftColor: theme.success,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  taskDescription: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    marginRight: 10,
    color: theme.text,
  },
  taskDescriptionCompleted: {
    textDecorationLine: 'line-through',
    color: theme.textTertiary,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  priorityHigh: {
    backgroundColor: theme.priorityHigh,
  },
  priorityMedium: {
    backgroundColor: theme.priorityMedium,
  },
  priorityLow: {
    backgroundColor: theme.priorityLow,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.text,
  },
  taskAssignee: {
    fontSize: 14,
    color: theme.textSecondary,
    marginTop: 4,
  },
  taskDeadline: {
    fontSize: 14,
    color: theme.textSecondary,
    marginTop: 4,
  },
  completedAt: {
    fontSize: 12,
    color: theme.success,
    marginTop: 6,
    fontStyle: 'italic',
  },
  taskHint: {
    fontSize: 11,
    color: theme.textTertiary,
    marginTop: 8,
    fontStyle: 'italic',
  },
  emptyTasks: {
    padding: 40,
    alignItems: 'center',
  },
  emptyTasksIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTasksText: {
    fontSize: 16,
    color: theme.textSecondary,
    marginBottom: 5,
    fontWeight: '600',
  },
  emptyTasksSubtext: {
    fontSize: 14,
    color: theme.textTertiary,
  },
  transcriptText: {
    fontSize: 14,
    lineHeight: 22,
    color: theme.text,
  },
  footer: {
    padding: 20,
    backgroundColor: theme.surfaceAlt,
    marginTop: 20,
  },
  footerText: {
    fontSize: 12,
    color: theme.textTertiary,
    marginBottom: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.modalOverlay,
    justifyContent: 'flex-end',
  },
  modalKeyboardView: {
    width: '100%',
    maxHeight: '90%',
  },
  modalScrollView: {
    backgroundColor: theme.modalBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalContent: {
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.inputBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalCloseText: {
    fontSize: 18,
    color: theme.textSecondary,
    fontWeight: 'bold',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.text,
    flex: 1,
  },
  modalLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 10,
    marginTop: 16,
  },
  subLabel: {
    fontSize: 13,
    color: theme.textSecondary,
    marginBottom: 8,
    marginTop: 8,
  },
  modalInput: {
    backgroundColor: theme.inputBackground,
    borderWidth: 1,
    borderColor: theme.inputBorder,
    padding: 15,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 12,
    color: theme.text,
  },
  multilineInput: {
    height: 90,
    textAlignVertical: 'top',
    paddingTop: 15,
  },
  assigneeChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  assigneeChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: theme.inputBackground,
    borderWidth: 2,
    borderColor: theme.border,
  },
  assigneeChipSelected: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  assigneeChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.text,
  },
  assigneeChipTextSelected: {
    color: theme.textInverse,
  },
  noTeamMembersHint: {
    backgroundColor: theme.statusProcessing,
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: theme.warning,
  },
  hintText: {
    fontSize: 13,
    color: theme.text,
    marginBottom: 10,
  },
  hintButton: {
    alignSelf: 'flex-start',
  },
  hintButtonText: {
    fontSize: 13,
    color: theme.primary,
    fontWeight: '600',
  },
  prioritySelector: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  priorityOption: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    backgroundColor: theme.surfaceAlt,
  },
  priorityOptionSelected: {
    borderWidth: 3,
    backgroundColor: theme.surface,
  },
  priorityHighBorder: {
    borderColor: theme.priorityHighBorder,
  },
  priorityMediumBorder: {
    borderColor: theme.priorityMediumBorder,
  },
  priorityLowBorder: {
    borderColor: theme.priorityLowBorder,
  },
  priorityOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.textSecondary,
  },
  priorityOptionTextSelected: {
    color: theme.text,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelButton: {
    backgroundColor: theme.inputBackground,
  },
  modalConfirmButton: {
    backgroundColor: theme.primary,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.text,
  },
});

export default MeetingDetailScreen;