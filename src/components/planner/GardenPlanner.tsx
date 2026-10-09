import { useState, useRef, useMemo, useCallback, useEffect, useLayoutEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  Plus, Trash2, Download, Upload, Archive, Share2, Undo2, Copy, Printer, ChevronDown, ChevronUp, LayoutGrid, Fence, X, Sprout, Clipboard,
} from "lucide-react";
import {
  DndContext, KeyboardSensor, MouseSensor, TouchSensor, useSensor, useSensors, DragOverlay,
  type DragStartEvent, type DragEndEvent,
} from "@dnd-kit/core";
import { useStore } from "@/store";
import { useShallow } from "zustand/react/shallow";
import { usePlants, usePlantMap } from "@/hooks/usePlants";
import { usePlantName } from "@/hooks/usePlantName";
import { useFormat } from "@/hooks/useFormat";
import { useUndo } from "@/hooks/useUndo";
import { useOpenAddOnNavigate } from "@/hooks/useOpenAddOnNavigate";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Menu } from "@/components/ui/Menu";
import { Tabs } from "@/components/ui/Tabs";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { List, ListRow } from "@/components/ui/List";
import { PlantIconDisplay } from "@/components/ui/PlantIconDisplay";
import { useToast, useConfirmDelete } from "@/components/ui/Toast";
import type { Bed, CellPlanting, Garden } from "@/types/garden";
import { getFrostProtectionWeeks } from "@/types/garden";
import type { Plant } from "@/types/plant";
import { generateShareUrl } from "@/lib/sharing";
import { toISODate } from "@/lib/format";
import { getGardenSowingAgenda, getPlantableNow } from "@/lib/advisor";
import { usePointerFine } from "./usePointerFine";
import { validatePlacement, analyzeNeighbours, getCellConflicts, getPlacementHints } from "@/lib/placementValidation";
import { recommendBedPlanting, getRecommendedPlants, type PlantingStrategy, type PlantingDirection } from "@/lib/bedRecommendation";
import { CropRotation } from "./CropRotation";
import { PlantPalette } from "./PlantPalette";
import { PrintBedLayout } from "./PrintBedLayout";
import { BedOverviewCard } from "./BedOverviewCard";
import { BedEditor } from "./BedEditor";
import { CellInspector } from "./CellInspector";
import { AutoFillDialog, BedDialog, draftToBed, type BedDraft } from "./PlannerDialogs";

type BedDialogState = { open: false } | { open: true; bedId?: string };

export function GardenPlanner() {
  const { t } = useTranslation();
  const pointerFine = usePointerFine();
  const { formatDate } = useFormat();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    gardens, storedActiveGardenId, addGarden, setActiveGarden, addBed, updateBed, deleteBed, deleteGarden,
    setCell, updateCell, removeCell, togglePath, archiveSeason, seasonArchives, gridCellSizeCm, lastFrostDate,
    duplicateGarden, duplicateBed, restoreBed, restoreGarden,
  } = useStore(useShallow((s) => ({
    gardens: s.gardens, storedActiveGardenId: s.activeGardenId, addGarden: s.addGarden, setActiveGarden: s.setActiveGarden,
    addBed: s.addBed, updateBed: s.updateBed, deleteBed: s.deleteBed, deleteGarden: s.deleteGarden, setCell: s.setCell,
    updateCell: s.updateCell, removeCell: s.removeCell, togglePath: s.togglePath, archiveSeason: s.archiveSeason,
    seasonArchives: s.seasonArchives, gridCellSizeCm: s.gridCellSizeCm, lastFrostDate: s.lastFrostDate,
    duplicateGarden: s.duplicateGarden, duplicateBed: s.duplicateBed, restoreBed: s.restoreBed, restoreGarden: s.restoreGarden,
  })));
  const plants = usePlants();
  const plantMap = usePlantMap();
  const getPlantName = usePlantName();
  const { toast, confirm } = useToast();
  const confirmDelete = useConfirmDelete();
  const { pushUndo, undo, canUndo } = useUndo();

  // Fall back to the first garden: a stale selection must not hide the beds.
  const activeGarden = gardens.find((g) => g.id === storedActiveGardenId) ?? gardens[0];
  const activeGardenId = activeGarden?.id ?? null;

  // The open bed lives in the URL (?bed=…) so the back button returns to the overview.
  const bedParam = searchParams.get("bed");
  const openBed = activeGarden?.beds.find((b) => b.id === bedParam) ?? null;
  // A deep link (?bed=…) into another garden switches to that garden.
  useEffect(() => {
    if (!bedParam || openBed) return;
    const owner = gardens.find((g) => g.beds.some((b) => b.id === bedParam));
    if (owner) setActiveGarden(owner.id);
  }, [bedParam, openBed, gardens, setActiveGarden]);

  // --- Modes: inspect (default) · place (a palette plant is chosen) · path ---
  const [initialPlant] = useState<Plant | null>(() => {
    const id = (location.state as { placePlantId?: string } | null)?.placePlantId;
    return (id && plantMap.get(id)) || null;
  });
  // One bed, or a deep link into a bed (?bed=… from "Jetzt säen"): place right away; else pick the bed first.
  const singleBed = (activeGarden?.beds.length ?? 0) === 1 || !!openBed;
  const [placingPlant, setPlacingPlant] = useState<Plant | null>(singleBed ? initialPlant : null);
  const [pathMode, setPathMode] = useState(false);
  const [inspectKey, setInspectKey] = useState<string | null>(null);
  const [pendingPlant, setPendingPlant] = useState<Plant | null>(singleBed ? null : initialPlant);
  const [activeDragPlant, setActiveDragPlant] = useState<Plant | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  // 1 = the bed fits its column (BedGrid measures); zoom scales from there.
  const [zoom, setZoom] = useState(1);
  const [sheetOpen, setSheetOpen] = useState(false);
  // Mobile sheet height: "peek" keeps the bed visible (actions only), "full" shows everything.
  const [sheetFull, setSheetFull] = useState(false);

  const [bedDialog, setBedDialog] = useState<BedDialogState>({ open: false });
  // "Beet hinzufügen" from other pages (useAddBed) lands here with the dialog open.
  useOpenAddOnNavigate(useCallback(() => setBedDialog({ open: true }), []));
  const [autoFillBedId, setAutoFillBedId] = useState<string | null>(null);
  const [newGardenOpen, setNewGardenOpen] = useState(false);
  const [gardenName, setGardenName] = useState("");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [showPrint, setShowPrint] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Leaving or switching the bed (also via the URL / browser back) resets the
  // per-bed modes. The plant being placed belongs to the bed it was picked in:
  // it only survives the step from the overview into a bed (a plant chosen
  // there, or a deep link), never a switch to another bed.
  const [prevBedParam, setPrevBedParam] = useState(bedParam);
  if (prevBedParam !== bedParam) {
    setPrevBedParam(bedParam);
    setInspectKey(null);
    setPathMode(false);
    setSheetOpen(false);
    if (!bedParam || prevBedParam) setPlacingPlant(null);
    setZoom(1);
  }

  const mode = pathMode ? "path" : placingPlant ? "place" : "inspect";

  const openBedById = useCallback((bedId: string) => {
    setZoom(1);
    setInspectKey(null);
    setPathMode(false);
    setFeedback(null);
    if (pendingPlant) {
      setPlacingPlant(pendingPlant);
      setPendingPlant(null);
    }
    setSearchParams({ bed: bedId });
  }, [pendingPlant, setSearchParams, setZoom, setInspectKey, setPathMode, setFeedback, setPlacingPlant, setPendingPlant]);

  const closeBed = useCallback(() => {
    setPlacingPlant(null);
    setPathMode(false);
    setInspectKey(null);
    setSheetOpen(false);
    setSearchParams({});
  }, [setSearchParams, setPlacingPlant, setPathMode, setInspectKey, setSheetOpen]);

  // Deep link from the plant detail page: navigate("/planner", { state: { placePlantId } }).
  // Read once on mount; with a single bed placing starts right away, otherwise
  // the overview asks for a bed first.
  const placePlantId = (location.state as { placePlantId?: string } | null)?.placePlantId;
  useEffect(() => {
    if (!placePlantId) return;
    const beds = activeGarden?.beds ?? [];
    navigate({ pathname: location.pathname, search: beds.length === 1 ? `?bed=${beds[0].id}` : location.search }, { replace: true, state: null });
  }, [placePlantId, activeGarden, navigate, location.pathname, location.search]);

  // Clear feedback after 4 s
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(timer);
  }, [feedback]);

  // Close the print view via the custom event from PrintBedLayout
  useEffect(() => {
    const handler = () => setShowPrint(false);
    window.addEventListener("close-print-view", handler);
    return () => window.removeEventListener("close-print-view", handler);
  }, []);

  // Keyboard: Esc leaves the current mode step by step, Ctrl/Cmd+Z undoes.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = !!target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (e.key === "Escape" && !document.querySelector("dialog[open]")) {
        if (placingPlant) setPlacingPlant(null);
        else if (pathMode) setPathMode(false);
        else if (inspectKey) setInspectKey(null);
      }
      if (!typing && (e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [placingPlant, pathMode, inspectKey, undo]);

  // --- Analysis of the open bed --------------------------------------------
  const frostWeeks = openBed ? getFrostProtectionWeeks(openBed) : 0;
  const analysis = useMemo(() => (openBed ? analyzeNeighbours(openBed, plantMap) : { conflicts: [], companionPairs: 0 }), [openBed, plantMap]);
  const conflictMap = useMemo(() => getCellConflicts(analysis.conflicts), [analysis]);
  const hints = useMemo(
    () => (openBed && placingPlant ? getPlacementHints(placingPlant.id, openBed, plantMap) : undefined),
    [openBed, placingPlant, plantMap],
  );
  // In a bed: that bed's type and protection. On the overview: the union of all beds of the
  // garden (the same agenda as "Heute" and the calendar), so it never says less than a bed would.
  const plantableNow = useMemo(
    () => openBed
      ? getPlantableNow(plants, lastFrostDate, { frostProtectionWeeks: frostWeeks, environmentType: openBed.environmentType })
      : getGardenSowingAgenda(plants, lastFrostDate, (activeGarden?.beds ?? []).map((b) => ({
          id: b.id, name: b.name, environmentType: b.environmentType ?? "outdoor_bed", frostProtectionWeeks: getFrostProtectionWeeks(b),
        }))).now.filter((r) => r.action !== "sow_indoors"),
    [plants, lastFrostDate, frostWeeks, openBed, activeGarden?.beds],
  );
  const bedFitIds = useMemo(
    () => (openBed ? getRecommendedPlants(openBed, plants, { gridCellSizeCm, lastFrostDate }).map((r) => r.plant.id) : []),
    [openBed, plants, gridCellSizeCm, lastFrostDate],
  );

  const resolveParams = useCallback((params?: Record<string, string | number>) => {
    if (!params) return params;
    const resolved = { ...params };
    if (typeof resolved.plant === "string") resolved.plant = getPlantName(resolved.plant);
    if (typeof resolved.neighbor === "string") resolved.neighbor = getPlantName(resolved.neighbor);
    return resolved;
  }, [getPlantName]);

  /** Validate and place; returns false when refused (feedback explains why). */
  const placeAt = useCallback((bed: Bed, plantId: string, x: number, y: number): boolean => {
    if (!activeGardenId) return false;
    if ((bed.paths ?? []).includes(`${x}-${y}`)) {
      setFeedback(t("planner.onPath"));
      return false;
    }
    const result = validatePlacement(plantId, x, y, bed, plantMap, gridCellSizeCm);
    const error = result.issues.find((i) => i.severity === "error");
    if (error) {
      setFeedback(t(error.messageKey, resolveParams(error.messageParams)));
      return false;
    }
    const gid = activeGardenId;
    const previous = bed.cells.find((c) => c.cellX === x && c.cellY === y);
    setCell(gid, bed.id, { cellX: x, cellY: y, plantId, plantedDate: toISODate() });
    const revert = () => (previous ? useStore.getState().setCell(gid, bed.id, previous) : useStore.getState().removeCell(gid, bed.id, x, y));
    pushUndo({ label: "place", undo: revert });
    // Unfavourable neighbours: placed anyway, with a hint and a one-tap undo.
    const neighbour = result.issues.find((i) => i.type === "antagonist" && i.messageKey === "validation.antagonistDirect");
    if (neighbour) {
      toast(t(neighbour.messageKey, resolveParams(neighbour.messageParams)), "warning", { action: { label: t("common.undo"), onClick: revert } });
      setFeedback(null);
    } else {
      setFeedback(result.issues.length > 0 ? t(result.issues[0].messageKey, resolveParams(result.issues[0].messageParams)) : null);
    }
    return true;
  }, [activeGardenId, plantMap, gridCellSizeCm, setCell, pushUndo, t, resolveParams, setFeedback, toast]);

  /**
   * Mobile: keep the selected cell visible between the top bar and the sheet.
   * Runs after the sheet has rendered, so its real height is known.
   */
  const [revealKey, setRevealKey] = useState<string | null>(null);
  const revealCell = useCallback((x: number, y: number) => {
    if (window.innerWidth >= 768) return;
    setSheetFull(false);
    setRevealKey(`${x}-${y}-${Date.now()}`);
  }, [setSheetFull, setRevealKey]);
  useEffect(() => {
    if (!revealKey) return;
    const [x, y] = revealKey.split("-");
    const frame = requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(`[data-x="${x}"][data-y="${y}"]`);
      const main = el?.closest("main");
      const sheet = document.querySelector<HTMLElement>("[data-planner-sheet]");
      if (!el || !main || !sheet) return;
      const cell = el.getBoundingClientRect();
      const top = main.getBoundingClientRect().top + 8;
      const bottom = sheet.getBoundingClientRect().top - 12;
      if (cell.top >= top && cell.bottom <= bottom) return;
      // Centre the cell in the visible strip above the sheet.
      main.scrollBy({ top: cell.top + cell.height / 2 - (top + bottom) / 2, behavior: "smooth" });
    });
    return () => cancelAnimationFrame(frame);
  }, [revealKey]);

  /** Mobile: after picking a plant, show the bed (the sheet collapses). */
  const revealGrid = useCallback(() => {
    if (window.innerWidth >= 768) return;
    // Scroll <main> only, and keep the bed header (name, mode) in view above the grid.
    requestAnimationFrame(() => {
      const main = document.getElementById("main");
      const anchor = document.querySelector("[data-bed-header]") ?? document.querySelector("[data-bed-grid]");
      if (!main || !anchor) return;
      main.scrollBy({ top: anchor.getBoundingClientRect().top - main.getBoundingClientRect().top - 8, behavior: "smooth" });
    });
  }, []);

  // One handler for every cell tap; what it does depends on the mode.
  const handleActivate = (x: number, y: number) => {
    const bed = openBed;
    if (!bed || !activeGardenId) return;
    const key = `${x}-${y}`;
    const cell = bed.cells.find((c) => c.cellX === x && c.cellY === y);

    if (pathMode) {
      const before = { cells: bed.cells, paths: bed.paths ?? [] };
      togglePath(activeGardenId, bed.id, x, y);
      const gid = activeGardenId;
      pushUndo({ label: "path", undo: () => useStore.getState().updateBed(gid, bed.id, before) });
      return;
    }
    if (placingPlant) {
      if (cell) {
        // Tapping a planted cell never overwrites it: it switches to inspecting that cell.
        setPlacingPlant(null);
        setInspectKey(key);
        setSheetOpen(true);
        revealCell(x, y);
        return;
      }
      placeAt(bed, placingPlant.id, x, y);
      return;
    }
    if (cell) {
      setInspectKey((prev) => (prev === key ? null : key));
      setSheetOpen(true);
      revealCell(x, y);
    } else {
      setInspectKey(null);
      setFeedback(t("planner.pickPlantFirst"));
      setSheetOpen(true);
      setSheetFull(true);
    }
  };
  // Stable callback for the memoised cells; always calls the latest handler.
  const activateRef = useRef(handleActivate);
  useLayoutEffect(() => { activateRef.current = handleActivate; });
  const onActivate = useCallback((x: number, y: number) => activateRef.current(x, y), []);

  const selectPaletteItem = useCallback((plant: Plant) => {
    setPathMode(false);
    setInspectKey(null);
    setFeedback(null);
    setPlacingPlant((prev) => (prev?.id === plant.id ? null : plant));
    setSheetOpen(false);
    revealGrid();
  }, [revealGrid, setPathMode, setInspectKey, setFeedback, setPlacingPlant, setSheetOpen]);

  const plantMore = useCallback((plant: Plant) => {
    setInspectKey(null);
    setPathMode(false);
    setPlacingPlant(plant);
    setSheetOpen(false);
    revealGrid();
  }, [revealGrid, setInspectKey, setPathMode, setPlacingPlant, setSheetOpen]);

  // --- DnD ---------------------------------------------------------------
  const handleDragStart = (event: DragStartEvent) => {
    const plantId = event.active.data.current?.plantId as string | undefined;
    const plant = plantId ? plantMap.get(plantId) ?? null : null;
    setActiveDragPlant(plant);
    if (plant) {
      setPathMode(false);
      setInspectKey(null);
      setPlacingPlant(plant);
      setSheetOpen(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragPlant(null);
    const { active, over } = event;
    const plantId = active.data.current?.plantId as string | undefined;
    const bedId = over?.data.current?.bedId as string | undefined;
    const x = over?.data.current?.x as number | undefined;
    const y = over?.data.current?.y as number | undefined;
    if (!plantId || !bedId || x === undefined || y === undefined) return;
    const bed = activeGarden?.beds.find((b) => b.id === bedId);
    if (!bed) return;
    if (bed.cells.some((c) => c.cellX === x && c.cellY === y)) {
      setFeedback(t("planner.cellTaken"));
      return;
    }
    placeAt(bed, plantId, x, y);
  };

  // Touch: a short press-and-hold starts a drag, a swipe still scrolls.
  // Mouse: a few pixels of movement, so plain clicks keep selecting.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  // --- Bed actions ---------------------------------------------------------
  const findBed = useCallback((bedId: string) => activeGarden?.beds.find((b) => b.id === bedId), [activeGarden]);

  const handleDeleteBed = useCallback(async (bedId: string) => {
    const garden = activeGarden;
    const bed = findBed(bedId);
    if (!garden || !bed) return;
    if (!(await confirm(t("planner.confirmDeleteBed", { name: bed.name }), { confirmLabel: t("common.delete") }))) return;
    const index = garden.beds.findIndex((b) => b.id === bedId);
    deleteBed(garden.id, bedId);
    setBedDialog({ open: false });
    if (bedParam === bedId) closeBed();
    toast(t("planner.bedDeleted", { name: bed.name }), "success", {
      action: { label: t("common.undo"), onClick: () => restoreBed(garden.id, bed, index) },
    });
  }, [activeGarden, findBed, confirm, t, deleteBed, bedParam, closeBed, toast, restoreBed, setBedDialog]);

  const handleDuplicateBed = useCallback((bedId: string) => {
    if (!activeGardenId) return;
    duplicateBed(activeGardenId, bedId);
    toast(t("planner.bedDuplicated"), "success");
  }, [activeGardenId, duplicateBed, toast, t]);

  const handleClearBed = async (bed: Bed) => {
    if (!activeGardenId) return;
    if (!(await confirm(t("planner.confirmClearBed", { name: bed.name }), { confirmLabel: t("planner.clearBed") }))) return;
    const gid = activeGardenId;
    const before = bed.cells;
    updateBed(gid, bed.id, { cells: [] });
    setInspectKey(null);
    toast(t("planner.bedCleared"), "success", { action: { label: t("common.undo"), onClick: () => updateBed(gid, bed.id, { cells: before }) } });
  };

  const handleRemoveCell = useCallback((cell: CellPlanting) => {
    if (!activeGardenId || !openBed) return;
    const gid = activeGardenId;
    const bedId = openBed.id;
    removeCell(gid, bedId, cell.cellX, cell.cellY);
    setInspectKey(null);
    toast(t("planner.plantRemoved", { name: getPlantName(cell.plantId) }), "success", {
      action: { label: t("common.undo"), onClick: () => useStore.getState().setCell(gid, bedId, cell) },
    });
  }, [activeGardenId, openBed, removeCell, toast, t, getPlantName, setInspectKey]);

  const handleAutoFill = (strategy: PlantingStrategy, direction: PlantingDirection) => {
    const bed = autoFillBedId ? findBed(autoFillBedId) : undefined;
    setAutoFillBedId(null);
    if (!bed || !activeGardenId) return;
    const gid = activeGardenId;
    const taken = new Set([...bed.cells.map((c) => `${c.cellX}-${c.cellY}`), ...(bed.paths ?? [])]);
    const cells = recommendBedPlanting(bed, plants, { gridCellSizeCm, lastFrostDate, strategy, direction })
      .filter((c) => !taken.has(`${c.cellX}-${c.cellY}`));
    const before = bed.cells;
    updateBed(gid, bed.id, { cells: [...bed.cells, ...cells] });
    toast(t("planner.autoFillDone", { count: cells.length }), "success", {
      action: { label: t("common.undo"), onClick: () => updateBed(gid, bed.id, { cells: before }) },
    });
  };

  const handleSaveBed = (draft: BedDraft) => {
    if (!activeGardenId || !bedDialog.open) return;
    const fields = draftToBed(draft, gridCellSizeCm);
    const editing = bedDialog.bedId ? findBed(bedDialog.bedId) : undefined;
    if (editing) {
      const inside = (x: number, y: number) => x < fields.width && y < fields.height;
      updateBed(activeGardenId, editing.id, {
        ...fields,
        cells: editing.cells.filter((c) => inside(c.cellX, c.cellY)),
        paths: (editing.paths ?? []).filter((k) => { const [x, y] = k.split("-").map(Number); return inside(x, y); }),
      });
      toast(t("planner.bedSaved"), "success");
    } else {
      addBed(activeGardenId, { ...fields, x: 0, y: activeGarden?.beds.length ?? 0 });
      const created = useStore.getState().gardens.find((g) => g.id === activeGardenId)?.beds.at(-1);
      toast(t("planner.bedCreated", { name: fields.name }), "success");
      if (created) openBedById(created.id);
    }
    setBedDialog({ open: false });
  };

  // --- Garden actions ------------------------------------------------------
  const handleCreateGarden = () => {
    if (!gardenName.trim()) return;
    addGarden(gardenName.trim());
    setGardenName("");
    setNewGardenOpen(false);
    closeBed();
  };

  const handleDeleteGarden = async () => {
    const garden = activeGarden;
    if (!garden) return;
    if (!(await confirmDelete("garden", garden.name, t("planner.confirmDeleteGarden")))) return;
    const index = gardens.findIndex((g) => g.id === garden.id);
    deleteGarden(garden.id);
    closeBed();
    toast(t("planner.gardenDeleted", { name: garden.name }), "success", {
      action: { label: t("common.undo"), onClick: () => restoreGarden(garden, index) },
    });
  };

  const handleShare = () => {
    if (!activeGarden) return;
    const url = generateShareUrl(activeGarden);
    navigator.clipboard.writeText(url).then(() => toast(t("planner.shareCopied"), "success")).catch(() => setShareUrl(url));
  };

  const handleExport = () => {
    const data = JSON.stringify(gardens, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gardener-gardens-${toISODate()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const imported = JSON.parse(ev.target?.result as string) as Garden[];
        if (!Array.isArray(imported)) throw new Error("Invalid format");
        const store = useStore.getState();
        let count = 0;
        for (const g of imported) {
          if (!g.id || !g.name || !Array.isArray(g.beds)) continue;
          const id = store.addGarden(g.name);
          count++;
          for (const bed of g.beds) {
            store.addBed(id, {
              name: bed.name, x: bed.x, y: bed.y, width: bed.width, height: bed.height,
              environmentType: bed.environmentType ?? "outdoor_bed", paths: bed.paths,
              greenhouseConfig: bed.greenhouseConfig, containerConfig: bed.containerConfig,
              raisedBedConfig: bed.raisedBedConfig, coldFrameConfig: bed.coldFrameConfig,
            });
            const newBed = useStore.getState().gardens.find((sg) => sg.id === id)?.beds.at(-1);
            if (newBed) useStore.getState().updateBed(id, newBed.id, { cells: bed.cells ?? [] });
          }
        }
        toast(t("planner.importDone", { count }), "success");
      } catch {
        toast(t("planner.importFileError"), "error");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleArchive = async () => {
    if (!activeGardenId) return;
    if (await confirm(t("season.archiveConfirm"), { confirmLabel: t("season.archive"), danger: false })) {
      archiveSeason(activeGardenId);
      closeBed();
      toast(t("planner.archived"), "success");
    }
  };

  // --- Derived for rendering -------------------------------------------------
  const archives = useMemo(
    () => seasonArchives.filter((a) => a.gardenId === activeGardenId).sort((a, b) => b.season.localeCompare(a.season)),
    [seasonArchives, activeGardenId],
  );
  const totalPlants = activeGarden?.beds.reduce((s, b) => s + b.cells.length, 0) ?? 0;
  const inspectedCell = openBed && inspectKey ? openBed.cells.find((c) => `${c.cellX}-${c.cellY}` === inspectKey) : undefined;
  const inspectedPlant = inspectedCell ? plantMap.get(inspectedCell.plantId) : undefined;
  const editingBed = bedDialog.open && bedDialog.bedId ? findBed(bedDialog.bedId) : undefined;
  const autoFillBed = autoFillBedId ? findBed(autoFillBedId) : undefined;

  const gardenMenu = activeGarden ? (
    <Menu
      label={t("planner.gardenMenu")}
      // One garden: a compact "…" (no dropdown that looks like a choice between gardens).
      trigger={gardens.length > 1 ? <><span className="max-w-40 truncate">{t("planner.gardenMenuLabel")}</span><ChevronDown size={16} aria-hidden="true" /></> : undefined}
      items={[
        { label: t("planner.newGarden"), icon: Plus, onSelect: () => setNewGardenOpen(true) },
        { label: t("planner.duplicateGarden"), icon: Copy, onSelect: () => { duplicateGarden(activeGarden.id); closeBed(); toast(t("planner.gardenDuplicated"), "success"); } },
        "separator",
        { label: t("planner.share"), icon: Share2, onSelect: handleShare },
        { label: t("planner.printTitle"), icon: Printer, onSelect: () => setShowPrint(true) },
        { label: t("planner.exportFile"), icon: Download, onSelect: handleExport },
        { label: t("planner.importFile"), icon: Upload, onSelect: () => fileInputRef.current?.click() },
        { label: t("season.archive"), icon: Archive, disabled: totalPlants === 0, onSelect: () => void handleArchive() },
        "separator",
        { label: t("planner.deleteGarden"), icon: Trash2, danger: true, onSelect: () => void handleDeleteGarden() },
      ]}
    />
  ) : null;

  const headerDescription = activeGarden
    ? [
        gardens.length > 1 ? null : activeGarden.name,
        t("season.current", { year: activeGarden.season }),
        // No "0 Beete · 0 Pflanzen": the empty state already says so.
        activeGarden.beds.length > 0 ? t("season.beds", { count: activeGarden.beds.length }) : null,
        totalPlants > 0 ? t("season.plants", { count: totalPlants }) : null,
      ]
        .filter((part): part is string => !!part)
        // Each part wraps as a whole ("90 Pflanzen" never splits across lines).
        .map((part) => part.replace(/ /g, " "))
        .join(" · ")
    : t("planner.subtitle");

  const paletteOrInspector = (variant: "desktop" | "sheet") =>
    inspectedCell && inspectedPlant && openBed && activeGardenId ? (
      <CellInspector
        gardenId={activeGardenId}
        bed={openBed}
        cell={inspectedCell}
        plant={inspectedPlant}
        frostProtectionWeeks={frostWeeks}
        conflictPartners={conflictMap.get(inspectKey!)?.partners ?? []}
        onClose={() => setInspectKey(null)}
        onPlantMore={plantMore}
        onRemove={handleRemoveCell}
        onUpdate={(updates) => updateCell(activeGardenId, openBed.id, inspectedCell.cellX, inspectedCell.cellY, updates)}
        hideHeader={variant === "sheet"}
        compact={variant === "sheet" && !sheetFull}
        onExpand={() => { setSheetFull(true); if (inspectKey) setRevealKey(`${inspectKey}-${Date.now()}`); }}
      />
    ) : (
      <>
        {variant === "desktop" && (
          <div className="mb-3">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{t("planner.paletteTitle")}</h2>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{pointerFine ? t("planner.dragPlantClick") : t("planner.dragPlant")}</p>
          </div>
        )}
        <PlantPalette
          selectedPlantId={placingPlant?.id ?? null}
          onSelectPlant={selectPaletteItem}
          plantableNow={plantableNow}
          bedFitIds={bedFitIds}
        />
      </>
    );

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div>
        {/* Mobile bed view: the top bar already names the page; every pixel goes to the bed. */}
        <div className={openBed ? "max-md:hidden" : undefined}>
        <PageHeader
          title={t("planner.title")}
          description={headerDescription}
          actions={
            <>
              {canUndo && <IconButton icon={Undo2} label={t("planner.undo")} onClick={undo} />}
              {/* A brand-new garden: no lone "…" row; the empty state offers its two useful items. */}
              {(activeGarden?.beds.length || gardens.length > 1) ? gardenMenu : null}
              {/* Not while a bed is open (it would add a sibling, not edit this one) or while the empty state offers the same button. */}
              {activeGarden && !openBed && activeGarden.beds.length > 0 ? (
                <Button onClick={() => setBedDialog({ open: true })}>
                  <Plus size={16} aria-hidden="true" />
                  {t("planner.addBed")}
                </Button>
              ) : null}
            </>
          }
          tabs={
            gardens.length > 1 && activeGardenId ? (
              <Tabs
                label={t("planner.gardens")}
                value={activeGardenId}
                onChange={(id) => { setActiveGarden(id); closeBed(); }}
                items={gardens.map((g) => ({ value: g.id, label: g.name, count: g.beds.length }))}
              />
            ) : undefined
          }
        />
        </div>
        <input ref={fileInputRef} type="file" accept=".json,application/json" className="hidden" onChange={handleImport} aria-hidden="true" tabIndex={-1} />

        {!activeGarden ? (
          <Card>
            <EmptyState
              icon={LayoutGrid}
              title={t("planner.emptyGardenTitle")}
              description={t("planner.emptyGardenText")}
              action={<Button onClick={() => setNewGardenOpen(true)}><Plus size={16} aria-hidden="true" />{t("planner.newGarden")}</Button>}
              secondaryAction={<Button variant="ghost" onClick={() => fileInputRef.current?.click()}><Upload size={16} aria-hidden="true" />{t("planner.importFile")}</Button>}
            />
          </Card>
        ) : showPrint ? (
          <PrintBedLayout garden={activeGarden} plants={plants} gridCellSizeCm={gridCellSizeCm} getPlantName={getPlantName} />
        ) : openBed ? (
          /* ------------------------------------------------ bed editor */
          <>
            <div className="grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_320px]">
              <BedEditor
                gardenId={activeGarden.id}
                bed={openBed}
                plantMap={plantMap}
                gridCellSizeCm={gridCellSizeCm}
                mode={mode}
                placingPlant={placingPlant}
                hints={hints}
                conflicts={analysis.conflicts}
                conflictMap={conflictMap}
                companionPairs={analysis.companionPairs}
                selectedKey={inspectKey}
                zoom={zoom}
                feedback={feedback}
                onZoom={setZoom}
                onActivate={onActivate}
                onBack={closeBed}
                onStopMode={() => { setPlacingPlant(null); setPathMode(false); }}
                onSelectCell={(x, y) => { setPlacingPlant(null); setPathMode(false); setInspectKey(`${x}-${y}`); setSheetOpen(true); revealCell(x, y); }}
                onEdit={() => setBedDialog({ open: true, bedId: openBed.id })}
                onAutoFill={() => setAutoFillBedId(openBed.id)}
                onPathMode={() => { setPlacingPlant(null); setInspectKey(null); setPathMode((p) => !p); }}
                onClear={() => void handleClearBed(openBed)}
                onDuplicate={() => handleDuplicateBed(openBed.id)}
                onDelete={() => void handleDeleteBed(openBed.id)}
              />
              <aside className="sticky top-4 hidden max-h-[calc(100dvh-7rem)] overflow-y-auto rounded-xl border border-gray-200 bg-white p-4 shadow-xs md:block dark:border-white/10 dark:bg-gray-900">
                {paletteOrInspector("desktop")}
              </aside>
            </div>

            {/* Mobile: palette / inspector in a bottom sheet that reaches down behind the
                bottom nav (no strip of page content between them). Inspecting opens it as a
                peek (actions only, ~30 % height) so the bed and the selected cell stay
                visible; "Details" pulls it up. The spacer lets the last rows scroll above it. */}
            {/* Room for the sheet below the bed. Closed, it is only its handle row, which main's bottom padding already covers. */}
            <div className={!sheetOpen ? "hidden" : sheetFull || !inspectedCell ? "h-[72dvh] md:hidden" : "h-[40dvh] md:hidden"} aria-hidden="true" />
            <section
              data-planner-sheet
              aria-label={inspectedCell ? t("planner.inspectorLabel", { name: inspectedPlant ? getPlantName(inspectedPlant.id) : "" }) : t("planner.paletteTitle")}
              className="fixed inset-x-0 bottom-0 z-30 rounded-t-2xl border-t border-gray-200 bg-white pb-[calc(3.5rem+1px+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-12px_rgb(0_0_0/0.25)] sm:pb-0 md:hidden dark:border-white/10 dark:bg-gray-900"
            >
              {sheetOpen && inspectedCell && (
                <button
                  type="button"
                  onClick={() => { setSheetFull((f) => !f); if (inspectKey) setRevealKey(`${inspectKey}-${Date.now()}`); }}
                  aria-label={sheetFull ? t("planner.sheetLess") : t("planner.sheetMore")}
                  aria-expanded={sheetFull}
                  className="flex h-4 w-full items-start justify-center pt-1.5"
                >
                  <span aria-hidden="true" className="h-1 w-10 rounded-full bg-gray-300 dark:bg-white/20" />
                </button>
              )}
              <div className="flex items-center gap-1 pr-2">
                <button
                  type="button"
                  onClick={() => { setSheetOpen((o) => !o); setSheetFull(!inspectedCell); }}
                  aria-expanded={sheetOpen}
                  className={`flex min-w-0 flex-1 items-center gap-3 pl-4 text-left ${sheetOpen && inspectedCell ? "min-h-12" : "min-h-14"}`}
                >
                  {placingPlant ? (
                    <PlantIconDisplay plantId={placingPlant.id} emoji={placingPlant.icon} size={24} />
                  ) : inspectedPlant ? (
                    <PlantIconDisplay plantId={inspectedPlant.id} emoji={inspectedPlant.icon} size={24} />
                  ) : (
                    <Sprout size={20} aria-hidden="true" className="text-garden-700 dark:text-garden-300" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {inspectedPlant && inspectedCell
                        ? [getPlantName(inspectedPlant.id), inspectedCell.variety].filter(Boolean).join(" · ")
                        : placingPlant ? t("planner.placing", { plant: getPlantName(placingPlant.id) }) : t("planner.paletteTitle")}
                    </span>
                    <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
                      {inspectedCell
                        ? t("planner.cellPosition", { row: inspectedCell.cellY + 1, col: inspectedCell.cellX + 1 })
                        : placingPlant ? t("planner.sheetChangePlant") : t("planner.sheetPickHint")}
                    </span>
                  </span>
                  {sheetOpen ? <ChevronDown size={20} aria-hidden="true" className="shrink-0 text-gray-500" /> : <ChevronUp size={20} aria-hidden="true" className="shrink-0 text-gray-500" />}
                </button>
                {inspectedCell && <IconButton icon={X} label={t("planner.closeInspector")} onClick={() => { setInspectKey(null); setSheetOpen(false); }} />}
              </div>
              {sheetOpen && (
                <div className={`${sheetFull || !inspectedCell ? "max-h-[62dvh]" : "max-h-[34dvh]"} overflow-y-auto overscroll-contain border-t border-gray-100 px-4 pt-3 pb-4 dark:border-white/5`}>
                  {paletteOrInspector("sheet")}
                </div>
              )}
            </section>
          </>
        ) : (
          /* ------------------------------------------------ overview */
          <div className="space-y-8">
            {pendingPlant && (
              <div role="status" className="flex flex-wrap items-center gap-3 rounded-xl border border-garden-200 bg-garden-50 px-4 py-3 text-sm text-garden-900 dark:border-garden-500/30 dark:bg-garden-500/10 dark:text-garden-100">
                <PlantIconDisplay plantId={pendingPlant.id} emoji={pendingPlant.icon} size={24} />
                <span className="min-w-0 flex-1">{t("planner.chooseBedFor", { plant: getPlantName(pendingPlant.id) })}</span>
                <Button size="sm" variant="ghost" onClick={() => setPendingPlant(null)}><X size={16} aria-hidden="true" />{t("common.cancel")}</Button>
              </div>
            )}

            {activeGarden.beds.length === 0 ? (
              <Card>
                <EmptyState
                  icon={Fence}
                  title={t("planner.emptyBedsTitle")}
                  description={pointerFine ? t("planner.emptyBedsTextClick") : t("planner.emptyBedsText")}
                  action={<Button onClick={() => setBedDialog({ open: true })}><Plus size={16} aria-hidden="true" />{t("planner.addBed")}</Button>}
                  secondaryAction={gardens.length > 1 ? undefined : (
                    <span className="flex flex-wrap justify-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setNewGardenOpen(true)}><Plus size={16} aria-hidden="true" />{t("planner.newGarden")}</Button>
                      <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()}><Upload size={16} aria-hidden="true" />{t("planner.importFile")}</Button>
                    </span>
                  )}
                />
              </Card>
            ) : (
              <section aria-label={t("planner.bedsOverview")}>
                <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {activeGarden.beds.map((bed) => (
                    <li key={bed.id} className="flex">
                      <div className="flex w-full">
                        <BedOverviewCard
                          bed={bed}
                          plantMap={plantMap}
                          gridCellSizeCm={gridCellSizeCm}
                          onOpen={openBedById}
                          onEdit={(id) => setBedDialog({ open: true, bedId: id })}
                          onAutoFill={setAutoFillBedId}
                          onDuplicate={handleDuplicateBed}
                          onDelete={(id) => void handleDeleteBed(id)}
                        />
                      </div>
                    </li>
                  ))}
                  {/* Phones already have "Beet hinzufügen" in the header; the tile is the wide-screen affordance. */}
                  <li className="hidden sm:flex">
                    <button
                      type="button"
                      onClick={() => setBedDialog({ open: true })}
                      className="flex min-h-40 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 p-4 text-sm font-medium text-gray-600 transition-colors hover:border-garden-500 hover:bg-garden-50 hover:text-garden-800 dark:border-white/15 dark:text-gray-300 dark:hover:border-garden-400 dark:hover:bg-garden-500/10 dark:hover:text-garden-200"
                    >
                      <Plus size={22} aria-hidden="true" />
                      {t("planner.addBed")}
                    </button>
                  </li>
                </ul>
              </section>
            )}

            <CropRotation garden={activeGarden} />

            {archives.length > 0 && (
              <List header={t("season.archives")}>
                {archives.map((a) => (
                  <ListRow
                    key={`${a.gardenId}-${a.season}`}
                    leading={<Archive size={18} aria-hidden="true" className="text-gray-500" />}
                    title={t("season.current", { year: a.season })}
                    meta={[t("season.beds", { count: a.beds.length }), t("season.plants", { count: a.beds.reduce((s, b) => s + b.cells.length, 0) })]}
                    trailing={<time dateTime={a.archivedAt} className="text-xs font-normal text-gray-500 dark:text-gray-400">{formatDate(a.archivedAt, "short")}</time>}
                  />
                ))}
              </List>
            )}
          </div>
        )}

        <DragOverlay>
          {activeDragPlant ? (
            <div className="flex size-12 items-center justify-center rounded-lg bg-white shadow-lg ring-2 ring-garden-500 dark:bg-gray-800">
              <PlantIconDisplay plantId={activeDragPlant.id} emoji={activeDragPlant.icon} size={28} />
            </div>
          ) : null}
        </DragOverlay>

        {/* New garden */}
        <Modal
          open={newGardenOpen}
          onClose={() => setNewGardenOpen(false)}
          title={t("planner.newGarden")}
          footer={
            <>
              <Button variant="secondary" onClick={() => setNewGardenOpen(false)}>{t("common.cancel")}</Button>
              <Button onClick={handleCreateGarden} disabled={!gardenName.trim()}>{t("common.save")}</Button>
            </>
          }
        >
          <Input label={t("planner.gardenName")} value={gardenName} onChange={(e) => setGardenName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleCreateGarden()} autoFocus />
        </Modal>

        <BedDialog
          key={bedDialog.open ? bedDialog.bedId ?? "new" : "closed"}
          open={bedDialog.open}
          bed={editingBed}
          gridCellSizeCm={gridCellSizeCm}
          onClose={() => setBedDialog({ open: false })}
          onSave={handleSaveBed}
          onDelete={(bed) => void handleDeleteBed(bed.id)}
        />

        <AutoFillDialog
          open={!!autoFillBed}
          bedName={autoFillBed?.name ?? ""}
          hasPlants={(autoFillBed?.cells.length ?? 0) > 0}
          onClose={() => setAutoFillBedId(null)}
          onApply={handleAutoFill}
        />

        {/* Share fallback when the clipboard is not available */}
        <Modal
          open={!!shareUrl}
          onClose={() => setShareUrl(null)}
          title={t("planner.share")}
          description={t("planner.shareManual")}
          footer={<Button onClick={() => setShareUrl(null)}>{t("common.close")}</Button>}
        >
          <div className="flex items-end gap-2">
            <Input label={t("planner.shareLink")} value={shareUrl ?? ""} readOnly onFocus={(e) => e.currentTarget.select()} wrapperClassName="flex-1" />
            <IconButton icon={Clipboard} label={t("common.copy")} onClick={() => { if (shareUrl) void navigator.clipboard?.writeText(shareUrl).then(() => toast(t("planner.shareCopied"), "success")).catch(() => {}); }} />
          </div>
        </Modal>
      </div>
    </DndContext>
  );
}
