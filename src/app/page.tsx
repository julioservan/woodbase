import Link from "next/link";
import { and, arrayContains, desc, eq, ilike, or, sql } from "drizzle-orm";
import { Search, TreePine } from "lucide-react";
import { getDb } from "@/lib/db";
import { woodItems } from "@/lib/db/schema";
import { Header } from "@/components/header";
import { WoodPhoto } from "@/components/wood-photo";
import { Badge, moistureBadgeVariant } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

interface Filters {
  q?: string;
  species?: string;
  moisture?: string;
  tag?: string;
}

const MOISTURE_LABELS: Record<string, string> = {
  verde: "Verde",
  secando: "Secando",
  seco: "Seco",
};

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
      <main className="mx-auto max-w-5xl px-4 py-6">
        {/* Buscador y filtros */}
        <form method="get" className="mb-6 space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              name="q"
              defaultValue={q ?? ""}
              placeholder="Buscar por nombre, especie, ubicación o notas..."
              className="pl-9"
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
              name="moisture"
              defaultValue={moisture ?? ""}
              className="w-auto min-w-32 flex-1 sm:flex-none"
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
            <Button type="submit" variant="secondary" size="sm">
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
          <div className="flex flex-col items-center gap-3 py-20 text-center text-muted-foreground">
            <TreePine className="h-10 w-10" />
            {hasFilters ? (
              <p>Ninguna pieza coincide con los filtros.</p>
            ) : (
              <>
                <p>Tu inventario está vacío.</p>
                <Link
                  href="/items/new"
                  className="text-primary underline-offset-2 hover:underline"
                >
                  Añade tu primera pieza de madera
                </Link>
              </>
            )}
          </div>
        ) : (
          <>
            <p className="mb-3 text-sm text-muted-foreground">
              {items.length} {items.length === 1 ? "pieza" : "piezas"}
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {items.map((item) => (
                <Link key={item.id} href={`/items/${item.id}`}>
                  <Card className="h-full overflow-hidden transition-shadow hover:shadow-md">
                    <WoodPhoto
                      url={item.photoUrl}
                      alt={item.name}
                      className="aspect-square w-full"
                    />
                    <div className="space-y-1.5 p-3">
                      <h2 className="truncate text-sm font-medium">
                        {item.name}
                      </h2>
                      <div className="flex flex-wrap gap-1">
                        {item.species && <Badge>{item.species}</Badge>}
                        {item.moistureState && (
                          <Badge
                            variant={moistureBadgeVariant(item.moistureState)}
                          >
                            {MOISTURE_LABELS[item.moistureState]}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {item.quantity} {item.unit}
                        {item.location && <> · {item.location}</>}
                      </p>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </>
        )}
      </main>
    </>
  );
}
