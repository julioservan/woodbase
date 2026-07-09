import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const maxDuration = 60;

const SUPPORTED_MEDIA_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
] as const;

type SupportedMediaType = (typeof SUPPORTED_MEDIA_TYPES)[number];

// Esquema JSON que la API garantiza en la respuesta (structured outputs),
// así el cliente nunca recibe JSON malformado.
const IDENTIFY_SCHEMA = {
  type: "object",
  properties: {
    species: {
      type: "string",
      description:
        "Especie de madera más probable, nombre común en español (ej. roble, nogal, pino)",
    },
    scientific_name: {
      type: "string",
      description: "Nombre científico de la especie más probable",
    },
    confidence: {
      type: "number",
      description: "Confianza de 0 a 1 en la identificación principal",
    },
    alternatives: {
      type: "array",
      description: "2-3 especies alternativas, de más a menos probable",
      items: {
        type: "object",
        properties: {
          species: { type: "string" },
          confidence: { type: "number" },
        },
        required: ["species", "confidence"],
        additionalProperties: false,
      },
    },
    reasoning: {
      type: "string",
      description:
        "Breve explicación (1-2 frases, en español) de los rasgos visibles que llevan a la identificación",
    },
  },
  required: ["species", "scientific_name", "confidence", "alternatives", "reasoning"],
  additionalProperties: false,
} as const;

const PROMPT = `Identifica la especie de madera visible en esta imagen.

Fíjate en el color, la figura del veteado, los poros/anillos de crecimiento, los radios medulares y la textura. Devuelve la especie más probable (nombre común en español), su nombre científico, una confianza entre 0 y 1, 2-3 alternativas plausibles con su confianza, y una breve explicación de los rasgos en los que te basas.

Ten en cuenta que la identificación por foto es orientativa: sé honesto con la confianza (usa valores bajos si la foto es ambigua, está acabada con barniz/tinte, o los rasgos no son concluyentes).`;

export async function POST(request: Request) {
  let photoUrl: unknown;
  try {
    ({ photoUrl } = await request.json());
  } catch {
    return NextResponse.json({ error: "Body JSON inválido" }, { status: 400 });
  }

  if (typeof photoUrl !== "string" || !photoUrl.startsWith("https://")) {
    return NextResponse.json(
      { error: "Falta 'photoUrl' (URL https de la foto)" },
      { status: 400 },
    );
  }

  // Descarga la foto en el servidor y la envía a Claude como base64.
  const imageResponse = await fetch(photoUrl);
  if (!imageResponse.ok) {
    return NextResponse.json(
      { error: "No se pudo descargar la foto" },
      { status: 422 },
    );
  }
  const contentType = (
    imageResponse.headers.get("content-type") ?? "image/jpeg"
  ).split(";")[0];
  if (!SUPPORTED_MEDIA_TYPES.includes(contentType as SupportedMediaType)) {
    return NextResponse.json(
      { error: `Formato de imagen no soportado: ${contentType}` },
      { status: 422 },
    );
  }
  const imageData = Buffer.from(await imageResponse.arrayBuffer()).toString(
    "base64",
  );

  const client = new Anthropic();

  try {
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 2048,
      output_config: {
        format: { type: "json_schema", schema: IDENTIFY_SCHEMA },
      },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: contentType as SupportedMediaType,
                data: imageData,
              },
            },
            { type: "text", text: PROMPT },
          ],
        },
      ],
    });

    if (response.stop_reason === "refusal") {
      return NextResponse.json(
        { error: "El modelo no pudo procesar esta imagen" },
        { status: 422 },
      );
    }

    const text = response.content.find((block) => block.type === "text");
    if (!text) {
      return NextResponse.json(
        { error: "Respuesta vacía del modelo" },
        { status: 502 },
      );
    }

    return NextResponse.json(JSON.parse(text.text));
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { error: "Límite de peticiones alcanzado, espera un momento" },
        { status: 429 },
      );
    }
    if (error instanceof Anthropic.APIError) {
      console.error("Error de la API de Claude:", error.status, error.message);
      return NextResponse.json(
        { error: "Error del servicio de identificación" },
        { status: 502 },
      );
    }
    throw error;
  }
}
