import TeamPage from "@/components/TeamPage";

export default async function SlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <TeamPage pageSlug={slug} />;
}
