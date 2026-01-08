"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { InputPanel } from "@/components/curriculum/input-panel";
import { InspectionOptionsPanel } from "@/components/curriculum/inspection-options";
import { ResultsPanel } from "@/components/curriculum/results-panel";
import {
  runInspection,
  type InspectionOptions,
  type InspectionResponse,
} from "@/lib/curriculum-api";
import { IconPlayerPlay, IconLoader2 } from "@tabler/icons-react";
import { toast } from "sonner";

export default function CurriculumPage() {
  const [file, setFile] = useState<File | null>(null);
  const [yearGroup, setYearGroup] = useState<string>("");
  const [options, setOptions] = useState<InspectionOptions>({
    showClassification: true,
    showYearFiltering: true,
    showExtraction: true,
  });
  const [results, setResults] = useState<InspectionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canRun = file && yearGroup && (options.showClassification || options.showYearFiltering || options.showExtraction);

  async function handleRunInspection() {
    if (!file || !yearGroup) {
      toast.error("Please select a file and year group");
      return;
    }

    if (!options.showClassification && !options.showYearFiltering && !options.showExtraction) {
      toast.error("Please select at least one inspection option");
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);

    const response = await runInspection(file, yearGroup, options);

    if (response.error) {
      setError(response.error.message);
      toast.error("Inspection failed");
    } else if (response.data) {
      setResults(response.data);
      toast.success("Inspection completed");
    }

    setLoading(false);
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b">
        <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mx-2 h-4" />
          <div>
            <h1 className="text-base font-medium">Curriculum Extraction Inspector</h1>
            <p className="text-xs text-muted-foreground">Internal QA / Debug Tool</p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-4 lg:p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Input Section */}
          <div className="grid gap-6 md:grid-cols-2">
            <InputPanel
              file={file}
              yearGroup={yearGroup}
              onFileChange={setFile}
              onYearGroupChange={setYearGroup}
              disabled={loading}
            />
            <InspectionOptionsPanel
              options={options}
              onOptionsChange={setOptions}
              disabled={loading}
            />
          </div>

          {/* Action Bar */}
          <div className="flex justify-end">
            <Button
              onClick={handleRunInspection}
              disabled={!canRun || loading}
              size="lg"
            >
              {loading ? (
                <>
                  <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <IconPlayerPlay className="mr-2 h-4 w-4" />
                  Run Inspection
                </>
              )}
            </Button>
          </div>

          {/* Results Section */}
          <ResultsPanel
            results={results}
            options={options}
            yearGroup={yearGroup}
            error={error}
          />
        </div>
      </div>
    </div>
  );
}
