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
  /**
   * Pipeline logic:
   * - Classification is the first step, always required if any step is checked
   * - Year Filtering requires Classification
   * - Extraction requires both Classification and Year Filtering
   *
   * When checking a step, auto-check all previous steps.
   * When unchecking a step, auto-uncheck all subsequent steps.
   */
  function handleOptionChange(key: keyof InspectionOptions, checked: boolean) {
    const newOptions = { ...options };

    if (checked) {
      // When checking, also check all previous steps
      if (key === 'showClassification') {
        newOptions.showClassification = true;
      } else if (key === 'showYearFiltering') {
        newOptions.showClassification = true;
        newOptions.showYearFiltering = true;
      } else if (key === 'showExtraction') {
        newOptions.showClassification = true;
        newOptions.showYearFiltering = true;
        newOptions.showExtraction = true;
      }
    } else {
      // When unchecking, also uncheck all subsequent steps
      if (key === 'showClassification') {
        newOptions.showClassification = false;
        newOptions.showYearFiltering = false;
        newOptions.showExtraction = false;
      } else if (key === 'showYearFiltering') {
        newOptions.showYearFiltering = false;
        newOptions.showExtraction = false;
      } else if (key === 'showExtraction') {
        newOptions.showExtraction = false;
      }
    }

    // Ensure at least one option stays checked
    if (!newOptions.showClassification && !newOptions.showYearFiltering && !newOptions.showExtraction) {
      return;
    }

    onOptionsChange(newOptions);
  }

  // Classification can't be unchecked if it's the only one checked
  const isClassificationLocked = options.showClassification && !options.showYearFiltering && !options.showExtraction;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inspection Options</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {INSPECTION_OPTIONS.map((option) => {
          // Determine if this checkbox should be disabled
          let isDisabled = disabled;
          if (option.key === 'showClassification' && isClassificationLocked) {
            isDisabled = true;
          }

          return (
          <div key={option.key} className="flex items-start space-x-3">
            <Checkbox
              id={option.key}
              checked={options[option.key]}
              onCheckedChange={(checked) =>
                handleOptionChange(option.key, checked === true)
              }
              disabled={isDisabled}
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
          );
        })}
      </CardContent>
    </Card>
  );
}
