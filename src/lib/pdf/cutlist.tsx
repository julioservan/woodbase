import {
  Document,
  G,
  Line,
  Page,
  Rect,
  StyleSheet,
  Svg,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { Project, ProjectPart } from "@/lib/db/schema";
import type { BoardPlan } from "@/lib/optimizer";
import { boardFeet, formatInches } from "@/lib/utils";

// Fracción estilo taller con guion: 35-1/4
function frac(v: number | null): string {
  const f = formatInches(v);
  return f ? f.replace(" ", "-") : "-";
}

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#2b1e13",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    borderBottomWidth: 2,
    borderBottomColor: "#5a3f28",
    paddingBottom: 8,
    marginBottom: 14,
  },
  title: { fontSize: 20, fontFamily: "Helvetica-Bold" },
  meta: { fontSize: 9, color: "#6b5a45" },
  sectionTitle: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
    marginTop: 14,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#b09468",
    paddingVertical: 4,
    alignItems: "center",
  },
  headRow: {
    flexDirection: "row",
    borderBottomWidth: 1.5,
    borderBottomColor: "#5a3f28",
    paddingVertical: 4,
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
  },
  cQty: { width: "8%" },
  cName: { width: "30%" },
  cDim: { width: "12%", textAlign: "right" },
  cSpecies: { width: "22%", paddingLeft: 8 },
  cBf: { width: "10%", textAlign: "right" },
  totalRow: {
    flexDirection: "row",
    paddingVertical: 5,
    fontFamily: "Helvetica-Bold",
  },
  note: { fontSize: 8, color: "#6b5a45", marginTop: 4 },
  planCard: { marginBottom: 14 },
  planTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  planMeta: { fontSize: 8.5, color: "#6b5a45", marginBottom: 4 },
});

function PdfDiagram({ plan }: { plan: BoardPlan }) {
  const L = plan.board.lengthIn;
  const W = plan.board.widthIn;
  // Ancho máximo 520 pt, alto máximo 240 pt.
  const scale = Math.min(520 / L, 240 / W);
  const width = L * scale;
  const height = W * scale;
  const fs = Math.max(Math.min(L, W) * 0.12, Math.max(L, W) * 0.025);

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${L} ${W}`}>
      <Rect
        x={0}
        y={0}
        width={L}
        height={W}
        fill="#e3c79b"
        stroke="#5a3f28"
        strokeWidth={fs * 0.12}
      />
      {plan.leftovers.map((s, i) => (
        <G key={`s${i}`}>
          <Rect
            x={s.x}
            y={s.y}
            width={s.lengthIn}
            height={s.widthIn}
            fill="#c9a869"
            stroke="#7a5230"
            strokeWidth={fs * 0.05}
            strokeDasharray={`${fs * 0.35},${fs * 0.3}`}
          />
          {s.lengthIn > fs * 5 && s.widthIn > fs * 1.6 && (
            <Text
              x={s.x + s.lengthIn / 2}
              y={s.y + s.widthIn / 2 + fs * 0.35}
              textAnchor="middle"
              style={{ fontSize: fs * 0.85, fill: "#6b4728" }}
            >
              {`sobra ${frac(s.lengthIn)} x ${frac(s.widthIn)}`}
            </Text>
          )}
        </G>
      ))}
      {plan.placements.map((p) => (
        <G key={p.part.key}>
          <Rect
            x={p.x}
            y={p.y}
            width={p.part.lengthIn}
            height={p.part.widthIn}
            fill="#faf3e2"
            stroke="#38281a"
            strokeWidth={fs * 0.09}
          />
          {p.part.lengthIn > fs * 2.6 && p.part.widthIn > fs * 1.1 && (
            <Text
              x={p.x + p.part.lengthIn / 2}
              y={p.y + p.part.widthIn / 2 + fs * 0.35}
              textAnchor="middle"
              style={{
                fontSize: Math.min(fs, p.part.widthIn * 0.55),
                fill: "#2b1e13",
              }}
            >
              {p.part.lengthIn > fs * 8
                ? `${p.part.name} - ${frac(p.part.lengthIn)} x ${frac(p.part.widthIn)}`
                : p.part.name}
            </Text>
          )}
        </G>
      ))}
      <Line
        x1={0}
        y1={0}
        x2={0}
        y2={0}
        stroke="#5a3f28"
        strokeWidth={0}
      />
    </Svg>
  );
}

export async function buildCutListPdf(
  project: Project,
  parts: ProjectPart[],
  plans: BoardPlan[],
  unplacedNames: string[],
): Promise<Buffer> {
  const dateStr = new Intl.DateTimeFormat("es-ES", {
    dateStyle: "long",
  }).format(new Date());
  const totalBf = parts.reduce((sum, p) => {
    const bf = boardFeet(p.lengthIn, p.widthIn, p.thicknessIn);
    return sum + (bf ?? 0) * Math.max(1, Math.floor(p.quantity));
  }, 0);

  const doc = (
    <Document
      title={`Cut list - ${project.name}`}
      author="Woodbase"
      creator="Woodbase"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed>
          <Text style={styles.title}>{project.name}</Text>
          <Text style={styles.meta}>Woodbase - cut list - {dateStr}</Text>
        </View>

        {project.description && (
          <Text style={{ marginBottom: 8, color: "#4a3a28" }}>
            {project.description}
          </Text>
        )}

        <Text style={styles.sectionTitle}>Despiece</Text>
        <View style={styles.headRow}>
          <Text style={styles.cQty}>Cant.</Text>
          <Text style={styles.cName}>Pieza</Text>
          <Text style={styles.cDim}>Largo</Text>
          <Text style={styles.cDim}>Ancho</Text>
          <Text style={styles.cDim}>Grosor</Text>
          <Text style={styles.cSpecies}>Especie</Text>
          <Text style={styles.cBf}>BF</Text>
        </View>
        {parts.map((p) => {
          const qty = Math.max(1, Math.floor(p.quantity));
          const bf = boardFeet(p.lengthIn, p.widthIn, p.thicknessIn);
          return (
            <View key={p.id} style={styles.row} wrap={false}>
              <Text style={styles.cQty}>{qty}</Text>
              <Text style={styles.cName}>{p.name}</Text>
              <Text style={styles.cDim}>{frac(p.lengthIn)}"</Text>
              <Text style={styles.cDim}>{frac(p.widthIn)}"</Text>
              <Text style={styles.cDim}>{frac(p.thicknessIn)}"</Text>
              <Text style={styles.cSpecies}>{p.species ?? "-"}</Text>
              <Text style={styles.cBf}>
                {bf != null ? (bf * qty).toFixed(2) : "-"}
              </Text>
            </View>
          );
        })}
        <View style={styles.totalRow}>
          <Text style={{ width: "90%", textAlign: "right", paddingRight: 8 }}>
            Total pies tablares
          </Text>
          <Text style={styles.cBf}>{totalBf.toFixed(2)}</Text>
        </View>
        <Text style={styles.note}>
          Medidas finales de pieza. Anade demasias de corte y cepillado segun
          tu maquina; kerf de sierra estimado 1/8".
        </Text>

        {plans.length > 0 && (
          <View break>
            <Text style={styles.sectionTitle}>
              Plan de corte (inventario Woodbase)
            </Text>
            {plans.map((plan) => (
              <View key={plan.board.key} style={styles.planCard} wrap={false}>
                <Text style={styles.planTitle}>
                  {plan.board.name}
                  {plan.board.unitIndex > 0
                    ? ` (unidad ${plan.board.unitIndex + 1})`
                    : ""}
                </Text>
                <Text style={styles.planMeta}>
                  {frac(plan.board.lengthIn)}" x {frac(plan.board.widthIn)}" x{" "}
                  {frac(plan.board.thicknessIn)}"
                  {plan.board.species ? ` - ${plan.board.species}` : ""} -
                  aprovechamiento {Math.round(plan.utilization * 100)}% - veta a
                  lo largo
                </Text>
                <PdfDiagram plan={plan} />
              </View>
            ))}
            {unplacedNames.length > 0 && (
              <Text style={styles.note}>
                Sin sitio en el inventario: {unplacedNames.join(", ")}.
              </Text>
            )}
          </View>
        )}

        <Text
          style={{
            position: "absolute",
            bottom: 20,
            left: 36,
            right: 36,
            fontSize: 8,
            color: "#8a7458",
            textAlign: "center",
          }}
          render={({ pageNumber, totalPages }) =>
            `Woodbase - ${project.name} - pagina ${pageNumber} de ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  );

  return await renderToBuffer(doc);
}
