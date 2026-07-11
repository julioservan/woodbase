import type { BoardPlan } from "@/lib/optimizer";
import { formatInches } from "@/lib/utils";

// Plano de corte de una tabla: la tabla a escala con las piezas colocadas,
// las líneas de corte y las sobras rayadas. Todo en unidades de pulgada
// dentro del viewBox, así el navegador escala solo.
export function CutDiagram({ plan }: { plan: BoardPlan }) {
  const { board, placements, leftovers } = plan;
  const L = board.lengthIn;
  const W = board.widthIn;
  const pad = Math.max(L, W) * 0.02;
  // Tamaños de texto proporcionales a la tabla.
  const fs = Math.max(Math.min(L, W) * 0.14, Math.max(L, W) * 0.028);

  return (
    <svg
      viewBox={`${-pad} ${-pad} ${L + pad * 2} ${W + pad * 2}`}
      className="w-full rounded-lg"
      role="img"
      aria-label={`Plano de corte de ${board.name}`}
    >
      <defs>
        <pattern
          id={`grain-${board.key.replace(/[^a-z0-9]/gi, "")}`}
          width={L / 12}
          height={W}
          patternUnits="userSpaceOnUse"
        >
          <rect width={L / 12} height={W} fill="#c99a5e" />
          <path
            d={`M ${L / 24} 0 Q ${L / 20} ${W / 2} ${L / 24} ${W}`}
            stroke="#a87b45"
            strokeWidth={fs * 0.08}
            fill="none"
            opacity="0.5"
          />
        </pattern>
        <pattern
          id={`scrap-${board.key.replace(/[^a-z0-9]/gi, "")}`}
          width={fs}
          height={fs}
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect width={fs} height={fs} fill="#c99a5e" opacity="0.35" />
          <line
            x1="0"
            y1="0"
            x2="0"
            y2={fs}
            stroke="#7a5230"
            strokeWidth={fs * 0.16}
            opacity="0.5"
          />
        </pattern>
      </defs>

      {/* La tabla */}
      <rect
        x="0"
        y="0"
        width={L}
        height={W}
        fill={`url(#grain-${board.key.replace(/[^a-z0-9]/gi, "")})`}
        stroke="#5a3f28"
        strokeWidth={fs * 0.12}
        rx={fs * 0.2}
      />

      {/* Sobras rayadas */}
      {leftovers.map((s, i) => (
        <g key={`s${i}`}>
          <rect
            x={s.x}
            y={s.y}
            width={s.lengthIn}
            height={s.widthIn}
            fill={`url(#scrap-${board.key.replace(/[^a-z0-9]/gi, "")})`}
            stroke="#7a5230"
            strokeWidth={fs * 0.05}
            strokeDasharray={`${fs * 0.3} ${fs * 0.25}`}
          />
          {s.lengthIn > fs * 4 && s.widthIn > fs * 1.6 && (
            <text
              x={s.x + s.lengthIn / 2}
              y={s.y + s.widthIn / 2 + fs * 0.35}
              textAnchor="middle"
              fontSize={fs * 0.9}
              fill="#6b4728"
              fontStyle="italic"
            >
              sobra {formatInches(s.lengthIn)}″ × {formatInches(s.widthIn)}″
            </text>
          )}
        </g>
      ))}

      {/* Piezas */}
      {placements.map((p) => (
        <g key={p.part.key}>
          <rect
            x={p.x}
            y={p.y}
            width={p.part.lengthIn}
            height={p.part.widthIn}
            fill="#f9f0d9"
            stroke="#5a3f28"
            strokeWidth={fs * 0.09}
            rx={fs * 0.12}
          />
          {p.part.lengthIn > fs * 2.4 && p.part.widthIn > fs * 1.1 && (
            <text
              x={p.x + p.part.lengthIn / 2}
              y={p.y + p.part.widthIn / 2 + fs * 0.38}
              textAnchor="middle"
              fontSize={Math.min(fs, p.part.widthIn * 0.6)}
              fontWeight="600"
              fill="#38281a"
            >
              {p.part.name}
              {p.part.lengthIn > fs * 7 &&
                ` · ${formatInches(p.part.lengthIn)}″×${formatInches(p.part.widthIn)}″`}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}
