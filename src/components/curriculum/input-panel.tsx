"use client";

import { useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { YEAR_GROUPS, ACCEPTED_EXTENSIONS } from "@/lib/curriculum-api";
import { IconUpload } from "@tabler/icons-react";

interface InputPanelProps {
  file: File | null;
  yearGroup: string;
  onFileChange: (file: File | null) => void;
  onYearGroupChange: (yearGroup: string) => void;
  disabled?: boolean;
}

export function InputPanel({
  file,
  yearGroup,
  onFileChange,
  onYearGroupChange,
  disabled = false,
}: InputPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0] || null;
    onFileChange(selectedFile);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (disabled) return;
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      onFileChange(droppedFile);
    }
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Input</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="file">Upload Curriculum Document</Label>
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => !disabled && fileInputRef.current?.click()}
            className={`
              border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
              transition-colors
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary hover:bg-muted/50'}
              ${file ? 'border-primary bg-muted/30' : 'border-muted-foreground/25'}
            `}
          >
            <IconUpload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            {file ? (
              <div>
                <p className="font-medium text-sm">{file.name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
            ) : (
              <div>
                <p className="text-sm text-muted-foreground">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF, DOCX, PPT, XLS
                </p>
              </div>
            )}
          </div>
          <Input
            ref={fileInputRef}
            id="file"
            type="file"
            accept={ACCEPTED_EXTENSIONS}
            onChange={handleFileChange}
            disabled={disabled}
            className="hidden"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="year-group">Select Year Group</Label>
          <Select
            value={yearGroup}
            onValueChange={onYearGroupChange}
            disabled={disabled}
          >
            <SelectTrigger id="year-group">
              <SelectValue placeholder="Select a year group" />
            </SelectTrigger>
            <SelectContent>
              {YEAR_GROUPS.map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
