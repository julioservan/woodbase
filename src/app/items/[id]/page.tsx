import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ArrowLeft, Pencil } from "lucide-react";
import { getDb } from "@/lib/db";
import { woodItems } from "@/lib/db/schema";
import { deleteItem } from "@/app/items/actions";
import { Header } from "@/components/header";
import { WoodPhoto } from "@/components/wood-photo";
import { DeleteItemButton } from "@/components/delete-item-button";
import { Badge, MoistureBadge } from "@/components/ui/badge";
import { formatConfidence, formatDimensions } from "@/lib/utils";

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
  const deleteThisItem = deleteItem.bind(null, item.id);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-7">
        <Link
          href="/"
          className="mb-5 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Volver al inventario
        </Link>

        <div className="grid gap-7 md:grid-cols-[1.05fr_1fr]">
          {/* Foto enmarcada como un cuadro: paspartú de papel + marco fino */}
          <div className="relative self-start rounded-md border border-[#7a5a35] bg-[#fdfaf2] p-2.5 shadow-[0_16px_28px_-10px_rgba(40,24,10,0.6),inset_0_1px_0_rgba(255,255,255,0.9)]">
            <div className="relative overflow-hidden rounded-sm">
              <WoodPhoto
                url={item.photoUrl}
                alt={item.name}
                className="aspect-square w-full"
              />
              <div className="pointer-events-none absolute inset-0 shadow-[inset_0_2px_10px_rgba(30,18,8,0.45),inset_0_0_0_1px_rgba(255,255,255,0.2)]" />
            </div>
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              {item.species && (
                <p className="eyebrow text-primary">
                  {item.species}
                  {confidence && (
                    <span className="ml-2 font-normal normal-case tracking-normal text-muted-foreground">
                      identificada por IA · {confidence}
                    </span>
                  )}
                </p>
              )}
              <h1 className="text-letterpress font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
                {item.name}
              </h1>
              {item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {item.tags.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Ficha técnica */}
            <dl className="panel-paper divide-y divide-[#c9b28c]/60 rounded-2xl">
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
              <SpecRow label="Estado">
                {item.moistureState ? (
                  <MoistureBadge state={item.moistureState} />
                ) : (
                  "—"
                )}
              </SpecRow>
              <SpecRow label="Ubicación">{item.location ?? "—"}</SpecRow>
              <SpecRow label="Añadida">
                {dateFormatter.format(item.createdAt)}
              </SpecRow>
            </dl>

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
              <DeleteItemButton action={deleteThisItem} />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
