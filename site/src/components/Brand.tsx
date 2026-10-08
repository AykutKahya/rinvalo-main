import { Fragment } from "react";

/** Keeps the brand as "RINVALO" when Turkish upper-casing would turn its i into İ. */
export function withBrand(text: string) {
  const parts = text.split("Rinvalo");
  return parts.map((p, i) => (
    <Fragment key={i}>
      {i > 0 && <span lang="en">Rinvalo</span>}
      {p}
    </Fragment>
  ));
}
