/**
 * GestaoPage (/gestao) - Área Desktop Web de Gestão Comercial Doniq.
 *
 * Direção Visual: Doniq Direction D / Dark Obsidian High-Craft.
 *
 * Atende perfeitamente ao pedido:
 * "deixemos uma área desktop web, para a parte gerencial, com painel gestor
 * e acesso a dados de equipes, ou mesmo em caso unico."
 *
 * Funcionalidades:
 *  - Demonstração interativa do Cockpit Executivo em tempo real;
 *  - Switcher entre "Modo Equipe (Painel do Gestor)" e "Modo Caso Único (Operação Solo)";
 *  - KPIs executivos Doniq com brilho ciano, radar de mercado e checklist;
 *  - Feed de visitas estruturadas (com o Pacto de Privacidade Doniq garantido);
 *  - Simulação de resumo semanal por e-mail;
 *  - Se conectado, atalho direto para o Cockpit Operacional.
 */

import { useState } from "react";
import { Link } from "wouter";
import { useReducedMotion } from "motion/react";
import { AnimateNumber } from "../components/motion-plus";
import {
  AlertCircle,
  ArrowRight,
  Calculator,
  CalendarClock,
  CheckCircle2,
  Download,
  Mail,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { Marca } from "../components/marca";
import { tokenAtual } from "../lib/api";

interface Objecao {
  texto: string;
  contagem: number;
  porcentagem: number;
}

interface VisitaExemplo {
  id: string;
  vendedor: string;
  iniciais: string;
  empresa: string;
  tempo: string;
  resumo: string;
  proximoPasso: string;
  prazo: string;
  objecao: string;
  crm: string;
}

/** Barra de progresso Doniq com trilha suave e gradiente ciano -> azul */
function BarraProgressoDoniq({
  valor,
  maximo,
  rotulo,
}: {
  valor: number;
  maximo: number;
  rotulo: string;
}) {
  const percentual = maximo > 0 ? Math.min(100, Math.round((valor / maximo) * 100)) : 0;
  return (
    <div className="w-full">
      <progress
        className="sr-only"
        value={valor}
        max={maximo}
        aria-label={rotulo}
      >
        {percentual}%
      </progress>
      <div className="w-full h-2 bg-slate-800/90 rounded-full overflow-hidden p-0.5 border border-slate-700/40">
        <div
          className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percentual}%` }}
        />
      </div>
    </div>
  );
}

export default function GestaoPage() {
  const reducedMotion = useReducedMotion();
  const [modoPainel, setModoPainel] = useState<"equipe" | "solo">("equipe");
  const [resumoSimuladoEnviado, setResumoSimuladoEnviado] = useState(false);
  const [toast, setToast] = useState("");

  // Formulário de piloto corporativo
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [tamanho, setTamanho] = useState("5 a 15 vendedores");
  const [crm, setCrm] = useState("pipedrive");
  const [telefone, setTelefone] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [erro, setErro] = useState("");

  // Calculadora de ROI e Economia de Horas
  const [calcVendedores, setCalcVendedores] = useState(5);
  const [calcVisitasDia, setCalcVisitasDia] = useState(4);

  const horasEconomizadasMes = Math.round((calcVendedores * calcVisitasDia * 20 * 22) / 60);
  const economiaFinanceira = horasEconomizadasMes * 45;
  const investimentoDoniq = calcVendedores === 1 ? 89 : calcVendedores * 69;
  const multiplicadorROI = Math.max(1, Math.round(economiaFinanceira / investimentoDoniq));

  const estaAutenticado = typeof window !== "undefined" && Boolean(tokenAtual());
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const assinaturaStatus = searchParams?.get("assinatura");
  const origemPitch = searchParams?.get("origem") === "pitch_vendedor" || searchParams?.get("ref") === "pitch";

  const avisar = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(""), 2800);
  };

  const objecoesMercado: Objecao[] = [
    { texto: "Preço alto comparado ao concorrente principal", contagem: 16, porcentagem: 42 },
    { texto: "Estoque do cliente dura até o fim do trimestre", contagem: 10, porcentagem: 26 },
    { texto: "Decisão depende da diretoria técnica / comitê", contagem: 7, porcentagem: 18 },
    { texto: "Solicitou envio de amostra física antes do pedido", contagem: 5, porcentagem: 14 },
  ];

  const objecoesSolo: Objecao[] = [
    { texto: "Orçamento travado até início do próximo trimestre", contagem: 6, porcentagem: 46 },
    { texto: "Pediu desconto de 8% para fechar pedido anual", contagem: 4, porcentagem: 31 },
    { texto: "Aguardando aprovação de comitê médico", contagem: 3, porcentagem: 23 },
  ];

  const visitasRecentesEquipe: VisitaExemplo[] = [
    {
      id: "v1",
      vendedor: "Ana Clara",
      iniciais: "AC",
      empresa: "Cirúrgica Campinas",
      tempo: "há 24 min",
      resumo: "Apresentação dos kits laparoscópicos para reposição mensal.",
      proximoPasso: "Enviar proposta formal revisada com tabela B",
      prazo: "18 de setembro",
      objecao: "Preço vs concorrente",
      crm: "Pipedrive (PD-0492)",
    },
    {
      id: "v2",
      vendedor: "Bruno Santos",
      iniciais: "BS",
      empresa: "Hospital São Paulo",
      tempo: "há 2h",
      resumo: "Alinhamento com comitê de suprimentos sobre cronograma de entrega.",
      proximoPasso: "Agendar demonstração técnica com chefe cirúrgica",
      prazo: "22 de setembro",
      objecao: "Comitê de Compras",
      crm: "RD Station (RD-8120)",
    },
    {
      id: "v3",
      vendedor: "Carlos Mendes",
      iniciais: "CM",
      empresa: "Policlínica Taubaté",
      tempo: "ontem",
      resumo: "Negociação de reabastecimento de descartáveis e luvas cirúrgicas.",
      proximoPasso: "Confirmar emissão do pedido para faturamento 30/60",
      prazo: "20 de setembro",
      objecao: "Estoque trimestral",
      crm: "Ploomes (PL-3310)",
    },
  ];

  const visitasRecentesSolo: VisitaExemplo[] = [
    {
      id: "vs1",
      vendedor: "Você (Consultor Autônomo)",
      iniciais: "VC",
      empresa: "Distribuidora Vale do Sol",
      tempo: "há 45 min",
      resumo: "Apresentação do catálogo de fertilizantes especiais para safra verão.",
      proximoPasso: "Enviar cotação para 1.500L com frete incluso",
      prazo: "17 de setembro",
      objecao: "Aguardando safra",
      crm: "Pipedrive (PD-0812)",
    },
    {
      id: "vs2",
      vendedor: "Você (Consultor Autônomo)",
      iniciais: "VC",
      empresa: "Agropecuária Santa Fé",
      tempo: "ontem",
      resumo: "Renovação contratual de nutrição animal para 3 unidades.",
      proximoPasso: "Enviar minuta contratual assinada",
      prazo: "21 de setembro",
      objecao: "Desconto volume",
      crm: "Sincronizado",
    },
  ];

  const handleSimularResumo = () => {
    setResumoSimuladoEnviado(true);
    avisar("Resumo semanal enviado para o e-mail cadastrado!");
  };

  const exportarCsvDemo = () => {
    const lista = modoPainel === "equipe" ? visitasRecentesEquipe : visitasRecentesSolo;
    const cabecalho = ["Vendedor", "Empresa", "Momento", "Resumo", "Objeção", "Próximo Passo", "Prazo", "CRM"];
    const linhas = lista.map((v) => [
      `"${v.vendedor.replace(/"/g, '""')}"`,
      `"${v.empresa.replace(/"/g, '""')}"`,
      `"${v.tempo.replace(/"/g, '""')}"`,
      `"${v.resumo.replace(/"/g, '""')}"`,
      `"${v.objecao.replace(/"/g, '""')}"`,
      `"${v.proximoPasso.replace(/"/g, '""')}"`,
      `"${v.prazo.replace(/"/g, '""')}"`,
      `"${v.crm.replace(/"/g, '""')}"`,
    ].join(";"));
    const csv = "\uFEFF" + [cabecalho.join(";"), ...linhas].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `doniq-demo-${modoPainel}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    avisar("Planilha CSV demonstrativa exportada!");
  };

  const handleCadastrarPiloto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !nome.trim()) return;
    setEnviando(true);
    setErro("");
    try {
      const resp = await fetch("/api/lista-espera", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          nome: nome.trim(),
          empresa: empresa.trim(),
          tamanho: tamanho.trim(),
          crm: crm.trim(),
          telefone: telefone.trim(),
          segmento: `gestor:${crm}:${tamanho.replace(/\s+/g, "_")}|${empresa.trim()}|${nome.trim()}${telefone.trim() ? `|tel:${telefone.trim()}` : ""}`.slice(0, 120),
        }),
      });
      if (!resp.ok) {
        const dados = await resp.json().catch(() => null);
        throw new Error(dados?.detail || "Falha ao registrar interesse. Tente novamente.");
      }
      setSucesso(true);
    } catch (err) {
      setErro((err as Error).message || "Falha ao registrar interesse. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060A14] text-slate-100 selection:bg-cyan-500/30 font-sans">
      {/* Toast flutuante */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-cyan-950 border border-cyan-500/40 text-cyan-200 rounded-xl shadow-2xl text-xs font-mono flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <Sparkles size={16} className="text-cyan-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* Banner de usuário conectado */}
      {estaAutenticado && (
        <div className="bg-cyan-950/80 border-b border-cyan-500/30 px-6 py-2.5 text-center text-xs font-mono text-cyan-300 flex items-center justify-center gap-3">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span>Você já está conectado ao Doniq.</span>
          <Link
            href="/login?aba=gestao"
            className="font-bold underline text-cyan-200 hover:text-white transition-colors"
          >
            Acessar Meu Cockpit Operacional Direto →
          </Link>
        </div>
      )}
      {/* Banner de Diretor Comercial vindo do Pitch */}
      {origemPitch && (
        <div className="bg-gradient-to-r from-cyan-950/95 via-blue-950/90 to-indigo-950/95 border-b border-cyan-500/40 px-4 sm:px-6 py-3.5 text-xs font-mono text-cyan-200 shadow-2xl backdrop-blur-md">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-left">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shrink-0">
                <Sparkles size={16} />
              </div>
              <div>
                <div className="font-bold text-white text-xs sm:text-sm">
                  👋 Olá, Gestor Comercial! Sua equipe recomendou o Doniq para sua operação.
                </div>
                <div className="text-slate-300 text-[11px] font-sans mt-0.5">
                  Conheça o Cockpit Executivo sem vigilância invasiva e inicie um Piloto Gratuito de 7 dias para seu time.
                </div>
              </div>
            </div>
            <a
              href="#piloto-form"
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-95 text-white font-bold text-xs shrink-0 transition-all shadow-lg shadow-cyan-950/50 cursor-pointer"
            >
              Iniciar Piloto Gratuito (7 dias) →
            </a>
          </div>
        </div>
      )}

      {/* Banner de status pós-checkout simulado */}
      {assinaturaStatus === "ok" && (
        <div className="bg-gradient-to-r from-cyan-950/90 via-emerald-950/90 to-cyan-950/90 border-b border-emerald-500/40 px-6 py-3 text-center text-xs font-mono text-emerald-300 flex items-center justify-center gap-3">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span className="font-bold">Assinatura confirmada com sucesso!</span>
          <span className="text-slate-300">Seu período de teste de 7 dias está ativo. Explore o Cockpit Gestor abaixo:</span>
        </div>
      )}
      {assinaturaStatus === "pendente" && (
        <div className="bg-amber-950/90 border-b border-amber-500/40 px-6 py-3 text-center text-xs font-mono text-amber-300 flex items-center justify-center gap-3">
          <AlertCircle size={16} className="text-amber-400" />
          <span className="font-bold">Pagamento pendente:</span>
          <span className="text-slate-300">Aguardando compensação bancária ou Pix.</span>
        </div>
      )}
      {assinaturaStatus === "cancelada" && (
        <div className="bg-slate-900 border-b border-slate-700 px-6 py-3 text-center text-xs font-mono text-slate-300 flex items-center justify-center gap-3">
          <AlertCircle size={16} className="text-slate-400" />
          <span className="font-bold">Assinatura cancelada:</span>
          <span className="text-slate-400">Simulação de encerramento de plano concluída.</span>
        </div>
      )}

      {/* Barra de Navegação Superior */}
      <header className="border-b border-slate-800/80 bg-[#060A14]/85 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2.5 group" aria-label="doniq home">
              <Marca largura={112} />
            </Link>
            <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-[10px] font-mono text-cyan-400 tracking-wider">
              ÁREA GERENCIAL DESKTOP
            </span>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/demo/mobile"
              className="text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors hidden md:inline-block"
            >
              App do Vendedor (Mobile) →
            </Link>
            <Link
              href="/precos"
              className="text-xs text-slate-400 hover:text-slate-200 transition-colors hidden sm:inline-block"
            >
              Preços
            </Link>
            {estaAutenticado ? (
              <Link
                href="/login?aba=gestao"
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-950/50 hover:opacity-95 transition-all"
              >
                Abrir Meu Cockpit →
              </Link>
            ) : (
              <Link
                href="/login?aba=gestao"
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-500/40 transition-all flex items-center gap-1.5"
              >
                <span>Entrar na Minha Conta</span>
                <ArrowRight size={14} />
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-14 pb-16 px-6 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 font-mono text-xs mb-6">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          PAINEL DE GESTÃO · EQUIPES OU CASO ÚNICO
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white max-w-4xl mx-auto leading-[1.12]">
          O ritmo da sua operação comercial{" "}
          <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
            sempre atualizado.
          </span>{" "}
          Sem cobrar ninguém.
        </h1>

        <p className="mt-5 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Seja para uma diretoria acompanhando 20 vendedores de campo ou um consultor autônomo em
          operação solo: o Doniq organiza o pós-visita em 40 segundos e dá visibilidade cirúrgica.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/login?aba=gestao"
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 text-white font-bold text-sm shadow-xl shadow-cyan-950/60 hover:opacity-95 transition-all flex items-center justify-center gap-2"
          >
            <Sparkles size={16} />
            <span>Acessar Meu Cockpit de Gestão</span>
            <ArrowRight size={16} />
          </Link>
          <a
            href="#cockpit-interativo"
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700/80 font-semibold text-sm transition-all"
          >
            Explorar Demonstração Interativa ↓
          </a>
        </div>

        {/* 3 Métricas de Impacto */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-12 max-w-3xl mx-auto text-left">
          <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl">
            <div className="text-2xl sm:text-3xl font-black text-cyan-400 font-mono">
              {reducedMotion ? "98%" : <AnimateNumber suffix="%">98</AnimateNumber>}
            </div>
            <div className="text-xs text-slate-300 mt-1 font-medium">Adesão espontânea da equipe</div>
            <p className="text-[11px] text-slate-400 mt-0.5">O vendedor poupa 15 min por visita</p>
          </div>
          <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl">
            <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
              {reducedMotion ? "40s" : <AnimateNumber suffix="s">40</AnimateNumber>}
            </div>
            <div className="text-xs text-slate-300 mt-1 font-medium">Do carro para o CRM</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Sem digitação manual noturna</p>
          </div>
          <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl">
            <div className="text-2xl sm:text-3xl font-black text-indigo-400 font-mono">
              0 áudios
            </div>
            <div className="text-xs text-slate-300 mt-1 font-medium">Pacto de Confiança Sagrado</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Gestor vê inteligência, nunca voz bruta</p>
          </div>
        </div>
      </section>

      {/* COCKPIT EXECUTIVO INTERATIVO */}
      <section id="cockpit-interativo" className="py-14 px-6 max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 font-mono text-[11px] uppercase tracking-wider mb-2 font-medium">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              Cockpit Doniq Direction D
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              Painel Operacional em Tempo Real
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Alterne entre o modo equipe e caso único para experimentar a interface exata:
            </p>
          </div>

          {/* Switcher de Modo: Equipe vs Caso Único */}
          <div className="inline-flex p-1 bg-slate-900/90 border border-slate-800 rounded-2xl self-start md:self-auto">
            <button
              type="button"
              onClick={() => setModoPainel("equipe")}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                modoPainel === "equipe"
                  ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-950/40"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Users size={15} />
              <span>Modo Equipe (Gestor)</span>
            </button>
            <button
              type="button"
              onClick={() => setModoPainel("solo")}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                modoPainel === "solo"
                  ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-950/40"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <UserCheck size={15} />
              <span>Modo Caso Único (Solo)</span>
            </button>
          </div>
        </div>

        {/* CONTAINER DO COCKPIT */}
        <div className="bg-slate-900/70 border border-slate-800/90 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur space-y-8">
          {/* Header do Cockpit Ativo */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-xl sm:text-2xl font-black text-white">
                  {modoPainel === "equipe"
                    ? "Equipe Comercial Sudeste (4 Representantes)"
                    : "Operação Comercial Individual (Consultor Solo)"}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 font-mono text-[10px] font-bold">
                  ● AO VIVO
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {modoPainel === "equipe"
                  ? "Gestor responsável: você · Fichas estruturadas alimentadas via áudio móvel."
                  : "Operação autônoma sem equipe vinculada · Indicadores pessoais de campo."}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSimularResumo}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700/60 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Mail size={14} className="text-cyan-400" />
                <span>
                  {resumoSimuladoEnviado ? "Resumo Enviado!" : "Receber Resumo por E-mail"}
                </span>
              </button>
              <Link
                href="/login?aba=gestao"
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-500/40 transition-all"
              >
                Usar com Meus Dados →
              </Link>
            </div>
          </div>

          {/* 3 KPIs Executivos Doniq */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {modoPainel === "equipe" ? (
              <>
                <div className="p-5 bg-slate-900/90 border border-slate-800/80 rounded-2xl">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                    <span className="font-medium">Visitas no Período</span>
                    <span className="text-emerald-400 font-mono font-bold">+18% vs anterior</span>
                  </div>
                  <div className="text-3xl font-black text-white font-mono">38</div>
                  <div className="text-xs text-slate-400 mt-1">4 vendedores em campo ativo</div>
                </div>

                <div className="p-5 bg-slate-900/90 border border-slate-800/80 rounded-2xl">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                    <span className="font-medium">Sincronização CRM</span>
                    <span className="text-cyan-400 font-mono font-bold">100% automático</span>
                  </div>
                  <div className="text-3xl font-black text-cyan-400 font-mono">42s</div>
                  <div className="text-xs text-slate-400 mt-1">Tempo médio de estruturação</div>
                </div>

                <div className="p-5 bg-slate-900/90 border border-slate-800/80 rounded-2xl">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                    <span className="font-medium">Cobertura de Carteira</span>
                    <span className="text-indigo-400 font-mono font-bold">38 de 45 contas</span>
                  </div>
                  <div className="text-3xl font-black text-white font-mono">84%</div>
                  <div className="text-xs text-slate-400 mt-1">Próximos passos confirmados</div>
                </div>
              </>
            ) : (
              <>
                <div className="p-5 bg-slate-900/90 border border-slate-800/80 rounded-2xl">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                    <span className="font-medium">Minhas Visitas na Semana</span>
                    <span className="text-emerald-400 font-mono font-bold">Meta: 12 (116%)</span>
                  </div>
                  <div className="text-3xl font-black text-white font-mono">14</div>
                  <div className="text-xs text-slate-400 mt-1">Todas com relato registrado</div>
                </div>

                <div className="p-5 bg-slate-900/90 border border-slate-800/80 rounded-2xl">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                    <span className="font-medium">Próximos Passos Agendados</span>
                    <span className="text-cyan-400 font-mono font-bold">Sem atrasos</span>
                  </div>
                  <div className="text-3xl font-black text-cyan-400 font-mono">11</div>
                  <div className="text-xs text-slate-400 mt-1">Propostas e retornos no prazo</div>
                </div>

                <div className="p-5 bg-slate-900/90 border border-slate-800/80 rounded-2xl">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                    <span className="font-medium">Tempo Poupado</span>
                    <span className="text-indigo-400 font-mono font-bold">~20 min / visita</span>
                  </div>
                  <div className="text-3xl font-black text-white font-mono">4h 40m</div>
                  <div className="text-xs text-slate-400 mt-1">Livre de digitação de relatórios</div>
                </div>
              </>
            )}
          </div>

          {/* Grid Principal: Radar de Objeções + Checklist de Campo */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bloco 1: Radar de Objeções Doniq */}
            <div className="p-6 bg-slate-900/90 border border-slate-800/90 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white text-base flex items-center gap-2">
                    <TrendingUp size={18} className="text-cyan-400" />
                    <span>Radar de Objeções do Mercado</span>
                  </h4>
                  <p className="text-xs text-slate-400">
                    Palavras e barreiras reais agrupadas pela inteligência Doniq
                  </p>
                </div>
                <span className="text-[11px] font-mono text-cyan-400 font-bold px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
                  TOP {modoPainel === "equipe" ? objecoesMercado.length : objecoesSolo.length}
                </span>
              </div>

              <div className="space-y-3.5 pt-2">
                {(modoPainel === "equipe" ? objecoesMercado : objecoesSolo).map((obj, i) => (
                  <div key={i} className="p-3.5 bg-slate-800/50 rounded-xl space-y-2">
                    <div className="flex items-start justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 flex items-center justify-center font-mono font-bold text-[10px] shrink-0">
                          #{i + 1}
                        </span>
                        <span className="font-medium text-slate-200 truncate">{obj.texto}</span>
                      </div>
                      <span className="font-mono text-cyan-400 font-bold shrink-0">
                        {obj.contagem} relatos ({obj.porcentagem}%)
                      </span>
                    </div>
                    <BarraProgressoDoniq valor={obj.porcentagem} maximo={50} rotulo={obj.texto} />
                  </div>
                ))}
              </div>
            </div>

            {/* Bloco 2: Checklist & Qualificação de Visita */}
            <div className="p-6 bg-slate-900/90 border border-slate-800/90 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white text-base flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-emerald-400" />
                    <span>Qualificação & Perguntas Esquecidas</span>
                  </h4>
                  <p className="text-xs text-slate-400">
                    O que a equipe fez bem e onde houve omissão no roteiro comercial
                  </p>
                </div>
                <span className="text-[11px] font-mono text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                  DIAGNÓSTICO
                </span>
              </div>

              <div className="space-y-3 pt-2">
                <div className="p-3.5 bg-slate-800/50 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="text-emerald-400 font-bold">✔</span>
                    <span className="text-slate-200">
                      Identificou o prazo de renovação do contrato atual?
                    </span>
                  </div>
                  <span className="text-emerald-400 font-mono font-bold">Feito em 84%</span>
                </div>

                <div className="p-3.5 bg-slate-800/50 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="text-emerald-400 font-bold">✔</span>
                    <span className="text-slate-200">
                      Identificou quem é o decisor final do comitê de compras?
                    </span>
                  </div>
                  <span className="text-emerald-400 font-mono font-bold">Feito em 76%</span>
                </div>

                <div className="p-3.5 bg-amber-950/20 border border-amber-500/30 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="text-amber-400 font-bold">⚠️</span>
                    <span className="text-amber-200">
                      Perguntou qual concorrente apresentou proposta recente?
                    </span>
                  </div>
                  <span className="text-amber-400 font-mono font-bold">Esquecido em 62%</span>
                </div>

                <div className="p-3.5 bg-slate-800/50 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="text-emerald-400 font-bold">✔</span>
                    <span className="text-slate-200">
                      Definiu data e horário exatos para o próximo retorno?
                    </span>
                  </div>
                  <span className="text-emerald-400 font-mono font-bold">Feito em 88%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Feed de Visitas Recentes */}
          <div className="p-6 bg-slate-900/90 border border-slate-800/90 rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-white text-base flex items-center gap-2">
                  <CalendarClock size={18} className="text-cyan-400" />
                  <span>Feed de Atividade Recente em Campo</span>
                </h4>
                <p className="text-xs text-slate-400">
                  Fichas consolidadas com próximo passo estruturado (sem áudio bruto)
                </p>
              </div>
              <div className="flex items-center gap-3 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={exportarCsvDemo}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-all cursor-pointer shadow-sm"
                  aria-label="Exportar demonstração em CSV"
                >
                  <Download size={14} className="text-cyan-400" />
                  <span>Exportar CSV</span>
                </button>
                <span className="text-xs font-mono text-slate-400">
                  {modoPainel === "equipe" ? "38 visitas sincronizadas" : "14 visitas sincronizadas"}
                </span>
              </div>
            </div>

            <div className="space-y-3 pt-1">
              {(modoPainel === "equipe" ? visitasRecentesEquipe : visitasRecentesSolo).map((v) => (
                <div
                  key={v.id}
                  className="p-4 bg-slate-800/40 border border-slate-800 rounded-2xl hover:border-slate-700/80 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 flex items-center justify-center font-bold text-xs shrink-0">
                      {v.iniciais}
                    </div>
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <strong className="text-sm text-white font-semibold">{v.empresa}</strong>
                        <span className="text-xs text-slate-400">· {v.vendedor}</span>
                        <span className="text-[11px] font-mono text-cyan-400">· {v.tempo}</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">{v.resumo}</p>
                      <div className="flex items-center gap-2 flex-wrap pt-1">
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] font-mono text-slate-300 border border-slate-700">
                          Objeção: {v.objecao}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-cyan-950/60 text-[10px] font-mono text-cyan-300 border border-cyan-500/30">
                          {v.crm}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="md:text-right shrink-0 p-3 bg-slate-900/80 border border-slate-800 rounded-xl">
                    <div className="text-[11px] text-slate-400 font-medium">Próximo Passo Confirmado</div>
                    <div className="text-xs font-semibold text-white mt-0.5">{v.proximoPasso}</div>
                    <div className="text-[11px] font-mono text-emerald-400 mt-1">Prazo: {v.prazo}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Banner de Expansão (Quando em Modo Solo) */}
          {modoPainel === "solo" && (
            <div className="p-6 bg-gradient-to-r from-cyan-950/40 via-blue-950/30 to-indigo-950/40 border border-cyan-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-white text-base flex items-center gap-2">
                  <UserPlus size={18} className="text-cyan-400" />
                  <span>Sua operação está crescendo?</span>
                </h4>
                <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
                  Você pode transformar este painel individual em uma equipe a qualquer momento.
                  Basta convidar seus representantes e acompanhar as visitas de todos sem perder seu
                  histórico individual.
                </p>
              </div>
              <Link
                href="/login?aba=gestao"
                className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-500/40 transition-all shrink-0 text-center"
              >
                Criar Equipe Agora →
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* O PACTO DE CONFIANÇA (Invariante Sagrada) */}
      <section className="py-16 px-6 bg-slate-900/40 border-y border-slate-800/80">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider font-semibold">
              Invariante de Privacidade
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mt-1">
              O Pacto de Confiança com a Sua Equipe
            </h2>
            <p className="text-sm text-slate-300 mt-2 leading-relaxed">
              O maior motivo de falha em CRMs tradicionais é o vendedor sentir que está sendo
              vigiado. No Doniq, a regra é clara e inviolável:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* O que a Liderança Vê */}
            <div className="p-6 bg-emerald-950/15 border border-emerald-500/30 rounded-3xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold text-lg">
                  ✓
                </div>
                <div>
                  <h3 className="font-bold text-emerald-300 text-base">O que a Liderança Acompanha</h3>
                  <p className="text-xs text-slate-400">Inteligência comercial agregada e clara</p>
                </div>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">✔</span>
                  <span>
                    <strong>Fichas comerciais estruturadas:</strong> Cliente, contato, próximo passo
                    e prazo confirmado.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">✔</span>
                  <span>
                    <strong>Radar de Objeções:</strong> O que os clientes estão dizendo sobre preço,
                    prazos e concorrentes.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">✔</span>
                  <span>
                    <strong>Ritmo de campo:</strong> Vendedores ativos no período e clientes sem
                    contato recente.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">✔</span>
                  <span>
                    <strong>Sincronização com CRM:</strong> Atualização de negócios no Pipedrive,
                    Ploomes ou RD Station.
                  </span>
                </li>
              </ul>
            </div>

            {/* O que o Gestor NUNCA Vê */}
            <div className="p-6 bg-slate-900/90 border border-slate-800 rounded-3xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 font-bold text-lg">
                  🔒
                </div>
                <div>
                  <h3 className="font-bold text-slate-200 text-base">O que NUNCA Sai do Celular</h3>
                  <p className="text-xs text-slate-400">Garantia técnica protegida por código</p>
                </div>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-400">
                <li className="flex items-start gap-2">
                  <span className="text-rose-400 font-bold">✕</span>
                  <span>
                    <strong>Áudios brutos de voz:</strong> O gestor jamais tem acesso aos arquivos
                    de áudio ou à fala gravada do vendedor.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-400 font-bold">✕</span>
                  <span>
                    <strong>Transcrições literais de desabafo:</strong> Hesitações, desabafos e vícios de fala
                    são descartados após a síntese da ficha estruturada.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-400 font-bold">✕</span>
                  <span>
                    <strong>Microfone sempre aberto:</strong> A captura só ocorre quando o vendedor
                    toca conscientemente no botão.
                  </span>
                </li>
              </ul>
              <div className="mt-4 p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 text-[11px] text-slate-300">
                🛡️ <strong>Garantia de Alta Adesão:</strong> O vendedor fala abertamente porque o Doniq
                é sua ferramenta pessoal de alívio e produtividade, não uma escuta corporativa.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Ecossistema de Integrações */}
      <section className="py-14 border-b border-slate-800/80 bg-slate-950/40">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-xs font-mono uppercase text-cyan-400 tracking-wider mb-2 font-semibold">
            Ecossistema de Integrações
          </p>
          <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
            Compatível com o CRM que a sua equipe já utiliza
          </h3>
          <p className="text-xs text-slate-400 max-w-lg mx-auto mb-6">
            O Doniq conecta via API oficial ou webhook, preenchendo campos customizados e
            oportunidades sem trocar de ferramenta.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2">
            {[
              "Pipedrive",
              "RD Station CRM",
              "HubSpot",
              "Ploomes",
              "Salesforce",
              "Agendor",
              "Moskit CRM",
            ].map((crmNome) => (
              <span
                key={crmNome}
                className="px-3.5 py-1.5 rounded-xl text-xs font-mono bg-slate-900 border border-slate-800 text-slate-300"
              >
                {crmNome}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Calculadora Interativa de Retorno e Produtividade Comercial */}
      <section className="py-16 px-4 sm:px-6 max-w-5xl mx-auto border-t border-slate-800/80">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider font-semibold">
            Simulador de Impacto Financeiro
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mt-1">
            Quanto Tempo e Dinheiro Sua Equipe Recupera?
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-2">
            Eliminar o preenchimento manual de CRM no fim do dia devolve horas valiosas para visitas de prospecção ativa.
          </p>
        </div>

        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800/90 shadow-2xl backdrop-blur grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-6 space-y-6">
            <div>
              <div className="flex items-center justify-between text-xs font-mono mb-2">
                <label htmlFor="calc-vendedores" className="text-slate-300 font-sans font-medium">
                  Vendedores em Campo:
                </label>
                <span className="text-cyan-400 font-bold text-sm">
                  {calcVendedores} {calcVendedores === 1 ? "vendedor" : "vendedores"}
                </span>
              </div>
              <input
                id="calc-vendedores"
                type="range"
                min={1}
                max={50}
                value={calcVendedores}
                onChange={(e) => setCalcVendedores(Number(e.target.value))}
                aria-label="Vendedores em campo"
                className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-800 rounded-lg appearance-none"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-1">
                <span>1 (Solo)</span>
                <span>15</span>
                <span>30</span>
                <span>50</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-mono mb-2">
                <label htmlFor="calc-visitas" className="text-slate-300 font-sans font-medium">
                  Média de Visitas por Dia / Vendedor:
                </label>
                <span className="text-cyan-400 font-bold text-sm">
                  {calcVisitasDia} {calcVisitasDia === 1 ? "visita" : "visitas"}
                </span>
              </div>
              <input
                id="calc-visitas"
                type="range"
                min={1}
                max={10}
                value={calcVisitasDia}
                onChange={(e) => setCalcVisitasDia(Number(e.target.value))}
                aria-label="Média de visitas por dia"
                className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-800 rounded-lg appearance-none"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-1">
                <span>1</span>
                <span>4 (padrão)</span>
                <span>8</span>
                <span>10</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-400 leading-relaxed">
              💡 Premissa conservadora: 20 minutos poupados por visita (digitação, consolidação e envio ao CRM) com custo operacional médio de R$ 45/hora por profissional comercial.
            </div>
          </div>

          <div className="lg:col-span-6 bg-gradient-to-br from-slate-950 via-[#060B16] to-cyan-950/30 p-6 rounded-2xl border border-cyan-500/20 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
              <span className="text-xs text-slate-400">Tempo Devolvido à Equipe</span>
              <span className="text-2xl sm:text-3xl font-black font-mono text-white">
                {horasEconomizadasMes}h <span className="text-xs font-sans text-slate-400">/ mês</span>
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
              <span className="text-xs text-slate-400">Economia em Horas Comerciais</span>
              <span className="text-xl sm:text-2xl font-black font-mono text-emerald-400">
                R$ {economiaFinanceira.toLocaleString("pt-BR")} <span className="text-xs font-sans text-slate-400">/ mês</span>
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
              <span className="text-xs text-slate-400">Investimento Doniq</span>
              <span className="text-base font-bold font-mono text-slate-300">
                R$ {investimentoDoniq.toLocaleString("pt-BR")} <span className="text-xs font-sans text-slate-400">/ mês</span>
              </span>
            </div>

            <div className="pt-1 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator size={18} className="text-cyan-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">Retorno Estimado</span>
              </div>
              <div className="px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-mono font-bold text-sm">
                ~{multiplicadorROI}x ROI
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Formulário de Piloto B2B ou Ativação */}
      <section id="piloto-form" className="py-16 px-4 sm:px-6 bg-slate-900/40 border-t border-slate-800/80">
        <div className="max-w-xl mx-auto">
          <div className="text-center mb-6">
            <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider font-semibold">
              Piloto Corporativo
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mt-1">
              Inicie um Piloto de 7 Dias com Sua Equipe
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-2">
              Teste o Doniq sem compromisso com até 5 vendedores. Acompanhe a taxa de adesão e
              qualidade das fichas.
            </p>
          </div>

          {/* Garantia de Adesão Ética de 80% */}
          <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-2 mb-6 text-left">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs font-mono">
              <ShieldCheck size={16} />
              <span>Garantia de Adesão Ética de 80%</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Teste o Doniq por 7 dias com até 5 vendedores. Se na primeira semana a equipe não registrar com satisfação mais de 80% das visitas realizadas, o piloto é encerrado com custo zero e sem nenhuma cobrança. Nossa métrica é o hábito do vendedor, não a vigilância.
            </p>
          </div>

          {sucesso ? (
            <div className="p-6 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl text-center space-y-3">
              <CheckCircle2 size={36} className="text-emerald-400 mx-auto" />
              <h3 className="font-bold text-white text-base">Solicitação Enviada com Sucesso!</h3>
              <p className="text-xs text-slate-300 leading-relaxed max-w-md mx-auto">
                Nossa equipe entrará em contato em menos de 2 horas úteis via WhatsApp e pelo
                e-mail fornecido.
              </p>
            </div>
          ) : (
            <form onSubmit={handleCadastrarPiloto} className="space-y-4">
              {erro && (
                <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle size={16} />
                  <span>{erro}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="piloto-nome" className="block text-xs font-medium text-slate-300 mb-1">Seu Nome</label>
                  <input
                    id="piloto-nome"
                    type="text"
                    required
                    aria-label="Seu Nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Carlos Silva"
                    className="w-full h-11 px-3.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>
                <div>
                  <label htmlFor="piloto-email" className="block text-xs font-medium text-slate-300 mb-1">E-mail Corporativo</label>
                  <input
                    id="piloto-email"
                    type="email"
                    required
                    aria-label="E-mail Corporativo"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="carlos@empresa.com.br"
                    className="w-full h-11 px-3.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="piloto-empresa" className="block text-xs font-medium text-slate-300 mb-1">Nome da Empresa</label>
                  <input
                    id="piloto-empresa"
                    type="text"
                    aria-label="Nome da Empresa"
                    value={empresa}
                    onChange={(e) => setEmpresa(e.target.value)}
                    placeholder="Ex: Cirúrgica Brasil"
                    className="w-full h-11 px-3.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>
                <div>
                  <label htmlFor="piloto-telefone" className="block text-xs font-medium text-slate-300 mb-1">WhatsApp / Telefone</label>
                  <input
                    id="piloto-telefone"
                    type="tel"
                    aria-label="WhatsApp ou Telefone"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    placeholder="(11) 98765-4321"
                    className="w-full h-11 px-3.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="piloto-tamanho" className="block text-xs font-medium text-slate-300 mb-1">Tamanho da Equipe</label>
                  <select
                    id="piloto-tamanho"
                    aria-label="Tamanho da Equipe"
                    value={tamanho}
                    onChange={(e) => setTamanho(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-cyan-500 transition-colors"
                  >
                    <option value="1 vendedor">1 consultor (Operação Solo)</option>
                    <option value="2 a 5 vendedores">2 a 5 vendedores</option>
                    <option value="5 a 15 vendedores">5 a 15 vendedores</option>
                    <option value="16 a 50 vendedores">16 a 50 vendedores</option>
                    <option value="Mais de 50 vendedores">Mais de 50 vendedores</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="piloto-crm" className="block text-xs font-medium text-slate-300 mb-1">CRM Utilizado</label>
                  <select
                    id="piloto-crm"
                    aria-label="CRM Utilizado"
                    value={crm}
                    onChange={(e) => setCrm(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-cyan-500 transition-colors"
                  >
                    <option value="pipedrive">Pipedrive</option>
                    <option value="rdstation">RD Station CRM</option>
                    <option value="hubspot">HubSpot</option>
                    <option value="ploomes">Ploomes</option>
                    <option value="salesforce">Salesforce</option>
                    <option value="outro">Outro / Planilhas</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={enviando}
                className="w-full h-12 mt-2 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 text-white font-bold text-xs shadow-xl shadow-cyan-950/60 hover:opacity-95 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {enviando ? "Registrando interesse…" : "Solicitar Contato de Especialista →"}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Rodapé */}
      <footer className="border-t border-slate-800/80 py-8 px-6 text-center text-xs text-slate-500 space-y-2">
        <p>Doniq · O assistente de voz e gestão de visitas para representantes comerciais.</p>
        <div className="flex items-center justify-center gap-4 text-slate-400">
          <Link href="/precos" className="hover:text-slate-200 transition-colors">
            Preços
          </Link>
          <span>·</span>
          <Link href="/privacidade" className="hover:text-slate-200 transition-colors">
            Privacidade & LGPD
          </Link>
          <span>·</span>
          <Link href="/demo/mobile" className="hover:text-slate-200 transition-colors">
            Simulador Mobile
          </Link>
        </div>
      </footer>
    </div>
  );
}
