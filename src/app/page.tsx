import Link from "next/link";
import { and, arrayContains, desc, eq, ilike, or, sql } from "drizzle-orm";
import { MapPin, Search } from "lucide-react";
import { getDb } from "@/lib/db";
import { woodItems } from "@/lib/db/schema";
import { Header } from "@/components/header";
import { WoodPhoto } from "@/components/wood-photo";
import { MoistureBadge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { formatDimensions } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface Filters {
  q?: string;
  species?: string;
  moisture?: string;
  tag?: string;
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Filters>;
}) {
  const { q, species, moisture, tag } = await searchParams;
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
  if (moisture === "verde" || moisture === "secando" || moisture === "seco") {
    conditions.push(eq(woodItems.moistureState, moisture));
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
  const hasFilters = !!(q || species || moisture || tag);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-7">
        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="font-display text-4xl font-semibold tracking-tight">
            Inventario
          </h1>
          {items.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {items.length} {items.length === 1 ? "pieza" : "piezas"} en el
              taller
            </p>
          )}
        </div>

        {/* Buscador y filtros */}
        <form
          method="get"
          className="mb-7 space-y-3 rounded-2xl border border-border/70 bg-card p-3 shadow-warm sm:p-4"
        >
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              name="q"
              defaultValue={q ?? ""}
              placeholder="Buscar por nombre, especie, ubicación o notas..."
              className="h-10 rounded-lg border-transparent bg-muted/60 pl-9 focus-visible:bg-card"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              name="species"
              defaultValue={species ?? ""}
              className="w-auto min-w-32 flex-1 rounded-full sm:flex-none"
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
              name="moisture"
              defaultValue={moisture ?? ""}
              className="w-auto min-w-32 flex-1 rounded-full sm:flex-none"
              aria-label="Filtrar por estado de humedad"
            >
              <option value="">Cualquier estado</option>
              <option value="verde">Verde</option>
              <option value="secando">Secando</option>
              <option value="seco">Seco</option>
            </Select>
            <Select
              name="tag"
              defaultValue={tag ?? ""}
              className="w-auto min-w-32 flex-1 rounded-full sm:flex-none"
              aria-label="Filtrar por etiqueta"
            >
              <option value="">Todas las etiquetas</option>
              {allTags.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
            <Button type="submit" size="sm" className="rounded-full px-4">
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

        {/* Grid de piezas */}
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border bg-card/50 py-20 text-center text-muted-foreground">
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
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((item) => {
              const dimensions = formatDimensions(
                item.lengthIn,
                item.widthIn,
                item.thicknessIn,
              );
              return (
                <Link
                  key={item.id}
                  href={`/items/${item.id}`}
                  className="group"
                >
                  <article className="h-full overflow-hidden rounded-2xl border border-border/60 bg-card shadow-warm transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-warm-lg">
                    <div className="relative overflow-hidden">
                      <WoodPhoto
                        url={item.photoUrl}
                        alt={item.name}
                        className="aspect-square w-full transition-transform duration-300 group-hover:scale-[1.05]"
                      />
                      <span className="absolute right-2 top-2 rounded-full bg-walnut/75 px-2.5 py-0.5 text-xs font-semibold text-walnut-foreground backdrop-blur-sm">
                        {item.quantity} {item.unit}
                      </span>
                    </div>
                    <div className="space-y-1.5 p-3.5">
                      {item.species && (
                        <p className="eyebrow text-primary">{item.species}</p>
                      )}
                      <h2 className="truncate text-[15px] font-semibold leading-snug">
                        {item.name}
                      </h2>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                        {item.moistureState && (
                          <MoistureBadge state={item.moistureState} />
                        )}
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
                    </div>
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
