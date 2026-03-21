import { auth } from "@/auth";
import { signOutAction } from "@/app/actions";
import Image from "next/image";
import Link from "next/link";
import UserMenu from "@/components/UserMenu";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export default async function TeamPage({ pageSlug }: { pageSlug: string }) {
  const session = await auth();
  const isAdmin = (session?.user as Record<string, unknown>)?.isAdmin === true;

  const allPages = await prisma.page.findMany({ orderBy: { order: "asc" } });

  const currentPage = allPages.find((p) => p.slug === pageSlug);
  if (!currentPage) notFound();

  const pageSections = await prisma.pageSection.findMany({
    where: { pageId: currentPage.id },
    orderBy: { order: "asc" },
    include: {
      section: {
        include: {
          items: {
            where: { pages: { some: { pageId: currentPage.id } } },
            orderBy: { order: "asc" },
          },
        },
      },
    },
  });

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-8 py-5 flex items-center justify-between">
          <div className="flex items-center">
            <Link href="/">
              <img
                src="/images/ordo-logo.svg"
                alt="Ordo HQ"
                className="h-7 w-auto"
              />
            </Link>
          </div>
          <div className="flex items-center">
            {session?.user && (
              <UserMenu
                firstName={session.user.name?.split(" ")[0] ?? session.user.email?.split("@")[0] ?? "User"}
                isAdmin={isAdmin}
                signOutAction={signOutAction}
              />
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-8 py-6">
        <nav className="inline-flex items-center gap-0.5 rounded-lg bg-gray-200/60 p-1 mb-8 overflow-x-auto scrollbar-hide">
          {allPages.map((page) => (
            <Link
              key={page.id}
              href={page.isHome ? "/" : `/${page.slug}`}
              className={`px-4 py-2.5 rounded-md text-base font-medium transition-all ${
                page.slug === pageSlug
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-900 hover:bg-white/50"
              }`}
            >
              {page.label}
            </Link>
          ))}
        </nav>

        {pageSections.map((ps) => {
          const section = ps.section;
          const visibleItems = section.items.filter((item) =>
            section.displayType === "TILE" ? true : true
          );

          if (visibleItems.length === 0) return null;

          const title = ps.titleOverride || section.title;

          if (section.displayType === "BUTTON") {
            return (
              <section key={ps.sectionId} className="mb-10">
                <h2 className="text-xl font-semibold text-gray-900 mb-3">{title}</h2>
                <div className="flex flex-wrap gap-3">
                  {visibleItems.map((item) => (
                    <a
                      key={item.id}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-base text-gray-800 font-medium bg-white hover:bg-gray-100 active:bg-gray-200 px-5 py-3 rounded-lg border border-gray-200 transition-all duration-150"
                    >
                      {item.name}
                    </a>
                  ))}
                </div>
              </section>
            );
          }

          if (section.displayType === "TILE") {
            const sortedItems = [...visibleItems].sort(
              (a, b) => Number(a.disabled) - Number(b.disabled)
            );
            return (
              <section key={ps.sectionId} className="mb-10">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">{title}</h2>
                <div className="grid grid-cols-1 min-[280px]:grid-cols-2 lg:grid-cols-4 gap-4">
                  {sortedItems.map((item) => {
                    const Wrapper = item.disabled ? "div" : "a";
                    return (
                      <Wrapper
                        key={item.id}
                        {...(item.disabled ? {} : { href: item.href })}
                        className={`rounded-xl p-4 border flex flex-col ${
                          item.disabled
                            ? "bg-gray-50 border-gray-200 opacity-50 cursor-not-allowed"
                            : "bg-white border-gray-100 shadow-sm hover:shadow-md transition-shadow"
                        }`}
                      >
                        {item.image && (
                          <div className="bg-gray-50 rounded-lg aspect-[5/4] w-full mb-4 overflow-hidden relative">
                            <Image
                              src={item.image}
                              alt={item.name}
                              fill
                              className={`object-cover ${item.disabled ? "grayscale" : ""}`}
                            />
                          </div>
                        )}
                        <h3 className="font-semibold text-base text-gray-900 mb-1">
                          {item.name}
                        </h3>
                        {item.description && (
                          <p className="text-base text-gray-500 leading-relaxed">
                            {item.description}
                          </p>
                        )}
                      </Wrapper>
                    );
                  })}
                </div>
              </section>
            );
          }

          if (section.displayType === "LINK") {
            return (
              <section key={ps.sectionId} className="mb-10">
                <h2 className="text-xl font-semibold text-gray-900 mb-3">{title}</h2>
                <div className="flex flex-wrap items-center gap-1 -ml-2">
                  {visibleItems.map((item, index) => (
                    <span key={item.id} className="flex items-center">
                      <a
                        href={item.href}
                        className="text-base text-blue-600 hover:text-blue-800 hover:underline px-2 py-2 rounded transition-colors"
                      >
                        {item.name}
                      </a>
                      {index < visibleItems.length - 1 && (
                        <span className="text-gray-300 text-sm">&bull;</span>
                      )}
                    </span>
                  ))}
                </div>
              </section>
            );
          }

          return null;
        })}
      </main>
    </div>
  );
}
