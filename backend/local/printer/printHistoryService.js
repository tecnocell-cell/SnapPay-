// Histórico de impressão - armazena todos cupons emitidos
// Permite reimpressão, auditoria e troubleshooting

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default class PrintHistoryService {
  constructor(historyFile = null) {
    this.historyFile = historyFile || path.join(process.cwd(), 'printer_logs', 'print_history.jsonl');
    this.ensureHistoryFile();
    this.cache = []; // Cache em memória dos últimos 100 cupons
    this.carregarCache();
  }

  ensureHistoryFile() {
    const dir = path.dirname(this.historyFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.historyFile)) {
      fs.writeFileSync(this.historyFile, '');
    }
  }

  carregarCache() {
    try {
      const linhas = fs.readFileSync(this.historyFile, 'utf-8')
        .split('\n')
        .filter(l => l.trim());

      // Carregar últimos 100 registros em memória
      this.cache = linhas
        .slice(-100)
        .map(l => {
          try {
            return JSON.parse(l);
          } catch {
            return null;
          }
        })
        .filter(r => r !== null);
    } catch (err) {
      console.error('Erro ao carregar cache histórico:', err.message);
      this.cache = [];
    }
  }

  // Registrar novo cupom impresso
  async registrarCupom(vendaId, cupomTexto, dados = {}) {
    const registro = {
      id: `cupom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      venda_id: vendaId,
      timestamp: new Date().toISOString(),
      status: 'IMPRESSAO_OK',
      cupom_hash: this.hashCupom(cupomTexto),
      cupom_tamanho: cupomTexto.length,
      forma_pagamento: dados.forma_pagamento || null,
      total: dados.total || null,
      operador: dados.operador || null,
      empresa_id: dados.empresa_id || null,
      // Não armazenar cupom completo (muito grande), apenas hash
    };

    try {
      fs.appendFileSync(this.historyFile, JSON.stringify(registro) + '\n');
      this.cache.push(registro);

      // Manter cache limitado a 100
      if (this.cache.length > 100) {
        this.cache = this.cache.slice(-100);
      }

      return registro;
    } catch (err) {
      throw new Error(`Erro ao registrar cupom: ${err.message}`);
    }
  }

  // Registrar falha de impressão
  async registrarFalha(vendaId, erro, dados = {}) {
    const registro = {
      id: `cupom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      venda_id: vendaId,
      timestamp: new Date().toISOString(),
      status: 'IMPRESSAO_FALHOU',
      erro: erro.message || String(erro),
      forma_pagamento: dados.forma_pagamento || null,
      total: dados.total || null,
      operador: dados.operador || null,
      empresa_id: dados.empresa_id || null,
    };

    try {
      fs.appendFileSync(this.historyFile, JSON.stringify(registro) + '\n');
      this.cache.push(registro);

      if (this.cache.length > 100) {
        this.cache = this.cache.slice(-100);
      }

      return registro;
    } catch (err) {
      throw new Error(`Erro ao registrar falha: ${err.message}`);
    }
  }

  // Registrar reimpressão
  async registrarReimpressao(vendaId, sucesso = true, erro = null) {
    const registro = {
      id: `cupom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      venda_id: vendaId,
      timestamp: new Date().toISOString(),
      status: sucesso ? 'REIMPRESSAO_OK' : 'REIMPRESSAO_FALHOU',
      erro: erro ? (erro.message || String(erro)) : null,
    };

    try {
      fs.appendFileSync(this.historyFile, JSON.stringify(registro) + '\n');
      this.cache.push(registro);

      if (this.cache.length > 100) {
        this.cache = this.cache.slice(-100);
      }

      return registro;
    } catch (err) {
      throw new Error(`Erro ao registrar reimpressão: ${err.message}`);
    }
  }

  // Buscar histórico de uma venda
  async obterPorVenda(vendaId) {
    const registros = this.cache.filter(r => r.venda_id === vendaId);

    if (registros.length > 0) {
      return registros;
    }

    // Se não encontrou no cache, buscar no arquivo
    try {
      const linhas = fs.readFileSync(this.historyFile, 'utf-8')
        .split('\n')
        .filter(l => l.trim());

      return linhas
        .map(l => {
          try {
            return JSON.parse(l);
          } catch {
            return null;
          }
        })
        .filter(r => r !== null && r.venda_id === vendaId);
    } catch (err) {
      return [];
    }
  }

  // Listar últimos N cupons
  async listarUltimos(quantidade = 10) {
    return this.cache.slice(-quantidade).reverse();
  }

  // Buscar cupom por período
  async listarPorPeriodo(dataInicio, dataFim) {
    try {
      const linhas = fs.readFileSync(this.historyFile, 'utf-8')
        .split('\n')
        .filter(l => l.trim());

      return linhas
        .map(l => {
          try {
            return JSON.parse(l);
          } catch {
            return null;
          }
        })
        .filter(r => {
          if (!r) return false;
          const timestamp = new Date(r.timestamp);
          return timestamp >= dataInicio && timestamp <= dataFim;
        });
    } catch (err) {
      return [];
    }
  }

  // Estatísticas
  async obterEstatisticas() {
    try {
      const linhas = fs.readFileSync(this.historyFile, 'utf-8')
        .split('\n')
        .filter(l => l.trim());

      const registros = linhas.map(l => {
        try {
          return JSON.parse(l);
        } catch {
          return null;
        }
      }).filter(r => r !== null);

      const stats = {
        total: registros.length,
        sucesso: registros.filter(r => r.status === 'IMPRESSAO_OK').length,
        falha: registros.filter(r => r.status === 'IMPRESSAO_FALHOU').length,
        reimpressoes: registros.filter(r => r.status.includes('REIMPRESSAO')).length,
        pagamentos: {},
      };

      registros.forEach(r => {
        if (r.forma_pagamento) {
          stats.pagamentos[r.forma_pagamento] = (stats.pagamentos[r.forma_pagamento] || 0) + 1;
        }
      });

      return stats;
    } catch (err) {
      return { total: 0, sucesso: 0, falha: 0, reimpressoes: 0 };
    }
  }

  // Hash do cupom para detecção de duplicata
  hashCupom(texto) {
    let hash = 0;
    for (let i = 0; i < texto.length; i++) {
      const char = texto.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Converter para 32-bit
    }
    return Math.abs(hash).toString(16);
  }

  // Limpar histórico antigo (mais de N dias)
  async limparAntigo(dias = 30) {
    try {
      const limiteData = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);
      const linhas = fs.readFileSync(this.historyFile, 'utf-8')
        .split('\n')
        .filter(l => l.trim());

      const linhasFiltradas = linhas.filter(l => {
        try {
          const registro = JSON.parse(l);
          return new Date(registro.timestamp) > limiteData;
        } catch {
          return true; // Manter linhas com erro
        }
      });

      fs.writeFileSync(this.historyFile, linhasFiltradas.join('\n') + '\n');
      this.carregarCache();

      return { removidas: linhas.length - linhasFiltradas.length };
    } catch (err) {
      throw new Error(`Erro ao limpar histórico: ${err.message}`);
    }
  }
}
