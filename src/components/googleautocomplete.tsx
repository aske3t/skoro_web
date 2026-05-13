"use client";

import { useRef } from "react";
import { useAddressAutocomplete, type AddressLocation }
  from "@/lib/maps/adressAutocomplete";

type Props = {
  id?: string;
  value: string;
  onChange: (address: string, location: AddressLocation | null) => void;
  placeholder?: string;
  className?: string;
};

export default function AddressAutocomplete({
  id, value, onChange, placeholder, className,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  useAddressAutocomplete({
    inputRef,
    onSelect: (addr, loc) => onChange(addr, loc),
  });

  return (
    <input
      id={id}
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value, null)}
      placeholder={placeholder}
      className={className}
      autoComplete="off"
    />
  );
}
