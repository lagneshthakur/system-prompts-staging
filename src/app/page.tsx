"use client";

import Link from "next/link";
import { IconBrain, IconFileSearch, IconArrowRight } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SiteHeader } from "@/components/site-header";

const features = [
  {
    title: "System Prompts",
    description: "Manage and edit AI system prompts for timetable extraction, curriculum processing, and more.",
    icon: IconBrain,
    href: "/prompts",
  },
  {
    title: "Curriculum Extraction",
    description: "Inspect and debug the curriculum extraction pipeline with document upload and analysis.",
    icon: IconFileSearch,
    href: "/curriculum",
  },
];

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader title="BrainMo Admin" subtitle="Internal Tools" />
      <div className="flex-1 p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-2 py-8">
            <h1 className="text-4xl font-bold tracking-tight">Welcome</h1>
            <p className="text-muted-foreground text-lg">
              Internal admin tools for managing BrainMo AI services
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {features.map((feature) => (
              <Card key={feature.href} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <feature.icon className="h-6 w-6" />
                    <CardTitle>{feature.title}</CardTitle>
                  </div>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild className="w-full">
                    <Link href={feature.href}>
                      Open
                      <IconArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
