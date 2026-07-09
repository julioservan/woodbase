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
import { Badge, moistureBadgeVariant } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatConfidence, formatDimensions } from "@/lib/utils";

export const dynamic = "force-dynamic";

const MOISTURE_LABELS: Record<string, string> = {
  verde: "Verde",
  secando: "Secando",
  seco: "Seco",
};

const dateFormatter = new Intl.DateTimeFormat("es-ES", {
  dateStyle: "medium",
  timeStyle: "short",
});

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm">{children}</dd>
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
      <main className="mx-auto max-w-3xl px-4 py-6">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Volver al inventario
        </Link>

        <div className="grid gap-6 md:grid-cols-2">
          <WoodPhoto
            url={item.photoUrl}
            alt={item.name}
            className="aspect-square w-full rounded-xl border border-border shadow-sm"
          />

          <div className="space-y-4">
            <div>
              <h1 className="font-display text-3xl font-semibold tracking-tight">
                {item.name}
              </h1>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {item.species && (
                  <Badge>
                    {item.species}
                    {confidence && (
                      <span className="ml-1 opacity-70">
                        (IA {confidence})
                      </span>
                    )}
                  </Badge>
                )}
                {item.moistureState && (
                  <Badge variant={moistureBadgeVariant(item.moistureState)}>
                    {MOISTURE_LABELS[item.moistureState]}
                  </Badge>
                )}
                {item.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            <Card>
              <CardContent>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <Field label="Cantidad">
                    {item.quantity} {item.unit}
                  </Field>
                  <Field label="Ubicación">{item.location ?? "—"}</Field>
                  <Field label="Dimensiones">{dimensions ?? "—"}</Field>
                  <Field label="Añadida">
                    {dateFormatter.format(item.createdAt)}
                  </Field>
                </dl>
              </CardContent>
            </Card>

            {item.notes && (
              <Card>
                <CardContent>
                  <h2 className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                    Notas
                  </h2>
                  <p className="whitespace-pre-wrap text-sm">{item.notes}</p>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-2">
              <Link
                href={`/items/${item.id}/edit`}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-xs font-medium shadow-sm transition-colors hover:bg-accent"
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
