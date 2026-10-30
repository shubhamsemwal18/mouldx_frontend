import { apiClient, type ApiResponse } from "./api";
import type { ChatKind, ChatMessage, ChatParty, Conversation, ConversationFilters, ConversationList, MessagePage } from "./chat-types";

const path = (admin: boolean) => admin ? "/admin/chats" : "/chats";
export const chatApi = {
  start(bookingId: string, kind: ChatKind, party?: ChatParty, admin = false) {
    return apiClient.post<ApiResponse<{ conversation: Conversation }>>(path(admin), { bookingId, kind, ...(party && { party }) }).then(({ data }) => data.data.conversation);
  },
  list(filters: ConversationFilters, cursor?: string | null, admin = false, signal?: AbortSignal) {
    return apiClient.get<ApiResponse<ConversationList>>(path(admin), { params: { ...filters, cursor: cursor || undefined, limit: 20 }, signal }).then(({ data }) => data.data);
  },
  get(id: string, admin = false, signal?: AbortSignal) {
    return apiClient.get<ApiResponse<{ conversation: Conversation }>>(`${path(admin)}/${encodeURIComponent(id)}`, { signal }).then(({ data }) => data.data.conversation);
  },
  messages(id: string, params: { before?: number; after?: number } = {}, admin = false, signal?: AbortSignal) {
    return apiClient.get<ApiResponse<MessagePage>>(`${path(admin)}/${encodeURIComponent(id)}/messages`, { params: { ...params, limit: 30 }, signal }).then(({ data }) => data.data);
  },
  send(id: string, text: string, clientMessageId: string, admin = false) {
    return apiClient.post<ApiResponse<{ message: ChatMessage }>>(`${path(admin)}/${encodeURIComponent(id)}/messages`, { text, clientMessageId }).then(({ data }) => data.data.message);
  },
  read(id: string, lastReadSequence: number, admin = false) {
    return apiClient.post<ApiResponse<{ unreadCount: number }>>(`${path(admin)}/${encodeURIComponent(id)}/read`, { lastReadSequence }).then(({ data }) => data.data);
  },
  status(id: string, status: "open" | "resolved", admin = false) {
    return apiClient.patch<ApiResponse<{ conversation: Conversation }>>(`${path(admin)}/${encodeURIComponent(id)}/status`, { status }).then(({ data }) => data.data.conversation);
  },
};
