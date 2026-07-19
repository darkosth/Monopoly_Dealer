"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, LogOut, Plus, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

async function api(url, options) {
  const response = await fetch(url, { ...options, headers: { "Content-Type": "application/json", ...options?.headers } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || data.error || "Request failed");
  return data;
}

export default function AdminCatalog() {
  const [authenticated, setAuthenticated] = useState(null);
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const [categories, setCategories] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [newOption, setNewOption] = useState({ textEs: "", textEn: "", imageUrl: "" });

  const load = useCallback(async () => {
    const data = await api("/api/heads-up/admin/categories");
    setCategories(data.categories); setSelectedId((value) => value || data.categories[0]?.id || null);
  }, []);

  useEffect(() => { api("/api/heads-up/admin/session").then((data) => { setAuthenticated(data.authenticated); if (data.authenticated) load(); }).catch(() => setAuthenticated(false)); }, [load]);
  const selected = categories.find((category) => category.id === selectedId);
  const visibleOptions = useMemo(() => (selected?.options || []).filter((option) => `${option.textEs} ${option.textEn}`.toLowerCase().includes(query.toLowerCase())), [query, selected]);

  const login = async (event) => { event.preventDefault(); setError(""); try { await api("/api/heads-up/admin/session", { method: "POST", body: JSON.stringify(credentials) }); setAuthenticated(true); await load(); } catch (caught) { setError(caught.message); } };
  const logout = async () => { await api("/api/heads-up/admin/session", { method: "DELETE" }); setAuthenticated(false); };
  const updateLocalCategory = (id, patch) => setCategories((current) => current.map((category) => category.id === id ? { ...category, ...patch } : category));
  const updateLocalOption = (id, patch) => updateLocalCategory(selectedId, { options: selected.options.map((option) => option.id === id ? { ...option, ...patch } : option) });
  const mutate = async (operation) => { setError(""); try { await operation(); } catch (caught) { setError(caught.message); } };
  const saveCategory = () => mutate(async () => { await api(`/api/heads-up/admin/categories/${selected.id}`, { method: "PATCH", body: JSON.stringify(selected) }); await load(); });
  const saveOption = (option) => mutate(async () => { await api(`/api/heads-up/admin/options/${option.id}`, { method: "PATCH", body: JSON.stringify(option) }); await load(); });
  const addOption = (event) => { event.preventDefault(); mutate(async () => { await api(`/api/heads-up/admin/categories/${selected.id}/options`, { method: "POST", body: JSON.stringify(newOption) }); setNewOption({ textEs: "", textEn: "", imageUrl: "" }); await load(); }); };
  const addCategory = () => mutate(async () => { const data = await api("/api/heads-up/admin/categories", { method: "POST", body: JSON.stringify({ nameEs: "Nueva categoría", nameEn: "New category", sortOrder: categories.length }) }); await load(); setSelectedId(data.category.id); });

  if (authenticated === null) return <main className="min-h-dvh bg-stone-950 text-white grid place-items-center">Loading…</main>;
  if (!authenticated) return <main className="min-h-dvh bg-stone-950 p-6 text-white"><form onSubmit={login} className="mx-auto mt-24 max-w-sm space-y-4 rounded-3xl border border-white/10 bg-stone-900 p-7"><h1 className="text-3xl font-black">Catalog admin</h1><Input placeholder="Username" autoComplete="username" value={credentials.username} onChange={(event) => setCredentials({ ...credentials, username: event.target.value })}/><Input type="password" placeholder="Password" autoComplete="current-password" value={credentials.password} onChange={(event) => setCredentials({ ...credentials, password: event.target.value })}/>{error && <p className="text-sm text-rose-300">{error}</p>}<Button className="h-12 w-full bg-amber-300 font-black text-stone-950">Sign in</Button></form></main>;

  return <main className="min-h-dvh bg-stone-950 p-5 text-white"><div className="mx-auto max-w-7xl"><header className="mb-8 flex items-center justify-between"><Link href="/heads-up" className="inline-flex items-center gap-2 text-stone-400 hover:text-white"><ArrowLeft/> Heads Up</Link><Button variant="ghost" onClick={logout}><LogOut/> Sign out</Button></header>{error && <p role="alert" className="mb-4 rounded-xl bg-rose-500/10 p-3 text-rose-300">{error}</p>}<div className="grid gap-6 lg:grid-cols-[18rem_1fr]"><aside className="space-y-3"><Button onClick={addCategory} className="h-11 w-full bg-amber-300 font-black text-stone-950"><Plus/> Category</Button>{categories.map((category) => <button key={category.id} onClick={() => setSelectedId(category.id)} className={`w-full rounded-2xl border p-4 text-left ${selectedId === category.id ? "border-amber-300 bg-amber-300 text-stone-950" : "border-white/10 bg-stone-900"}`}><span className="block font-black">{category.nameEs}</span><span className="text-sm opacity-60">{category.nameEn} · {category.options.length}</span></button>)}</aside>{selected && <section className="space-y-6"><div className="grid gap-3 rounded-3xl border border-white/10 bg-stone-900 p-5 sm:grid-cols-2"><Input aria-label="Category name in Spanish" placeholder="Español" value={selected.nameEs} onChange={(event) => updateLocalCategory(selected.id, { nameEs: event.target.value })}/><Input aria-label="Category name in English" placeholder="English" value={selected.nameEn} onChange={(event) => updateLocalCategory(selected.id, { nameEn: event.target.value })}/><label className="flex items-center gap-2"><input type="checkbox" checked={selected.isActive} onChange={(event) => updateLocalCategory(selected.id, { isActive: event.target.checked })}/> Active</label><Button onClick={saveCategory} className="bg-amber-300 font-black text-stone-950"><Save/> Save category</Button></div><form onSubmit={addOption} className="grid gap-3 rounded-3xl border border-amber-300/30 bg-amber-300/5 p-5 md:grid-cols-[1fr_1fr_1fr_auto]"><Input required placeholder="Español" value={newOption.textEs} onChange={(event) => setNewOption({ ...newOption, textEs: event.target.value })}/><Input required placeholder="English" value={newOption.textEn} onChange={(event) => setNewOption({ ...newOption, textEn: event.target.value })}/><Input placeholder="https:// image (optional)" value={newOption.imageUrl} onChange={(event) => setNewOption({ ...newOption, imageUrl: event.target.value })}/><Button className="bg-amber-300 font-black text-stone-950"><Plus/> Add</Button></form><Input placeholder="Search options" value={query} onChange={(event) => setQuery(event.target.value)}/><div className="space-y-3">{visibleOptions.map((option) => <div key={option.id} className={`grid gap-3 rounded-2xl border p-4 md:grid-cols-[1fr_1fr_1fr_auto_auto] ${option.isActive ? "border-white/10 bg-stone-900" : "border-rose-400/20 bg-rose-950/20 opacity-70"}`}><Input aria-label="Option in Spanish" placeholder="Español" value={option.textEs} onChange={(event) => updateLocalOption(option.id, { textEs: event.target.value })}/><Input aria-label="Option in English" placeholder="English" value={option.textEn} onChange={(event) => updateLocalOption(option.id, { textEn: event.target.value })}/><Input placeholder="Image URL" value={option.imageUrl || ""} onChange={(event) => updateLocalOption(option.id, { imageUrl: event.target.value })}/><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={option.isActive} onChange={(event) => updateLocalOption(option.id, { isActive: event.target.checked })}/> Active</label><Button aria-label="Save option" onClick={() => saveOption(option)}><Save/></Button></div>)}</div></section>}</div></div></main>;
}
