import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { getDb } from "@/lib/db";
import { woodItems } from "@/lib/db/schema";
import { updateItem } from "@/app/items/actions";
import { Header } from "@/components/header";
import { ItemForm } from "@/components/item-form";

export const dynamic = "force-dynamic";

export default async function EditItemPage({
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

  const updateThisItem = updateItem.bind(null, item.id);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-6">
        <Link
          href={`/items/${item.id}`}
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Volver a la pieza
        </Link>
        <h1 className="mb-6 text-xl font-semibold">Editar «{item.name}»</h1>
        <ItemForm
          item={item}
          action={updateThisItem}
          submitLabel="Guardar cambios"
        />
      </main>
    </>
  );
}
