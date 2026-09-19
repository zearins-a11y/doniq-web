import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";

interface Cenario {
  id: "alimentos" | "saude" | "agro";
  nomeSetor: string;
  badge: string;
  iniciais: string;
  cliente: string;
  subtitulo: string;
  contato: string;
  crmNome: string;
  crmId: string;
  falaVendedor: string;
  duvidaCampo: string;
  confiancaDuvida: number;
  opcoesDuvida: [string, string];
  camposValidados: {
    contato: string;
    proximo: string;
    prazo: string;
    crm: string;
  };
  valorEstimado: string;
  mensagemWhatsapp: string;
}

const CENARIOS: Record<Cenario["id"], Cenario> = {
  alimentos: {
    id: "alimentos",
    nomeSetor: "Distribuição & Alimentos",
    badge: "Prospecção",
    iniciais: "SB",
    cliente: "Padaria São Bento",
    subtitulo: "Vila Mariana · PD-0492",
    contato: "Seu Antônio (Proprietário)",
    crmNome: "Pipedrive",
    crmId: "PD-0492",
    falaVendedor:
      "Acabei de sair da Padaria São Bento. Conversei com o Seu Antônio, ele aprovou o teste de 40 sacos da nova farinha especial, mas pediu pra enviar a ficha técnica e a amostra até quarta-feira dia 15.",
    duvidaCampo: "Conta / Estabelecimento",
    confiancaDuvida: 62,
    opcoesDuvida: ["Padaria São Bento", "Padaria Bento Gonçalves"],
    camposValidados: {
      contato: "Seu Antônio (Proprietário) · 96%",
      proximo: "Enviar amostra e ficha técnica · 94%",
      prazo: "15 de setembro · 92%",
      crm: "Pipedrive (PD-0492) · 89%",
    },
    valorEstimado: "R$ 4.800 / mês",
    mensagemWhatsapp:
      "*Relatório Executivo Doniq*\n🏢 Cliente: Padaria São Bento\n👤 Contato: Seu Antônio (Proprietário)\n📌 Próximo Passo: Enviar amostra e ficha técnica até quarta\n📅 Prazo: 15 de setembro\n💰 Estimativa: 40 sacos/mês (R$ 4.800)\n🔗 CRM: Sincronizado no Pipedrive (PD-0492)\n\n_Enviado via Doniq. Quer o painel da sua equipe toda? doniq.com.br/gestao_",
  },
  saude: {
    id: "saude",
    nomeSetor: "Dispositivos Médicos & Saúde",
    badge: "Negociação",
    iniciais: "SL",
    cliente: "Hospital São Lucas",
    subtitulo: "Bela Vista · RD-8120",
    contato: "Dra. Camila (Chefe Cirúrgica)",
    crmNome: "RD Station CRM",
    crmId: "RD-8120",
    falaVendedor:
      "Reunião concluída no Hospital São Lucas. Dra. Camila aprovou a demonstração dos instrumentais laparoscópicos, quer proposta de 15 kits até sexta às 14h para apresentar ao comitê de compras.",
    duvidaCampo: "Unidade Hospitalar",
    confiancaDuvida: 64,
    opcoesDuvida: ["Hospital São Lucas", "Hospital Santa Lúcia"],
    camposValidados: {
      contato: "Dra. Camila (Chefe Cirúrgica) · 97%",
      proximo: "Proposta formal de 15 kits · 95%",
      prazo: "Sexta-feira às 14h · 94%",
      crm: "RD Station (RD-8120) · 91%",
    },
    valorEstimado: "R$ 67.500",
    mensagemWhatsapp:
      "*Relatório Executivo Doniq*\n🏢 Cliente: Hospital São Lucas\n👤 Contato: Dra. Camila (Chefe Cirúrgica)\n📌 Próximo Passo: Enviar proposta de 15 kits para comitê\n📅 Prazo: Sexta-feira, 14h\n💰 Estimativa: 15 kits laparoscópicos (R$ 67.500)\n🔗 CRM: Sincronizado no RD Station (RD-8120)\n\n_Enviado via Doniq. Quer o painel da sua equipe toda? doniq.com.br/gestao_",
  },
  agro: {
    id: "agro",
    nomeSetor: "Agronegócio & Insumos",
    badge: "Fechamento",
    iniciais: "SF",
    cliente: "Fazenda Santa Fé",
    subtitulo: "Ribeirão Preto · PL-3310",
    contato: "Sr. Valdir (Gerente Agrícola)",
    crmNome: "Ploomes",
    crmId: "PL-3310",
    falaVendedor:
      "Saí agora da Fazenda Santa Fé com o Sr. Valdir. Ele quer fechar 2.000 litros do adubo foliar para a safra de verão, entrega na primeira semana de outubro, faturamento em 30 e 60 dias.",
    duvidaCampo: "Propriedade Rural",
    confiancaDuvida: 61,
    opcoesDuvida: ["Fazenda Santa Fé", "Fazenda Santa Helena"],
    camposValidados: {
      contato: "Sr. Valdir (Gerente Agrícola) · 98%",
      proximo: "Confirmar pedido 2.000L adubo foliar · 96%",
      prazo: "Primeira semana de outubro · 93%",
      crm: "Ploomes (PL-3310) · 90%",
    },
    valorEstimado: "R$ 94.000",
    mensagemWhatsapp:
      "*Relatório Executivo Doniq*\n🏢 Cliente: Fazenda Santa Fé\n👤 Contato: Sr. Valdir (Gerente Agrícola)\n📌 Próximo Passo: Emitir pedido de 2.000L adubo foliar (safra verão)\n📅 Prazo de Entrega: 1ª semana de outubro\n💰 Condição: Faturamento 30/60 dias (R$ 94.000)\n🔗 CRM: Sincronizado no Ploomes (PL-3310)\n\n_Enviado via Doniq. Quer o painel da sua equipe toda? doniq.com.br/gestao_",
  },
};

export default function DemoMobile() {
  const [cenarioAtivo, setCenarioAtivo] = useState<Cenario["id"]>("alimentos");
  const cenario = CENARIOS[cenarioAtivo];

  const [etapa, setEtapa] = useState<1 | 2 | 3>(1);
  const [gravando, setGravando] = useState(false);
  const [pausado, setPausado] = useState(false);
  const [modoGravacao, setModoGravacao] = useState<"carro" | "portatil">("carro");
  const [segundos, setSegundos] = useState(0);
  const [centesimos, setCentesimos] = useState(0);
  const [empresaSelecionada, setEmpresaSelecionada] = useState(cenario.opcoesDuvida[0]);
  const [expandValidados, setExpandValidados] = useState(false);
  const [compartilhado, setCompartilhado] = useState(false);
  const [toast, setToast] = useState("");
  const [autoPlay, setAutoPlay] = useState(false);
  const [textoTranscrito, setTextoTranscrito] = useState("");

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const avisar = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  // Sincroniza estado quando o cenário muda.
  useEffect(() => {
    setEmpresaSelecionada(cenario.opcoesDuvida[0]);
    setTextoTranscrito("");
    setGravando(false);
    setPausado(false);
    setSegundos(0);
    setCentesimos(0);
    setCompartilhado(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cenarioAtivo]);

  // Timer de gravação com segundos e centésimos de precisão
  useEffect(() => {
    if (!gravando || pausado) return;
    const intervalSeg = setInterval(() => {
      setSegundos((s) => s + 1);
    }, 1000);
    const intervalCts = setInterval(() => {
      setCentesimos((c) => (c + 7) % 100);
    }, 60);
    return () => {
      clearInterval(intervalSeg);
      clearInterval(intervalCts);
    };
  }, [gravando, pausado]);

  // Efeito de digitação da transcrição ao vivo durante gravação
  useEffect(() => {
    if (!gravando) return;
    let index = 0;
    const palavras = cenario.falaVendedor.split(" ");
    setTextoTranscrito("");
    const interval = setInterval(() => {
      if (index < palavras.length) {
        setTextoTranscrito((prev) => (prev ? `${prev} ${palavras[index]}` : palavras[index]));
        index++;
      }
    }, 280);
    return () => clearInterval(interval);
  }, [gravando, cenario.falaVendedor]);

  // Motor do AutoPlay (Modo Apresentação Automática em 30s)
  useEffect(() => {
    if (!autoPlay) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    if (etapa === 1) {
      if (!gravando) {
        avisar("▶️ Modo Apresentação: Iniciando gravação no Modo Carro...");
        timerRef.current = setTimeout(() => {
          setGravando(true);
          setSegundos(0);
        }, 600);
      } else if (segundos >= 5) {
        timerRef.current = setTimeout(() => {
          setGravando(false);
          avisar("💾 Áudio enfileirado! IA estruturando campos...");
          setTimeout(() => setEtapa(2), 700);
        }, 800);
      }
    } else if (etapa === 2) {
      avisar("🔍 Revisão por Exceção: Campos de alta confiança aprovados automaticamente.");
      timerRef.current = setTimeout(() => {
        setEmpresaSelecionada(cenario.opcoesDuvida[0]);
        avisar("✓ Campo em dúvida confirmado em 1 toque!");
        setTimeout(() => {
          avisar("🚀 Enviando para o CRM...");
          setEtapa(3);
        }, 1200);
      }, 2400);
    } else if (etapa === 3) {
      timerRef.current = setTimeout(() => {
        copiarWhatsApp();
        setAutoPlay(false);
        avisar("🏁 Demonstração completa! O CRM foi atualizado e o WhatsApp gerado.");
      }, 1500);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, etapa, gravando, segundos, cenario]);

  const alternarGravacao = () => {
    if (!gravando) {
      setGravando(true);
      setPausado(false);
      setSegundos(0);
      avisar(
        modoGravacao === "carro"
          ? "🎙️ Gravando áudio no Modo Carro... Toque no botão massivo para concluir"
          : "🎙️ Gravando áudio portátil... Fale sobre a visita"
      );
    } else {
      setGravando(false);
      setPausado(false);
      avisar("💾 Áudio enfileirado no SQLite! IA estruturando os dados...");
      setTimeout(() => setEtapa(2), 600);
    }
  };

  const pausarGravacao = () => {
    setPausado(true);
    avisar("❚❚ Gravação pausada");
  };

  const retomarGravacao = () => {
    setPausado(false);
    avisar("▶ Gravando novamente");
  };

  const descartarGravacao = () => {
    setGravando(false);
    setPausado(false);
    setSegundos(0);
    setTextoTranscrito("");
    avisar("✕ Gravação descartada");
  };

  const copiarWhatsApp = () => {
    navigator.clipboard?.writeText?.(cenario.mensagemWhatsapp);
    setCompartilhado(true);
    avisar("📋 Resumo executivo copiado para o WhatsApp!");
  };

  const toggleAutoPlay = () => {
    if (autoPlay) {
      setAutoPlay(false);
      avisar("⏸️ Demonstração automática pausada.");
    } else {
      setEtapa(1);
      setGravando(false);
      setSegundos(0);
      setCompartilhado(false);
      setAutoPlay(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#050811] text-slate-100 flex flex-col font-sans select-none">
      {/* Topo Institucional de Navegação */}
      <header className="border-b border-slate-800/80 bg-[#060A14]/90 backdrop-blur sticky top-0 z-40 px-4 py-2.5 sm:px-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-slate-400 hover:text-white text-xs font-mono transition-colors flex items-center gap-1.5">
              <span>←</span>
              <span>Voltar ao Site</span>
            </Link>
            <span className="text-slate-700">|</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
              <span className="text-[11px] font-mono tracking-wider text-cyan-300 font-bold uppercase">
                Simulador Doniq Mobile v1.5
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={toggleAutoPlay}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all flex items-center gap-1.5 border ${
                autoPlay
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse"
                  : "bg-cyan-500/10 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/20"
              }`}
              title="Apresenta o fluxo completo de 30 segundos automaticamente"
            >
              <span>{autoPlay ? "⏸️" : "▶️"}</span>
              <span className="hidden sm:inline">
                {autoPlay ? "Pausar Auto-Demo" : "Apresentação Automática (30s)"}
              </span>
              <span className="sm:hidden">{autoPlay ? "Pausar" : "Auto-Demo"}</span>
            </button>

            <Link
              href="/gestao"
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            >
              Painel do Gestor →
            </Link>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal: Simulador + Painel de Vendas */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-12">
        {/* COLUNA ESQUERDA: Argumentário de Venda & Seletor de Ramos */}
        <div className="w-full lg:w-5/12 flex flex-col gap-5 text-left order-2 lg:order-1">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 font-mono text-[11px] mb-3">
              <span>🎯</span> MODO DEMONSTRAÇÃO CORPORATIVA
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight">
              A experiência real do vendedor em campo.
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
              Veja como o Doniq transforma um relato de voz falado no carro em uma oportunidade
              estruturada no CRM em 30 segundos, sem digitação.
            </p>
          </div>

          {/* Seletor de Cenário Setorial */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-2 font-semibold">
              Selecione o Ramo para Simulação:
            </span>
            <div className="grid grid-cols-3 gap-2">
              {(["alimentos", "saude", "agro"] as const).map((ramo) => {
                const item = CENARIOS[ramo];
                const ativo = cenarioAtivo === ramo;
                return (
                  <button
                    key={ramo}
                    onClick={() => {
                      setCenarioAtivo(ramo);
                      setEtapa(1);
                      setAutoPlay(false);
                    }}
                    className={`p-2.5 rounded-xl text-left transition-all border ${
                      ativo
                        ? "bg-cyan-500/20 border-cyan-400 text-white shadow-md shadow-cyan-950/40"
                        : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                    }`}
                  >
                    <div className="text-[11px] font-bold truncate">{item.cliente}</div>
                    <div className="text-[9px] font-mono text-cyan-400 mt-0.5 truncate">
                      {item.crmNome}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3 Pilares da Arquitetura Doniq */}
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl flex items-start gap-3">
              <span className="text-base">🚗</span>
              <div>
                <strong className="text-slate-200 block font-semibold">
                  Modo Carro com Fila Offline
                </strong>
                <span className="text-slate-400 text-[11px] leading-relaxed">
                  Botão de toque cego. O vendedor fala saindo do cliente e o relato fica salvo no
                  SQLite local mesmo sem sinal de celular.
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl flex items-start gap-3">
              <span className="text-base">⚡</span>
              <div>
                <strong className="text-slate-200 block font-semibold">
                  Revisão por Exceção (Regra dos 5s)
                </strong>
                <span className="text-slate-400 text-[11px] leading-relaxed">
                  Campos com confiança ≥ 85% são validados direto. O vendedor só gasta 5 segundos
                  conferindo dúvidas pontuais em chips de 1 toque.
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl flex items-start gap-3">
              <span className="text-base">🔒</span>
              <div>
                <strong className="text-slate-200 block font-semibold">
                  Privacidade Inviolável (Zero Áudio ao Gestor)
                </strong>
                <span className="text-slate-400 text-[11px] leading-relaxed">
                  Nenhum áudio bruto sai do celular do vendedor para o gestor. Apenas a ficha
                  aprovada sincroniza no CRM ({cenario.crmNome}).
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <Link
              href="/gestao"
              className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-xs shadow-lg shadow-cyan-950/40 hover:opacity-95 transition-all"
            >
              <span>Quero Testar com a Minha Equipe (Piloto B2B)</span>
              <span>→</span>
            </Link>
          </div>
        </div>

        {/* COLUNA DIREITA: Mockup do Smartphone com App Nativo v1.5 */}
        <div className="w-full lg:w-7/12 flex flex-col items-center order-1 lg:order-2">
          {/* Seletor rápido de ramo visível em telas menores */}
          <div className="w-full max-w-[370px] mb-2.5 flex items-center justify-between gap-1.5 lg:hidden">
            {(["alimentos", "saude", "agro"] as const).map((ramo) => {
              const item = CENARIOS[ramo];
              const ativo = cenarioAtivo === ramo;
              return (
                <button
                  key={ramo}
                  onClick={() => {
                    setCenarioAtivo(ramo);
                    setEtapa(1);
                    setAutoPlay(false);
                  }}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold font-mono transition-all border truncate ${
                    ativo
                      ? "bg-cyan-500/20 border-cyan-400 text-cyan-300"
                      : "bg-slate-900 border-slate-800 text-slate-400"
                  }`}
                >
                  {item.cliente.replace("Padaria ", "").replace("Hospital ", "").replace("Fazenda ", "")}
                </button>
              );
            })}
          </div>

          {/* Barra de controle de etapas no topo do frame */}
          <div className="w-full max-w-[370px] mb-3 flex items-center justify-between px-1">
            <div className="text-[11px] font-mono text-slate-400">
              Passo <span className="text-cyan-400 font-bold">{etapa}</span> de 3
            </div>
            <div className="flex gap-1 bg-slate-900 border border-slate-800 p-1 rounded-lg text-xs">
              <button
                onClick={() => {
                  setEtapa(1);
                  setAutoPlay(false);
                }}
                className={`px-2.5 py-1 rounded font-medium transition-all ${
                  etapa === 1 ? "bg-cyan-500/20 text-cyan-300 font-semibold" : "text-slate-400"
                }`}
              >
                1. Carro
              </button>
              <button
                onClick={() => {
                  setEtapa(2);
                  setAutoPlay(false);
                }}
                className={`px-2.5 py-1 rounded font-medium transition-all ${
                  etapa === 2 ? "bg-cyan-500/20 text-cyan-300 font-semibold" : "text-slate-400"
                }`}
              >
                2. Revisão
              </button>
              <button
                onClick={() => {
                  setEtapa(3);
                  setAutoPlay(false);
                }}
                className={`px-2.5 py-1 rounded font-medium transition-all ${
                  etapa === 3 ? "bg-cyan-500/20 text-cyan-300 font-semibold" : "text-slate-400"
                }`}
              >
                3. Feito
              </button>
            </div>
          </div>

          {/* Smartphone Frame (iPhone 16 Pro Style no Desktop / Full Screen no Mobile) */}
          <div className="w-full sm:max-w-[370px] min-h-[660px] sm:h-[720px] bg-[#040814] border-0 sm:border-[7px] border-slate-800 rounded-2xl sm:rounded-[46px] shadow-2xl shadow-cyan-950/40 relative overflow-hidden flex flex-col">
            {/* Dynamic Island: visível apenas no desktop */}
            <div className="w-full pt-3 px-6 justify-between items-center z-30 shrink-0 hidden sm:flex">
              <span className="text-[11px] font-mono font-medium text-slate-300">09:41</span>
              <div className="w-24 h-5 bg-black rounded-full mx-auto border border-slate-800 flex items-center justify-end pr-2">
                <div className="w-2 h-2 rounded-full bg-slate-900 border border-slate-700"></div>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-300">
                <span>5G</span>
                <div className="w-4 h-2.5 border border-slate-400 rounded-sm p-0.5 flex items-center">
                  <div className="w-2.5 h-full bg-emerald-400 rounded-2xs"></div>
                </div>
              </div>
            </div>

            {/* ETAPA 1: GRAVAÇÃO (MODO CARRO OU PORTÁTIL) */}
            {etapa === 1 && (
              <div className="flex-1 flex flex-col p-5 justify-between animate-fadeIn">
                <div>
                  <div className="flex items-center justify-between mb-3 mt-1">
                    {/* Seletor de Modo: Carro vs Portátil */}
                    <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 p-0.5 rounded-full">
                      <button
                        onClick={() => {
                          setModoGravacao("carro");
                          avisar("🚗 Modo Carro selecionado (Touchpad massivo)");
                        }}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold transition-all flex items-center gap-1 ${
                          modoGravacao === "carro"
                            ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <span>🚗</span> Carro
                      </button>
                      <button
                        onClick={() => {
                          setModoGravacao("portatil");
                          avisar("🎙️ Modo Portátil selecionado (Fora do Carro)");
                        }}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold transition-all flex items-center gap-1 ${
                          modoGravacao === "portatil"
                            ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <span>🎙️</span> Portátil
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#34d399]"></span>
                      CRM Online
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                      {modoGravacao === "carro" ? "Falar · Modo Carro" : "Falar · Gravador Portátil"}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {pausado ? (
                        <span className="text-amber-400 font-semibold">❚❚ Pausado</span>
                      ) : gravando ? (
                        <span className="text-rose-400 font-semibold animate-pulse">● Gravando</span>
                      ) : (
                        "Pronto"
                      )}
                    </span>
                  </div>

                  {/* Card Cliente */}
                  <div className="mt-3 p-3 bg-slate-900/90 border border-slate-800 rounded-2xl flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-cyan-400 text-xs">
                        {cenario.iniciais}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-100 text-xs">{cenario.cliente}</div>
                        <div className="font-mono text-[11px] text-slate-400">{cenario.subtitulo}</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-cyan-400 font-semibold px-2 py-0.5 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                      {cenario.badge}
                    </span>
                  </div>
                </div>

                {/* Centro com timer, ondas e botões */}
                <div className="flex flex-col items-center justify-center gap-4 my-auto">
                  <div className="text-center">
                    <div className="font-mono text-5xl font-bold tracking-tighter text-slate-100 tabular-nums drop-shadow-[0_2px_12px_rgba(32,214,244,0.3)]">
                      00<span className="text-cyan-400">:</span>
                      {String(segundos).padStart(2, "0")}
                      <span className="text-xl text-cyan-400/90 font-semibold ml-1">
                        .{String(centesimos).padStart(2, "0")}
                      </span>
                    </div>
                    {gravando && !pausado ? (
                      <div className="flex items-center justify-center gap-1 h-6 my-1.5" aria-hidden="true">
                        {[12, 18, 26, 16, 24, 30, 18, 26, 20, 24, 16, 20].map((h, i) => (
                          <span
                            key={i}
                            className="w-[2.5px] rounded-full bg-gradient-to-t from-cyan-400 to-blue-500 animate-pulse"
                            style={{
                              height: `${h}px`,
                              animationDelay: `${(i % 4) * 150}ms`,
                              animationDuration: "750ms",
                            }}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="text-[11px] font-mono text-slate-400 mt-1 font-medium">
                        {modoGravacao === "carro"
                          ? "Alvo massivo · operável sem olhar"
                          : pausado
                            ? "Gravação pausada · retome ou conclua"
                            : "Alta fidelidade · criptografia ponta a ponta"}
                      </div>
                    )}
                  </div>

                  {/* Transcrição ao Vivo Durante Gravação */}
                  {gravando && (
                    <div className="w-full bg-slate-900/80 border border-cyan-500/20 rounded-xl p-2.5 text-left max-h-20 overflow-y-auto">
                      <div className="text-[9px] font-mono text-cyan-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                        Transcrição em tempo real
                      </div>
                      <p className="text-[11px] text-slate-300 italic leading-snug">
                        "{textoTranscrito || "Ouvindo relato do vendedor..."}"
                      </p>
                    </div>
                  )}

                  {modoGravacao === "carro" ? (
                    /* MODO CARRO: Botão Massivo 144x144 com Halo Concêntrico */
                    <div className="relative flex items-center justify-center my-2">
                      {gravando ? (
                        <>
                          <span className="absolute -inset-4 rounded-full bg-rose-500/25 animate-ping pointer-events-none" />
                          <span className="absolute -inset-8 rounded-full border-2 border-rose-500/30 animate-pulse pointer-events-none" />
                        </>
                      ) : (
                        <>
                          <span className="absolute -inset-3 rounded-full border border-cyan-400/25 pointer-events-none animate-pulse" />
                          <span className="absolute -inset-6 rounded-full border border-cyan-400/15 pointer-events-none" />
                        </>
                      )}
                      <button
                        onClick={alternarGravacao}
                        className={`w-36 h-36 rounded-full flex flex-col items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all relative z-10 ${
                          gravando
                            ? "bg-gradient-to-br from-rose-600 to-red-700 shadow-2xl shadow-red-950 border-4 border-red-400/60"
                            : "bg-gradient-to-br from-cyan-400 via-blue-600 to-indigo-700 shadow-2xl shadow-cyan-950/70 border-4 border-cyan-300/50"
                        }`}
                      >
                        {gravando ? (
                          <>
                            <div className="w-8 h-8 bg-white rounded-lg"></div>
                            <span className="text-[11px] font-bold tracking-wider font-mono text-white">
                              CONCLUIR
                            </span>
                          </>
                        ) : (
                          <>
                            <svg
                              className="w-7 h-7 text-white"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2.2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                              />
                            </svg>
                            <span className="text-[11px] font-bold tracking-wider font-mono text-white">
                              TOCAR P/ GRAVAR
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    /* MODO PORTÁTIL (FORA DO CARRO): Console Ergonômico Direction D */
                    <div className="w-full flex flex-col items-center justify-center">
                      {!gravando ? (
                        /* Estado Idle Portátil */
                        <div className="flex flex-col items-center gap-2">
                          <button
                            onClick={alternarGravacao}
                            aria-label="Iniciar gravação"
                            className="w-20 h-20 rounded-full flex items-center justify-center bg-slate-900/90 border-2 border-cyan-400 shadow-xl shadow-cyan-950/60 hover:bg-slate-850 active:scale-95 transition-all text-white"
                          >
                            <svg
                              className="w-8 h-8 text-cyan-400"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2.2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                              />
                            </svg>
                          </button>
                          <span className="text-xs font-bold font-mono tracking-wider text-slate-100 mt-1">
                            TOCAR PARA GRAVAR
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Grave a pé, no elevador ou ao sair da visita
                          </span>
                        </div>
                      ) : (
                        /* Estado Gravando ou Pausado Portátil: Cluster de 3 Botões */
                        <div className="flex items-center justify-center gap-6">
                          {/* Botão 1: Pausar / Retomar */}
                          <div className="flex flex-col items-center gap-1.5">
                            <button
                              onClick={pausado ? retomarGravacao : pausarGravacao}
                              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all border ${
                                pausado
                                  ? "bg-cyan-500 text-slate-950 border-cyan-300 shadow-lg shadow-cyan-950/50"
                                  : "bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500"
                              }`}
                              title={pausado ? "Retomar gravação" : "Pausar gravação"}
                            >
                              {pausado ? (
                                <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              ) : (
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                                </svg>
                              )}
                            </button>
                            <span className={`text-[10px] font-semibold ${pausado ? "text-cyan-400" : "text-slate-400"}`}>
                              {pausado ? "Retomar" : "Pausar"}
                            </span>
                          </div>

                          {/* Botão 2 (Centro): Concluir */}
                          <div className="flex flex-col items-center gap-1.5">
                            <button
                              onClick={alternarGravacao}
                              aria-label="Concluir relato de visita"
                              className="w-18 h-18 rounded-full flex items-center justify-center bg-gradient-to-br from-rose-600 to-red-700 shadow-xl shadow-red-950 border-3 border-rose-400 active:scale-95 transition-all text-white"
                              title="Concluir relato de visita"
                            >
                              <div className="w-5 h-5 bg-white rounded-sm"></div>
                            </button>
                            <span className="text-[11px] font-bold text-rose-400">
                              Concluir
                            </span>
                          </div>

                          {/* Botão 3: Descartar */}
                          <div className="flex flex-col items-center gap-1.5">
                            <button
                              onClick={descartarGravacao}
                              aria-label="Descartar áudio"
                              className="w-14 h-14 rounded-full flex items-center justify-center bg-slate-900 text-slate-400 border border-slate-700 hover:border-slate-500 transition-all"
                              title="Descartar áudio"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                            <span className="text-[10px] font-semibold text-slate-400">
                              Descartar
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="text-center pb-1">
                  <p className="text-[10px] text-slate-400">
                    {modoGravacao === "carro"
                      ? "Ao entrar no carro antes de dar a partida, toque e relate com calma."
                      : "Fora do carro: fale naturalmente a caminho do próximo compromisso."}
                  </p>
                </div>
              </div>
            )}

            {/* ETAPA 2: REVISÃO POR EXCEÇÃO */}
            {etapa === 2 && (
              <div className="flex-1 flex flex-col p-5 justify-between animate-fadeIn">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
                      <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-semibold">
                        Revisão por Exceção
                      </span>
                    </div>
                    <span className="text-[10px] font-mono bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded border border-cyan-500/20">
                      REGRA 5s
                    </span>
                  </div>

                  <h2 className="text-base font-bold text-slate-100 leading-tight">
                    Confirme o essencial.
                  </h2>
                  <p className="text-[11px] text-slate-400 mt-0.5 mb-3">
                    A IA já estruturou 4 campos com 95%+ de precisão. Ajuste apenas a dúvida:
                  </p>

                  {/* Dúvida em Destaque */}
                  <div className="bg-amber-950/30 border-2 border-amber-500/40 rounded-2xl p-3 mb-3 shadow-lg">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5 text-amber-400 text-xs font-semibold">
                        <span>⚠️</span> Dúvida na fala ({cenario.confiancaDuvida}% confiança)
                      </div>
                      <span className="text-[9px] uppercase font-mono text-slate-400">
                        {cenario.duvidaCampo}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      {cenario.opcoesDuvida.map((opt) => {
                        const selecionado = empresaSelecionada === opt;
                        return (
                          <button
                            key={opt}
                            onClick={() => {
                              setEmpresaSelecionada(opt);
                              avisar(`Opção confirmada: ${opt}`);
                            }}
                            className={`px-3 py-2.5 rounded-xl text-xs font-semibold text-left transition-all border flex items-center justify-between active:scale-[0.98] ${
                              selecionado
                                ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-sm"
                                : "bg-slate-900/90 border-slate-700 text-slate-300 hover:border-slate-500"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center text-[9px] ${
                                selecionado ? "border-cyan-400 bg-cyan-400 text-slate-950 font-bold" : "border-slate-600"
                              }`}>
                                {selecionado && "✓"}
                              </span>
                              <span>{opt}</span>
                            </div>
                            <span className="text-[10px] font-mono text-slate-400">1 toque</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Campos de Alta Confiança Colapsados */}
                  <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 shadow-sm">
                    <button
                      onClick={() => setExpandValidados(!expandValidados)}
                      className="w-full flex items-center justify-between text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 text-[10px] font-bold">
                          ✓
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-slate-200">
                            4 campos estruturados pela IA
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            Alta confiança · Contato, Ação, Prazo e CRM
                          </div>
                        </div>
                      </div>
                      <span className="text-slate-400 text-xs font-mono">
                        {expandValidados ? "▲" : "▼"}
                      </span>
                    </button>

                    {expandValidados && (
                      <div className="mt-2.5 pt-2.5 border-t border-slate-800 space-y-2 text-xs">
                        <div className="flex justify-between items-center bg-slate-950/50 p-2 rounded-lg border border-slate-800/80">
                          <div>
                            <span className="text-slate-400 uppercase text-[9px] font-mono tracking-wider block">CONTATO</span>
                            <span className="font-medium text-[11px] text-slate-200">{cenario.camposValidados.contato.split("·")[0]}</span>
                          </div>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">96%</span>
                        </div>
                        <div className="flex justify-between items-center bg-slate-950/50 p-2 rounded-lg border border-slate-800/80">
                          <div>
                            <span className="text-slate-400 uppercase text-[9px] font-mono tracking-wider block">PRÓXIMO PASSO</span>
                            <span className="font-medium text-[11px] text-slate-200">{cenario.camposValidados.proximo.split("·")[0]}</span>
                          </div>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">94%</span>
                        </div>
                        <div className="flex justify-between items-center bg-slate-950/50 p-2 rounded-lg border border-slate-800/80">
                          <div>
                            <span className="text-slate-400 uppercase text-[9px] font-mono tracking-wider block">DATA COMBINADA</span>
                            <span className="font-medium text-[11px] text-slate-200">{cenario.camposValidados.prazo.split("·")[0]}</span>
                          </div>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">93%</span>
                        </div>
                        <div className="flex justify-between items-center bg-slate-950/50 p-2 rounded-lg border border-slate-800/80">
                          <div>
                            <span className="text-slate-400 uppercase text-[9px] font-mono tracking-wider block">CRM DESTINO</span>
                            <span className="font-medium text-[11px] text-cyan-400">{cenario.camposValidados.crm.split("·")[0]}</span>
                          </div>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">90%</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/80">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-2 font-mono">
                    <span>Revisão: 4.2s</span>
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <span>⚡</span> Economia estimada: ~14 min
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      avisar(`🚀 Sincronizando com o ${cenario.crmNome}...`);
                      setTimeout(() => setEtapa(3), 500);
                    }}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-400 via-blue-600 to-indigo-600 text-white font-bold text-xs shadow-lg shadow-cyan-950/50 hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Confirmar e Enviar ao CRM</span>
                    <span>→</span>
                  </button>
                </div>
              </div>
            )}

            {/* ETAPA 3: CONCLUSÃO GAMIFICADA & LOOP B2B */}
            {etapa === 3 && (
              <div className="flex-1 flex flex-col p-5 justify-between animate-fadeIn">
                <div>
                  <div className="flex items-center justify-between mb-3 mt-1">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] tracking-wider uppercase font-semibold">
                      ✓ Sincronizado no CRM
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">
                      {cenario.crmNome} {cenario.crmId}
                    </span>
                  </div>

                  <div className="bg-gradient-to-b from-cyan-950/20 to-slate-900/60 border border-cyan-500/20 rounded-2xl p-4 mb-3 text-center">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 text-slate-950 mx-auto flex items-center justify-center font-black text-xl mb-2 shadow-lg shadow-cyan-500/30">
                      ✓
                    </div>
                    <h2 className="text-lg font-bold text-slate-100">Falou, tá feito.</h2>
                    <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                      Visita registrada. Próximo passo e oportunidade criados no {cenario.crmNome}.
                    </p>

                    {/* Badge Gamificado */}
                    <div className="mt-3 p-2.5 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-center gap-2.5 text-left">
                      <span className="text-xl">⏱️</span>
                      <div>
                        <div className="text-xs font-bold text-cyan-300">Você economizou ~15 minutos</div>
                        <div className="text-[10px] text-slate-300 font-mono">
                          Total na semana: 1h 45m fora do teclado.
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Loop B2B / Cavalo de Troia */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5">
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 text-xs shrink-0">
                        📤
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-bold text-slate-100">Compartilhar com Gestão</div>
                        <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                          Envie o resumo executivo no WhatsApp do gestor. Ficha estruturada, zero áudio.
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={copiarWhatsApp}
                      className={`mt-2.5 w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        compartilhado
                          ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300"
                          : "bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-300"
                      }`}
                    >
                      <span>📲</span>
                      <span>
                        {compartilhado
                          ? "✓ Resumo Copiado para WhatsApp!"
                          : "Copiar Resumo Executivo para WhatsApp"}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                  <button
                    onClick={() => {
                      setEtapa(1);
                      setGravando(false);
                      setSegundos(0);
                      setCompartilhado(false);
                      setAutoPlay(false);
                    }}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-xs shadow-lg shadow-cyan-950/50 hover:opacity-95 active:scale-[0.98] transition-all cursor-pointer"
                  >
                    Iniciar Próxima Visita (Modo Carro)
                  </button>
                  <button
                    onClick={() => setEtapa(2)}
                    className="w-full py-1.5 text-[11px] font-mono text-slate-400 hover:text-slate-200 text-center cursor-pointer"
                  >
                    Rever campos da visita
                  </button>
                </div>
              </div>
            )}

            {/* Home Indicator */}
            <div className="w-full pb-2 pt-1 flex justify-center z-30 shrink-0">
              <div className="w-32 h-1 bg-slate-700 rounded-full"></div>
            </div>
          </div>
        </div>
      </main>

      {/* Toast flutuante */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-800/95 border border-cyan-500/50 text-cyan-300 text-xs px-4 py-2.5 rounded-xl shadow-2xl z-50 flex items-center gap-2 backdrop-blur animate-fade-in font-mono">
          <span>ℹ️</span>
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}
