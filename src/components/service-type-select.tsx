"use client";

import { useState } from "react";
import { NEW_TYPE, SERVICE_CATEGORIES, type CustomType } from "@/lib/service-categories";

type Props = {
  customTypes: CustomType[];
  label: string;
  className: string;
  value?: string;
  defaultValue?: string;
  defaultNewType?: string;
  onChange?: (value: string) => void;
};

// Service type dropdown shared by the service and reminder forms. Choosing
// "New type…" shows a name field; the server creates the type on save.
export function ServiceTypeSelect({
  customTypes,
  label,
  className,
  value,
  defaultValue = "oil",
  defaultNewType,
  onChange,
}: Props) {
  const [own, setOwn] = useState(defaultValue);
  const selected = value ?? own;

  return (
    <div className="space-y-4">
      <label className="block text-sm">
        <span className="text-steel">{label}</span>
        <select
          name="category"
          required
          value={selected}
          onChange={(e) => {
            setOwn(e.target.value);
            onChange?.(e.target.value);
          }}
          className={className}
        >
          <optgroup label="Common">
            {SERVICE_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </optgroup>
          {customTypes.length > 0 && (
            <optgroup label="Your types">
              {customTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </optgroup>
          )}
          <option value={NEW_TYPE}>New type…</option>
        </select>
      </label>
      {selected === NEW_TYPE && (
        <label className="block text-sm">
          <span className="text-steel">New service type</span>
          <input
            name="newType"
            required
            autoFocus
            maxLength={60}
            placeholder="Differential fluid"
            defaultValue={defaultNewType}
            className={className}
          />
          <span className="mt-1 block text-xs text-steel">
            It&apos;ll show up in both service history and reminders.
          </span>
        </label>
      )}
    </div>
  );
}
