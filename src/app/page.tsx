"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { IconBrain, IconEdit, IconLoader2 } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SiteHeader } from "@/components/site-header";
import { apiClient, SYSTEM_PROMPT_IDS, SYSTEM_PROMPT_NAMES, SystemPrompt } from "@/lib/api";

export default function Home() {
  const [prompts, setPrompts] = useState<SystemPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPrompts = async () => {
      try {
        setLoading(true);
        const response = await apiClient.getAllPrompts();
        
        if (response.error) {
          setError(response.error);
        } else if (response.data) {
          setPrompts(response.data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch prompts');
      } finally {
        setLoading(false);
      }
    };

    fetchPrompts();
  }, []);

  // TODO: add 1005 and 1006 descriptions
  const getPromptDescription = (id: number) => {
    switch (id) {
      case SYSTEM_PROMPT_IDS.TIMETABLE_EXTRACTION:
        return "Extracts timetable data from images and OCR text into structured JSON format";
      case SYSTEM_PROMPT_IDS.TIMETABLE_VALIDATION:
        return "Validates and corrects extracted timetable entries for accuracy";
      case SYSTEM_PROMPT_IDS.TIMETABLE_LOOKUP:
        return "Matches timetable entries with existing activities and subjects";
      case SYSTEM_PROMPT_IDS.CURRICULUM_EXTRACTION:
        return "Extracts curriculum data from PDF documents using AI processing";
      case SYSTEM_PROMPT_IDS.YEAR_FILTER:
        return "Filters and extracts year-level data from documents";
      case SYSTEM_PROMPT_IDS.CURRICULUM_EXTRACTION_MULTIPLE_YEAR:
        return "Extracts curriculum data spanning multiple academic years";
      case SYSTEM_PROMPT_IDS.CURRICULUM_EXTRACTION_YEARLY:
        return "Extracts curriculum data for a single academic year";
      case SYSTEM_PROMPT_IDS.CURRICULUM_EXTRACTION_FULL_TERM:
        return "Extracts curriculum data for a full term period";
      case SYSTEM_PROMPT_IDS.CURRICULUM_EXTRACTION_HALF_TERM:
        return "Extracts curriculum data for a half term period";
      case SYSTEM_PROMPT_IDS.CURRICULUM_EXTRACTION_LESSON_WEEK:
        return "Extracts curriculum data at lesson or weekly level";
      case SYSTEM_PROMPT_IDS.CURRICULUM_EXTRACTION_OTHER:
        return "Extracts curriculum data from other document formats";
      default:
        return "System prompt for AI processing";
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">System Prompts Dashboard</h2>
            <p className="text-muted-foreground">
              Manage and edit AI system prompts for the Teachers App services
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <IconLoader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading prompts...</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <p className="text-red-500 mb-4">Error: {error}</p>
              <Button onClick={() => window.location.reload()}>
                Retry
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
            {Object.entries(SYSTEM_PROMPT_IDS).map(([key, id]) => {
              const prompt = prompts.find(p => p.id === id);
              const name = SYSTEM_PROMPT_NAMES[id];
              const description = getPromptDescription(id);
              
              return (
                <Card key={id} className="relative">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <IconBrain className="h-5 w-5" />
                        <CardTitle className="text-lg">{name}</CardTitle>
                      </div>
                      <Badge variant="secondary">ID: {id}</Badge>
                    </div>
                    <CardDescription>{description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="text-sm text-muted-foreground">
                        <p>Content Length: {prompt?.content?.length || 0} characters</p>
                        <p>Last Updated: {prompt?.updated_at ? new Date(prompt.updated_at).toLocaleDateString() : 'Never'}</p>
                      </div>
                      <div className="flex justify-end">
                        <Button asChild>
                          <Link href={`/prompts/${id}`}>
                            <IconEdit className="h-4 w-4 mr-2" />
                            Edit Prompt
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
