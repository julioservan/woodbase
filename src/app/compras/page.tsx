import Link from "next/link";
import { ChevronDown, ExternalLink } from "lucide-react";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { CutBadge } from "@/components/ui/badge";
import {
  formatPurchaseDate,
  formatUsd,
  gmailUrl,
  PHOTO_KIND_LABELS,
  piecePhoto,
  PURCHASE_ORDERS,
  PURCHASED_PIECES,
  purchaseTotals,
  type PhotoKind,
} from "@/lib/purchases";

// Punto de color de cada tipo de foto (leyenda y esquina de las fichas).
const PHOTO_DOT: Record<PhotoKind, string> = {
  exact: "bg-[#4a7a3a]",
  catalog: "bg-[#a4661f]",
  reference: "bg-[#8a7a61]",
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel-paper rounded-xl px-4 py-3">
      <p className="eyebrow text-muted-foreground">{label}</p>
      <p className="text-letterpress font-display text-2xl font-semibold tabular-nums">
        {value}
      </p>
    </div>
  );
}

export default function PurchasesPage() {
  const totals = purchaseTotals();
  // Las canceladas, al final.
  const pieces = [...PURCHASED_PIECES].sort(
    (a, b) => Number(!!a.cancelled) - Number(!!b.cancelled),
  );

  return (
    <>
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-6 pb-[max(1.75rem,env(safe-area-inset-bottom))] sm:py-7">
        <div className="mb-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-letterpress font-display text-4xl font-semibold tracking-tight">
            Maderas compradas
          </h1>
          <p className="text-letterpress text-sm font-medium text-foreground/60">
            Cook Woods · junio – agosto 2026
          </p>
        </div>

        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Piezas" value={`${totals.pieces}`} />
          <Stat label="Especies" value={`${totals.species}`} />
          <Stat label="Pedidos" value={`${totals.orders}`} />
          <Stat label="Gasto total" value={formatUsd(totals.total)} />
        </div>

        {/* ---------- Piezas ---------- */}
        <section className="mb-10">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-letterpress font-display text-2xl font-semibold">
              Piezas
            </h2>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {(Object.keys(PHOTO_KIND_LABELS) as PhotoKind[]).map((kind) => (
                <span key={kind} className="inline-flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${PHOTO_DOT[kind]}`} />
                  {PHOTO_KIND_LABELS[kind]}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {pieces.map((piece) => (
              <Link
                key={piece.sku}
                href={`/compras/${piece.sku}`}
                className={`tag-manila group relative flex flex-col overflow-hidden rounded-lg transition-transform duration-200 hover:-translate-y-1 ${
                  piece.cancelled ? "opacity-70" : ""
                }`}
              >
                <div className="relative aspect-[4/5] overflow-hidden border-b border-[#a5865a]/50 bg-[#5a3f28]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={piecePhoto(piece.sku)}
                    alt={piece.name}
                    loading="lazy"
                    className={`h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04] ${
                      piece.cancelled ? "grayscale" : ""
                    }`}
                  />
                  <span
                    title={PHOTO_KIND_LABELS[piece.photoKind]}
                    className={`absolute left-2 top-2 h-2.5 w-2.5 rounded-full ring-2 ring-white/80 ${PHOTO_DOT[piece.photoKind]}`}
                  />
                  {piece.qty > 1 && (
                    <span className="brass absolute right-2 top-2 rounded-md px-2 py-0.5 text-[11px] font-bold">
                      ×{piece.qty}
                    </span>
                  )}
                  {piece.cancelled && (
                    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-[8deg] rounded-[3px] border-2 border-[#a83c2a]/80 bg-[#fdfaf1]/85 px-2 py-0.5 text-xs font-black uppercase tracking-[0.12em] text-[#a83c2a]">
                      Cancelada
                    </span>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-1 p-3">
                  <p className="eyebrow text-muted-foreground">{piece.sku}</p>
                  <h3 className="text-letterpress line-clamp-2 text-sm font-semibold leading-snug sm:text-[15px]">
                    {piece.name}
                  </h3>
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-x-2 gap-y-1 pt-1">
                    <CutBadge cut={piece.cut} />
                    <span className="text-sm font-semibold tabular-nums">
                      {piece.cancelled ? (
                        <span className="text-xs font-bold uppercase tracking-wide text-[#a83c2a]">
                          Reembolsada
                        </span>
                      ) : (
                        formatUsd(piece.price)
                      )}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ---------- Pedidos ---------- */}
        <section className="mb-10">
          <h2 className="text-letterpress mb-3 font-display text-2xl font-semibold">
            Pedidos
          </h2>
          <div className="space-y-3">
            {PURCHASE_ORDERS.map((order) => {
              const orderPieces = PURCHASED_PIECES.filter(
                (p) => p.order === order.id,
              );
              const kept = orderPieces
                .filter((p) => !p.cancelled)
                .reduce((sum, p) => sum + p.qty, 0);
              const status = order.refund
                ? "Reembolso parcial"
                : order.delivered
                  ? "Entregado"
                  : "Enviado";
              return (
                <details
                  key={order.id}
                  id={`pedido-${order.id}`}
                  className="panel-paper group rounded-xl"
                >
                  <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">Pedido #{order.id}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatPurchaseDate(order.date)} · {kept}{" "}
                        {kept === 1 ? "pieza" : "piezas"} · {status}
                      </p>
                    </div>
                    <span className="font-semibold tabular-nums">
                      {formatUsd(order.total)}
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                  </summary>

                  <div className="grid gap-4 border-t border-[#c9b28c]/60 px-4 py-4 md:grid-cols-2">
                    <ul className="space-y-2">
                      {orderPieces.map((piece) => (
                        <li key={piece.sku}>
                          <Link
                            href={`/compras/${piece.sku}`}
                            className="flex items-center gap-3 rounded-lg p-1 transition-colors hover:bg-accent"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={piecePhoto(piece.sku)}
                              alt=""
                              loading="lazy"
                              className={`h-12 w-10 shrink-0 rounded object-cover ring-1 ring-black/15 ${
                                piece.cancelled ? "grayscale" : ""
                              }`}
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium">
                                {piece.name}
                              </span>
                              <span className="block text-xs text-muted-foreground">
                                {piece.sku} · {piece.qty}{" "}
                                {piece.cancelled
                                  ? "· Cancelada"
                                  : `· ${formatUsd(piece.price)}`}
                              </span>
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>

                    <div className="space-y-3">
                      <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 text-sm">
                        <dt className="text-muted-foreground">Enviado</dt>
                        <dd className="text-right">
                          {order.shipped
                            ? formatPurchaseDate(order.shipped)
                            : "—"}
                        </dd>
                        <dt className="text-muted-foreground">Entregado</dt>
                        <dd className="text-right">
                          {order.delivered
                            ? formatPurchaseDate(order.delivered)
                            : "Sin confirmar"}
                        </dd>
                        <dt className="text-muted-foreground">Envío</dt>
                        <dd className="text-right tabular-nums">
                          {order.shipping ? formatUsd(order.shipping) : "Gratis"}
                        </dd>
                        {order.credit > 0 && (
                          <>
                            <dt className="text-muted-foreground">
                              Crédito de tienda
                            </dt>
                            <dd className="text-right tabular-nums">
                              {formatUsd(order.credit)}
                            </dd>
                          </>
                        )}
                        <dt className="text-muted-foreground">Tarjeta</dt>
                        <dd className="text-right tabular-nums">
                          {formatUsd(order.card)}
                        </dd>
                        {order.refund && (
                          <>
                            <dt className="text-muted-foreground">
                              Reembolso (crédito)
                            </dt>
                            <dd className="text-right tabular-nums">
                              −{formatUsd(order.refund)}
                            </dd>
                            <dt className="font-medium">Neto</dt>
                            <dd className="text-right font-medium tabular-nums">
                              {formatUsd(order.total - order.refund)}
                            </dd>
                          </>
                        )}
                      </dl>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {order.note}
                      </p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-medium">
                        <a
                          href={gmailUrl(order.mailId)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline"
                        >
                          Confirmación en Gmail{" "}
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                        {order.refundMailId && (
                          <a
                            href={gmailUrl(order.refundMailId)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline"
                          >
                            Reembolso <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </details>
              );
            })}
          </div>
        </section>

        {/* ---------- Balance ---------- */}
        <section className="panel-paper rounded-2xl p-5">
          <h2 className="text-letterpress mb-3 font-display text-2xl font-semibold">
            Las cuentas
          </h2>
          <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 text-sm">
            <dt>Madera que me quedé</dt>
            <dd className="text-right tabular-nums">
              {formatUsd(totals.woodValue)}
            </dd>
            <dt>
              Recargo por envío sobredimensionado
              <span className="block text-xs text-muted-foreground">
                Pedido #118054 · sin reembolso documentado
              </span>
            </dt>
            <dd className="text-right tabular-nums">
              {formatUsd(totals.shipping)}
            </dd>
            <dt className="border-t border-[#c9b28c]/70 pt-2 font-semibold">
              Gasto total
            </dt>
            <dd className="border-t border-[#c9b28c]/70 pt-2 text-right font-display text-xl font-semibold tabular-nums">
              {formatUsd(totals.total)}
            </dd>
          </dl>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Importes en USD sacados de los emails de los pedidos, con
            descuentos. Los 120,21 $ del sapele cancelado volvieron como crédito
            de tienda y se gastaron en el pedido #118856, así que solo cuentan
            una vez.
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
