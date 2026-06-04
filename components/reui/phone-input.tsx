"use client";
import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import * as RPNInput from "react-phone-number-input";
import flags from "react-phone-number-input/flags";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type PhoneInputProps = Omit<
  React.ComponentProps<"input">,
  "onChange" | "value" | "ref"
> &
  Omit<RPNInput.Props<typeof RPNInput.default>, "onChange"> & {
    /** Fired with the full E.164 value (e.g. "+351912345678") or "". */
    onChange?: (value: RPNInput.Value) => void;
  };

const PhoneInput: React.ForwardRefExoticComponent<PhoneInputProps> =
  React.forwardRef<React.ElementRef<typeof RPNInput.default>, PhoneInputProps>(
    ({ className, onChange, ...props }, ref) => (
      <RPNInput.default
        ref={ref}
        className={cn("flex", className)}
        flagComponent={FlagComponent}
        countrySelectComponent={CountrySelect}
        inputComponent={InputComponent}
        smartCaret={false}
        // react-phone-number-input emits `undefined` when cleared; normalise to
        // an empty string so consumers always get a defined value.
        onChange={(value) => onChange?.(value || ("" as RPNInput.Value))}
        {...props}
      />
    ),
  );
PhoneInput.displayName = "PhoneInput";

const InputComponent = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input">
>(({ className, ...props }, ref) => (
  <Input
    className={cn("rounded-s-none rounded-e-md", className)}
    ref={ref}
    {...props}
  />
));
InputComponent.displayName = "InputComponent";

type CountryEntry = { label: string; value?: RPNInput.Country };

type CountrySelectProps = {
  disabled?: boolean;
  value: RPNInput.Country;
  options: CountryEntry[];
  onChange: (country: RPNInput.Country) => void;
};

function CountrySelect({
  disabled,
  value: selectedCountry,
  options: countryList,
  onChange,
}: CountrySelectProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="flex gap-1 rounded-e-none rounded-s-md border-r-0 px-3 focus:z-10"
          disabled={disabled}
        >
          <FlagComponent
            country={selectedCountry}
            countryName={selectedCountry}
          />
          <ChevronsUpDown
            className={cn(
              "-mr-2 size-4 opacity-50",
              disabled ? "hidden" : "opacity-100",
            )}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput placeholder="Search country..." />
          <CommandList>
            <CommandEmpty>No country found.</CommandEmpty>
            <CommandGroup>
              {countryList.map(({ value, label }) =>
                value ? (
                  <CountrySelectOption
                    key={value}
                    country={value}
                    countryName={label}
                    selectedCountry={selectedCountry}
                    onChange={onChange}
                  />
                ) : null,
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function CountrySelectOption({
  country,
  countryName,
  selectedCountry,
  onChange,
}: {
  country: RPNInput.Country;
  countryName: string;
  selectedCountry: RPNInput.Country;
  onChange: (country: RPNInput.Country) => void;
}) {
  return (
    <CommandItem className="gap-2" onSelect={() => onChange(country)}>
      <FlagComponent country={country} countryName={countryName} />
      <span className="flex-1 text-sm">{countryName}</span>
      <span className="text-sm text-muted-foreground">
        {`+${RPNInput.getCountryCallingCode(country)}`}
      </span>
      <Check
        className={cn(
          "ml-auto size-4",
          country === selectedCountry ? "opacity-100" : "opacity-0",
        )}
      />
    </CommandItem>
  );
}

function FlagComponent({ country, countryName }: RPNInput.FlagProps) {
  const Flag = flags[country];
  return (
    <span className="flex h-4 w-6 overflow-hidden rounded-sm [&_svg]:size-full">
      {Flag && <Flag title={countryName} />}
    </span>
  );
}

export { PhoneInput };
