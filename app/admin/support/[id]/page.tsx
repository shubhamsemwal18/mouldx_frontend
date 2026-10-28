import ConversationThread from "@/app/components/chat/ConversationThread";

export default async function AdminSupportChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ConversationThread id={id} admin />;
}
