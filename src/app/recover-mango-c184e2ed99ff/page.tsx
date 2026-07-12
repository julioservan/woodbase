import { list } from "@vercel/blob";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { woodItems } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Página TEMPORAL de recuperación (protegida por sesión, ruta aleatoria):
// muestra las fotos huérfanas de Blob para que el usuario elija la del
// «Mango Lumber (Live Edge)» borrado por el antiguo «Aplicar cortes». Al
// elegirla se recrea el item y se abre su pantalla de edición para poner el
// largo y el ancho reales. Se elimina tras usarse.

function blobToken() {
  const raw = process.env.BLOB_READ_WRITE_TOKEN ?? "";
  return raw.match(/vercel_blob_rw_[A-Za-z0-9_]+/)?.[0];
}

async function restoreMango(formData: FormData) {
  "use server";
  const photoUrl = formData.get("photoUrl");
  if (
    typeof photoUrl !== "string" ||
    !/^https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\/wood\//.test(
      photoUrl,
    )
  ) {
    throw new Error("Foto no válida");
  }
  const [item] = await getDb()
    .insert(woodItems)
    .values({
      name: "Mango Lumber (Live Edge)",
      species: "mango",
      quantity: 1,
      unit: "tablones",
      thicknessIn: 1.25,
      cutType: "live_edge",
      isScrap: false,
      displaySize: "xl",
      photoUrl,
      notes:
        "Recuperada tras el borrado del antiguo «Aplicar cortes»; falta confirmar largo y ancho.",
    })
    .returning();
  redirect(`/items/${item.id}/edit`);
}

export default async function RecoverMangoPage() {
  const referenced = new Set(
    (await getDb().select({ photoUrl: woodItems.photoUrl }).from(woodItems))
      .map((i) => i.photoUrl)
      .filter(Boolean),
  );
  const { blobs } = await list({ prefix: "wood/", token: blobToken() });
  const orphans = blobs
    .filter((b) => !referenced.has(b.url))
    .sort((a, b) => +new Date(a.uploadedAt) - +new Date(b.uploadedAt));

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="font-display text-2xl text-amber-950">
        Recuperar «Mango Lumber (Live Edge)»
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-amber-900/80">
        Estas son las fotos que quedaron sin dueño. Toca la del live edge de
        mango y se dará de alta otra vez (mango · live edge · grosor 1-1/4″).
        Después te llevo a la edición para que pongas el largo y el ancho
        reales.
      </p>
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {orphans.map((blob) => (
          <form key={blob.url} action={restoreMango}>
            <input type="hidden" name="photoUrl" value={blob.url} />
            <button
              type="submit"
              className="block w-full rounded-lg border border-amber-900/20 bg-white/70 p-2 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={blob.url}
                alt="Foto huérfana"
                className="h-40 w-full object-contain"
                loading="lazy"
              />
              <span className="mt-1 block text-center text-xs text-amber-900/60">
                {new Date(blob.uploadedAt).toLocaleDateString("es-ES", {
                  day: "numeric",
                  month: "short",
                })}{" "}
                · Esta es
              </span>
            </button>
          </form>
        ))}
      </div>
      {orphans.length === 0 && (
        <p className="mt-6 text-sm text-amber-900/70">
          No quedan fotos huérfanas.
        </p>
      )}
    </main>
  );
}
