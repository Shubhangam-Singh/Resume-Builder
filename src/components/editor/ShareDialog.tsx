"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Globe, Link, Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { encodeResumeToUrl } from "@/lib/share/url";
import { useResumeStore } from "@/lib/store";

const BASE_URL_KEY = "resumeforge-share-base-url";

function savedBaseUrl(): string {
  try { return localStorage.getItem(BASE_URL_KEY) ?? ""; } catch { return ""; }
}
function saveBaseUrl(v: string): void {
  try { localStorage.setItem(BASE_URL_KEY, v); } catch { /* ignore */ }
}

/** Strip trailing slash and everything after the path root. */
function normalizeBase(raw: string): string {
  try {
    const u = new URL(raw.trim());
    return u.origin; // e.g. https://myapp.vercel.app
  } catch {
    return raw.trim().replace(/\/$/, "");
  }
}

/**
 * Replace the origin in a fully-formed URL with a custom base.
 * e.g. swaps http://localhost:3003/?r=… → https://myapp.vercel.app/?r=…
 */
function swapOrigin(fullUrl: string, base: string): string {
  const normalized = normalizeBase(base);
  if (!normalized) return fullUrl;
  try {
    const u = new URL(fullUrl);
    return normalized + u.pathname + u.search;
  } catch {
    return fullUrl;
  }
}

/**
 * Generates a shareable URL that encodes the entire resume (minus the photo)
 * as gzip-compressed base64url in the `?r=` query param. Everything happens
 * client-side — no data is uploaded anywhere.
 */
export function ShareDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const resume = useResumeStore((s) => s.resume);
  const [rawUrl, setRawUrl] = useState(""); // URL from window.location
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [customBase, setCustomBase] = useState("");

  // Load saved base URL on open
  useEffect(() => {
    if (!open) { setRawUrl(""); setCopied(false); return; }
    setCustomBase(savedBaseUrl());
    setLoading(true);
    encodeResumeToUrl(resume)
      .then(setRawUrl)
      .catch(() => setRawUrl(""))
      .finally(() => setLoading(false));
  }, [open, resume]);

  const isLocalhost =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1");

  // Final URL shown to user: swap origin if a custom base is set
  const displayUrl =
    rawUrl && customBase.trim()
      ? swapOrigin(rawUrl, customBase)
      : rawUrl;

  function handleBaseChange(v: string) {
    setCustomBase(v);
    saveBaseUrl(v);
    setCopied(false);
  }

  async function copy() {
    const target = displayUrl || rawUrl;
    if (!target) return;
    try {
      await navigator.clipboard.writeText(target);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const input = document.querySelector<HTMLInputElement>("#share-url-input");
      input?.select();
    }
  }

  const hasPhoto = !!resume.basics.image;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share this resume
          </DialogTitle>
          <DialogDescription>
            Anyone with this link can view and download a copy of your resume.
            The link encodes everything — no account, no upload.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Custom base URL (for localhost / custom domain) */}
          {isLocalhost && (
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs">
                <Globe className="h-3.5 w-3.5" />
                Your deployed URL
                <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                value={customBase}
                onChange={(e) => handleBaseChange(e.target.value)}
                placeholder="https://myresume.vercel.app"
                className="text-xs"
              />
              <p className="text-xs text-muted-foreground">
                Paste your Vercel / Netlify URL here and the share link below
                will use that domain instead of localhost.
              </p>
            </div>
          )}

          {hasPhoto && (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
              <strong>Note:</strong> Your profile photo is not included in the
              shared link to keep the URL short.
            </p>
          )}

          {/* Generated link */}
          <div className="space-y-1.5">
            <Label className="text-xs">Share link</Label>
            <div className="flex gap-2">
              <div className="relative min-w-0 flex-1">
                <Link className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="share-url-input"
                  readOnly
                  value={loading ? "Generating link…" : displayUrl}
                  className="pl-9 text-xs"
                  onFocus={(e) => e.target.select()}
                />
              </div>
              <Button
                onClick={() => void copy()}
                disabled={loading || !displayUrl}
                variant={copied ? "secondary" : "default"}
                className="shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-500" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy link
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              The link is long but works in all modern browsers. Paste into{" "}
              <strong>bit.ly</strong> for a shorter version.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
