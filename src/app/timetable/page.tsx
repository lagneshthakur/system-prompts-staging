"use client";

import { useState } from "react";
import { IconLoader2, IconPlayerPlay } from "@tabler/icons-react";
import { toast } from "sonner";

import { InputPanel } from "@/components/timetable/input-panel";
import { RequestDetailsPanel } from "@/components/timetable/request-details";
import { ResultsPanel } from "@/components/timetable/results-panel";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import {
  getFileType,
  runTimetableInspection,
  type TimetableInspectionResponse,
} from "@/lib/timetable-api";

export default function TimetablePage() {
  const [file, setFile] = useState<File | null>(null);
  const [teacherId, setTeacherId] = useState("");
  const [termId, setTermId] = useState("");
  const [results, setResults] = useState<TimetableInspectionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileType = getFileType(file);
  const canRun = Boolean(file && fileType && teacherId.trim() && termId.trim());

  async function handleRunExtraction() {
    if (!file) {
      toast.error("Please upload a timetable file");
      return;
    }

    if (!teacherId.trim() || !termId.trim()) {
      toast.error("Please enter both teacher ID and term ID");
      return;
    }

    if (!fileType) {
      toast.error("Unsupported file type");
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);

    const response = await runTimetableInspection(file, teacherId, termId);

    if (response.error) {
      setError(response.error.message);
      toast.error("Timetable extraction failed");
    } else if (response.data) {
      setResults(response.data);
      toast.success("Timetable extraction completed");
    }

    setLoading(false);
  }

  return (
    <div className="flex h-full flex-col">
      <SiteHeader title="Timetable Extraction Inspector" subtitle="Internal QA / Debug Tool" />

      <div className="flex-1 overflow-auto p-4 lg:p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="grid gap-6 xl:grid-cols-2">
            <InputPanel
              file={file}
              teacherId={teacherId}
              termId={termId}
              onFileChange={setFile}
              onTeacherIdChange={setTeacherId}
              onTermIdChange={setTermId}
              disabled={loading}
            />
            <RequestDetailsPanel fileType={fileType} />
          </div>

          <div className="flex justify-end">
            <Button onClick={handleRunExtraction} disabled={!canRun || loading} size="lg">
              {loading ? (
                <>
                  <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <IconPlayerPlay className="mr-2 h-4 w-4" />
                  Run Extraction
                </>
              )}
            </Button>
          </div>

          <ResultsPanel results={results} error={error} />
        </div>
      </div>
    </div>
  );
}
