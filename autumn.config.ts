/**
 * Planos de cobrança (Autumn -> Stripe).
 *
 * Espelho de /autumn.config.ts (na raiz do monorepo), com o caminho de
 * import ajustado para o local onde o CLI `atmn` espera encontrar o arquivo.
 * Mantemos as duas cópias iguais porque o `atmn push` é resolvido a partir
 * de packages/web e não sobe um nível.
 *
 * Os preços vêm de `packages/web/src/shared/planos.ts` para evitar divergência
 * entre a landing e a fatura.
 *
 * Para alterar: editar `/autumn.config.ts` (raiz) e propagar para cá.
 */

import { feature, item, plan } from "atmn";

import { ANUAL, MENSAL, centavos } from "./src/shared/planos";

/**
 * Assento = um vendedor com acesso.
 *
 * `consumable: false` porque assento não é consumido, é ocupado.
 */
export const assento = feature({
	id: 'assento',
	name: 'Vendedor',
	type: 'metered',
	consumable: false,
});

const ANUAL_À_VISTA = centavos(ANUAL * 12);

export const mensal = plan({
	id: 'mensal',
	name: 'Mensal',
	description: 'Por vendedor, mês a mês, sem fidelidade.',
	items: [
		item({
			featureId: assento.id,
			included: 0,
			price: {
				amount: centavos(MENSAL),
				billingUnits: 1,
				billingMethod: 'prepaid',
				interval: 'month',
			},
			proration: { onIncrease: 'prorate_immediately', onDecrease: 'prorate_immediately' },
		}),
	],
});

export const anual = plan({
	id: 'anual',
	name: 'Anual',
	description: 'Por vendedor, doze meses à vista, mais barato.',
	items: [
		item({
			featureId: assento.id,
			included: 0,
			price: {
				amount: ANUAL_À_VISTA,
				billingUnits: 1,
				billingMethod: 'prepaid',
				interval: 'year',
			},
			proration: { onIncrease: 'prorate_immediately', onDecrease: 'prorate_immediately' },
		}),
	],
});

export default {

  features: [assento],

  plans: [mensal, anual],

};
