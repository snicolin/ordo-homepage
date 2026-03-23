import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { writeToolExecutors } from "@/lib/agent-tools";

export async function POST(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { toolName, args } = await request.json();

    if (!toolName || typeof toolName !== "string") {
      return NextResponse.json({ error: "toolName is required" }, { status: 400 });
    }

    const executor = writeToolExecutors[toolName];
    if (!executor) {
      return NextResponse.json({ error: `Unknown tool: ${toolName}` }, { status: 400 });
    }

    const result = await executor(args || {});
    return NextResponse.json(result);
  } catch (error) {
    console.error("Agent execute error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Tool execution failed" },
      { status: 500 },
    );
  }
}
