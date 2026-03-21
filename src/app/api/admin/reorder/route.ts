import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";

export async function PUT(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { type, items } = body;

  if (!type || !items || !Array.isArray(items)) {
    return NextResponse.json({ error: "type and items[] are required" }, { status: 400 });
  }

  switch (type) {
    case "page": {
      await prisma.$transaction(
        items.map((item: { id: string; order: number }) =>
          prisma.page.update({ where: { id: item.id }, data: { order: item.order } })
        )
      );
      break;
    }
    case "pageSection": {
      await prisma.$transaction(
        items.map((item: { pageId: string; sectionId: string; order: number }) =>
          prisma.pageSection.update({
            where: { pageId_sectionId: { pageId: item.pageId, sectionId: item.sectionId } },
            data: { order: item.order },
          })
        )
      );
      break;
    }
    case "item": {
      await prisma.$transaction(
        items.map((item: { id: string; order: number }) =>
          prisma.item.update({ where: { id: item.id }, data: { order: item.order } })
        )
      );
      break;
    }
    default:
      return NextResponse.json({ error: "Invalid type. Use page, pageSection, or item" }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
