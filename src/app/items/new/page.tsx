import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Header } from "@/components/header";
import { ItemForm } from "@/components/item-form";
import { createItem } from "@/app/items/actions";

export const dynamic = "force-dynamic";

export default function NewItemPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-6">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Volver al inventario
        </Link>
        <h1 className="text-letterpress mb-6 font-display text-2xl font-semibold tracking-tight">
          Nueva pieza de madera
        </h1>
        <ItemForm action={createItem} submitLabel="Guardar pieza" />
      </main>
    </>
  );
}
