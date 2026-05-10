interface Props {
  label: React.ReactNode
  value: React.ReactNode
  labelClassName?: string
  valueClassName?: string
}

/**
 * Two-column row used in detail panels: muted label on the left, value on the
 * right. Drop-in replacement for the `<div className="flex justify-between
 * text-sm"><span muted>label</span>value</div>` pattern duplicated across
 * info cards.
 */
export function KeyValueRow({ label, value, labelClassName, valueClassName }: Props) {
  return (
    <div className="flex justify-between text-sm">
      <span className={`text-muted-foreground ${labelClassName ?? ''}`}>{label}</span>
      <span className={valueClassName}>{value}</span>
    </div>
  )
}
