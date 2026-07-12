import { getFlag } from "@/lib/flags";
import { prisma } from "@/lib/prisma";
import PostForm from "@/components/PostForm";

export const dynamic = "force-dynamic";

export default async function PostPage({
  searchParams,
}: {
  searchParams: { company?: string; lane?: string };
}) {
  const liveEnabled = await getFlag("live_enabled");
  let presetCompany: { corporateNumber: string; name: string } | null = null;
  if (searchParams.company) {
    const c = await prisma.company.findUnique({
      where: { corporateNumber: searchParams.company },
    });
    if (c) presetCompany = { corporateNumber: c.corporateNumber, name: c.name };
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">トラブルを投稿する</h1>
      <PostForm
        liveEnabled={liveEnabled}
        presetCompany={presetCompany}
        presetLane={searchParams.lane === "live" ? "live" : undefined}
      />
    </div>
  );
}
