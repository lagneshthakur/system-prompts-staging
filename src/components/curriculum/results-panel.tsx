"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { IconCopy, IconAlertTriangle } from "@tabler/icons-react";
import type { InspectionResponse, InspectionOptions } from "@/lib/curriculum-api";

interface ResultsPanelProps {
  results: InspectionResponse | null;
  options: InspectionOptions;
  yearGroup: string;
  error: string | null;
}

function CodeBlock({ children, label }: { children: string; label: string }) {
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
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7">
          <IconCopy className="h-3.5 w-3.5 mr-1" />
          Copy
        </Button>
      </div>
      <pre className="bg-muted p-4 rounded-lg overflow-auto text-sm font-mono whitespace-pre-wrap max-h-80">
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

export function ResultsPanel({ results, options, yearGroup, error }: ResultsPanelProps) {
  if (error) {
    return <ErrorState message={error} />;
  }

  if (!results) {
    return <EmptyState />;
  }

  // Determine which tabs to show based on options and available results
  const tabs: { value: string; label: string; available: boolean }[] = [
    {
      value: 'classification',
      label: 'Classification',
      available: options.showClassification && !!results.classification,
    },
    {
      value: 'yearFiltering',
      label: 'Year Filtering',
      available: options.showYearFiltering && !!results.yearFiltering,
    },
    {
      value: 'extraction',
      label: 'Extraction',
      available: options.showExtraction && !!results.extraction,
    },
  ];

  const availableTabs = tabs.filter(t => t.available);
  const defaultTab = availableTabs[0]?.value || 'classification';

  if (availableTabs.length === 0) {
    return <EmptyState />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Results</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={defaultTab}>
          <TabsList>
            {availableTabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {results.classification && (
            <TabsContent value="classification" className="space-y-6 mt-4">
              <div>
                <h3 className="text-lg font-semibold mb-4">Document Classification</h3>
                <div className="space-y-6">
                  <CodeBlock label="Input to Classifier">
                    {results.classification.input}
                  </CodeBlock>
                  <CodeBlock label="Output">
                    {JSON.stringify(results.classification.output, null, 2)}
                  </CodeBlock>
                </div>
              </div>
            </TabsContent>
          )}

          {results.yearFiltering && (
            <TabsContent value="yearFiltering" className="space-y-6 mt-4">
              <div>
                <h3 className="text-lg font-semibold mb-4">Year Filtering</h3>
                <div className="space-y-6">
                  <CodeBlock label="Input Chunks">
                    {results.yearFiltering.inputChunks.join('\n\n')}
                  </CodeBlock>
                  <CodeBlock label={`Filtered Output (${yearGroup})`}>
                    {results.yearFiltering.filteredOutput}
                  </CodeBlock>
                </div>
              </div>
            </TabsContent>
          )}

          {results.extraction && (
            <TabsContent value="extraction" className="space-y-6 mt-4">
              <div>
                <h3 className="text-lg font-semibold mb-4">Curriculum Extraction</h3>
                <div className="space-y-6">
                  <CodeBlock label="Prompt Sent to LLM">
                    {results.extraction.prompt}
                  </CodeBlock>
                  <CodeBlock label="Raw Extraction Output">
                    {JSON.stringify(results.extraction.output, null, 2)}
                  </CodeBlock>
                </div>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}
