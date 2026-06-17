// Serviço Offline First (PoC) — armazena vendas pendentes em IndexedDB e
// sincroniza com o backend quando a conexão volta. Não usa Tauri/Electron.

const DB_NAME = "snappay_offline";
const STORE = "vendas_pendentes";
const DB_VERSION = 1;

const DEVICE_KEY = "snappay_device_id";

export function getDeviceId() {
  return localStorage.getItem(DEVICE_KEY) || "";
}
export function setDeviceId(id) {
  localStorage.setItem(DEVICE_KEY, id);
}

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "uuid" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(db, mode) {
  return db.transaction(STORE, mode).objectStore(STORE);
}

function uuid() {
  if (crypto.randomUUID) return "off-" + crypto.randomUUID();
  return "off-" + Date.now() + "-" + Math.random().toString(16).slice(2);
}

// Adiciona uma venda local (offline). payload = { itens, pagamentos, cliente_id?, fiscal_pendente? }
export async function adicionarVendaLocal(payload) {
  const db = await openDB();
  const registro = {
    uuid: uuid(),
    entidade: "venda",
    operacao: "CREATE",
    payload: { ...payload, data_venda: new Date().toISOString() },
    status: "PENDENTE",
    criado_em: new Date().toISOString(),
  };
  await new Promise((res, rej) => {
    const r = tx(db, "readwrite").add(registro);
    r.onsuccess = res; r.onerror = () => rej(r.error);
  });
  return registro;
}

export async function listarPendentes() {
  const db = await openDB();
  return new Promise((res, rej) => {
    const r = tx(db, "readonly").getAll();
    r.onsuccess = () => res(r.result || []);
    r.onerror = () => rej(r.error);
  });
}

async function marcarStatus(uuidVenda, status, extra = {}) {
  const db = await openDB();
  const store = tx(db, "readwrite");
  const reg = await new Promise((res) => { const g = store.get(uuidVenda); g.onsuccess = () => res(g.result); });
  if (!reg) return;
  Object.assign(reg, { status, ...extra });
  store.put(reg);
}

export async function removerSincronizadas() {
  const db = await openDB();
  const all = await listarPendentes();
  const store = tx(db, "readwrite");
  all.filter((r) => r.status === "SINCRONIZADA").forEach((r) => store.delete(r.uuid));
}

// Sincroniza todas as vendas pendentes com o backend.
// `api` = lib/api; deviceId obrigatório.
export async function sincronizar(api, deviceId) {
  const pendentes = (await listarPendentes()).filter((r) => r.status === "PENDENTE" || r.status === "ERRO");
  if (!pendentes.length) return { enviados: 0, resultados: [] };

  const eventos = pendentes.map((r) => ({ uuid: r.uuid, entidade: r.entidade, operacao: r.operacao, payload: r.payload }));
  const resp = await api.post("/sync/enviar-lote", { device_id: deviceId, eventos });

  for (const res of resp.resultados || []) {
    if (res.status === "PROCESSADO") {
      await marcarStatus(res.uuid, "SINCRONIZADA", { venda_id: res.venda_id, divergencia: res.divergencia || null });
    } else {
      await marcarStatus(res.uuid, "ERRO", { erro: res.erro || "Falha ao sincronizar" });
    }
  }
  return { enviados: eventos.length, resultados: resp.resultados || [] };
}

// Observa mudança de conectividade. cb(boolean online).
export function observarConexao(cb) {
  const handler = () => cb(navigator.onLine);
  window.addEventListener("online", handler);
  window.addEventListener("offline", handler);
  cb(navigator.onLine);
  return () => {
    window.removeEventListener("online", handler);
    window.removeEventListener("offline", handler);
  };
}
