import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { formatInches } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Revisión de sentido común tras importar un STEP: Claude decide, por el
// nombre y las medidas de cada pieza, qué dimensión debe ser el grosor
// (rotación), si la pieza probablemente no es madera (manijas, herrajes) y
// avisa cuando ninguna dimensión es un grosor plausible (piezas curvas/en L).

const VERIFY_SCHEMA = {
  type: "object",
  properties: {
    parts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Nombre exacto de la pieza tal y como se recibió",
          },
          rotation: {
            type: "integer",
            description:
              "Qué dimensión es el grosor: 0 = la menor (c), 1 = la mediana (b), 2 = la mayor (a)",
          },
          suggested_material: {
            type: "string",
            enum: ["madera", "metal", "comprado / herraje"],
            description:
              "'comprado / herraje' para manijas/tiradores/piezas de ferretería; 'metal' si el nombre lo sugiere; si no, 'madera'",
          },
          note: {
            type: "string",
            description:
              "Aviso breve en español si algo no cuadra (p. ej. pieza probablemente curva o en L cuyo grosor real no sale de la caja); cadena vacía si todo bien",
          },
        },
        required: ["name", "rotation", "suggested_material", "note"],
        additionalProperties: false,
      },
    },
  },
  required: ["parts"],
  additionalProperties: false,
} as const;

interface IncomingPart {
  name: string;
  quantity: number;
  dims: [number, number, number];
}

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Falta configurar ANTHROPIC_API_KEY" },
      { status: 503 },
    );
  }

  let parts: IncomingPart[];
  try {
    const body = await request.json();
    parts = body.parts;
    if (
      !Array.isArray(parts) ||
      parts.length === 0 ||
      parts.length > 100 ||
      !parts.every(
        (p) =>
          typeof p.name === "string" &&
          Array.isArray(p.dims) &&
          p.dims.length === 3,
      )
    ) {
      throw new Error("formato");
    }
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const listado = parts
    .map(
      (p) =>
        `- "${p.name}" ×${p.quantity}: a=${formatInches(p.dims[0])}″, b=${formatInches(p.dims[1])}″, c=${formatInches(p.dims[2])}″`,
    )
    .join("\n");

  const prompt = `Un carpintero ha importado un modelo 3D de un mueble y estas son las piezas detectadas con su caja envolvente (dimensiones a ≥ b ≥ c, en pulgadas). Por defecto se asume largo=a, ancho=b, grosor=c.

${listado}

Revisa cada pieza con criterio de taller:
1. rotation: elige qué dimensión debe ser el GROSOR de la tabla. En madera maciza el grosor típico es 3/4″-2″ (patas macizas hasta 5″). Si c es un grosor plausible, rotation=0. Si c es claramente un ancho/largo y otra dimensión encaja mejor como grosor por el nombre de la pieza (tapa, panel, lateral, puerta...), usa rotation=1 (grosor=b) o rotation=2 (grosor=a).
2. suggested_material: manijas, tiradores, guías o herrajes suelen comprarse hechos → "comprado / herraje"; nombres que sugieran metal → "metal"; el resto "madera".
3. note: si ninguna dimensión es un grosor de tabla plausible (las tres son grandes), la pieza seguramente es curva o en L y su grosor real no sale de la caja: dilo en una frase y recomienda revisar a mano. Cadena vacía si todo cuadra.

Devuelve una entrada por pieza con el nombre EXACTO recibido.`;

  const client = new Anthropic();
  try {
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 2000,
      output_config: {
        format: { type: "json_schema", schema: VERIFY_SCHEMA },
      },
      messages: [{ role: "user", content: prompt }],
    });
    if (response.stop_reason === "refusal") {
      return NextResponse.json({ error: "Sin respuesta" }, { status: 422 });
    }
    const text = response.content.find((block) => block.type === "text");
    if (!text) {
      return NextResponse.json({ error: "Respuesta vacía" }, { status: 502 });
    }
    return NextResponse.json(JSON.parse(text.text));
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { error: "Límite de la API alcanzado" },
        { status: 429 },
      );
    }
    console.error("Error en /api/verify-import:", error);
    return NextResponse.json(
      { error: "No se pudo revisar el import" },
      { status: 500 },
    );
  }
}
