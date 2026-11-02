import { Fragment, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type UIEvent } from "react";
import {
  ArrowDownToLine,
  ArrowUpRight,
  CirclePlus,
  SlidersHorizontal,
  X,
  Search,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import "./App.css";

type Status = "idea" | "testing" | "verified" | "archive";
type ColumnId = "name" | "instrument" | "type" | "task" | "before" | "after" | "saving" | "status" | "video" | "author";
type Column = { id: ColumnId; label: string; width: number; min: number };
type Practice = {
  instrument?: string;
  name: string;
  type: string;
  task: string;
  beforeSeconds?: number;
  afterSeconds?: number;
  batch?: number;
  beforeNote?: string;
  afterNote?: string;
  status: Status;
  video: string;
  author: string;
};

// Keep new cases at the end; the table and Excel export preserve this order.
const practices: Practice[] = [
  {
    name: "Массовое создание багов",
    instrument: "GigaCode + Jira",
    type: "Скилл",
    task: "Ускоряет массовое заведение багов для дизайнеров",
    beforeSeconds: 18 * 60,
    afterSeconds: 50,
    batch: 10,
    status: "testing",
    video: "https://sbervideo.sberbank.ru/watch/AkLNoFA437mvCJuVZMB",
    author: "Рыбалко Станислав Олегович",
  },
  {
    name: "Создание рабочих макетов",
    instrument: "Claude + Pixso",
    type: "Пайплайн",
    task: "Как создавать и править рабочие макеты с помощью внешних инструментов",
    status: "testing",
    video: "",
    author: "Шевцова Анастасия Сергеевна",
  },
  {
    name: "Создание кликабельных прототипов",
    instrument: "Codex",
    type: "Пайплайн",
    task: "Ускорение создания сценариев для тестирования",
    status: "idea",
    video: "",
    author: "Рыбалко Станислав Олегович",
  },
  {
    name: "Создание кликабельных прототипов",
    instrument: "GigaCode (D2C Pixso)",
    type: "Пайплайн",
    task: "Ускоряет создание сценариев для тестирования",
    status: "idea",
    video: "",
    author: "Мартынова Елизавета Сергеевна",
  },
  {
    name: "Подготовка к тестированиям с ИИ",
    instrument: "GigaCode/Codex/Claude/и др.",
    type: "Пайплайн",
    task: "Помогает подобрать гипотезы и вопросы для тестирования",
    status: "testing",
    video: "",
    author: "Шевцова Анастасия Сергеевна",
  },
  {
    name: "Исследования",
    instrument: "GigaCode",
    type: "Пайплайн",
    task: "Исследование рынка и UX-паттернов",
    status: "testing",
    video: "https://sbervideo.sberbank.ru/watch/MnVpdl8kEbX9hPu6mD3",
    author: "Шевцова Анастасия Сергеевна",
  },
  {
    name: "User Story из БТ",
    instrument: "GigaCode + Confluence",
    type: "Пайплайн",
    task: "Агент перечитывает объёмные БТ и формирует по ним User Story по единому шаблону: не только сценарий действий пользователя, но и все относящиеся к нему ограничения (правила валидации полей, общие требования сервиса и другие ограничения, которые влияют на элементы). Готовые стори сразу передаются дизайнеру без ручной правки аналитиком.",
    beforeSeconds: 2 * 60 * 60,
    afterSeconds: 10 * 60,
    beforeNote: "в среднем",
    afterNote: "максимум",
    status: "testing",
    video: "https://sbervideo.sberbank.ru/watch/LKkMbt3AoWy7hJuVjE5",
    author: "Мартынова Елизавета Сергеевна",
  },
];

const statusLabels: Record<Status, string> = {
  idea: "Идея",
  testing: "Тестируем",
  verified: "Проверено",
  archive: "Архив",
};

const statusColors: Record<Status, "gray" | "amber" | "green"> = {
  idea: "gray",
  testing: "amber",
  verified: "green",
  archive: "gray",
};

const statusFilters: { value: "all" | Status; label: string }[] = [
  { value: "all", label: "Все" },
  { value: "idea", label: "Идея" },
  { value: "testing", label: "Тестируем" },
  { value: "verified", label: "Проверено" },
  { value: "archive", label: "Архив" },
];

const instrumentFilters = ["Claude", "Codex", "Confluence", "D2C Pixso", "GigaCode", "Jira", "Pixso"];
const typeFilters = ["Скилл", "Пайплайн", "Плагин"];
type FacetKey = "instrument" | "type" | "status" | "author";
type MenuKey = FacetKey | "view" | null;

function toggleFilterValue(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function FilterGroup({
  title,
  options,
  selected,
  onChange,
  single = false,
}: {
  title: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (values: string[]) => void;
  single?: boolean;
}) {
  return (
    <fieldset className="filter-group">
      <legend>{title}</legend>
      {!single && (
        <label className="filter-option">
          <input type="checkbox" checked={selected.length === 0} onChange={() => onChange([])} />
          <span>Все</span>
        </label>
      )}
      {single && (
        <label className="filter-option">
          <input type="radio" name={`filter-${title}`} checked={selected.length === 0} onChange={() => onChange([])} />
          <span>Все</span>
        </label>
      )}
      {options.map((option) => (
        <label className="filter-option" key={option.value}>
          <input
            type={single ? "radio" : "checkbox"}
            name={single ? `filter-${title}` : undefined}
            checked={selected.includes(option.value)}
            onChange={() => onChange(single ? [option.value] : toggleFilterValue(selected, option.value))}
          />
          <span>{option.label}</span>
        </label>
      ))}
    </fieldset>
  );
}

const columns: Column[] = [
  { id: "name", label: "Название задачи", width: 270, min: 190 },
  { id: "instrument", label: "Инструмент", width: 210, min: 150 },
  { id: "type", label: "Тип", width: 120, min: 90 },
  { id: "task", label: "Задача для AI", width: 380, min: 240 },
  { id: "before", label: "Время без AI на 1 чел.", width: 210, min: 165 },
  { id: "after", label: "Время AI на 1 чел.", width: 195, min: 155 },
  { id: "saving", label: "Экономия", width: 240, min: 180 },
  { id: "status", label: "Статус", width: 150, min: 115 },
  { id: "video", label: "Видео", width: 125, min: 90 },
  { id: "author", label: "Автор", width: 260, min: 200 },
];

function formatDuration(totalSeconds?: number) {
  if (totalSeconds === undefined) return "—";
  if (totalSeconds >= 60 * 60) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours} ч${minutes ? ` ${minutes} мин` : ""}${seconds ? ` ${seconds} сек` : ""}`;
  }
  if (totalSeconds < 60) return `${totalSeconds} сек`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return seconds ? `${minutes} мин ${seconds} сек` : `${minutes} мин`;
}

function formatSaving(practice: Practice) {
  if (practice.beforeSeconds === undefined || practice.afterSeconds === undefined) return null;
  return formatDuration(practice.beforeSeconds - practice.afterSeconds);
}

function formatFactor(practice: Practice) {
  if (practice.beforeSeconds === undefined || practice.afterSeconds === undefined || practice.afterSeconds === 0) return null;
  return (practice.beforeSeconds / practice.afterSeconds)
    .toLocaleString("ru-RU", { maximumFractionDigits: 1 }) + "×";
}

function formatTimeNote(practice: Practice, side: "before" | "after") {
  const note = side === "before" ? practice.beforeNote : practice.afterNote;
  if (note) return note;
  return practice.batch ? `на ${practice.batch} багов` : "";
}

function matchesSearch(practice: Practice, query: string) {
  const haystack = [practice.instrument, practice.name, practice.type, practice.task, practice.author]
    .join(" ")
    .toLocaleLowerCase("ru-RU");
  return haystack.includes(query.trim().toLocaleLowerCase("ru-RU"));
}

function ResizeHandle({
  label,
  width,
  minWidth,
  onResize,
}: {
  label: string;
  width: number;
  minWidth: number;
  onResize: (width: number) => void;
}) {
  const dragStart = useRef<{ x: number; width: number } | null>(null);

  function onPointerDown(event: PointerEvent<HTMLSpanElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStart.current = { x: event.clientX, width };
    document.body.classList.add("resizing-columns");
  }

  function onPointerMove(event: PointerEvent<HTMLSpanElement>) {
    if (!dragStart.current) return;
    onResize(Math.max(minWidth, dragStart.current.width + event.clientX - dragStart.current.x));
  }

  function onPointerUp() {
    dragStart.current = null;
    document.body.classList.remove("resizing-columns");
  }

  function onKeyDown(event: KeyboardEvent<HTMLSpanElement>) {
    const step = event.shiftKey ? 48 : 16;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      onResize(Math.max(minWidth, width - step));
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      onResize(width + step);
    }
  }

  return (
    <span
      className="resize-handle"
      role="separator"
      aria-orientation="vertical"
      aria-label={`Изменить ширину столбца «${label}»`}
      aria-valuenow={width}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
    />
  );
}

export default function App() {
  const [query, setQuery] = useState("");
  const [activeStatus, setActiveStatus] = useState<"all" | Status>("all");
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedAuthors, setSelectedAuthors] = useState<string[]>([]);
  const [openMenu, setOpenMenu] = useState<MenuKey>(null);
  const [columnSearch, setColumnSearch] = useState("");
  const [visibleColumnIds, setVisibleColumnIds] = useState<ColumnId[]>(() => columns.map(({ id }) => id));
  const [selectedPractice, setSelectedPractice] = useState<Practice | null>(null);
  const [horizontalProgress, setHorizontalProgress] = useState(0);
  const [horizontalThumbWidth, setHorizontalThumbWidth] = useState(48);
  const tableViewportRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [columnWidths, setColumnWidths] = useState<Record<ColumnId, number>>(() =>
    Object.fromEntries(columns.map(({ id, width }) => [id, width])) as Record<ColumnId, number>,
  );
  const authors = useMemo(() => [...new Set(practices.map(({ author }) => author))].sort((a, b) => a.localeCompare(b, "ru")), []);
  const activeFilterCount = selectedInstruments.length + selectedTypes.length + selectedAuthors.length + (activeStatus === "all" ? 0 : 1);
  const visibleColumns = columns.filter(({ id }) => visibleColumnIds.includes(id));
  const tableWidth = visibleColumns.reduce((total, column) => total + columnWidths[column.id], 0);

  const visiblePractices = useMemo(() => {
    const filtered = practices.filter((practice) =>
      (activeStatus === "all" || practice.status === activeStatus) &&
      (selectedInstruments.length === 0 || selectedInstruments.some((instrument) => practice.instrument?.toLocaleLowerCase().includes(instrument.toLocaleLowerCase()))) &&
      (selectedTypes.length === 0 || selectedTypes.includes(practice.type)) &&
      (selectedAuthors.length === 0 || selectedAuthors.includes(practice.author)) &&
      matchesSearch(practice, query),
    );
    return filtered;
  }, [activeStatus, query, selectedAuthors, selectedInstruments, selectedTypes]);
  const blankRows = Math.max(0, 16 - visiblePractices.length);
  const filterFacets: {
    key: FacetKey;
    label: string;
    options: { value: string; label: string }[];
    selected: string[];
    onChange: (values: string[]) => void;
    single?: boolean;
  }[] = [
    { key: "instrument", label: "Инструмент", options: instrumentFilters.map((value) => ({ value, label: value })), selected: selectedInstruments, onChange: setSelectedInstruments },
    { key: "type", label: "Тип", options: typeFilters.map((value) => ({ value, label: value })), selected: selectedTypes, onChange: setSelectedTypes },
    { key: "status", label: "Статус", options: statusFilters.filter(({ value }) => value !== "all").map(({ value, label }) => ({ value, label })), selected: activeStatus === "all" ? [] : [activeStatus], onChange: (values) => setActiveStatus((values.at(-1) as Status | undefined) ?? "all"), single: true },
    { key: "author", label: "Автор", options: authors.map((value) => ({ value, label: value })), selected: selectedAuthors, onChange: setSelectedAuthors },
  ];

  useEffect(() => {
    if (!openMenu) return;
    const closeOnOutsidePointer = (event: globalThis.PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      const openAnchor = toolbarRef.current?.querySelector<HTMLElement>(`[data-menu-key="${openMenu}"]`);
      if (!openAnchor?.contains(target)) setOpenMenu(null);
    };
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setOpenMenu(null);
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [openMenu]);

  function resetFilters() {
    setSelectedInstruments([]);
    setSelectedTypes([]);
    setSelectedAuthors([]);
    setActiveStatus("all");
  }

  function syncHorizontalScrollbar(element = tableViewportRef.current) {
    if (!element) return;
    const maxScroll = element.scrollWidth - element.clientWidth;
    const rangeWidth = element.parentElement?.querySelector<HTMLInputElement>(".horizontal-scroll-control input")?.clientWidth
      ?? element.clientWidth;
    setHorizontalProgress(maxScroll > 0 ? element.scrollLeft / maxScroll : 0);
    setHorizontalThumbWidth(maxScroll > 0
      ? Math.max(48, (rangeWidth * element.clientWidth) / element.scrollWidth)
      : rangeWidth);
  }

  useEffect(() => {
    const viewport = tableViewportRef.current;
    if (!viewport) return;
    const update = () => syncHorizontalScrollbar(viewport);
    const observer = new ResizeObserver(update);
    observer.observe(viewport);
    const table = viewport.querySelector("table");
    if (table) observer.observe(table);
    window.addEventListener("resize", update);
    update();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  async function exportExcel() {
    const XLSX = await import("xlsx-js-style");
    const rows = visiblePractices.map((practice) => ({
      "Название задачи": practice.name,
      Инструмент: practice.instrument ?? "",
      Тип: practice.type,
      "Задача для AI": practice.task,
      "Время без AI на 1 чел.": [formatDuration(practice.beforeSeconds), formatTimeNote(practice, "before")].filter(Boolean).join(" "),
      "Время AI на 1 чел.": [formatDuration(practice.afterSeconds), formatTimeNote(practice, "after")].filter(Boolean).join(" "),
      Экономия: formatSaving(practice) ? `−${formatSaving(practice)}, в ${formatFactor(practice)} быстрее` : "—",
      Статус: statusLabels[practice.status],
      Видео: practice.video,
      Автор: practice.author,
    }));
    const sheet = XLSX.utils.json_to_sheet(rows);
    const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1");
    for (let row = range.s.r; row <= range.e.r; row += 1) {
      for (let col = range.s.c; col <= range.e.c; col += 1) {
        const address = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = sheet[address];
        if (!cell) continue;
        cell.s = {
          font: row === range.s.r ? { bold: true } : {},
          border: {
            top: { style: "thin", color: { rgb: "000000" } },
            bottom: { style: "thin", color: { rgb: "000000" } },
            left: { style: "thin", color: { rgb: "000000" } },
            right: { style: "thin", color: { rgb: "000000" } },
          },
        };
      }
    }
    sheet["!cols"] = [
      { wch: 36 }, { wch: 28 }, { wch: 14 }, { wch: 60 }, { wch: 28 },
      { wch: 26 }, { wch: 42 }, { wch: 17 }, { wch: 54 }, { wch: 34 },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Практики AI");
    XLSX.writeFile(workbook, "praktiki-ai.xlsx");
  }

  function openRowOnKey(event: KeyboardEvent<HTMLTableRowElement>, practice: Practice) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setSelectedPractice(practice);
    }
  }

  function renderCell(practice: Practice, column: ColumnId) {
    switch (column) {
      case "name":
        return <TableCell className="practice-name-cell"><span className="practice-name">{practice.name}</span></TableCell>;
      case "instrument":
        return <TableCell>{practice.instrument || <span className="missing-value">—</span>}</TableCell>;
      case "type":
        return <TableCell><Badge variant="dot" color="gray" className="table-badge type-badge">{practice.type}</Badge></TableCell>;
      case "task":
        return <TableCell className="task-cell">{practice.task || <span className="missing-value">—</span>}</TableCell>;
      case "before":
        return <TableCell className="time-cell"><span className="duration">{formatDuration(practice.beforeSeconds)}</span>{formatTimeNote(practice, "before") && <span className="unit">{formatTimeNote(practice, "before")}</span>}</TableCell>;
      case "after":
        return <TableCell className="time-cell"><span className="duration">{formatDuration(practice.afterSeconds)}</span>{formatTimeNote(practice, "after") && <span className="unit">{formatTimeNote(practice, "after")}</span>}</TableCell>;
      case "saving":
        return <TableCell className="effect-cell"><span className={`duration${formatSaving(practice) ? "" : " missing-value"}`}>{formatSaving(practice) ? `−${formatSaving(practice)}` : "—"}</span>{formatFactor(practice) && <span className="unit">в {formatFactor(practice)} быстрее</span>}</TableCell>;
      case "status":
        return <TableCell><Badge variant="dot" color={statusColors[practice.status]} className={`table-badge status-badge status-${practice.status}`}>{statusLabels[practice.status]}</Badge></TableCell>;
      case "video":
        return <TableCell>{practice.video ? <a className="video-link" href={practice.video} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>Ссылка <ArrowUpRight size={13} aria-hidden="true" /></a> : <span className="missing-value">—</span>}</TableCell>;
      case "author":
        return <TableCell className="author-cell">{practice.author}</TableCell>;
    }
  }

  return (
    <main className="page-shell">
      <section className="catalog-heading">
        <div>
          <h1>Практики с AI</h1>
          <p className="intro-copy">Приёмы и инструменты, которые ускоряют работу дизайнеров.</p>
        </div>
        <Button
          variant="secondary"
          size="default"
          leadingIcon={ArrowDownToLine}
          onClick={exportExcel}
          disabled={visiblePractices.length === 0}
        >
          Выгрузить в Excel
        </Button>
      </section>

      <section className="catalog" aria-label="Каталог практик">
        <div className="catalog-controls" ref={toolbarRef}>
          <div className="catalog-controls-start">
            <label className="search-field">
              <Search size={16} strokeWidth={1.7} aria-hidden="true" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                type="search"
                placeholder="Найти практику"
                aria-label="Найти практику"
              />
              {query && <span className="search-count">{visiblePractices.length}</span>}
            </label>
            <div className="facet-controls" aria-label="Фильтры практик">
              {filterFacets.map((facet) => (
                <div className="menu-anchor" key={facet.key} data-menu-key={facet.key}>
                  <Button
                    type="button"
                    variant="tertiary"
                    size="compact"
                    leadingIcon={CirclePlus}
                    className="toolbar-chip"
                    active={openMenu === facet.key || facet.selected.length > 0}
                    aria-expanded={openMenu === facet.key}
                    aria-haspopup="dialog"
                    onClick={() => setOpenMenu((open) => open === facet.key ? null : facet.key)}
                  >
                    {facet.label}
                    {facet.selected.length > 0 && <span className="filter-count">{facet.selected.length}</span>}
                  </Button>
                  {openMenu === facet.key && (
                    <div className="toolbar-popover facet-popover" role="dialog" aria-label={`Фильтр: ${facet.label}`}>
                      <FilterGroup
                        title={facet.label}
                        options={facet.options}
                        selected={facet.selected}
                        onChange={facet.onChange}
                        single={facet.single}
                      />
                    </div>
                  )}
                </div>
              ))}
              {activeFilterCount > 0 && (
                <div className="active-filter-summary" aria-label={`${activeFilterCount} активных фильтра`}>
                  <span>{activeFilterCount}</span>
                  <button type="button" aria-label="Сбросить фильтры" title="Сбросить фильтры" onClick={resetFilters}>
                    <X size={13} aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="catalog-actions">
            <div className="menu-anchor" data-menu-key="view">
              <Button
                type="button"
                variant="tertiary"
                size="compact"
                leadingIcon={SlidersHorizontal}
                className="toolbar-chip"
                aria-expanded={openMenu === "view"}
                aria-haspopup="dialog"
                onClick={() => setOpenMenu((open) => open === "view" ? null : "view")}
              >
                Вид
              </Button>
              {openMenu === "view" && (
                <div className="toolbar-popover view-popover" role="dialog" aria-label="Видимые столбцы">
                  <label className="column-search">
                    <Search size={15} aria-hidden="true" />
                    <input value={columnSearch} onChange={(event) => setColumnSearch(event.target.value)} placeholder="Найти столбец…" autoFocus />
                  </label>
                  <div className="column-options">
                    {columns.filter(({ label }) => label.toLocaleLowerCase().includes(columnSearch.toLocaleLowerCase())).map((column) => {
                      const checked = visibleColumnIds.includes(column.id);
                      return (
                        <label className="column-option" key={column.id}>
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={checked && visibleColumnIds.length === 1}
                            onChange={() => setVisibleColumnIds((current) => checked ? current.filter((id) => id !== column.id) : [...current, column.id])}
                          />
                          <span>{column.label}</span>
                        </label>
                      );
                    })}
                    {columns.every(({ label }) => !label.toLocaleLowerCase().includes(columnSearch.toLocaleLowerCase())) && <p className="no-columns">Столбцы не найдены</p>}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        <div className="table-shell">
        <div className="table-viewport" ref={tableViewportRef} tabIndex={0} aria-label="Таблица практик: прокрутка по вертикали и горизонтали" onScroll={(event: UIEvent<HTMLDivElement>) => syncHorizontalScrollbar(event.currentTarget)}>
          <Table className="practice-table" aria-label="Практики с AI" style={{ width: `max(100%, ${tableWidth}px, calc(100vw + 180px))` }}>
            <colgroup>
              {visibleColumns.map((column) => (
                <col key={column.id} style={{ width: `${columnWidths[column.id]}px` }} />
              ))}
            </colgroup>
            <TableHeader>
              <TableRow className="table-heading-row">
                {visibleColumns.map((column) => (
                  <TableHead
                    key={column.id}
                    className="resizable-head"
                  >
                    <span className="table-heading-label">{column.label}</span>
                    <ResizeHandle
                      label={column.label}
                      width={columnWidths[column.id]}
                      minWidth={column.min}
                      onResize={(width) => setColumnWidths((current) => ({ ...current, [column.id]: width }))}
                    />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {visiblePractices.map((practice, index) => (
                <TableRow
                  key={`${practice.name}-${practice.instrument ?? ""}`}
                  tabIndex={0}
                  className="practice-row"
                  onClick={() => setSelectedPractice(practice)}
                  onKeyDown={(event) => openRowOnKey(event, practice)}
                  aria-label={`${practice.name}. Открыть подробности.`}
                >
                  {visibleColumns.map((column) => <Fragment key={column.id}>{renderCell(practice, column.id)}</Fragment>)}
                </TableRow>
              ))}
              {Array.from({ length: blankRows }, (_, index) => (
                <TableRow key={`empty-${index}`} className="blank-row" aria-hidden="true">
                  {visibleColumns.map((column) => <TableCell key={column.id} />)}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {visiblePractices.length === 0 && (
            <div className="empty-state">
              <p>Ничего не найдено</p>
              <span>Попробуйте другой запрос или выберите другой статус.</span>
            </div>
          )}
        </div>
        <div className="horizontal-scroll-control">
          <input
            type="range"
            min="0"
            max="1000"
            value={Math.round(horizontalProgress * 1000)}
            style={{ "--thumb-width": `${horizontalThumbWidth}px` } as CSSProperties}
            aria-label="Прокрутить таблицу по горизонтали"
            onChange={(event) => {
              const viewport = tableViewportRef.current;
              if (!viewport) return;
              const progress = Number(event.target.value) / 1000;
              viewport.scrollLeft = progress * (viewport.scrollWidth - viewport.clientWidth);
              setHorizontalProgress(progress);
            }}
          />
        </div>
        </div>
        <div className="catalog-footer">
          {visiblePractices.length} {visiblePractices.length === 1 ? "практика" : "практик"}
        </div>
      </section>

      <Dialog open={selectedPractice !== null} onOpenChange={(open) => !open && setSelectedPractice(null)}>
        {selectedPractice && (
          <DialogContent size="lg" className="practice-dialog">
            <DialogHeader>
              <div className="dialog-meta">
                {selectedPractice.type && selectedPractice.type !== "—" && (
                  <Badge variant="dot" color="gray" size="compact">{selectedPractice.type}</Badge>
                )}
                <Badge variant="dot" color={statusColors[selectedPractice.status]} size="compact">
                  {statusLabels[selectedPractice.status]}
                </Badge>
              </div>
              <DialogTitle>{selectedPractice.name}</DialogTitle>
              <DialogDescription>{selectedPractice.task || "Описание пока не добавлено."}</DialogDescription>
            </DialogHeader>
            <div className="dialog-timing">
              <div><span>Без AI</span><strong>{formatDuration(selectedPractice.beforeSeconds)}</strong><small>{formatTimeNote(selectedPractice, "before") || "—"}</small></div>
              <div><span>С AI</span><strong>{formatDuration(selectedPractice.afterSeconds)}</strong><small>{formatTimeNote(selectedPractice, "after") || "—"}</small></div>
            </div>
            <div className="dialog-result">
              <span>Экономия времени</span>
              <strong>{formatSaving(selectedPractice) ? `−${formatSaving(selectedPractice)}` : "—"}</strong>
              <small>{formatFactor(selectedPractice) ? `в ${formatFactor(selectedPractice)} быстрее` : "—"}</small>
            </div>
            <div className="dialog-bottomline">
              <div><span>Инструмент</span><strong>{selectedPractice.instrument || <span className="missing-value">Не указан</span>}</strong></div>
              <div><span>Автор (полное ФИО)</span><strong>{selectedPractice.author}</strong></div>
              <div><span>Видео</span>{selectedPractice.video ? <a href={selectedPractice.video} target="_blank" rel="noreferrer">Открыть видео <ArrowUpRight size={13} /></a> : <strong className="missing-value">Не добавлено</strong>}</div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </main>
  );
}
