"use client";

import { use } from "react";
import { TemplateEditor } from "@/features/template/components/template-editor";

interface EditTemplatePageProps {
  params: Promise<{
    templateId: string;
  }>;
}

export default function EditTemplatePage({ params }: EditTemplatePageProps) {
  const resolvedParams = use(params);
  return <TemplateEditor templateId={resolvedParams.templateId} />;
}

