"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { pb } from "@/stores/useConfiguratorStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { toast } from "@/components/ui/primitives/Toast";
import AdminShell from "@/components/admin/AdminShell";

const FIELD =
  "rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm focus:border-white/35 focus:outline-none";

const AdminPanel = () => {
  const isAdmin = useAuthStore((s) => s.isAdmin);

  const [groups, setGroups] = useState([]);
  const [genders, setGenders] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");

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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return assets.filter((a) => {
      if (groupFilter && a.group !== groupFilter) return false;
      if (genderFilter && a.gender !== genderFilter) return false;
      if (q && !a.name?.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [assets, query, groupFilter, genderFilter]);

  return (
    <AdminShell
      title="Asset admin"
      subtitle={`${filtered.length} of ${assets.length} assets`}
      actions={
        <Link
          href="/admin/new"
          className="rounded-lg bg-white/15 px-3 py-1.5 text-xs font-medium ring-1 ring-white/25 hover:bg-white/20"
        >
          + New
        </Link>
      }
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="search"
            placeholder="Search by name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={`${FIELD} flex-1`}
          />
          <select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            className={`${FIELD} sm:w-48`}
          >
            <option value="">All groups</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <select
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
            className={`${FIELD} sm:w-40`}
          >
            <option value="">All genders</option>
            {genders.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          {(query || groupFilter || genderFilter) && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setGroupFilter("");
                setGenderFilter("");
              }}
              className="rounded-lg bg-white/5 px-3 py-2 text-xs text-white/70 ring-1 ring-white/10 hover:bg-white/10"
            >
              Reset
            </button>
          )}
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-white/55">
            Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-white/55">
            No assets match.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {filtered.map((a) => {
              const thumb =
                a.r2ThumbnailUrl ||
                (a.thumbnail ? pb.files.getURL(a, a.thumbnail) : null);
              return (
                <Link
                  key={a.id}
                  href={`/admin/${a.id}`}
                  className="group flex flex-col overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] p-2 transition-colors hover:border-white/30 hover:bg-white/[0.05]"
                >
                  <div className="aspect-square overflow-hidden rounded-md bg-black/30">
                    {thumb ? (
                      <img
                        src={thumb}
                        alt={a.name}
                        className="h-full w-full object-contain transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-white/30">
                        no thumb
                      </div>
                    )}
                  </div>
                  <div className="mt-2 truncate text-sm font-medium">
                    {a.name}
                  </div>
                  <div className="truncate text-[11px] text-white/45">
                    {a.expand?.group?.name || "—"}
                    {a.expand?.gender?.name &&
                      ` · ${a.expand.gender.name}`}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </AdminShell>
  );
};

export default AdminPanel;
