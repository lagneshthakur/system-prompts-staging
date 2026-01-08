"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { InspectionOptions } from "@/lib/curriculum-api";

interface InspectionOptionsPanelProps {
  options: InspectionOptions;
  onOptionsChange: (options: InspectionOptions) => void;
  disabled?: boolean;
}

const INSPECTION_OPTIONS = [
  {
    key: 'showClassification' as const,
    title: 'Document Classification',
    description: 'Show input text sent for classification and classification output with confidence score',
  },
  {
    key: 'showYearFiltering' as const,
    title: 'Year Filtering',
    description: 'Show chunks before filtering and content after filtering for selected year',
  },
  {
    key: 'showExtraction' as const,
    title: 'Extraction',
    description: 'Show prompt sent to LLM and raw extraction output',
  },
];

export function InspectionOptionsPanel({
  options,
  onOptionsChange,
  disabled = false,
}: InspectionOptionsPanelProps) {
  function handleOptionChange(key: keyof InspectionOptions, checked: boolean) {
    onOptionsChange({
      ...options,
      [key]: checked,
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inspection Options</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {INSPECTION_OPTIONS.map((option) => (
          <div key={option.key} className="flex items-start space-x-3">
            <Checkbox
              id={option.key}
              checked={options[option.key]}
              onCheckedChange={(checked) =>
                handleOptionChange(option.key, checked === true)
              }
              disabled={disabled}
              className="mt-0.5"
            />
            <div className="space-y-1">
              <Label
                htmlFor={option.key}
                className="text-sm font-medium leading-none cursor-pointer"
              >
                {option.title}
              </Label>
              <p className="text-xs text-muted-foreground">
                {option.description}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
