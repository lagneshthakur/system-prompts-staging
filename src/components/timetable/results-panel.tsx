"use client";

import { IconAlertTriangle, IconCopy } from "@tabler/icons-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatJson, type TimetableActivity, type TimetableCell, type TimetableInspectionResponse } from "@/lib/timetable-api";

interface ResultsPanelProps {
  results: TimetableInspectionResponse | null;
  error: string | null;
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
  return (
    <div className="space-y-1">
      <p className="font-medium">{cell.title}</p>
      <p className="text-xs text-muted-foreground">
        {cell.startTime} - {cell.endTime}
      </p>
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

function OcrGridTab({ results }: { results: TimetableInspectionResponse }) {
  const columns = results.ocrOutput?.columns ?? [];
  const rows = results.ocrOutput?.rows ?? [];

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
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Time Columns"
          value={String(columns.length)}
          helper="Named timetable periods returned"
        />
        <StatCard
          label="Day Rows"
          value={String(rows.length)}
          helper="Day labels found in the OCR grid"
        />
        <StatCard
          label="Rendered Cells"
          value={String(rows.reduce((count, row) => count + row.cells.length, 0))}
          helper="Cells before any activity post-processing"
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
                    rowSpan={cell.rowSpan}
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Results</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview">
          <TabsList className="h-auto w-full flex-wrap justify-start">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="ocr_output">Deterministic Output</TabsTrigger>
            <TabsTrigger value="activities">Activities</TabsTrigger>
            <TabsTrigger value="raw_json">Raw JSON</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <OverviewTab results={results} />
          </TabsContent>

          <TabsContent value="ocr_output" className="mt-4">
            <OcrGridTab results={results} />
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
