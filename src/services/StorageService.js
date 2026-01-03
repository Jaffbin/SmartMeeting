import { addDoc, collection, doc, getDocs, orderBy, query, Timestamp, updateDoc, where } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { auth, db, storage } from '../config/firebase';
import { EmailService } from './EmailService';
import { GeminiService } from './GeminiService';

export const StorageService = {
  getUserMeetings: async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const meetingsRef = collection(db, 'meetings');
      
      let querySnapshot;
      try {
        const q = query(
          meetingsRef,
          where('userId', '==', userId),
          orderBy('createdAt', 'desc')
        );
        querySnapshot = await getDocs(q);
      } catch (orderByError) {
        console.warn('OrderBy failed, querying without orderBy:', orderByError);
        const q = query(
          meetingsRef,
          where('userId', '==', userId)
        );
        querySnapshot = await getDocs(q);
      }

      const meetings = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        let createdAt;
        
        if (data.createdAt?.toDate) {
          createdAt = data.createdAt.toDate();
        } else if (data.createdAt) {
          createdAt = new Date(data.createdAt);
        } else {
          createdAt = new Date();
        }

        meetings.push({
          id: doc.id,
          ...data,
          createdAt: createdAt,
        });
      });

      meetings.sort((a, b) => b.createdAt - a.createdAt);

      return meetings;
    } catch (error) {
      console.error('❌ Get user meetings error:', error);
      throw error;
    }
  },

  uploadAndTranscribe: async (uri, meetingTitle) => {
    try {
      console.log('📤 Starting upload and transcribe process...');
      console.log('Audio URI:', uri);
      console.log('Meeting Title:', meetingTitle);
  
      const userId = auth.currentUser?.uid;
      if (!userId) {
        throw new Error('User not authenticated');
      }
  
      try {
        const fileInfo = await FileSystem.getInfoAsync(uri);
        if (fileInfo.exists && fileInfo.size) {
          const fileSizeMB = (fileInfo.size / 1024 / 1024).toFixed(2);
          console.log('📦 File size:', fileSizeMB, 'MB');
          
          if (fileInfo.size > 20 * 1024 * 1024) {
            throw new Error(`File too large (${fileSizeMB}MB). Maximum size is 20MB.`);
          }
          
          if (fileInfo.size < 1024) {
            throw new Error('File too small to be a valid audio recording.');
          }
        }
      } catch (sizeCheckError) {
        if (sizeCheckError.message.includes('too large') || sizeCheckError.message.includes('too small')) {
          throw sizeCheckError;
        }
        console.warn('⚠️ Could not verify file size:', sizeCheckError);
      }
  
      const fileName = `meeting_${Date.now()}.m4a`;
      const storageRef = ref(storage, `meetings/${userId}/${fileName}`);
  
      const response = await fetch(uri);
      const blob = await response.blob();
  
      console.log('📦 Blob created, size:', blob.size);
  
      if (blob.size > 20 * 1024 * 1024) {
        throw new Error('File exceeds 20MB limit after processing');
      }
  
      await uploadBytes(storageRef, blob);
      console.log('✅ File uploaded to Firebase Storage');
  
      const audioUrl = await getDownloadURL(storageRef);
      console.log('🔗 Audio URL obtained:', audioUrl);
  
      const meetingData = {
        title: meetingTitle,
        audioUrl: audioUrl,
        fileName: fileName,
        createdAt: Timestamp.now(),
        userId: userId,
        status: 'processing',
        transcript: '',
        summary: '',
        tasks: [],
        emailSent: false,
      };
  
      const meetingRef = await addDoc(collection(db, 'meetings'), meetingData);
      console.log('✅ Meeting document created with ID:', meetingRef.id);
  
      transcribeInBackground(meetingRef.id, audioUrl, meetingTitle).catch(err => {
        console.error('Background transcription error:', err);
      });
  
      return {
        success: true,
        meetingId: meetingRef.id
      };
  
    } catch (error) {
      console.error('❌ Upload and transcribe error:', error);
      throw error;
    }
  },

  retryTranscription: async (meetingId, audioUrl, meetingTitle) => {
    try {
      console.log('🔄 Retrying transcription for meeting:', meetingId);
      
      const meetingRef = doc(db, 'meetings', meetingId);
      await updateDoc(meetingRef, {
        status: 'processing',
        error: null,
        failedAt: null,
      });

      await transcribeInBackground(meetingId, audioUrl, meetingTitle);
      
      return { success: true };
    } catch (error) {
      console.error('❌ Retry transcription error:', error);
      throw error;
    }
  },

  sendTaskEmails: async (meetingId, tasks, meetingTitle) => {
    try {
      console.log('📧 Manually sending task assignment emails...');
      
      const emailResult = await EmailService.sendTaskAssignmentEmails(
        tasks,
        meetingId,
        meetingTitle
      );

      const meetingRef = doc(db, 'meetings', meetingId);
      await updateDoc(meetingRef, {
        emailSent: emailResult.success,
        emailsSentCount: emailResult.sent,
        emailsFailedCount: emailResult.failed,
        emailSentAt: new Date().toISOString(),
        lastEmailResult: emailResult,
      });

      return emailResult;
    } catch (error) {
      console.error('❌ Send task emails error:', error);
      throw error;
    }
  },

  updateMeetingTasks: async (meetingId, tasks) => {
    try {
      console.log('📝 Updating meeting tasks...');
      
      const meetingRef = doc(db, 'meetings', meetingId);
      await updateDoc(meetingRef, {
        tasks: tasks,
        tasksUpdatedAt: new Date().toISOString(),
      });

      return { success: true };
    } catch (error) {
      console.error('❌ Update tasks error:', error);
      throw error;
    }
  },
};

const transcribeInBackground = async (meetingId, audioUrl, meetingTitle) => {
  try {
    console.log('🔄 Starting background transcription for meeting:', meetingId);

    const result = await GeminiService.transcribeAndExtractTasks(audioUrl);
    console.log('✅ Transcription completed');

    const meetingRef = doc(db, 'meetings', meetingId);

    await updateDoc(meetingRef, {
      status: 'completed',
      transcript: result.transcript,
      summary: result.summary,
      tasks: result.tasks,
      processedAt: new Date().toISOString(),
      emailSent: false, 
    });

    console.log('✅ Meeting document updated');
    console.log('ℹ️ Tasks ready for review. Email will be sent manually.');


  } catch (error) {
    console.error('❌ Background transcription error:', error);

    try {
      const meetingRef = doc(db, 'meetings', meetingId);
      await updateDoc(meetingRef, {
        status: 'failed',
        error: error.message,
        failedAt: new Date().toISOString(),
      });
    } catch (updateError) {
      console.error('❌ Failed to update error status:', updateError);
    }
  }
};