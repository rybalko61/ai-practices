import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type UIEvent } from "react";
import {
  ArrowDownToLine,
  ArrowUpRight,
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
import { Tabs, TabsList, TabItem } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import "./App.css";

type Status = "idea" | "testing" | "verified" | "archive";
type ColumnId = "name" | "type" | "task" | "before" | "after" | "saving" | "status" | "video" | "author";
type Column = { id: ColumnId; label: string; width: number; min: number };
type Practice = {
  name: string;
  type: string;
  task: string;
  beforeSeconds: number;
  afterSeconds: number;
  batch: number;
  status: Status;
  video: string;
  author: string;
};

const practices: Practice[] = [
  {
    name: "Заведение багов через GigaCode",
    type: "Скилл",
    task: "Ускоряет массовое заведение багов для дизайнеров",
    beforeSeconds: 18 * 60,
    afterSeconds: 50,
    batch: 10,
    status: "testing",
    video: "",
    author: "Стас",
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

const columns: Column[] = [
  { id: "name", label: "Название", width: 300, min: 190 },
  { id: "type", label: "Тип", width: 120, min: 90 },
  { id: "task", label: "Задача", width: 300, min: 180 },
  { id: "before", label: "Без AI", width: 155, min: 120 },
  { id: "after", label: "С AI", width: 150, min: 120 },
  { id: "saving", label: "Экономия", width: 185, min: 145 },
  { id: "status", label: "Статус", width: 160, min: 115 },
  { id: "video", label: "Видео", width: 110, min: 80 },
  { id: "author", label: "Автор", width: 125, min: 90 },
];

function formatDuration(totalSeconds: number) {
  if (totalSeconds < 60) return `${totalSeconds} сек`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return seconds ? `${minutes} мин ${seconds} сек` : `${minutes} мин`;
}

function formatSaving(practice: Practice) {
  return formatDuration(practice.beforeSeconds - practice.afterSeconds);
}

function formatFactor(practice: Practice) {
  return (practice.beforeSeconds / practice.afterSeconds)
    .toLocaleString("ru-RU", { maximumFractionDigits: 1 }) + "×";
}

function matchesSearch(practice: Practice, query: string) {
  const haystack = [practice.name, practice.type, practice.task, practice.author]
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
  const [selectedPractice, setSelectedPractice] = useState<Practice | null>(null);
  const [horizontalProgress, setHorizontalProgress] = useState(0);
  const [horizontalThumbWidth, setHorizontalThumbWidth] = useState(48);
  const tableViewportRef = useRef<HTMLDivElement>(null);
  const [columnWidths, setColumnWidths] = useState<Record<ColumnId, number>>(() =>
    Object.fromEntries(columns.map(({ id, width }) => [id, width])) as Record<ColumnId, number>,
  );
  const tableWidth = columns.reduce((total, column) => total + columnWidths[column.id], 0);

  const visiblePractices = useMemo(
    () => practices.filter((practice) =>
      (activeStatus === "all" || practice.status === activeStatus) &&
      matchesSearch(practice, query),
    ),
    [activeStatus, query],
  );
  const blankRows = Math.max(0, 16 - visiblePractices.length);

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
    const XLSX = await import("xlsx");
    const rows = visiblePractices.map((practice) => ({
      Название: practice.name,
      Тип: practice.type,
      Задача: practice.task,
      "Время без AI": `${formatDuration(practice.beforeSeconds)} на ${practice.batch} багов`,
      "Время с AI": `${formatDuration(practice.afterSeconds)} на ${practice.batch} багов`,
      Эффект: `−${formatSaving(practice)}, в ${formatFactor(practice)} быстрее`,
      Статус: statusLabels[practice.status],
      Видео: practice.video,
      Автор: practice.author,
    }));
    const sheet = XLSX.utils.json_to_sheet(rows);
    sheet["!cols"] = [
      { wch: 36 }, { wch: 14 }, { wch: 52 }, { wch: 26 }, { wch: 25 },
      { wch: 36 }, { wch: 17 }, { wch: 36 }, { wch: 16 },
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
        <div className="catalog-controls">
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
          <Tabs value={activeStatus} onValueChange={(value) => setActiveStatus(value as "all" | Status)}>
            <TabsList aria-label="Фильтр по статусу" className="status-tabs">
              {statusFilters.map((filter) => (
                <TabItem key={filter.value} value={filter.value} label={filter.label} />
              ))}
            </TabsList>
          </Tabs>
        </div>

        <div className="table-viewport" ref={tableViewportRef} tabIndex={0} aria-label="Таблица практик: прокрутка по вертикали и горизонтали" onScroll={(event: UIEvent<HTMLDivElement>) => syncHorizontalScrollbar(event.currentTarget)}>
          <Table className="practice-table" aria-label="Практики с AI" style={{ width: `max(100%, ${tableWidth}px, calc(100vw + 180px))` }}>
            <colgroup>
              {columns.map((column) => (
                <col key={column.id} style={{ width: `${columnWidths[column.id]}px` }} />
              ))}
            </colgroup>
            <TableHeader>
              <TableRow className="table-heading-row">
                {columns.map((column) => (
                  <TableHead key={column.id} className="resizable-head">
                    <span>{column.label}</span>
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
                  key={practice.name}
                  index={index}
                  tabIndex={0}
                  className="practice-row"
                  onClick={() => setSelectedPractice(practice)}
                  onKeyDown={(event) => openRowOnKey(event, practice)}
                  aria-label={`${practice.name}. Открыть подробности.`}
                >
                  <TableCell className="practice-name-cell">
                    <span className="practice-name">{practice.name}</span>
                  </TableCell>
                  <TableCell><Badge variant="dot" color="gray" size="compact">{practice.type}</Badge></TableCell>
                  <TableCell className="task-cell">{practice.task}</TableCell>
                  <TableCell className="time-cell">
                    <span className="duration">{formatDuration(practice.beforeSeconds)}</span>
                    <span className="unit">на {practice.batch} багов</span>
                  </TableCell>
                  <TableCell className="time-cell">
                    <span className="duration">{formatDuration(practice.afterSeconds)}</span>
                    <span className="unit">на {practice.batch} багов</span>
                  </TableCell>
                  <TableCell className="effect-cell">
                    <span className="duration">−{formatSaving(practice)}</span>
                    <span className="unit">в {formatFactor(practice)} быстрее</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="dot" color={statusColors[practice.status]}>
                      {statusLabels[practice.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {practice.video ? (
                      <a className="video-link" href={practice.video} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>
                        Смотреть <ArrowUpRight size={13} aria-hidden="true" />
                      </a>
                    ) : <span className="missing-value">—</span>}
                  </TableCell>
                  <TableCell className="author-cell">{practice.author}</TableCell>
                </TableRow>
              ))}
              {Array.from({ length: blankRows }, (_, index) => (
                <TableRow key={`empty-${index}`} className="blank-row" aria-hidden="true">
                  {columns.map((column) => <TableCell key={column.id} />)}
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
        <div className="catalog-footer">
          {visiblePractices.length} {visiblePractices.length === 1 ? "практика" : "практик"}
        </div>
      </section>

      <Dialog open={selectedPractice !== null} onOpenChange={(open) => !open && setSelectedPractice(null)}>
        {selectedPractice && (
          <DialogContent size="lg" className="practice-dialog">
            <DialogHeader>
              <div className="dialog-meta">
                <Badge variant="dot" color="gray" size="compact">{selectedPractice.type}</Badge>
                <Badge variant="dot" color={statusColors[selectedPractice.status]} size="compact">
                  {statusLabels[selectedPractice.status]}
                </Badge>
              </div>
              <DialogTitle>{selectedPractice.name}</DialogTitle>
              <DialogDescription>{selectedPractice.task}.</DialogDescription>
            </DialogHeader>
            <div className="dialog-timing">
              <div><span>Без AI</span><strong>{formatDuration(selectedPractice.beforeSeconds)}</strong><small>на {selectedPractice.batch} багов</small></div>
              <div><span>С AI</span><strong>{formatDuration(selectedPractice.afterSeconds)}</strong><small>на {selectedPractice.batch} багов</small></div>
            </div>
            <div className="dialog-result">
              <span>Экономия времени</span>
              <strong>−{formatSaving(selectedPractice)}</strong>
              <small>в {formatFactor(selectedPractice)} быстрее</small>
            </div>
            <div className="dialog-bottomline">
              <div><span>Автор</span><strong>{selectedPractice.author}</strong></div>
              <div><span>Видео</span>{selectedPractice.video ? <a href={selectedPractice.video} target="_blank" rel="noreferrer">Открыть видео <ArrowUpRight size={13} /></a> : <strong className="missing-value">Не добавлено</strong>}</div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </main>
  );
}
