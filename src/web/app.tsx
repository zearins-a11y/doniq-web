import { SpeedInsights } from "@vercel/speed-insights/react";
import { lazy, Suspense, useEffect } from "react";
import { Route, Switch, useLocation } from "wouter";
import { caminhoSeguroAnalytics } from "./lib/analytics";
import { tokenAtual } from "./lib/api";

const AppAutenticado = lazy(() => import("./app-autenticado"));
const LandingPrincipal = lazy(() => import("./pages/landing-motion-sp-v6-2"));
const InterfaceD = import.meta.env.DEV ? lazy(() => import("./pages/interface-d")) : null;
const LandingRamo = lazy(() => import("./pages/landing-ramo"));
const Privacidade = lazy(() => import("./pages/privacidade"));
const Precos = lazy(() => import("./pages/precos"));
const Convite = lazy(() => import("./pages/convite"));
const DemoRevisaoComparativa = lazy(() => import("./pages/demo-revisao-comparativa"));
const DemoMobile = lazy(() => import("./pages/demo-mobile"));
const GestaoPage = lazy(() => import("./pages/gestao"));
const CheckoutSimulado = lazy(() => import("./pages/checkout-simulado"));

function AnalyticsPageView() {
  const [localizacao] = useLocation();

  useEffect(() => {
    const caminho = caminhoSeguroAnalytics(
      `${window.location.pathname}${window.location.search}${window.location.hash}`,
    );
    if (caminho) window.stonks?.view(caminho);
  }, [localizacao]);

  return null;
}

function GestaoRoute() {
  const estaAutenticado = typeof window !== "undefined" && Boolean(tokenAtual());
  if (estaAutenticado) {
    return <AppAutenticado />;
  }
  return <GestaoPage />;
}

function App() {
  return (
    <>
      <SpeedInsights />
      <AnalyticsPageView />
      {/* A página de privacidade abre sem login: é material de venda e
          precisa ser linkável de fora do app. */}
      {/* /login entra no app: sem sessão ele mostra a tela de Login; com
          sessão, cai direto no app. */}
      <Suspense fallback={<div className="centro">carregando…</div>}>
        <Switch>
          <Route path="/" component={LandingPrincipal} />
          {import.meta.env.DEV && (
            <Route path="/experimento/motion-sp-v6-1" component={LandingPrincipal} />
          )}
          {InterfaceD && <Route path="/experimento/interface-d" component={InterfaceD} />}
          <Route path="/login" component={AppAutenticado} />
          <Route path="/privacidade" component={Privacidade} />
          <Route path="/precos" component={Precos} />
          <Route path="/checkout-simulado" component={CheckoutSimulado} />
          <Route path="/ramos/:ramo" component={LandingRamo} />
          <Route path="/convite/:token" component={Convite} />
          {import.meta.env.DEV && (
            <Route path="/demo/revisao-a" component={DemoRevisaoComparativa} />
          )}
          <Route path="/demo/revisao-b" component={DemoRevisaoComparativa} />
          <Route path="/demo/mobile" component={DemoMobile} />
          <Route path="/gestao" component={GestaoRoute} />
          <Route path="/equipe/ativar" component={GestaoRoute} />
          <Route component={AppAutenticado} />
        </Switch>
      </Suspense>
    </>
  );
}

export default App;
