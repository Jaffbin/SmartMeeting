/**
 * 错误类型枚举
 */
export enum ErrorType {
  NETWORK = 'NETWORK',
  AUTH = 'AUTH',
  VALIDATION = 'VALIDATION',
  API = 'API',
  FILE = 'FILE',
  PERMISSION = 'PERMISSION',
  UNKNOWN = 'UNKNOWN',
}

/**
 * 应用错误类 - 统一的错误处理基础类
 */
export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly code?: string;
  public readonly userMessage: string;
  public readonly originalError?: unknown;
  public readonly metadata?: Record<string, unknown>;
  public readonly timestamp: Date;

  constructor(
    message: string,
    type: ErrorType,
    {
      code,
      userMessage,
      originalError,
      metadata,
    }: {
      code?: string;
      userMessage?: string;
      originalError?: unknown;
      metadata?: Record<string, unknown>;
    } = {}
  ) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.code = code;
    this.userMessage = userMessage || message;
    this.originalError = originalError;
    this.metadata = metadata;
    this.timestamp = new Date();

    // 维护正确的原型链
    Object.setPrototypeOf(this, AppError.prototype);

    // 捕获堆栈跟踪
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  /**
   * 转换为可序列化的对象
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      type: this.type,
      code: this.code,
      userMessage: this.userMessage,
      timestamp: this.timestamp.toISOString(),
      metadata: this.metadata,
    };
  }

  /**
   * 日志输出格式
   */
  toString(): string {
    return `[${this.name}] ${this.type}: ${this.message}${
      this.code ? ` (Code: ${this.code})` : ''
    }`;
  }
}

/**
 * 网络错误
 */
export class NetworkError extends AppError {
  constructor(
    message: string = 'Network error occurred',
    options?: {
      code?: string;
      userMessage?: string;
      originalError?: unknown;
      metadata?: Record<string, unknown>;
    }
  ) {
    super(message, ErrorType.NETWORK, {
      ...options,
      userMessage:
        options?.userMessage ||
        'No internet connection. Please check your network and try again.',
    });
    this.name = 'NetworkError';
  }
}

/**
 * 认证错误
 */
export class AuthError extends AppError {
  constructor(
    message: string = 'Authentication failed',
    options?: {
      code?: string;
      userMessage?: string;
      originalError?: unknown;
      metadata?: Record<string, unknown>;
    }
  ) {
    super(message, ErrorType.AUTH, options);
    this.name = 'AuthError';
  }
}

/**
 * 验证错误
 */
export class ValidationError extends AppError {
  public readonly field?: string;

  constructor(
    message: string = 'Validation failed',
    options?: {
      code?: string;
      userMessage?: string;
      originalError?: unknown;
      metadata?: Record<string, unknown>;
      field?: string;
    }
  ) {
    super(message, ErrorType.VALIDATION, options);
    this.name = 'ValidationError';
    this.field = options?.field;
  }
}

/**
 * API 错误
 */
export class ApiError extends AppError {
  public readonly statusCode?: number;

  constructor(
    message: string = 'API request failed',
    options?: {
      code?: string;
      userMessage?: string;
      originalError?: unknown;
      metadata?: Record<string, unknown>;
      statusCode?: number;
    }
  ) {
    super(message, ErrorType.API, options);
    this.name = 'ApiError';
    this.statusCode = options?.statusCode;
  }
}

/**
 * 文件错误
 */
export class FileError extends AppError {
  constructor(
    message: string = 'File operation failed',
    options?: {
      code?: string;
      userMessage?: string;
      originalError?: unknown;
      metadata?: Record<string, unknown>;
    }
  ) {
    super(message, ErrorType.FILE, {
      ...options,
      userMessage: options?.userMessage || 'File operation failed. Please try again.',
    });
    this.name = 'FileError';
  }
}

/**
 * 权限错误
 */
export class PermissionError extends AppError {
  constructor(
    message: string = 'Permission denied',
    options?: {
      code?: string;
      userMessage?: string;
      originalError?: unknown;
      metadata?: Record<string, unknown>;
    }
  ) {
    super(message, ErrorType.PERMISSION, {
      ...options,
      userMessage: options?.userMessage || 'You do not have permission to perform this action.',
    });
    this.name = 'PermissionError';
  }
}

/**
 * 未知错误
 */
export class UnknownError extends AppError {
  constructor(
    message: string = 'An unexpected error occurred',
    options?: {
      code?: string;
      userMessage?: string;
      originalError?: unknown;
      metadata?: Record<string, unknown>;
    }
  ) {
    super(message, ErrorType.UNKNOWN, {
      ...options,
      userMessage: options?.userMessage || 'Something went wrong. Please try again.',
    });
    this.name = 'UnknownError';
  }
}
