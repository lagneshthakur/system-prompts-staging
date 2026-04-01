"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TIMETABLE_REQUEST_QUERY } from "@/lib/timetable-api";

const QUERY_PARAMETERS = [
  {
    label: "schema",
    value: TIMETABLE_REQUEST_QUERY.schema,
    description: "Request structured schema output.",
  },
  {
    label: "with_file_ref",
    value: TIMETABLE_REQUEST_QUERY.with_file_ref,
    description: "Include file reference metadata when available.",
  },
  {
    label: "waitForCompletion",
    value: TIMETABLE_REQUEST_QUERY.waitForCompletion,
    description: "Wait for the async extraction job to finish before returning.",
  },
] as const;

interface RequestDetailsPanelProps {
  fileType: string | null;
}

export function RequestDetailsPanel({ fileType }: RequestDetailsPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Request Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <p className="text-sm font-medium">Endpoint</p>
          <code className="block rounded-md bg-muted px-3 py-2 text-xs break-all">
            api/v1/ai-timetable/extract-simple-textract-async
          </code>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">Derived file_type</p>
            <Badge variant={fileType ? "secondary" : "outline"}>
              {fileType || "Awaiting file"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            The uploaded file extension is passed through to the `file_type` query parameter.
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium">Query Parameters</p>
          <div className="space-y-2">
            {QUERY_PARAMETERS.map((parameter) => (
              <div key={parameter.label} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">{parameter.label}</span>
                  <Badge variant="outline">{parameter.value}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {parameter.description}
                </p>
              </div>
            ))}
          </div>
        </div>

      </CardContent>
    </Card>
  );
}
