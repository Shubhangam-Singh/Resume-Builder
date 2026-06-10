"use client";

import { useRef, useState } from "react";
import { BriefcaseBusiness, Image as ImageIcon, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAgencyStore } from "@/lib/agency-store";

export function AgencyBrandingDialog() {
  const { branding, setBranding, removeBranding } = useAgencyStore();
  const [open, setOpen] = useState(false);

  const [logoBase64, setLogoBase64] = useState(branding.logoBase64 || "");
  const [hrPhone, setHrPhone] = useState(branding.hrPhone || "");
  const [hrEmail, setHrEmail] = useState(branding.hrEmail || "");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state when dialog opens
  function handleOpenChange(next: boolean) {
    if (next) {
      setLogoBase64(branding.logoBase64 || "");
      setHrPhone(branding.hrPhone || "");
      setHrEmail(branding.hrEmail || "");
    }
    setOpen(next);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setLogoBase64(reader.result);
      }
    };
    reader.readAsDataURL(file);
  }

  function handleApply() {
    setBranding({
      enabled: true,
      logoBase64: logoBase64 || undefined,
      hrPhone: hrPhone || undefined,
      hrEmail: hrEmail || undefined,
    });
    setOpen(false);
  }

  function handleRemove() {
    removeBranding();
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs text-muted-foreground">
          {branding.enabled ? (
            <>
              <BriefcaseBusiness className="h-3.5 w-3.5 text-primary" />
              <span className="text-foreground">Agency Branding ✓</span>
            </>
          ) : (
            <>
              <BriefcaseBusiness className="h-3.5 w-3.5" />
              <span>+ Agency Branding</span>
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Agency Branding</DialogTitle>
          <DialogDescription>
            Overlay your agency details on this resume. Candidates&apos; personal links will be hidden automatically.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Company Logo</Label>
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-md border border-dashed bg-muted/50">
                {logoBase64 ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={logoBase64} alt="Logo preview" className="h-full w-full object-contain" />
                ) : (
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div className="space-y-1">
                <Button type="button" variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
                  Upload Image
                </Button>
                {logoBase64 && (
                  <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-destructive" onClick={() => setLogoBase64("")}>
                    <X className="mr-1 h-3.5 w-3.5" /> Remove
                  </Button>
                )}
              </div>
            </div>
            <input
              type="file"
              accept="image/png, image/jpeg, image/svg+xml"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="hrPhone">HR Phone</Label>
            <Input
              id="hrPhone"
              placeholder="e.g. +91 98765 43210"
              value={hrPhone}
              onChange={(e) => setHrPhone(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="hrEmail">HR Email</Label>
            <Input
              id="hrEmail"
              placeholder="e.g. hr@youragency.com"
              value={hrEmail}
              onChange={(e) => setHrEmail(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter className="sm:justify-between">
          <Button type="button" variant="ghost" className="text-destructive" onClick={handleRemove} disabled={!branding.enabled}>
            <Trash2 className="mr-2 h-4 w-4" />
            Remove
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleApply}>
              Apply Branding
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
