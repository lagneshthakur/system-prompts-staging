"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { IconCopy, IconAlertTriangle } from "@tabler/icons-react";
import {
  type InspectionResponse,
  type LLMCall,
  InspectionStep,
  INSPECTION_STEP_LABELS,
  formatOutput,
  isJsonOutput,
} from "@/lib/curriculum-api";

interface ResultsPanelProps {
  results: InspectionResponse | null;
  error: string | null;
}

function CodeBlock({ children, label, isJson = false }: { children: string; label: string; isJson?: boolean }) {
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(children);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">{label}</span>
          {isJson && <Badge variant="outline" className="text-xs">JSON</Badge>}
        </div>
        <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7">
          <IconCopy className="h-3.5 w-3.5 mr-1" />
          Copy
        </Button>
      </div>
      <pre className="bg-muted p-4 rounded-lg overflow-auto text-sm font-mono whitespace-pre-wrap max-h-96">
        {children}
      </pre>
    </div>
  );
}

function EmptyState() {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <p className="text-muted-foreground">No inspection has been run yet.</p>
        <p className="text-sm text-muted-foreground mt-1">
          Upload a document and click &quot;Run Inspection&quot;.
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
            <p className="font-medium">Processing failed</p>
            <p className="text-sm mt-1">{message}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Remove term_metadata key from each root object in the processed data
 */
function cleanProcessedData(data: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { term_metadata, ...rest } = value as Record<string, unknown>;
      cleaned[key] = rest;
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

function LLMCallPanel({ call }: { call: LLMCall }) {
  const formattedOutput = formatOutput(call.output);
  const outputIsJson = isJsonOutput(call.output);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold">{INSPECTION_STEP_LABELS[call.step]}</h3>
        <Badge variant="secondary" className="text-xs">{call.model}</Badge>
      </div>

      {call.input !== null ? (
        <CodeBlock label="Input">
          {call.input}
        </CodeBlock>
      ) : (
        <div className="space-y-2">
          <span className="text-sm font-medium text-muted-foreground">Input</span>
          <p className="text-sm text-muted-foreground italic">No input (internal processing)</p>
        </div>
      )}

      <CodeBlock label="Output" isJson={outputIsJson}>
        {formattedOutput}
      </CodeBlock>
    </div>
  );
}

export function ResultsPanel({ results, error }: ResultsPanelProps) {
  if (error) {
    return <ErrorState message={error} />;
  }

  if (!results || results.llmCalls.length === 0) {
    return <EmptyState />;
  }

  const { llmCalls, processedData } = results;
  const defaultTab = llmCalls[0]?.step || InspectionStep.CLASSIFICATION;

  // Find LO extraction call - Processed LOs tab only shows when extraction is included
  const loExtractionCall = llmCalls.find(call => call.step === InspectionStep.LO_EXTRACTION);
  const loExtractionOutput = loExtractionCall ? formatOutput(loExtractionCall.output) : null;
  const showProcessedLOs = processedData && loExtractionCall;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Results</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={defaultTab}>
          <TabsList>
            {llmCalls.map((call) => (
              <TabsTrigger key={call.step} value={call.step}>
                {INSPECTION_STEP_LABELS[call.step]}
              </TabsTrigger>
            ))}
            {showProcessedLOs && (
              <TabsTrigger value="processed_los">
                Processed LOs
              </TabsTrigger>
            )}
          </TabsList>

          {llmCalls.map((call) => (
            <TabsContent key={call.step} value={call.step} className="mt-4">
              <LLMCallPanel call={call} />
            </TabsContent>
          ))}

          {showProcessedLOs && (
            <TabsContent value="processed_los" className="mt-4">
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Processed LOs</h3>

                <CodeBlock label="Input (LO Extraction Output)" isJson>
                  {loExtractionOutput!}
                </CodeBlock>

                <CodeBlock label="Output (Processed Data)" isJson>
                  {JSON.stringify(cleanProcessedData(processedData), null, 2)}
                </CodeBlock>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}
