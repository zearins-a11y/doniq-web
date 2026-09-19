import { useEffect, useMemo, useState } from "react";
import { RotateCcw, Search, X } from "lucide-react";
import {
  AnimatePresence,
  LayoutGroup,
  m,
  useReducedMotion,
} from "motion/react";
import { SemVisitas } from "../components/icones-marca";
import { useEsconderGuia } from "../components/guia";
import ItemRelato from "../components/item-relato";
import { AnimateNumber } from "../components/motion-text";
import { SkeletonRelato } from "../components/Skeleton";
import { type Relato, api } from "../lib/api";
import { classificarCategoriaObjecao } from "../lib/objecoes";
import { avaliarRiscoSilencio } from "../lib/sla-retomada";

const semAcento = (s: string) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const FILTROS = [
  { id: "todas", rotulo: "Todas" },
  { id: "esfriando", rotulo: "Esfriando 🚨" },
  { id: "quente", rotulo: "Quentes" },
  { id: "morna", rotulo: "Mornas" },
  { id: "fria", rotulo: "Frias" },
  { id: "objecao", rotulo: "Com Objeção 🎯" },
  { id: "pendente", rotulo: "Prazo Pendente ⚠️" },
] as const;

type Filtro = (typeof FILTROS)[number]["id"];

const SUB_OBJECOES = [
  { id: "todas_obj", rotulo: "Todas" },
  { id: "preco", rotulo: "Preço" },
  { id: "concorrente", rotulo: "Concorrente" },
  { id: "timing", rotulo: "Timing" },
  { id: "decisor", rotulo: "Decisor" },
  { id: "risco", rotulo: "Risco" },
] as const;

type SubObjecao = (typeof SUB_OBJECOES)[number]["id"];

function rotuloPeriodo(valor: string): string {
  if (!valor) return "Sem data de registro";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "Sem data de registro";
  const rotulo = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(data);
  return rotulo.charAt(0).toUpperCase() + rotulo.slice(1);
}

export default function Historico({
  onAbrir,
  recarga,
}: {
  onAbrir: (r: Relato) => void;
  recarga: number;
}) {
  useEsconderGuia();
  const reduzirMovimento = useReducedMotion();
  const [relatos, setRelatos] = useState<Relato[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [subObjecao, setSubObjecao] = useState<SubObjecao>("todas_obj");

  useEffect(() => {
    let vivo = true;
    api
      .listar()
      .then((d) => vivo && setRelatos(d))
      .catch((e) => vivo && setErro((e as Error).message))
      .finally(() => vivo && setCarregando(false));
    return () => {
      vivo = false;
    };
  }, [recarga]);

  const filtrados = useMemo(() => {
    const b = semAcento(busca.trim());
    return relatos.filter((r) => {
      if (filtro === "esfriando") {
        const diag = avaliarRiscoSilencio(r);
        if (diag.gravidade !== "critico" && diag.gravidade !== "atencao") return false;
      } else if (filtro === "quente" || filtro === "morna" || filtro === "fria") {
        if (r.temperatura !== filtro) return false;
      } else if (filtro === "objecao") {
        if (!r.objecao?.trim()) return false;
        if (subObjecao !== "todas_obj") {
          const cat = classificarCategoriaObjecao(r.objecao);
          if (cat !== subObjecao) return false;
        }
      } else if (filtro === "pendente") {
        const prazoPendente =
          !r.audio_ininteligivel &&
          Boolean(r.proxima_acao) &&
          (!r.data_iso || Boolean(r.precisa_confirmar));
        if (!prazoPendente) return false;
      }

      if (!b) return true;
      const alvo = semAcento(
        [
          r.empresa,
          r.contato,
          r.resumo,
          r.objecao,
          (r.concorrentes || []).join(" "),
        ].join(" "),
      );
      return alvo.includes(b);
    });
  }, [relatos, busca, filtro, subObjecao]);

  const contagens = useMemo(
    () => ({
      todas: relatos.length,
      esfriando: relatos.filter((r) => {
        const d = avaliarRiscoSilencio(r);
        return d.gravidade === "critico" || d.gravidade === "atencao";
      }).length,
      quente: relatos.filter((r) => r.temperatura === "quente").length,
      morna: relatos.filter((r) => r.temperatura === "morna").length,
      fria: relatos.filter((r) => r.temperatura === "fria").length,
      objecao: relatos.filter((r) => Boolean(r.objecao?.trim())).length,
      pendente: relatos.filter(
        (r) =>
          !r.audio_ininteligivel &&
          Boolean(r.proxima_acao) &&
          (!r.data_iso || Boolean(r.precisa_confirmar)),
      ).length,
      revisar: relatos.filter((r) => r.campos_a_revisar?.length && !r.revisado)
        .length,
    }),
    [relatos],
  );

  const grupos = useMemo(() => {
    const agrupados = new Map<string, Relato[]>();
    for (const relato of filtrados) {
      const periodo = rotuloPeriodo(relato.created_at);
      const grupo = agrupados.get(periodo) ?? [];
      grupo.push(relato);
      agrupados.set(periodo, grupo);
    }
    return [...agrupados.entries()];
  }, [filtrados]);

  const filtrosAtivos = Boolean(busca.trim()) || filtro !== "todas";
  const transicao = reduzirMovimento
    ? { duration: 0 }
    : { duration: 0.18, ease: [0.22, 1, 0.36, 1] as const };

  if (carregando)
    return (
      <div style={{ marginTop: 16 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonRelato key={i} />
        ))}
      </div>
    );
  if (erro)
    return (
      <div className="alerta" style={{ marginTop: 16 }}>
        {erro} —{" "}
        <button className="chip" onClick={() => setErro("")}>
          tentar de novo
        </button>
      </div>
    );
  return (
    <div className="historico-pagina">
      <section
        className="historico-comando"
        aria-label="Busca e filtros do histórico"
      >
        <label className="historico-busca">
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">Buscar visitas</span>
          <input
            name="busca-historico"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar empresa, contato, objeção ou concorrente"
            aria-label="Buscar por empresa, contato, objeção ou concorrente"
          />
          {busca && (
            <button
              type="button"
              onClick={() => setBusca("")}
              aria-label="Limpar busca"
              title="Limpar busca"
            >
              <X size={17} aria-hidden="true" />
            </button>
          )}
        </label>

        <div className="historico-resumo" aria-label="Resumo do histórico">
          <button
            type="button"
            className={filtro === "todas" ? "sel" : ""}
            onClick={() => {
              setFiltro("todas");
              setSubObjecao("todas_obj");
            }}
            aria-label="Ver todas as visitas registradas"
          >
            <span>Total</span>
            <strong>
              <AnimateNumber>{relatos.length}</AnimateNumber>
            </strong>
          </button>
          <button
            type="button"
            className={filtro === "esfriando" ? "sel" : ""}
            onClick={() => setFiltro("esfriando")}
            aria-label="Filtrar oportunidades esfriando em risco de perda"
          >
            <span>Esfriando</span>
            <strong style={{ color: "var(--carimbo)" }}>
              <AnimateNumber>{contagens.esfriando}</AnimateNumber>
            </strong>
          </button>
          <button
            type="button"
            className={filtro === "quente" ? "sel" : ""}
            onClick={() => setFiltro("quente")}
            aria-label="Filtrar oportunidades quentes"
          >
            <span>Quentes</span>
            <strong style={{ color: "var(--carimbo)" }}>
              <AnimateNumber>{contagens.quente}</AnimateNumber>
            </strong>
          </button>
          <button
            type="button"
            className={filtro === "objecao" ? "sel" : ""}
            onClick={() => setFiltro("objecao")}
            aria-label="Filtrar visitas com objeções comerciais"
          >
            <span>Com Objeção</span>
            <strong style={{ color: "var(--ocre)" }}>
              <AnimateNumber>{contagens.objecao}</AnimateNumber>
            </strong>
          </button>
          <button
            type="button"
            className={filtro === "pendente" ? "sel" : ""}
            onClick={() => setFiltro("pendente")}
            aria-label="Filtrar visitas com prazo pendente"
          >
            <span>Sem Prazo</span>
            <strong style={{ color: "var(--ocre)" }}>
              <AnimateNumber>{contagens.pendente}</AnimateNumber>
            </strong>
          </button>
          <div className={contagens.revisar ? "historico-resumo-atencao" : ""}>
            <span>A conferir</span>
            <strong>
              <AnimateNumber>{contagens.revisar}</AnimateNumber>
            </strong>
          </div>
        </div>

        <LayoutGroup id="historico-filtros">
          <fieldset className="historico-filtros">
            <legend className="sr-only">Filtrar por status e temperatura</legend>
            {FILTROS.map(({ id, rotulo }) => {
              const selecionado = filtro === id;
              return (
                <button
                  type="button"
                  key={id}
                  className={selecionado ? "sel" : ""}
                  aria-pressed={selecionado}
                  onClick={() => {
                    setFiltro(id);
                    if (id !== "objecao") setSubObjecao("todas_obj");
                  }}
                >
                  {selecionado && (
                    <m.span
                      className="historico-filtro-indicador"
                      layoutId="historico-filtro-ativo"
                      transition={
                        reduzirMovimento
                          ? { duration: 0 }
                          : { type: "spring", stiffness: 460, damping: 40 }
                      }
                      aria-hidden="true"
                    />
                  )}
                  <span>{rotulo}</span>
                  <small>{contagens[id]}</small>
                </button>
              );
            })}
          </fieldset>
        </LayoutGroup>

        {filtro === "objecao" && (
          <div
            className="historico-sub-filtros"
            aria-label="Filtrar por família de objeção"
          >
            <span>Família:</span>
            {SUB_OBJECOES.map(({ id, rotulo }) => {
              const sel = subObjecao === id;
              return (
                <button
                  type="button"
                  key={id}
                  className={`chip ${sel ? "sel" : ""}`}
                  onClick={() => setSubObjecao(id)}
                  aria-pressed={sel}
                >
                  {rotulo}
                </button>
              );
            })}
          </div>
        )}
      </section>

      <header className="historico-resultados-topo">
        <div>
          <span>{filtrosAtivos ? "Resultado filtrado" : "Linha do tempo"}</span>
          <h2>
            <AnimateNumber>{filtrados.length}</AnimateNumber>{" "}
            {filtrados.length === 1 ? "visita" : "visitas"}
          </h2>
        </div>
        {filtrosAtivos && (
          <button
            type="button"
            className="historico-limpar"
            onClick={() => {
              setBusca("");
              setFiltro("todas");
              setSubObjecao("todas_obj");
            }}
          >
            <RotateCcw size={15} aria-hidden="true" />
            Limpar filtros
          </button>
        )}
      </header>

      <AnimatePresence mode="wait" initial={false}>
        {filtrados.length === 0 ? (
          <m.div
            key="vazio"
            className="vazio-estado historico-vazio"
            initial={{ opacity: 0, y: reduzirMovimento ? 0 : 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={transicao}
          >
            <div className="vazio-arte">
              <SemVisitas l={relatos.length ? 150 : 210} />
            </div>
            <b>
              {relatos.length
                ? "Nenhuma visita corresponde aos filtros"
                : "Nenhuma visita ainda"}
            </b>
            <p>
              {relatos.length
                ? "Tente outro termo ou amplie os filtros."
                : "Grave o primeiro relato na aba Novo."}
            </p>
            {filtrosAtivos && (
              <button
                type="button"
                className="historico-limpar"
                onClick={() => {
                  setBusca("");
                  setFiltro("todas");
                  setSubObjecao("todas_obj");
                }}
              >
                <RotateCcw size={15} aria-hidden="true" />
                Limpar filtros
              </button>
            )}
          </m.div>
        ) : (
          <m.div
            key="resultados"
            className="historico-grupos"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={transicao}
          >
            {grupos.map(([periodo, itens]) => (
              <m.section className="historico-grupo" key={periodo} layout>
                <header>
                  <h3>{periodo}</h3>
                  <span>{itens.length}</span>
                </header>
                <AnimatePresence initial={false} mode="popLayout">
                  {itens.map((r) => (
                    <m.div
                      key={r.relato_id}
                      layout="position"
                      initial={{ opacity: 0, y: reduzirMovimento ? 0 : 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: reduzirMovimento ? 1 : 0.99 }}
                      transition={transicao}
                    >
                      <ItemRelato r={r} onAbrir={onAbrir} mostrarQuando />
                    </m.div>
                  ))}
                </AnimatePresence>
              </m.section>
            ))}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
