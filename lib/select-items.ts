import * as React from "react";

/**
 * Derive a value → label map from rendered `<SelectItem>` children.
 *
 * Base UI renders the **raw value** in `<Select.Value>` unless `Select.Root` is
 * given an `items` map, so any select bound to a database id displayed the id
 * itself. Rather than making every call site pass `items`, the shared wrapper
 * walks the items it is already rendering.
 *
 * Kept in its own module, free of DOM and Base UI imports, so it can be tested
 * directly — see scripts/test-select-items.mts.
 */

/**
 * Plain-text label for one item's children.
 *
 * Strings and numbers, and arrays/fragments of them. Anything richer (an icon,
 * nested markup) returns null so the item is left out of the map, which falls
 * back to the previous behaviour for that one item rather than rendering
 * something wrong.
 */
export function textOf(node: React.ReactNode): string | null {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);

  if (Array.isArray(node)) {
    const parts = node.map(textOf);
    return parts.every((part) => part !== null) ? parts.join("") : null;
  }

  // Unwrap fragments — `<>{name}</>` is a reasonable thing to write.
  if (React.isValidElement(node) && node.type === React.Fragment) {
    return textOf((node.props as { children?: React.ReactNode }).children);
  }

  return null;
}

/**
 * Walk an element tree collecting `<SelectItem>` values and labels.
 *
 * `itemType` is passed in rather than imported so this module stays free of the
 * component graph (and of the circular import that would otherwise create).
 */
export function collectSelectItems(
  node: React.ReactNode,
  itemType: React.ElementType,
  acc: Record<string, string> = {},
): Record<string, string> {
  React.Children.forEach(node, (child) => {
    if (!React.isValidElement(child)) return;

    if (child.type === itemType) {
      const { value, children } = child.props as { value?: unknown; children?: React.ReactNode };
      const label = textOf(children);
      if (label !== null && value !== undefined && value !== null) {
        acc[String(value)] = label;
      }
      return;
    }

    const nested = (child.props as { children?: React.ReactNode })?.children;
    if (nested !== undefined && nested !== null) {
      collectSelectItems(nested, itemType, acc);
    }
  });

  return acc;
}
