"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUiStore, type EditorTab } from "@/lib/ui-store";
import { BasicsSection } from "./sections/BasicsSection";
import { CertificatesSection } from "./sections/CertificatesSection";
import { CustomSectionsEditor } from "./sections/CustomSectionsEditor";
import { EducationSection } from "./sections/EducationSection";
import { ProjectsSection } from "./sections/ProjectsSection";
import { SkillsSection } from "./sections/SkillsSection";
import { WorkSection } from "./sections/WorkSection";

const TABS = [
  { value: "basics", label: "Basics", Component: BasicsSection },
  { value: "work", label: "Experience", Component: WorkSection },
  { value: "education", label: "Education", Component: EducationSection },
  { value: "skills", label: "Skills", Component: SkillsSection },
  { value: "projects", label: "Projects", Component: ProjectsSection },
  { value: "certificates", label: "Certs", Component: CertificatesSection },
  { value: "custom", label: "Custom", Component: CustomSectionsEditor },
] as const;

export function Editor() {
  const tab = useUiStore((s) => s.editorTab);
  const setTab = useUiStore((s) => s.setEditorTab);
  return (
    <Tabs
      value={tab}
      onValueChange={(v) => setTab(v as EditorTab)}
      className="flex h-full flex-col"
    >
      <TabsList className="grid h-auto w-full grid-cols-4 gap-1 sm:grid-cols-7">
        {TABS.map((t) => (
          <TabsTrigger key={t.value} value={t.value} className="text-xs">
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <div className="scrollbar-thin mt-4 flex-1 overflow-y-auto pr-1">
        {TABS.map(({ value, Component }) => (
          <TabsContent key={value} value={value} className="mt-0">
            <Component />
          </TabsContent>
        ))}
      </div>
    </Tabs>
  );
}
