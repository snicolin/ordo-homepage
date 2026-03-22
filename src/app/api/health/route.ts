import { NextResponse } from "next/server";

// Pipeline speed test
export function GET() {
  return NextResponse.json({ status: "ok" });
}
