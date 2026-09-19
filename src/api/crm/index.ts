/** Registro dos conectores. */

import { agendor } from "./agendor";
import { hubspot } from "./hubspot";
import { moskit } from "./moskit";
import { ollow } from "./ollow";
import { pipedrive } from "./pipedrive";
import { ploomes } from "./ploomes";
import { rdstation } from "./rdstation";
import type { Adaptador, Provedor } from "./tipos";

export const ADAPTADORES: Record<Provedor, Adaptador> = {
  agendor,
  hubspot,
  moskit,
  ollow,
  pipedrive,
  ploomes,
  rdstation,
};

export function adaptador(provedor: Provedor): Adaptador {
  return ADAPTADORES[provedor];
}

export { PROVEDORES, NOMES_PROVEDOR, ehProvedor, ErroCrm } from "./tipos";
export type { Adaptador, Provedor, RelatoCanonico } from "./tipos";
