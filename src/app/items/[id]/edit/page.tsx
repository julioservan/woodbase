import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ArrowLeft, Copy } from "lucide-react";
import { getDb } from "@/lib/db";
import { woodItems } from "@/lib/db/schema";
import { duplicateItem, updateItem } from "@/app/items/actions";
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
  const duplicateThisItem = duplicateItem.bind(null, item.id);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <Link
          href={`/items/${item.id}`}
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Volver a la pieza
        </Link>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-letterpress font-display text-2xl font-semibold tracking-tight">
            Editar «{item.name}»
          </h1>
          {/* Duplicar: crea una copia y abre su edición para ajustarla */}
          <form action={duplicateThisItem}>
            <button
              type="submit"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#b09468] bg-gradient-to-b from-[#fffdf5] to-[#efe4c9] px-3.5 text-sm font-semibold text-foreground [text-shadow:0_1px_0_rgba(255,255,255,0.7)] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(43,30,19,0.3)] transition-all hover:to-[#f6eeda] active:shadow-[inset_0_2px_5px_rgba(90,70,40,0.3)]"
            >
              <Copy className="h-3.5 w-3.5" /> Duplicar
            </button>
          </form>
        </div>
        <ItemForm
          item={item}
          action={updateThisItem}
          submitLabel="Guardar cambios"
        />
      </main>
    </>
  );
}
