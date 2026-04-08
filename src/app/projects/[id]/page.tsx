import { redirect } from "next/navigation";

/**
 * Project Detail Page - Redirects to chat page with project filter
 * Route: /projects/[id]
 */
export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  
  // Redirect to chat page with project filter
  redirect(`/chat?project=${id}`);
}

