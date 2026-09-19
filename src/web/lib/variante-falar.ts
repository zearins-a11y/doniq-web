export type VarianteFalar = "aprovada" | "legada";

export function resolverVarianteFalar(search: string): VarianteFalar {
  const parametros = new URLSearchParams(search);
  return parametros.get("falar-legado") === "1" ? "legada" : "aprovada";
}
