import type { Filters as FiltersState, SortKey } from "../../types/iptv";
import styles from "./Filters.module.css";

export interface SelectOption {
  value: string;
  label: string;
}

interface Props {
  filters: FiltersState;
  onChange: (patch: Partial<FiltersState>) => void;
  catOptions: SelectOption[];
  countryOptions: SelectOption[];
  langOptions: SelectOption[];
  qualOptions: SelectOption[];
}

const SORTS: { value: SortKey; label: string }[] = [
  { value: "name", label: "Name" },
  { value: "country", label: "Country" },
  { value: "quality", label: "Quality" },
  { value: "status", label: "Status" },
];

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (v: string) => void;
}) {
  return (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      <select
        className={styles.select}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Filters({
  filters,
  onChange,
  catOptions,
  countryOptions,
  langOptions,
  qualOptions,
}: Props) {
  return (
    <div className={styles.grid}>
      <Select
        label="Category"
        value={filters.cat}
        options={catOptions}
        onChange={(v) => onChange({ cat: v })}
      />
      <Select
        label="Country"
        value={filters.country}
        options={countryOptions}
        onChange={(v) => onChange({ country: v })}
      />
      <Select
        label="Language"
        value={filters.lang}
        options={langOptions}
        onChange={(v) => onChange({ lang: v })}
      />
      <Select
        label="Quality"
        value={filters.qual}
        options={qualOptions}
        onChange={(v) => onChange({ qual: v })}
      />
      <Select
        label="Sort by"
        value={filters.sort}
        options={SORTS}
        onChange={(v) => onChange({ sort: v as SortKey })}
      />
    </div>
  );
}
