import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { projectParts, projects, woodItems } from "@/lib/db/schema";
import {
  expandBoards,
  expandParts,
  optimize,
  planGlueUps,
  unplacedReason,
} from "@/lib/optimizer";
import { formatInches, isNonWoodMaterial } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Consejo del taller: Claude revisa el despiece, el inventario y el plan de
// corte calculado, y opina como carpintero (valor de las tablas, veta,
// estructura). La geometría la sigue haciendo el optimizador determinista.

const ADVICE_SCHEMA = {
  type: "object",
  properties: {
    advice: {
      type: "array",
      description:
        "3-6 consejos breves de carpintero en español, cada uno una frase o dos",
      items: { type: "string" },
    },
    species_suggestions: {
      type: "array",
      description:
        "Sugerencias de especie por pieza (solo si mejoran el plan); part_name debe coincidir exactamente con el nombre de la pieza del despiece",
      items: {
        type: "object",
        properties: {
          part_name: { type: "string" },
          species: {
            type: "string",
            description:
              "Especie en formato 'inglés (español)', idealmente de las presentes en el inventario",
          },
          reason: { type: "string" },
        },
        required: ["part_name", "species", "reason"],
        additionalProperties: false,
      },
    },
  },
  required: ["advice", "species_suggestions"],
  additionalProperties: false,
} as const;

const dims = (l: number | null, w: number | null, t: number | null) =>
  [l, w, t].map((v) => formatInches(v) ?? "?").join(" × ") + "″";

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Falta configurar ANTHROPIC_API_KEY en Vercel" },
      { status: 503 },
    );
  }

  let projectId: unknown;
  try {
    ({ projectId } = await request.json());
  } catch {
    return NextResponse.json({ error: "Body JSON inválido" }, { status: 400 });
  }
  if (typeof projectId !== "string") {
    return NextResponse.json({ error: "Falta projectId" }, { status: 400 });
  }

  const db = getDb();
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  if (!project) {
    return NextResponse.json(
      { error: "Proyecto no encontrado" },
      { status: 404 },
    );
  }
  const parts = await db
    .select()
    .from(projectParts)
    .where(eq(projectParts.projectId, projectId))
    .orderBy(asc(projectParts.createdAt), asc(projectParts.id));
  if (parts.length === 0) {
    return NextResponse.json(
      { error: "El proyecto no tiene despiece todavía" },
      { status: 400 },
    );
  }
  const inventory = await db
    .select()
    .from(woodItems)
    .orderBy(asc(woodItems.createdAt), asc(woodItems.id));

  const boards = expandBoards(inventory);
  const woodParts = parts.filter((p) => !isNonWoodMaterial(p.species));
  const prepared = planGlueUps(expandParts(woodParts), boards);
  const result = optimize(prepared.instances, boards);

  const context = {
    proyecto: {
      nombre: project.name,
      descripcion: project.description,
      notas: project.notes,
    },
    despiece: parts.map((p) => ({
      pieza: p.name,
      cantidad: Math.floor(p.quantity),
      medidas: dims(p.lengthIn, p.widthIn, p.thicknessIn),
      especie: p.species ?? "sin decidir",
    })),
    inventario: inventory.map((i) => ({
      tabla: i.name,
      especie: i.species,
      medidas: dims(i.lengthIn, i.widthIn, i.thicknessIn),
      cantidad: `${i.quantity} ${i.unit}`,
      corte: i.cutType,
      es_scrap: i.isScrap,
      notas: i.notes,
    })),
    plan_calculado: {
      tablas_usadas: result.plans.map((plan) => ({
        tabla: plan.board.name,
        especie: plan.board.species,
        aprovechamiento: `${Math.round(plan.utilization * 100)}%`,
        piezas: plan.placements.map((pl) => pl.part.name),
      })),
      encolados: prepared.notes.map(
        (n) =>
          `${n.partName}: ${n.pieces} ${n.axis === "ancho" ? "tiras" : "capas"}`,
      ),
      faltantes: result.unplaced.map((p) => ({
        pieza: p.name,
        motivo: unplacedReason(p, boards),
      })),
    },
  };

  const prompt = `Eres un carpintero experto asesorando en un taller personal. Este es el estado de un proyecto (despiece), el inventario de madera disponible y el plan de corte que ha calculado un algoritmo determinista (la geometría ya está resuelta: no la recalcules).

${JSON.stringify(context, null, 1)}

Da tu consejo de carpintero en español: ¿el plan usa bien las tablas? Señala despilfarros (p. ej. cortar un slab live edge valioso o una madera exótica cara para piezas pequeñas u ocultas cuando hay madera más humilde), problemas de veta o estructura (patas, encolados), y qué comprarías si falta algo. Si alguna pieza sin especie (o mal asignada) tiene una tabla del inventario que le va mejor, sugiérelo en species_suggestions usando exactamente el nombre de la pieza. Sé concreto y breve; no inventes tablas que no estén en el inventario.`;

  const client = new Anthropic();
  try {
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 1500,
      output_config: {
        format: { type: "json_schema", schema: ADVICE_SCHEMA },
      },
      messages: [{ role: "user", content: prompt }],
    });

    if (response.stop_reason === "refusal") {
      return NextResponse.json(
        { error: "El modelo no pudo procesar la consulta" },
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
    if (error instanceof Anthropic.AuthenticationError) {
      return NextResponse.json(
        { error: "La ANTHROPIC_API_KEY no es válida" },
        { status: 503 },
      );
    }
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { error: "Límite de la API alcanzado; prueba en un momento" },
        { status: 429 },
      );
    }
    console.error("Error en /api/advice:", error);
    return NextResponse.json(
      { error: "No se pudo obtener el consejo" },
      { status: 500 },
    );
  }
}
