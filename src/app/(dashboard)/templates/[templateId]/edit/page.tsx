import { Suspense } from "react";
import { TemplateEditor } from "@/features/template/components/template-editor";

export const instant = false;

interface EditTemplatePageProps {
  params: Promise<{
    templateId: string;
  }>;
}

export default async function EditTemplatePage({ params }: EditTemplatePageProps) {
  const { templateId } = await params;

  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center p-12 text-xs text-muted-foreground">
          Memuat template...
        </div>
      }
    >
      <TemplateEditor templateId={templateId} />
    </Suspense>
  );
}
