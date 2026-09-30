import type { ButtonHTMLAttributes } from "react";

type DashboardActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function DashboardActionButton({
  className = "",
  type = "button",
  ...props
}: DashboardActionButtonProps) {
  return <button {...props} type={type} className={`dashboardActionButton ${className}`.trim()} />;
}
