"use client";

import { useResumeStore } from "@/lib/store";
import {
  AddButton,
  EntryCard,
  FieldRow,
  TextAreaField,
  TextField,
} from "../fields";

export function BasicsSection() {
  const { basics } = useResumeStore((s) => s.resume);
  const updateBasics = useResumeStore((s) => s.updateBasics);
  const updateLocation = useResumeStore((s) => s.updateLocation);
  const addProfile = useResumeStore((s) => s.addProfile);
  const updateProfile = useResumeStore((s) => s.updateProfile);
  const removeProfile = useResumeStore((s) => s.removeProfile);

  return (
    <div className="space-y-4">
      <FieldRow>
        <TextField
          label="Full name"
          value={basics.name}
          onChange={(v) => updateBasics({ name: v })}
          placeholder="Jane Doe"
        />
        <TextField
          label="Headline / title"
          value={basics.label}
          onChange={(v) => updateBasics({ label: v })}
          placeholder="Senior Product Designer"
        />
      </FieldRow>

      <FieldRow>
        <TextField
          label="Email"
          type="email"
          value={basics.email}
          onChange={(v) => updateBasics({ email: v })}
          placeholder="jane@example.com"
        />
        <TextField
          label="Phone"
          type="tel"
          value={basics.phone}
          onChange={(v) => updateBasics({ phone: v })}
          placeholder="+1 (555) 000-0000"
        />
      </FieldRow>

      <TextField
        label="Website / portfolio"
        type="url"
        value={basics.url}
        onChange={(v) => updateBasics({ url: v })}
        placeholder="https://janedoe.com"
      />

      <FieldRow>
        <TextField
          label="City"
          value={basics.location.city}
          onChange={(v) => updateLocation({ city: v })}
          placeholder="San Francisco"
        />
        <TextField
          label="Region / State"
          value={basics.location.region}
          onChange={(v) => updateLocation({ region: v })}
          placeholder="CA"
        />
      </FieldRow>

      <TextField
        label="Country code"
        value={basics.location.countryCode}
        onChange={(v) => updateLocation({ countryCode: v })}
        placeholder="US"
        hint="Shown only if no region is set."
      />

      <TextAreaField
        label="Professional summary"
        value={basics.summary}
        onChange={(v) => updateBasics({ summary: v })}
        placeholder="A 2–3 sentence overview of who you are and what you do."
        rows={4}
      />

      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold">Profiles</h3>
          <p className="text-xs text-muted-foreground">
            GitHub, LinkedIn, or other professional links.
          </p>
        </div>
        {basics.profiles.map((p) => (
          <EntryCard
            key={p.id}
            title={p.network || "Profile"}
            onRemove={() => removeProfile(p.id)}
          >
            <FieldRow>
              <TextField
                label="Network"
                value={p.network}
                onChange={(v) => updateProfile(p.id, { network: v })}
                placeholder="GitHub"
              />
              <TextField
                label="Username"
                value={p.username}
                onChange={(v) => updateProfile(p.id, { username: v })}
                placeholder="janedoe"
              />
            </FieldRow>
            <TextField
              label="URL"
              type="url"
              value={p.url}
              onChange={(v) => updateProfile(p.id, { url: v })}
              placeholder="https://github.com/janedoe"
            />
          </EntryCard>
        ))}
        <AddButton label="Add profile" onClick={addProfile} />
      </div>
    </div>
  );
}
