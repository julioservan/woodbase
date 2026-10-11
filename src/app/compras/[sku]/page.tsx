import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { CutBadge } from "@/components/ui/badge";
import {
  formatPurchaseDate,
  formatUsd,
  gmailUrl,
  orderOf,
  PHOTO_KIND_LABELS,
  PHOTO_KIND_NOTES,
  piecePhoto,
  PURCHASED_PIECES,
} from "@/lib/purchases";

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

export function generateStaticParams() {
  return PURCHASED_PIECES.map((p) => ({ sku: p.sku }));
}

export default async function PurchasedPiecePage({
  params,
}: {
  params: Promise<{ sku: string }>;
}) {
  const { sku } = await params;
  const piece = PURCHASED_PIECES.find((p) => p.sku === sku);
  if (!piece) notFound();
  const order = orderOf(piece);
  const photo = piecePhoto(piece.sku);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-6 pb-[max(1.75rem,env(safe-area-inset-bottom))] sm:py-7">
        <Link
          href="/compras"
          className="mb-5 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Volver a compras
        </Link>

        <div className="grid gap-8 md:grid-cols-[1fr_1.05fr]">
          <figure className="space-y-2">
            <a
              href={photo}
              target="_blank"
              rel="noopener"
              className="relative block overflow-hidden rounded-lg border-[6px] border-[#5a3f28] bg-[#5a3f28] shadow-[0_14px_18px_rgba(30,18,8,0.4),0_2px_3px_rgba(30,18,8,0.3)]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo}
                alt={piece.name}
                className={`mx-auto max-h-[70vh] w-auto object-contain ${
                  piece.cancelled ? "grayscale" : ""
                }`}
              />
            </a>
            <figcaption className="text-xs leading-relaxed text-muted-foreground">
              <strong className="text-foreground/80">
                {PHOTO_KIND_LABELS[piece.photoKind]}.
              </strong>{" "}
              {PHOTO_KIND_NOTES[piece.photoKind]}
              {piece.photoReference && <> Sale: {piece.photoReference}.</>}{" "}
              <a
                href={piece.photoSource}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 font-medium text-primary underline-offset-2 hover:underline"
              >
                Fuente: Cook Woods <ExternalLink className="h-3 w-3" />
              </a>
            </figcaption>
          </figure>

          <div className="space-y-5">
            <dl className="tag-manila relative rounded-lg p-2 pt-4">
              <div className="space-y-1 px-4 pb-3">
                <p className="eyebrow text-primary">{piece.sku}</p>
                <h1 className="text-letterpress font-display text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
                  {piece.name}
                  {piece.cancelled && (
                    <span className="ml-2.5 inline-block -translate-y-0.5 rotate-[7deg] rounded-[3px] border-2 border-[#a83c2a]/65 px-1.5 py-px align-middle font-sans text-[10px] font-black uppercase tracking-[0.12em] text-[#a83c2a]/75">
                      Cancelada
                    </span>
                  )}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {piece.original}
                </p>
                <p className="pt-1">
                  <span className="font-display text-2xl font-semibold tabular-nums">
                    {formatUsd(piece.price)}
                  </span>
                  {piece.list > piece.price && (
                    <del className="ml-2 text-sm text-muted-foreground tabular-nums">
                      {formatUsd(piece.list)}
                    </del>
                  )}
                  <span className="block text-xs text-muted-foreground">
                    {piece.cancelled
                      ? "Reembolsada como crédito de tienda"
                      : piece.qty > 1
                        ? `${piece.qty} unidades · ${formatUsd(piece.price / piece.qty)} cada una`
                        : "1 pieza · precio final"}
                  </span>
                </p>
              </div>
              <div className="divide-y divide-[#c9b28c]/60 border-t border-[#c9b28c]/60">
                <SpecRow label="Especie">{piece.species}</SpecRow>
                <SpecRow label="Tipo de corte">
                  <CutBadge cut={piece.cut} />
                </SpecRow>
                <SpecRow label="Cantidad">{piece.qty}</SpecRow>
                <SpecRow label="Dimensiones">
                  {piece.dimensions ? (
                    <span className="tabular-nums">
                      {piece.dimensions.inches}
                      <span className="block text-xs font-normal text-muted-foreground">
                        {piece.dimensions.cm}
                      </span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      No constan en el email
                    </span>
                  )}
                </SpecRow>
                <SpecRow label="Pedido">
                  <Link
                    href={`/compras#pedido-${order.id}`}
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    #{order.id}
                  </Link>
                </SpecRow>
                <SpecRow label="Comprada">
                  {formatPurchaseDate(order.date)}
                </SpecRow>
                <SpecRow label="Estado">
                  {piece.cancelled
                    ? "Cancelada y reembolsada"
                    : order.delivered
                      ? `Entregada el ${formatPurchaseDate(order.delivered)}`
                      : `Enviada el ${formatPurchaseDate(order.shipped ?? order.date)}`}
                </SpecRow>
              </div>
            </dl>

            {piece.cancelled && (
              <p className="panel-paper rounded-xl p-4 text-sm leading-relaxed">
                {order.note}
              </p>
            )}

            <a
              href={gmailUrl(order.mailId)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#b09468] bg-gradient-to-b from-[#fffdf5] to-[#efe4c9] px-4 text-sm font-semibold text-foreground [text-shadow:0_1px_0_rgba(255,255,255,0.7)] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(43,30,19,0.3)] transition-all hover:to-[#f6eeda] active:shadow-[inset_0_2px_5px_rgba(90,70,40,0.3)]"
            >
              Ver el pedido en Gmail <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
