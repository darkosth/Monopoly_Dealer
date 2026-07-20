"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, LoaderCircle, LogOut, Plus, Save, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

async function api(url, options) {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
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
  const [showInactive, setShowInactive] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [generationOpen, setGenerationOpen] = useState(false);
  const [generationForm, setGenerationForm] = useState({ name: "", explanation: "", instructions: "" });
  const [generationJobId, setGenerationJobId] = useState(null);
  const [generationStatus, setGenerationStatus] = useState("");
  const [generationError, setGenerationError] = useState("");

  const load = useCallback(async () => {
    const data = await api("/api/heads-up/admin/categories");
    setCategories(data.categories);
    setSelectedId((value) => value || data.categories[0]?.id || null);
  }, []);

  useEffect(() => {
    api("/api/heads-up/admin/session")
      .then((data) => {
        setAuthenticated(data.authenticated);
        if (data.authenticated) {
          load();
          api("/api/heads-up/admin/generation-jobs")
            .then(({ job }) => {
              if (!job) return;
              setGenerationJobId(job.id);
              setGenerationStatus(job.status);
              setGenerationOpen(true);
            })
            .catch((caught) => setError(caught.message));
        }
      })
      .catch(() => setAuthenticated(false));
  }, [load]);

  useEffect(() => {
    if (!generationJobId) return undefined;
    let cancelled = false;
    let timer;
    let failures = 0;

    const poll = async () => {
      try {
        const data = await api(`/api/heads-up/admin/generation-jobs/${generationJobId}`);
        if (cancelled) return;
        failures = 0;
        setGenerationStatus(data.job.status);

        if (data.job.status === "READY") {
          const draftId = `generated:${generationJobId}`;
          const generated = {
            ...data.job.result.category,
            id: draftId,
            generationJobId,
            isGeneratedDraft: true,
            options: data.job.result.options.map((option) => ({ ...option, clientKey: crypto.randomUUID() })),
          };
          setCategories((current) => [generated, ...current.filter((category) => category.id !== draftId)]);
          setSelectedId(draftId);
          setGenerationJobId(null);
          setGenerationOpen(false);
          setGenerationForm({ name: "", explanation: "", instructions: "" });
          setGenerationError("");
          setNotice("Borrador generado. Revísalo antes de guardar.");
          return;
        }

        if (data.job.status === "FAILED" || data.job.status === "CANCELLED") {
          setGenerationJobId(null);
          setGenerationError(data.job.error || "La generación no pudo completarse.");
          setGenerationOpen(true);
          return;
        }
      } catch (caught) {
        failures += 1;
        if (failures >= 3) {
          setGenerationJobId(null);
          setGenerationError(caught.message);
          setGenerationOpen(true);
          return;
        }
      }
      timer = setTimeout(poll, 2500);
    };

    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [generationJobId]);

  const selected = categories.find((category) => category.id === selectedId);
  const visibleOptions = useMemo(() => (selected?.options || [])
    .map((option, index) => ({ option, index }))
    .filter(({ option }) => showInactive || option.isActive)
    .filter(({ option }) => `${option.textEs} ${option.textEn}`.toLowerCase().includes(query.toLowerCase())),
  [query, selected, showInactive]);

  const login = async (event) => {
    event.preventDefault();
    setError("");
    try {
      await api("/api/heads-up/admin/session", { method: "POST", body: JSON.stringify(credentials) });
      setAuthenticated(true);
      await load();
    } catch (caught) {
      setError(caught.message);
    }
  };

  const logout = async () => {
    await api("/api/heads-up/admin/session", { method: "DELETE" });
    setAuthenticated(false);
  };

  const updateLocalCategory = (id, patch) => {
    setNotice("");
    setCategories((current) => current.map((category) => category.id === id
      ? { ...category, ...patch }
      : category));
  };

  const updateLocalOption = (key, patch) => {
    updateLocalCategory(selectedId, {
      options: selected.options.map((option) => (option.id || option.clientKey) === key
        ? { ...option, ...patch }
        : option),
    });
  };

  const addDraftOption = () => {
    const sortOrder = selected.options.reduce((maximum, option) => Math.max(maximum, option.sortOrder), -1) + 1;
    updateLocalCategory(selectedId, {
      options: [...selected.options, {
        clientKey: crypto.randomUUID(),
        textEs: "",
        textEn: "",
        imageUrl: "",
        isActive: true,
        sortOrder,
      }],
    });
    setQuery("");
    setShowInactive(false);
  };

  const removeDraftOption = (key) => {
    updateLocalCategory(selectedId, {
      options: selected.options.filter((option) => (option.id || option.clientKey) !== key),
    });
  };

  const saveDraft = async () => {
    setError("");
    setNotice("");
    setSaving(true);
    try {
      const draft = {
        category: {
          nameEs: selected.nameEs,
          nameEn: selected.nameEn,
          isActive: selected.isActive,
          sortOrder: selected.sortOrder,
        },
        options: selected.options.map(({ clientKey, ...option }) => option),
      };
      const data = selected.isGeneratedDraft
        ? await api(`/api/heads-up/admin/generation-jobs/${selected.generationJobId}/import`, {
          method: "POST",
          body: JSON.stringify(draft),
        })
        : await api(`/api/heads-up/admin/categories/${selected.id}`, {
          method: "PUT",
          body: JSON.stringify(draft),
        });
      setCategories((current) => current.map((category) => category.id === data.category.id
        ? data.category
        : category).filter((category) => category.id !== selected.id || category.id === data.category.id));
      if (selected.isGeneratedDraft) {
        const refreshed = await api("/api/heads-up/admin/categories");
        setCategories(refreshed.categories);
        setSelectedId(data.category.id);
      }
      setNotice(selected.isGeneratedDraft ? "Categoría guardada" : "Cambios guardados");
    } catch (caught) {
      setError(caught.message);
    } finally {
      setSaving(false);
    }
  };

  const generateCategory = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setGenerationError("");
    try {
      const data = await api("/api/heads-up/admin/generation-jobs", {
        method: "POST",
        body: JSON.stringify(generationForm),
      });
      setGenerationJobId(data.job.id);
      setGenerationStatus(data.job.status);
    } catch (caught) {
      setGenerationError(caught.message);
    }
  };

  const addCategory = async () => {
    setError("");
    setNotice("");
    try {
      const data = await api("/api/heads-up/admin/categories", {
        method: "POST",
        body: JSON.stringify({ nameEs: "Nueva categoría", nameEn: "New category", sortOrder: categories.length }),
      });
      await load();
      setSelectedId(data.category.id);
    } catch (caught) {
      setError(caught.message);
    }
  };

  if (authenticated === null) {
    return <main className="grid min-h-dvh place-items-center bg-stone-950 text-white">Loading…</main>;
  }

  if (!authenticated) {
    return (
      <main className="min-h-dvh bg-stone-950 p-6 text-white">
        <form onSubmit={login} className="mx-auto mt-24 max-w-sm space-y-4 rounded-3xl border border-white/10 bg-stone-900 p-7">
          <h1 className="text-3xl font-black">Catalog admin</h1>
          <Input placeholder="Username" autoComplete="username" value={credentials.username} onChange={(event) => setCredentials({ ...credentials, username: event.target.value })} />
          <Input type="password" placeholder="Password" autoComplete="current-password" value={credentials.password} onChange={(event) => setCredentials({ ...credentials, password: event.target.value })} />
          {error && <p className="text-sm text-rose-300">{error}</p>}
          <Button className="h-12 w-full bg-amber-300 font-black text-stone-950">Sign in</Button>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-stone-950 p-4 text-white sm:p-6">
      <div className="mx-auto max-w-[96rem]">
        <header className="mb-8 flex items-center justify-between">
          <Link href="/heads-up" className="inline-flex items-center gap-2 text-stone-400 hover:text-white"><ArrowLeft /> Heads Up</Link>
          <Button variant="ghost" onClick={logout}><LogOut /> Sign out</Button>
        </header>

        {error && <p role="alert" className="mb-4 rounded-xl bg-rose-500/10 p-3 text-rose-300">{error}</p>}
        {notice && <p role="status" className="mb-4 rounded-xl bg-emerald-500/10 p-3 text-emerald-300">{notice}</p>}

        <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <aside className="space-y-3">
            <Button type="button" variant="outline" onClick={() => setGenerationOpen(true)} className="h-11 w-full border-violet-400/40 bg-violet-400/10 font-black text-violet-200 hover:bg-violet-400/20 hover:text-white">
              <Sparkles /> Generar con Yuri
            </Button>
            <Button onClick={addCategory} className="h-11 w-full bg-amber-300 font-black text-stone-950"><Plus /> Categoría</Button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => { setSelectedId(category.id); setQuery(""); setNotice(""); }}
                className={`w-full rounded-2xl border p-4 text-left ${selectedId === category.id ? "border-amber-300 bg-amber-300 text-stone-950" : "border-white/10 bg-stone-900"}`}
              >
                <span className="flex items-center justify-between gap-2 font-black">
                  {category.nameEs}
                  {category.isGeneratedDraft && <span className="rounded-full bg-violet-500/20 px-2 py-1 text-[10px] uppercase tracking-wide text-violet-200">Borrador</span>}
                </span>
                <span className="text-sm opacity-60">{category.nameEn} · {category.options.filter((option) => option.isActive).length}</span>
              </button>
            ))}
          </aside>

          {selected && (
            <section className="min-w-0 space-y-5">
              {selected.isGeneratedDraft && (
                <p className="rounded-xl border border-violet-400/30 bg-violet-400/10 p-3 text-sm font-semibold text-violet-200">Borrador de Yuri · aún no está publicado</p>
              )}
              <div className="grid gap-3 rounded-2xl border border-white/10 bg-stone-900 p-4 sm:grid-cols-[1fr_1fr_auto]">
                <Input aria-label="Category name in Spanish" placeholder="Categoría en español" value={selected.nameEs} onChange={(event) => updateLocalCategory(selected.id, { nameEs: event.target.value })} />
                <Input aria-label="Category name in English" placeholder="Category in English" value={selected.nameEn} onChange={(event) => updateLocalCategory(selected.id, { nameEn: event.target.value })} />
                <label className="flex items-center gap-2 px-2 text-sm font-semibold">
                  <input type="checkbox" checked={selected.isActive} onChange={(event) => updateLocalCategory(selected.id, { isActive: event.target.checked })} /> Activa
                </label>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Input className="sm:max-w-sm" placeholder="Buscar palabras" value={query} onChange={(event) => setQuery(event.target.value)} />
                <label className="flex items-center gap-2 text-sm text-stone-300">
                  <input type="checkbox" checked={showInactive} onChange={(event) => setShowInactive(event.target.checked)} /> Mostrar inactivas
                </label>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-white/10 bg-stone-900">
                <table className="w-full min-w-[900px] border-collapse text-sm">
                  <thead className="bg-white/5 text-left text-xs uppercase tracking-wider text-stone-400">
                    <tr>
                      <th className="w-14 px-3 py-3 text-center">#</th>
                      <th className="px-2 py-3">Español</th>
                      <th className="px-2 py-3">English</th>
                      <th className="w-[34%] px-2 py-3">Image URL</th>
                      <th className="w-20 px-2 py-3 text-center">Active</th>
                      <th className="w-14 px-2 py-3"><span className="sr-only">Archivar</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {visibleOptions.map(({ option, index }) => {
                      const key = option.id || option.clientKey;
                      return (
                        <tr key={key} className={option.isActive ? "" : "bg-rose-950/10 text-stone-400"}>
                          <td className="px-3 py-2 text-center font-mono text-stone-500">{index + 1}</td>
                          <td className="p-2"><Input aria-label={`Palabra ${index + 1} en español`} value={option.textEs} onChange={(event) => updateLocalOption(key, { textEs: event.target.value })} /></td>
                          <td className="p-2"><Input aria-label={`Word ${index + 1} in English`} value={option.textEn} onChange={(event) => updateLocalOption(key, { textEn: event.target.value })} /></td>
                          <td className="p-2"><Input aria-label={`Image URL for option ${index + 1}`} placeholder="https://" value={option.imageUrl || ""} onChange={(event) => updateLocalOption(key, { imageUrl: event.target.value })} /></td>
                          <td className="p-2 text-center"><input aria-label={`Option ${index + 1} active`} type="checkbox" checked={option.isActive} onChange={(event) => updateLocalOption(key, { isActive: event.target.checked })} /></td>
                          <td className="p-2 text-center">
                            <Button type="button" size="icon" variant="ghost" aria-label={`Archivar opción ${index + 1}`} title="Archivar al guardar" onClick={() => removeDraftOption(key)} className="text-stone-500 hover:bg-rose-500/10 hover:text-rose-300"><X /></Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Button type="button" variant="outline" onClick={addDraftOption}><Plus /> Agregar palabra</Button>
                <Button type="button" onClick={saveDraft} disabled={saving} className="h-12 bg-amber-300 px-8 font-black text-stone-950 hover:bg-amber-200">
                  <Save /> {saving ? "Guardando…" : selected.isGeneratedDraft ? "Guardar categoría" : "Guardar cambios"}
                </Button>
              </div>
            </section>
          )}
        </div>
      </div>

      <Dialog open={generationOpen} onOpenChange={setGenerationOpen}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto border-stone-700 bg-stone-950 p-6 text-white ring-white/10 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl font-black"><Sparkles className="text-violet-300" /> Generar categoría</DialogTitle>
            <DialogDescription className="text-stone-400">Yuri preparará 100 opciones bilingües para revisar.</DialogDescription>
          </DialogHeader>

          <form id="heads-up-generation-form" onSubmit={generateCategory} className="space-y-4">
            <label className="block space-y-2 text-sm font-bold">
              Nombre
              <Input required maxLength={80} placeholder="Ej. Animales marinos" value={generationForm.name} onChange={(event) => setGenerationForm((current) => ({ ...current, name: event.target.value }))} disabled={Boolean(generationJobId)} />
            </label>
            <label className="block space-y-2 text-sm font-bold">
              Explicación
              <textarea required maxLength={600} rows={3} placeholder="Qué debe incluir esta categoría" value={generationForm.explanation} onChange={(event) => setGenerationForm((current) => ({ ...current, explanation: event.target.value }))} disabled={Boolean(generationJobId)} className="w-full resize-y rounded-md border border-white/10 bg-stone-900 px-3 py-2 text-sm outline-none focus:border-violet-300 disabled:opacity-50" />
            </label>
            <label className="block space-y-2 text-sm font-bold">
              Instrucciones adicionales
              <textarea maxLength={1200} rows={4} placeholder="Opcional" value={generationForm.instructions} onChange={(event) => setGenerationForm((current) => ({ ...current, instructions: event.target.value }))} disabled={Boolean(generationJobId)} className="w-full resize-y rounded-md border border-white/10 bg-stone-900 px-3 py-2 text-sm outline-none focus:border-violet-300 disabled:opacity-50" />
            </label>
            {generationJobId && (
              <p role="status" className="flex items-center gap-2 rounded-xl bg-violet-400/10 p-3 text-sm font-semibold text-violet-200">
                <LoaderCircle className="animate-spin" /> {generationStatus === "RUNNING" ? "Yuri está creando la categoría…" : "Esperando a Yuri…"}
              </p>
            )}
            {generationError && <p role="alert" className="rounded-xl bg-rose-500/10 p-3 text-sm font-semibold text-rose-300">{generationError}</p>}
          </form>

          <DialogFooter className="-mx-6 -mb-6 border-white/10 bg-stone-900/80 p-6">
            <Button type="button" variant="ghost" onClick={() => setGenerationOpen(false)}>{generationJobId ? "Seguir en segundo plano" : "Cerrar"}</Button>
            <Button type="submit" form="heads-up-generation-form" disabled={Boolean(generationJobId)} className="bg-violet-300 font-black text-stone-950 hover:bg-violet-200">
              {generationJobId ? <LoaderCircle className="animate-spin" /> : <Sparkles />} Generar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
