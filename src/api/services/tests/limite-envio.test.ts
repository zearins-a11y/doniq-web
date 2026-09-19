/**
 * Freio do formulário público.
 *
 * O que estes testes protegem: o formulário do encarregado é aberto por
 * obrigação legal, e formulário aberto que dispara e-mail vira relay se ninguém
 * segurar. Domínio queimado por spam derruba o convite de equipe junto.
 */
import { beforeEach, expect, test } from "bun:test";
import {
  JANELA_MS,
  LIMITE_POR_JANELA,
  MAX_CHAVES,
  chavesEmUso,
  registrarTentativa,
  zerarLimites,
} from "../limite-envio";

const T0 = 1_800_000_000_000;

beforeEach(() => zerarLimites());

test("os primeiros envios passam e o contador de restantes desce", () => {
  for (let n = 0; n < LIMITE_POR_JANELA; n++) {
    const v = registrarTentativa("a@b.com", T0);
    expect(v.permitido).toBe(true);
    expect(v.restantes).toBe(LIMITE_POR_JANELA - 1 - n);
  }
});

test("passar do limite é negado com prazo em minutos, não com erro seco", () => {
  for (let n = 0; n < LIMITE_POR_JANELA; n++) registrarTentativa("a@b.com", T0);
  const v = registrarTentativa("a@b.com", T0 + 1000);
  expect(v.permitido).toBe(false);
  expect(v.restantes).toBe(0);
  expect(v.minutos).toBeGreaterThan(0);
  expect(v.minutos).toBeLessThanOrEqual(60);
});

test("a janela vira e o titular volta a conseguir escrever", () => {
  for (let n = 0; n < LIMITE_POR_JANELA; n++) registrarTentativa("a@b.com", T0);
  expect(registrarTentativa("a@b.com", T0 + JANELA_MS + 1).permitido).toBe(true);
});

test("um remetente barrado não barra os outros", () => {
  for (let n = 0; n < LIMITE_POR_JANELA; n++) registrarTentativa("spam@b.com", T0);
  expect(registrarTentativa("spam@b.com", T0).permitido).toBe(false);
  expect(registrarTentativa("titular@c.com", T0).permitido).toBe(true);
});

test("caixa e espaço não driblam o freio", () => {
  for (let n = 0; n < LIMITE_POR_JANELA; n++) registrarTentativa("a@b.com", T0);
  expect(registrarTentativa("  A@B.com  ", T0).permitido).toBe(false);
});

test("chave vazia cai num balde só, em vez de virar passe livre", () => {
  for (let n = 0; n < LIMITE_POR_JANELA; n++) registrarTentativa("", T0);
  expect(registrarTentativa("   ", T0).permitido).toBe(false);
});

test("chave vencida sai do mapa sozinha: o freio não vaza memória", () => {
  registrarTentativa("a@b.com", T0);
  expect(chavesEmUso()).toBe(1);
  registrarTentativa("outro@b.com", T0 + JANELA_MS + 1);
  expect(chavesEmUso()).toBe(1);
});

test("enxurrada de chaves diferentes não cresce sem teto", () => {
  for (let n = 0; n <= MAX_CHAVES + 10; n++) registrarTentativa(`bot${n}@b.com`, T0);
  expect(chavesEmUso()).toBeLessThanOrEqual(MAX_CHAVES);
});
