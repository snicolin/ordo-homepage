import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const limit = Math.min(parseInt(searchParams.get("limit") || "30"), 50);

  if (!q || q.length < 2) {
    return NextResponse.json({
      results: { pages: [], sections: [], items: [], users: [], groups: [], alerts: [] },
    });
  }

  const contains = q;

  const [pages, sections, items, users, groups, alerts] = await Promise.all([
    prisma.page.findMany({
      where: {
        OR: [
          { label: { contains, mode: "insensitive" } },
          { slug: { contains, mode: "insensitive" } },
        ],
      },
      take: limit,
      orderBy: { order: "asc" },
    }),
    prisma.section.findMany({
      where: {
        OR: [
          { title: { contains, mode: "insensitive" } },
          { content: { contains, mode: "insensitive" } },
        ],
      },
      take: limit,
    }),
    prisma.item.findMany({
      where: {
        OR: [
          { name: { contains, mode: "insensitive" } },
          { description: { contains, mode: "insensitive" } },
        ],
      },
      take: limit,
      include: {
        section: { select: { title: true } },
      },
    }),
    prisma.user.findMany({
      where: {
        OR: [
          { name: { contains, mode: "insensitive" } },
          { email: { contains, mode: "insensitive" } },
        ],
      },
      take: limit,
      select: { id: true, name: true, email: true, image: true, isAdmin: true },
    }),
    prisma.group.findMany({
      where: {
        name: { contains, mode: "insensitive" },
      },
      take: limit,
      select: { id: true, name: true, _count: { select: { members: true } } },
    }),
    prisma.alert.findMany({
      where: {
        OR: [
          { title: { contains, mode: "insensitive" } },
          { body: { contains, mode: "insensitive" } },
        ],
      },
      take: limit,
      select: {
        id: true,
        title: true,
        body: true,
        color: true,
        active: true,
        expiresAt: true,
      },
    }),
  ]);

  const seenItems = new Set<string>();
  const dedupedItems = items.filter((item) => {
    const key = `${item.name}::${item.href}`;
    if (seenItems.has(key)) return false;
    seenItems.add(key);
    return true;
  });

  return NextResponse.json({
    results: { pages, sections, items: dedupedItems, users, groups, alerts },
  });
}
