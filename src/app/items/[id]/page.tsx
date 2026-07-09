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
          <WoodPhoto
            url={item.photoUrl}
            alt={item.name}
            className="aspect-square w-full rounded-2xl border border-border/60 shadow-warm-lg"
          />

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
              <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
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
            <dl className="divide-y divide-border/60 rounded-2xl border border-border/60 bg-card shadow-warm">
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
              <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-warm">
                <h2 className="eyebrow mb-1.5 text-muted-foreground">Notas</h2>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {item.notes}
                </p>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Link
                href={`/items/${item.id}/edit`}
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-card px-4 text-sm font-medium shadow-sm transition-colors hover:bg-accent"
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
