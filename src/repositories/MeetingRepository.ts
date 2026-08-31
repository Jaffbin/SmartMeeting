import { collection, doc, getDoc, getDocs, orderBy, query, Timestamp, updateDoc, where, addDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { Meeting, Task } from '../types';
import { ErrorHandler } from '../utils/errors/ErrorHandler';

/**
 * 会议数据访问层
 * 负责与 Firestore 的直接交互，不包含业务逻辑
 */
export const MeetingRepository = {
  /**
   * 获取用户的所有会议
   */
  getUserMeetings: async (userId?: string): Promise<Meeting[]> => {
    try {
      const currentUserId = userId || auth.currentUser?.uid;
      
      if (!currentUserId) {
        throw new Error('User not authenticated');
      }

      const meetingsRef = collection(db, 'meetings');
      
      let querySnapshot;
      try {
        // 尝试使用 orderBy 查询（需要复合索引）
        const q = query(
          meetingsRef,
          where('userId', '==', currentUserId),
          orderBy('createdAt', 'desc')
        );
        querySnapshot = await getDocs(q);
      } catch (orderByError) {
        console.warn('OrderBy failed, querying without orderBy:', orderByError);
        // 降级到无排序查询
        const q = query(meetingsRef, where('userId', '==', currentUserId));
        querySnapshot = await getDocs(q);
      }

      const meetings: Meeting[] = [];

      querySnapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        let createdAt: Date;
        
        if (data.createdAt?.toDate) {
          createdAt = data.createdAt.toDate();
        } else if (data.createdAt) {
          createdAt = new Date(data.createdAt as string | number);
        } else {
          createdAt = new Date();
        }

        meetings.push({
          id: docSnapshot.id,
          ...data,
          createdAt,
        } as Meeting);
      });

      // 如果查询时未排序，则在内存中排序
      if (querySnapshot.docs.length > 0 && !orderByError) {
        meetings.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      }

      return meetings;
    } catch (error) {
      console.error('❌ Get user meetings error:', error);
      throw error;
    }
  },

  /**
   * 根据 ID 获取单个会议
   */
  getMeetingById: async (meetingId: string): Promise<Meeting | null> => {
    try {
      const meetingRef = doc(db, 'meetings', meetingId);
      const meetingDoc = await getDoc(meetingRef);

      if (!meetingDoc.exists()) {
        return null;
      }

      const data = meetingDoc.data();
      let createdAt: Date;
      
      if (data.createdAt?.toDate) {
        createdAt = data.createdAt.toDate();
      } else if (data.createdAt) {
        createdAt = new Date(data.createdAt as string | number);
      } else {
        createdAt = new Date();
      }

      return {
        id: meetingDoc.id,
        ...data,
        createdAt,
      } as Meeting;
    } catch (error) {
      console.error('❌ Get meeting by ID error:', error);
      throw error;
    }
  },

  /**
   * 创建新会议记录
   */
  createMeeting: async (meetingData: {
    title: string;
    audioUrl: string;
    fileName?: string;
    userId: string;
  }): Promise<string> => {
    try {
      const meetingRef = await addDoc(collection(db, 'meetings'), {
        ...meetingData,
        createdAt: Timestamp.now(),
        status: 'processing',
        transcript: '',
        summary: '',
        tasks: [],
        emailSent: false,
      });

      return meetingRef.id;
    } catch (error) {
      console.error('❌ Create meeting error:', error);
      throw error;
    }
  },

  /**
   * 更新会议状态为处理中
   */
  updateStatusToProcessing: async (meetingId: string): Promise<void> => {
    try {
      const meetingRef = doc(db, 'meetings', meetingId);
      await updateDoc(meetingRef, {
        status: 'processing',
        error: null,
        failedAt: null,
      });
    } catch (error) {
      console.error('❌ Update status to processing error:', error);
      throw error;
    }
  },

  /**
   * 更新会议为已完成状态
   */
  updateMeetingCompleted: async (
    meetingId: string,
    transcriptionResult: {
      transcript: string;
      summary: string;
      tasks: Task[];
    }
  ): Promise<void> => {
    try {
      const meetingRef = doc(db, 'meetings', meetingId);
      await updateDoc(meetingRef, {
        status: 'completed',
        transcript: transcriptionResult.transcript,
        summary: transcriptionResult.summary,
        tasks: transcriptionResult.tasks,
        processedAt: new Date().toISOString(),
        emailSent: false,
      });
    } catch (error) {
      console.error('❌ Update meeting completed error:', error);
      throw error;
    }
  },

  /**
   * 更新会议为失败状态
   */
  updateMeetingFailed: async (
    meetingId: string,
    errorMessage: string
  ): Promise<void> => {
    try {
      const meetingRef = doc(db, 'meetings', meetingId);
      await updateDoc(meetingRef, {
        status: 'failed',
        error: errorMessage,
        failedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('❌ Update meeting failed error:', error);
      throw error;
    }
  },

  /**
   * 更新会议任务
   */
  updateMeetingTasks: async (
    meetingId: string,
    tasks: Task[]
  ): Promise<void> => {
    try {
      const meetingRef = doc(db, 'meetings', meetingId);
      await updateDoc(meetingRef, {
        tasks,
        tasksUpdatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('❌ Update meeting tasks error:', error);
      throw error;
    }
  },

  /**
   * 更新邮件发送状态
   */
  updateEmailStatus: async (
    meetingId: string,
    emailResult: {
      success: boolean;
      sent: number;
      failed: number;
    }
  ): Promise<void> => {
    try {
      const meetingRef = doc(db, 'meetings', meetingId);
      await updateDoc(meetingRef, {
        emailSent: emailResult.success,
        emailsSentCount: emailResult.sent,
        emailsFailedCount: emailResult.failed,
        emailSentAt: new Date().toISOString(),
        lastEmailResult: emailResult,
      });
    } catch (error) {
      console.error('❌ Update email status error:', error);
      throw error;
    }
  },

  /**
   * 重试转录
   */
  retryTranscription: async (meetingId: string): Promise<void> => {
    try {
      const meetingRef = doc(db, 'meetings', meetingId);
      await updateDoc(meetingRef, {
        status: 'processing',
        error: null,
        failedAt: null,
      });
    } catch (error) {
      console.error('❌ Retry transcription error:', error);
      throw error;
    }
  },

  /**
   * 删除会议
   */
  deleteMeeting: async (meetingId: string): Promise<void> => {
    try {
      // TODO: 同时删除 Storage 中的音频文件
      const meetingRef = doc(db, 'meetings', meetingId);
      // Note: Firebase Admin SDK required for deletion in client-side code
      // For now, we can only soft-delete or require server-side deletion
      await updateDoc(meetingRef, {
        deleted: true,
        deletedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('❌ Delete meeting error:', error);
      throw error;
    }
  },

  /**
   * 搜索用户的会议
   */
  searchMeetings: async (
    userId: string,
    searchTerm: string
  ): Promise<Meeting[]> => {
    try {
      const meetings = await MeetingRepository.getUserMeetings(userId);
      
      return meetings.filter(meeting =>
        meeting.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        meeting.transcript?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        meeting.summary?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    } catch (error) {
      console.error('❌ Search meetings error:', error);
      throw error;
    }
  },
};

export default MeetingRepository;
