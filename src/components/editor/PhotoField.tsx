"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { fileToScaledDataUrl } from "@/lib/image";
import { toast } from "@/lib/toast";
import { useResumeStore } from "@/lib/store";

export function PhotoField() {
  const image = useResumeStore((s) => s.resume.basics.image);
  const updateBasics = useResumeStore((s) => s.updateBasics);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      updateBasics({ image: await fileToScaledDataUrl(file) });
    } catch {
      toast("Couldn't read that image. Try a JPG or PNG.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <Label>Photo</Label>
      <div className="flex items-center gap-3">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="Profile" className="h-full w-full object-cover" />
          ) : (
            <User className="h-7 w-7 text-muted-foreground/50" />
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
            >
              {busy ? <Loader2 className="animate-spin" /> : <ImagePlus />}
              {image ? "Change" : "Upload"}
            </Button>
            {image ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => updateBasics({ image: "" })}
              >
                <Trash2 />
                Remove
              </Button>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            Shown on photo templates (Sidebar, Banner). Resized & kept in your
            browser.
          </p>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          void handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
