import type { BookingStatus } from "./booking-types";

export type ChatKind = "booking" | "support";
export type ChatParty = "customer" | "host";
export type ChatRole = ChatParty | "admin";
export interface Conversation {
  _id: string;
  kind: ChatKind;
  party: ChatParty | "both";
  title: string;
  status: "open" | "resolved";
  viewerRole: ChatRole;
  canSend: boolean;
  unreadCount: number;
  lastActivityAt: string;
  createdAt: string;
  lastMessage: { text: string; createdAt: string; fromMe: boolean; senderRole: ChatRole } | null;
  booking: {
    _id: string;
    code: string;
    status: BookingStatus | "unavailable";
    startDate?: string;
    endDate?: string;
    product: { name: string; code?: string; slug?: string; imageUrl?: string };
  };
}
export interface ConversationList {
  conversations: Conversation[];
  pagination: { total: number; hasMore: boolean; nextCursor: string | null };
}
export interface ChatMessage {
  _id: string;
  sequence: number;
  text: string;
  createdAt: string;
  sender: "me" | "other";
  senderRole: ChatRole;
  clientMessageId?: string;
}
export interface MessagePage {
  messages: ChatMessage[];
  latestSequence: number;
  pagination: { hasMore: boolean; before: number | null; after: number | null };
}
export interface ConversationFilters {
  kind?: ChatKind;
  filter?: "all" | "unread" | "resolved";
  search?: string;
}
