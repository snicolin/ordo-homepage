import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { alertId } = await req.json();
  if (!alertId) {
    return NextResponse.json({ error: "alertId is required" }, { status: 400 });
  }

  const alert = await prisma.alert.findUnique({ where: { id: alertId } });
  if (!alert) {
    return NextResponse.json({ error: "Alert not found" }, { status: 404 });
  }
  if (!alert.dismissible) {
    return NextResponse.json({ error: "This alert cannot be dismissed" }, { status: 403 });
  }

  await prisma.alertDismissal.upsert({
    where: {
      userId_alertId: { userId: user.id, alertId },
    },
    update: {},
    create: { userId: user.id, alertId },
  });

  return NextResponse.json({ success: true });
}
