"use client"

import * as React from "react"
import Link from "next/link";
import {
  IconBrain,
  IconDashboard,
  IconSettings,
  IconScan,
  IconShieldCheck,
  IconSearch,
  IconFileText,
  IconEye,
  IconRepeat,
  IconCategory,
  IconFileSearch,
} from "@tabler/icons-react"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/",
      icon: IconDashboard,
    },
    {
      title: "System Prompts",
      url: "/prompts",
      icon: IconBrain,
      items: [
        {
          title: "Timetable Extraction",
          url: "/prompts/1001",
          icon: IconScan,
        },
        {
          title: "Timetable Validation",
          url: "/prompts/1002",
          icon: IconShieldCheck,
        },
        {
          title: "Timetable Lookup",
          url: "/prompts/1003",
          icon: IconSearch,
        },
        {
          title: "Curriculum Extraction",
          url: "/prompts/1004",
          icon: IconFileText,
        },
        {
          title: "LLM Visual OCR",
          url: "/prompts/1005",
          icon: IconEye,
        },
        {
          title: "Timetable Event Detection",
          url: "/prompts/1006",
          icon: IconRepeat,
        },
        {
          title: "Document Type Classification",
          url: "/prompts/1007",
          icon: IconCategory,
        },
      ],
    },
    {
      title: "Curriculum Extraction",
      url: "/curriculum",
      icon: IconFileSearch,
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "/settings",
      icon: IconSettings,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link href="/">
                <IconBrain className="!size-5" />
                <span className="text-base font-semibold">BrainMo Backdoor</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
    </Sidebar>
  )
}
