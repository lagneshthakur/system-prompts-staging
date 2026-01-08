import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

interface SiteHeaderProps {
  title: string;
  subtitle?: string;
}

export function SiteHeader({ title, subtitle }: SiteHeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mx-2 h-4" />
        <div>
          <h1 className="text-base font-medium">{title}</h1>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
    </header>
  )
}
