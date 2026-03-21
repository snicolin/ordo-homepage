import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";

const RESERVED_SLUGS = ["admin", "signin", "api", "_next", "images"];

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const pages = await prisma.page.findMany({
    orderBy: { order: "asc" },
    include: {
      sections: {
        include: { section: { include: { items: true } } },
        orderBy: { order: "asc" },
      },
    },
  });

  return NextResponse.json(pages);
}

export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { label, slug, isHome } = body;

  if (!label || !slug) {
    return NextResponse.json({ error: "label and slug are required" }, { status: 400 });
  }

  if (RESERVED_SLUGS.includes(slug.toLowerCase())) {
    return NextResponse.json({ error: "This slug is reserved" }, { status: 400 });
  }

  const maxOrder = await prisma.page.aggregate({ _max: { order: true } });
  const nextOrder = (maxOrder._max.order ?? -1) + 1;

  if (isHome) {
    await prisma.page.updateMany({ where: { isHome: true }, data: { isHome: false } });
  }

  const page = await prisma.page.create({
    data: { label, slug: slug.toLowerCase(), order: nextOrder, isHome: isHome ?? false },
  });

  return NextResponse.json(page, { status: 201 });
}

export async function PUT(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { id, label, slug, isHome } = body;

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  if (slug && RESERVED_SLUGS.includes(slug.toLowerCase())) {
    return NextResponse.json({ error: "This slug is reserved" }, { status: 400 });
  }

  if (isHome) {
    await prisma.page.updateMany({ where: { isHome: true }, data: { isHome: false } });
  }

  const page = await prisma.page.update({
    where: { id },
    data: {
      ...(label !== undefined && { label }),
      ...(slug !== undefined && { slug: slug.toLowerCase() }),
      ...(isHome !== undefined && { isHome }),
    },
  });

  return NextResponse.json(page);
}

export async function DELETE(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const page = await prisma.page.findUnique({ where: { id } });
  if (!page) {
    return NextResponse.json({ error: "Page not found" }, { status: 404 });
  }

  if (page.isHome) {
    return NextResponse.json({ error: "Cannot delete the home page. Reassign home first." }, { status: 400 });
  }

  await prisma.page.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
