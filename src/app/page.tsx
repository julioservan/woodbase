import Link from "next/link";
import { and, arrayContains, desc, eq, ilike, or, sql } from "drizzle-orm";
import { MapPin, Search } from "lucide-react";
import { getDb } from "@/lib/db";
import { woodItems } from "@/lib/db/schema";
import { Header } from "@/components/header";
import { WoodPhoto } from "@/components/wood-photo";
import { CutBadge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  CUT_LABELS,
  CUT_TYPES,
  formatDimensions,
  type CutType,
} from "@/lib/utils";

export const dynamic = "force-dynamic";

interface Filters {
  q?: string;
  species?: string;
  cut?: string;
  tag?: string;
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Filters>;
}) {
  const { q, species, cut, tag } = await searchParams;
  const db = getDb();

  const conditions = [];
  if (q) {
    const pattern = `%${q}%`;
    conditions.push(
      or(
        ilike(woodItems.name, pattern),
        ilike(woodItems.species, pattern),
        ilike(woodItems.location, pattern),
        ilike(woodItems.notes, pattern),
      ),
    );
  }
  if (species) conditions.push(eq(woodItems.species, species));
  if (CUT_TYPES.includes(cut as CutType)) {
    conditions.push(eq(woodItems.cutType, cut as CutType));
  }
  if (tag) conditions.push(arrayContains(woodItems.tags, [tag]));

  const [items, speciesRows, tagRows] = await Promise.all([
    db
      .select()
      .from(woodItems)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(woodItems.createdAt)),
    db
      .selectDistinct({ species: woodItems.species })
      .from(woodItems)
      .orderBy(woodItems.species),
    db.execute(
      sql`select distinct unnest(${woodItems.tags}) as tag from ${woodItems} order by tag`,
    ),
  ]);

  const allSpecies = speciesRows
    .map((r) => r.species)
    .filter((s): s is string => !!s);
  const allTags = (tagRows.rows as { tag: string }[]).map((r) => r.tag);
  const hasFilters = !!(q || species || cut || tag);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-7">
        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-letterpress font-display text-4xl font-semibold tracking-tight">
            Inventario
          </h1>
          {items.length > 0 && (
            <p className="text-letterpress text-sm font-medium text-foreground/60">
              {items.length} {items.length === 1 ? "pieza" : "piezas"} en el
              taller
            </p>
          )}
        </div>

        {/* Buscador y filtros */}
        <form
          method="get"
          className="panel-paper mb-8 space-y-3 rounded-2xl p-3 sm:p-4"
        >
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              name="q"
              defaultValue={q ?? ""}
              placeholder="Buscar por nombre, especie, ubicación o notas..."
              className="h-10 pl-9"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              name="species"
              defaultValue={species ?? ""}
              className="w-auto min-w-32 flex-1 sm:flex-none"
              aria-label="Filtrar por especie"
            >
              <option value="">Todas las especies</option>
              {allSpecies.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
            <Select
              name="cut"
              defaultValue={cut ?? ""}
              className="w-auto min-w-32 flex-1 sm:flex-none"
              aria-label="Filtrar por tipo de corte"
            >
              <option value="">Cualquier corte</option>
              {CUT_TYPES.map((c) => (
                <option key={c} value={c}>
                  {CUT_LABELS[c]}
                </option>
              ))}
            </Select>
            <Select
              name="tag"
              defaultValue={tag ?? ""}
              className="w-auto min-w-32 flex-1 sm:flex-none"
              aria-label="Filtrar por etiqueta"
            >
              <option value="">Todas las etiquetas</option>
              {allTags.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
            <Button type="submit" size="sm" className="rounded-lg px-4">
              Filtrar
            </Button>
            {hasFilters && (
              <Link
                href="/"
                className="text-sm text-muted-foreground underline-offset-2 hover:underline"
              >
                Limpiar
              </Link>
            )}
          </div>
        </form>

        {/* Grid de piezas, cada una apoyada en su balda */}
        {items.length === 0 ? (
          <div className="panel-paper flex flex-col items-center gap-4 rounded-2xl py-20 text-center text-muted-foreground">
            <WoodPhoto url={null} alt="" className="h-24 w-24 rounded-full" />
            {hasFilters ? (
              <p>Ninguna pieza coincide con los filtros.</p>
            ) : (
              <>
                <p>Tu inventario está vacío.</p>
                <Link
                  href="/items/new"
                  className="font-medium text-primary underline-offset-2 hover:underline"
                >
                  Añade tu primera pieza de madera
                </Link>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-5 gap-y-9 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((item) => {
              const dimensions = formatDimensions(
                item.lengthIn,
                item.widthIn,
                item.thicknessIn,
              );
              // Los PNG son recortes sin fondo: la pieza se apoya tal cual
              // sobre la balda. El resto de fotos van enmarcadas.
              const isCutout = item.photoUrl
                ?.split("?")[0]
                .toLowerCase()
                .endsWith(".png");
              return (
                <Link
                  key={item.id}
                  href={`/items/${item.id}`}
                  className="group flex flex-col"
                >
                  {/* La pieza, de pie sobre su balda. Altura fija para que
                      todas las baldas de una fila queden alineadas. */}
                  <div className="relative z-10 flex h-44 items-end justify-center px-1.5 transition-transform duration-200 group-hover:-translate-y-1.5 sm:h-52">
                    {isCutout ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.photoUrl!}
                        alt={item.name}
                        className="max-h-[96%] max-w-full object-contain [filter:drop-shadow(0_12px_9px_rgba(30,18,8,0.38))_drop-shadow(0_2px_2px_rgba(30,18,8,0.35))]"
                      />
                    ) : (
                      <div className="relative mb-1 aspect-square max-h-[92%] w-[88%] overflow-hidden rounded-lg border-[5px] border-[#5a3f28] bg-card shadow-[0_12px_14px_rgba(30,18,8,0.4),0_2px_3px_rgba(30,18,8,0.3)]">
                        <WoodPhoto
                          url={item.photoUrl}
                          alt={item.name}
                          className="h-full w-full"
                        />
                        {/* Cristal: sombra interior y filo de luz sobre la foto */}
                        <div className="pointer-events-none absolute inset-0 shadow-[inset_0_2px_8px_rgba(30,18,8,0.45),inset_0_0_0_1px_rgba(255,255,255,0.25)]" />
                      </div>
                    )}
                    <span className="brass absolute right-1 top-1 rounded-md px-2 py-0.5 text-[11px] font-bold">
                      {item.quantity} {item.unit}
                    </span>
                  </div>
                  {/* Balda sobre la que descansa la pieza */}
                  <div className="shelf relative mx-[-5%]" />
                  {/* Plaquita con los datos, bajo la balda */}
                  <article className="panel-paper mt-2.5 space-y-1.5 rounded-xl p-3.5">
                    {item.species && (
                      <p className="eyebrow text-primary">{item.species}</p>
                    )}
                    <h2 className="text-letterpress truncate text-[15px] font-semibold leading-snug">
                      {item.name}
                    </h2>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      {item.cutType && <CutBadge cut={item.cutType} />}
                      {item.location && (
                        <span className="inline-flex min-w-0 items-center gap-1">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate">{item.location}</span>
                        </span>
                      )}
                    </div>
                    {dimensions && (
                      <p className="text-xs tabular-nums text-muted-foreground/80">
                        {dimensions}
                      </p>
                    )}
                  </article>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
