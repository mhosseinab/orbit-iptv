import { Filters, type SelectOption } from "./Filters";
import { StatusChips } from "./StatusChips";
import type { Filters as FiltersState, StatusFilter } from "../../types/iptv";
import styles from "./FilterPanel.module.css";

interface Props {
  filters: FiltersState;
  onChange: (patch: Partial<FiltersState>) => void;
  resultCount: number;
  catOptions: SelectOption[];
  countryOptions: SelectOption[];
  langOptions: SelectOption[];
  qualOptions: SelectOption[];
}

export function FilterPanel({
  filters,
  onChange,
  resultCount,
  catOptions,
  countryOptions,
  langOptions,
  qualOptions,
}: Props) {
  return (
    <div className={styles.panel}>
      <Filters
        filters={filters}
        onChange={onChange}
        catOptions={catOptions}
        countryOptions={countryOptions}
        langOptions={langOptions}
        qualOptions={qualOptions}
      />
      <StatusChips value={filters.status} onChange={(status: StatusFilter) => onChange({ status })} />
      <div className={styles.count}>
        {resultCount.toLocaleString()} {resultCount === 1 ? "channel" : "channels"}
      </div>
    </div>
  );
}
