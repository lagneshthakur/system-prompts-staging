"use client";

import { IconAlertTriangle, IconCopy } from "@tabler/icons-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  formatJson,
  type TimetableActivity,
  type TimetableCell,
  type TimetableColumn,
  type TimetableInspectionResponse,
  type TimetableRow,
} from "@/lib/timetable-api";

interface ResultsPanelProps {
  results: TimetableInspectionResponse | null;
  error: string | null;
}

interface SummaryItem {
  label: string;
  value: string;
  helper?: string;
}

interface DebugSection {
  key: string;
  title: string;
  description: string;
  data: unknown;
  summary: SummaryItem[];
  consumedScalarKeys: string[];
}

const STRUCTURED_PIPELINE_EXTENSIONS = new Set(["docx", "xlsx", "pptx"]);
const WEEKDAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const DEBUG_SECTION_DEFINITIONS = [
  {
    key: "timetableRootDebug",
    title: "Table Selection",
    description: "Shows how candidate tables were scored before the extractor chose one.",
  },
  {
    key: "timetableRoot",
    title: "Timetable Root",
    description: "Normalized deterministic root after table selection and shape cleanup.",
  },
  {
    key: "pass1",
    title: "Pass 1",
    description: "Raw grid after parser normalization and vertical-merge fixes.",
  },
  {
    key: "pass2",
    title: "Pass 2",
    description: "Grid enriched with structural labels and parsed time metadata.",
  },
  {
    key: "pass3",
    title: "Pass 3",
    description: "Fully timed day blocks before semantic routing decisions.",
  },
  {
    key: "pass4",
    title: "Pass 4",
    description: "Routing output showing which blocks were skipped or sent to the LLM.",
  },
  {
    key: "pass5",
    title: "Pass 5",
    description: "LLM responses matched back onto the routed timetable blocks.",
  },
  {
    key: "pass6",
    title: "Pass 6",
    description: "Final timetable events returned by the structured document pipeline.",
  },
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPrimitive(value: unknown): value is string | number | boolean | null {
  return value === null || ["string", "number", "boolean"].includes(typeof value);
}

function formatScalar(value: unknown): string {
  if (value === null) {
    return "null";
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  return String(value);
}

function formatLabel(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function getFileExtension(fileName: string | null | undefined): string | null {
  if (!fileName) {
    return null;
  }

  const segments = fileName.toLowerCase().split(".");
  if (segments.length < 2) {
    return null;
  }

  const extension = segments.at(-1)?.trim();
  return extension || null;
}

function normalizeActivity(value: unknown): TimetableActivity | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    typeof value.day !== "string" ||
    typeof value.start_time !== "string" ||
    typeof value.end_time !== "string" ||
    typeof value.title !== "string"
  ) {
    return null;
  }

  return {
    day: value.day,
    start_time: value.start_time,
    end_time: value.end_time,
    title: value.title,
    notes: typeof value.notes === "string" ? value.notes : null,
  };
}

function getStructuredPass6Activities(rawOcrOutput: unknown): TimetableActivity[] {
  if (!isRecord(rawOcrOutput) || !isRecord(rawOcrOutput.pass6)) {
    return [];
  }

  const rawActivities = Array.isArray(rawOcrOutput.pass6.activities) ? rawOcrOutput.pass6.activities : [];

  return rawActivities
    .map((activity) => normalizeActivity(activity))
    .filter((activity): activity is TimetableActivity => activity !== null);
}

function normalizeActivitiesForGrid(activities: TimetableActivity[]): TimetableActivity[] {
  return activities.filter((activity, _, allActivities) => {
    if (activity.start_time !== activity.end_time) {
      return true;
    }

    return !allActivities.some(
      (candidate) =>
        candidate.day === activity.day &&
        candidate.start_time === activity.start_time &&
        candidate.end_time !== candidate.start_time
    );
  });
}

function parseTimeToMinutes(time: string): number {
  const match = time.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    return Number.NaN;
  }

  return Number.parseInt(match[1], 10) * 60 + Number.parseInt(match[2], 10);
}

function sortTimes(left: string, right: string): number {
  const leftMinutes = parseTimeToMinutes(left);
  const rightMinutes = parseTimeToMinutes(right);

  if (Number.isNaN(leftMinutes) || Number.isNaN(rightMinutes)) {
    return left.localeCompare(right);
  }

  return leftMinutes - rightMinutes;
}

function createEmptyCell(columnKey: string, colSpan: number): TimetableCell {
  return {
    columnKey,
    colSpan,
    rowSpan: 1,
    rawText: "",
    title: "",
    startTime: "",
    endTime: "",
  };
}

function buildGridFromActivities(activities: TimetableActivity[]): { columns: TimetableColumn[]; rows: TimetableRow[] } | null {
  const normalizedActivities = normalizeActivitiesForGrid(activities);

  if (normalizedActivities.length === 0) {
    return null;
  }

  const boundaries = Array.from(
    new Set(normalizedActivities.flatMap((activity) => [activity.start_time, activity.end_time]))
  ).sort(sortTimes);

  if (boundaries.length < 2) {
    return null;
  }

  const columns = boundaries.slice(0, -1).map((startTime, index) => ({
    columnKey: `P${index + 1}`,
    startTime,
    endTime: boundaries[index + 1],
  }));

  const boundaryIndex = new Map(boundaries.map((time, index) => [time, index]));
  const days = Array.from(new Set(normalizedActivities.map((activity) => activity.day))).sort((left, right) => {
    const leftIndex = WEEKDAY_ORDER.indexOf(left);
    const rightIndex = WEEKDAY_ORDER.indexOf(right);

    if (leftIndex === -1 && rightIndex === -1) {
      return left.localeCompare(right);
    }

    if (leftIndex === -1) {
      return 1;
    }

    if (rightIndex === -1) {
      return -1;
    }

    return leftIndex - rightIndex;
  });

  const rows = days.map((day, rowIndex) => {
    const dayActivities = normalizedActivities
      .filter((activity) => activity.day === day)
      .sort((left, right) => {
        const startDifference = sortTimes(left.start_time, right.start_time);
        if (startDifference !== 0) {
          return startDifference;
        }

        const endDifference = sortTimes(left.end_time, right.end_time);
        if (endDifference !== 0) {
          return endDifference;
        }

        return left.title.localeCompare(right.title);
      });

    const cells: TimetableCell[] = [];
    let cursor = 0;

    for (const activity of dayActivities) {
      const rawStartIndex = boundaryIndex.get(activity.start_time);
      if (typeof rawStartIndex !== "number" || rawStartIndex >= columns.length) {
        continue;
      }

      const startIndex = Math.max(rawStartIndex, cursor);
      if (startIndex >= columns.length) {
        continue;
      }

      let endIndex = boundaryIndex.get(activity.end_time);
      if (typeof endIndex !== "number" || endIndex <= rawStartIndex) {
        endIndex = rawStartIndex + 1;
      }

      endIndex = Math.min(Math.max(endIndex, startIndex + 1), columns.length);

      if (endIndex <= startIndex) {
        continue;
      }

      if (startIndex > cursor) {
        cells.push(createEmptyCell(columns[cursor].columnKey, startIndex - cursor));
      }

      cells.push({
        columnKey: columns[startIndex].columnKey,
        colSpan: endIndex - startIndex,
        rowSpan: 1,
        rawText: activity.notes ? `${activity.title}\n${activity.notes}` : activity.title,
        title: activity.title,
        startTime: activity.start_time,
        endTime: activity.end_time,
        note: activity.notes ?? undefined,
      });

      cursor = endIndex;
    }

    if (cursor < columns.length) {
      cells.push(createEmptyCell(columns[cursor].columnKey, columns.length - cursor));
    }

    return {
      rowIndex,
      rowLabel: day,
      cells,
    };
  });

  return { columns, rows };
}

function countCells(rows: unknown[]): number {
  return rows.reduce<number>((count, row) => {
    if (!isRecord(row) || !Array.isArray(row.cells)) {
      return count;
    }

    return count + row.cells.length;
  }, 0);
}

function countBlocks(days: unknown[]): number {
  return days.reduce<number>((count, day) => {
    if (!isRecord(day) || !Array.isArray(day.blocks)) {
      return count;
    }

    return count + day.blocks.length;
  }, 0);
}

function countRoutes(days: unknown[]): { skip: number; send: number } {
  return days.reduce<{ skip: number; send: number }>(
    (totals, day) => {
      if (!isRecord(day) || !Array.isArray(day.blocks)) {
        return totals;
      }

      for (const block of day.blocks) {
        if (!isRecord(block)) {
          continue;
        }

        if (block.route === "skip_llm") {
          totals.skip += 1;
        } else if (block.route === "send_to_llm") {
          totals.send += 1;
        }
      }

      return totals;
    },
    { skip: 0, send: 0 }
  );
}

function getDebugSectionSummary(key: string, data: unknown): {
  items: SummaryItem[];
  consumedScalarKeys: string[];
} {
  if (!isRecord(data)) {
    return { items: [], consumedScalarKeys: [] };
  }

  switch (key) {
    case "timetableRootDebug": {
      const selection = isRecord(data.selection) ? data.selection : null;
      const tables = Array.isArray(selection?.tables) ? selection.tables : [];

      return {
        items: [
          {
            label: "Selected Table",
            value: formatScalar(data.selected_table_index ?? "Unknown"),
          },
          {
            label: "Candidates",
            value: String(tables.length),
          },
          {
            label: "Best Score",
            value: formatScalar(selection?.best_score ?? "Unknown"),
          },
        ],
        consumedScalarKeys: ["selected_table_index"],
      };
    }
    case "timetableRoot": {
      const columns = Array.isArray(data.columns) ? data.columns : [];
      const rows = Array.isArray(data.rows) ? data.rows : [];

      return {
        items: [
          {
            label: "Columns",
            value: String(columns.length),
          },
          {
            label: "Rows",
            value: String(rows.length),
          },
          {
            label: "Cells",
            value: String(countCells(rows)),
          },
        ],
        consumedScalarKeys: [],
      };
    }
    case "pass1": {
      const dimensions = isRecord(data.dimensions) ? data.dimensions : null;
      const rows = Array.isArray(data.rows) ? data.rows : [];

      return {
        items: [
          {
            label: "Selected Table",
            value: formatScalar(data.selected_table_index ?? "Unknown"),
          },
          {
            label: "Grid Rows",
            value: formatScalar(dimensions?.rows ?? "Unknown"),
          },
          {
            label: "Grid Columns",
            value: formatScalar(dimensions?.columns ?? "Unknown"),
          },
          {
            label: "Parsed Rows",
            value: String(rows.length),
          },
        ],
        consumedScalarKeys: ["selected_table_index"],
      };
    }
    case "pass2": {
      const rows = Array.isArray(data.rows) ? data.rows : [];

      return {
        items: [
          {
            label: "Header Row",
            value: formatScalar(data.header_row_index ?? "Unknown"),
          },
          {
            label: "Day Column",
            value: formatScalar(data.day_column_index ?? "Unknown"),
          },
          {
            label: "Day Rows",
            value: String(rows.length),
          },
          {
            label: "Parsed Cells",
            value: String(countCells(rows)),
          },
        ],
        consumedScalarKeys: ["header_row_index", "day_column_index"],
      };
    }
    case "pass3": {
      const days = Array.isArray(data.days) ? data.days : [];

      return {
        items: [
          {
            label: "School Window",
            value: `${formatScalar(data.school_start_time ?? "Unknown")} - ${formatScalar(data.school_end_time ?? "Unknown")}`,
          },
          {
            label: "Days",
            value: String(days.length),
          },
          {
            label: "Blocks",
            value: String(countBlocks(days)),
          },
        ],
        consumedScalarKeys: ["school_start_time", "school_end_time"],
      };
    }
    case "pass4": {
      const days = Array.isArray(data.days) ? data.days : [];
      const routes = countRoutes(days);

      return {
        items: [
          {
            label: "Days",
            value: String(days.length),
          },
          {
            label: "Skip LLM",
            value: String(routes.skip),
          },
          {
            label: "Send To LLM",
            value: String(routes.send),
          },
          {
            label: "Bundle Size",
            value: formatScalar(data.bundle_size ?? "Unknown"),
          },
        ],
        consumedScalarKeys: ["bundle_size"],
      };
    }
    case "pass5": {
      const days = Array.isArray(data.days) ? data.days : [];
      const llmResults = Array.isArray(data.llm_results) ? data.llm_results : [];

      return {
        items: [
          {
            label: "Days",
            value: String(days.length),
          },
          {
            label: "LLM Results",
            value: String(llmResults.length),
          },
          {
            label: "Mapped Blocks",
            value: String(countBlocks(days)),
          },
        ],
        consumedScalarKeys: [],
      };
    }
    case "pass6": {
      const activities = Array.isArray(data.activities) ? data.activities : [];

      return {
        items: [
          {
            label: "Final Activities",
            value: String(activities.length),
          },
        ],
        consumedScalarKeys: [],
      };
    }
    default:
      return { items: [], consumedScalarKeys: [] };
  }
}

function buildDebugSections(rawOcrOutput: unknown): DebugSection[] {
  if (!isRecord(rawOcrOutput)) {
    return [];
  }

  return DEBUG_SECTION_DEFINITIONS.flatMap((definition) => {
    const data = rawOcrOutput[definition.key];
    if (typeof data === "undefined") {
      return [];
    }

    const summary = getDebugSectionSummary(definition.key, data);
    return [
      {
        key: definition.key,
        title: definition.title,
        description: definition.description,
        data,
        summary: summary.items,
        consumedScalarKeys: summary.consumedScalarKeys,
      },
    ];
  });
}

function DebugSectionView({ section }: { section: DebugSection }) {
  const scalarEntries = isRecord(section.data)
    ? Object.entries(section.data).filter(
        ([key, value]) => isPrimitive(value) && !section.consumedScalarKeys.includes(key)
      )
    : [];
  const complexEntries = isRecord(section.data)
    ? Object.entries(section.data).filter(([, value]) => !isPrimitive(value))
    : [];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-semibold">{section.title}</h3>
          <Badge variant="outline">{section.key}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">{section.description}</p>
      </div>

      {section.summary.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {section.summary.map((item) => (
            <StatCard
              key={`${section.key}-${item.label}`}
              label={item.label}
              value={item.value}
              helper={item.helper}
            />
          ))}
        </div>
      ) : null}

      {scalarEntries.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {scalarEntries.map(([key, value]) => (
            <StatCard
              key={`${section.key}-${key}`}
              label={formatLabel(key)}
              value={formatScalar(value)}
            />
          ))}
        </div>
      ) : null}

      {complexEntries.length > 0 ? (
        <div className="space-y-6">
          {complexEntries.map(([key, value]) => (
            <CodeBlock
              key={`${section.key}-${key}`}
              label={formatLabel(key)}
              value={formatJson(value)}
            />
          ))}
        </div>
      ) : (
        <CodeBlock label="Output" value={formatJson(section.data)} />
      )}
    </div>
  );
}

function DebugPipelineTab({ results }: { results: TimetableInspectionResponse }) {
  const sections = buildDebugSections(results.rawOcrOutput);

  if (sections.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          No structured debug pipeline data was returned for this extraction.
        </p>
        <p className="text-sm text-muted-foreground">
          Image and PDF responses may only expose the deterministic output and raw payload.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="gap-4 py-4">
        <CardHeader className="px-4">
          <CardTitle className="text-base">Pipeline Debugging</CardTitle>
          <CardDescription>
            Inspect table selection plus passes 1 through 6 to see exactly where extraction behavior changes.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4">
          <Tabs defaultValue={sections[0].key}>
            <TabsList className="h-auto w-full flex-wrap justify-start">
              {sections.map((section) => (
                <TabsTrigger key={section.key} value={section.key}>
                  {section.title}
                </TabsTrigger>
              ))}
            </TabsList>

            {sections.map((section) => (
              <TabsContent key={section.key} value={section.key} className="mt-4">
                <DebugSectionView section={section} />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function formatTimestamp(value: string | undefined): string {
  if (!value) {
    return "Unknown";
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return parsedDate.toLocaleString();
}

function formatDuration(value: number | undefined): string {
  if (typeof value !== "number") {
    return "Unknown";
  }

  if (value < 1000) {
    return `${value} ms`;
  }

  return `${(value / 1000).toFixed(1)} s`;
}

async function copyToClipboard(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success("Copied to clipboard");
  } catch {
    toast.error("Failed to copy");
  }
}

function CopyButton({ value }: { value: string }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => copyToClipboard(value)}
      className="h-7"
    >
      <IconCopy className="mr-1 h-3.5 w-3.5" />
      Copy
    </Button>
  );
}

function CodeBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <CopyButton value={value} />
      </div>
      <pre className="max-h-[32rem] overflow-auto rounded-lg bg-muted p-4 text-sm whitespace-pre-wrap">
        {value}
      </pre>
    </div>
  );
}

function EmptyState() {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <p className="text-muted-foreground">No timetable extraction has been run yet.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload a timetable file and click &quot;Run Extraction&quot;.
        </p>
      </CardContent>
    </Card>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <Card className="border-destructive">
      <CardContent className="py-8">
        <div className="flex items-center gap-3 text-destructive">
          <IconAlertTriangle className="h-5 w-5" />
          <div>
            <p className="font-medium">Extraction failed</p>
            <p className="mt-1 text-sm">{message}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
        {helper ? (
          <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function OverviewTab({ results }: { results: TimetableInspectionResponse }) {
  const metadata = results.metadata;
  const columnCount = results.ocrOutput?.columns?.length ?? 0;
  const rowCount = results.ocrOutput?.rows?.length ?? 0;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={results.success ? "secondary" : "destructive"}>
            {results.success ? "Success" : "Failed"}
          </Badge>
          {typeof metadata?.promptIdUsed === "number" ? (
            <Badge variant="outline">Prompt {metadata.promptIdUsed}</Badge>
          ) : null}
        </div>
        <p className="mt-2 text-sm">{results.message}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Activities"
          value={String(metadata?.totalActivities ?? results.activities.length)}
          helper="Total activity objects returned"
        />
        <StatCard
          label="Days Processed"
          value={String(metadata?.daysProcessed ?? rowCount)}
          helper="Distinct timetable day rows"
        />
        <StatCard
          label="OCR Strategy"
          value={metadata?.ocrStrategy || "Unknown"}
          helper="Backend extraction strategy"
        />
        <StatCard
          label="Processing Time"
          value={formatDuration(metadata?.processingTimeMs)}
          helper="Measured by the extraction service"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Extraction Metadata</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">File Name</span>
              <span className="text-right font-medium">{metadata?.fileName || "Unknown"}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Extracted At</span>
              <span className="text-right font-medium">
                {formatTimestamp(metadata?.extractionTimestamp)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Columns Returned</span>
              <span className="text-right font-medium">
                {columnCount}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Rows Returned</span>
              <span className="text-right font-medium">
                {rowCount}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Raw Response</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Use the raw payload to compare backend metadata, OCR output, and generated activities.
            </p>
            <div className="flex justify-start">
              <CopyButton value={formatJson(results.rawResponse)} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CellContent({ cell }: { cell: TimetableCell }) {
  if (!cell.title && !cell.rawText && !cell.note) {
    return null;
  }

  return (
    <div className="space-y-1">
      <p className="font-medium">{cell.title}</p>
      {cell.startTime || cell.endTime ? (
        <p className="text-xs text-muted-foreground">
          {cell.startTime} - {cell.endTime}
        </p>
      ) : null}
      {cell.note ? (
        <p className="text-xs text-muted-foreground whitespace-pre-wrap">{cell.note}</p>
      ) : cell.rawText && cell.rawText !== cell.title ? (
        <p className="text-xs text-muted-foreground whitespace-pre-wrap">
          Raw: {cell.rawText}
        </p>
      ) : null}
    </div>
  );
}

function DeterministicOutputTab({ results }: { results: TimetableInspectionResponse }) {
  const fileExtension = getFileExtension(results.metadata?.fileName);
  const isStructuredFile = fileExtension ? STRUCTURED_PIPELINE_EXTENSIONS.has(fileExtension) : false;
  const structuredActivities = isStructuredFile ? getStructuredPass6Activities(results.rawOcrOutput) : [];
  const structuredGrid = isStructuredFile ? buildGridFromActivities(structuredActivities) : null;
  const columns = structuredGrid?.columns ?? results.ocrOutput?.columns ?? [];
  const rows = structuredGrid?.rows ?? results.ocrOutput?.rows ?? [];
  const renderedCells = rows.reduce(
    (count, row) => count + row.cells.filter((cell) => cell.title || cell.rawText || cell.note).length,
    0
  );
  const isUsingStructuredPass6 = structuredGrid !== null;

  if (columns.length === 0 || rows.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          No deterministic output grid could be parsed for this extraction.
        </p>
        <p className="text-sm text-muted-foreground">
          Check the raw JSON tab for the original backend payload.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isUsingStructuredPass6 ? (
        <div className="rounded-lg border bg-muted/30 p-4">
          <p className="text-sm text-muted-foreground">
            Structured documents render deterministic output from `ocrOutput.pass6.activities`.
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Time Columns"
          value={String(columns.length)}
          helper={
            isUsingStructuredPass6
              ? "Derived time windows rebuilt from structured pass6 activities"
              : "Named timetable periods returned"
          }
        />
        <StatCard
          label="Day Rows"
          value={String(rows.length)}
          helper={
            isUsingStructuredPass6
              ? "Distinct day rows rebuilt from structured pass6 activities"
              : "Day labels found in the OCR grid"
          }
        />
        <StatCard
          label="Rendered Cells"
          value={String(renderedCells)}
          helper={
            isUsingStructuredPass6
              ? "Activities placed into the reconstructed timetable grid"
              : "Cells before any activity post-processing"
          }
        />
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table className="min-w-[1100px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-32">Day</TableHead>
              {columns.map((column) => (
                <TableHead key={column.columnKey}>
                  <div className="space-y-0.5">
                    <p className="font-medium">{column.columnKey}</p>
                    <p className="text-xs text-muted-foreground">
                      {column.startTime} - {column.endTime}
                    </p>
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.rowIndex}>
                <TableCell className="align-top font-medium">{row.rowLabel}</TableCell>
                {row.cells.map((cell, cellIndex) => (
                  <TableCell
                    key={`${row.rowIndex}-${cell.columnKey}-${cellIndex}`}
                    colSpan={cell.colSpan}
                    className="min-w-32 align-top whitespace-normal"
                  >
                    <CellContent cell={cell} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function ActivitiesTable({ activities }: { activities: TimetableActivity[] }) {
  if (activities.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No normalized activities were returned for this extraction.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {activities.length} activities returned by the extraction service.
        </p>
        <CopyButton value={formatJson(activities)} />
      </div>
      <div className="overflow-hidden rounded-lg border">
        <Table className="min-w-[900px]">
          <TableHeader>
            <TableRow>
              <TableHead>Day</TableHead>
              <TableHead>Start</TableHead>
              <TableHead>End</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activities.map((activity, index) => (
              <TableRow key={`${activity.day}-${activity.start_time}-${activity.title}-${index}`}>
                <TableCell>{activity.day}</TableCell>
                <TableCell>{activity.start_time}</TableCell>
                <TableCell>{activity.end_time}</TableCell>
                <TableCell className="font-medium">{activity.title}</TableCell>
                <TableCell className="max-w-xl whitespace-normal text-sm text-muted-foreground">
                  {activity.notes}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function ResultsPanel({ results, error }: ResultsPanelProps) {
  if (error) {
    return <ErrorState message={error} />;
  }

  if (!results) {
    return <EmptyState />;
  }

  const debugSections = buildDebugSections(results.rawOcrOutput);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Results</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview">
          <TabsList className="h-auto w-full flex-wrap justify-start">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            {debugSections.length > 0 ? (
              <TabsTrigger value="debug_pipeline">Structured Pipeline</TabsTrigger>
            ) : null}
            <TabsTrigger value="ocr_output">Grid View</TabsTrigger>
            <TabsTrigger value="activities">Activities</TabsTrigger>
            <TabsTrigger value="raw_json">Raw JSON</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <OverviewTab results={results} />
          </TabsContent>

          {debugSections.length > 0 ? (
            <TabsContent value="debug_pipeline" className="mt-4">
              <DebugPipelineTab results={results} />
            </TabsContent>
          ) : null}

          <TabsContent value="ocr_output" className="mt-4">
            <DeterministicOutputTab results={results} />
          </TabsContent>

          <TabsContent value="activities" className="mt-4">
            <ActivitiesTable activities={results.activities} />
          </TabsContent>

          <TabsContent value="raw_json" className="mt-4">
            <CodeBlock label="Backend Response" value={formatJson(results.rawResponse)} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
