import { MockFiscalProvider } from "./providers/mock.js";
import { FocusNFeProvider } from "./providers/focusnfe.js";
import { FiscalProvider } from "./provider.js";

// Placeholder para provedores reais. Implementar quando a integração com a
// SEFAZ via cada provedor for habilitada. Mantém a arquitetura plugável:
// basta implementar os métodos do contrato e registrar no mapa abaixo.
class ProviderNaoImplementado extends FiscalProvider {
  constructor(config, nome) {
    super(config);
    this._nome = nome;
  }
  get nome() {
    return this._nome;
  }
  async validarConfiguracao() {
    return { ok: false, erros: [`Provider ${this._nome} ainda não implementado. Use MOCK em homologação.`] };
  }
}

const FACTORIES = {
  MOCK: (config) => new MockFiscalProvider(config),
  FOCUS_NFE: (config) => new FocusNFeProvider(config),
  NUVEM_FISCAL: (config) => new ProviderNaoImplementado(config, "NUVEM_FISCAL"),
  PLUGNOTAS: (config) => new ProviderNaoImplementado(config, "PLUGNOTAS"),
  TECNOSPEED: (config) => new ProviderNaoImplementado(config, "TECNOSPEED"),
};

export const PROVIDERS_DISPONIVEIS = Object.keys(FACTORIES);

// Resolve o provider a partir da configuração fiscal da empresa.
export function getProvider(config) {
  const chave = (config && config.provider) || "MOCK";
  const factory = FACTORIES[chave] || FACTORIES.MOCK;
  return factory(config);
}
