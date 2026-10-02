import type { ChangeEventHandler } from "react";
import styles from "./module-search-field.module.css";

type ModuleSearchFieldProps = {
  ariaLabel: string;
  placeholder: string;
  value?: string;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  disabled?: boolean;
};

export function ModuleSearchField({ ariaLabel, placeholder, value, onChange, disabled }: ModuleSearchFieldProps) {
  return <label className={styles.field}>
    <span className={styles.icon} aria-hidden="true">⌕</span>
    <input className={styles.input} type="text" aria-label={ariaLabel} placeholder={placeholder} value={value} onChange={onChange} disabled={disabled} />
  </label>;
}
