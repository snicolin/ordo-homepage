import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { auth } from "@/auth";
import { isEnvAdmin } from "@/lib/admin";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    include: { defaultPage: true },
  });

  const enriched = users.map((u) => ({
    ...u,
    isEnvAdmin: isEnvAdmin(u.email),
  }));

  return NextResponse.json(enriched);
}

export async function PUT(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const session = await auth();
  const body = await req.json();
  const { action } = body;

  switch (action) {
    case "toggleAdmin": {
      const { userId, isAdmin: newAdminStatus } = body;
      if (!userId) {
        return NextResponse.json({ error: "userId is required" }, { status: 400 });
      }

      const target = await prisma.user.findUnique({ where: { id: userId } });
      if (!target) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      if (target.email === session?.user?.email && !newAdminStatus) {
        return NextResponse.json({ error: "Cannot remove your own admin status" }, { status: 400 });
      }

      if (isEnvAdmin(target.email)) {
        return NextResponse.json({ error: "Cannot modify env-based admin status" }, { status: 400 });
      }

      const updated = await prisma.user.update({
        where: { id: userId },
        data: { isAdmin: newAdminStatus },
      });

      return NextResponse.json(updated);
    }

    case "setDefaultPage": {
      const { userId, defaultPageId } = body;
      if (!userId) {
        return NextResponse.json({ error: "userId is required" }, { status: 400 });
      }

      if (defaultPageId) {
        const page = await prisma.page.findUnique({ where: { id: defaultPageId } });
        if (!page) {
          return NextResponse.json({ error: "Page not found" }, { status: 404 });
        }
        if (page.isHome) {
          await prisma.user.update({ where: { id: userId }, data: { defaultPageId: null } });
          return NextResponse.json({ success: true });
        }
      }

      const updated = await prisma.user.update({
        where: { id: userId },
        data: { defaultPageId: defaultPageId || null },
      });

      return NextResponse.json(updated);
    }

    case "bulkSetDefaultPage": {
      const { userIds, defaultPageId } = body;
      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return NextResponse.json({ error: "userIds[] is required" }, { status: 400 });
      }

      if (defaultPageId) {
        const page = await prisma.page.findUnique({ where: { id: defaultPageId } });
        if (!page) {
          return NextResponse.json({ error: "Page not found" }, { status: 404 });
        }
        if (page.isHome) {
          await prisma.user.updateMany({
            where: { id: { in: userIds } },
            data: { defaultPageId: null },
          });
          return NextResponse.json({ success: true });
        }
      }

      await prisma.user.updateMany({
        where: { id: { in: userIds } },
        data: { defaultPageId: defaultPageId || null },
      });

      return NextResponse.json({ success: true });
    }

    default:
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }
}
