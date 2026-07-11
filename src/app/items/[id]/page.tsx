import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ArrowLeft, Copy, Pencil } from "lucide-react";
import { getDb } from "@/lib/db";
import { woodItems } from "@/lib/db/schema";
import { deleteItem, duplicateItem } from "@/app/items/actions";
import { Header } from "@/components/header";
import { WoodPhoto } from "@/components/wood-photo";
import { DeleteItemButton } from "@/components/delete-item-button";
import { Badge, CutBadge } from "@/components/ui/badge";
import {
  boardFeet,
  COUNTABLE_UNIT_RE,
  formatConfidence,
  formatDimensions,
  sizeScale,
} from "@/lib/utils";

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("es-ES", {
  dateStyle: "long",
});

function SpecRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <dt className="eyebrow shrink-0 text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-medium">{children}</dd>
    </div>
  );
}

export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [item] = await getDb()
    .select()
    .from(woodItems)
    .where(eq(woodItems.id, id))
    .limit(1);

  if (!item) notFound();

  const dimensions = formatDimensions(
    item.lengthIn,
    item.widthIn,
    item.thicknessIn,
  );
  const confidence = formatConfidence(item.speciesConfidence);
  const bf = boardFeet(item.lengthIn, item.widthIn, item.thicknessIn);
  const deleteThisItem = deleteItem.bind(null, item.id);
  const duplicateThisItem = duplicateItem.bind(null, item.id);

  // Misma lógica de exhibición que el inventario: los PNG (recortes sin
  // fondo) se apoyan tal cual sobre la balda, el resto va enmarcado.
  const isCutout = item.photoUrl
    ?.split("?")[0]
    .toLowerCase()
    .endsWith(".png");
  const isCountable = COUNTABLE_UNIT_RE.test(item.unit);
  const stackCopies =
    isCutout && isCountable
      ? Math.min(Math.max(Math.floor(item.quantity), 1), 8) - 1
      : 0;
  // Talla visual: fracción de la altura de la balda que ocupa.
  const scale = sizeScale(item.displaySize);
  const stack = Array.from({ length: stackCopies }, (_, i) => {
    const level = Math.floor(i / 2) + 1;
    const side = i % 2 === 0 ? 1 : -1;
    return {
      key: i,
      tx: side * level * 10,
      rot: side * level * 1.7,
      brightness: Math.max(1 - level * 0.13, 0.45),
    };
  }).reverse();

  return (
    <>
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-6 pb-[max(1.75rem,env(safe-area-inset-bottom))] sm:py-7">
        <Link
          href="/"
          className="mb-5 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Volver al inventario
        </Link>

        <div className="grid gap-8 md:grid-cols-[1.05fr_1fr]">
          {/* Exhibición: la pieza de pie sobre su balda, y la ficha técnica
              colgando de ella como etiqueta de taller */}
          <div className="flex w-full max-w-md flex-col self-start justify-self-center md:max-w-none md:justify-self-auto">
            <div className="relative z-10 -mb-[12px] flex h-64 items-end justify-center px-2 sm:h-80">
              {isCutout ? (
                <div className="relative flex h-full max-w-full items-end justify-center">
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
                          "--rot": `${c.rot}deg`,
                          filter: `brightness(${c.brightness})`,
                          maxHeight: `${scale * 100}%`,
                        } as React.CSSProperties
                      }
                      className="absolute bottom-0 max-w-full origin-bottom translate-x-[var(--tx)] rotate-[var(--rot)] object-contain"
                    />
                  ))}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.photoUrl!}
                    alt={item.name}
                    style={{ maxHeight: `${scale * 100}%` }}
                    className="relative z-10 max-w-full object-contain [filter:drop-shadow(0_14px_11px_rgba(30,18,8,0.38))_drop-shadow(0_2px_2px_rgba(30,18,8,0.35))]"
                  />
                </div>
              ) : (
                <div
                  style={{ height: `${Math.round(95.8 * scale)}%` }}
                  className="relative aspect-square max-w-full overflow-hidden rounded-lg border-[6px] border-[#5a3f28] bg-card shadow-[0_14px_18px_rgba(30,18,8,0.4),0_2px_3px_rgba(30,18,8,0.3)]"
                >
                  <WoodPhoto
                    url={item.photoUrl}
                    alt={item.name}
                    className="h-full w-full"
                  />
                  <div className="pointer-events-none absolute inset-0 shadow-[inset_0_2px_10px_rgba(30,18,8,0.45),inset_0_0_0_1px_rgba(255,255,255,0.2)]" />
                </div>
              )}
            </div>
            {/* Balda: su canto tapa el borde inferior de la madera */}
            <div className="shelf relative z-20 mx-[-4%]" />
            {/* Cordel y etiqueta de taller con la ficha técnica */}
            <div className="relative z-0 mx-auto -mb-[2px] h-4 w-[3px] rounded-full bg-gradient-to-b from-[#4f3319] to-[#7a5230]" />
            <dl className="tag-manila relative rounded-lg p-2 pt-7 before:pointer-events-none before:absolute before:inset-1.5 before:rounded-md before:border before:border-dashed before:border-[#a5865a]/60 before:content-['']">
              <span className="brass absolute left-1/2 top-2 flex h-4 w-4 -translate-x-1/2 items-center justify-center rounded-full">
                <span className="h-1.5 w-1.5 rounded-full bg-[#4a351d] shadow-[inset_0_1px_1px_rgba(0,0,0,0.6)]" />
              </span>
              {/* Cabecera del cartel: especie, nombre y sello de scrap */}
              <div className="space-y-1 px-4 pb-3 pt-1">
                {/* Si la pieza se llama como su especie, no la repetimos */}
                {item.species &&
                  item.species.toLowerCase() !== item.name.toLowerCase() && (
                    <p className="eyebrow text-primary">
                      {item.species}
                      {confidence && (
                        <span className="ml-2 font-normal normal-case tracking-normal text-muted-foreground">
                          identificada por IA · {confidence}
                        </span>
                      )}
                    </p>
                  )}
                <h1 className="text-letterpress font-display text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
                  {item.name}
                  {item.isScrap && (
                    <span className="ml-2.5 inline-block -translate-y-0.5 rotate-[7deg] rounded-[3px] border-2 border-[#a83c2a]/65 px-1.5 py-px align-middle font-sans text-[10px] font-black uppercase tracking-[0.12em] text-[#a83c2a]/75">
                      Scrap
                    </span>
                  )}
                </h1>
              </div>
              <div className="divide-y divide-[#c9b28c]/60 border-t border-[#c9b28c]/60">
                <SpecRow label="Cantidad">
                  {item.quantity} {item.unit}
                </SpecRow>
                <SpecRow label="Dimensiones">
                  {dimensions ? (
                    <span className="tabular-nums">{dimensions}</span>
                  ) : (
                    "—"
                  )}
                </SpecRow>
                {bf != null && (
                  <SpecRow label="Pies tablares">
                    <span className="tabular-nums">{bf} BF</span>
                  </SpecRow>
                )}
                <SpecRow label="Tipo de corte">
                  {item.cutType ? <CutBadge cut={item.cutType} /> : "—"}
                </SpecRow>
                <SpecRow label="Ubicación">{item.location ?? "—"}</SpecRow>
                <SpecRow label="Añadida">
                  {dateFormatter.format(item.createdAt)}
                </SpecRow>
              </div>
            </dl>
          </div>

          <div className="space-y-5">
            {item.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {item.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {item.notes && (
              <div className="panel-paper rounded-2xl p-4">
                <h2 className="eyebrow mb-1.5 text-muted-foreground">Notas</h2>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {item.notes}
                </p>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Link
                href={`/items/${item.id}/edit`}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#b09468] bg-gradient-to-b from-[#fffdf5] to-[#efe4c9] px-4 text-sm font-semibold text-foreground [text-shadow:0_1px_0_rgba(255,255,255,0.7)] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(43,30,19,0.3)] transition-all hover:to-[#f6eeda] active:shadow-[inset_0_2px_5px_rgba(90,70,40,0.3)]"
              >
                <Pencil className="h-3.5 w-3.5" /> Editar
              </Link>
              <form action={duplicateThisItem}>
                <button
                  type="submit"
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#b09468] bg-gradient-to-b from-[#fffdf5] to-[#efe4c9] px-4 text-sm font-semibold text-foreground [text-shadow:0_1px_0_rgba(255,255,255,0.7)] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(43,30,19,0.3)] transition-all hover:to-[#f6eeda] active:shadow-[inset_0_2px_5px_rgba(90,70,40,0.3)]"
                >
                  <Copy className="h-3.5 w-3.5" /> Duplicar
                </button>
              </form>
              <DeleteItemButton action={deleteThisItem} />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
