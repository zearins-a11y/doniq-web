import {
  Activity,
  Check,
  ChevronDown,
  CircleAlert,
  Clock3,
  KeyRound,
  Link2,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Workflow,
} from "lucide-react";
import { MotionConfig, m, AnimatePresence, useReducedMotion } from "motion/react";
import { useEffect, useId, useState } from "react";
import { IconeSincronizar } from "../components/icones-marca";
import { useEsconderGuia } from "../components/guia";
import { AnimateNumber } from "../components/motion-text";
import {
  type Integracao,
  type ProvedorCrm,
  type SalvarIntegracao,
  type Sincronizacao,
  api,
} from "../lib/api";

const CAMPOS_MAPEAVEIS: { chave: string; rotulo: string }[] = [
  { chave: "temperatura", rotulo: "Temperatura" },
  { chave: "objecao", rotulo: "Objeção" },
  { chave: "concorrentes", rotulo: "Concorrentes" },
  { chave: "numeros", rotulo: "Números citados" },
  { chave: "visita_em", rotulo: "Data da visita" },
  { chave: "chave_relato", rotulo: "Chave do relato" },
];

type Historico = (Sincronizacao & { relato_id: string })[];

function formatarMomento(valor: string) {
  if (!valor) return "sem teste recente";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return valor;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(data);
}

function statusIntegracao(atual?: Integracao) {
  if (!atual) return { classe: "disponivel", texto: "Disponível" };
  if (!atual.ativa) return { classe: "pausada", texto: "Pausada" };
  if (atual.ultimo_teste_ok) return { classe: "saudavel", texto: "Operando" };
  return { classe: "falha", texto: "Requer atenção" };
}

export default function Integracoes(props: { avisar: (m: string) => void }) {
  return (
    <MotionConfig reducedMotion="user">
      <IntegracoesConteudo {...props} />
    </MotionConfig>
  );
}

function IntegracoesConteudo({ avisar }: { avisar: (m: string) => void }) {
  useEsconderGuia();
  const reduzirMovimento = useReducedMotion();
  const [provedores, setProvedores] = useState<ProvedorCrm[]>([]);
  const [conectadas, setConectadas] = useState<Integracao[]>([]);
  const [historico, setHistorico] = useState<Historico>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroCarregamento, setErroCarregamento] = useState("");
  const [abrindo, setAbrindo] = useState("");
  const [testando, setTestando] = useState("");
  const [removendo, setRemovendo] = useState("");
  const [reenviando, setReenviando] = useState("");

  const reenviar = async (relatoId: string, provedor: string) => {
    const chave = `${relatoId}-${provedor}`;
    setReenviando(chave);
    try {
      const resultado = await api.sincronizarRelato(
        relatoId,
        provedor as SalvarIntegracao["provedor"],
      );
      const sucesso = resultado.resultados.some((r) => r.status === "enviado");
      const primeiro = resultado.resultados[0];
      avisar(
        sucesso
          ? `Sincronizado com ${provedor} com sucesso.`
          : `Erro ao sincronizar com ${provedor}: ${primeiro?.erro || "Falha de conexão"}`,
      );
      await recarregar();
    } catch (e) {
      avisar((e as Error).message);
    } finally {
      setReenviando("");
    }
  };

  const recarregar = async () => {
    setErroCarregamento("");
    try {
      const [ps, is, hs] = await Promise.all([
        api.provedoresCrm(),
        api.integracoes(),
        api.historicoSincronizacoes(),
      ]);
      setProvedores(ps);
      setConectadas(is);
      setHistorico(hs);
    } catch (e) {
      const mensagem = (e as Error).message;
      setErroCarregamento(mensagem);
      avisar(mensagem);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    void recarregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const testar = async (provedor: ProvedorCrm) => {
    setTestando(provedor.provedor);
    try {
      const resultado = await api.testarIntegracao(
        provedor.provedor as SalvarIntegracao["provedor"],
      );
      avisar(
        resultado.ok
          ? `${provedor.nome} conectado com sucesso.`
          : resultado.erro,
      );
      await recarregar();
    } catch (e) {
      avisar((e as Error).message);
    } finally {
      setTestando("");
    }
  };

  const remover = async (provedor: ProvedorCrm) => {
    if (!window.confirm(`Desconectar o ${provedor.nome}?`)) return;
    setRemovendo(provedor.provedor);
    try {
      await api.removerIntegracao(
        provedor.provedor as SalvarIntegracao["provedor"],
      );
      avisar(`${provedor.nome} foi desconectado.`);
      setAbrindo("");
      await recarregar();
    } catch (e) {
      avisar((e as Error).message);
    } finally {
      setRemovendo("");
    }
  };

  if (carregando) {
    return (
      <output className="crm-carregando" aria-live="polite">
        <span className="crm-carregando-pulso" aria-hidden="true" />
        <div>
          <strong>Verificando conexões</strong>
          <span>Consultando seus CRMs e últimos envios.</span>
        </div>
      </output>
    );
  }

  if (erroCarregamento && provedores.length === 0) {
    return (
      <section className="crm-erro" role="alert">
        <CircleAlert aria-hidden="true" />
        <div>
          <h2>Não foi possível carregar as integrações</h2>
          <p>{erroCarregamento}</p>
          <button
            className="btn2"
            type="button"
            onClick={() => void recarregar()}
          >
            <RefreshCw size={17} aria-hidden="true" />
            Tentar novamente
          </button>
        </div>
      </section>
    );
  }

  const ativas = conectadas.filter((item) => item.ativa).length;
  const saudaveis = conectadas.filter(
    (item) => item.ativa && item.ultimo_teste_ok,
  ).length;
  const falhas = conectadas.filter(
    (item) => item.ativa && !item.ultimo_teste_ok,
  ).length;
  const enviados = historico.filter((item) => item.status === "enviado").length;

  return (
    <div className="crm-workspace">
      <section className="crm-resumo" aria-labelledby="crm-resumo-titulo">
        <div className="crm-resumo-cabecalho">
          <div className="crm-resumo-icone" aria-hidden="true">
            <IconeSincronizar s={52} />
          </div>
          <div>
            <p className="crm-sobretitulo">Fluxo conectado</p>
            <h2 id="crm-resumo-titulo">Do relato conferido ao CRM</h2>
            <p>
              Configure uma vez. Depois, cada visita revisada segue com
              contexto, próximos passos e campos da sua operação.
            </p>
          </div>
        </div>

        <div className="crm-metricas" aria-label="Resumo das integrações">
          <div className="crm-metrica">
            <span>Conexões ativas</span>
            <strong>
              <AnimateNumber>{ativas}</AnimateNumber>
            </strong>
            <small>de {provedores.length} disponíveis</small>
          </div>
          <div className="crm-metrica">
            <span>Operando</span>
            <strong className="crm-numero-ok">
              <AnimateNumber>{saudaveis}</AnimateNumber>
            </strong>
            <small>
              {falhas ? `${falhas} requer atenção` : "sem falhas detectadas"}
            </small>
          </div>
          <div className="crm-metrica">
            <span>Envios recentes</span>
            <strong>
              <AnimateNumber>{enviados}</AnimateNumber>
            </strong>
            <small>nos últimos registros</small>
          </div>
        </div>

        <div className="crm-fluxo" aria-label="Fluxo de sincronização">
          <span>
            <Check size={15} aria-hidden="true" />
            Relato revisado
          </span>
          <i aria-hidden="true" />
          <span>
            <Workflow size={15} aria-hidden="true" />
            Campos mapeados
          </span>
          <i aria-hidden="true" />
          <span>
            <Link2 size={15} aria-hidden="true" />
            CRM atualizado
          </span>
        </div>
      </section>

      <section className="crm-secao" aria-labelledby="crm-conexoes-titulo">
        <div className="crm-secao-cabecalho">
          <div>
            <p className="crm-sobretitulo">Conexões</p>
            <h2 id="crm-conexoes-titulo">Escolha onde o trabalho continua</h2>
          </div>
          <span className="crm-secao-contagem">
            {conectadas.length} configuradas
          </span>
        </div>

        <div className="crm-provedores">
          {provedores.map((provedor, indice) => {
            const atual = conectadas.find(
              (item) => item.provedor === provedor.provedor,
            );
            const status = statusIntegracao(atual);
            const aberto = abrindo === provedor.provedor;
            const tituloId = `crm-provedor-${provedor.provedor}`;

            return (
              <m.article
                layout="position"
                className={`crm-provedor crm-provedor-${status.classe}${aberto ? " aberto" : ""}`}
                key={provedor.provedor}
                initial={
                  reduzirMovimento ? { opacity: 0 } : { opacity: 0, y: 10 }
                }
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: reduzirMovimento ? 0 : indice * 0.035,
                  duration: 0.2,
                }}
                aria-labelledby={tituloId}
              >
                <div className="crm-provedor-principal">
                  <div className="crm-provedor-identidade">
                    <span className="crm-provedor-marca" aria-hidden="true">
                      {provedor.nome.slice(0, 2).toUpperCase()}
                    </span>
                    <div>
                      <h3 id={tituloId}>{provedor.nome}</h3>
                      <span
                        className={`crm-status crm-status-${status.classe}`}
                      >
                        <i aria-hidden="true" />
                        {status.texto}
                      </span>
                    </div>
                  </div>

                  <div className="crm-provedor-detalhes">
                    {atual ? (
                      <>
                        <span>
                          <KeyRound size={15} aria-hidden="true" />
                          token {atual.token_mascarado}
                        </span>
                        <span>
                          <Clock3 size={15} aria-hidden="true" />
                          {formatarMomento(atual.ultimo_teste_em)}
                        </span>
                        {(atual.etapa_id || atual.funil_id) && (
                          <span>
                            <Workflow size={15} aria-hidden="true" />
                            {[
                              atual.etapa_id && `etapa ${atual.etapa_id}`,
                              atual.funil_id && `funil ${atual.funil_id}`,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        )}
                      </>
                    ) : (
                      <span>{provedor.ajuda}</span>
                    )}
                  </div>

                  {atual &&
                    !atual.ultimo_teste_ok &&
                    atual.ultimo_teste_erro && (
                      <div className="crm-provedor-alerta">
                        <CircleAlert size={17} aria-hidden="true" />
                        <span>{atual.ultimo_teste_erro}</span>
                      </div>
                    )}

                  <div className="crm-provedor-acoes">
                    <button
                      className="btn2 crm-configurar"
                      type="button"
                      aria-expanded={aberto}
                      aria-controls={`crm-form-${provedor.provedor}`}
                      onClick={() =>
                        setAbrindo(aberto ? "" : provedor.provedor)
                      }
                    >
                      {atual ? "Configurar" : "Conectar"}
                      <ChevronDown
                        className={aberto ? "girado" : ""}
                        size={17}
                        aria-hidden="true"
                      />
                    </button>
                    {atual && (
                      <>
                        <button
                          className="btn2"
                          type="button"
                          disabled={Boolean(testando || removendo)}
                          onClick={() => void testar(provedor)}
                        >
                          <RefreshCw
                            className={
                              testando === provedor.provedor ? "girando" : ""
                            }
                            size={17}
                            aria-hidden="true"
                          />
                          {testando === provedor.provedor
                            ? "Testando"
                            : "Testar"}
                        </button>
                        <button
                          className="btn2 perigo crm-remover"
                          type="button"
                          disabled={Boolean(testando || removendo)}
                          onClick={() => void remover(provedor)}
                        >
                          <Trash2 size={17} aria-hidden="true" />
                          {removendo === provedor.provedor
                            ? "Removendo"
                            : "Remover"}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <AnimatePresence initial={false}>
                  {aberto && (
                    <m.div
                      id={`crm-form-${provedor.provedor}`}
                      className="crm-form-wrap"
                      initial={
                        reduzirMovimento
                          ? { opacity: 0 }
                          : { height: 0, opacity: 0 }
                      }
                      animate={
                        reduzirMovimento
                          ? { opacity: 1 }
                          : { height: "auto", opacity: 1 }
                      }
                      exit={
                        reduzirMovimento
                          ? { opacity: 0 }
                          : { height: 0, opacity: 0 }
                      }
                      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <Formulario
                        provedor={provedor}
                        atual={atual}
                        avisar={avisar}
                        onSalvou={() => {
                          setAbrindo("");
                          void recarregar();
                        }}
                      />
                    </m.div>
                  )}
                </AnimatePresence>
              </m.article>
            );
          })}
        </div>
      </section>

      <section
        className="crm-secao crm-atividade"
        aria-labelledby="crm-atividade-titulo"
      >
        <div className="crm-secao-cabecalho">
          <div>
            <p className="crm-sobretitulo">Atividade</p>
            <h2 id="crm-atividade-titulo">Últimos envios</h2>
          </div>
          <Activity size={20} aria-hidden="true" />
        </div>

        {historico.length ? (
          <ol className="crm-historico">
            {historico.slice(0, 8).map((item, indice) => {
              const chave = `${item.relato_id}-${item.provedor}`;
              const emAndamento = reenviando === chave;
              return (
                <li key={`${item.relato_id}-${item.provedor}-${indice}`}>
                  <span
                    className={`crm-historico-icone ${
                      item.status === "enviado" ? "sucesso" : "falha"
                    }`}
                    aria-hidden="true"
                  >
                    {item.status === "enviado" ? (
                      <Check size={15} />
                    ) : (
                      <CircleAlert size={15} />
                    )}
                  </span>
                  <div>
                    <strong>{item.provedor}</strong>
                    <span>
                      {item.status === "enviado"
                        ? "Relato sincronizado"
                        : item.erro || item.status}
                    </span>
                  </div>
                  <div className="crm-historico-meta">
                    <time dateTime={item.atualizado_em}>
                      {formatarMomento(item.atualizado_em)}
                    </time>
                    <button
                      type="button"
                      disabled={Boolean(reenviando)}
                      onClick={() => void reenviar(item.relato_id, item.provedor)}
                      className="btn2 crm-resync-btn"
                      title="Re-sincronizar relato com o CRM"
                      aria-label={`Reenviar para ${item.provedor}`}
                    >
                      <RefreshCw
                        size={12}
                        className={emAndamento ? "girando" : ""}
                        aria-hidden="true"
                      />
                      <span>{emAndamento ? "Enviando..." : "Reenviar"}</span>
                    </button>
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <div className="crm-vazio">
            <ShieldCheck size={24} aria-hidden="true" />
            <div>
              <strong>Nenhum envio ainda</strong>
              <span>
                As sincronizações aparecerão aqui depois do primeiro relato
                revisado.
              </span>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function Formulario({
  provedor,
  atual,
  avisar,
  onSalvou,
}: {
  provedor: ProvedorCrm;
  atual?: Integracao;
  avisar: (m: string) => void;
  onSalvou: () => void;
}) {
  const id = useId();
  const reduzirMovimento = useReducedMotion();
  const [token, setToken] = useState("");
  const [etapa, setEtapa] = useState(atual?.etapa_id ?? "");
  const [funil, setFunil] = useState(atual?.funil_id ?? "");
  const [mapa, setMapa] = useState<Record<string, string>>(
    atual?.mapa_campos ?? {},
  );
  const [salvando, setSalvando] = useState(false);
  const [mostrarMapa, setMostrarMapa] = useState(
    Object.keys(atual?.mapa_campos ?? {}).length > 0,
  );

  const salvar = async () => {
    setSalvando(true);
    try {
      await api.salvarIntegracao({
        provedor: provedor.provedor as SalvarIntegracao["provedor"],
        token: token.trim() || undefined,
        etapa_id: etapa.trim(),
        funil_id: funil.trim(),
        mapa_campos: Object.fromEntries(
          Object.entries(mapa).filter(([, valor]) => valor.trim()),
        ),
      });
      avisar(`${provedor.nome} salvo e testado.`);
      onSalvou();
    } catch (e) {
      avisar((e as Error).message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <form
      className="crm-form"
      onSubmit={(evento) => {
        evento.preventDefault();
        void salvar();
      }}
    >
      <div className="crm-form-cabecalho">
        <div>
          <span>{atual ? "Editar conexão" : "Nova conexão"}</span>
          <strong>Credenciais e destino</strong>
        </div>
        <ShieldCheck size={21} aria-hidden="true" />
      </div>

      <p className="crm-form-ajuda">{provedor.ajuda}</p>

      <div className="crm-form-grade">
        <label className="crm-campo crm-campo-token" htmlFor={`${id}-token`}>
          <span>{provedor.rotulo_token}</span>
          <span className="crm-input-com-icone">
            <KeyRound size={17} aria-hidden="true" />
            <input
              id={`${id}-token`}
              className="campo"
              type="password"
              autoComplete="off"
              placeholder={
                atual ? "Vazio mantém o token atual" : "Cole o token aqui"
              }
              value={token}
              onChange={(evento) => setToken(evento.target.value)}
              required={!atual}
              aria-label={provedor.rotulo_token}
            />
          </span>
        </label>

        <label className="crm-campo" htmlFor={`${id}-etapa`}>
          <span>Etapa do funil</span>
          <input
            id={`${id}-etapa`}
            className="campo"
            value={etapa}
            onChange={(evento) => setEtapa(evento.target.value)}
            placeholder="ID da etapa"
            aria-label="Etapa do funil"
          />
        </label>

        <label className="crm-campo" htmlFor={`${id}-funil`}>
          <span>Funil opcional</span>
          <input
            id={`${id}-funil`}
            className="campo"
            value={funil}
            onChange={(evento) => setFunil(evento.target.value)}
            placeholder="ID do funil"
            aria-label="Funil opcional"
          />
        </label>
      </div>

      <button
        className="crm-mapear-botao"
        type="button"
        aria-expanded={mostrarMapa}
        aria-controls={`${id}-mapa`}
        onClick={() => setMostrarMapa((valor) => !valor)}
      >
        <span>
          <Workflow size={17} aria-hidden="true" />
          Campos personalizados
        </span>
        <ChevronDown
          className={mostrarMapa ? "girado" : ""}
          size={17}
          aria-hidden="true"
        />
      </button>

      <AnimatePresence initial={false}>
        {mostrarMapa && (
          <m.fieldset
            id={`${id}-mapa`}
            className="crm-mapeamento"
            initial={
              reduzirMovimento ? { opacity: 0 } : { height: 0, opacity: 0 }
            }
            animate={
              reduzirMovimento ? { opacity: 1 } : { height: "auto", opacity: 1 }
            }
            exit={reduzirMovimento ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <legend className="sr-only">
              Mapeamento de campos personalizados
            </legend>
            {CAMPOS_MAPEAVEIS.map((campo) => (
              <label
                className="crm-campo"
                key={campo.chave}
                htmlFor={`${id}-${campo.chave}`}
              >
                <span>{campo.rotulo}</span>
                <input
                  id={`${id}-${campo.chave}`}
                  className="campo"
                  placeholder="ID do campo no CRM"
                  value={mapa[campo.chave] ?? ""}
                  aria-label={`${campo.rotulo}, ID do campo no CRM`}
                  onChange={(evento) =>
                    setMapa((atualMapa) => ({
                      ...atualMapa,
                      [campo.chave]: evento.target.value,
                    }))
                  }
                />
              </label>
            ))}
          </m.fieldset>
        )}
      </AnimatePresence>

      <div className="crm-form-rodape">
        <span>
          <ShieldCheck size={16} aria-hidden="true" />O token fica mascarado
          depois de salvo.
        </span>
        <button className="btn2 ok" type="submit" disabled={salvando}>
          <RefreshCw
            className={salvando ? "girando" : ""}
            size={17}
            aria-hidden="true"
          />
          {salvando ? "Salvando e testando" : "Salvar e testar"}
        </button>
      </div>
    </form>
  );
}
