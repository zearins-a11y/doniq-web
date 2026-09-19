/**
 * Catálogo de integrações disponíveis no Doniq.
 * Simula um marketplace listando CRMs, future integrações, e Add-ons.
 */

export interface IntegracaoCatalogo {
  id: string;
  nome: string;
  descricao: string;
  categoria: "crm" | "comunicacao" | "automacao" | "add-on";
  status: "disponivel" | "em-breve" | "conectado";
  icone: string;
}

export const CATALOGO_INTEGRACOES: IntegracaoCatalogo[] = [
  // CRMs
  {
    id: "agendor",
    nome: "Agendor",
    descricao: "CRM para equipes de vendas B2B",
    categoria: "crm",
    status: "disponivel",
    icone: "📋",
  },
  {
    id: "hubspot",
    nome: "HubSpot",
    descricao: "Plataforma completa de marketing e vendas",
    categoria: "crm",
    status: "disponivel",
    icone: "🟠",
  },
  {
    id: "moskit",
    nome: "Moskit",
    descricao: "CRM para empresas B2B e B2B2C",
    categoria: "crm",
    status: "disponivel",
    icone: "🟣",
  },
  {
    id: "ollow",
    nome: "Ollow",
    descricao: "CRM para gestão de contas e relacionamentos",
    categoria: "crm",
    status: "disponivel",
    icone: "🔵",
  },
  {
    id: "pipedrive",
    nome: "Pipedrive",
    descricao: "CRM focado em vendas e pipeline",
    categoria: "crm",
    status: "disponivel",
    icone: "🟢",
  },
  {
    id: "ploomes",
    nome: "Ploomes",
    descricao: "CRM ERP para empresas brasileiras",
    categoria: "crm",
    status: "disponivel",
    icone: "🟡",
  },
  {
    id: "rdstation",
    nome: "RD Station",
    descricao: "Plataforma de automação de marketing e vendas",
    categoria: "crm",
    status: "disponivel",
    icone: "🔴",
  },
  // Em breve
  {
    id: "whatsapp",
    nome: "WhatsApp Business",
    descricao: "Envio automático de resumos via WhatsApp",
    categoria: "comunicacao",
    status: "em-breve",
    icone: "💬",
  },
  {
    id: "google-calendar",
    nome: "Google Calendar",
    descricao: "Sincronizar visitas com agenda Google",
    categoria: "automacao",
    status: "em-breve",
    icone: "📅",
  },
  {
    id: "slack",
    nome: "Slack",
    descricao: "Notificações de novas visitas no Slack",
    categoria: "comunicacao",
    status: "em-breve",
    icone: "🔔",
  },
  // Add-ons
  {
    id: "transcricao-ilimitada",
    nome: "Transcrição Ilimitada",
    descricao: "Mais minutos de áudio por mês",
    categoria: "add-on",
    status: "em-breve",
    icone: "🎙️",
  },
  {
    id: "ia-avancada",
    nome: "IA Avançada",
    descricao: "Análise preditiva e sugestões personalizadas",
    categoria: "add-on",
    status: "em-breve",
    icone: "🤖",
  },
];

export function integracoesPorCategoria(
  categoria: IntegracaoCatalogo["categoria"],
): IntegracaoCatalogo[] {
  return CATALOGO_INTEGRACOES.filter((i) => i.categoria === categoria);
}

export function integracaoPorId(id: string): IntegracaoCatalogo | undefined {
  return CATALOGO_INTEGRACOES.find((i) => i.id === id);
}
