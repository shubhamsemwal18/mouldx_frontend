import { redirect } from "next/navigation";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/owner/moulds/new/product?id=${encodeURIComponent(id)}`);
}
