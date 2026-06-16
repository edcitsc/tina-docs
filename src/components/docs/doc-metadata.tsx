"use client";

import { tinaField } from "tinacms/dist/react";

// ─── Shared Badge ────────────────────────────────────────────────────────────

function Badge({
  label,
  variant,
}: {
  label: string;
  variant: "category" | "utility" | "audience";
}) {
  const styles: Record<typeof variant, string> = {
    category: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
    utility: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
    audience: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  };

  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[variant]}`}
    >
      {label}
    </span>
  );
}

// ─── DocPageHeader ────────────────────────────────────────────────────────────

interface DocPageHeaderProps {
  doc: {
    category?: string | null;
    utilities?: string[] | null;
    audience?: string[] | null;
  };
}

export function DocPageHeader({ doc }: DocPageHeaderProps) {
  const hasCategory = Boolean(doc.category);
  const hasUtilities = doc.utilities && doc.utilities.length > 0;
  const hasAudience = doc.audience && doc.audience.length > 0;

  if (!hasCategory && !hasUtilities && !hasAudience) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
      {hasCategory && (
        <div
          className="flex flex-wrap items-center gap-1.5"
          data-tina-field={tinaField(doc, "category")}
        >
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Category:</span>
          <Badge label={doc.category!} variant="category" />
        </div>
      )}
      {hasUtilities && (
        <div
          className="flex flex-wrap items-center gap-1.5"
          data-tina-field={tinaField(doc, "utilities")}
        >
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Utilities:</span>
          {doc.utilities!.map((u) => (
            <Badge key={u} label={u} variant="utility" />
          ))}
        </div>
      )}
      {hasAudience && (
        <div
          className="flex flex-wrap items-center gap-1.5"
          data-tina-field={tinaField(doc, "audience")}
        >
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Audience:</span>
          {doc.audience!.map((a) => (
            <Badge key={a} label={a} variant="audience" />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── DocPageFooter ────────────────────────────────────────────────────────────

interface DocPageFooterProps {
  doc: {
    document_id?: string | null;
    last_reviewed?: string | null;
  };
}

export function DocPageFooter({ doc }: DocPageFooterProps) {
  const hasDocId = Boolean(doc.document_id);
  const hasLastReviewed = Boolean(doc.last_reviewed);

  if (!hasDocId && !hasLastReviewed) return null;

  return (
    <div className="mt-6 flex flex-wrap gap-x-6 gap-y-1 border-t border-slate-200 pt-4 dark:border-slate-700">
      {hasDocId && (
        <span
          className="text-sm text-slate-500 dark:text-slate-400"
          data-tina-field={tinaField(doc, "document_id")}
        >
          <span className="font-medium">Document ID:</span> {doc.document_id}
        </span>
      )}
      {hasLastReviewed && (
        <span
          className="text-sm text-slate-500 dark:text-slate-400"
          data-tina-field={tinaField(doc, "last_reviewed")}
        >
          <span className="font-medium">Last Reviewed:</span> {doc.last_reviewed}
        </span>
      )}
    </div>
  );
}
