"use client";
import "react-phone-number-input/style.css";
import type { Value } from "react-phone-number-input";
import { PhoneInput as ReuiPhoneInput } from "@/components/reui/phone-input";
import { digitsOnly } from "@/lib/phone";

/**
 * App phone field. Thin wrapper around the ReUI phone input that keeps the
 * app's storage contract: `value`/`onChange` are WhatsApp-style digits only,
 * no `+` (e.g. "351912345678"), while the ReUI component works in E.164.
 */
export function PhoneInput({
  value,
  onChange,
  required,
}: {
  value: string;
  onChange: (stored: string) => void;
  required?: boolean;
}) {
  const e164 = value ? (`+${digitsOnly(value)}` as Value) : undefined;

  return (
    <ReuiPhoneInput
      international
      defaultCountry="PT"
      value={e164}
      required={required}
      placeholder="Enter phone number"
      onChange={(v) => onChange(digitsOnly(v ?? ""))}
    />
  );
}
