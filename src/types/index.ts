/**
 * 应用通用类型定义
 */

/**
 * 用户接口
 */
export interface User {
  uid: string;
  email: string | null;
  displayName?: string;
  photoURL?: string;
  createdAt?: string;
  theme?: 'light' | 'dark';
}

/**
 * 团队成员接口
 */
export interface TeamMember {
  id?: string;
  name: string;
  email: string;
  role?: string;
  createdAt?: string;
}

/**
 * 任务优先级
 */
export type TaskPriority = 'High' | 'Medium' | 'Low' | '高' | '中' | '低';

/**
 * 任务接口
 */
export interface Task {
  id?: string;
  description: string;
  assignee: string;
  deadline: string;
  priority: TaskPriority;
  completed?: boolean;
  completedAt?: string;
}

/**
 * 会议状态
 */
export type MeetingStatus = 'processing' | 'completed' | 'failed';

/**
 * 会议接口
 */
export interface Meeting {
  id: string;
  title: string;
  audioUrl: string;
  fileName?: string;
  userId: string;
  status: MeetingStatus;
  transcript: string;
  summary: string;
  tasks: Task[];
  emailSent?: boolean;
  emailsSentCount?: number;
  emailsFailedCount?: number;
  emailSentAt?: string;
  lastEmailResult?: EmailResult;
  error?: string;
  createdAt: Date | number | { toDate: () => Date };
  processedAt?: string;
  tasksUpdatedAt?: string;
}

/**
 * 邮件结果接口
 */
export interface EmailResult {
  success: boolean;
  sent: number;
  failed: number;
  total?: number;
  errors?: Array<{
    task: string;
    assignee: string;
    reason: string;
  }>;
}

/**
 * Gemini API 响应结构
 */
export interface GeminiResponse {
  candidates?: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

/**
 * 转录结果接口
 */
export interface TranscriptionResult {
  transcript: string;
  summary: string;
  tasks: Task[];
}

/**
 * 上传结果接口
 */
export interface UploadResult {
  success: boolean;
  meetingId: string;
  audioUrl?: string;
}

/**
 * 主题配置接口
 */
export interface Theme {
  // Primary Colors
  primary: string;
  primaryDark: string;
  primaryLight: string;

  // Background Colors
  background: string;
  surface: string;
  surfaceAlt: string;

  // Text Colors
  text: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;

  // Status Colors
  success: string;
  warning: string;
  error: string;
  info: string;

  // Border & Divider
  border: string;
  divider: string;

  // Task Priority Colors
  priorityHigh: string;
  priorityHighBorder: string;
  priorityMedium: string;
  priorityMediumBorder: string;
  priorityLow: string;
  priorityLowBorder: string;

  // Special Colors
  accent: string;
  overlay: string;
  shadow: string;

  // Status Badge Colors
  statusCompleted: string;
  statusProcessing: string;
  statusFailed: string;

  // Card Colors
  cardBackground: string;
  cardBorder: string;

  // Input Colors
  inputBackground: string;
  inputBorder: string;
  placeholder: string;

  // Modal Colors
  modalBackground: string;
  modalOverlay: string;
}

/**
 * 主题上下文接口
 */
export interface ThemeContextType {
  theme: Theme;
  isDarkMode: boolean;
  toggleTheme: () => void;
  isLoading: boolean;
}

/**
 * 导航参数类型
 */
export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  Recording: undefined;
  Upload: undefined;
  MeetingDetail: { meetingId: string; meetingTitle: string };
  Profile: undefined;
  TeamMember: undefined;
};

/**
 * 音频录制状态
 */
export type RecordingState = 'idle' | 'recording' | 'paused' | 'stopped';

/**
 * 音频格式类型
 */
export type AudioFormat = 'm4a' | 'mp3' | 'wav' | 'aac' | 'ogg';

/**
 * 文件信息接口
 */
export interface FileInfo {
  uri: string;
  name: string;
  size: number;
  mimeType?: string;
  format?: AudioFormat;
}

/**
 * API 配置接口
 */
export interface ApiConfig {
  geminiApiKey: string;
  geminiApiUrl: string;
  firebaseConfig: FirebaseConfig;
}

/**
 * Firebase 配置接口
 */
export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

/**
 * 分页参数
 */
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * 分页结果
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * 服务响应包装器
 */
export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}
