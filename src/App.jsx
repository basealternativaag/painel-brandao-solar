import React, { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "./supabaseClient";

const COLORS = {
  darkGreen: "#569137",
  darkGreenText: "#3c651f",
  lightGreen: "#92BE4D",
  gold: "#F9AA08",
  orange: "#F58902",
  cream: "#FBF8F1",
  card: "#FFFFFF",
  ink: "#2b2b23",
  muted: "#79776b",
  border: "#e6e0cd",
  borderStrong: "#d8cfae",
  danger: "#B3402A",
};

const FONT_HEAD = "Cambria, Georgia, serif";
const FONT_BODY = "Calibri, 'Segoe UI', Arial, sans-serif";
const FONT_MONO = "'Courier New', monospace";

const TECHS = ["Frank", "Brendo", "Marcio", "Marcus"];

const WINDOWS = ["08:00 – 10:00", "10:00 – 12:00", "14:00 – 16:00", "16:00 – 18:00"];
const WINDOW_EMOJI = {
  "08:00 – 10:00": "\u{1F557}",
  "10:00 – 12:00": "\u{1F559}",
  "14:00 – 16:00": "\u{1F551}",
  "16:00 – 18:00": "\u{1F553}",
};

const SERVICE_TYPES = [
  "Visita comercial",
  "Visita técnica",
  "Instalação completa solar",
  "Lavagem de placas",
  "Manutenção / Assistência técnica",
  "Extensão de placas",
  "Retorno / Revisita",
  "Outro",
];

const CANAIS = ["Cliente (contato direto)", "Consultor / Indicação", "Lead V4", "Visita Externa (PJ)", "Outro"];
const STATUSES = ["Agendado", "Confirmado", "Em rota", "Realizado", "Não realizada", "Reagendado"];
const STATUS_COLOR = {
  Agendado: COLORS.muted,
  Confirmado: COLORS.darkGreen,
  "Em rota": COLORS.gold,
  Realizado: COLORS.darkGreen,
  "Não realizada": COLORS.danger,
  Reagendado: COLORS.danger,
};


function pad(n) {
  return String(n).padStart(2, "0");
}
function toISO(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function tomorrowISO() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return toISO(d);
}
function todayISO() {
  return toISO(new Date());
}
function formatDateLabel(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const weekday = dt.toLocaleDateString("pt-BR", { weekday: "long" });
  const wCap = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  return `${wCap}, ${pad(d)}/${pad(m)}`;
}
function newId() {
  return "id_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function emptyForm() {
  return {
    clientName: "",
    phone: "",
    visitType: SERVICE_TYPES[0],
    proposalValue: "",
    address: "",
    bairro: "",
    reference: "",
    responsavelLocal: "",
    locationLink: "",
    canal: "Consultor / Indicação",
    status: "Agendado",
  };
}

function emptyRequest() {
  return {
    tipoServico: SERVICE_TYPES[0],
    solicitante: "",
    canal: "Cliente (contato direto)",
    nome: "",
    telefone: "",
    endereco: "",
    bairro: "",
    referencia: "",
    valorContaAtual: "",
    proposalValue: "",
    responsavelLocal: "",
    locationLink: "",
    dataDesejada: tomorrowISO(),
    janelaDesejada: WINDOWS[0],
    observacoes: "",
  };
}

/* ============================= MAPEAMENTO SUPABASE <-> OBJETOS DA UI ============================= */

function toDbVisit(visit, dateStr) {
  return {
    tech: visit.tech,
    visit_date: dateStr,
    window_label: visit.window,
    extra_label: visit.window === "Extra" ? visit.extraLabel || "Extra" : null,
    client_name: visit.clientName,
    phone: visit.phone || null,
    visit_type: visit.visitType || null,
    proposal_value: visit.proposalValue || null,
    address: visit.address,
    bairro: visit.bairro,
    reference: visit.reference || null,
    responsavel_local: visit.responsavelLocal || null,
    location_link: visit.locationLink || null,
    canal: visit.canal || null,
    status: visit.status || "Agendado",
    request_id: visit.requestId || null,
  };
}

function fromDbVisit(row) {
  return {
    id: row.id,
    tech: row.tech,
    window: row.window_label,
    extraLabel: row.extra_label || undefined,
    clientName: row.client_name || "",
    phone: row.phone || "",
    visitType: row.visit_type || "",
    proposalValue: row.proposal_value || "",
    address: row.address || "",
    bairro: row.bairro || "",
    reference: row.reference || "",
    responsavelLocal: row.responsavel_local || "",
    locationLink: row.location_link || "",
    canal: row.canal || "",
    status: row.status || "Agendado",
    requestId: row.request_id || undefined,
    _date: row.visit_date,
  };
}

function toDbRequestInsert(form) {
  return {
    tipo_servico: form.tipoServico,
    solicitante: form.solicitante,
    canal: form.canal,
    nome: form.nome,
    telefone: form.telefone,
    endereco: form.endereco,
    bairro: form.bairro,
    referencia: form.referencia || null,
    valor_conta_atual: form.valorContaAtual || null,
    proposal_value: form.proposalValue || null,
    responsavel_local: form.responsavelLocal || null,
    location_link: form.locationLink || null,
    data_desejada: form.dataDesejada || null,
    janela_desejada: form.janelaDesejada,
    observacoes: form.observacoes || null,
    status: "Pendente",
  };
}

function fromDbRequest(row) {
  return {
    id: row.id,
    tipoServico: row.tipo_servico,
    solicitante: row.solicitante,
    canal: row.canal,
    nome: row.nome,
    telefone: row.telefone,
    endereco: row.endereco,
    bairro: row.bairro,
    referencia: row.referencia || "",
    valorContaAtual: row.valor_conta_atual || "",
    proposalValue: row.proposal_value || "",
    responsavelLocal: row.responsavel_local || "",
    locationLink: row.location_link || "",
    dataDesejada: row.data_desejada,
    janelaDesejada: row.janela_desejada,
    observacoes: row.observacoes || "",
    status: row.status,
    createdAt: row.created_at,
  };
}

/* ============================= CALCULADORA DE SIMULAÇÃO ============================= */

const PRICE_TABLE = [
  [400, 12000],
  [500, 13500],
  [600, 16200],
  [700, 18900],
  [800, 18500],
  [900, 20000],
  [1000, 21500],
  [1500, 34500],
  [2000, 45000],
  [3000, 68000],
  [3500, 78500],
  [4000, 89800],
  [4500, 101000],
  [5000, 112000],
  [5500, 123400],
  [6000, 134500],
  [6500, 145800],
  [7000, 157000],
  [7500, 168200],
  [8000, 180000],
  [8500, 191000],
  [9000, 202000],
  [9500, 213000],
  [10000, 224300],
];

function estimateSystemValue(contaAtual) {
  const v = Number(contaAtual);
  if (!v || v <= 0) return null;
  const first = PRICE_TABLE[0];
  const last = PRICE_TABLE[PRICE_TABLE.length - 1];
  if (v < first[0]) return { value: null, belowMin: true };
  if (v >= last[0]) {
    const [x1, y1] = PRICE_TABLE[PRICE_TABLE.length - 2];
    const [x2, y2] = last;
    if (v === x2) return { value: y2, aboveMax: false };
    const slope = (y2 - y1) / (x2 - x1);
    return { value: Math.round(y2 + slope * (v - x2)), aboveMax: true };
  }
  for (let i = 0; i < PRICE_TABLE.length - 1; i++) {
    const [x1, y1] = PRICE_TABLE[i];
    const [x2, y2] = PRICE_TABLE[i + 1];
    if (v >= x1 && v <= x2) {
      const ratio = (v - x1) / (x2 - x1);
      return { value: Math.round(y1 + ratio * (y2 - y1)), belowMin: false, aboveMax: false };
    }
  }
  return null;
}

function formatBRL(n) {
  return n.toLocaleString("pt-BR");
}

function buildSlotLines(windowLabel, emoji, visit) {
  if (!visit) return [`${emoji} ${windowLabel} — LIVRE`];
  const typeStr = visit.visitType ? ` — ${visit.visitType}` : "";
  const propStr = visit.proposalValue ? ` — Proposta: R$${visit.proposalValue}` : "";
  const lines = [`${emoji} ${windowLabel} — ${visit.clientName}${typeStr}${propStr}`];
  const addrParts = [visit.address, visit.bairro].filter(Boolean).join(", ");
  if (addrParts) lines.push(`     📍 ${addrParts}`);
  if (visit.reference) lines.push(`     🗺️ Ref: ${visit.reference}`);
  if (visit.responsavelLocal) lines.push(`     👤 Responsável no local: ${visit.responsavelLocal}`);
  if (visit.phone) lines.push(`     ☎️ ${visit.phone}`);
  if (visit.locationLink) lines.push(`     🗺️ Localização: ${visit.locationLink}`);
  return lines;
}

function generateMessage(dateISO, tech, techVisits) {
  const fixed = WINDOWS.map((w) => techVisits.find((v) => v.window === w) || null);
  const extras = techVisits.filter((v) => v.window === "Extra");
  const morning = fixed.slice(0, 2);
  const afternoon = fixed.slice(2, 4);

  const lines = [];
  lines.push(`📅 Programação — ${formatDateLabel(dateISO)}`);
  lines.push(`Técnico: ${tech}`);
  lines.push("");
  lines.push("☀️ MANHÃ");
  morning.forEach((v, i) => {
    buildSlotLines(WINDOWS[i], WINDOW_EMOJI[WINDOWS[i]], v).forEach((l) => lines.push(l));
  });
  lines.push("");
  lines.push("🌤️ TARDE");
  afternoon.forEach((v, i) => {
    const w = WINDOWS[i + 2];
    buildSlotLines(w, WINDOW_EMOJI[w], v).forEach((l) => lines.push(l));
  });

  if (extras.length) {
    lines.push("");
    lines.push("➕ VISITAS EXTRAS (rota próxima)");
    extras.forEach((v) => {
      buildSlotLines(v.extraLabel || "Extra", "➕", v).forEach((l) => lines.push(l));
    });
  }

  const total = fixed.filter(Boolean).length + extras.length;
  const bairros = [];
  [...fixed, ...extras].forEach((v) => {
    if (v && v.bairro && !bairros.includes(v.bairro)) bairros.push(v.bairro);
  });

  lines.push("");
  lines.push(`📊 Total de visitas: ${total} (padrão: até 4/dia — pode aumentar se as rotas forem próximas)`);
  lines.push(`🚗 Bairros do dia: ${bairros.length ? bairros.join(", ") : "—"}`);

  return lines.join("\n");
}

function buildExecutiveSummary(todayStr, todayVisits, tomorrowStr, tomorrowVisits) {
  const lines = [];
  lines.push(`📊 RESUMO DO DIA — ${formatDateLabel(todayStr)}`);
  const totalToday = todayVisits.length;
  const realizadas = todayVisits.filter((v) => v.status === "Realizado").length;
  const naoRealizadas = todayVisits.filter((v) => v.status === "Não realizada").length;
  lines.push(`Total: ${totalToday} · ✅ Realizadas: ${realizadas} · ❌ Não realizadas: ${naoRealizadas}`);
  TECHS.forEach((tech) => {
    const tv = todayVisits.filter((v) => v.tech === tech);
    if (!tv.length) return;
    const r = tv.filter((v) => v.status === "Realizado").length;
    const nr = tv.filter((v) => v.status === "Não realizada").length;
    lines.push(`• ${tech}: ${tv.length} visita(s) — ${r} feita(s), ${nr} não feita(s)`);
  });
  const pendentes = todayVisits.filter((v) => !["Realizado", "Não realizada"].includes(v.status));
  if (pendentes.length) lines.push(`⚠️ Sem confirmação de status ainda: ${pendentes.length}`);

  lines.push("");
  lines.push(`📅 PROGRAMAÇÃO DE AMANHÃ — ${formatDateLabel(tomorrowStr)}`);
  lines.push(`Total de visitas agendadas: ${tomorrowVisits.length}`);
  TECHS.forEach((tech) => {
    const tv = tomorrowVisits.filter((v) => v.tech === tech);
    if (!tv.length) {
      lines.push(`• ${tech}: sem visitas`);
      return;
    }
    const items = tv.map((v) => `${v.window === "Extra" ? v.extraLabel || "Extra" : v.window} ${v.clientName}`).join(" · ");
    lines.push(`• ${tech} (${tv.length}): ${items}`);
  });
  return lines.join("\n");
}

function IconClock() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
function IconPin() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.3" />
    </svg>
  );
}
function IconPlus() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
function IconCopy() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </svg>
  );
}
function IconWhats() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2a10 10 0 0 0-8.5 15.2L2 22l4.9-1.4A10 10 0 1 0 12 2zm5.6 14.3c-.2.7-1.4 1.3-2 1.4-.5.1-1.2.2-3.8-.9-3.2-1.4-5.3-4.7-5.5-4.9-.2-.2-1.3-1.7-1.3-3.3s.8-2.3 1.1-2.6c.3-.3.6-.4.9-.4h.6c.2 0 .4 0 .6.5.2.5.7 1.8.8 1.9.1.2.1.4 0 .6-.1.2-.2.3-.4.5-.2.2-.4.5-.5.6-.2.2-.4.4-.2.7.2.3.9 1.4 1.9 2.3 1.3 1.2 2.4 1.5 2.7 1.7.3.2.5.1.6-.1.2-.2.8-.9 1-1.2.2-.3.4-.2.7-.1.3.1 1.8.9 2.1 1 .3.2.5.2.6.4.1.1.1.7-.1 1.4z" />
    </svg>
  );
}
function IconTrash() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
    </svg>
  );
}

export default function PainelBrandaoSolar() {
  const [role, setRole] = useState("intake"); // 'intake' | 'backoffice'
  const [session, setSession] = useState(undefined); // undefined = carregando, null = deslogado, objeto = logado

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  if (role === "intake") {
    return <IntakeView onOpenBackoffice={() => setRole("backoffice")} />;
  }
  if (session === undefined) {
    return (
      <Shell maxWidth="380px">
        <BrandHeader subtitle="Área interna" />
        <div style={{ fontSize: "13px", color: COLORS.muted, marginTop: "10px" }}>Carregando…</div>
      </Shell>
    );
  }
  if (!session) {
    return <LoginGate onBack={() => setRole("intake")} />;
  }
  return (
    <Backoffice
      onExit={async () => {
        await supabase.auth.signOut();
        setRole("intake");
      }}
    />
  );
}

function Shell({ children, maxWidth }) {
  return (
    <div
      style={{
        fontFamily: FONT_BODY,
        background: COLORS.cream,
        color: COLORS.ink,
        padding: "20px",
        borderRadius: "14px",
        maxWidth: maxWidth || "760px",
        margin: "0 auto",
        boxSizing: "border-box",
      }}
    >
      {children}
    </div>
  );
}

function BrandHeader({ subtitle }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "4px" }}>
      <div
        style={{
          width: "38px",
          height: "38px",
          borderRadius: "50%",
          background: COLORS.darkGreen,
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: FONT_HEAD,
          fontWeight: 700,
          fontSize: "15px",
          flexShrink: 0,
        }}
      >
        BS
      </div>
      <div>
        <div style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: "20px", color: COLORS.darkGreenText }}>
          {subtitle || "Brandão Solar"}
        </div>
        <div style={{ fontSize: "12px", color: COLORS.orange, fontStyle: "italic" }}>Energia que transforma</div>
      </div>
    </div>
  );
}

function LoginGate({ onBack }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password) {
      setError("Preencha e-mail e senha.");
      return;
    }
    setError("");
    setLoading(true);
    const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (authError) {
      setError("E-mail ou senha incorretos.");
    }
    setLoading(false);
  }

  return (
    <Shell maxWidth="380px">
      <BrandHeader subtitle="Área interna" />
      <div style={{ fontSize: "13px", color: COLORS.muted, margin: "10px 0 18px" }}>
        Entre com o e-mail e senha da equipe de gestão.
      </div>
      <Field label="E-mail">
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError("");
          }}
          style={inputStyle}
        />
      </Field>
      <Field label="Senha">
        <input
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError("");
          }}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          style={inputStyle}
        />
      </Field>
      {error && <div style={{ color: COLORS.danger, fontSize: "12px", marginBottom: "8px" }}>{error}</div>}
      <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
        <button onClick={onBack} style={secondaryBtnStyle}>
          ← Voltar
        </button>
        <button onClick={handleLogin} disabled={loading} style={primaryBtnStyle}>
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </div>
    </Shell>
  );
}

/* ============================= INTAKE (public form) ============================= */

function IntakeView({ onOpenBackoffice }) {
  const [form, setForm] = useState(emptyRequest());
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function submit() {
    if (!form.solicitante.trim() || !form.nome.trim() || !form.telefone.trim() || !form.endereco.trim() || !form.bairro.trim()) {
      setError("Preencha seu nome, o nome do cliente, telefone, endereço e bairro antes de enviar.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const { error } = await supabase.from("requests").insert([toDbRequestInsert(form)]);
      if (error) {
        setError("Não foi possível enviar agora. Tente novamente em instantes.");
        setSaving(false);
        return;
      }
      setSubmitted(true);
    } catch (e) {
      setError("Não foi possível enviar agora. Tente novamente em instantes.");
    }
    setSaving(false);
  }

  const estimate = estimateSystemValue(form.valorContaAtual);

  if (submitted) {
    return (
      <Shell maxWidth="440px">
        <div style={{ textAlign: "center", padding: "30px 10px" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              background: COLORS.darkGreen,
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "26px",
              margin: "0 auto 14px",
            }}
          >
            ✓
          </div>
          <div style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: "18px", color: COLORS.darkGreenText, marginBottom: "6px" }}>
            Solicitação enviada!
          </div>
          <div style={{ fontSize: "13.5px", color: COLORS.muted, marginBottom: "20px" }}>
            A Sara vai revisar, definir o técnico e confirmar o horário.
          </div>
          <button
            onClick={() => {
              setForm(emptyRequest());
              setSubmitted(false);
            }}
            style={primaryBtnStyle}
          >
            Enviar outra solicitação
          </button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell maxWidth="440px">
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "-6px" }}>
        <button onClick={onOpenBackoffice} style={{ ...linkBtnStyle, fontSize: "12px" }}>
          Área interna (Gestão)
        </button>
      </div>
      <BrandHeader subtitle="Solicitar Visita" />
      <div style={{ fontSize: "13px", color: COLORS.muted, margin: "10px 0 20px" }}>
        Preencha os dados do cliente e o serviço desejado. A Sara confirma o técnico e o horário e avisa no
        grupo.
      </div>

      <div
        style={{
          background: "#F1F5EA",
          border: `1px solid ${COLORS.lightGreen}`,
          borderRadius: "12px",
          padding: "14px",
          marginBottom: "22px",
        }}
      >
        <div style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: "15px", color: COLORS.darkGreenText, marginBottom: "4px" }}>
          ☀️ Simule sua economia
        </div>
        <div style={{ fontSize: "12px", color: COLORS.muted, marginBottom: "10px" }}>
          Digite o valor da sua conta de luz atual e veja uma estimativa do investimento.
        </div>
        <Field label="Valor da conta de luz hoje (R$)">
          <input
            type="number"
            inputMode="decimal"
            value={form.valorContaAtual}
            onChange={(e) => set("valorContaAtual", e.target.value)}
            placeholder="Ex: 700"
            style={inputStyle}
          />
        </Field>
        {form.valorContaAtual && estimate && estimate.belowMin && (
          <div style={{ fontSize: "12.5px", color: COLORS.muted, marginTop: "6px" }}>
            Pra contas abaixo de R$ 400, um consultor monta uma simulação sob medida pra você.
          </div>
        )}
        {form.valorContaAtual && estimate && estimate.value != null && (
          <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: `1px solid ${COLORS.lightGreen}` }}>
            <div style={{ fontSize: "12px", color: COLORS.muted }}>Investimento estimado do sistema</div>
            <div style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: "22px", color: COLORS.darkGreenText }}>
              R$ {formatBRL(estimate.value)}
              {estimate.aboveMax ? "+" : ""}
            </div>
            <div style={{ fontSize: "11px", color: COLORS.muted, marginTop: "2px", fontStyle: "italic" }}>
              Simulação automática — o valor final é confirmado após a visita técnica.
            </div>
          </div>
        )}
      </div>


      <Field label="Tipo de serviço *">
        <select value={form.tipoServico} onChange={(e) => set("tipoServico", e.target.value)} style={inputStyle}>
          {SERVICE_TYPES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Proposta (R$)">
        <input value={form.proposalValue} onChange={(e) => set("proposalValue", e.target.value)} placeholder="Se já tiver um valor" style={inputStyle} />
      </Field>

      <Field label="Seu nome (quem está solicitando) *">
        <input value={form.solicitante} onChange={(e) => set("solicitante", e.target.value)} style={inputStyle} />
      </Field>

      <Field label="Canal">
        <select value={form.canal} onChange={(e) => set("canal", e.target.value)} style={inputStyle}>
          {CANAIS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Field>

      <div style={{ fontSize: "12px", fontWeight: 700, color: COLORS.darkGreenText, margin: "14px 0 4px" }}>
        Dados do cliente
      </div>

      <Field label="Nome do cliente *">
        <input value={form.nome} onChange={(e) => set("nome", e.target.value)} style={inputStyle} />
      </Field>
      <Field label="Telefone / WhatsApp *">
        <input value={form.telefone} onChange={(e) => set("telefone", e.target.value)} placeholder="(92) 90000-0000" style={inputStyle} />
      </Field>
      <Field label="Endereço completo *">
        <input value={form.endereco} onChange={(e) => set("endereco", e.target.value)} style={inputStyle} />
      </Field>
      <Field label="Bairro *">
        <input value={form.bairro} onChange={(e) => set("bairro", e.target.value)} style={inputStyle} />
      </Field>
      <Field label="Ponto de referência">
        <input value={form.referencia} onChange={(e) => set("referencia", e.target.value)} style={inputStyle} />
      </Field>
      <Field label="Responsável no local (se não for o cliente)">
        <input value={form.responsavelLocal} onChange={(e) => set("responsavelLocal", e.target.value)} style={inputStyle} />
      </Field>
      <Field label="Link de localização (Maps/Waze)">
        <input value={form.locationLink} onChange={(e) => set("locationLink", e.target.value)} placeholder="Cole aqui o link, se tiver" style={inputStyle} />
      </Field>

      <div style={{ fontSize: "12px", fontWeight: 700, color: COLORS.darkGreenText, margin: "14px 0 4px" }}>
        Data e horário desejados
      </div>
      <div style={{ display: "flex", gap: "10px" }}>
        <Field label="Data" style={{ flex: 1 }}>
          <input type="date" value={form.dataDesejada} onChange={(e) => set("dataDesejada", e.target.value)} style={inputStyle} />
        </Field>
        <Field label="Horário" style={{ flex: 1 }}>
          <select value={form.janelaDesejada} onChange={(e) => set("janelaDesejada", e.target.value)} style={inputStyle}>
            {WINDOWS.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
            <option value="Outro (ver observações)">Outro horário</option>
          </select>
        </Field>
      </div>

      <Field label="Observações">
        <textarea
          value={form.observacoes}
          onChange={(e) => set("observacoes", e.target.value)}
          style={{ ...inputStyle, minHeight: "70px", resize: "vertical" }}
        />
      </Field>

      {error && <div style={{ color: COLORS.danger, fontSize: "12.5px", marginBottom: "8px" }}>{error}</div>}

      <button onClick={submit} disabled={saving} style={{ ...primaryBtnStyle, width: "100%", marginTop: "8px" }}>
        {saving ? "Enviando…" : "Enviar solicitação"}
      </button>
    </Shell>
  );
}

/* ============================= BACKOFFICE ============================= */

function Backoffice({ onExit }) {
  const [date, setDate] = useState(tomorrowISO());
  const [tab, setTab] = useState("solicitacoes");
  const [activeTech, setActiveTech] = useState(TECHS[0]);
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(null); // { tech, window, existing, requestId }
  const [form, setForm] = useState(emptyForm());
  const [extraLabel, setExtraLabel] = useState("");
  const [msgTech, setMsgTech] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [scheduling, setScheduling] = useState(null); // { request, tech, window, date }

  const [allVisits, setAllVisits] = useState([]);
  const [allVisitsLoading, setAllVisitsLoading] = useState(true);

  const showToast = useCallback((text) => {
    setToast(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  }, []);

  const loadVisits = useCallback(async (d) => {
    setLoading(true);
    const { data, error } = await supabase.from("visits").select("*").eq("visit_date", d);
    if (error) {
      showToast("Erro ao carregar a agenda desse dia.");
      setVisits([]);
    } else {
      setVisits((data || []).map(fromDbVisit));
    }
    setLoading(false);
  }, [showToast]);

  useEffect(() => {
    loadVisits(date);
  }, [date, loadVisits]);

  const loadRequests = useCallback(async () => {
    setRequestsLoading(true);
    const { data, error } = await supabase.from("requests").select("*").order("created_at", { ascending: false });
    if (error) {
      showToast("Erro ao carregar solicitações.");
      setRequests([]);
    } else {
      setRequests((data || []).map(fromDbRequest));
    }
    setRequestsLoading(false);
  }, [showToast]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const loadAllVisits = useCallback(async () => {
    setAllVisitsLoading(true);
    const { data, error } = await supabase.from("visits").select("*");
    if (error) {
      setAllVisits([]);
    } else {
      setAllVisits((data || []).map(fromDbVisit));
    }
    setAllVisitsLoading(false);
  }, []);

  useEffect(() => {
    loadAllVisits();
  }, [loadAllVisits]);

  function openForm(tech, windowLabel, existing) {
    setForm(existing ? { ...emptyForm(), ...existing } : emptyForm());
    setExtraLabel(existing && existing.window === "Extra" ? existing.extraLabel || "" : "");
    setFormOpen({ tech, window: windowLabel, existing, date });
  }

  function closeForm() {
    setFormOpen(null);
    setForm(emptyForm());
    setExtraLabel("");
  }

  async function saveForm() {
    if (!form.clientName.trim() || !form.address.trim() || !form.bairro.trim()) {
      showToast("Preencha cliente, endereço e bairro antes de salvar.");
      return;
    }
    const { tech, window: windowLabel, existing, requestId, date: targetDate } = formOpen;
    const chosenDate = targetDate || date;
    const visit = {
      ...form,
      tech,
      window: windowLabel,
      ...(windowLabel === "Extra" ? { extraLabel: extraLabel || "Extra" } : {}),
      ...(requestId ? { requestId } : existing && existing.requestId ? { requestId: existing.requestId } : {}),
    };
    const payload = toDbVisit(visit, chosenDate);

    if (existing) {
      const { data, error } = await supabase.from("visits").update(payload).eq("id", existing.id).select().single();
      if (error) {
        showToast("Erro ao salvar a visita.");
        return;
      }
      if (chosenDate === date) {
        setVisits((prev) => prev.map((v) => (v.id === existing.id ? fromDbVisit(data) : v)));
      } else {
        setVisits((prev) => prev.filter((v) => v.id !== existing.id));
        setDate(chosenDate);
      }
    } else {
      const { data, error } = await supabase.from("visits").insert([payload]).select().single();
      if (error) {
        showToast("Erro ao salvar a visita.");
        return;
      }
      if (chosenDate === date) {
        setVisits((prev) => [...prev, fromDbVisit(data)]);
      } else {
        setDate(chosenDate);
      }
    }

    if (requestId) {
      const { error: reqErr } = await supabase.from("requests").update({ status: "Confirmada" }).eq("id", requestId);
      if (!reqErr) setRequests((prev) => prev.map((r) => (r.id === requestId ? { ...r, status: "Confirmada" } : r)));
    }
    loadAllVisits();
    showToast(chosenDate !== date ? `Visita salva em ${formatDateLabel(chosenDate)}.` : "Visita salva.");
    closeForm();
  }

  async function deleteVisit(id) {
    const { error } = await supabase.from("visits").delete().eq("id", id);
    if (error) {
      showToast("Erro ao remover a visita.");
      return;
    }
    setVisits((prev) => prev.filter((v) => v.id !== id));
    loadAllVisits();
    showToast("Visita removida.");
    closeForm();
  }

  async function updateStatus(id, status) {
    const { error } = await supabase.from("visits").update({ status }).eq("id", id);
    if (error) {
      showToast("Erro ao atualizar o status.");
      return;
    }
    setVisits((prev) => prev.map((v) => (v.id === id ? { ...v, status } : v)));
    loadAllVisits();
  }

  function getSlotVisit(tech, windowLabel) {
    return visits.find((v) => v.tech === tech && v.window === windowLabel) || null;
  }
  function getExtras(tech) {
    return visits.filter((v) => v.tech === tech && v.window === "Extra");
  }

  async function copyMessage(tech) {
    const techVisits = visits.filter((v) => v.tech === tech);
    const text = generateMessage(date, tech, techVisits);
    try {
      await navigator.clipboard.writeText(text);
      showToast("Mensagem copiada.");
    } catch (e) {
      showToast("Não foi possível copiar automaticamente. Selecione o texto manualmente.");
    }
  }

  function openWhats(tech) {
    const techVisits = visits.filter((v) => v.tech === tech);
    const text = generateMessage(date, tech, techVisits);
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  function startScheduling(request) {
    setScheduling({
      request,
      tech: TECHS[0],
      window: WINDOWS.includes(request.janelaDesejada) ? request.janelaDesejada : WINDOWS[0],
      date: request.dataDesejada || tomorrowISO(),
    });
  }

  function confirmScheduling() {
    const { request, tech, window: windowLabel, date: chosenDate } = scheduling;
    setDate(chosenDate);
    setForm({
      ...emptyForm(),
      clientName: request.nome,
      phone: request.telefone,
      address: request.endereco,
      bairro: request.bairro,
      reference: request.referencia,
      proposalValue: request.proposalValue || "",
      responsavelLocal: request.responsavelLocal || "",
      locationLink: request.locationLink || "",
      canal: CANAIS.includes(request.canal) ? request.canal : CANAIS[0],
      visitType: SERVICE_TYPES.includes(request.tipoServico) ? request.tipoServico : SERVICE_TYPES[0],
    });
    setExtraLabel(windowLabel === "Extra" ? "Extra" : "");
    setFormOpen({ tech, window: windowLabel, existing: null, requestId: request.id, date: chosenDate });
    setScheduling(null);
  }

  async function recuseRequest(id) {
    const { error } = await supabase.from("requests").update({ status: "Recusada" }).eq("id", id);
    if (error) {
      showToast("Erro ao recusar a solicitação.");
      return;
    }
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: "Recusada" } : r)));
    showToast("Solicitação recusada.");
  }

  const totalDia = visits.length;
  const bairrosDia = Array.from(new Set(visits.map((v) => v.bairro).filter(Boolean)));
  const mapaRows = TECHS.flatMap((tech) => {
    const fixed = WINDOWS.map((w) => ({ window: w, visit: getSlotVisit(tech, w) })).filter((r) => r.visit);
    const extras = getExtras(tech).map((v) => ({ window: v.extraLabel || "Extra", visit: v }));
    return [...fixed, ...extras].map((r) => ({ tech, ...r }));
  });
  const pendingCount = requests.filter((r) => r.status === "Pendente").length;

  return (
    <Shell>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <BrandHeader subtitle="Painel Interno — Agenda e Logística" />
        <button onClick={onExit} style={{ ...linkBtnStyle, fontSize: "12px" }}>
          Sair
        </button>
      </div>
      <div style={{ fontSize: "13px", color: COLORS.muted, margin: "8px 0 18px" }}>
        Aceite solicitações, monte a agenda dos técnicos e envie os resumos.
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ ...inputStyle, width: "auto" }} />
        <button onClick={() => setDate(todayISO())} style={pillBtnStyle(date === todayISO())}>
          Hoje
        </button>
        <button onClick={() => setDate(tomorrowISO())} style={pillBtnStyle(date === tomorrowISO())}>
          Amanhã
        </button>
        <div style={{ fontSize: "13px", color: COLORS.muted, marginLeft: "auto" }}>{formatDateLabel(date)}</div>
      </div>

      <div style={{ display: "flex", gap: "4px", borderBottom: `1px solid ${COLORS.border}`, marginBottom: "16px", flexWrap: "wrap" }}>
        {[
          { id: "solicitacoes", label: `Solicitações${pendingCount ? ` (${pendingCount})` : ""}` },
          { id: "agenda", label: "Agenda por técnico" },
          { id: "kanban", label: "Kanban" },
          { id: "mapa", label: "Mapa do dia" },
          { id: "clientes", label: "Clientes" },
          { id: "resumo", label: "Resumo" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: "9px 12px",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              fontFamily: FONT_BODY,
              fontSize: "13.5px",
              fontWeight: tab === t.id ? 700 : 400,
              color: tab === t.id ? COLORS.darkGreenText : COLORS.muted,
              borderBottom: tab === t.id ? `2px solid ${COLORS.darkGreen}` : "2px solid transparent",
              marginBottom: "-1px",
              whiteSpace: "nowrap",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "solicitacoes" ? (
        <SolicitacoesTab
          requests={requests}
          requestsLoading={requestsLoading}
          startScheduling={startScheduling}
          scheduling={scheduling}
          setScheduling={setScheduling}
          confirmScheduling={confirmScheduling}
          recuseRequest={recuseRequest}
        />
      ) : loading ? (
        <div style={{ padding: "30px", textAlign: "center", color: COLORS.muted, fontSize: "14px" }}>
          Carregando programação…
        </div>
      ) : tab === "agenda" ? (
        <AgendaTab
          activeTech={activeTech}
          setActiveTech={setActiveTech}
          getSlotVisit={getSlotVisit}
          getExtras={getExtras}
          openForm={openForm}
          updateStatus={updateStatus}
          msgTech={msgTech}
          setMsgTech={setMsgTech}
          copyMessage={copyMessage}
          openWhats={openWhats}
          date={date}
          visits={visits}
        />
      ) : tab === "kanban" ? (
        <KanbanTab getSlotVisit={getSlotVisit} getExtras={getExtras} openForm={openForm} updateStatus={updateStatus} />
      ) : tab === "mapa" ? (
        <MapaTab mapaRows={mapaRows} totalDia={totalDia} bairrosDia={bairrosDia} updateStatus={updateStatus} openForm={openForm} />
      ) : tab === "clientes" ? (
        <ClientesTab
          requests={requests}
          allVisits={allVisits}
          allVisitsLoading={allVisitsLoading || requestsLoading}
          refreshAll={() => {
            loadRequests();
            loadAllVisits();
          }}
          showToast={showToast}
        />
      ) : (
        <ResumoTab showToast={showToast} />
      )}

      {formOpen && (
        <VisitFormModal
          formOpen={formOpen}
          setFormOpen={setFormOpen}
          form={form}
          setForm={setForm}
          extraLabel={extraLabel}
          setExtraLabel={setExtraLabel}
          onSave={saveForm}
          onCancel={closeForm}
          onDelete={formOpen.existing ? () => deleteVisit(formOpen.existing.id) : null}
        />
      )}

      {toast && (
        <div
          style={{
            position: "sticky",
            bottom: "0",
            marginTop: "16px",
            background: COLORS.ink,
            color: "#fff",
            padding: "10px 14px",
            borderRadius: "8px",
            fontSize: "13px",
            textAlign: "center",
          }}
        >
          {toast}
        </div>
      )}
    </Shell>
  );
}

/* ============================= SOLICITAÇÕES ============================= */

function SolicitacoesTab({ requests, requestsLoading, startScheduling, scheduling, setScheduling, confirmScheduling, recuseRequest }) {
  const pending = requests.filter((r) => r.status === "Pendente");
  const decided = requests.filter((r) => r.status !== "Pendente");

  return (
    <div>
      {requestsLoading ? (
        <div style={{ fontSize: "13px", color: COLORS.muted }}>Carregando solicitações…</div>
      ) : pending.length === 0 ? (
        <div
          style={{
            border: `1px dashed ${COLORS.borderStrong}`,
            borderRadius: "10px",
            padding: "22px",
            textAlign: "center",
            color: COLORS.muted,
            fontSize: "13px",
          }}
        >
          Nenhuma solicitação pendente no momento.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {pending.map((r) => (
            <div
              key={r.id}
              style={{
                background: "#fff",
                border: `1px solid ${COLORS.border}`,
                borderRadius: "10px",
                padding: "12px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", flexWrap: "wrap" }}>
                <div>
                  <span
                    style={{
                      display: "inline-block",
                      background: "#F1F5EA",
                      color: COLORS.darkGreenText,
                      fontSize: "11px",
                      fontWeight: 700,
                      borderRadius: "999px",
                      padding: "2px 9px",
                      marginBottom: "5px",
                    }}
                  >
                    {r.tipoServico}
                  </span>
                  <div style={{ fontWeight: 700, fontSize: "14.5px", color: COLORS.ink }}>{r.nome}</div>
                  <div style={{ fontSize: "12.5px", color: COLORS.muted }}>
                    {[r.bairro, r.canal].filter(Boolean).join(" · ")}
                  </div>
                  <div style={{ fontSize: "12px", color: COLORS.muted, marginTop: "3px" }}>
                    Desejado: {formatDateLabel(r.dataDesejada)} · {r.janelaDesejada}
                  </div>
                  <div style={{ fontSize: "12px", color: COLORS.muted }}>Solicitado por: {r.solicitante}</div>
                  {r.observacoes ? (
                    <div style={{ fontSize: "12px", color: COLORS.muted, marginTop: "3px", fontStyle: "italic" }}>
                      "{r.observacoes}"
                    </div>
                  ) : null}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <button onClick={() => startScheduling(r)} style={{ ...primaryBtnStyle, padding: "7px 12px", fontSize: "12.5px" }}>
                    Aceitar e agendar
                  </button>
                  <button
                    onClick={() => recuseRequest(r.id)}
                    style={{
                      border: `1px solid ${COLORS.danger}`,
                      background: "#fff",
                      color: COLORS.danger,
                      borderRadius: "8px",
                      padding: "7px 12px",
                      fontSize: "12.5px",
                      fontFamily: FONT_BODY,
                      cursor: "pointer",
                    }}
                  >
                    Recusar
                  </button>
                </div>
              </div>

              {scheduling && scheduling.request.id === r.id && (
                <div style={{ marginTop: "10px", background: "#F3F0E4", borderRadius: "10px", padding: "10px" }}>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <select
                      value={scheduling.tech}
                      onChange={(e) => setScheduling({ ...scheduling, tech: e.target.value })}
                      style={{ ...inputStyle, width: "auto" }}
                    >
                      {TECHS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                    <select
                      value={scheduling.window}
                      onChange={(e) => setScheduling({ ...scheduling, window: e.target.value })}
                      style={{ ...inputStyle, width: "auto" }}
                    >
                      {WINDOWS.map((w) => (
                        <option key={w} value={w}>
                          {w}
                        </option>
                      ))}
                      <option value="Extra">Extra</option>
                    </select>
                    <input
                      type="date"
                      value={scheduling.date}
                      onChange={(e) => setScheduling({ ...scheduling, date: e.target.value })}
                      style={{ ...inputStyle, width: "auto" }}
                    />
                    <button onClick={confirmScheduling} style={{ ...primaryBtnStyle, padding: "7px 14px", fontSize: "12.5px" }}>
                      Continuar
                    </button>
                    <button onClick={() => setScheduling(null)} style={{ ...secondaryBtnStyle, padding: "7px 14px", fontSize: "12.5px" }}>
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {decided.length > 0 && (
        <div style={{ marginTop: "16px", fontSize: "12px", color: COLORS.muted }}>
          {decided.filter((r) => r.status === "Confirmada").length} confirmada(s) ·{" "}
          {decided.filter((r) => r.status === "Recusada").length} recusada(s) no histórico.
        </div>
      )}
    </div>
  );
}

/* ============================= RESUMO ============================= */

function ResumoTab({ showToast }) {
  const [hojeDate, setHojeDate] = useState(todayISO());
  const [amanhaDate, setAmanhaDate] = useState(tomorrowISO());
  const [output, setOutput] = useState("");
  const [loadingSummary, setLoadingSummary] = useState(false);

  async function generate() {
    setLoadingSummary(true);
    try {
      const [resHoje, resAmanha] = await Promise.all([
        supabase.from("visits").select("*").eq("visit_date", hojeDate),
        supabase.from("visits").select("*").eq("visit_date", amanhaDate),
      ]);
      const hojeVisits = (resHoje.data || []).map(fromDbVisit);
      const amanhaVisits = (resAmanha.data || []).map(fromDbVisit);
      setOutput(buildExecutiveSummary(hojeDate, hojeVisits, amanhaDate, amanhaVisits));
    } catch (e) {
      showToast("Não foi possível gerar o resumo agora.");
    }
    setLoadingSummary(false);
  }

  async function copyOutput() {
    try {
      await navigator.clipboard.writeText(output);
      showToast("Resumo copiado.");
    } catch (e) {
      showToast("Não foi possível copiar automaticamente.");
    }
  }

  function openWhatsOutput() {
    window.open(`https://wa.me/?text=${encodeURIComponent(output)}`, "_blank");
  }

  return (
    <div>
      <div style={{ fontSize: "13px", color: COLORS.muted, marginBottom: "14px" }}>
        Combina os resultados de um dia com a programação do dia seguinte, pronto para enviar à gestão.
      </div>
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "12px" }}>
        <Field label="Dia com resultado (hoje)">
          <input type="date" value={hojeDate} onChange={(e) => setHojeDate(e.target.value)} style={inputStyle} />
        </Field>
        <Field label="Dia seguinte (amanhã)">
          <input type="date" value={amanhaDate} onChange={(e) => setAmanhaDate(e.target.value)} style={inputStyle} />
        </Field>
      </div>
      <button onClick={generate} disabled={loadingSummary} style={primaryBtnStyle}>
        {loadingSummary ? "Gerando…" : "Gerar resumo"}
      </button>

      {output && (
        <div style={{ marginTop: "14px" }}>
          <textarea
            readOnly
            value={output}
            style={{
              width: "100%",
              minHeight: "220px",
              fontFamily: FONT_MONO,
              fontSize: "13px",
              border: `1px solid ${COLORS.borderStrong}`,
              borderRadius: "10px",
              padding: "12px",
              background: "#fff",
              color: COLORS.ink,
              boxSizing: "border-box",
              resize: "vertical",
            }}
          />
          <div style={{ display: "flex", gap: "8px", marginTop: "10px", flexWrap: "wrap" }}>
            <ActionButton onClick={copyOutput} icon={<IconCopy />} label="Copiar resumo" />
            <ActionButton onClick={openWhatsOutput} icon={<IconWhats />} label="Abrir no WhatsApp" accent />
          </div>
        </div>
      )}
    </div>
  );
}

function buildHistorico(requests, allVisits) {
  const rows = [];
  const byRequestId = {};
  allVisits.forEach((v) => {
    if (v.requestId) {
      byRequestId[v.requestId] = byRequestId[v.requestId] || [];
      byRequestId[v.requestId].push(v);
    }
  });

  requests.forEach((r) => {
    const linked = byRequestId[r.id] || [];
    if (!linked.length) {
      const extra = r.status === "Pendente" ? " — aguardando confirmação" : r.status === "Recusada" ? " — não seguiu adiante" : "";
      rows.push({
        id: r.id + "_solo",
        origem: "Solicitação",
        nome: r.nome,
        telefone: r.telefone,
        endereco: r.endereco,
        bairro: r.bairro,
        tipoServico: r.tipoServico,
        canal: r.canal,
        solicitante: r.solicitante,
        statusSolicitacao: r.status,
        tecnico: "—",
        dataAgendada: "",
        janela: "—",
        statusVisita: "—",
        trilha: `Solicitação (${r.status})${extra}`,
      });
    } else {
      linked.forEach((v) => {
        const win = v.window === "Extra" ? v.extraLabel || "Extra" : v.window;
        rows.push({
          id: v.id,
          origem: "Solicitação",
          nome: r.nome,
          telefone: r.telefone,
          endereco: r.endereco,
          bairro: r.bairro,
          tipoServico: v.visitType || r.tipoServico,
          canal: v.canal || r.canal,
          solicitante: r.solicitante,
          statusSolicitacao: r.status,
          tecnico: v.tech,
          dataAgendada: v._date,
          janela: win,
          statusVisita: v.status,
          trilha: `Solicitação (${r.status}) → ${v.tech}, ${formatDateLabel(v._date)} ${win} → ${v.status}`,
        });
      });
    }
  });

  allVisits
    .filter((v) => !v.requestId)
    .forEach((v) => {
      const win = v.window === "Extra" ? v.extraLabel || "Extra" : v.window;
      rows.push({
        id: v.id,
        origem: "Direto no painel",
        nome: v.clientName,
        telefone: v.phone,
        endereco: v.address,
        bairro: v.bairro,
        tipoServico: v.visitType,
        canal: v.canal,
        solicitante: "—",
        statusSolicitacao: "—",
        tecnico: v.tech,
        dataAgendada: v._date,
        janela: win,
        statusVisita: v.status,
        trilha: `Cadastrado direto no painel → ${v.tech}, ${formatDateLabel(v._date)} ${win} → ${v.status}`,
      });
    });

  rows.sort((a, b) => {
    if (!a.dataAgendada && b.dataAgendada) return 1;
    if (!b.dataAgendada && a.dataAgendada) return -1;
    return (b.dataAgendada || "").localeCompare(a.dataAgendada || "");
  });

  return rows;
}

function buildHistoricoCsv(rows) {
  const header = [
    "nome",
    "telefone",
    "endereco",
    "bairro",
    "tipo_servico",
    "canal",
    "solicitante",
    "status_solicitacao",
    "tecnico",
    "data_agendada",
    "janela",
    "status_visita",
    "origem",
    "trilha",
  ];
  const esc = (v) => {
    const s = String(v == null ? "" : v);
    return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [header.join(",")];
  rows.forEach((r) => {
    lines.push(
      [r.nome, r.telefone, r.endereco, r.bairro, r.tipoServico, r.canal, r.solicitante, r.statusSolicitacao, r.tecnico, r.dataAgendada, r.janela, r.statusVisita, r.origem, r.trilha]
        .map(esc)
        .join(",")
    );
  });
  return lines.join("\n");
}

function computeArchivable(requests, allVisits, cutoff) {
  const byReq = {};
  allVisits.forEach((v) => {
    if (v.requestId) {
      byReq[v.requestId] = byReq[v.requestId] || [];
      byReq[v.requestId].push(v);
    }
  });

  const datesToDelete = Array.from(new Set(allVisits.filter((v) => v._date && v._date < cutoff).map((v) => v._date)));
  const archivedVisits = allVisits.filter((v) => v._date && v._date < cutoff);

  const requestsToRemove = requests.filter((r) => {
    if (r.status === "Pendente") return false; // nunca arquiva pendente
    const linked = byReq[r.id] || [];
    if (linked.length) return linked.every((v) => v._date && v._date < cutoff);
    return (r.dataDesejada || "") < cutoff;
  });

  return { datesToDelete, archivedVisits, requestsToRemove };
}

function downloadCsv(filename, csvText) {
  const blob = new Blob(["\uFEFF" + csvText], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function ClientesTab({ requests, allVisits, allVisitsLoading, refreshAll, showToast }) {
  const [search, setSearch] = useState("");
  const [cutoff, setCutoff] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 90);
    return toISO(d);
  });
  const [backupReady, setBackupReady] = useState(false);
  const [backupCutoffUsed, setBackupCutoffUsed] = useState(null);
  const [backupCount, setBackupCount] = useState(0);
  const [archiving, setArchiving] = useState(false);

  const rows = buildHistorico(requests, allVisits);
  const term = search.trim().toLowerCase();
  const filtered = term
    ? rows.filter((r) =>
        [r.nome, r.bairro, r.tecnico, r.tipoServico, r.statusSolicitacao, r.statusVisita, r.canal]
          .join(" ")
          .toLowerCase()
          .includes(term)
      )
    : rows;

  async function copyCsv() {
    try {
      await navigator.clipboard.writeText(buildHistoricoCsv(filtered));
      showToast("CSV copiado.");
    } catch (e) {
      showToast("Não foi possível copiar automaticamente.");
    }
  }

  function baixarCsv() {
    downloadCsv(`clientes-brandao-solar-${todayISO()}.csv`, buildHistoricoCsv(filtered));
  }

  function handleGenerateBackup() {
    const { archivedVisits, requestsToRemove } = computeArchivable(requests, allVisits, cutoff);
    const archiveRows = buildHistorico(requestsToRemove, archivedVisits);
    if (!archiveRows.length) {
      showToast("Nada para arquivar antes dessa data.");
      setBackupReady(false);
      return;
    }
    downloadCsv(`arquivo-brandao-solar-ate-${cutoff}.csv`, buildHistoricoCsv(archiveRows));
    setBackupCount(archiveRows.length);
    setBackupReady(true);
    setBackupCutoffUsed(cutoff);
    showToast(`Backup baixado — ${archiveRows.length} registro(s).`);
  }

  async function handleConfirmArchive() {
    setArchiving(true);
    const { requestsToRemove } = computeArchivable(requests, allVisits, cutoff);
    try {
      const { error: visitsErr } = await supabase.from("visits").delete().lt("visit_date", cutoff);
      if (visitsErr) throw visitsErr;
      if (requestsToRemove.length) {
        const { error: reqErr } = await supabase.from("requests").delete().in("id", requestsToRemove.map((r) => r.id));
        if (reqErr) throw reqErr;
      }
      showToast("Arquivamento concluído — registros removidos do sistema.");
      setBackupReady(false);
      refreshAll();
    } catch (e) {
      showToast("Erro ao arquivar. Tente novamente.");
    }
    setArchiving(false);
  }

  return (
    <div>
      <div style={{ fontSize: "12px", color: COLORS.muted, marginBottom: "12px" }}>
        Todos os cadastros e visitas já registrados no sistema, com a trilha de cada um — da solicitação até o
        resultado final. Cobre todas as datas, não só a selecionada acima.
      </div>

      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "12px" }}>
        <SummaryChip label="Registros" value={rows.length} />
        <SummaryChip label="Realizadas" value={rows.filter((r) => r.statusVisita === "Realizado").length} />
        <SummaryChip label="Não realizadas" value={rows.filter((r) => r.statusVisita === "Não realizada").length} />
      </div>

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "14px" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome, bairro, técnico ou status..."
          style={{ ...inputStyle, flex: 1, minWidth: "220px" }}
        />
        <button onClick={refreshAll} style={secondaryBtnStyle}>
          Atualizar
        </button>
        <button onClick={baixarCsv} style={primaryBtnStyle}>
          Baixar CSV
        </button>
        <button onClick={copyCsv} style={secondaryBtnStyle}>
          Copiar CSV
        </button>
      </div>

      {allVisitsLoading ? (
        <div style={{ fontSize: "13px", color: COLORS.muted }}>Carregando histórico…</div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            border: `1px dashed ${COLORS.borderStrong}`,
            borderRadius: "10px",
            padding: "22px",
            textAlign: "center",
            color: COLORS.muted,
            fontSize: "13px",
          }}
        >
          Nenhum registro encontrado.
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
            <thead>
              <tr>
                {["Cliente", "Bairro", "Serviço", "Solicitação", "Técnico", "Data", "Visita", "Trilha"].map((h) => (
                  <th
                    key={h}
                    style={{ textAlign: "left", padding: "7px 9px", background: COLORS.darkGreen, color: "#fff", fontWeight: 700, fontSize: "11.5px", whiteSpace: "nowrap" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                  <td style={{ padding: "7px 9px", fontWeight: 600 }}>{r.nome}</td>
                  <td style={{ padding: "7px 9px" }}>{r.bairro}</td>
                  <td style={{ padding: "7px 9px" }}>{r.tipoServico}</td>
                  <td style={{ padding: "7px 9px", color: r.statusSolicitacao === "Recusada" ? COLORS.danger : COLORS.ink }}>
                    {r.statusSolicitacao}
                  </td>
                  <td style={{ padding: "7px 9px" }}>{r.tecnico}</td>
                  <td style={{ padding: "7px 9px", whiteSpace: "nowrap" }}>{r.dataAgendada ? formatDateLabel(r.dataAgendada) : "—"}</td>
                  <td style={{ padding: "7px 9px", color: STATUS_COLOR[r.statusVisita] || COLORS.ink, fontWeight: 600 }}>{r.statusVisita}</td>
                  <td style={{ padding: "7px 9px", color: COLORS.muted, fontSize: "11.5px", maxWidth: "260px" }}>{r.trilha}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Arquivamento de períodos antigos */}
      <div style={{ marginTop: "26px", borderTop: `1px solid ${COLORS.border}`, paddingTop: "16px" }}>
        <div style={{ fontSize: "13px", fontWeight: 700, color: COLORS.darkGreenText, marginBottom: "6px" }}>
          Arquivar períodos antigos
        </div>
        <div style={{ fontSize: "12px", color: COLORS.muted, marginBottom: "10px" }}>
          Baixa um backup completo dos registros anteriores à data escolhida e, só depois de confirmado, remove
          esses registros do sistema para manter o painel rápido. Solicitações ainda pendentes nunca são
          arquivadas, mesmo que antigas.
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "flex-end" }}>
          <Field label="Arquivar tudo antes de">
            <input
              type="date"
              value={cutoff}
              onChange={(e) => {
                setCutoff(e.target.value);
                setBackupReady(false);
              }}
              style={inputStyle}
            />
          </Field>
          <button onClick={handleGenerateBackup} style={secondaryBtnStyle}>
            1. Baixar backup
          </button>
          <button
            onClick={handleConfirmArchive}
            disabled={!backupReady || backupCutoffUsed !== cutoff || archiving}
            style={{
              ...primaryBtnStyle,
              background: backupReady && backupCutoffUsed === cutoff ? COLORS.danger : COLORS.border,
              color: backupReady && backupCutoffUsed === cutoff ? "#fff" : COLORS.muted,
              cursor: backupReady && backupCutoffUsed === cutoff ? "pointer" : "not-allowed",
            }}
          >
            {archiving ? "Arquivando…" : `2. Confirmar e apagar (${backupCount})`}
          </button>
        </div>
        {backupReady && backupCutoffUsed === cutoff && (
          <div style={{ fontSize: "11.5px", color: COLORS.muted, marginTop: "6px" }}>
            Backup já baixado. Confira o arquivo antes de confirmar — essa remoção não tem como desfazer.
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================= AGENDA / KANBAN / MAPA (unchanged core) ============================= */

function pillBtnStyle(active) {
  return {
    border: `1px solid ${active ? "#569137" : "#d8cfae"}`,
    background: active ? "#569137" : "#fff",
    color: active ? "#fff" : "#2b2b23",
    borderRadius: "999px",
    padding: "6px 14px",
    fontSize: "13px",
    fontFamily: FONT_BODY,
    cursor: "pointer",
  };
}

const primaryBtnStyle = {
  border: "none",
  background: COLORS.darkGreen,
  color: "#fff",
  borderRadius: "8px",
  padding: "9px 16px",
  fontSize: "13.5px",
  fontWeight: 700,
  fontFamily: FONT_BODY,
  cursor: "pointer",
};

const secondaryBtnStyle = {
  border: `1px solid ${COLORS.borderStrong}`,
  background: "#fff",
  color: COLORS.ink,
  borderRadius: "8px",
  padding: "9px 16px",
  fontSize: "13.5px",
  fontFamily: FONT_BODY,
  cursor: "pointer",
};

const linkBtnStyle = {
  border: "none",
  background: "transparent",
  color: COLORS.darkGreenText,
  fontFamily: FONT_BODY,
  fontSize: "13px",
  fontWeight: 700,
  cursor: "pointer",
  padding: 0,
};

function AgendaTab({
  activeTech,
  setActiveTech,
  getSlotVisit,
  getExtras,
  openForm,
  updateStatus,
  msgTech,
  setMsgTech,
  copyMessage,
  openWhats,
  date,
  visits,
}) {
  const extras = getExtras(activeTech);
  const techVisits = visits.filter((v) => v.tech === activeTech);
  const filledCount = WINDOWS.filter((w) => getSlotVisit(activeTech, w)).length + extras.length;
  const bairros = Array.from(new Set(techVisits.map((v) => v.bairro).filter(Boolean)));

  return (
    <div>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
        {TECHS.map((t) => (
          <button
            key={t}
            onClick={() => {
              setActiveTech(t);
              setMsgTech(null);
            }}
            style={{
              padding: "8px 16px",
              borderRadius: "10px",
              border: `1px solid ${t === activeTech ? COLORS.darkGreen : COLORS.borderStrong}`,
              background: t === activeTech ? COLORS.darkGreen : "#fff",
              color: t === activeTech ? "#fff" : COLORS.ink,
              fontFamily: FONT_BODY,
              fontWeight: t === activeTech ? 700 : 400,
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
        <SummaryChip label="Visitas" value={filledCount} />
        <SummaryChip label="Bairros" value={bairros.length ? bairros.join(" · ") : "—"} wide />
      </div>

      <div style={{ marginBottom: "4px", fontSize: "13px", fontWeight: 700, color: COLORS.darkGreenText }}>☀️ MANHÃ</div>
      {WINDOWS.slice(0, 2).map((w) => (
        <TimelineRow key={w} tech={activeTech} windowLabel={w} visit={getSlotVisit(activeTech, w)} openForm={openForm} updateStatus={updateStatus} />
      ))}

      <div style={{ margin: "14px 0 4px", fontSize: "13px", fontWeight: 700, color: COLORS.darkGreenText }}>🌤️ TARDE</div>
      {WINDOWS.slice(2, 4).map((w) => (
        <TimelineRow key={w} tech={activeTech} windowLabel={w} visit={getSlotVisit(activeTech, w)} openForm={openForm} updateStatus={updateStatus} />
      ))}

      <div style={{ margin: "14px 0 4px", fontSize: "13px", fontWeight: 700, color: COLORS.darkGreenText }}>➕ VISITAS EXTRAS</div>
      {extras.map((v) => (
        <TimelineRow key={v.id} tech={activeTech} windowLabel="Extra" visit={v} label={v.extraLabel || "Extra"} openForm={openForm} updateStatus={updateStatus} />
      ))}
      <button
        onClick={() => openForm(activeTech, "Extra", null)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          border: `1px dashed ${COLORS.borderStrong}`,
          background: "transparent",
          color: COLORS.muted,
          borderRadius: "10px",
          padding: "9px 12px",
          fontSize: "13px",
          fontFamily: FONT_BODY,
          cursor: "pointer",
          marginTop: "4px",
        }}
      >
        <IconPlus /> Adicionar visita extra (rota próxima)
      </button>

      <div style={{ marginTop: "22px", borderTop: `1px solid ${COLORS.border}`, paddingTop: "16px" }}>
        <button
          onClick={() => setMsgTech(msgTech === activeTech ? null : activeTech)}
          style={{
            border: "none",
            background: COLORS.gold,
            color: "#402d00",
            borderRadius: "10px",
            padding: "10px 16px",
            fontFamily: FONT_BODY,
            fontWeight: 700,
            fontSize: "14px",
            cursor: "pointer",
          }}
        >
          {msgTech === activeTech ? "Ocultar mensagem" : "Gerar mensagem para o WhatsApp"}
        </button>

        {msgTech === activeTech && (
          <div style={{ marginTop: "12px" }}>
            <textarea
              readOnly
              value={generateMessage(date, activeTech, techVisits)}
              style={{
                width: "100%",
                minHeight: "220px",
                fontFamily: FONT_MONO,
                fontSize: "13px",
                border: `1px solid ${COLORS.borderStrong}`,
                borderRadius: "10px",
                padding: "12px",
                background: "#fff",
                color: COLORS.ink,
                boxSizing: "border-box",
                resize: "vertical",
              }}
            />
            <div style={{ display: "flex", gap: "8px", marginTop: "10px", flexWrap: "wrap" }}>
              <ActionButton onClick={() => copyMessage(activeTech)} icon={<IconCopy />} label="Copiar mensagem" />
              <ActionButton onClick={() => openWhats(activeTech)} icon={<IconWhats />} label="Abrir no WhatsApp" accent />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryChip({ label, value, wide }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: "10px", padding: "8px 14px", minWidth: wide ? "220px" : "90px" }}>
      <div style={{ fontSize: "11px", color: COLORS.muted, textTransform: "uppercase", letterSpacing: "0.03em" }}>{label}</div>
      <div style={{ fontSize: "15px", fontWeight: 700, color: COLORS.ink }}>{value}</div>
    </div>
  );
}

function ActionButton({ onClick, icon, label, accent }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        border: `1px solid ${accent ? COLORS.darkGreen : COLORS.borderStrong}`,
        background: accent ? COLORS.darkGreen : "#fff",
        color: accent ? "#fff" : COLORS.ink,
        borderRadius: "8px",
        padding: "8px 14px",
        fontFamily: FONT_BODY,
        fontSize: "13px",
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function TimelineRow({ tech, windowLabel, visit, label, openForm, updateStatus }) {
  const isExtra = windowLabel === "Extra";
  return (
    <div style={{ display: "flex", gap: "10px", marginBottom: "8px" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "14px", paddingTop: "6px" }}>
        <div
          style={{
            width: "10px",
            height: "10px",
            borderRadius: "50%",
            background: visit ? COLORS.darkGreen : "#fff",
            border: `2px solid ${visit ? COLORS.darkGreen : COLORS.borderStrong}`,
            flexShrink: 0,
          }}
        />
        <div style={{ width: "2px", flex: 1, background: COLORS.border, marginTop: "2px" }} />
      </div>
      <div style={{ flex: 1, paddingBottom: "2px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
          <IconClock />
          <span style={{ fontSize: "12px", fontWeight: 700, color: COLORS.muted }}>{isExtra ? label || "Extra" : windowLabel}</span>
        </div>
        {visit ? (
          <div
            onClick={() => openForm(tech, windowLabel, visit)}
            style={{ background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: "10px", padding: "10px 12px", cursor: "pointer" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
              <div style={{ fontWeight: 700, fontSize: "14px", color: COLORS.darkGreenText }}>
                {visit.clientName}
                {visit.visitType ? <span style={{ fontWeight: 400, color: COLORS.muted }}> — {visit.visitType}</span> : null}
              </div>
              {visit.proposalValue ? (
                <div style={{ fontSize: "13px", fontWeight: 700, color: COLORS.orange, whiteSpace: "nowrap" }}>R$ {visit.proposalValue}</div>
              ) : null}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "5px", marginTop: "4px", fontSize: "12.5px", color: COLORS.ink }}>
              <IconPin /> {[visit.address, visit.bairro].filter(Boolean).join(", ")}
            </div>
            {visit.reference ? <div style={{ fontSize: "12px", color: COLORS.muted, marginTop: "2px" }}>Ref: {visit.reference}</div> : null}
            {visit.responsavelLocal ? (
              <div style={{ fontSize: "12px", color: COLORS.muted, marginTop: "2px" }}>Responsável no local: {visit.responsavelLocal}</div>
            ) : null}
            <div style={{ display: "flex", gap: "10px", marginTop: "6px", fontSize: "12px", alignItems: "center" }}>
              {visit.phone ? <span style={{ color: COLORS.muted }}>☎ {visit.phone}</span> : null}
              <span style={{ color: STATUS_COLOR[visit.status] || COLORS.muted, fontWeight: 600 }}>● {visit.status}</span>
            </div>
            <div style={{ display: "flex", gap: "5px", marginTop: "6px" }} onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => updateStatus(visit.id, "Realizado")}
                style={{
                  border: `1px solid ${COLORS.darkGreen}`,
                  background: visit.status === "Realizado" ? COLORS.darkGreen : "#fff",
                  color: visit.status === "Realizado" ? "#fff" : COLORS.darkGreen,
                  borderRadius: "6px",
                  padding: "4px 10px",
                  fontSize: "11px",
                  fontWeight: 700,
                  fontFamily: FONT_BODY,
                  cursor: "pointer",
                }}
              >
                ✅ Feita
              </button>
              <button
                onClick={() => updateStatus(visit.id, "Não realizada")}
                style={{
                  border: `1px solid ${COLORS.danger}`,
                  background: visit.status === "Não realizada" ? COLORS.danger : "#fff",
                  color: visit.status === "Não realizada" ? "#fff" : COLORS.danger,
                  borderRadius: "6px",
                  padding: "4px 10px",
                  fontSize: "11px",
                  fontWeight: 700,
                  fontFamily: FONT_BODY,
                  cursor: "pointer",
                }}
              >
                ❌ Não feita
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => openForm(tech, windowLabel, null)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              width: "100%",
              border: `1px dashed ${COLORS.borderStrong}`,
              background: "transparent",
              color: COLORS.muted,
              borderRadius: "10px",
              padding: "10px 12px",
              fontSize: "13px",
              fontFamily: FONT_BODY,
              cursor: "pointer",
              textAlign: "left",
              boxSizing: "border-box",
            }}
          >
            <IconPlus /> LIVRE — adicionar visita
          </button>
        )}
      </div>
    </div>
  );
}

function KanbanTab({ getSlotVisit, getExtras, openForm, updateStatus }) {
  return (
    <div>
      <div style={{ fontSize: "12px", color: COLORS.muted, marginBottom: "12px" }}>
        Uma coluna por técnico — clique em qualquer visita para editar, ou num horário livre para preencher.
      </div>
      <div style={{ display: "flex", gap: "12px", overflowX: "auto", paddingBottom: "6px" }}>
        {TECHS.map((tech) => {
          const fixedCards = WINDOWS.map((w) => ({ window: w, visit: getSlotVisit(tech, w), label: w }));
          const extraCards = getExtras(tech).map((v) => ({ window: "Extra", visit: v, label: v.extraLabel || "Extra" }));
          const cards = [...fixedCards, ...extraCards];
          const filled = cards.filter((c) => c.visit).length;

          return (
            <div key={tech} style={{ minWidth: "210px", maxWidth: "210px", flexShrink: 0, background: "#F3F0E4", borderRadius: "12px", padding: "10px", boxSizing: "border-box" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 4px 10px", borderBottom: `1px solid ${COLORS.borderStrong}`, marginBottom: "10px" }}>
                <span style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: "14px", color: COLORS.darkGreenText }}>{tech}</span>
                <span style={{ background: COLORS.darkGreen, color: "#fff", borderRadius: "999px", fontSize: "11px", fontWeight: 700, padding: "1px 8px" }}>{filled}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {cards.map((c) => (
                  <KanbanCard key={c.window === "Extra" ? c.visit.id : c.window} tech={tech} windowLabel={c.window} label={c.label} visit={c.visit} openForm={openForm} updateStatus={updateStatus} />
                ))}
                <button
                  onClick={() => openForm(tech, "Extra", null)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "5px",
                    border: `1px dashed ${COLORS.borderStrong}`,
                    background: "transparent",
                    color: COLORS.muted,
                    borderRadius: "8px",
                    padding: "8px",
                    fontSize: "12px",
                    fontFamily: FONT_BODY,
                    cursor: "pointer",
                  }}
                >
                  <IconPlus /> Visita extra
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function KanbanCard({ tech, windowLabel, label, visit, openForm, updateStatus }) {
  if (!visit) {
    return (
      <button
        onClick={() => openForm(tech, windowLabel, null)}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: "2px",
          border: `1px dashed ${COLORS.borderStrong}`,
          background: "rgba(255,255,255,0.5)",
          borderRadius: "9px",
          padding: "8px 10px",
          fontFamily: FONT_BODY,
          cursor: "pointer",
          textAlign: "left",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <span style={{ fontSize: "11px", fontWeight: 700, color: COLORS.muted }}>{label}</span>
        <span style={{ fontSize: "12px", color: COLORS.muted, display: "flex", alignItems: "center", gap: "4px" }}>
          <IconPlus /> Livre
        </span>
      </button>
    );
  }

  const statusColor = STATUS_COLOR[visit.status] || COLORS.muted;

  return (
    <div onClick={() => openForm(tech, windowLabel, visit)} style={{ background: "#fff", borderRadius: "9px", border: `1px solid ${COLORS.border}`, borderLeft: `3px solid ${statusColor}`, padding: "8px 10px", cursor: "pointer" }}>
      <div style={{ fontSize: "11px", fontWeight: 700, color: COLORS.muted, marginBottom: "2px" }}>{label}</div>
      <div style={{ fontSize: "13px", fontWeight: 700, color: COLORS.ink, lineHeight: 1.25 }}>{visit.clientName}</div>
      {visit.visitType ? <div style={{ fontSize: "11.5px", color: COLORS.muted, marginTop: "1px" }}>{visit.visitType}</div> : null}
      {visit.bairro ? (
        <div style={{ fontSize: "11.5px", color: COLORS.ink, marginTop: "3px", display: "flex", alignItems: "center", gap: "4px" }}>
          <IconPin /> {visit.bairro}
        </div>
      ) : null}
      <div style={{ marginTop: "6px" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", gap: "5px", marginBottom: "5px" }}>
          <button
            onClick={() => updateStatus(visit.id, "Realizado")}
            style={{
              flex: 1,
              border: `1px solid ${visit.status === "Realizado" ? COLORS.darkGreen : COLORS.border}`,
              background: visit.status === "Realizado" ? COLORS.darkGreen : "#fff",
              color: visit.status === "Realizado" ? "#fff" : COLORS.darkGreenText,
              borderRadius: "6px",
              padding: "5px 4px",
              fontSize: "11px",
              fontWeight: 700,
              fontFamily: FONT_BODY,
              cursor: "pointer",
            }}
          >
            ✅ Feita
          </button>
          <button
            onClick={() => updateStatus(visit.id, "Não realizada")}
            style={{
              flex: 1,
              border: `1px solid ${visit.status === "Não realizada" ? COLORS.danger : COLORS.border}`,
              background: visit.status === "Não realizada" ? COLORS.danger : "#fff",
              color: visit.status === "Não realizada" ? "#fff" : COLORS.danger,
              borderRadius: "6px",
              padding: "5px 4px",
              fontSize: "11px",
              fontWeight: 700,
              fontFamily: FONT_BODY,
              cursor: "pointer",
            }}
          >
            ❌ Não feita
          </button>
        </div>
        <select
          value={visit.status}
          onChange={(e) => updateStatus(visit.id, e.target.value)}
          style={{ width: "100%", border: `1px solid ${COLORS.border}`, borderRadius: "6px", padding: "3px 5px", fontSize: "11px", fontFamily: FONT_BODY, color: statusColor, fontWeight: 700, background: "#fff" }}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function MapaTab({ mapaRows, totalDia, bairrosDia, updateStatus, openForm }) {
  return (
    <div>
      <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
        <SummaryChip label="Total de visitas" value={totalDia} />
        <SummaryChip label="Bairros" value={bairrosDia.length ? bairrosDia.join(" · ") : "—"} wide />
      </div>

      {mapaRows.length === 0 ? (
        <div style={{ border: `1px dashed ${COLORS.borderStrong}`, borderRadius: "10px", padding: "24px", textAlign: "center", color: COLORS.muted, fontSize: "13px" }}>
          Nenhuma visita cadastrada para essa data ainda.
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr>
                {["Janela", "Técnico", "Cliente", "Bairro", "Canal", "Status"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "8px 10px", background: COLORS.darkGreen, color: "#fff", fontWeight: 700, fontSize: "12px" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mapaRows.map((r) => (
                <tr key={r.visit.id} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                  <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>{r.window}</td>
                  <td style={{ padding: "8px 10px" }}>{r.tech}</td>
                  <td style={{ padding: "8px 10px", cursor: "pointer", color: COLORS.darkGreenText, fontWeight: 600 }} onClick={() => openForm(r.tech, r.visit.window, r.visit)}>
                    {r.visit.clientName}
                  </td>
                  <td style={{ padding: "8px 10px" }}>{r.visit.bairro}</td>
                  <td style={{ padding: "8px 10px" }}>{r.visit.canal}</td>
                  <td style={{ padding: "6px 8px" }}>
                    <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                      <button
                        onClick={() => updateStatus(r.visit.id, "Realizado")}
                        title="Marcar como realizada"
                        style={{
                          border: `1px solid ${COLORS.darkGreen}`,
                          background: r.visit.status === "Realizado" ? COLORS.darkGreen : "#fff",
                          color: r.visit.status === "Realizado" ? "#fff" : COLORS.darkGreen,
                          borderRadius: "6px",
                          padding: "4px 6px",
                          fontSize: "12px",
                          cursor: "pointer",
                        }}
                      >
                        ✅
                      </button>
                      <button
                        onClick={() => updateStatus(r.visit.id, "Não realizada")}
                        title="Marcar como não realizada"
                        style={{
                          border: `1px solid ${COLORS.danger}`,
                          background: r.visit.status === "Não realizada" ? COLORS.danger : "#fff",
                          color: r.visit.status === "Não realizada" ? "#fff" : COLORS.danger,
                          borderRadius: "6px",
                          padding: "4px 6px",
                          fontSize: "12px",
                          cursor: "pointer",
                        }}
                      >
                        ❌
                      </button>
                      <select
                        value={r.visit.status}
                        onChange={(e) => updateStatus(r.visit.id, e.target.value)}
                        style={{ border: `1px solid ${COLORS.borderStrong}`, borderRadius: "6px", padding: "4px 6px", fontSize: "12px", fontFamily: FONT_BODY, color: STATUS_COLOR[r.visit.status] || COLORS.ink, fontWeight: 600 }}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function VisitFormModal({ formOpen, setFormOpen, form, setForm, extraLabel, setExtraLabel, onSave, onCancel, onDelete }) {
  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }
  return (
    <div
      style={{
        minHeight: "420px",
        background: "rgba(43,43,35,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "14px",
        padding: "16px",
        boxSizing: "border-box",
        marginTop: "16px",
      }}
    >
      <div style={{ background: "#fff", borderRadius: "12px", padding: "20px", width: "100%", maxWidth: "480px", maxHeight: "560px", overflowY: "auto", boxSizing: "border-box" }}>
        <div style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: "17px", color: COLORS.darkGreenText, marginBottom: "2px" }}>
          {formOpen.existing ? "Editar visita" : "Nova visita"}
        </div>
        <div style={{ fontSize: "12px", color: COLORS.muted, marginBottom: "14px" }}>
          {formOpen.window === "Extra" ? "Visita extra" : formOpen.window}
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <Field label="Técnico responsável" style={{ flex: 1 }}>
            <select
              value={formOpen.tech}
              onChange={(e) => setFormOpen((f) => ({ ...f, tech: e.target.value }))}
              style={inputStyle}
            >
              {TECHS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Data da visita" style={{ flex: 1 }}>
            <input
              type="date"
              value={formOpen.date}
              onChange={(e) => setFormOpen((f) => ({ ...f, date: e.target.value }))}
              style={inputStyle}
            />
          </Field>
        </div>
        {formOpen.existing && (
          <div style={{ fontSize: "11.5px", color: COLORS.muted, marginTop: "-6px", marginBottom: "10px" }}>
            Mudar o técnico ou a data aqui reatribui/move essa visita.
          </div>
        )}

        {formOpen.window === "Extra" && (
          <Field label="Horário da visita extra">
            <input value={extraLabel} onChange={(e) => setExtraLabel(e.target.value)} placeholder="Ex: 12:00 – 13:00" style={inputStyle} />
          </Field>
        )}

        <Field label="Nome do cliente *">
          <input value={form.clientName} onChange={(e) => set("clientName", e.target.value)} style={inputStyle} />
        </Field>

        <div style={{ display: "flex", gap: "10px" }}>
          <Field label="Tipo de serviço" style={{ flex: 1 }}>
            <select value={form.visitType} onChange={(e) => set("visitType", e.target.value)} style={inputStyle}>
              {SERVICE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Proposta (R$)" style={{ width: "130px" }}>
            <input value={form.proposalValue} onChange={(e) => set("proposalValue", e.target.value)} placeholder="21.500" style={inputStyle} />
          </Field>
        </div>

        <Field label="Endereço completo *">
          <input value={form.address} onChange={(e) => set("address", e.target.value)} style={inputStyle} />
        </Field>

        <div style={{ display: "flex", gap: "10px" }}>
          <Field label="Bairro *" style={{ flex: 1 }}>
            <input value={form.bairro} onChange={(e) => set("bairro", e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Telefone" style={{ flex: 1 }}>
            <input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="(92) 90000-0000" style={inputStyle} />
          </Field>
        </div>

        <Field label="Ponto de referência">
          <input value={form.reference} onChange={(e) => set("reference", e.target.value)} style={inputStyle} />
        </Field>

        <Field label="Responsável no local (se não for o cliente)">
          <input value={form.responsavelLocal} onChange={(e) => set("responsavelLocal", e.target.value)} style={inputStyle} />
        </Field>

        <Field label="Link de localização (Maps/Waze)">
          <input value={form.locationLink} onChange={(e) => set("locationLink", e.target.value)} style={inputStyle} />
        </Field>

        <div style={{ display: "flex", gap: "10px" }}>
          <Field label="Canal de origem" style={{ flex: 1 }}>
            <select value={form.canal} onChange={(e) => set("canal", e.target.value)} style={inputStyle}>
              {CANAIS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status" style={{ flex: 1 }}>
            <select value={form.status} onChange={(e) => set("status", e.target.value)} style={inputStyle}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", marginTop: "16px" }}>
          <div>
            {onDelete && (
              <button
                onClick={onDelete}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  border: `1px solid ${COLORS.danger}`,
                  background: "#fff",
                  color: COLORS.danger,
                  borderRadius: "8px",
                  padding: "8px 12px",
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                <IconTrash /> Remover
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={onCancel} style={secondaryBtnStyle}>
              Cancelar
            </button>
            <button onClick={onSave} style={primaryBtnStyle}>
              Salvar visita
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, style }) {
  return (
    <div style={{ marginBottom: "10px", ...style }}>
      <div style={{ fontSize: "12px", color: COLORS.muted, marginBottom: "3px" }}>{label}</div>
      {children}
    </div>
  );
}

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  border: `1px solid ${COLORS.borderStrong}`,
  borderRadius: "8px",
  padding: "8px 10px",
  fontSize: "13px",
  fontFamily: FONT_BODY,
  color: COLORS.ink,
};
