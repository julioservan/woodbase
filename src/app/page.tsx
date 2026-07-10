import Link from "next/link";
import { and, asc, desc, eq, ilike, or } from "drizzle-orm";
import { MapPin } from "lucide-react";
import { getDb } from "@/lib/db";
import { woodItems } from "@/lib/db/schema";
import { Header } from "@/components/header";
import { InventoryFilters } from "@/components/inventory-filters";
import { WoodPhoto } from "@/components/wood-photo";
import { CutBadge } from "@/components/ui/badge";
import {
  CUT_TYPES,
  formatDimensions,
  sizeScale,
  type CutType,
} from "@/lib/utils";

export const dynamic = "force-dynamic";

interface Filters {
  q?: string;
  species?: string;
  cut?: string;
  scrap?: string;
  sort?: string;
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Filters>;
}) {
  const { q, species, cut, scrap, sort } = await searchParams;
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
  if (scrap === "only") conditions.push(eq(woodItems.isScrap, true));
  if (scrap === "hide") conditions.push(eq(woodItems.isScrap, false));

  // Orden: más recientes por defecto; por tipo/especie/nombre alfabético
  // (los enums se ordenan por su posición y los nulos van al final).
  const orderBy =
    sort === "tipo"
      ? [asc(woodItems.cutType), asc(woodItems.name)]
      : sort === "especie"
        ? [asc(woodItems.species), asc(woodItems.name)]
        : sort === "nombre"
          ? [asc(woodItems.name)]
          : [desc(woodItems.createdAt)];

  const [items, speciesRows] = await Promise.all([
    db
      .select()
      .from(woodItems)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(...orderBy),
    db
      .selectDistinct({ species: woodItems.species })
      .from(woodItems)
      .orderBy(woodItems.species),
  ]);

  const allSpecies = speciesRows
    .map((r) => r.species)
    .filter((s): s is string => !!s);
  const hasFilters = !!(q || species || cut || scrap || sort);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-6 pb-[max(1.75rem,env(safe-area-inset-bottom))] sm:py-7">
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

        {/* Buscador y filtros: se aplican al cambiar, sin botón */}
        <InventoryFilters
          q={q}
          species={species}
          cut={cut}
          scrap={scrap}
          sort={sort}
          allSpecies={allSpecies}
        />

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
          <div className="grid grid-cols-2 gap-x-3 gap-y-9 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4">
            {items.map((item, index) => {
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
              // Con 2+ unidades se apilan tantas copias como piezas haya
              // (tope visual: 8). Solo con unidades contables — con volumen
              // (pies tablares...) la cantidad no es un número de tablas.
              const isCountable =
                /tabl[oó]n|pieza|unidad|bloque|palo|panel|plancha/i.test(
                  item.unit,
                );
              const stackCopies =
                isCutout && isCountable
                  ? Math.min(Math.max(Math.floor(item.quantity), 1), 8) - 1
                  : 0;
              // Parámetros de cada copia: se reparten a ambos lados, cada
              // nivel más desplazado, más girado y más oscuro; el orden se
              // invierte para que las más profundas se pinten primero.
              // Talla visual: fracción de la altura de la balda que ocupa.
              const scale = sizeScale(item.displaySize);
              const stack = Array.from({ length: stackCopies }, (_, i) => {
                const level = Math.floor(i / 2) + 1;
                const side = i % 2 === 0 ? 1 : -1;
                return {
                  key: i,
                  tx: side * level * 8,
                  txHover: side * level * 17,
                  rot: side * level * 1.7,
                  rotHover: side * level * 4,
                  brightness: Math.max(1 - level * 0.13, 0.45),
                };
              }).reverse();
              return (
                <Link
                  key={item.id}
                  href={`/items/${item.id}`}
                  className="group flex flex-col"
                >
                  {/* La pieza, de pie sobre su balda. Altura fija para que
                      todas las baldas de una fila queden alineadas. */}
                  <div className="relative z-10 -mb-[12px] flex h-44 items-end justify-center px-1.5 transition-transform duration-200 group-hover:-translate-y-1.5 sm:h-52">
                    {isCutout ? (
                      <div className="relative flex h-full max-w-full items-end justify-center">
                        {/* Copias apiladas detrás; al hacer hover se abren */}
                        {stack.map((c) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={c.key}
                            src={item.photoUrl!}
                            alt=""
                            aria-hidden
                            style={
                              {
                                "--tx": `${c.tx}px`,
                                "--tx-hover": `${c.txHover}px`,
                                "--rot": `${c.rot}deg`,
                                "--rot-hover": `${c.rotHover}deg`,
                                filter: `brightness(${c.brightness})`,
                                maxHeight: `${scale * 100}%`,
                              } as React.CSSProperties
                            }
                            className="absolute bottom-0 max-w-full origin-bottom translate-x-[var(--tx)] rotate-[var(--rot)] object-contain transition-transform duration-200 group-hover:translate-x-[var(--tx-hover)] group-hover:rotate-[var(--rot-hover)]"
                          />
                        ))}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.photoUrl!}
                          alt={item.name}
                          style={{ maxHeight: `${scale * 100}%` }}
                          className="relative z-10 max-w-full object-contain [filter:drop-shadow(0_12px_9px_rgba(30,18,8,0.38))_drop-shadow(0_2px_2px_rgba(30,18,8,0.35))]"
                        />
                      </div>
                    ) : (
                      <div
                        style={{ height: `${Math.round(95.8 * scale)}%` }}
                        className="relative aspect-square max-w-full overflow-hidden rounded-lg border-[5px] border-[#5a3f28] bg-card shadow-[0_12px_14px_rgba(30,18,8,0.4),0_2px_3px_rgba(30,18,8,0.3)]"
                      >
                        <WoodPhoto
                          url={item.photoUrl}
                          alt={item.name}
                          className="h-full w-full"
                        />
                        {/* Cristal: sombra interior y filo de luz sobre la foto */}
                        <div className="pointer-events-none absolute inset-0 shadow-[inset_0_2px_8px_rgba(30,18,8,0.45),inset_0_0_0_1px_rgba(255,255,255,0.25)]" />
                      </div>
                    )}
                    {/* Con una sola unidad la chapa no aporta nada */}
                    {item.quantity !== 1 && (
                      <span className="brass absolute right-1 top-1 z-20 rounded-md px-2 py-0.5 text-[11px] font-bold">
                        {item.quantity} {item.unit}
                      </span>
                    )}
                  </div>
                  {/* Balda sobre la que descansa la pieza: su canto tapa el
                      borde inferior de la madera para que parezca apoyada */}
                  <div className="shelf relative z-20 mx-[-5%]" />
                  {/* Cordel del que cuelga la etiqueta */}
                  <div className="relative z-0 mx-auto -mb-[2px] h-4 w-[3px] rounded-full bg-gradient-to-b from-[#4f3319] to-[#7a5230]" />
                  {/* Etiqueta de taller: cartón manila con ojal de latón,
                      colgada del cordel con un vuelo alterno */}
                  <article
                    className={`tag-manila relative space-y-1.5 rounded-lg p-3 pt-6 transition-transform duration-300 before:pointer-events-none before:absolute before:inset-1.5 before:rounded-md before:border before:border-dashed before:border-[#a5865a]/60 before:content-[''] group-hover:rotate-0 sm:p-3.5 sm:pt-6 ${
                      index % 2 === 0
                        ? "origin-top rotate-[-0.8deg]"
                        : "origin-top rotate-[0.8deg]"
                    }`}
                  >
                    <span className="brass absolute left-1/2 top-2 flex h-4 w-4 -translate-x-1/2 items-center justify-center rounded-full">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#4a351d] shadow-[inset_0_1px_1px_rgba(0,0,0,0.6)]" />
                    </span>
                    {item.isScrap && (
                      <span className="absolute right-2.5 top-2.5 rotate-[7deg] rounded-[3px] border-2 border-[#a83c2a]/65 px-1 py-px text-[9px] font-black uppercase tracking-[0.12em] text-[#a83c2a]/75 [mask-image:url(&quot;data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Cfilter id='r'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.5' numOctaves='2'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.7 0.3'/%3E%3C/filter%3E%3Crect width='60' height='60' filter='url(%23r)'/%3E%3C/svg%3E&quot;)]">
                        Scrap
                      </span>
                    )}
                    {/* Si la pieza se llama como su especie, no la repetimos */}
                    {item.species &&
                      item.species.toLowerCase() !==
                        item.name.toLowerCase() && (
                        <p className="eyebrow text-primary">{item.species}</p>
                      )}
                    <h2 className="text-letterpress line-clamp-2 text-sm font-semibold leading-snug sm:text-[15px]">
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
