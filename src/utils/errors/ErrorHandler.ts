import * as FileSystem from 'expo-file-system';
import { auth } from '../config/firebase';
import {
  AppError,
  NetworkError,
  AuthError,
  ValidationError,
  ApiError,
  FileError,
  PermissionError,
  UnknownError,
  ErrorType,
} from './AppError';

/**
 * 错误上下文信息
 */
interface ErrorContext {
  context?: string;
  userId?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Firebase 错误代码映射
 */
const FIREBASE_ERROR_MAP: Record<string, { type: ErrorType; userMessage: string }> = {
  // 认证错误
  'auth/invalid-credential': {
    type: ErrorType.AUTH,
    userMessage: 'Incorrect email or password. Please try again.',
  },
  'auth/user-not-found': {
    type: ErrorType.AUTH,
    userMessage: 'Account not found. Please register first.',
  },
  'auth/wrong-password': {
    type: ErrorType.AUTH,
    userMessage: 'Incorrect password.',
  },
  'auth/invalid-email': {
    type: ErrorType.VALIDATION,
    userMessage: 'Invalid email address. Please check and try again.',
  },
  'auth/email-already-in-use': {
    type: ErrorType.AUTH,
    userMessage: 'This email is already registered. Try logging in instead.',
  },
  'auth/weak-password': {
    type: ErrorType.VALIDATION,
    userMessage: 'Password is too weak. Use at least 6 characters.',
  },
  'auth/too-many-requests': {
    type: ErrorType.PERMISSION,
    userMessage: 'Too many attempts. Please try again later.',
  },
  'auth/network-request-failed': {
    type: ErrorType.NETWORK,
    userMessage: 'Network error. Check your internet connection.',
  },
  'auth/operation-not-allowed': {
    type: ErrorType.PERMISSION,
    userMessage: 'This operation is not allowed. Contact support.',
  },
  'auth/user-disabled': {
    type: ErrorType.PERMISSION,
    userMessage: 'This account has been disabled. Contact support.',
  },
  'auth/unauthorized-domain': {
    type: ErrorType.PERMISSION,
    userMessage: 'This domain is not authorized. Contact support.',
  },

  // Firestore 错误
  'permission-denied': {
    type: ErrorType.PERMISSION,
    userMessage: 'You do not have permission to perform this action.',
  },
  'unavailable': {
    type: ErrorType.NETWORK,
    userMessage: 'Service temporarily unavailable. Please try again later.',
  },
  'deadline-exceeded': {
    type: ErrorType.NETWORK,
    userMessage: 'Request timed out. Please check your connection and try again.',
  },

  // Storage 错误
  'storage/unauthorized': {
    type: ErrorType.PERMISSION,
    userMessage: 'You do not have permission to upload files.',
  },
  'storage/canceled': {
    type: ErrorType.FILE,
    userMessage: 'File upload was canceled.',
  },
  'storage/unknown': {
    type: ErrorType.FILE,
    userMessage: 'An error occurred while uploading the file.',
  },
};

/**
 * API 错误消息映射
 */
const API_ERROR_KEYWORDS: Record<string, { type: ErrorType; userMessage: string }> = {
  'File too large': {
    type: ErrorType.FILE,
    userMessage:
      'File exceeds 20MB limit. Please use a shorter recording or compress the audio.',
  },
  'too large': {
    type: ErrorType.FILE,
    userMessage: 'Audio file is too large (max 20MB).',
  },
  'File too small': {
    type: ErrorType.FILE,
    userMessage: 'File is too small or corrupted.',
  },
  'too small': {
    type: ErrorType.FILE,
    userMessage: 'File appears to be empty or corrupted.',
  },
  'Base64 conversion timed out': {
    type: ErrorType.FILE,
    userMessage: 'File processing timed out. The file may be too large.',
  },
  'Failed to process audio': {
    type: ErrorType.FILE,
    userMessage: 'Could not process the audio file. Please try again.',
  },
  'Gemini API error': {
    type: ErrorType.API,
    userMessage: 'AI transcription failed. Please try again later.',
  },
  'Failed to download audio': {
    type: ErrorType.NETWORK,
    userMessage: 'Could not download audio file. Check your internet.',
  },
  'Network request failed': {
    type: ErrorType.NETWORK,
    userMessage: 'Network error. Please check your connection.',
  },
};

/**
 * 智能错误分类器
 */
export const ErrorHandler = {
  /**
   * 处理未知错误并转换为 AppError
   */
  handle: (error: unknown, context: string = 'operation'): AppError => {
    const userId = auth.currentUser?.uid;
    const errorContext: ErrorContext = { context, userId };

    console.error(`❌ ${context} error:`, error);

    // 已经是 AppError，直接返回
    if (error instanceof AppError) {
      return error;
    }

    // 处理 Error 对象
    if (error instanceof Error) {
      const mappedError = this.mapKnownError(error, errorContext);
      if (mappedError) {
        return mappedError;
      }

      // 默认未知错误
      return new UnknownError(error.message, {
        originalError: error,
        metadata: errorContext.metadata,
      });
    }

    // 处理字符串错误
    if (typeof error === 'string') {
      const mappedError = this.mapStringError(error, errorContext);
      if (mappedError) {
        return mappedError;
      }

      return new UnknownError(error, {
        metadata: errorContext.metadata,
      });
    }

    // 处理对象错误（如 API 响应）
    if (typeof error === 'object' && error !== null) {
      const objError = error as Record<string, unknown>;
      
      // 检查是否有 statusCode（HTTP 错误）
      if ('statusCode' in objError) {
        return new ApiError(String(objError.message || 'API request failed'), {
          code: String(objError.code),
          statusCode: Number(objError.statusCode),
          originalError: error,
          metadata: errorContext.metadata,
        });
      }

      // 检查是否有 code（Firebase 错误）
      if ('code' in objError) {
        const firebaseError = this.mapFirebaseError(
          String(objError.code),
          String(objError.message || 'Unknown error'),
          errorContext
        );
        if (firebaseError) {
          return firebaseError;
        }
      }
    }

    // 完全未知错误
    return new UnknownError('An unexpected error occurred', {
      originalError: error,
      metadata: errorContext.metadata,
    });
  },

  /**
   * 映射已知的 Error 对象
   */
  mapKnownError: (error: Error, context: ErrorContext): AppError | null => {
    // 检查 Firebase 错误代码
    const firebaseCode = (error as Record<string, unknown>).code as string | undefined;
    if (firebaseCode) {
      return this.mapFirebaseError(firebaseCode, error.message, context);
    }

    // 检查 API 错误关键词
    for (const [keyword, mapping] of Object.entries(API_ERROR_KEYWORDS)) {
      if (error.message.includes(keyword)) {
        return new AppError(error.message, mapping.type, {
          code: keyword,
          userMessage: mapping.userMessage,
          originalError: error,
          metadata: context.metadata,
        });
      }
    }

    // 网络错误检测
    if (
      error.message.includes('Network') ||
      error.message.includes('network') ||
      error.message.includes('fetch') ||
      error.message.includes('connection')
    ) {
      return new NetworkError(error.message, {
        originalError: error,
        metadata: context.metadata,
      });
    }

    return null;
  },

  /**
   * 映射 Firebase 错误
   */
  mapFirebaseError: (
    code: string,
    message: string,
    context: ErrorContext
  ): AppError | null => {
    const mapping = FIREBASE_ERROR_MAP[code];

    if (mapping) {
      switch (mapping.type) {
        case ErrorType.AUTH:
          return new AuthError(message, {
            code,
            userMessage: mapping.userMessage,
            metadata: context.metadata,
          });
        case ErrorType.NETWORK:
          return new NetworkError(message, {
            code,
            userMessage: mapping.userMessage,
            metadata: context.metadata,
          });
        case ErrorType.PERMISSION:
          return new PermissionError(message, {
            code,
            userMessage: mapping.userMessage,
            metadata: context.metadata,
          });
        case ErrorType.FILE:
          return new FileError(message, {
            code,
            userMessage: mapping.userMessage,
            metadata: context.metadata,
          });
        default:
          return new AppError(message, mapping.type, {
            code,
            userMessage: mapping.userMessage,
            metadata: context.metadata,
          });
      }
    }

    return null;
  },

  /**
   * 映射字符串错误
   */
  mapStringError: (message: string, context: ErrorContext): AppError | null => {
    for (const [keyword, mapping] of Object.entries(API_ERROR_KEYWORDS)) {
      if (message.includes(keyword)) {
        return new AppError(message, mapping.type, {
          code: keyword,
          userMessage: mapping.userMessage,
          metadata: context.metadata,
        });
      }
    }
    return null;
  },

  /**
   * 验证输入
   */
  validateInput: {
    email: (email: string): void => {
      if (!email || !email.trim()) {
        throw new ValidationError('Email is required', { field: 'email' });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        throw new ValidationError('Invalid email format', { field: 'email' });
      }
    },

    password: (password: string, minLength: number = 6): void => {
      if (!password || password.length < minLength) {
        throw new ValidationError(`Password must be at least ${minLength} characters`, {
          field: 'password',
        });
      }
    },

    fileName: (name: string): void => {
      if (!name || !name.trim()) {
        throw new ValidationError('Meeting title is required', { field: 'title' });
      }

      if (name.trim().length < 3) {
        throw new ValidationError('Meeting title must be at least 3 characters', {
          field: 'title',
        });
      }

      if (name.trim().length > 100) {
        throw new ValidationError('Meeting title must be less than 100 characters', {
          field: 'title',
        });
      }
    },

    fileSize: async (uri: string, maxSizeMB: number = 20): Promise<void> => {
      try {
        const fileInfo = await FileSystem.getInfoAsync(uri);

        if (!fileInfo.exists) {
          throw new FileError('File not found');
        }

        if (!fileInfo.size) {
          throw new FileError('Unable to determine file size');
        }

        const maxSizeBytes = maxSizeMB * 1024 * 1024;
        if (fileInfo.size > maxSizeBytes) {
          const actualSizeMB = (fileInfo.size / 1024 / 1024).toFixed(2);
          throw new FileError(
            `File too large (${actualSizeMB}MB). Maximum size is ${maxSizeMB}MB.`,
            {
              metadata: { actualSize: fileInfo.size, maxSize: maxSizeBytes },
            }
          );
        }

        if (fileInfo.size < 1024) {
          throw new FileError('File too small to be a valid audio recording');
        }
      } catch (error) {
        if (error instanceof AppError) {
          throw error;
        }
        throw new FileError('Failed to validate file size', { originalError: error });
      }
    },
  },

  /**
   * 记录错误到分析服务（预留接口）
   */
  log: (
    error: AppError,
    additionalMetadata?: Record<string, unknown>
  ): void => {
    const logData = {
      ...error.toJSON(),
      additionalMetadata,
    };

    // TODO: 集成到错误分析服务（如 Sentry、Firebase Crashlytics）
    console.log('[Error Log]', JSON.stringify(logData, null, 2));

    // 示例：发送到分析服务
    // analytics.track('error_occurred', logData);
  },

  /**
   * 显示用户友好的错误消息
   */
  getUserMessage: (error: unknown, fallbackMessage?: string): string => {
    if (error instanceof AppError) {
      return error.userMessage;
    }

    if (error instanceof Error) {
      // 尝试映射已知错误
      const mapped = this.mapKnownError(error, {});
      if (mapped) {
        return mapped.userMessage;
      }
    }

    return fallbackMessage || 'Something went wrong. Please try again.';
  },
};

export default ErrorHandler;
