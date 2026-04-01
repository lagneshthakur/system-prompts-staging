"use client";

import { useRef } from "react";
import { IconUpload } from "@tabler/icons-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ACCEPTED_EXTENSIONS } from "@/lib/timetable-api";

interface InputPanelProps {
  file: File | null;
  teacherId: string;
  termId: string;
  onFileChange: (file: File | null) => void;
  onTeacherIdChange: (teacherId: string) => void;
  onTermIdChange: (termId: string) => void;
  disabled?: boolean;
}

export function InputPanel({
  file,
  teacherId,
  termId,
  onFileChange,
  onTeacherIdChange,
  onTermIdChange,
  disabled = false,
}: InputPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0] || null;
    onFileChange(selectedFile);
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (disabled) {
      return;
    }

    const droppedFile = event.dataTransfer.files?.[0] || null;
    onFileChange(droppedFile);
  }

  function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Input</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="timetable-file">Upload Timetable File</Label>
          <div
            onClick={() => !disabled && fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className={[
              "cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors",
              disabled ? "cursor-not-allowed opacity-50" : "hover:border-primary hover:bg-muted/50",
              file ? "border-primary bg-muted/30" : "border-muted-foreground/25",
            ].join(" ")}
          >
            <IconUpload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            {file ? (
              <div>
                <p className="text-sm font-medium">{file.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
            ) : (
              <div>
                <p className="text-sm text-muted-foreground">
                  Click to upload or drag and drop
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  PDF, images, Word, PowerPoint, Excel
                </p>
              </div>
            )}
          </div>
          <Input
            ref={fileInputRef}
            id="timetable-file"
            type="file"
            accept={ACCEPTED_EXTENSIONS}
            onChange={handleFileChange}
            disabled={disabled}
            className="hidden"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="teacher-id">Teacher ID</Label>
          <Input
            id="teacher-id"
            value={teacherId}
            onChange={(event) => onTeacherIdChange(event.target.value)}
            placeholder="2a51d6b3-b66b-4ccd-9a63-cd25b01778d7"
            disabled={disabled}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="term-id">Term ID</Label>
          <Input
            id="term-id"
            value={termId}
            onChange={(event) => onTermIdChange(event.target.value)}
            placeholder="36c76e6b-64b5-48b3-855a-b1a8c5a0ac44"
            disabled={disabled}
          />
        </div>
      </CardContent>
    </Card>
  );
}
