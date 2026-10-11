import type { CutType } from "@/lib/utils";

// Maderas compradas: historial de pedidos a Cook Woods (junio–agosto 2026),
// importado del archivo «Wood Archive». Son datos fijos — no viven en la base
// de datos — así que añadir un pedido nuevo es editar este fichero.
// Importes en USD tal y como figuran en los emails (con descuentos aplicados).

// Cómo de fiel es la foto a la pieza que llegó al taller.
export type PhotoKind = "exact" | "catalog" | "reference";

export interface PurchaseOrder {
  id: string;
  date: string; // pedido
  shipped: string | null;
  delivered: string | null; // null: no hay email de entrega
  total: number;
  shipping: number;
  credit: number; // crédito de tienda usado
  card: number; // cargado a la tarjeta
  refund?: number; // devuelto como crédito de tienda
  mailId: string; // id del email de confirmación en Gmail
  refundMailId?: string;
  note: string;
}

export interface PurchasedPiece {
  sku: string;
  name: string;
  original: string; // nombre del producto en Cook Woods
  species: string; // mismo formato que SPECIES_OPTIONS
  cut: CutType;
  qty: number;
  list: number; // precio de catálogo
  price: number; // precio final pagado (total de la línea)
  order: string;
  dimensions?: { inches: string; cm: string };
  cancelled?: boolean;
  photoKind: PhotoKind;
  photoSource: string;
  photoReference?: string; // pieza que sale en la foto, si no es la comprada
}

export const PURCHASE_ORDERS: PurchaseOrder[] = [
  {
    id: "118856",
    date: "2026-08-24",
    shipped: "2026-08-24",
    delivered: "2026-08-31",
    total: 280.76,
    shipping: 0,
    credit: 120.21,
    card: 160.55,
    mailId: "1a03247d90403460",
    note: "Se usaron los 120,21 $ de crédito de tienda del sapele cancelado. Los 160,55 $ restantes se cargaron a la tarjeta.",
  },
  {
    id: "118317",
    date: "2026-08-02",
    shipped: "2026-08-03",
    delivered: "2026-08-10",
    total: 204.52,
    shipping: 0,
    credit: 0,
    card: 204.52,
    mailId: "19fc101df24b2194",
    note: "Cupón NICEDEAL20: 51,13 $ de descuento extra sobre el precio rebajado de 255,65 $. Esta pieza sustituyó al sapele W219350.",
  },
  {
    id: "118054",
    date: "2026-07-25",
    shipped: "2026-08-03",
    delivered: "2026-08-10",
    total: 170.41,
    shipping: 25,
    credit: 0,
    card: 170.41,
    refund: 120.21,
    mailId: "19f9c8460ddb9443",
    refundMailId: "19fc9d73db63b875",
    note: "El sapele W219350 se canceló por un alabeo de ½″ (1,27 cm). Se devolvieron 120,21 $ como crédito de tienda el 3 de agosto, en dos importes (24,04 $ y 96,17 $). Solo se envió la cookie de nogal. No consta que se devolviera el recargo de 25 $ por envío sobredimensionado.",
  },
  {
    id: "117475",
    date: "2026-07-04",
    shipped: "2026-07-06",
    delivered: null,
    total: 331.2,
    shipping: 0,
    credit: 0,
    card: 331.2,
    mailId: "19f2eb50410c0e95",
    note: "Envío confirmado el 6 de julio. No se encontró email de confirmación de entrega.",
  },
  {
    id: "117033",
    date: "2026-06-19",
    shipped: "2026-06-22",
    delivered: "2026-06-29",
    total: 338.58,
    shipping: 0,
    credit: 0,
    card: 338.58,
    mailId: "19ee24d5b02876f8",
    note: "10 piezas en este pedido. Envío gratis.",
  },
];

export const PURCHASED_PIECES: PurchasedPiece[] = [
  {
    sku: "W201317",
    name: "Chechen",
    original: "Chechen Live Edge Lumber",
    species: "chechen",
    cut: "live_edge",
    qty: 1,
    list: 350.95,
    price: 280.76,
    order: "118856",
    photoKind: "reference",
    photoSource: "https://www.cookwoods.com/products/chechen-w201289",
    photoReference: "Chechen Live Edge Lumber · W201289",
  },
  {
    sku: "W201318",
    name: "Chechen espalteado",
    original: "Spalted Chechen Live Edge Lumber",
    species: "chechen",
    cut: "live_edge",
    qty: 1,
    list: 365.21,
    price: 204.52,
    order: "118317",
    photoKind: "reference",
    photoSource: "https://www.cookwoods.com/products/chechen-w201285",
    photoReference: "Spalted Chechen Live Edge Lumber · W201285",
  },
  {
    sku: "W228520",
    name: "Cookie de nogal",
    original: "Eastern Walnut Cookie",
    species: "walnut (nogal)",
    cut: "cookie",
    qty: 1,
    list: 55.99,
    price: 25.2,
    order: "118054",
    photoKind: "reference",
    photoSource: "https://www.cookwoods.com/products/eastern-walnut-w228510",
    photoReference: "Eastern Walnut Cookie · W228510",
  },
  {
    sku: "W219350",
    name: "Sapele veteado en cinta",
    original: "Ribbon Figured Sapele Lumber",
    species: "sapele (sapeli)",
    cut: "lumber",
    qty: 1,
    list: 267.13,
    price: 120.21,
    order: "118054",
    cancelled: true,
    photoKind: "reference",
    photoSource: "https://www.cookwoods.com/products/sapele-w219368",
    photoReference: "Ribbon Figured Sapele Lumber · W219368",
  },
  {
    sku: "W253199",
    name: "Fresno",
    original: "Ash Micro Lumber",
    species: "ash (fresno)",
    cut: "lumber",
    qty: 1,
    list: 39.99,
    price: 30,
    order: "117475",
    photoKind: "exact",
    photoSource:
      "https://cdn.shopify.com/s/files/1/2026/2511/files/253199_1_9fef0f40-128f-4f22-96a2-1cbd4f7b9ace.jpg?v=1782491122",
  },
  {
    sku: "W252465",
    name: "Lupia de olmo siberiano",
    original: "Extra Fancy Siberian Elm Burl Live Edge Lumber",
    species: "siberian elm (olmo siberiano)",
    cut: "live_edge",
    qty: 1,
    list: 87.99,
    price: 66,
    order: "117475",
    photoKind: "exact",
    photoSource:
      "https://cdn.shopify.com/s/files/1/2026/2511/files/252465_1_e1d993f6-d54b-4003-a47d-42b7da8967f7.jpg?v=1781188609",
  },
  {
    sku: "W246545",
    name: "Nogal claro",
    original: "Extra Fancy Claro Walnut Live Edge Lumber",
    species: "claro walnut (nogal claro)",
    cut: "live_edge",
    qty: 1,
    list: 124.27,
    price: 93.21,
    order: "117475",
    photoKind: "exact",
    photoSource:
      "https://cdn.shopify.com/s/files/1/2026/2511/files/246545_1_3d50fb31-e3c1-44e8-91d4-25f869b49386.jpg?v=1771448876",
  },
  {
    sku: "W252509",
    name: "Olivo",
    original: "Extra Fancy Olive Live Edge Lumber",
    species: "olive (olivo)",
    cut: "live_edge",
    qty: 1,
    list: 127.99,
    price: 96,
    order: "117475",
    photoKind: "exact",
    photoSource:
      "https://cdn.shopify.com/s/files/1/2026/2511/files/252509_1_953a75c2-b4ca-40ef-9edd-081fa25c9061.jpg?v=1781188900",
  },
  {
    sku: "W228508",
    name: "Cookie de nogal",
    original: "Eastern Walnut Cookie",
    species: "walnut (nogal)",
    cut: "cookie",
    qty: 1,
    list: 61.32,
    price: 45.99,
    order: "117475",
    photoKind: "reference",
    photoSource: "https://www.cookwoods.com/products/eastern-walnut-w228569",
    photoReference: "Eastern Walnut Cookie · W228569",
  },
  {
    sku: "W210173",
    name: "Sucupira",
    original: "Sucupira Live Edge Lumber",
    species: "sucupira",
    cut: "live_edge",
    qty: 1,
    list: 159.67,
    price: 127.74,
    order: "117033",
    photoKind: "reference",
    photoSource: "https://www.cookwoods.com/products/sucupira-w210200",
    photoReference: "Sucupira Live Edge Lumber · W210200",
  },
  {
    sku: "W248490",
    name: "Sapele",
    original: "Sapele Lumber",
    species: "sapele (sapeli)",
    cut: "lumber",
    qty: 1,
    list: 65.7,
    price: 49.28,
    order: "117033",
    photoKind: "exact",
    photoSource:
      "https://cdn.shopify.com/s/files/1/2026/2511/files/248490_1_a6cb2cf1-ef15-4ba8-8e0c-d197d098a24e.jpg?v=1775252779",
  },
  {
    sku: "W252697",
    name: "Narra rizada",
    original: "Extra Fancy Curly Narra Live Edge Lumber",
    species: "narra",
    cut: "live_edge",
    qty: 1,
    list: 66.65,
    price: 49.99,
    order: "117033",
    photoKind: "exact",
    photoSource:
      "https://cdn.shopify.com/s/files/1/2026/2511/files/252697_1_f9805a57-afcb-44b7-a232-c3b05f35be5c.jpg?v=1781189725",
  },
  {
    sku: "W252472",
    name: "Arce",
    original: "Extra Fancy Maple Live Edge Lumber",
    species: "maple (arce)",
    cut: "live_edge",
    qty: 1,
    list: 66.65,
    price: 49.99,
    order: "117033",
    photoKind: "exact",
    photoSource:
      "https://cdn.shopify.com/s/files/1/2026/2511/files/252472_1_54235dd2-a042-4e29-85ce-9284852ef187.jpg?v=1781188656",
  },
  {
    sku: "S367",
    name: "Granadillo",
    original: "Granadillo Turning Square",
    species: "granadillo",
    cut: "torneado",
    qty: 2,
    list: 27.98,
    price: 27.98,
    order: "117033",
    dimensions: { inches: "12 × 1 1/2 × 1 1/2″", cm: "30,48 × 3,81 × 3,81 cm" },
    photoKind: "catalog",
    photoSource:
      "https://cdn.shopify.com/s/files/1/2026/2511/products/Granadillo_T_Squares_24_x_1.5_x_1.5_372c681e-8cc6-4692-95ed-c3047049a6a0.jpg?v=1740043771",
  },
  {
    sku: "S208",
    name: "Amaranto",
    original: "Purpleheart Turning Square",
    species: "purpleheart (amaranto)",
    cut: "torneado",
    qty: 4,
    list: 47.96,
    price: 33.6,
    order: "117033",
    dimensions: { inches: "18 × 1 1/2 × 1 1/2″", cm: "45,72 × 3,81 × 3,81 cm" },
    photoKind: "catalog",
    photoSource:
      "https://cdn.shopify.com/s/files/1/2026/2511/products/purpleheart_turning_square_standard_1.jpg?v=1740044208",
  },
];

export const PHOTO_KIND_LABELS: Record<PhotoKind, string> = {
  exact: "Foto de la pieza",
  catalog: "Foto de catálogo",
  reference: "Foto de referencia",
};

export const PHOTO_KIND_NOTES: Record<PhotoKind, string> = {
  exact: "Foto enlazada a esta referencia en el email del pedido.",
  catalog:
    "Foto de catálogo del producto: la veta, el número de piezas y sus proporciones pueden no coincidir con lo comprado.",
  reference:
    "La foto original ya no está disponible. Es otra pieza de la misma madera: forma, medidas y veta son distintas.",
};

export function piecePhoto(sku: string): string {
  return `/compras/${sku}.jpg`;
}

export function gmailUrl(mailId: string): string {
  return `https://mail.google.com/mail/u/0/#all/${mailId}`;
}

export function orderOf(piece: PurchasedPiece): PurchaseOrder {
  const order = PURCHASE_ORDERS.find((o) => o.id === piece.order);
  if (!order) throw new Error(`Pedido ${piece.order} no encontrado`);
  return order;
}

export function purchaseTotals() {
  const kept = PURCHASED_PIECES.filter((p) => !p.cancelled);
  const woodValue = kept.reduce((sum, p) => sum + p.price, 0);
  const shipping = PURCHASE_ORDERS.reduce((sum, o) => sum + o.shipping, 0);
  return {
    pieces: kept.reduce((sum, p) => sum + p.qty, 0),
    species: new Set(kept.map((p) => p.species)).size,
    orders: PURCHASE_ORDERS.length,
    woodValue,
    shipping,
    // El crédito del sapele se reutilizó en otro pedido: no se cuenta dos veces.
    total: woodValue + shipping,
  };
}

const money = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "USD",
  // En es-ES los miles no se agrupan con 4 cifras (1205,26): forzamos el punto.
  useGrouping: "always",
});

export function formatUsd(value: number): string {
  return money.format(value);
}

const dateFormatter = new Intl.DateTimeFormat("es-ES", {
  dateStyle: "long",
  timeZone: "UTC",
});

export function formatPurchaseDate(isoDate: string): string {
  return dateFormatter.format(new Date(`${isoDate}T00:00:00Z`));
}
