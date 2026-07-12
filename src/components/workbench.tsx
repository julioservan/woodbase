"use client";

// Mesa de trabajo: lienzo manual de planificación de cortes. Las tablas del
// inventario se dibujan a escala real compartida; el usuario añade tablas,
// coloca piezas del despiece tocando/arrastrando, las gira, las encola en
// tiras/capas y ve en vivo medidas de corte, huecos libres y avisos (veta,
// especie, grosor, solapes). Nada de esto toca el inventario: es un plano.

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  Check,
  Loader2,
  Minus,
  Plus,
  RotateCw,
  Trash2,
  X,
} from "lucide-react";
import { updateWorkbench } from "@/app/projects/actions";
import { formatInches } from "@/lib/utils";
import type { BoardUnit } from "@/lib/optimizer";
import {
  buildInstances,
  collide,
  footprint,
  largestFreeRect,
  normalizeLayout,
  snapPosition,
  speciesColor,
  type Rect,
  type WbGlue,
  type WbInstance,
  type WbLayout,
  type WbPart,
  type WbPlacement,
} from "@/lib/workbench";

const fmt = (v: number) => formatInches(v) ?? "?";

interface Props {
  projectId: string;
  boardUnits: BoardUnit[]; // unidades de tabla disponibles (ya expandidas)
  boardPhotos: Record<string, string | null>; // itemId → foto
  parts: WbPart[];
  initialLayout: unknown;
}

interface PlacedRect extends Rect {
  placement: WbPlacement;
  instance: WbInstance;
}

let keyCounter = 0;
const newKey = () => `pl-${++keyCounter}-${Math.random().toString(36).slice(2, 8)}`;

export function Workbench({
  projectId,
  boardUnits,
  boardPhotos,
  parts,
  initialLayout,
}: Props) {
  const [layout, setLayout] = useState<WbLayout>(() =>
    normalizeLayout(initialLayout),
  );
  const [pxPerIn, setPxPerIn] = useState(8);
  const [selTray, setSelTray] = useState<string | null>(null);
  const [selPlaced, setSelPlaced] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [dirty, setDirty] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    key: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    moved: boolean;
  } | null>(null);

  const unitByKey = useMemo(
    () => new Map(boardUnits.map((b) => [b.key, b])),
    [boardUnits],
  );

  // Instancias del despiece según los encolados manuales activos.
  const instances = useMemo(
    () => buildInstances(parts, layout.glue),
    [parts, layout.glue],
  );
  const instByKey = useMemo(
    () => new Map(instances.map((i) => [i.key, i])),
    [instances],
  );

  // Solo cuentan las colocaciones válidas (tabla en mesa e instancia vigente).
  const placements = useMemo(
    () =>
      layout.placements.filter(
        (pl) =>
          instByKey.has(pl.instanceKey) &&
          layout.boards.some((b) => b.key === pl.boardKey),
      ),
    [layout, instByKey],
  );
  const placedInstanceKeys = useMemo(
    () => new Set(placements.map((p) => p.instanceKey)),
    [placements],
  );
  const tray = useMemo(
    () => instances.filter((i) => !placedInstanceKeys.has(i.key)),
    [instances, placedInstanceKeys],
  );

  // Escala inicial: la tabla más larga cabe en el ancho de pantalla.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const maxLen = Math.max(12, ...boardUnits.map((b) => b.lengthIn));
    const fit = (el.clientWidth - 20) / maxLen;
    setPxPerIn(Math.min(Math.max(fit, 3), 14));
    // Solo al montar: después manda el zoom del usuario.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autoguardado con debounce; se salta el estado inicial.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setDirty(true);
    const t = setTimeout(() => {
      startTransition(async () => {
        await updateWorkbench(projectId, layout);
        setDirty(false);
      });
    }, 900);
    return () => clearTimeout(t);
  }, [layout, projectId]);

  const mutate = useCallback((fn: (prev: WbLayout) => WbLayout) => {
    setLayout((prev) => fn(prev));
  }, []);

  // ---------- Tablas sobre la mesa ----------

  function addBoard(itemId: string) {
    mutate((prev) => {
      const used = new Set(
        prev.boards.filter((b) => b.itemId === itemId).map((b) => b.unitIndex),
      );
      const next = boardUnits.find(
        (u) => u.itemId === itemId && !used.has(u.unitIndex),
      );
      if (!next) return prev;
      return {
        ...prev,
        boards: [
          ...prev.boards,
          { key: next.key, itemId, unitIndex: next.unitIndex },
        ],
      };
    });
  }

  function removeBoard(boardKey: string) {
    mutate((prev) => ({
      ...prev,
      boards: prev.boards.filter((b) => b.key !== boardKey),
      placements: prev.placements.filter((p) => p.boardKey !== boardKey),
    }));
    if (selPlaced && placements.some((p) => p.key === selPlaced && p.boardKey === boardKey)) {
      setSelPlaced(null);
    }
  }

  // ---------- Encolados manuales ----------

  function setGlue(partId: string, cfg: WbGlue | null) {
    mutate((prev) => {
      const glue = { ...prev.glue };
      if (cfg) glue[partId] = cfg;
      else delete glue[partId];
      return {
        ...prev,
        glue,
        // Las medidas cambian: las instancias de esa pieza vuelven a la bandeja.
        placements: prev.placements.filter(
          (p) => !p.instanceKey.startsWith(`${partId}#`),
        ),
      };
    });
    setSelPlaced(null);
  }

  // ---------- Colocación ----------

  const rectsByBoard = useMemo(() => {
    const map = new Map<string, PlacedRect[]>();
    for (const pl of placements) {
      const inst = instByKey.get(pl.instanceKey)!;
      const { w, h } = footprint(inst, pl.rot);
      const list = map.get(pl.boardKey) ?? [];
      list.push({ x: pl.x, y: pl.y, w, h, placement: pl, instance: inst });
      map.set(pl.boardKey, list);
    }
    return map;
  }, [placements, instByKey]);

  function placeFromTray(boardKey: string, xi: number, yi: number) {
    const inst = selTray ? instByKey.get(selTray) : null;
    const board = unitByKey.get(boardKey);
    if (!inst || !board) return;
    // Si entera no cabe pero girada sí, se gira sola.
    let rot = false;
    if (
      (inst.lengthIn > board.lengthIn + 1e-6 ||
        inst.widthIn > board.widthIn + 1e-6) &&
      inst.widthIn <= board.lengthIn + 1e-6 &&
      inst.lengthIn <= board.widthIn + 1e-6
    ) {
      rot = true;
    }
    const { w, h } = footprint(inst, rot);
    const others = (rectsByBoard.get(boardKey) ?? []).map((r) => r as Rect);
    const snapped = snapPosition(
      xi - w / 2,
      yi - h / 2,
      w,
      h,
      board.lengthIn,
      board.widthIn,
      others,
    );
    const key = newKey();
    mutate((prev) => ({
      ...prev,
      placements: [
        ...prev.placements,
        { key, instanceKey: inst.key, boardKey, x: snapped.x, y: snapped.y, rot },
      ],
    }));
    setSelTray(null);
    setSelPlaced(key);
  }

  function movePlacement(key: string, x: number, y: number) {
    mutate((prev) => ({
      ...prev,
      placements: prev.placements.map((p) =>
        p.key === key ? { ...p, x, y } : p,
      ),
    }));
  }

  function rotatePlacement(key: string) {
    mutate((prev) => ({
      ...prev,
      placements: prev.placements.map((p) => {
        if (p.key !== key) return p;
        const inst = instByKey.get(p.instanceKey);
        const board = unitByKey.get(p.boardKey);
        if (!inst || !board) return p;
        const rot = !p.rot;
        const { w, h } = footprint(inst, rot);
        return {
          ...p,
          rot,
          x: Math.min(Math.max(p.x, 0), Math.max(0, board.lengthIn - w)),
          y: Math.min(Math.max(p.y, 0), Math.max(0, board.widthIn - h)),
        };
      }),
    }));
  }

  function removePlacement(key: string) {
    mutate((prev) => ({
      ...prev,
      placements: prev.placements.filter((p) => p.key !== key),
    }));
    setSelPlaced(null);
  }

  function clearTable() {
    if (!window.confirm("¿Vaciar la mesa? Las piezas vuelven a la bandeja.")) return;
    mutate((prev) => ({ ...prev, placements: [] }));
    setSelPlaced(null);
  }

  // ---------- Avisos por colocación ----------

  function placementIssues(
    r: PlacedRect,
    board: BoardUnit,
    others: PlacedRect[],
  ): { blocking: string[]; warnings: string[] } {
    const blocking: string[] = [];
    const warnings: string[] = [];
    if (
      r.x < -1e-6 ||
      r.y < -1e-6 ||
      r.x + r.w > board.lengthIn + 1e-6 ||
      r.y + r.h > board.widthIn + 1e-6
    ) {
      blocking.push("se sale de la tabla");
    }
    for (const o of others) {
      if (o.placement.key !== r.placement.key && collide(r, o)) {
        blocking.push(`pisa «${o.instance.label}» (deja 1/8″ de sierra)`);
        break;
      }
    }
    if (r.instance.thicknessIn > board.thicknessIn + 1 / 32) {
      blocking.push(
        `grosor ${fmt(r.instance.thicknessIn)}″ > tabla ${fmt(board.thicknessIn)}″`,
      );
    } else if (board.thicknessIn - r.instance.thicknessIn > 1 / 32) {
      warnings.push(
        `cepillar de ${fmt(board.thicknessIn)}″ a ${fmt(r.instance.thicknessIn)}″`,
      );
    }
    if (
      r.instance.species &&
      board.species &&
      r.instance.species.trim().toLowerCase() !==
        board.species.trim().toLowerCase()
    ) {
      warnings.push(
        `pide ${r.instance.species}, la tabla es ${board.species}`,
      );
    }
    if (r.placement.rot) {
      warnings.push("girada: la veta cruzará el largo de la pieza");
    }
    return { blocking, warnings };
  }

  // ---------- Punteros ----------

  function svgPoint(e: React.PointerEvent<Element>, svg: SVGSVGElement) {
    const rect = svg.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / pxPerIn,
      y: (e.clientY - rect.top) / pxPerIn,
    };
  }

  function onPartPointerDown(e: React.PointerEvent<SVGGElement>, pl: WbPlacement) {
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    dragRef.current = {
      key: pl.key,
      startX: e.clientX,
      startY: e.clientY,
      origX: pl.x,
      origY: pl.y,
      moved: false,
    };
  }

  function onPartPointerMove(
    e: React.PointerEvent<SVGGElement>,
    pl: WbPlacement,
    board: BoardUnit,
  ) {
    const drag = dragRef.current;
    if (!drag || drag.key !== pl.key) return;
    const dx = (e.clientX - drag.startX) / pxPerIn;
    const dy = (e.clientY - drag.startY) / pxPerIn;
    if (!drag.moved && Math.abs(dx) * pxPerIn < 4 && Math.abs(dy) * pxPerIn < 4) {
      return;
    }
    drag.moved = true;
    const inst = instByKey.get(pl.instanceKey);
    if (!inst) return;
    const { w, h } = footprint(inst, pl.rot);
    const others = (rectsByBoard.get(pl.boardKey) ?? [])
      .filter((r) => r.placement.key !== pl.key)
      .map((r) => r as Rect);
    const snapped = snapPosition(
      drag.origX + dx,
      drag.origY + dy,
      w,
      h,
      board.lengthIn,
      board.widthIn,
      others,
    );
    movePlacement(pl.key, snapped.x, snapped.y);
  }

  function onPartPointerUp(e: React.PointerEvent<SVGGElement>, pl: WbPlacement) {
    const drag = dragRef.current;
    if (drag?.key === pl.key && !drag.moved) {
      setSelPlaced((cur) => (cur === pl.key ? null : pl.key));
      setSelTray(null);
    }
    dragRef.current = null;
  }

  // ---------- Derivados de resumen ----------

  const totalInstances = instances.length;
  const placedCount = placements.length;
  const selectedRect = useMemo(() => {
    if (!selPlaced) return null;
    for (const [boardKey, rects] of rectsByBoard) {
      const r = rects.find((x) => x.placement.key === selPlaced);
      if (r) return { boardKey, rect: r };
    }
    return null;
  }, [selPlaced, rectsByBoard]);

  // Unidades restantes por item para la bandeja de tablas.
  const boardsAvailable = useMemo(() => {
    const byItem = new Map<
      string,
      { unit: BoardUnit; total: number; used: number }
    >();
    for (const u of boardUnits) {
      const entry = byItem.get(u.itemId) ?? { unit: u, total: 0, used: 0 };
      entry.total += 1;
      byItem.set(u.itemId, entry);
    }
    for (const b of layout.boards) {
      const entry = byItem.get(b.itemId);
      if (entry) entry.used += 1;
    }
    return [...byItem.values()].sort(
      (a, b) =>
        (a.unit.species ?? "￿").localeCompare(b.unit.species ?? "￿", "es") ||
        a.unit.name.localeCompare(b.unit.name, "es"),
    );
  }, [boardUnits, layout.boards]);

  // Piezas agrupadas por pieza del despiece para la bandeja.
  const trayGroups = useMemo(() => {
    const groups = new Map<string, { part: WbPart; instances: WbInstance[] }>();
    for (const p of parts) groups.set(p.id, { part: p, instances: [] });
    for (const i of tray) groups.get(i.partId)?.instances.push(i);
    return [...groups.values()];
  }, [parts, tray]);

  const maxPartDim = Math.max(
    12,
    ...instances.map((i) => Math.max(i.lengthIn, i.widthIn)),
  );

  return (
    <div ref={containerRef} className="space-y-4">
      {/* Barra de estado */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-semibold tabular-nums">
            {placedCount}/{totalInstances}
          </span>
          <span className="text-muted-foreground">piezas en la mesa</span>
          {placedCount > 0 && (
            <button
              type="button"
              onClick={clearTable}
              className="text-xs text-muted-foreground underline-offset-2 hover:underline"
            >
              vaciar
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {isPending || dirty ? (
              <span className="inline-flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> guardando…
              </span>
            ) : (
              <span className="inline-flex items-center gap-1">
                <Check className="h-3 w-3" /> guardado
              </span>
            )}
          </span>
          <div className="flex items-center rounded-lg border border-border bg-card">
            <button
              type="button"
              aria-label="Alejar"
              onClick={() => setPxPerIn((s) => Math.max(2, s / 1.4))}
              className="px-2.5 py-1.5 text-muted-foreground hover:text-foreground"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="px-1 text-[10px] tabular-nums text-muted-foreground">
              {pxPerIn.toFixed(0)}px/″
            </span>
            <button
              type="button"
              aria-label="Acercar"
              onClick={() => setPxPerIn((s) => Math.min(30, s * 1.4))}
              className="px-2.5 py-1.5 text-muted-foreground hover:text-foreground"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Bandeja de tablas */}
      <section className="panel-paper rounded-2xl p-4">
        <h3 className="eyebrow text-letterpress mb-2 text-muted-foreground">
          Tablas
        </h3>
        <div className="flex flex-wrap gap-2">
          {boardsAvailable.map(({ unit, total, used }) => {
            const left = total - used;
            const ratio = Math.min(unit.lengthIn / unit.widthIn, 8);
            return (
              <button
                key={unit.itemId}
                type="button"
                disabled={left <= 0}
                onClick={() => addBoard(unit.itemId)}
                className="flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-1.5 text-left text-xs shadow-sm transition hover:-translate-y-0.5 hover:shadow disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span
                  className="block rounded-[2px] border"
                  style={{
                    width: `${Math.max(14, ratio * 9)}px`,
                    height: "9px",
                    background: speciesColor(unit.species, 0.55),
                    borderColor: speciesColor(unit.species, 0.9),
                  }}
                />
                <span>
                  <span className="block font-semibold">{unit.name}</span>
                  <span className="block tabular-nums text-muted-foreground">
                    {fmt(unit.lengthIn)}″ × {fmt(unit.widthIn)}″ ·{" "}
                    {left > 0 ? `quedan ${left}` : "todas en la mesa"}
                  </span>
                </span>
                <Plus className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              </button>
            );
          })}
          {boardsAvailable.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No hay tablas con medidas (revisa «Maderas a usar» del proyecto).
            </p>
          )}
        </div>
      </section>

      {/* Bandeja de piezas */}
      <section className="panel-paper sticky top-[calc(env(safe-area-inset-top)+4.25rem)] z-20 rounded-2xl p-4 shadow-lg">
        <h3 className="eyebrow text-letterpress mb-2 text-muted-foreground">
          Piezas por colocar{" "}
          {selTray && (
            <span className="ml-1 normal-case text-[#a4661f]">
              — toca una tabla para soltarla
            </span>
          )}
        </h3>
        {tray.length === 0 ? (
          <p className="text-xs text-[#4a7a3a]">
            Todas las piezas están sobre la mesa. 🎉
          </p>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-1">
            {trayGroups
              .filter((g) => g.instances.length > 0)
              .map(({ part, instances: list }) => {
                const first = list[0];
                const sel = selTray === first.key;
                const cfg = layout.glue[part.id];
                const miniW = Math.max(
                  18,
                  (first.lengthIn / maxPartDim) * 84,
                );
                const miniH = Math.max(
                  8,
                  (first.widthIn / maxPartDim) * 84,
                );
                return (
                  <div
                    key={part.id}
                    className={`shrink-0 rounded-xl border p-2 ${
                      sel
                        ? "border-[#a4661f] bg-[#a4661f]/10"
                        : "border-border bg-card"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setSelTray((cur) => (cur === first.key ? null : first.key))
                      }
                      className="block text-left"
                    >
                      <span
                        className="mb-1 block rounded-[2px] border"
                        style={{
                          width: `${miniW}px`,
                          height: `${miniH}px`,
                          background: speciesColor(first.species, 0.55),
                          borderColor: speciesColor(first.species, 0.95),
                        }}
                      />
                      <span className="block max-w-36 truncate text-xs font-semibold">
                        {first.label}
                      </span>
                      <span className="block text-[10px] tabular-nums text-muted-foreground">
                        {fmt(first.lengthIn)}″ × {fmt(first.widthIn)}″ ×{" "}
                        {fmt(first.thicknessIn)}″
                        {list.length > 1 ? ` · ×${list.length}` : ""}
                      </span>
                    </button>
                    <select
                      aria-label={`Encolado de ${part.name}`}
                      className="mt-1 w-full rounded border border-border bg-background px-1 py-0.5 text-[10px] text-muted-foreground"
                      value={cfg ? `${cfg.axis}:${cfg.k}` : ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (!v) setGlue(part.id, null);
                        else {
                          const [axis, k] = v.split(":");
                          setGlue(part.id, {
                            axis: axis as WbGlue["axis"],
                            k: Number(k),
                          });
                        }
                      }}
                    >
                      <option value="">entera</option>
                      <option value="ancho:2">encolar 2 tiras</option>
                      <option value="ancho:3">encolar 3 tiras</option>
                      <option value="ancho:4">encolar 4 tiras</option>
                      <option value="grosor:2">laminar 2 capas</option>
                      <option value="grosor:3">laminar 3 capas</option>
                    </select>
                  </div>
                );
              })}
          </div>
        )}
      </section>

      {/* Tablas sobre la mesa */}
      {layout.boards.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-[#c9b28c] p-8 text-center text-sm text-muted-foreground">
          La mesa está vacía: añade una tabla de la bandeja de arriba.
        </div>
      ) : (
        layout.boards.map((b) => {
          const board = unitByKey.get(b.key);
          if (!board) return null;
          const rects = rectsByBoard.get(b.key) ?? [];
          const usedArea = rects.reduce((s, r) => s + r.w * r.h, 0);
          const utilization = usedArea / (board.lengthIn * board.widthIn);
          const hole = largestFreeRect(board.lengthIn, board.widthIn, rects);
          const W = board.lengthIn * pxPerIn;
          const H = board.widthIn * pxPerIn;
          const photo = boardPhotos[board.itemId];
          const selHere =
            selectedRect && selectedRect.boardKey === b.key
              ? selectedRect.rect
              : null;
          const selIssues = selHere
            ? placementIssues(selHere, board, rects)
            : null;
          return (
            <section key={b.key} className="panel-paper rounded-2xl p-3 sm:p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  {photo && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photo}
                      alt=""
                      className="h-8 w-8 shrink-0 object-contain"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {board.name}
                      {boardUnits.filter((u) => u.itemId === board.itemId)
                        .length > 1 && (
                        <span className="ml-1 text-xs font-normal text-muted-foreground">
                          (unidad {board.unitIndex + 1})
                        </span>
                      )}
                    </p>
                    <p className="text-xs tabular-nums text-muted-foreground">
                      {fmt(board.lengthIn)}″ × {fmt(board.widthIn)}″ ×{" "}
                      {fmt(board.thicknessIn)}″
                      {board.species ? ` · ${board.species}` : ""}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label={`Quitar ${board.name} de la mesa`}
                  onClick={() => removeBoard(b.key)}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <svg
                  width={W}
                  height={H}
                  className="block rounded-md"
                  style={{ touchAction: "none", minWidth: `${W}px` }}
                  onPointerDown={(e) => {
                    if (!selTray) {
                      setSelPlaced(null);
                      return;
                    }
                    const pt = svgPoint(e, e.currentTarget);
                    placeFromTray(b.key, pt.x, pt.y);
                  }}
                >
                  {/* Tabla */}
                  <defs>
                    <linearGradient id={`wood-${b.key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stopColor="#d9b98a" />
                      <stop offset="0.5" stopColor="#cfa872" />
                      <stop offset="1" stopColor="#c39a63" />
                    </linearGradient>
                  </defs>
                  <rect
                    x={0}
                    y={0}
                    width={W}
                    height={H}
                    fill={`url(#wood-${b.key})`}
                    stroke="#8a6a3f"
                  />
                  {/* Regla: marcas cada pulgada, más fuertes cada 6″ */}
                  {pxPerIn >= 4 &&
                    Array.from(
                      { length: Math.floor(board.lengthIn) },
                      (_, i) => i + 1,
                    ).map((i) => (
                      <line
                        key={`vx${i}`}
                        x1={i * pxPerIn}
                        y1={0}
                        x2={i * pxPerIn}
                        y2={i % 6 === 0 ? 8 : 4}
                        stroke="#6b4f2a"
                        strokeWidth={i % 6 === 0 ? 1.2 : 0.6}
                        opacity={0.7}
                      />
                    ))}
                  {pxPerIn >= 4 &&
                    Array.from(
                      { length: Math.floor(board.widthIn) },
                      (_, i) => i + 1,
                    ).map((i) => (
                      <line
                        key={`hy${i}`}
                        x1={0}
                        y1={i * pxPerIn}
                        x2={i % 6 === 0 ? 8 : 4}
                        y2={i * pxPerIn}
                        stroke="#6b4f2a"
                        strokeWidth={i % 6 === 0 ? 1.2 : 0.6}
                        opacity={0.7}
                      />
                    ))}

                  {/* Piezas colocadas */}
                  {rects.map((r) => {
                    const issues = placementIssues(r, board, rects);
                    const invalid = issues.blocking.length > 0;
                    const selected = selPlaced === r.placement.key;
                    const showLabel = r.w * pxPerIn > 46 && r.h * pxPerIn > 14;
                    return (
                      <g
                        key={r.placement.key}
                        onPointerDown={(e) => onPartPointerDown(e, r.placement)}
                        onPointerMove={(e) =>
                          onPartPointerMove(e, r.placement, board)
                        }
                        onPointerUp={(e) => onPartPointerUp(e, r.placement)}
                        style={{ cursor: "grab" }}
                      >
                        <rect
                          x={r.x * pxPerIn}
                          y={r.y * pxPerIn}
                          width={r.w * pxPerIn}
                          height={r.h * pxPerIn}
                          rx={2}
                          fill={speciesColor(r.instance.species, invalid ? 0.4 : 0.82)}
                          stroke={invalid ? "#b3362a" : selected ? "#3b2712" : speciesColor(r.instance.species, 1)}
                          strokeWidth={selected || invalid ? 2 : 1}
                          strokeDasharray={invalid ? "4 3" : undefined}
                        />
                        {/* Veta de la pieza: rayitas en su dirección de largo */}
                        {r.w * pxPerIn > 24 && r.h * pxPerIn > 10 && (
                          <line
                            x1={(r.x + (r.placement.rot ? r.w / 2 : 0.15 * r.w)) * pxPerIn}
                            y1={(r.y + (r.placement.rot ? 0.15 * r.h : r.h / 2)) * pxPerIn}
                            x2={(r.x + (r.placement.rot ? r.w / 2 : 0.85 * r.w)) * pxPerIn}
                            y2={(r.y + (r.placement.rot ? 0.85 * r.h : r.h / 2)) * pxPerIn}
                            stroke="rgba(255,255,255,0.55)"
                            strokeWidth={1}
                            strokeDasharray="5 4"
                          />
                        )}
                        {showLabel && (
                          <text
                            x={(r.x + r.w / 2) * pxPerIn}
                            y={(r.y + r.h / 2) * pxPerIn}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fontSize={Math.min(11, Math.max(8, pxPerIn * 1.4))}
                            fill="#fff"
                            style={{ pointerEvents: "none", userSelect: "none" }}
                          >
                            {r.instance.label.length > 18
                              ? `${r.instance.label.slice(0, 17)}…`
                              : r.instance.label}
                          </text>
                        )}
                        {(issues.warnings.length > 0 || invalid) && (
                          <text
                            x={(r.x + r.w) * pxPerIn - 4}
                            y={r.y * pxPerIn + 10}
                            textAnchor="end"
                            fontSize={10}
                            style={{ pointerEvents: "none" }}
                          >
                            ⚠️
                          </text>
                        )}
                      </g>
                    );
                  })}

                  {/* Medidas de corte de la pieza seleccionada */}
                  {selHere &&
                    (() => {
                      const r = selHere;
                      const cx = (r.x + r.w / 2) * pxPerIn;
                      const cy = (r.y + r.h / 2) * pxPerIn;
                      const label = (
                        x: number,
                        y: number,
                        text: string,
                        anchor: "start" | "middle" | "end" = "middle",
                      ) => (
                        <g style={{ pointerEvents: "none" }}>
                          <rect
                            x={anchor === "middle" ? x - 20 : anchor === "start" ? x - 2 : x - 38}
                            y={y - 8}
                            width={40}
                            height={13}
                            rx={3}
                            fill="rgba(59,39,18,0.85)"
                          />
                          <text
                            x={x}
                            y={y + 2}
                            textAnchor={anchor}
                            fontSize={9}
                            fill="#f5e9d4"
                          >
                            {text}
                          </text>
                        </g>
                      );
                      const dimLine = (
                        x1: number,
                        y1: number,
                        x2: number,
                        y2: number,
                      ) => (
                        <line
                          x1={x1}
                          y1={y1}
                          x2={x2}
                          y2={y2}
                          stroke="#3b2712"
                          strokeWidth={1}
                          strokeDasharray="3 3"
                          style={{ pointerEvents: "none" }}
                        />
                      );
                      const left = r.x;
                      const right = board.lengthIn - (r.x + r.w);
                      const top = r.y;
                      const bottom = board.widthIn - (r.y + r.h);
                      return (
                        <g>
                          {left > 0.05 && (
                            <>
                              {dimLine(0, cy, r.x * pxPerIn, cy)}
                              {label(Math.max(24, (r.x * pxPerIn) / 2), cy - 9, `${fmt(left)}″`)}
                            </>
                          )}
                          {right > 0.05 && (
                            <>
                              {dimLine((r.x + r.w) * pxPerIn, cy, W, cy)}
                              {label(
                                Math.min(W - 24, (r.x + r.w) * pxPerIn + (right * pxPerIn) / 2),
                                cy - 9,
                                `${fmt(right)}″`,
                              )}
                            </>
                          )}
                          {top > 0.05 && (
                            <>
                              {dimLine(cx, 0, cx, r.y * pxPerIn)}
                              {label(cx, Math.max(10, (r.y * pxPerIn) / 2), `${fmt(top)}″`)}
                            </>
                          )}
                          {bottom > 0.05 && (
                            <>
                              {dimLine(cx, (r.y + r.h) * pxPerIn, cx, H)}
                              {label(
                                cx,
                                Math.min(H - 4, (r.y + r.h) * pxPerIn + (bottom * pxPerIn) / 2),
                                `${fmt(bottom)}″`,
                              )}
                            </>
                          )}
                        </g>
                      );
                    })()}
                </svg>
              </div>

              {/* Controles de la pieza seleccionada */}
              {selHere && (
                <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-accent/50 px-2.5 py-2 text-xs">
                  <span className="max-w-44 truncate font-semibold">
                    {selHere.instance.label}
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {fmt(selHere.instance.lengthIn)}″ ×{" "}
                    {fmt(selHere.instance.widthIn)}″
                  </span>
                  <button
                    type="button"
                    onClick={() => rotatePlacement(selHere.placement.key)}
                    className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 hover:bg-accent"
                  >
                    <RotateCw className="h-3.5 w-3.5" /> Girar
                  </button>
                  <button
                    type="button"
                    onClick={() => removePlacement(selHere.placement.key)}
                    className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[#a4372a] hover:bg-accent"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> A la bandeja
                  </button>
                  {selIssues &&
                    [...selIssues.blocking, ...selIssues.warnings].map((m) => (
                      <span
                        key={m}
                        className={
                          selIssues.blocking.includes(m)
                            ? "text-[#b3362a]"
                            : "text-[#8a6a1f]"
                        }
                      >
                        ⚠ {m}
                      </span>
                    ))}
                </div>
              )}

              <p className="mt-2 text-xs tabular-nums text-muted-foreground">
                {rects.length} pieza{rects.length === 1 ? "" : "s"} ·
                aprovechamiento {Math.round(utilization * 100)}% · mayor hueco{" "}
                {hole.w >= 0.5 && hole.h >= 0.5
                  ? `${fmt(hole.w)}″ × ${fmt(hole.h)}″`
                  : "—"}
              </p>
            </section>
          );
        })
      )}

      <p className="text-xs text-muted-foreground">
        El kerf de la sierra (1/8″) se respeta entre piezas: los imanes dejan
        el hueco solos. Girar una pieza cruza su veta con la de la tabla — la
        mesa avisa pero no lo impide. Y como siempre: esto es un plano; el
        inventario lo actualizas tú a mano cuando cortes.
      </p>
    </div>
  );
}
