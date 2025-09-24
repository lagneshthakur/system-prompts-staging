"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { IconArrowLeft, IconLoader2, IconDeviceFloppy, IconAlertCircle } from "@tabler/icons-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { SiteHeader } from "@/components/site-header";
import { apiClient, SYSTEM_PROMPT_NAMES, SystemPrompt } from "@/lib/api";

export default function PromptEditor() {
  const params = useParams();
  const router = useRouter();
  const promptId = parseInt(params.id as string);
  
  const [prompt, setPrompt] = useState<SystemPrompt | null>(null);
  const [content, setContent] = useState("");
  const [originalContent, setOriginalContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const promptName = SYSTEM_PROMPT_NAMES[promptId as keyof typeof SYSTEM_PROMPT_NAMES];
  const hasChanges = content !== originalContent;

  useEffect(() => {
    const fetchPrompt = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await apiClient.getPrompt(promptId);
        
        if (response.error) {
          setError(response.error);
        } else if (response.data) {
          setPrompt(response.data);
          setContent(response.data.content);
          setOriginalContent(response.data.content);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch prompt');
      } finally {
        setLoading(false);
      }
    };

    if (promptId && promptName) {
      fetchPrompt();
    } else {
      setError('Invalid prompt ID');
      setLoading(false);
    }
  }, [promptId, promptName]);

  const handleSave = async () => {
    if (!hasChanges) {
      toast.info("No changes to save");
      return;
    }

    try {
      setSaving(true);
      
      const response = await apiClient.updatePrompt(promptId, content);
      
      if (response.error) {
        toast.error(`Failed to save: ${response.error}`);
      } else if (response.data) {
        setPrompt(response.data);
        setOriginalContent(content);
        toast.success("Prompt saved successfully!");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save prompt');
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (hasChanges) {
      const confirmed = window.confirm(
        "You have unsaved changes. Are you sure you want to leave?"
      );
      if (!confirmed) return;
    }
    router.push("/");
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <SiteHeader />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <IconLoader2 className="h-6 w-6 animate-spin" />
            <span>Loading prompt...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !promptName) {
    return (
      <div className="flex flex-col min-h-screen">
        <SiteHeader />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <IconAlertCircle className="h-12 w-12 text-red-500 mx-auto" />
            <h2 className="text-xl font-semibold">Error</h2>
            <p className="text-muted-foreground">{error || 'Prompt not found'}</p>
            <Button onClick={handleBack}>
              <IconArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={handleBack}>
              <IconArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-2xl font-bold tracking-tight">{promptName}</h2>
                <Badge variant="secondary">ID: {promptId}</Badge>
              </div>
              <p className="text-muted-foreground">
                Edit system prompt content - preserve exact formatting
              </p>
            </div>
          </div>
          <Button 
            onClick={handleSave} 
            disabled={!hasChanges || saving}
            className="min-w-[100px]"
          >
            {saving ? (
              <>
                <IconLoader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <IconDeviceFloppy className="h-4 w-4 mr-2" />
                Save
              </>
            )}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Prompt Content</CardTitle>
            <CardDescription>
              Edit the system prompt content. Formatting (newlines, spaces, special characters) will be preserved exactly as typed.
              {hasChanges && (
                <span className="text-orange-600 font-medium ml-2">• Unsaved changes</span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter prompt content..."
                className="min-h-[500px] font-mono text-sm"
                style={{ 
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace'
                }}
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Characters: {content.length}</span>
                <span>Lines: {content.split('\n').length}</span>
                {prompt?.updated_at && (
                  <span>Last saved: {new Date(prompt.updated_at).toLocaleString()}</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
