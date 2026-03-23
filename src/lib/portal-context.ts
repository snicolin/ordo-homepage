import { prisma } from "@/lib/prisma";

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + "\n\n[... truncated for context limit ...]";
}

export interface PortalContext {
  pagesSummary: string;
  usersSummary: string;
  groupsSummary: string;
  alertsSummary: string;
}

export async function buildPortalContext(): Promise<PortalContext> {
  const [pages, users, groups, alerts] = await Promise.all([
    prisma.page.findMany({
      orderBy: { order: "asc" },
      include: {
        sections: {
          orderBy: { order: "asc" },
          include: {
            section: {
              include: {
                items: { orderBy: { order: "asc" } },
              },
            },
          },
        },
      },
    }),
    prisma.user.findMany({
      select: { id: true, name: true, email: true, isAdmin: true, group: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.group.findMany({
      include: { _count: { select: { members: true } }, defaultPage: { select: { label: true } } },
    }),
    prisma.alert.findMany({
      where: { active: true, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const pagesSummary = pages.length === 0
    ? "(No pages)"
    : pages
        .map((p) => {
          const sectionLines = p.sections
            .map((ps) => {
              const s = ps.section;
              const itemLines = s.items.map((i) => `      - ${i.name}${i.description ? `: ${i.description}` : ""}`).join("\n");
              return `    - Section: ${s.title} (${s.displayType})${s.content ? `\n      Content: ${s.content.slice(0, 200)}` : ""}${itemLines ? `\n${itemLines}` : ""}`;
            })
            .join("\n");
          return `- Page: ${p.label} (/${p.slug})${p.isHome ? " [HOME]" : ""}\n${sectionLines}`;
        })
        .join("\n\n");

  const usersSummary = users.length === 0
    ? "(No users)"
    : users
        .map((u) => `- ${u.name || "Unknown"} (${u.email})${u.isAdmin ? " [ADMIN]" : ""}${u.group ? ` — Group: ${u.group.name}` : ""}`)
        .join("\n");

  const groupsSummary = groups.length === 0
    ? "(No groups)"
    : groups
        .map((g) => `- ${g.name}: ${g._count.members} members${g.defaultPage ? `, default page: ${g.defaultPage.label}` : ""}`)
        .join("\n");

  const alertsSummary = alerts.length === 0
    ? "(No active alerts)"
    : alerts
        .map((a) => `- ${a.title}${a.body ? `: ${a.body}` : ""} (color: ${a.color}, expires: ${a.expiresAt.toISOString().slice(0, 10)})`)
        .join("\n");

  return { pagesSummary, usersSummary, groupsSummary, alertsSummary };
}

export function applyPromptTemplate(template: string, context: PortalContext): string {
  return template
    .replace(/\{\{pagesSummary\}\}/g, truncate(context.pagesSummary, 30000))
    .replace(/\{\{usersSummary\}\}/g, truncate(context.usersSummary, 10000))
    .replace(/\{\{groupsSummary\}\}/g, truncate(context.groupsSummary, 5000))
    .replace(/\{\{alertsSummary\}\}/g, truncate(context.alertsSummary, 5000));
}
