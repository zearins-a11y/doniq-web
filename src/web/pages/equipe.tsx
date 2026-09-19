/* eslint-disable max-lines */
/**
 * Aba Gestão / Cockpit Executivo (equipe.tsx).
 *
 * Direção Visual: Doniq Direction D / Dark Obsidian High-Craft.
 *
 * Uma tela, três estados honestos:
 *   - sem equipe ou caso único: Cockpit Individual imediato com ritmo e inteligência comercial,
 *     mais card para expansão de equipe;
 *   - vendedor dentro de uma equipe: vê quem é o gestor e o pacto de privacidade transparente;
 *   - gestor de equipe: cockpit com KPIs executivos, radar de mercado, atividade recente e gente.
 *
 * Invariante Sagrada de Privacidade:
 *   O que esta tela NUNCA mostra: áudio bruto ou transcrição literal de visitas.
 *   O gestor só tem acesso aos metadados estruturados (empresa, objeção, próximo passo).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  BookOpen,
  Building2,
  CalendarClock,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  Lightbulb,
  ListChecks,
  Mail,
  MessageSquare,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserPlus,
  UserRoundX,
  Users,
  X,
} from "lucide-react";
import {
  type ConviteEquipe,
  type EstadoEmail,
  type MinhaEquipe,
  type PainelEquipe,
  type ResumoEnviado,
  type Verticais,
  api,
} from "../lib/api";
import { dataLegivel } from "../lib/formato";
import { FaixaCobranca } from "../components/faixa-cobranca";
import { useEsconderGuia } from "../components/guia";
import { analisarObjecao } from "../lib/objecoes";
import { gerarVariantesFollowup } from "../lib/followup";
import { avaliarRiscoSilencio } from "../lib/sla-retomada";

/** Barra de progresso Doniq customizada com trilha suave e gradiente da marca. */
function BarraProgresso({
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

export default function EquipeTela({ avisar }: { avisar: (m: string) => void }) {
  useEsconderGuia();
  const [dados, setDados] = useState<MinhaEquipe | null>(null);
  const [painel, setPainel] = useState<PainelEquipe | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [nomeEquipe, setNomeEquipe] = useState("");
  const [emailConvite, setEmailConvite] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [linkNovo, setLinkNovo] = useState("");
  const [copiadoLink, setCopiadoLink] = useState(false);
  const [filtroVendedor, setFiltroVendedor] = useState("todos");
  const [emailSaiu, setEmailSaiu] = useState(true);
  const [conviteDesviado, setConviteDesviado] = useState(false);
  const [estadoEmail, setEstadoEmail] = useState<EstadoEmail | null>(null);
  const [resumo, setResumo] = useState<ResumoEnviado | null>(null);
  const [enviandoResumo, setEnviandoResumo] = useState(false);
  const [copiadoPitch, setCopiadoPitch] = useState(false);
  const [sincronizandoRelato, setSincronizandoRelato] = useState("");
  const [verticaisData, setVerticaisData] = useState<Verticais | null>(null);
  const [verticalAtiva, setVerticalAtiva] = useState<string>("geral");
  const [tipoRoteiro, setTipoRoteiro] = useState<string>("prospeccao");
  const [salvandoVertical, setSalvandoVertical] = useState(false);
  const [relatoRoteiroAberto, setRelatoRoteiroAberto] = useState<string | null>(null);
  const [objecaoSelecionada, setObjecaoSelecionada] = useState<{ texto: string; categoria?: string } | null>(null);
  const [copiadoPlaybook, setCopiadoPlaybook] = useState(false);
  const [filtroUltimas, setFiltroUltimas] = useState<"todas" | "quente" | "morna" | "fria" | "objecao" | "pendente" | "esfriando">("todas");
  const [buscaUltimas, setBuscaUltimas] = useState("");
  const [vendedorUltimas, setVendedorUltimas] = useState("todos");

  const leadsEsfriando = useMemo(() => {
    return (painel?.ultimas || []).filter((f) => {
      const diag = avaliarRiscoSilencio({
        relato_id: f.relato_id,
        empresa: f.empresa,
        contato: f.contato,
        temperatura: f.temperatura,
        objecao: f.objecao,
        proxima_acao: f.proxima_acao,
        data_iso: f.data_iso,
        dia_visita: f.dia_visita,
        created_at: f.created_at,
      });
      return diag.gravidade === "critico" || diag.gravidade === "atencao";
    });
  }, [painel?.ultimas]);

  const ultimasFiltradas = useMemo(() => {
    const b = buscaUltimas.trim().toLowerCase();
    return (painel?.ultimas || []).filter((f) => {
      if (vendedorUltimas !== "todos" && f.user_id !== vendedorUltimas) return false;
      if (filtroUltimas === "quente" || filtroUltimas === "morna" || filtroUltimas === "fria") {
        if (f.temperatura !== filtroUltimas) return false;
      } else if (filtroUltimas === "objecao") {
        if (!f.objecao?.trim()) return false;
      } else if (filtroUltimas === "pendente") {
        const pendente = Boolean(f.proxima_acao) && !f.data_iso;
        if (!pendente) return false;
      } else if (filtroUltimas === "esfriando") {
        const diag = avaliarRiscoSilencio({
          relato_id: f.relato_id,
          empresa: f.empresa,
          contato: f.contato,
          temperatura: f.temperatura,
          objecao: f.objecao,
          proxima_acao: f.proxima_acao,
          data_iso: f.data_iso,
          dia_visita: f.dia_visita,
          created_at: f.created_at,
        });
        if (diag.gravidade !== "critico" && diag.gravidade !== "atencao") return false;
      }

      if (!b) return true;
      const alvo = [f.empresa, f.contato, f.resumo, f.objecao, f.proxima_acao].join(" ").toLowerCase();
      return alvo.includes(b);
    });
  }, [painel?.ultimas, filtroUltimas, buscaUltimas, vendedorUltimas]);

  const PITCH_DIRETORIA =
    "Olá! Estou utilizando o Doniq para relatar minhas visitas comerciais por voz logo após sair dos clientes e manter o CRM atualizado sem digitação manual noturna.\n\n" +
    "Eles possuem um Painel Executivo para equipes com métricas em tempo real, proteção de privacidade dos vendedores e piloto gratuito de 7 dias para todo o time comercial.\n\n" +
    "Dá uma olhada no cockpit deles aqui: https://app.doniq.com.br/gestao?origem=pitch_vendedor";

  const copiarPitch = async () => {
    try {
      await navigator.clipboard.writeText(PITCH_DIRETORIA);
      setCopiadoPitch(true);
      setTimeout(() => setCopiadoPitch(false), 2200);
      avisar("Pitch para a diretoria copiado!");
    } catch {
      avisar("Não foi possível copiar automaticamente.");
    }
  };

  const exportarCsv = () => {
    if (!painel?.ultimas || painel.ultimas.length === 0) {
      avisar("Nenhuma visita para exportar no momento.");
      return;
    }
    const cabecalho = ["Data", "Vendedor", "Empresa", "Temperatura", "Resumo", "Objeção", "Próximo Passo", "Prazo"];
    const linhas = painel.ultimas.map((f) => {
      const vendedorNome = dados?.pessoas.find((p) => p.user_id === f.user_id)?.nome || f.user_id || "Vendedor";
      return [
        `"${f.dia_visita || ""}"`,
        `"${vendedorNome.replace(/"/g, '""')}"`,
        `"${(f.empresa || "").replace(/"/g, '""')}"`,
        `"${(f.temperatura || "").replace(/"/g, '""')}"`,
        `"${(f.resumo || "").replace(/"/g, '""')}"`,
        `"${(f.objecao || "").replace(/"/g, '""')}"`,
        `"${(f.proxima_acao || "").replace(/"/g, '""')}"`,
        `"${(f.data_iso || "").replace(/"/g, '""')}"`,
      ].join(";");
    });
    const csv = "\uFEFF" + [cabecalho.join(";"), ...linhas].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `doniq-relatos-equipe-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    avisar("Planilha CSV exportada com sucesso!");
  };

  const carregar = useCallback(async () => {
    setErro("");
    try {
      const d = await api.minhaEquipe();
      setDados(d);
      // Sempre carrega o painel se for gestor OU se for caso único (sem equipe ainda)
      if (d.papel === "gestor" || !d.equipe) {
        const p = await api.painelEquipe().catch(() => null);
        setPainel(p);
        if (d.papel === "gestor") {
          setEstadoEmail(await api.estadoEmail().catch(() => null));
        }
      } else {
        setPainel(null);
      }
      const v = await api.verticais().catch(() => null);
      if (v) {
        setVerticaisData(v);
        setVerticalAtiva(v.atual);
        setTipoRoteiro(v.tipo_padrao || "prospeccao");
      }
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const trocarVerticalPreview = async (id: string) => {
    try {
      const v = await api.verticais({ vertical: id });
      setVerticaisData(v);
      setVerticalAtiva(id);
    } catch {
      setVerticalAtiva(id);
    }
  };

  const salvarVerticalOperacao = async () => {
    setSalvandoVertical(true);
    try {
      await api.salvarPerfil({ vertical: verticalAtiva });
      avisar(`Segmento comercial atualizado para ${verticaisData?.lista.find((v) => v.id === verticalAtiva)?.curto || verticalAtiva}!`);
      await carregar();
    } catch (err) {
      avisar((err as Error).message);
    } finally {
      setSalvandoVertical(false);
    }
  };

  const handleReenviarRelato = async (relatoId: string, provedor?: string) => {
    setSincronizandoRelato(relatoId);
    try {
      const res = await api.sincronizarRelato(relatoId, provedor as never);
      const sucesso = res.resultados.some((r) => r.status === "enviado");
      const primeiro = res.resultados[0];
      if (sucesso) {
        avisar(`Sincronizado com ${primeiro?.provedor || provedor || "o CRM"} com sucesso!`);
      } else {
        avisar(`Falha ao sincronizar: ${primeiro?.erro || "Verifique as configurações do CRM"}`);
      }
      await carregar();
    } catch (e) {
      avisar((e as Error).message);
    } finally {
      setSincronizandoRelato("");
    }
  };

  const criar = async () => {
    setOcupado(true);
    try {
      await api.criarEquipe(nomeEquipe);
      setNomeEquipe("");
      avisar("Equipe criada com sucesso.");
      await carregar();
    } catch (e) {
      avisar((e as Error).message);
    } finally {
      setOcupado(false);
    }
  };

  const convidar = async () => {
    if (!emailConvite.includes("@")) return avisar("Escreva um e-mail válido.");
    setOcupado(true);
    try {
      const r = await api.convidar(emailConvite.trim());
      setEmailConvite("");
      setLinkNovo(r.link.startsWith("/") ? `${window.location.origin}${r.link}` : r.link);
      setEmailSaiu(r.email_enviado);
      setConviteDesviado(Boolean(r.email_desviado));
      avisar(
        !r.email_enviado
          ? "Convite criado. Copie o link."
          : r.email_desviado
            ? "Convite criado. O e-mail foi para a caixa de teste."
            : "Convite enviado por e-mail.",
      );
      await carregar();
    } catch (e) {
      avisar((e as Error).message);
    } finally {
      setOcupado(false);
    }
  };

  const pedirResumo = async () => {
    setEnviandoResumo(true);
    setResumo(null);
    try {
      const r = await api.resumoSemanal();
      setResumo(r);
      avisar(
        !r.enviado
          ? "O envio está desligado. O resumo está disponível na tela."
          : r.desviado
            ? "Resumo enviado para a caixa de teste."
            : `Resumo enviado para ${r.para}.`,
      );
    } catch (e) {
      avisar((e as Error).message);
    } finally {
      setEnviandoResumo(false);
    }
  };

  const copiar = async (texto: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiadoLink(true);
      setTimeout(() => setCopiadoLink(false), 2200);
      avisar("Copiado para a área de transferência.");
    } catch {
      avisar("Não foi possível copiar automaticamente.");
    }
  };

  const revogar = async (c: ConviteEquipe) => {
    setOcupado(true);
    try {
      await api.revogarConvite(c.convite_id);
      avisar("Convite cancelado.");
      await carregar();
    } catch (e) {
      avisar((e as Error).message);
    } finally {
      setOcupado(false);
    }
  };

  const remover = async (userId: string, nome: string) => {
    if (!window.confirm(`Remover ${nome} da equipe? Os relatos continuam preservados na conta dele.`)) return;
    setOcupado(true);
    try {
      await api.removerDaEquipe(userId);
      avisar("Membro removido da equipe.");
      await carregar();
    } catch (e) {
      avisar((e as Error).message);
    } finally {
      setOcupado(false);
    }
  };

  const sair = async () => {
    if (!window.confirm("Deseja sair desta equipe? O gestor deixará de visualizar seus novos relatórios.")) return;
    setOcupado(true);
    try {
      await api.sairDaEquipe();
      avisar("Você saiu da equipe.");
      await carregar();
    } catch (e) {
      avisar((e as Error).message);
    } finally {
      setOcupado(false);
    }
  };

  /* ---------------------------------------------- Carregando */
  if (carregando) {
    return (
      <div className="space-y-6 animate-pulse py-2" aria-label="Carregando cockpit de gestão">
        <div className="h-24 bg-slate-900/60 border border-slate-800/80 rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="h-28 bg-slate-900/60 border border-slate-800/80 rounded-2xl" />
          <div className="h-28 bg-slate-900/60 border border-slate-800/80 rounded-2xl" />
          <div className="h-28 bg-slate-900/60 border border-slate-800/80 rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-80 bg-slate-900/60 border border-slate-800/80 rounded-2xl" />
          <div className="h-80 bg-slate-900/60 border border-slate-800/80 rounded-2xl" />
        </div>
      </div>
    );
  }

  /* ---------------------------------------------- Erro */
  if (erro) {
    return (
      <div className="p-6 bg-rose-950/25 border border-rose-500/30 rounded-2xl text-rose-300" role="alert">
        <div className="flex items-center gap-3 mb-2">
          <AlertCircle size={22} className="text-rose-400" />
          <h3 className="font-bold text-white text-base">Não foi possível carregar a equipe</h3>
        </div>
        <p className="text-sm text-slate-300 mb-4">{erro}</p>
        <button
          type="button"
          className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer"
          onClick={() => void carregar()}
        >
          Tentar de novo
        </button>
      </div>
    );
  }

  if (!dados) {
    return (
      <div className="p-6 bg-slate-900/70 border border-slate-800/80 rounded-2xl text-slate-300">
        Não foi possível carregar as informações de equipe.
      </div>
    );
  }

  /* ---------------------------------------------- Vendedor dentro de equipe */
  if (dados.equipe && dados.papel !== "gestor") {
    const gestores = dados.pessoas.filter((p) => p.papel === "gestor");
    return (
      <div className="space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 font-mono text-[11px] uppercase tracking-wider mb-2 font-medium">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              Membro da Equipe
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              {dados.equipe.nome}
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-xl">
              Você está conectado como vendedor nesta operação.
            </p>
          </div>
          <button
            type="button"
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-rose-300 hover:text-rose-200 bg-rose-950/20 hover:bg-rose-950/40 border border-rose-500/30 transition-all cursor-pointer self-start sm:self-center"
            onClick={sair}
            disabled={ocupado}
          >
            {ocupado ? "Saindo…" : "Sair da equipe"}
          </button>
        </header>

        <FaixaCobranca contexto="equipe" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 bg-slate-900/70 border border-slate-800/80 rounded-2xl shadow-xl backdrop-blur space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400">
                <Users size={20} />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Transparência & Gestão</h3>
                <p className="text-xs text-slate-400">Acompanhamento honesto de resultados</p>
              </div>
            </div>

            {gestores.length > 0 && (
              <p className="text-sm text-slate-300">
                Gestor responsável:{" "}
                <strong className="text-white font-medium">
                  {gestores.map((g) => g.nome || g.email).join(", ")}
                </strong>
              </p>
            )}

            <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-xl text-xs text-slate-300 leading-relaxed">
              <div className="flex items-center gap-2 text-emerald-400 font-bold mb-1.5">
                <ShieldCheck size={16} />
                Pacto de Confiança Doniq
              </div>
              O gestor acompanha as fichas estruturadas (empresa, objeção, próximo passo e perguntas esquecidas). Ele{" "}
              <strong className="text-white">nunca</strong> tem acesso aos arquivos de áudio nem às frases literais faladas no carro.
            </div>
          </div>

          <div className="p-6 bg-slate-900/70 border border-slate-800/80 rounded-2xl shadow-xl backdrop-blur space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-base">Quem Está na Equipe</h3>
              <span className="text-xs font-mono text-slate-400">
                {dados.pessoas.length} pessoa{dados.pessoas.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="space-y-2.5">
              {dados.pessoas.map((p) => (
                <div
                  key={p.user_id}
                  className="p-3 bg-slate-800/40 border border-slate-800 rounded-xl flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-[10px] font-mono font-bold text-cyan-300">
                      {(p.nome || p.email).slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-slate-200 truncate">
                      {p.nome || p.email}
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono uppercase tracking-wider bg-slate-800 border border-slate-700 text-slate-300">
                    {p.papel}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------- Sem equipe e sem dados de painel (Estado Inicial) */
  if (!dados.equipe && !painel) {
    return (
      <div className="space-y-6">
        <FaixaCobranca contexto="equipe" />
        <div className="max-w-xl mx-auto p-8 bg-slate-900/80 border border-slate-800/90 rounded-3xl shadow-2xl backdrop-blur text-center space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400 mx-auto shadow-inner">
            <Users size={28} />
          </div>
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 font-mono text-[11px] uppercase tracking-wider mb-2 font-medium">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              Central de Gestão Comercial
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Reúna sua operação em um só lugar
            </h2>
            <p className="text-sm text-slate-300 mt-2 max-w-md mx-auto leading-relaxed">
              Crie uma equipe para acompanhar o ritmo de visitas, sinais de mercado e objeções em tempo real sem microgerenciamento.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void criar();
            }}
            className="space-y-4 text-left"
          >
            <div>
              <label className="text-xs font-mono uppercase tracking-wider text-slate-400 block mb-1.5" htmlFor="nome-equipe-inicio">
                Nome da Equipe
              </label>
              <input
                id="nome-equipe-inicio"
                className="w-full px-4 py-3.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500 transition-all"
                value={nomeEquipe}
                placeholder="Ex.: Comercial Sudeste"
                aria-label="Nome da equipe"
                onChange={(e) => setNomeEquipe(e.target.value)}
              />
            </div>
            <button
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:opacity-95 text-white font-bold text-sm shadow-xl shadow-cyan-950/60 transition-all disabled:opacity-50 cursor-pointer"
              type="submit"
              disabled={ocupado || !nomeEquipe.trim()}
            >
              {ocupado ? "Criando equipe…" : "Criar Equipe Comercial →"}
            </button>
          </form>

          <div className="p-4 bg-emerald-950/20 border border-emerald-500/25 rounded-2xl text-xs text-slate-300 text-left flex items-start gap-3">
            <ShieldCheck size={18} className="text-emerald-400 shrink-0 mt-0.5" />
            <span>
              <strong>Garantia de Confiança:</strong> O gestor vê os dados consolidados da visita. Ele <strong>não</strong> tem acesso aos áudios brutos originais.
            </span>
          </div>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------- Cockpit Executivo (Solo ou Gestor de Equipe) */
  const isSolo = !dados.equipe || Boolean(painel?.modo_solo);
  const maxMes = painel ? Math.max(1, ...painel.vendedores.map((v) => v.mes)) : 1;
  const totalObjecoes = painel?.objecoes ? painel.objecoes.reduce((acc, o) => acc + o.vezes, 0) : 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Topo Executivo */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 font-mono text-[11px] uppercase tracking-wider mb-2 font-medium">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            {isSolo ? "Cockpit Comercial · Operação Individual" : "Cockpit Executivo · Gestão de Equipe"}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            {dados.equipe?.nome || painel?.equipe_nome || "Operação Individual"}
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
            {isSolo
              ? "Acompanhe seu ritmo de visitas, sinais de objeções e evolução comercial individual."
              : "Acompanhe ritmo, sinais comerciais e ações da equipe com proteção absoluta de privacidade."}
          </p>
        </div>
        <div className="flex items-center gap-2.5 self-start sm:self-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-mono text-slate-300">
            <Users size={15} className="text-cyan-400" aria-hidden="true" />
            <span>
              {isSolo
                ? "Operação individual"
                : `${dados.pessoas.length} pessoa${dados.pessoas.length === 1 ? "" : "s"}`}
            </span>
          </div>
        </div>
      </header>

      {/* Faixa de cobrança e status do plano */}
      <FaixaCobranca contexto="equipe" />

      {painel && (
        <>
          {/* Métricas Principais (4 Cards de KPI) */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" aria-label="Resumo da operação">
            <article className="p-5 bg-slate-900/70 border border-slate-800/80 rounded-2xl relative overflow-hidden backdrop-blur shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-medium">
                  Últimos 7 dias
                </span>
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400">
                  <BarChart3 size={18} />
                </div>
              </div>
              <div className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">
                {painel.equipe.semana}
              </div>
              <div className="text-xs font-semibold text-slate-200 mt-1">Visitas registradas</div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {isSolo ? "Seu ritmo recente" : "Ritmo recente da equipe"}
              </div>
            </article>

            <article className="p-5 bg-slate-900/70 border border-slate-800/80 rounded-2xl relative overflow-hidden backdrop-blur shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-medium">
                  Últimos 30 dias
                </span>
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-blue-400">
                  <CalendarClock size={18} />
                </div>
              </div>
              <div className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">
                {painel.equipe.mes}
              </div>
              <div className="text-xs font-semibold text-slate-200 mt-1">Visitas no mês</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Volume consolidado</div>
            </article>

            <article
              className={`p-5 rounded-2xl relative overflow-hidden backdrop-blur shadow-xl border ${
                isSolo
                  ? painel.equipe.semana === 0
                    ? "bg-amber-950/20 border-amber-500/30"
                    : "bg-emerald-950/20 border-emerald-500/30"
                  : painel.sem_visita_na_semana > 0
                    ? "bg-amber-950/20 border-amber-500/30"
                    : "bg-emerald-950/20 border-emerald-500/30"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span
                  className={`text-xs font-mono uppercase tracking-wider font-medium ${
                    isSolo
                      ? painel.equipe.semana === 0
                        ? "text-amber-400"
                        : "text-emerald-400"
                      : painel.sem_visita_na_semana > 0
                        ? "text-amber-400"
                        : "text-emerald-400"
                  }`}
                >
                  {isSolo ? "Consistência" : "Acompanhamento"}
                </span>
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                    isSolo
                      ? painel.equipe.semana === 0
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                        : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      : painel.sem_visita_na_semana > 0
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                        : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  }`}
                >
                  {isSolo ? (
                    painel.equipe.semana > 0 ? (
                      <ShieldCheck size={18} />
                    ) : (
                      <Sparkles size={18} />
                    )
                  ) : painel.sem_visita_na_semana > 0 ? (
                    <UserRoundX size={18} />
                  ) : (
                    <ShieldCheck size={18} />
                  )}
                </div>
              </div>
              <div
                className={`text-3xl sm:text-4xl font-black font-mono tracking-tight ${
                  isSolo
                    ? painel.equipe.semana === 0
                      ? "text-amber-400"
                      : "text-emerald-400"
                    : painel.sem_visita_na_semana > 0
                      ? "text-amber-400"
                      : "text-emerald-400"
                }`}
              >
                {isSolo
                  ? painel.equipe.semana > 0
                    ? "Ativo"
                    : "0"
                  : painel.sem_visita_na_semana}
              </div>
              <div className="text-xs font-semibold text-slate-200 mt-1">
                {isSolo ? "Ritmo na semana" : "Sem visita na semana"}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {isSolo
                  ? painel.equipe.semana > 0
                    ? "Visitas registradas recentemente"
                    : "Grave seu próximo relato"
                  : painel.sem_visita_na_semana > 0
                    ? "Pede acompanhamento com vendedores"
                    : "Equipe em movimento"}
              </div>
            </article>

            <article
              className={`p-5 rounded-2xl relative overflow-hidden backdrop-blur shadow-xl border ${
                leadsEsfriando.length > 0
                  ? "bg-rose-950/20 border-rose-500/30"
                  : "bg-slate-900/70 border-slate-800/80"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span
                  className={`text-xs font-mono uppercase tracking-wider font-medium ${
                    leadsEsfriando.length > 0 ? "text-rose-400" : "text-slate-400"
                  }`}
                >
                  SLA de Retomada
                </span>
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                    leadsEsfriando.length > 0
                      ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                      : "bg-slate-800/80 border-slate-700/60 text-slate-400"
                  }`}
                >
                  <AlertCircle size={18} />
                </div>
              </div>
              <div
                className={`text-3xl sm:text-4xl font-black font-mono tracking-tight ${
                  leadsEsfriando.length > 0 ? "text-rose-400" : "text-white"
                }`}
              >
                {leadsEsfriando.length}
              </div>
              <div className="text-xs font-semibold text-slate-200 mt-1">
                Leads esfriando
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {leadsEsfriando.length > 0
                  ? "Oportunidades que exigem retorno"
                  : "SLA comercial em dia"}
              </div>
            </article>
          </section>

          {/* Grade Central: Ritmo & Sinais de Mercado */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Coluna Esquerda: Ritmo de Visitas */}
            <section
              className="lg:col-span-7 p-6 bg-slate-900/70 border border-slate-800/80 rounded-2xl shadow-xl backdrop-blur space-y-6"
              aria-labelledby="desempenho-titulo"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 font-medium">
                    {isSolo ? "Atividade Comercial" : "Volume por Vendedor"}
                  </div>
                  <h3 id="desempenho-titulo" className="text-lg font-bold text-white">
                    {isSolo ? "Ritmo de Visitas" : "Visitas da Equipe"}
                  </h3>
                </div>
                <span className="text-xs font-mono text-slate-400">últimos 30 dias</span>
              </div>

              {!isSolo && painel.vendedores.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1" aria-label="Filtrar vendedores">
                  <button
                    type="button"
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer ${
                      filtroVendedor === "todos"
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                        : "bg-slate-800/60 text-slate-400 border border-slate-700/60 hover:text-slate-200"
                    }`}
                    aria-pressed={filtroVendedor === "todos"}
                    onClick={() => setFiltroVendedor("todos")}
                  >
                    Todos
                  </button>
                  {painel.vendedores.map((v) => (
                    <button
                      type="button"
                      key={v.user_id}
                      className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer whitespace-nowrap ${
                        filtroVendedor === v.user_id
                          ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                          : "bg-slate-800/60 text-slate-400 border border-slate-700/60 hover:text-slate-200"
                      }`}
                      aria-pressed={filtroVendedor === v.user_id}
                      onClick={() => setFiltroVendedor(v.user_id)}
                    >
                      {v.nome}
                    </button>
                  ))}
                </div>
              )}

              <div className="space-y-4">
                {painel.vendedores
                  .filter((v) => filtroVendedor === "todos" || filtroVendedor === v.user_id)
                  .map((v) => (
                    <article
                      key={v.user_id}
                      className="p-4 bg-slate-800/40 border border-slate-800/80 rounded-xl space-y-3"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-full bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center font-bold font-mono text-xs text-cyan-300 shrink-0">
                            {(isSolo ? "EU" : v.nome.slice(0, 2)).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <strong className="text-sm font-semibold text-white block truncate">
                              {isSolo ? "Seu Volume de Visitas" : v.nome}
                            </strong>
                            <small className="text-xs text-slate-400 block mt-0.5">
                              {v.ultima_visita
                                ? `Última visita ${dataLegivel(v.ultima_visita)}`
                                : "Nenhuma visita registrada"}
                            </small>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-base font-bold text-cyan-400 font-mono">
                            {v.mes} <span className="text-xs text-slate-400 font-sans font-normal">no mês</span>
                          </div>
                          <div className="text-[11px] text-emerald-400 font-mono">
                            {v.semana} na semana
                          </div>
                        </div>
                      </div>
                      <BarraProgresso
                        valor={v.mes}
                        maximo={maxMes}
                        rotulo={`${isSolo ? "Você" : v.nome}: ${v.mes} visitas nos últimos 30 dias`}
                      />
                    </article>
                  ))}
              </div>
            </section>

            {/* Coluna Direita: Sinais Comerciais (Radar de Objeções + Checklist) */}
            <aside className="lg:col-span-5 space-y-6" aria-label="Sinais comerciais">
              {/* Objeções Mais Frequentes */}
              <section className="p-6 bg-slate-900/70 border border-slate-800/80 rounded-2xl shadow-xl backdrop-blur space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-mono uppercase tracking-wider text-rose-400 font-medium">
                      Voz do Mercado
                    </div>
                    <h3 className="text-base font-bold text-white">Radar de Objeções</h3>
                  </div>
                  <AlertCircle size={18} className="text-rose-400" aria-hidden="true" />
                </div>

                {/* Distribuição por Família de Objeção */}
                {painel.distribuicao_objecoes && painel.distribuicao_objecoes.length > 0 && (
                  <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-2">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                      Distribuição por Família de Objeção:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {painel.distribuicao_objecoes.map((cat) => {
                        const corBadge =
                          cat.cor === "amber"
                            ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                            : cat.cor === "violet"
                              ? "bg-purple-500/15 text-purple-300 border-purple-500/30"
                              : cat.cor === "sky"
                                ? "bg-sky-500/15 text-sky-300 border-sky-500/30"
                                : cat.cor === "rose"
                                  ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
                                  : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
                        return (
                          <span
                            key={cat.categoria}
                            className={`px-2 py-1 rounded-lg text-[10px] font-mono border ${corBadge}`}
                          >
                            {cat.rotulo}: <strong>{cat.percentual}%</strong> ({cat.vezes}x)
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {painel.objecoes.length === 0 ? (
                  <div className="p-6 bg-slate-800/20 border border-slate-800 rounded-xl text-center text-xs text-slate-400">
                    Nenhuma objeção registrada ainda.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {painel.objecoes.map((o, idx) => {
                      const pct = totalObjecoes > 0 ? Math.round((o.vezes / totalObjecoes) * 100) : 0;
                      const rankClass =
                        idx === 0
                          ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
                          : idx === 1
                            ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                            : "bg-cyan-500/10 text-cyan-300 border-cyan-500/20";
                      return (
                        <button
                          type="button"
                          key={o.texto}
                          className="w-full text-left p-3 bg-slate-800/40 hover:bg-slate-800/70 border border-slate-800/60 hover:border-slate-700/80 rounded-xl space-y-2 transition-all cursor-pointer group"
                          onClick={() => setObjecaoSelecionada(o)}
                          aria-label={`Ver playbook da objeção: ${o.texto}`}
                          title="Clique para ver o playbook de destravamento desta objeção"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border ${rankClass}`}>
                                #{idx + 1}
                              </span>
                              <div className="min-w-0">
                                <span className="text-xs font-semibold text-slate-200 line-clamp-1 group-hover:text-cyan-300 transition-colors">
                                  {o.texto}
                                </span>
                                {o.rotulo_categoria && (
                                  <span className="text-[10px] font-mono text-slate-400 block">
                                    {o.rotulo_categoria}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="font-mono text-cyan-400 text-xs font-bold whitespace-nowrap">
                                {o.vezes}x {pct > 0 && `(${pct}%)`}
                              </span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/25 group-hover:bg-cyan-500/20 transition-all flex items-center gap-1">
                                <BookOpen size={10} />
                                Playbook
                              </span>
                            </div>
                          </div>
                          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(100, pct || 12)}%` }}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Qualidade do Roteiro / Perguntas que Faltaram */}
              <section className="p-6 bg-slate-900/70 border border-slate-800/80 rounded-2xl shadow-xl backdrop-blur space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-medium">
                      Qualidade do Roteiro
                    </div>
                    <h3 className="text-base font-bold text-white">Perguntas Esquecidas</h3>
                  </div>
                  <ShieldCheck size={18} className="text-amber-400" aria-hidden="true" />
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {isSolo
                    ? "Identifica pontos de qualificação que podem enriquecer suas próximas abordagens."
                    : "Repetição indica necessidade de ajuste de roteiro, não falha individual."}
                </p>

                {painel.lacunas.length === 0 ? (
                  <div className="p-6 bg-slate-800/20 border border-slate-800 rounded-xl text-center text-xs text-slate-400">
                    Nenhum ponto de qualificação pendente.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {painel.lacunas.map((l, idx) => (
                      <div
                        key={l.texto}
                        className="p-3 bg-slate-800/40 border border-slate-800/60 rounded-xl flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-800 border border-slate-700 text-slate-300">
                            #{idx + 1}
                          </span>
                          <span className="text-xs font-medium text-slate-200 line-clamp-1">{l.texto}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold text-amber-300 bg-amber-500/10 border border-amber-500/25 shrink-0">
                          {l.vezes}x
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </aside>
          </div>

          {/* Governança de Roteiro & Catálogo de Qualificação por Segmento */}
          <section
            className="p-6 bg-slate-900/70 border border-slate-800/80 rounded-2xl shadow-xl backdrop-blur space-y-6"
            aria-labelledby="roteiro-segmento-titulo"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-cyan-400 font-medium mb-1">
                  <ListChecks size={14} />
                  <span>Governança & Roteiro Comercial</span>
                </div>
                <h3 id="roteiro-segmento-titulo" className="text-lg font-bold text-white">
                  Catálogo de Qualificação por Segmento
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 max-w-xl leading-relaxed">
                  Defina o nicho da sua operação. A IA Doniq cobra deterministicamente essas perguntas nos relatos dos vendedores sem alucinação.
                </p>
              </div>
              {verticaisData && (
                <button
                  type="button"
                  disabled={salvandoVertical || verticalAtiva === verticaisData.atual}
                  onClick={salvarVerticalOperacao}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold font-mono transition-all cursor-pointer flex items-center gap-2 self-start sm:self-center ${
                    verticalAtiva === verticaisData.atual
                      ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/25 cursor-default"
                      : "bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-95 text-white shadow-lg shadow-cyan-950/40"
                  }`}
                >
                  {salvandoVertical ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : verticalAtiva === verticaisData.atual ? (
                    <>
                      <Check size={13} className="text-emerald-400" />
                      <span>Segmento Ativo na Operação</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={13} />
                      <span>Definir como Segmento da Operação</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Chips seletor de Verticais */}
            {verticaisData && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1.5" aria-label="Selecione o segmento comercial">
                {verticaisData.lista.map((v) => {
                  const isSel = verticalAtiva === v.id;
                  const isCurrentOp = verticaisData.atual === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => void trocarVerticalPreview(v.id)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-mono font-medium transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 border ${
                        isSel
                          ? "bg-cyan-500/20 text-cyan-200 border-cyan-500/50 shadow-md shadow-cyan-950/40"
                          : "bg-slate-800/60 text-slate-400 border-slate-700/60 hover:text-slate-200 hover:bg-slate-800"
                      }`}
                    >
                      <span>{v.curto}</span>
                      {isCurrentOp && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Segmento ativo" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Abas de Tipos de Visita */}
            {verticaisData && (
              <div className="space-y-4 pt-2 border-t border-slate-800/70">
                <div className="flex flex-wrap items-center gap-2">
                  {verticaisData.tipos.map((t) => {
                    const isAtivo = tipoRoteiro === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTipoRoteiro(t.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                          isAtivo
                            ? "bg-slate-800 text-white border border-slate-700 shadow-sm"
                            : "text-slate-400 hover:text-slate-300"
                        }`}
                      >
                        {t.rotulo}
                      </button>
                    );
                  })}
                  <span className="text-[11px] text-slate-400 ml-auto font-mono">
                    Contexto: {verticaisData.tipos.find((t) => t.id === tipoRoteiro)?.quando}
                  </span>
                </div>

                {/* Grid de Perguntas de Roteiro */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(() => {
                    const itens = verticaisData.catalogo?.[tipoRoteiro] || [];
                    const perguntasSimples = verticaisData.roteiros?.[tipoRoteiro] || [];
                    if (itens.length === 0 && perguntasSimples.length === 0) {
                      return (
                        <div className="col-span-2 p-4 rounded-xl bg-slate-800/30 border border-slate-800 text-center text-xs text-slate-400">
                          Nenhuma pergunta prioritária cadastrada para esta etapa.
                        </div>
                      );
                    }
                    if (itens.length > 0) {
                      return itens.map((item, idx) => (
                        <div
                          key={item.id || idx}
                          className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800/80 space-y-2 hover:border-slate-700 transition-all"
                        >
                          <div className="flex items-start gap-2.5">
                            <span className="w-5 h-5 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-mono text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <p className="text-xs font-semibold text-slate-200 leading-snug">
                              {item.pergunta}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/50 text-[10px] font-mono">
                            {item.campo ? (
                              <span className="text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.5 rounded">
                                Auditoria: campo {item.campo}
                              </span>
                            ) : (
                              <span className="text-blue-300 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded">
                                Auditoria: sinal de fala
                              </span>
                            )}
                            {item.sinais && item.sinais.length > 0 && (
                              <span className="text-slate-400 truncate max-w-[220px]" title={item.sinais.join(", ")}>
                                termos: {item.sinais.slice(0, 3).join(", ")}
                              </span>
                            )}
                          </div>
                        </div>
                      ));
                    }
                    return perguntasSimples.map((perg, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800/80 space-y-2 hover:border-slate-700 transition-all"
                      >
                        <div className="flex items-start gap-2.5">
                          <span className="w-5 h-5 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-mono text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <p className="text-xs font-semibold text-slate-200 leading-snug">
                            {perg}
                          </p>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}
          </section>

          {/* Atividade Recente (Últimas Visitas) */}
          <section
            className="p-6 bg-slate-900/70 border border-slate-800/80 rounded-2xl shadow-xl backdrop-blur space-y-6"
            aria-labelledby="ultimas-titulo"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 font-medium">
                  Registro em Campo
                </div>
                <h3 id="ultimas-titulo" className="text-lg font-bold text-white">
                  {isSolo ? "Suas Últimas Visitas" : "Últimas Visitas da Equipe"}
                </h3>
              </div>
              <div className="flex items-center gap-2.5">
                {painel.ultimas.length > 0 && (
                  <button
                    type="button"
                    onClick={exportarCsv}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition-all cursor-pointer shadow-sm"
                    aria-label="Exportar visitas em CSV"
                  >
                    <Download size={14} className="text-cyan-400" />
                    <span>Exportar CSV</span>
                  </button>
                )}
                <CalendarClock size={19} className="text-slate-400" aria-hidden="true" />
              </div>
            </div>

            {/* Barra de Filtros e Busca do Gestor */}
            {painel.ultimas.length > 0 && (
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 bg-slate-800/50 border border-slate-800 rounded-xl">
                <div className="relative flex-1 min-w-[200px]">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  <input
                    type="search"
                    value={buscaUltimas}
                    onChange={(e) => setBuscaUltimas(e.target.value)}
                    placeholder="Buscar empresa, contato ou objeção..."
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-900/80 border border-slate-700/70 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                    aria-label="Buscar nas últimas visitas"
                  />
                  {buscaUltimas && (
                    <button
                      type="button"
                      onClick={() => setBuscaUltimas("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      aria-label="Limpar busca"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setFiltroUltimas("todas")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      filtroUltimas === "todas"
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                        : "bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700/60"
                    }`}
                  >
                    Todas ({painel.ultimas.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltroUltimas("quente")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      filtroUltimas === "quente"
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                        : "bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700/60"
                    }`}
                  >
                    🔥 Quentes ({painel.ultimas.filter((f) => f.temperatura === "quente").length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltroUltimas("objecao")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      filtroUltimas === "objecao"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                        : "bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700/60"
                    }`}
                  >
                    🎯 Com Objeção ({painel.ultimas.filter((f) => Boolean(f.objecao?.trim())).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltroUltimas("pendente")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      filtroUltimas === "pendente"
                        ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/40"
                        : "bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700/60"
                    }`}
                  >
                    ⚠️ Sem Prazo ({painel.ultimas.filter((f) => Boolean(f.proxima_acao) && !f.data_iso).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltroUltimas("esfriando")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      filtroUltimas === "esfriando"
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                        : "bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700/60"
                    }`}
                  >
                    🚨 Esfriando ({leadsEsfriando.length})
                  </button>

                  {!isSolo && dados?.pessoas && dados.pessoas.length > 1 && (
                    <select
                      value={vendedorUltimas}
                      onChange={(e) => setVendedorUltimas(e.target.value)}
                      className="px-2.5 py-1 bg-slate-900/80 border border-slate-700/70 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
                      aria-label="Filtrar por vendedor"
                    >
                      <option value="todos">Toda a equipe</option>
                      {dados.pessoas.map((p) => (
                        <option key={p.user_id} value={p.user_id}>
                          {p.nome || p.email}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            )}

            {painel.ultimas.length === 0 ? (
              <div className="p-8 bg-slate-800/20 border border-slate-800 rounded-xl text-center text-sm text-slate-400">
                Nenhuma visita registrada ainda. Grave o primeiro relato pelo celular.
              </div>
            ) : ultimasFiltradas.length === 0 ? (
              <div className="p-8 bg-slate-800/20 border border-slate-800 rounded-xl text-center text-sm text-slate-400">
                Nenhuma visita corresponde aos filtros selecionados.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ultimasFiltradas.slice(0, 15).map((f) => {
                  const diagSla = avaliarRiscoSilencio({
                    relato_id: f.relato_id,
                    empresa: f.empresa,
                    contato: f.contato,
                    temperatura: f.temperatura,
                    objecao: f.objecao,
                    proxima_acao: f.proxima_acao,
                    data_iso: f.data_iso,
                    dia_visita: f.dia_visita,
                    created_at: f.created_at,
                  });
                  return (
                  <article
                    key={f.relato_id}
                    className="p-4 bg-slate-800/40 border border-slate-800/80 rounded-2xl hover:border-slate-700/80 transition-all space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-xs font-mono font-bold text-cyan-300 shrink-0">
                          {(f.empresa || "E").slice(0, 2).toUpperCase()}
                        </div>
                        <strong className="text-sm font-bold text-white block truncate">
                          {f.empresa || "Empresa não dita"}
                        </strong>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {diagSla.gravidade !== "em_dia" && (
                          <span
                            className={`item-badge-sla sla-${diagSla.gravidade}`}
                            title={diagSla.motivo}
                          >
                            {diagSla.rotulo_curto}
                          </span>
                        )}
                        {f.temperatura && (
                          <span
                            className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded border ${
                              f.temperatura === "quente"
                                ? "bg-rose-500/10 text-rose-300 border-rose-500/25"
                                : f.temperatura === "morna"
                                  ? "bg-amber-500/10 text-amber-300 border-amber-500/25"
                                  : "bg-cyan-500/10 text-cyan-300 border-cyan-500/25"
                            }`}
                          >
                            {f.temperatura}
                          </span>
                        )}
                        <time className="text-[11px] font-mono text-slate-400 whitespace-nowrap bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60">
                          {f.dia_visita ? dataLegivel(f.dia_visita) : "Sem data"}
                        </time>
                      </div>
                    </div>

                    {f.objecao && (
                      <div className="text-xs text-slate-300 flex items-start gap-2 pt-1.5 border-t border-slate-800/60">
                        <span className="text-[10px] font-mono uppercase font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded mt-0.5 shrink-0">
                          {f.analise_objecao?.rotulo_categoria ? `Objeção: ${f.analise_objecao.rotulo_categoria}` : "Objeção"}
                        </span>
                        <span className="line-clamp-2">{f.objecao}</span>
                      </div>
                    )}

                    {f.proxima_acao && (
                      <div className="text-xs text-slate-300 flex items-start gap-2 pt-1.5 border-t border-slate-800/60">
                        <span className="text-[10px] font-mono uppercase font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.5 rounded mt-0.5 shrink-0">
                          Próximo Passo
                        </span>
                        <span className="line-clamp-2">
                          {f.proxima_acao}
                          {f.data_iso ? (
                            <span className="text-cyan-300 font-mono text-[11px] ml-1.5 font-medium">
                              (até {dataLegivel(f.data_iso)})
                            </span>
                          ) : (
                            <span className="text-amber-400 font-mono text-[10px] ml-1.5 font-semibold bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">
                              ⚠️ sem prazo fixado
                            </span>
                          )}
                        </span>
                      </div>
                    )}

                    {f.crm_status && f.crm_status.length > 0 && (
                      <div className="pt-2 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {f.crm_status.map((sync) => {
                            const isEnviado = sync.status === "enviado";
                            const isErro = sync.status === "erro";
                            const nomeProvedor = sync.provedor.charAt(0).toUpperCase() + sync.provedor.slice(1);
                            return (
                              <span
                                key={`${f.relato_id}-${sync.provedor}`}
                                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-mono font-medium border ${
                                  isEnviado
                                    ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                                    : isErro
                                      ? "bg-amber-500/10 text-amber-300 border-amber-500/20"
                                      : "bg-cyan-500/10 text-cyan-300 border-cyan-500/20"
                                }`}
                                title={sync.erro || (isEnviado ? "Sincronizado com o CRM" : "Sincronização em processamento")}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    isEnviado
                                      ? "bg-emerald-400"
                                      : isErro
                                        ? "bg-amber-400"
                                        : "bg-cyan-400 animate-pulse"
                                  }`}
                                />
                                {nomeProvedor}
                                {isErro && " (falha)"}
                              </span>
                            );
                          })}
                        </div>

                        {f.crm_status.some((s) => s.status !== "enviado") && (
                          <button
                            type="button"
                            disabled={sincronizandoRelato === f.relato_id}
                            onClick={() => void handleReenviarRelato(f.relato_id, f.crm_status?.find((s) => s.status !== "enviado")?.provedor)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-[10px] font-mono transition-all cursor-pointer shadow-sm"
                            title="Tentar reenviar para o CRM"
                          >
                            <RefreshCw size={10} className={sincronizandoRelato === f.relato_id ? "animate-spin text-cyan-400" : "text-cyan-400"} />
                            <span>{sincronizandoRelato === f.relato_id ? "Enviando..." : "Reenviar CRM"}</span>
                          </button>
                        )}
                      </div>
                    )}

                    {f.roteiro && f.roteiro.length > 0 && (
                      <div className="pt-2 border-t border-slate-800/60 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono font-semibold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded">
                              Roteiro: {f.roteiro.filter((p) => p.coberto).length}/{f.roteiro.length} cobertos
                            </span>
                            {f.tipo_visita && (
                              <span className="text-[10px] font-mono uppercase text-slate-400">
                                · {f.tipo_visita}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => setRelatoRoteiroAberto(relatoRoteiroAberto === f.relato_id ? null : f.relato_id)}
                            className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer flex items-center gap-1"
                          >
                            {relatoRoteiroAberto === f.relato_id ? (
                              <>
                                <span>Ocultar</span>
                                <ChevronUp size={11} />
                              </>
                            ) : (
                              <>
                                <span>Inspecionar</span>
                                <ChevronDown size={11} />
                              </>
                            )}
                          </button>
                        </div>

                        {relatoRoteiroAberto === f.relato_id && (
                          <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 space-y-1.5 text-xs">
                            {f.roteiro.map((item) => (
                              <div key={item.id} className="flex items-start gap-2 text-[11px] leading-relaxed">
                                {item.coberto ? (
                                  <span className="text-emerald-400 font-bold shrink-0 mt-0.5">✓</span>
                                ) : (
                                  <span className="text-amber-400 font-bold shrink-0 mt-0.5">✗</span>
                                )}
                                <span className={item.coberto ? "text-slate-200" : "text-slate-400"}>
                                  {item.pergunta}
                                </span>
                                {item.coberto && (
                                  <span className="ml-auto shrink-0 text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-emerald-950/40 text-emerald-300 border border-emerald-500/20">
                                    {item.como === "ficha" ? "campo" : "fala"}
                                  </span>
                                )}
                                {!item.coberto && (
                                  <span className="ml-auto shrink-0 text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-amber-950/40 text-amber-300 border border-amber-500/20">
                                    em aberto
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                  );
                })}
              </div>
            )}

            <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-xl text-xs text-slate-300 flex items-center gap-3">
              <ShieldCheck size={18} className="text-emerald-400 shrink-0" aria-hidden="true" />
              <span>
                {isSolo
                  ? "Ficha estruturada e próximos passos. O áudio original do relato fica protegido com total privacidade no seu aparelho."
                  : "O áudio e as frases literais faladas no relato nunca aparecem aqui. Esse é o pacto com o vendedor, protegido por código."}
              </span>
            </div>
          </section>
        </>
      )}

      {/* Seção Operacional: Resumo por E-mail & Expansão / Convite */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Resumo por e-mail */}
        {painel && (
          <section className="p-6 bg-slate-900/70 border border-slate-800/80 rounded-2xl shadow-xl backdrop-blur space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-blue-400">
                <Mail size={20} />
              </div>
              <div>
                <div className="text-[11px] font-mono uppercase tracking-wider text-blue-400 font-medium">
                  Inteligência por E-mail
                </div>
                <h3 className="text-base font-bold text-white">Resumo da Semana</h3>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {isSolo
                ? "Receba os números do seu ritmo comercial e sinais de clientes em texto no seu e-mail."
                : "Receba os números consolidados desta tela em texto limpo no e-mail da sua conta."}
            </p>
            {estadoEmail?.modo === "teste" && (
              <div className="p-2.5 bg-amber-950/20 border border-amber-500/30 rounded-xl text-[11px] text-amber-300">
                Em teste, o resumo vai para a caixa de teste.
              </div>
            )}
            {estadoEmail?.modo === "desligado" && (
              <div className="p-2.5 bg-slate-800/60 border border-slate-700/60 rounded-xl text-[11px] text-slate-400">
                O envio está desligado. O resumo aparecerá aqui na tela.
              </div>
            )}
            <button
              type="button"
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
              onClick={pedirResumo}
              disabled={enviandoResumo}
            >
              {enviandoResumo ? "Montando resumo…" : "Solicitar Resumo por E-mail"}
            </button>
            {resumo && (
              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2.5 mt-2">
                <div className="text-xs font-bold text-cyan-300 font-mono">{resumo.assunto}</div>
                <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap bg-slate-900/90 p-3 rounded-lg border border-slate-800 max-h-48 overflow-y-auto">
                  {resumo.texto}
                </pre>
                <button
                  type="button"
                  className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-2"
                  onClick={() => copiar(resumo.texto)}
                >
                  <Copy size={14} />
                  Copiar Texto do Resumo
                </button>
              </div>
            )}
          </section>
        )}

        {/* Expansão de Operação: Apresentar à Diretoria / Criar Equipe (Solo) ou Convidar Vendedor (Gestor) */}
        {isSolo ? (
          <div className="space-y-6">
            {/* Card 1: Apresente à sua Diretoria / Reembolso Corporativo */}
            <div className="p-6 bg-slate-900/80 border border-cyan-500/30 rounded-2xl shadow-2xl backdrop-blur space-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300">
                  <Building2 size={20} />
                </div>
                <div>
                  <div className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                    Expansão Corporativa & Reembolso
                  </div>
                  <h3 className="text-base font-bold text-white">Apresente o Doniq à sua Diretoria</h3>
                </div>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Trabalha em uma empresa com outros vendedores? O Doniq oferece piloto gratuito de 7 dias para toda a equipe, faturamento corporativo ou reembolso mensal de despesas. Envie o pitch direto para o seu gestor comercial com 1 clique:
              </p>

              {/* Box com o pitch pré-visualizado */}
              <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-300 font-mono leading-relaxed whitespace-pre-wrap">
                {PITCH_DIRETORIA}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(PITCH_DIRETORIA)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/40 transition-all cursor-pointer"
                >
                  <MessageSquare size={16} />
                  <span>Enviar no WhatsApp do Gestor</span>
                </a>
                <button
                  type="button"
                  onClick={() => void copiarPitch()}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all cursor-pointer"
                >
                  {copiadoPitch ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                  <span>{copiadoPitch ? "Pitch Copiado!" : "Copiar Texto do Pitch"}</span>
                </button>
              </div>
            </div>

            {/* Card 2: Criar Equipe Comercial */}
            <form
              className="p-6 bg-slate-900/70 border border-slate-800/80 rounded-2xl shadow-xl backdrop-blur space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                void criar();
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400">
                  <Users size={20} />
                </div>
                <div>
                  <div className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 font-medium">
                    Expansão Comercial
                  </div>
                  <h3 className="text-base font-bold text-white">Criar Equipe de Vendas</h3>
                </div>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Deseja gerenciar outros vendedores? Crie sua equipe para convidá-los e acompanhar o
                ritmo coletivo com total respeito à privacidade dos relatos individuais.
              </p>
              <div className="space-y-1.5">
                <label className="text-xs font-mono uppercase tracking-wider text-slate-400 block" htmlFor="nome-equipe">
                  Nome da Equipe
                </label>
                <input
                  id="nome-equipe"
                  className="w-full px-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500 transition-all"
                  value={nomeEquipe}
                  placeholder="Ex.: Comercial Sudeste"
                  aria-label="Nome da equipe"
                  onChange={(e) => setNomeEquipe(e.target.value)}
                />
              </div>
              <button
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:opacity-95 text-white font-bold text-xs shadow-lg shadow-cyan-950/60 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                type="submit"
                disabled={ocupado || !nomeEquipe.trim()}
              >
                {ocupado ? "Criando equipe…" : "Criar Equipe Comercial →"}
              </button>
            </form>
          </div>
        ) : (
          <form
            className="p-6 bg-slate-900/70 border border-slate-800/80 rounded-2xl shadow-xl backdrop-blur space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void convidar();
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400">
                <UserPlus size={20} />
              </div>
              <div>
                <div className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 font-medium">
                  Ampliar Operação
                </div>
                <h3 className="text-base font-bold text-white">Convidar Vendedor</h3>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              O convite dá acesso ao app e vincula automaticamente os próximos relatos da pessoa ao seu painel.
            </p>
            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase tracking-wider text-slate-400 block" htmlFor="email-convite">
                E-mail do Vendedor
              </label>
              <input
                id="email-convite"
                className="w-full px-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500 transition-all"
                value={emailConvite}
                placeholder="email@empresa.com.br"
                aria-label="E-mail do vendedor"
                inputMode="email"
                autoComplete="email"
                onChange={(e) => setEmailConvite(e.target.value)}
              />
            </div>
            <button
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:opacity-95 text-white font-bold text-xs shadow-lg shadow-cyan-950/60 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              type="submit"
              disabled={ocupado || !emailConvite.includes("@")}
            >
              {ocupado ? "Criando convite…" : "Enviar Convite de Acesso →"}
            </button>

            {linkNovo && (
              <div className="p-4 bg-cyan-950/30 border border-cyan-500/30 rounded-xl space-y-2 mt-3">
                {!emailSaiu && (
                  <p className="text-xs text-amber-300 font-medium">
                    O e-mail não saiu deste ambiente. Envie o link direto ao vendedor:
                  </p>
                )}
                {emailSaiu && conviteDesviado && (
                  <p className="text-xs text-amber-300 font-medium">
                    Em teste, o e-mail não chega ao convidado. Envie o link direto a ele:
                  </p>
                )}
                <div className="p-2.5 bg-slate-900/90 rounded-lg border border-slate-800 font-mono text-xs text-cyan-300 break-all select-all">
                  {linkNovo}
                </div>
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  <button
                    type="button"
                    className="flex-1 min-w-[140px] py-2.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-500/40 text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-2"
                    onClick={() => copiar(linkNovo)}
                  >
                    {copiadoLink ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    <span>{copiadoLink ? "Link Copiado!" : "Copiar Link"}</span>
                  </button>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(
                      `Olá! Você foi convidado para a equipe comercial no Doniq.\n\n` +
                      `Acesse o link abaixo para ativar seu aplicativo e registrar visitas em 40s usando a voz:\n${linkNovo}\n\n` +
                      `🔒 Garantia Doniq: Sua voz nunca é gravada para vigilância. Seus relatos viram fichas estruturadas de forma privada.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 min-w-[160px] py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40"
                  >
                    <MessageSquare size={14} />
                    <span>Enviar no WhatsApp</span>
                  </a>
                </div>
              </div>
            )}
          </form>
        )}
      </div>

      {/* Convites Pendentes */}
      {!isSolo && dados.convites.filter((c) => c.status === "pendente").length > 0 && (
        <section className="p-6 bg-slate-900/70 border border-slate-800/80 rounded-2xl shadow-xl backdrop-blur space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-base">Convites Pendentes</h3>
            <span className="text-xs font-mono text-amber-400">
              {dados.convites.filter((c) => c.status === "pendente").length} aguardando
            </span>
          </div>
          <div className="space-y-2.5">
            {dados.convites
              .filter((c) => c.status === "pendente")
              .map((c) => (
                <div
                  key={c.convite_id}
                  className="p-3 bg-slate-800/40 border border-slate-800 rounded-xl flex items-center justify-between gap-3 flex-wrap"
                >
                  <span className="text-xs font-mono text-slate-200 truncate">{c.email}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-mono text-slate-400">
                      {c.email_enviado ? "e-mail enviado" : "link direto"}
                    </span>
                    <button
                      type="button"
                      className="px-2.5 py-1 rounded-lg text-xs font-medium text-rose-400 hover:text-rose-300 bg-rose-950/20 hover:bg-rose-950/40 border border-rose-500/30 transition-all cursor-pointer"
                      onClick={() => revogar(c)}
                      disabled={ocupado}
                    >
                      cancelar
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </section>
      )}

      {/* Membros da Operação */}
      {!isSolo && dados.pessoas.length > 0 && (
        <section className="p-6 bg-slate-900/70 border border-slate-800/80 rounded-2xl shadow-xl backdrop-blur space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-base">Membros da Operação</h3>
            <span className="text-xs font-mono text-cyan-400">
              {dados.pessoas.length} pessoa{dados.pessoas.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="space-y-2.5">
            {dados.pessoas.map((p) => (
              <div
                key={p.user_id}
                className="p-3 bg-slate-800/40 border border-slate-800 rounded-xl flex items-center justify-between gap-3 flex-wrap"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-[10px] font-mono font-bold text-cyan-300">
                    {(p.nome || p.email).slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-slate-200 truncate">
                    {p.nome || p.email}
                    {p.user_id === dados.equipe?.dono_user_id && (
                      <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        Dono
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                    {p.papel}
                  </span>
                  {p.user_id !== dados.equipe?.dono_user_id && (
                    <button
                      type="button"
                      className="px-2.5 py-1 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-400 bg-slate-800/60 hover:bg-rose-950/20 border border-slate-700/60 hover:border-rose-500/30 transition-all cursor-pointer"
                      onClick={() => remover(p.user_id, p.nome || p.email)}
                      disabled={ocupado}
                    >
                      remover
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Modal / Playbook de Destravamento de Objeção */}
      {objecaoSelecionada && (() => {
        const analise = analisarObjecao(objecaoSelecionada.texto, verticalAtiva);
        const corBorda =
          analise.cor === "amber"
            ? "rgba(245, 158, 11, 0.4)"
            : analise.cor === "violet"
              ? "rgba(168, 85, 247, 0.4)"
              : analise.cor === "sky"
                ? "rgba(14, 165, 233, 0.4)"
                : analise.cor === "rose"
                  ? "rgba(244, 63, 94, 0.4)"
                  : "rgba(16, 185, 129, 0.4)";
        const corBadge =
          analise.cor === "amber"
            ? "text-amber-300 bg-amber-500/15 border-amber-500/30"
            : analise.cor === "violet"
              ? "text-purple-300 bg-purple-500/15 border-purple-500/30"
              : analise.cor === "sky"
                ? "text-sky-300 bg-sky-500/15 border-sky-500/30"
                : analise.cor === "rose"
                  ? "text-rose-300 bg-rose-500/15 border-rose-500/30"
                  : "text-emerald-300 bg-emerald-500/15 border-emerald-500/30";

        const sugestaoMensagemWhatsapp = gerarVariantesFollowup(
          {
            objecao: objecaoSelecionada.texto,
            analise_objecao: analise,
          },
          verticalAtiva,
        ).variantes.destravar_objecao.texto;

        const textoPlaybookCompleto =
          `*Playbook Doniq: ${analise.rotulo_categoria}*\n` +
          `Objeção levantada: "${objecaoSelecionada.texto}"\n\n` +
          `📋 *Diagnóstico:*\n${analise.diagnostico}\n\n` +
          `🛡️ *Contra-argumentos recomendados:*\n` +
          analise.contra_argumentos.map((ca) => `• ${ca}`).join("\n") +
          `\n\n❓ *Perguntas de destravamento:*\n` +
          analise.perguntas_destravamento.map((pd) => `• "${pd}"`).join("\n") +
          `\n\n🎯 *Orientação para o Gestor:*\n${analise.orientacao_gestor}` +
          (sugestaoMensagemWhatsapp
            ? `\n\n💬 *Mensagem sugerida no WhatsApp:*\n"${sugestaoMensagemWhatsapp}"`
            : "");

        const copiarTextoPlaybook = async () => {
          try {
            await navigator.clipboard.writeText(textoPlaybookCompleto);
            setCopiadoPlaybook(true);
            setTimeout(() => setCopiadoPlaybook(false), 2200);
            avisar("Playbook copiado para a área de transferência!");
          } catch {
            avisar("Não foi possível copiar o playbook.");
          }
        };

        return (
          <dialog
            open
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-transparent border-0 animate-in fade-in duration-200"
            aria-label="Playbook de Destravamento de Objeção"
          >
            <button
              type="button"
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm -z-10 cursor-default"
              onClick={() => setObjecaoSelecionada(null)}
              aria-label="Fechar modal de playbook"
            />
            <div
              className="bg-slate-900 border rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-4 relative z-10"
              style={{ borderColor: corBorda }}
            >
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold uppercase border ${corBadge}`}>
                      {analise.rotulo_categoria}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      Segmento: {verticalAtiva.toUpperCase()}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white leading-snug">
                    "{objecaoSelecionada.texto}"
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setObjecaoSelecionada(null)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  aria-label="Fechar playbook"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 text-xs text-slate-300 leading-relaxed">
                <strong className="text-slate-200 block mb-1 font-semibold">Diagnóstico Comercial:</strong>
                {analise.diagnostico}
              </div>

              <div className="space-y-2">
                <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
                  <ShieldAlert size={14} className="text-amber-400" />
                  <span>Contra-argumentos para Alinhamento Tático</span>
                </div>
                <ul className="space-y-1.5 text-xs text-slate-300 pl-4 list-disc">
                  {analise.contra_argumentos.map((ca, idx) => (
                    <li key={idx} className="leading-relaxed">{ca}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 font-bold flex items-center gap-1.5">
                  <Lightbulb size={14} className="text-cyan-400" />
                  <span>Perguntas de Destravamento em Campo</span>
                </div>
                <div className="space-y-1.5">
                  {analise.perguntas_destravamento.map((pd, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-slate-950/50 rounded-lg border border-slate-800 text-xs font-medium text-slate-200 italic"
                    >
                      "{pd}"
                    </div>
                  ))}
                </div>
              </div>

              {sugestaoMensagemWhatsapp && (
                <div className="p-3.5 bg-cyan-950/20 border border-cyan-500/30 rounded-xl space-y-2">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 font-bold flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <MessageSquare size={13} className="text-cyan-400" />
                      Modelo de WhatsApp para o Vendedor Enviar
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 italic leading-relaxed">
                    "{sugestaoMensagemWhatsapp}"
                  </p>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(sugestaoMensagemWhatsapp);
                        avisar("Mensagem copiada para enviar ao vendedor!");
                      } catch {
                        avisar("Não foi possível copiar.");
                      }
                    }}
                    className="py-1 px-2.5 rounded-lg text-[11px] font-semibold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 inline-flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Copy size={12} />
                    <span>Copiar só a mensagem</span>
                  </button>
                </div>
              )}

              <div className="p-3 bg-amber-950/20 border border-amber-500/25 rounded-xl text-xs text-amber-200/90 leading-relaxed">
                <strong className="font-semibold block mb-0.5 text-amber-300">Orientação para a Liderança:</strong>
                {analise.orientacao_gestor}
              </div>

              <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={copiarTextoPlaybook}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {copiadoPlaybook ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  <span>{copiadoPlaybook ? "Playbook copiado!" : "Copiar Playbook"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setObjecaoSelecionada(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </dialog>
        );
      })()}
    </div>
  );
}
