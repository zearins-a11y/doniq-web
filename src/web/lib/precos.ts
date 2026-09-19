/**
 * Preço público em um lugar só.
 *
 * Mesma regra da política: só entra aqui o que é verdade na hora de cobrar. Se
 * o número mudar, muda aqui e a landing, a página de preço e o FAQ mudam junto.
 *
 * Os números em si moram em `src/shared/planos.ts`, porque o servidor precisa
 * dos mesmos valores para decidir a trava do teste. Aqui fica só o texto de
 * venda, que é coisa de navegador.
 */

import {
  ANUAL,
  CUSTO_POR_VISITA,
  DIAS_TESTE,
  economiaAnualPorcento,
  MENSAL,
  MINIMO_VENDEDORES,
} from "../../shared/planos";

export { ANUAL, CUSTO_POR_VISITA, DIAS_TESTE, economiaAnualPorcento, MENSAL, MINIMO_VENDEDORES };

export const PRECOS_ATUALIZADOS_EM = "11 de agosto de 2026";

export function reais(valor: number): string {
  return `R$ ${valor.toFixed(2).replace(".", ",")}`;
}

export function inteiroReais(valor: number): string {
  return `R$ ${Math.round(valor)}`;
}

export type Plano = {
  id: "mensal" | "anual";
  nome: string;
  preco: number;
  cadencia: string;
  chamada: string;
  destaque: boolean;
  selos: string[];
};

export const PLANOS: Plano[] = [
  {
    id: "mensal",
    nome: "Mensal",
    preco: MENSAL,
    cadencia: "por vendedor / mês",
    chamada: "Cancela quando quiser, sem multa e sem aviso prévio.",
    destaque: true,
    selos: ["sem fidelidade", `teste de ${DIAS_TESTE} dias`, "sem cartão para testar"],
  },
  {
    id: "anual",
    nome: "Anual",
    preco: ANUAL,
    cadencia: "por vendedor / mês, pago à vista",
    chamada: `Mesmo produto, ${economiaAnualPorcento()}% mais barato por vendedor.`,
    destaque: false,
    selos: ["12 meses à vista", "nota fiscal única", "mesmo suporte"],
  },
];

/* ── Apresentação comercial ─────────────────────────────────────────────── */

/** Selo no plano recomendado. */
export const SELO_MAIS_ESCOLHIDO = "mais escolhido";

/** Números provadores. Título em destaque, rótulo explicando. */
export const PROVADORES: { numero: string; rotulo: string }[] = [
  { numero: reais(CUSTO_POR_VISITA), rotulo: "custo de uma visita processada. Barato demais para deixar de registrar." },
  { numero: "60–70", rotulo: "visitas por mês de um vendedor ativo. Todas ilimitadas no plano." },
  { numero: `${DIAS_TESTE} dias`, rotulo: "de teste do produto inteiro, sem pedir cartão." },
  { numero: `${MINIMO_VENDEDORES} vendedor`, rotulo: "é o mínimo. Autônomo assina, sem taxa de implantação." },
];

export type ItemCard = { titulo: string; beneficio: string; icone: string };

/** O que está incluído, como card comercial: ícone + título curto + frase de benefício. */
export const INCLUI_CARDS: ItemCard[] = [
  {
    titulo: "Visitas ilimitadas",
    beneficio: "Grave 3 por semana ou 6 por dia — paga o mesmo, sem cota de gravação nem de transcrição.",
    icone: "infinito",
  },
  {
    titulo: "Relatório na hora",
    beneficio: "Resumo, objeção, próxima ação e data saem prontos ao falar sobre a visita.",
    icone: "documento",
  },
  {
    titulo: "Anti-alucinação",
    beneficio: "Campo sem base na gravação fica vazio, nunca inventado. Você confia no relatório.",
    icone: "escudo",
  },
  {
    titulo: "Pacote do seu ramo",
    beneficio: "Glossário, prioridades e checklist da sua área já vêm prontos — a IA fala a sua língua.",
    icone: "pasta",
  },
  {
    titulo: "Funciona offline",
    beneficio: "Grava sem internet no meio da rua; envia sozinho quando a rede voltar.",
    icone: "sinal-off",
  },
  {
    titulo: "Web e celular",
    beneficio: "Mesma conta no navegador e no aplicativo. Começa em um, termina no outro.",
    icone: "dispositivos",
  },
  {
    titulo: "Seus dados são seus",
    beneficio: "Exporta tudo em JSON a qualquer momento, sem pedir por e-mail.",
    icone: "download",
  },
  {
    titulo: "Painel do gestor",
    beneficio: "Visitas por vendedor, objeções e o que faltou perguntar — sem perseguir relatório.",
    icone: "equipe",
  },
  {
    titulo: "Agenda inteligente",
    beneficio: "Calendário com visita marcada e link para assinar no Google, Outlook ou Apple.",
    icone: "calendario",
  },
];

/** O que não entra no preço, como card honesto. */
export const NAO_INCLUI_CARDS: ItemCard[] = [
  {
    titulo: "CRM fora da lista",
    beneficio: "Integramos só os conectores que aparecem na tela de integrações. Outro CRM, não.",
    icone: "conector",
  },
  {
    titulo: "Campo personalizado do CRM",
    beneficio: "O mapeamento dos campos é você quem faz na tela — não configuramos por você.",
    icone: "mapear",
  },
  {
    titulo: "Implantação assistida",
    beneficio: "Sem treinamento presencial. O produto abre e funciona, e o suporte é por aqui.",
    icone: "suporte",
  },
  {
    titulo: "Sincronia de volta",
    beneficio: "O que você marca aqui vai para o calendário; o que marca lá não volta para cá.",
    icone: "sincronia",
  },
];

/*
 * Versões em string (legado): continuam exportadas para os testes e para
 * qualquer tela que ainda consuma a lista corrida. Derivadas dos cards para
 * nunca divergir da página.
 */
/** O que está incluído em qualquer plano. Não existe versão mutilada. */
export const INCLUI: string[] = [
  "Visitas ilimitadas, sem cota de gravação nem de transcrição",
  ...INCLUI_CARDS.slice(1).map((c) => `${c.titulo}: ${c.beneficio}`),
];

/** O que não está no preço. Dizer antes evita a conversa ruim depois. */
export const NAO_INCLUI: string[] = NAO_INCLUI_CARDS.map((c) => `${c.titulo}: ${c.beneficio}`);

export const FAQ_PRECO: { pergunta: string; resposta: string }[] = [
  {
    pergunta: "Por que não existe plano grátis para sempre?",
    resposta:
      `Cada visita processada custa dinheiro de verdade em transcrição e modelo — cerca de ${reais(CUSTO_POR_VISITA)} ` +
      "por visita. Um plano grátis eterno viraria prejuízo por uso, então o teste tem prazo em vez de ter limite " +
      "de funcionalidade: nos primeiros dias você usa o produto inteiro.",
  },
  {
    pergunta: "Cobra por gravação, por minuto ou por visita?",
    resposta:
      "Por vendedor. Quem grava três visitas por semana e quem grava seis por dia pagam o mesmo. Cobrar por " +
      "gravação faria o vendedor pensar duas vezes antes de registrar a visita, que é justamente o hábito que o " +
      "produto precisa criar.",
  },
  {
    pergunta: "Um vendedor autônomo pode assinar?",
    resposta:
      `Pode. O mínimo é ${MINIMO_VENDEDORES} ${MINIMO_VENDEDORES === 1 ? "vendedor" : "vendedores"}. ` +
      "Não existe piso de equipe nem taxa de implantação.",
  },
  {
    pergunta: "A agenda sincroniza com o Google Calendar na hora?",
    resposta:
      "Aparece, mas não na hora. O link de calendário é o único jeito de mandar sua agenda para o Google, o Outlook " +
      "e o Apple sem instalar nada — e quem decide a hora de reler o link é eles: o Google relê a cada 8 a 24 horas, " +
      "o Outlook a cada 3 horas mais ou menos. Quando você precisa de uma visita no calendário agora, o cartão da " +
      "visita tem o botão de pôr na agenda na hora. Prometer tempo real seria mentira que você descobriria no dia seguinte.",
  },
  {
    pergunta: "E se eu quiser sair?",
    resposta:
      "No mensal, cancela quando quiser. Antes de sair, baixe tudo em JSON pela página de segurança — os dados " +
      "são seus e a exportação não depende de pedido por e-mail. Depois do cancelamento, a conta é apagada em 30 dias.",
  },
  {
    pergunta: "O preço muda depois que eu assinar?",
    resposta:
      "Não durante o período contratado. Se a tabela subir, quem já é cliente fica no preço de entrada pelos " +
      "próximos 12 meses, e o aviso vem com pelo menos 30 dias.",
  },
];
