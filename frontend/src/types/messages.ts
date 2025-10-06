// src/types/messages.ts
export type MessagePriority = 'low' | 'normal' | 'high' | 'urgent';
export type MessageType = 'internal' | 'external' | 'system';
export type MessageStatus = 'unread' | 'read' | 'replied' | 'archived';

export interface MessageAttachment {
  id: number;
  filename: string;
  url: string;
  size?: number | null;
  mimeType?: string | null;
  createdAt: string;
}

export interface MessageUserLite {
  firstName: string;
  lastName: string;
  email: string;
  service?: { name: string } | null;
}

export interface Message {
  id: number;
  senderId: number;
  recipientId: number;
  subject: string | null;
  body: string;
  priority: MessagePriority;
  type: MessageType;
  status: MessageStatus;
  isRead: boolean;
  readAt?: string | null;
  archivedAt?: string | null;
  parentMessageId?: number | null;
  sentAt: string;
  createdAt: string;
  updatedAt: string;
  sender?: MessageUserLite;
  recipient?: MessageUserLite;
  attachments?: MessageAttachment[];
  _count?: { replies: number };
  parentMessage?: { id: number; subject: string | null };
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedMessagesResponse {
  success: boolean;
  data: {
    messages: Message[];
    pagination: Pagination;
  };
}

export interface UsersListResponse {
  success: boolean;
  data: {
    users?: Array<{ id: number; firstName: string; lastName: string; email: string; service?: { name: string } | null }>;
    items?: Array<{ id: number; firstName: string; lastName: string; email: string; service?: { name: string } | null }>;
  };
}
