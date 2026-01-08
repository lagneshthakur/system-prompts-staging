"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
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
  const [yearGroup, setYearGroup] = useState<string>("Year 1");
  const [options, setOptions] = useState<InspectionOptions>({
    showClassification: true,
    showYearFiltering: true,
    showExtraction: false,
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
      <SiteHeader title="Curriculum Extraction Inspector" subtitle="Internal QA / Debug Tool" />

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
            error={error}
          />
        </div>
      </div>
    </div>
  );
}
