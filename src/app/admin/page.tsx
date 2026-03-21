"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

type Page = {
  id: string;
  label: string;
  slug: string;
  order: number;
  isHome: boolean;
  sections?: PageSectionWithSection[];
};

type Section = {
  id: string;
  title: string;
  displayType: "BUTTON" | "LINK" | "TILE";
  items?: Item[];
  pages?: PageSectionWithPage[];
};

type PageSectionWithSection = {
  pageId: string;
  sectionId: string;
  order: number;
  titleOverride: string | null;
  section: Section;
};

type PageSectionWithPage = {
  pageId: string;
  sectionId: string;
  order: number;
  titleOverride: string | null;
  page: Page;
};

type Item = {
  id: string;
  sectionId: string;
  name: string;
  href: string;
  description: string | null;
  image: string | null;
  disabled: boolean;
  order: number;
  pages?: { itemId: string; pageId: string }[];
  section?: Section;
};

type User = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  isAdmin: boolean;
  isEnvAdmin: boolean;
  defaultPageId: string | null;
  defaultPage: Page | null;
  lastLogin: string;
};

type Tab = "pages" | "sections" | "items" | "users";

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("pages");
  const [pages, setPages] = useState<Page[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string>("");
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingPage, setEditingPage] = useState<Partial<Page> | null>(null);
  const [editingSection, setEditingSection] = useState<Partial<Section & { pageAssignments?: { pageId: string; order: number; titleOverride?: string }[] }> | null>(null);
  const [editingItem, setEditingItem] = useState<Partial<Item & { pageIds?: string[] }> | null>(null);

  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [bulkDefaultPageId, setBulkDefaultPageId] = useState<string>("");

  const fetchPages = useCallback(async () => {
    const res = await fetch("/api/admin/pages");
    if (res.ok) {
      const data = await res.json();
      setPages(data);
      if (!selectedPageId && data.length > 0) {
        setSelectedPageId(data[0].id);
      }
    }
  }, [selectedPageId]);

  const fetchSections = useCallback(async () => {
    const res = await fetch("/api/admin/sections");
    if (res.ok) setSections(await res.json());
  }, []);

  const fetchItems = useCallback(async () => {
    if (!selectedSectionId || !selectedPageId) {
      setItems([]);
      return;
    }
    const res = await fetch(`/api/admin/items?sectionId=${selectedSectionId}&pageId=${selectedPageId}`);
    if (res.ok) setItems(await res.json());
  }, [selectedSectionId, selectedPageId]);

  const fetchUsers = useCallback(async () => {
    const res = await fetch("/api/admin/users");
    if (res.ok) setUsers(await res.json());
  }, []);

  useEffect(() => {
    Promise.all([fetchPages(), fetchSections(), fetchUsers()]).then(() => setLoading(false));
  }, [fetchPages, fetchSections, fetchUsers]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const pageSections = pages
    .find((p) => p.id === selectedPageId)
    ?.sections?.sort((a, b) => a.order - b.order) ?? [];

  useEffect(() => {
    if (pageSections.length > 0 && !selectedSectionId) {
      setSelectedSectionId(pageSections[0].sectionId);
    }
  }, [pageSections, selectedSectionId]);

  // --- Page CRUD ---
  async function savePage() {
    if (!editingPage) return;
    const method = editingPage.id ? "PUT" : "POST";
    const res = await fetch("/api/admin/pages", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingPage),
    });
    if (res.ok) {
      setEditingPage(null);
      await fetchPages();
    }
  }

  async function deletePage(id: string) {
    if (!confirm("Delete this page? Sections and items will remain but lose this page assignment.")) return;
    await fetch(`/api/admin/pages?id=${id}`, { method: "DELETE" });
    await fetchPages();
  }

  async function reorderPages(id: string, direction: "up" | "down") {
    const idx = pages.findIndex((p) => p.id === id);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= pages.length) return;

    await fetch("/api/admin/reorder", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "page",
        items: [
          { id: pages[idx].id, order: pages[swapIdx].order },
          { id: pages[swapIdx].id, order: pages[idx].order },
        ],
      }),
    });
    await fetchPages();
  }

  // --- Section CRUD ---
  async function saveSection() {
    if (!editingSection) return;
    const method = editingSection.id ? "PUT" : "POST";
    const res = await fetch("/api/admin/sections", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingSection),
    });
    if (res.ok) {
      setEditingSection(null);
      await Promise.all([fetchPages(), fetchSections()]);
    }
  }

  async function deleteSection(id: string) {
    if (!confirm("Delete this section and ALL its items?")) return;
    await fetch(`/api/admin/sections?id=${id}`, { method: "DELETE" });
    await Promise.all([fetchPages(), fetchSections()]);
  }

  async function reorderPageSections(sectionId: string, direction: "up" | "down") {
    const idx = pageSections.findIndex((ps) => ps.sectionId === sectionId);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= pageSections.length) return;

    await fetch("/api/admin/reorder", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "pageSection",
        items: [
          { pageId: selectedPageId, sectionId: pageSections[idx].sectionId, order: pageSections[swapIdx].order },
          { pageId: selectedPageId, sectionId: pageSections[swapIdx].sectionId, order: pageSections[idx].order },
        ],
      }),
    });
    await fetchPages();
  }

  // --- Item CRUD ---
  async function saveItem() {
    if (!editingItem) return;
    const method = editingItem.id ? "PUT" : "POST";
    const payload = {
      ...editingItem,
      sectionId: editingItem.sectionId || selectedSectionId,
    };
    const res = await fetch("/api/admin/items", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setEditingItem(null);
      await fetchItems();
    }
  }

  async function deleteItem(id: string) {
    if (!confirm("Delete this item?")) return;
    await fetch(`/api/admin/items?id=${id}`, { method: "DELETE" });
    await fetchItems();
  }

  async function reorderItems(id: string, direction: "up" | "down") {
    const idx = items.findIndex((i) => i.id === id);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= items.length) return;

    await fetch("/api/admin/reorder", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "item",
        items: [
          { id: items[idx].id, order: items[swapIdx].order },
          { id: items[swapIdx].id, order: items[idx].order },
        ],
      }),
    });
    await fetchItems();
  }

  // --- User actions ---
  async function toggleAdmin(userId: string, newStatus: boolean) {
    await fetch("/api/admin/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggleAdmin", userId, isAdmin: newStatus }),
    });
    await fetchUsers();
  }

  async function setUserDefaultPage(userId: string, defaultPageId: string | null) {
    await fetch("/api/admin/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "setDefaultPage", userId, defaultPageId }),
    });
    await fetchUsers();
  }

  async function bulkSetDefaultPage() {
    if (selectedUserIds.size === 0) return;
    await fetch("/api/admin/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "bulkSetDefaultPage",
        userIds: Array.from(selectedUserIds),
        defaultPageId: bulkDefaultPageId || null,
      }),
    });
    setSelectedUserIds(new Set());
    await fetchUsers();
  }

  function toggleUserSelection(userId: string) {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedUserIds.size === users.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(users.map((u) => u.id)));
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "pages", label: "Pages" },
    { key: "sections", label: "Sections" },
    { key: "items", label: "Items" },
    { key: "users", label: "Users" },
  ];

  const currentSectionDisplayType = sections.find((s) => s.id === selectedSectionId)?.displayType;

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-8 py-5 flex items-center justify-between">
          <div className="flex items-end gap-3">
            <Link href="/">
              <img src="/images/ordo-logo.svg" alt="Ordo HQ" className="h-7 sm:h-5 w-auto" />
            </Link>
            <span className="text-sm text-gray-400 font-medium leading-none mb-px">Admin</span>
          </div>
          <Link
            href="/"
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            &larr; Back
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-8 py-6">
        <nav className="inline-flex items-center gap-0.5 rounded-lg bg-gray-200/60 p-1 mb-8">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 sm:px-3 sm:py-1.5 rounded-md text-base sm:text-sm font-medium transition-all cursor-pointer ${
                tab === t.key
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-900 hover:bg-white/50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {/* --- PAGES TAB --- */}
        {tab === "pages" && (
          <div className="space-y-8">
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Pages</h2>
                <button
                  onClick={() => setEditingPage({ label: "", slug: "", isHome: false })}
                  className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer"
                >
                  + Add Page
                </button>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                {pages.map((page, idx) => (
                  <div key={page.id} className="flex items-center px-4 py-3 gap-3">
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => reorderPages(page.id, "up")}
                        disabled={idx === 0}
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-20 text-xs cursor-pointer disabled:cursor-default"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => reorderPages(page.id, "down")}
                        disabled={idx === pages.length - 1}
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-20 text-xs cursor-pointer disabled:cursor-default"
                      >
                        ▼
                      </button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-sm text-gray-900">{page.label}</span>
                      <span className="text-xs text-gray-400 ml-2">/{page.slug === "team" ? "" : page.slug}</span>
                    </div>
                    {page.isHome && (
                      <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-medium">Home</span>
                    )}
                    <button
                      onClick={() => setEditingPage(page)}
                      className="text-xs text-gray-500 hover:text-gray-900 cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deletePage(page.id)}
                      className="text-xs text-red-400 hover:text-red-600 cursor-pointer"
                    >
                      Del
                    </button>
                  </div>
                ))}
                {pages.length === 0 && (
                  <div className="px-4 py-8 text-center text-sm text-gray-400">
                    No pages yet. Add one to get started.
                  </div>
                )}
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold text-gray-900">Sections on</h2>
                  <select
                    value={selectedPageId}
                    onChange={(e) => {
                      setSelectedPageId(e.target.value);
                      setSelectedSectionId("");
                    }}
                    className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white"
                  >
                    {pages.map((p) => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() =>
                    setEditingSection({
                      title: "",
                      displayType: "BUTTON",
                      pageAssignments: selectedPageId ? [{ pageId: selectedPageId, order: pageSections.length }] : [],
                    })
                  }
                  className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer"
                >
                  + Add Section
                </button>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                {pageSections.map((ps, idx) => (
                  <div
                    key={ps.sectionId}
                    onClick={() => setSelectedSectionId(ps.sectionId)}
                    className={`flex items-center px-4 py-3 gap-3 cursor-pointer transition-colors ${
                      selectedSectionId === ps.sectionId ? "bg-blue-50" : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={(e) => { e.stopPropagation(); reorderPageSections(ps.sectionId, "up"); }}
                        disabled={idx === 0}
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-20 text-xs cursor-pointer disabled:cursor-default"
                      >
                        ▲
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); reorderPageSections(ps.sectionId, "down"); }}
                        disabled={idx === pageSections.length - 1}
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-20 text-xs cursor-pointer disabled:cursor-default"
                      >
                        ▼
                      </button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-sm text-gray-900">
                        &ldquo;{ps.titleOverride || ps.section.title}&rdquo;
                      </span>
                      <span className="text-xs text-gray-400 ml-2">
                        Type: {ps.section.displayType}
                      </span>
                      <span className="text-xs text-gray-400 ml-2">
                        {ps.section.items?.length ?? 0} items
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const sec = sections.find((s) => s.id === ps.sectionId);
                        if (sec) {
                          setEditingSection({
                            ...sec,
                            pageAssignments: sec.pages?.map((p) => ({
                              pageId: p.pageId,
                              order: p.order,
                              titleOverride: p.titleOverride ?? undefined,
                            })),
                          });
                        }
                      }}
                      className="text-xs text-gray-500 hover:text-gray-900 cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteSection(ps.sectionId); }}
                      className="text-xs text-red-400 hover:text-red-600 cursor-pointer"
                    >
                      Del
                    </button>
                  </div>
                ))}
                {pageSections.length === 0 && (
                  <div className="px-4 py-8 text-center text-sm text-gray-400">
                    No sections on this page.
                  </div>
                )}
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Items in &ldquo;{pageSections.find((ps) => ps.sectionId === selectedSectionId)?.titleOverride || sections.find((s) => s.id === selectedSectionId)?.title || "..."}&rdquo;
                </h2>
                <button
                  onClick={() =>
                    setEditingItem({
                      name: "",
                      href: "",
                      description: "",
                      image: "",
                      disabled: false,
                      sectionId: selectedSectionId,
                      pageIds: [selectedPageId],
                    })
                  }
                  disabled={!selectedSectionId}
                  className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-40 cursor-pointer disabled:cursor-default"
                >
                  + Add Item
                </button>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                {items.map((item, idx) => (
                  <div key={item.id} className="flex items-center px-4 py-3 gap-3">
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => reorderItems(item.id, "up")}
                        disabled={idx === 0}
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-20 text-xs cursor-pointer disabled:cursor-default"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => reorderItems(item.id, "down")}
                        disabled={idx === items.length - 1}
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-20 text-xs cursor-pointer disabled:cursor-default"
                      >
                        ▼
                      </button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={`font-medium text-sm ${item.disabled ? "text-gray-400" : "text-gray-900"}`}>
                        {item.name}
                      </span>
                      <span className="text-xs text-gray-400 ml-2 truncate">
                        {item.href.length > 30 ? item.href.slice(0, 30) + "..." : item.href}
                      </span>
                      {item.disabled && (
                        <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded ml-2">disabled</span>
                      )}
                    </div>
                    <button
                      onClick={() =>
                        setEditingItem({
                          ...item,
                          pageIds: item.pages?.map((p) => p.pageId) ?? [],
                        })
                      }
                      className="text-xs text-gray-500 hover:text-gray-900 cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="text-xs text-red-400 hover:text-red-600 cursor-pointer"
                    >
                      Del
                    </button>
                  </div>
                ))}
                {items.length === 0 && selectedSectionId && (
                  <div className="px-4 py-8 text-center text-sm text-gray-400">
                    No items in this section on this page.
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {/* --- USERS TAB --- */}
        {tab === "users" && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Users</h2>
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={selectedUserIds.size === users.length && users.length > 0}
                  onChange={toggleSelectAll}
                  className="rounded"
                />
                Select all
              </label>
              <select
                value={bulkDefaultPageId}
                onChange={(e) => setBulkDefaultPageId(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white"
              >
                <option value="">-- (Home)</option>
                {pages.filter((p) => !p.isHome).map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
              <button
                onClick={bulkSetDefaultPage}
                disabled={selectedUserIds.size === 0}
                className="text-sm bg-gray-900 text-white px-4 py-1.5 rounded-lg hover:bg-gray-800 disabled:opacity-40 cursor-pointer disabled:cursor-default transition-colors"
              >
                Apply
              </button>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
              {users.map((user) => (
                <div key={user.id} className="flex items-center px-4 py-3 gap-4 flex-wrap">
                  <input
                    type="checkbox"
                    checked={selectedUserIds.has(user.id)}
                    onChange={() => toggleUserSelection(user.id)}
                    className="rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-sm text-gray-900">{user.name || "Unknown"}</span>
                    <span className="text-xs text-gray-400 ml-2">{user.email}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {user.isEnvAdmin ? (
                      <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-medium">Admin (env)</span>
                    ) : user.isAdmin ? (
                      <button
                        onClick={() => toggleAdmin(user.id, false)}
                        className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded font-medium hover:bg-green-100 cursor-pointer transition-colors"
                      >
                        Admin ✓
                      </button>
                    ) : (
                      <button
                        onClick={() => toggleAdmin(user.id, true)}
                        className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded font-medium hover:bg-gray-200 cursor-pointer transition-colors"
                      >
                        Make Admin
                      </button>
                    )}
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-400">Default:</span>
                      <select
                        value={user.defaultPageId || ""}
                        onChange={(e) => setUserDefaultPage(user.id, e.target.value || null)}
                        className="text-xs border border-gray-200 rounded px-2 py-1 bg-white"
                      >
                        <option value="">--</option>
                        {pages.filter((p) => !p.isHome).map((p) => (
                          <option key={p.id} value={p.id}>{p.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
              {users.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-gray-400">
                  No users have logged in yet.
                </div>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-3">
              This list builds automatically as people sign in. &ldquo;--&rdquo; means they land on the home page.
            </p>
          </div>
        )}

        {/* Sections and Items tabs show the same content as the Pages tab subsections */}
        {tab === "sections" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">All Sections</h2>
              <button
                onClick={() =>
                  setEditingSection({ title: "", displayType: "BUTTON", pageAssignments: [] })
                }
                className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer"
              >
                + Add Section
              </button>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
              {sections.map((sec) => (
                <div key={sec.id} className="flex items-center px-4 py-3 gap-3">
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-sm text-gray-900">{sec.title}</span>
                    <span className="text-xs text-gray-400 ml-2">Type: {sec.displayType}</span>
                    <span className="text-xs text-gray-400 ml-2">{sec.items?.length ?? 0} items</span>
                    <span className="text-xs text-gray-400 ml-2">
                      on {sec.pages?.map((p) => p.page.label).join(", ") || "no pages"}
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      setEditingSection({
                        ...sec,
                        pageAssignments: sec.pages?.map((p) => ({
                          pageId: p.pageId,
                          order: p.order,
                          titleOverride: p.titleOverride ?? undefined,
                        })),
                      })
                    }
                    className="text-xs text-gray-500 hover:text-gray-900 cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteSection(sec.id)}
                    className="text-xs text-red-400 hover:text-red-600 cursor-pointer"
                  >
                    Del
                  </button>
                </div>
              ))}
              {sections.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-gray-400">No sections yet.</div>
              )}
            </div>
          </div>
        )}

        {tab === "items" && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Items in</h2>
              <select
                value={selectedSectionId}
                onChange={(e) => setSelectedSectionId(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white"
              >
                <option value="">Select a section...</option>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>{s.title} ({s.displayType})</option>
                ))}
              </select>
              <select
                value={selectedPageId}
                onChange={(e) => setSelectedPageId(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white"
              >
                {pages.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
              {items.map((item) => (
                <div key={item.id} className="flex items-center px-4 py-3 gap-3">
                  <div className="flex-1 min-w-0">
                    <span className={`font-medium text-sm ${item.disabled ? "text-gray-400" : "text-gray-900"}`}>
                      {item.name}
                    </span>
                    <span className="text-xs text-gray-400 ml-2 truncate">
                      {item.href.length > 40 ? item.href.slice(0, 40) + "..." : item.href}
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      setEditingItem({
                        ...item,
                        pageIds: item.pages?.map((p) => p.pageId) ?? [],
                      })
                    }
                    className="text-xs text-gray-500 hover:text-gray-900 cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="text-xs text-red-400 hover:text-red-600 cursor-pointer"
                  >
                    Del
                  </button>
                </div>
              ))}
              {items.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-gray-400">
                  {selectedSectionId ? "No items match." : "Select a section above."}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* --- PAGE EDIT MODAL --- */}
      {editingPage && (
        <Modal onClose={() => setEditingPage(null)}>
          <h3 className="text-base font-semibold text-gray-900 mb-4">
            {editingPage.id ? "Edit Page" : "Add Page"}
          </h3>
          <div className="space-y-3">
            <Field label="Label" value={editingPage.label ?? ""} onChange={(v) => setEditingPage({ ...editingPage, label: v })} />
            <Field label="Slug" value={editingPage.slug ?? ""} onChange={(v) => setEditingPage({ ...editingPage, slug: v })} />
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={editingPage.isHome ?? false}
                onChange={(e) => setEditingPage({ ...editingPage, isHome: e.target.checked })}
              />
              Home page
            </label>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setEditingPage(null)} className="text-sm text-gray-500 hover:text-gray-900 cursor-pointer">Cancel</button>
            <button onClick={savePage} className="text-sm bg-gray-900 text-white px-4 py-1.5 rounded-lg hover:bg-gray-800 cursor-pointer">Save</button>
          </div>
        </Modal>
      )}

      {/* --- SECTION EDIT MODAL --- */}
      {editingSection && (
        <Modal onClose={() => setEditingSection(null)}>
          <h3 className="text-base font-semibold text-gray-900 mb-4">
            {editingSection.id ? "Edit Section" : "Add Section"}
          </h3>
          <div className="space-y-3">
            <Field label="Title" value={editingSection.title ?? ""} onChange={(v) => setEditingSection({ ...editingSection, title: v })} />
            <div>
              <label className="block text-sm text-gray-600 mb-1">Display Type</label>
              <select
                value={editingSection.displayType ?? "BUTTON"}
                onChange={(e) => setEditingSection({ ...editingSection, displayType: e.target.value as "BUTTON" | "LINK" | "TILE" })}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
              >
                <option value="BUTTON">Button</option>
                <option value="LINK">Link</option>
                <option value="TILE">Tile</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Assigned to pages</label>
              {pages.map((p) => {
                const assignment = editingSection.pageAssignments?.find((pa) => pa.pageId === p.id);
                return (
                  <div key={p.id} className="flex items-center gap-2 mb-1">
                    <input
                      type="checkbox"
                      checked={!!assignment}
                      onChange={(e) => {
                        const current = editingSection.pageAssignments ?? [];
                        if (e.target.checked) {
                          setEditingSection({
                            ...editingSection,
                            pageAssignments: [...current, { pageId: p.id, order: current.length }],
                          });
                        } else {
                          setEditingSection({
                            ...editingSection,
                            pageAssignments: current.filter((pa) => pa.pageId !== p.id),
                          });
                        }
                      }}
                    />
                    <span className="text-sm text-gray-700">{p.label}</span>
                    {assignment && (
                      <input
                        type="text"
                        placeholder="Title override"
                        value={assignment.titleOverride ?? ""}
                        onChange={(e) => {
                          const current = editingSection.pageAssignments ?? [];
                          setEditingSection({
                            ...editingSection,
                            pageAssignments: current.map((pa) =>
                              pa.pageId === p.id ? { ...pa, titleOverride: e.target.value || undefined } : pa
                            ),
                          });
                        }}
                        className="text-xs border border-gray-200 rounded px-2 py-1 w-32"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setEditingSection(null)} className="text-sm text-gray-500 hover:text-gray-900 cursor-pointer">Cancel</button>
            <button onClick={saveSection} className="text-sm bg-gray-900 text-white px-4 py-1.5 rounded-lg hover:bg-gray-800 cursor-pointer">Save</button>
          </div>
        </Modal>
      )}

      {/* --- ITEM EDIT MODAL --- */}
      {editingItem && (
        <Modal onClose={() => setEditingItem(null)}>
          <h3 className="text-base font-semibold text-gray-900 mb-4">
            {editingItem.id ? "Edit Item" : "Add Item"}
          </h3>
          <div className="space-y-3">
            <Field label="Name" value={editingItem.name ?? ""} onChange={(v) => setEditingItem({ ...editingItem, name: v })} />
            <Field label="URL" value={editingItem.href ?? ""} onChange={(v) => setEditingItem({ ...editingItem, href: v })} />
            {currentSectionDisplayType === "TILE" && (
              <>
                <Field label="Description" value={editingItem.description ?? ""} onChange={(v) => setEditingItem({ ...editingItem, description: v })} />
                <Field label="Image URL" value={editingItem.image ?? ""} onChange={(v) => setEditingItem({ ...editingItem, image: v })} />
              </>
            )}
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={editingItem.disabled ?? false}
                onChange={(e) => setEditingItem({ ...editingItem, disabled: e.target.checked })}
              />
              Disabled
            </label>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Visible on pages</label>
              <div className="flex flex-wrap gap-3">
                {pages.map((p) => (
                  <label key={p.id} className="flex items-center gap-1.5 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={editingItem.pageIds?.includes(p.id) ?? false}
                      onChange={(e) => {
                        const current = editingItem.pageIds ?? [];
                        setEditingItem({
                          ...editingItem,
                          pageIds: e.target.checked
                            ? [...current, p.id]
                            : current.filter((id) => id !== p.id),
                        });
                      }}
                    />
                    {p.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setEditingItem(null)} className="text-sm text-gray-500 hover:text-gray-900 cursor-pointer">Cancel</button>
            <button onClick={saveItem} className="text-sm bg-gray-900 text-white px-4 py-1.5 rounded-lg hover:bg-gray-800 cursor-pointer">Save</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-sm text-gray-600 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
      />
    </div>
  );
}
