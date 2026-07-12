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
import type { MesaSurface, WbInstance } from "@/lib/workbench";
import { formatInches } from "@/lib/utils";

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
  cName: { width: "34%" },
  cDim: { width: "12%", textAlign: "right" },
  cSpecies: { width: "22%", paddingLeft: 10 },
  note: { fontSize: 8, color: "#6b5a45", marginTop: 4 },
  planCard: { marginBottom: 14 },
  planTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  planMeta: { fontSize: 8.5, color: "#6b5a45", marginBottom: 4 },
});

// Plano de una superficie de la mesa: tiras con su largo real, juntas de
// cola discontinuas y las piezas tal cual las colocó el usuario.
function PdfMesaDiagram({ surface }: { surface: MesaSurface }) {
  const L = surface.lengthIn;
  const W = surface.widthIn;
  // Ancho máximo 520 pt, alto máximo 240 pt.
  const scale = Math.min(520 / L, 240 / W);
  const width = L * scale;
  const height = W * scale;
  const fs = Math.max(Math.min(L, W) * 0.12, Math.max(L, W) * 0.025);

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${L} ${W}`}>
      {surface.strips.length === 0 ? (
        <Rect
          x={0}
          y={0}
          width={L}
          height={W}
          fill="#e3c79b"
          stroke="#5a3f28"
          strokeWidth={fs * 0.12}
        />
      ) : (
        surface.strips.map((s, i) => (
          <Rect
            key={`st${i}`}
            x={0}
            y={s.y}
            width={s.lengthIn}
            height={s.widthIn}
            fill="#e3c79b"
            stroke="#5a3f28"
            strokeWidth={fs * 0.08}
          />
        ))
      )}
      {surface.seams.map((s, i) => (
        <Line
          key={`seam${i}`}
          x1={0}
          y1={s}
          x2={Math.min(
            surface.strips[i]?.lengthIn ?? L,
            surface.strips[i + 1]?.lengthIn ?? L,
          )}
          y2={s}
          stroke="#7a5230"
          strokeWidth={fs * 0.07}
          strokeDasharray={`${fs * 0.5},${fs * 0.35}`}
        />
      ))}
      {surface.placements.map((p, i) => (
        <G key={`p${i}`}>
          <Rect
            x={p.x}
            y={p.y}
            width={p.w}
            height={p.h}
            fill="#faf3e2"
            stroke="#38281a"
            strokeWidth={fs * 0.09}
          />
          {p.w > fs * 2.6 && p.h > fs * 1.1 && (
            <Text
              x={p.x + p.w / 2}
              y={p.y + p.h / 2 + fs * 0.35}
              textAnchor="middle"
              style={{
                fontSize: Math.min(fs, p.h * 0.55),
                fill: "#2b1e13",
              }}
            >
              {p.w > fs * 8
                ? `${p.label} - ${frac(p.w)} x ${frac(p.h)}`
                : p.label}
            </Text>
          )}
        </G>
      ))}
    </Svg>
  );
}

export async function buildCutListPdf(
  project: Project,
  parts: ProjectPart[],
  surfaces: MesaSurface[],
  unplaced: WbInstance[],
): Promise<Buffer> {
  const dateStr = new Intl.DateTimeFormat("es-ES", {
    dateStyle: "long",
  }).format(new Date());
  const withPlacements = surfaces.filter((s) => s.placements.length > 0);
  const unplacedLabels = [...new Set(unplaced.map((i) => i.label))];

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
        </View>
        {parts.map((p) => {
          const qty = Math.max(1, Math.floor(p.quantity));
          return (
            <View key={p.id} style={styles.row} wrap={false}>
              <Text style={styles.cQty}>{qty}</Text>
              <Text style={styles.cName}>{p.name}</Text>
              <Text style={styles.cDim}>{frac(p.lengthIn)}"</Text>
              <Text style={styles.cDim}>{frac(p.widthIn)}"</Text>
              <Text style={styles.cDim}>{frac(p.thicknessIn)}"</Text>
              <Text style={styles.cSpecies}>{p.species ?? "-"}</Text>
            </View>
          );
        })}
        <Text style={styles.note}>
          Medidas finales de pieza. Anade demasias de corte y cepillado segun
          tu maquina; kerf de sierra estimado 1/8".
        </Text>

        {withPlacements.length > 0 ? (
          <View break>
            <Text style={styles.sectionTitle}>
              Plan de corte (Mesa de trabajo)
            </Text>
            {withPlacements.map((surface) => {
              const woodArea =
                surface.strips.length > 0
                  ? surface.strips.reduce(
                      (s, st) => s + st.lengthIn * st.widthIn,
                      0,
                    )
                  : surface.lengthIn * surface.widthIn;
              const usedArea = surface.placements.reduce(
                (s, p) => s + p.w * p.h,
                0,
              );
              return (
                <View key={surface.key} style={styles.planCard} wrap={false}>
                  <Text style={styles.planTitle}>
                    {surface.name}
                    {surface.subtitle ? ` - ${surface.subtitle}` : ""}
                  </Text>
                  <Text style={styles.planMeta}>
                    {surface.minLengthIn < surface.lengthIn - 1e-6
                      ? `${frac(surface.minLengthIn)}"-${frac(surface.lengthIn)}"`
                      : `${frac(surface.lengthIn)}"`}{" "}
                    x {frac(surface.widthIn)}" x {frac(surface.thicknessIn)}"
                    {surface.mixed
                      ? " - mezcla de especies"
                      : surface.species
                        ? ` - ${surface.species}`
                        : ""}{" "}
                    - aprovechamiento {Math.round((usedArea / woodArea) * 100)}
                    % - veta a lo largo
                  </Text>
                  <PdfMesaDiagram surface={surface} />
                </View>
              );
            })}
            {unplacedLabels.length > 0 && (
              <Text style={styles.note}>
                Piezas sin colocar en la mesa: {unplacedLabels.join(", ")}.
              </Text>
            )}
            <Text style={styles.note}>
              Plan trazado a mano en la Mesa de trabajo de Woodbase. Kerf de
              1/8" entre piezas; las lineas discontinuas son juntas de cola.
            </Text>
          </View>
        ) : (
          <Text style={{ ...styles.note, marginTop: 14 }}>
            Sin plan de corte: coloca las piezas en la Mesa de trabajo y
            vuelve a generar el PDF.
          </Text>
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
