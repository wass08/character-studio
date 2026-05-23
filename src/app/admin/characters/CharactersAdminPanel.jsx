"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, EyeOff, Eye, Search, Star, StarOff } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { pb } from "@/stores/useConfiguratorStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { toast } from "@/components/ui/primitives/Toast";

/**
 * Moderation + curation. Admins see every character (including hidden),
 * toggle the featured flag for the hub's featured row, and hide misuse.
 */
const CharactersAdminPanel = () => {
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState({});

  useEffect(() => {
    if (!isAdmin) return;
    setLoading(true);
    pb.collection("CharacterStudioCharacters")
      .getFullList({ sort: "-updated", expand: "user" })
      .then(setItems)
      .catch((e) => toast.error(e?.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, [isAdmin]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return items;
    return items.filter(
      (i) =>
        i.name?.toLowerCase().includes(term) ||
        i.expand?.user?.name?.toLowerCase().includes(term) ||
        i.expand?.user?.email?.toLowerCase().includes(term),
    );
  }, [items, q]);

  const patch = async (rec, change) => {
    if (busy[rec.id]) return;
    setBusy((b) => ({ ...b, [rec.id]: true }));
    try {
      const updated = await pb
        .collection("CharacterStudioCharacters")
        .update(rec.id, change);
      setItems((l) => l.map((x) => (x.id === rec.id ? { ...x, ...updated } : x)));
    } catch (e) {
      toast.error(e?.message || "Failed");
    } finally {
      setBusy((b) => {
        const { [rec.id]: _, ...rest } = b;
        return rest;
      });
    }
  };

  return (
    <AdminShell
      title="Characters"
      subtitle={`${filtered.length} of ${items.length}`}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-6">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by character name or author…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-8"
          />
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-6 py-16 text-center text-sm text-muted-foreground">
            Nothing matches.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {filtered.map((c) => {
              const thumb = c.thumbnail
                ? pb.files.getURL(c, c.thumbnail, { thumb: "256x256" })
                : null;
              const featured = !!c.featured;
              const hidden = !!c.hidden;
              const author =
                c.expand?.user?.name || c.expand?.user?.email || "—";
              return (
                <div
                  key={c.id}
                  className="relative overflow-hidden rounded-xl border border-border bg-card"
                >
                  <div className="relative aspect-square overflow-hidden bg-muted">
                    {thumb ? (
                      <img
                        src={thumb}
                        alt={c.name}
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                    {hidden && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/55 text-[10px] font-semibold uppercase tracking-widest text-white/90">
                        hidden
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">
                          {c.name}
                        </div>
                        <div className="truncate text-[11px] text-muted-foreground">
                          {author}
                        </div>
                      </div>
                      <Link
                        href={`/c/${c.id}`}
                        className="text-muted-foreground hover:text-foreground"
                        title="Open profile"
                      >
                        <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    </div>
                    <div className="mt-1 flex items-center gap-1">
                      <Button
                        size="sm"
                        variant={featured ? "default" : "outline"}
                        onClick={() => patch(c, { featured: !featured })}
                        className="h-7 flex-1 gap-1 px-2 text-[11px]"
                        disabled={!!busy[c.id]}
                      >
                        {featured ? (
                          <Star className="h-3.5 w-3.5 fill-current" />
                        ) : (
                          <StarOff className="h-3.5 w-3.5" />
                        )}
                        {featured ? "Featured" : "Feature"}
                      </Button>
                      <Button
                        size="sm"
                        variant={hidden ? "destructive" : "outline"}
                        onClick={() => patch(c, { hidden: !hidden })}
                        className="h-7 flex-1 gap-1 px-2 text-[11px]"
                        disabled={!!busy[c.id]}
                      >
                        {hidden ? (
                          <Eye className="h-3.5 w-3.5" />
                        ) : (
                          <EyeOff className="h-3.5 w-3.5" />
                        )}
                        {hidden ? "Unhide" : "Hide"}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminShell>
  );
};

export default CharactersAdminPanel;
