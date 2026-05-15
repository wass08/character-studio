"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Star, X } from "lucide-react";
import { pb } from "@/stores/useConfiguratorStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { toast } from "@/components/ui/primitives/Toast";
import AdminShell from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL = "__all__";

const AdminPanel = () => {
  const isAdmin = useAuthStore((s) => s.isAdmin);

  const [groups, setGroups] = useState([]);
  const [genders, setGenders] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState(ALL);
  const [genderFilter, setGenderFilter] = useState(ALL);
  const [defaultsOnly, setDefaultsOnly] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    setLoading(true);
    Promise.all([
      pb.collection("CharacterStudioGroups").getFullList({ sort: "+position" }),
      pb
        .collection("CharacterStudioAssets")
        .getFullList({ sort: "-created", expand: "group,gender" }),
    ])
      .then(([g, a]) => {
        setGroups(g);
        setAssets(a);
        const uniq = new Map();
        a.forEach((rec) => {
          const gen = rec.expand?.gender;
          if (gen && !uniq.has(gen.id)) uniq.set(gen.id, gen);
        });
        setGenders([...uniq.values()]);
      })
      .catch((err) => {
        if (err?.isAbort) return;
        toast.error(err?.message || "Failed to load assets");
      })
      .finally(() => setLoading(false));
  }, [isAdmin]);

  // Map of asset id → which gender(s) it's the default for.
  const defaultsByAsset = useMemo(() => {
    const map = new Map();
    groups.forEach((g) => {
      if (g.startingAssetMan) {
        const list = map.get(g.startingAssetMan) || [];
        list.push("man");
        map.set(g.startingAssetMan, list);
      }
      if (g.startingAssetWoman) {
        const list = map.get(g.startingAssetWoman) || [];
        list.push("woman");
        map.set(g.startingAssetWoman, list);
      }
    });
    return map;
  }, [groups]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return assets.filter((a) => {
      if (groupFilter !== ALL && a.group !== groupFilter) return false;
      if (genderFilter !== ALL && a.gender !== genderFilter) return false;
      if (defaultsOnly && !defaultsByAsset.has(a.id)) return false;
      if (q && !a.name?.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [assets, query, groupFilter, genderFilter, defaultsOnly, defaultsByAsset]);

  // Group filtered assets by their category group, preserving the group
  // collection's position order. "Ungrouped" tail catches orphans.
  const sections = useMemo(() => {
    const byGroupId = new Map();
    filtered.forEach((a) => {
      const id = a.group || "__none__";
      if (!byGroupId.has(id)) byGroupId.set(id, []);
      byGroupId.get(id).push(a);
    });
    const out = [];
    groups.forEach((g) => {
      const list = byGroupId.get(g.id);
      if (list?.length) out.push({ group: g, assets: list });
      byGroupId.delete(g.id);
    });
    byGroupId.forEach((list, id) => {
      out.push({ group: { id, name: "Ungrouped" }, assets: list });
    });
    return out;
  }, [filtered, groups]);

  const hasActiveFilter =
    query || groupFilter !== ALL || genderFilter !== ALL || defaultsOnly;

  return (
    <AdminShell
      title="Asset admin"
      subtitle={`${filtered.length} of ${assets.length} assets`}
      actions={
        <Button asChild size="sm">
          <Link href="/admin/new">
            <Plus className="h-4 w-4" /> New
          </Link>
        </Button>
      }
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by name…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={groupFilter} onValueChange={setGroupFilter}>
            <SelectTrigger className="sm:w-48">
              <SelectValue placeholder="All groups" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All groups</SelectItem>
              {groups.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={genderFilter} onValueChange={setGenderFilter}>
            <SelectTrigger className="sm:w-40">
              <SelectValue placeholder="All genders" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All genders</SelectItem>
              {genders.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input px-3 py-1.5 text-sm">
            <Checkbox
              checked={defaultsOnly}
              onCheckedChange={(v) => setDefaultsOnly(Boolean(v))}
            />
            <span>Defaults only</span>
          </label>
          {hasActiveFilter && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setQuery("");
                setGroupFilter(ALL);
                setGenderFilter(ALL);
                setDefaultsOnly(false);
              }}
            >
              <X className="h-4 w-4" /> Reset
            </Button>
          )}
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            Loading…
          </div>
        ) : sections.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            No assets match.
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {sections.map(({ group, assets: items }) => (
              <section key={group.id} className="flex flex-col gap-3">
                <div className="flex items-baseline justify-between border-b border-border pb-2">
                  <h2 className="text-sm font-semibold tracking-tight">
                    {group.name}
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    {items.length}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {items.map((a) => {
                    const thumb =
                      a.r2ThumbnailUrl ||
                      (a.thumbnail ? pb.files.getURL(a, a.thumbnail) : null);
                    const defaultsFor = defaultsByAsset.get(a.id);
                    return (
                      <Link
                        key={a.id}
                        href={`/admin/${a.id}`}
                        className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card p-2 transition-colors hover:border-foreground/30 hover:bg-accent"
                      >
                        <div
                          className="relative aspect-square overflow-hidden rounded-md"
                          style={{
                            backgroundColor: a.thumbnailBg || "rgba(0,0,0,0.3)",
                          }}
                        >
                          {thumb ? (
                            <img
                              src={thumb}
                              alt={a.name}
                              className="h-full w-full object-contain transition-transform group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                              no thumb
                            </div>
                          )}
                          {defaultsFor && (
                            <span
                              className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-background/85 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ring-1 ring-border"
                              title={`Default for ${defaultsFor.join(" & ")}`}
                            >
                              <Star className="h-2.5 w-2.5 fill-current" />
                              <span>{defaultsFor.join(" / ")}</span>
                            </span>
                          )}
                        </div>
                        <div className="mt-2 truncate text-sm font-medium">
                          {a.name}
                        </div>
                        <div className="truncate text-[11px] text-muted-foreground">
                          {a.expand?.gender?.name || "—"}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
};

export default AdminPanel;
