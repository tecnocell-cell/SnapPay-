// Auditoria de impressão — registra eventos em log local + PostgreSQL

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default class AuditService {
  constructor(db = null) {
    this.db = db; // PostgreSQL connection (futuro)
    this.logDir = path.join(process.cwd(), 'printer_logs');

    // Criar pasta de logs se não existir
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  // Registrar evento de impressão
  async registrar(tipo, dados = {}) {
    const evento = {
      timestamp: new Date().toISOString(),
      tipo,
      ...dados,
    };

    // 1. Log local
    this.registrarEmArquivo(evento);

    // 2. Database (futuro)
    if (this.db) {
      await this.registrarEmBD(evento);
    }

    return evento;
  }

  // Registrar em arquivo (seguro, sem internet)
  registrarEmArquivo(evento) {
    const logPath = path.join(this.logDir, 'auditoria.log');
    const linha = JSON.stringify(evento) + '\n';

    try {
      fs.appendFileSync(logPath, linha);
    } catch (erro) {
      console.error(`Erro ao registrar auditoria em arquivo: ${erro.message}`);
    }
  }

  // Registrar em PostgreSQL (futuro)
  async registrarEmBD(evento) {
    if (!this.db) return;

    try {
      await this.db.query(
        `INSERT INTO auditoria_impressao
         (timestamp, tipo, dados, empresa_id, usuario, terminal_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          evento.timestamp,
          evento.tipo,
          JSON.stringify(evento),
          evento.empresa_id || null,
          evento.usuario || null,
          evento.terminal_id || null,
        ]
      );
    } catch (erro) {
      console.error(`Erro ao registrar auditoria em BD: ${erro.message}`);
    }
  }

  // Listar eventos de auditoria por período
  async listarEventos(dataInicio, dataFim) {
    const logPath = path.join(this.logDir, 'auditoria.log');

    if (!fs.existsSync(logPath)) {
      return [];
    }

    try {
      const linhas = fs.readFileSync(logPath, 'utf-8').split('\n').filter(l => l.trim());
      const eventos = linhas.map(l => JSON.parse(l));

      // Filtrar por período
      return eventos.filter(e => {
        const data = new Date(e.timestamp);
        return data >= dataInicio && data <= dataFim;
      });
    } catch (erro) {
      console.error(`Erro ao ler auditoria: ${erro.message}`);
      return [];
    }
  }

  // Relatório de impressões
  async gerarRelatorioImpressoes(dataInicio, dataFim) {
    const eventos = await this.listarEventos(dataInicio, dataFim);

    const relatorio = {
      periodo: { inicio: dataInicio, fim: dataFim },
      totalEventos: eventos.length,
      porTipo: {},
      eventos,
    };

    eventos.forEach(e => {
      relatorio.porTipo[e.tipo] = (relatorio.porTipo[e.tipo] || 0) + 1;
    });

    return relatorio;
  }

  // Limpar logs antigos (mais de N dias)
  async limparLogsAntigos(diasRetencao = 30) {
    const logPath = path.join(this.logDir, 'auditoria.log');
    const agora = new Date();
    const limiteData = new Date(agora.getTime() - diasRetencao * 24 * 60 * 60 * 1000);

    try {
      const linhas = fs.readFileSync(logPath, 'utf-8').split('\n').filter(l => l.trim());
      const linhasFiltradas = linhas.filter(l => {
        try {
          const evento = JSON.parse(l);
          return new Date(evento.timestamp) > limiteData;
        } catch {
          return true; // Manter linhas com erro de parse
        }
      });

      fs.writeFileSync(logPath, linhasFiltradas.join('\n') + '\n');
      return { removidas: linhas.length - linhasFiltradas.length };
    } catch (erro) {
      console.error(`Erro ao limpar logs: ${erro.message}`);
      return { erro: erro.message };
    }
  }
}
