"use client";

import { useEffect, useState } from "react";

type Building = {
  id: number;
  name: string;
  address: string;
  city: string;
  building_type: string;
  area_sqm: number;
  notes: string;
  created_at: string;
};

type PortfolioOverview = {
  buildings_count: number;
  total_area_sqm: number;
  systems_count: number;
  energy: {
    readings_count: number;
    total_consumption_kwh: number;
    total_cost_eur: number;
  };
  maintenance: {
    maintenance_count: number;
    completed_count: number;
    maintenance_cost_eur: number;
  };
};

const emptyForm = {
  name: "",
  address: "",
  city: "",
  building_type: "Edificio direzionale",
  area_sqm: "",
  notes: "",
};

const navigation = [
  "Panoramica",
  "Edifici",
  "Energia",
  "Impianti",
  "Simulazioni",
  "Report",
];

export default function Home() {
  const [active, setActive] = useState("Panoramica");
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioOverview | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadPortfolio() {
    const response = await fetch("/api/portfolio/overview");
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Errore nel caricamento della panoramica");
    }

    setPortfolio(data);
  }

  async function loadBuildings() {
    try {
      const response = await fetch("/api/buildings");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Errore nel caricamento");
      setBuildings(data);
      await loadPortfolio();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore di connessione");
    }
  }

  useEffect(() => {
    loadBuildings();
  }, []);

  function openNewForm() {
    setForm(emptyForm);
    setEditingId(null);
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function openEditForm(building: Building) {
    setForm({
      name: building.name,
      address: building.address,
      city: building.city,
      building_type: building.building_type,
      area_sqm: String(building.area_sqm),
      notes: building.notes || "",
    });
    setEditingId(building.id);
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  async function saveBuilding(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const payload = {
      ...form,
      area_sqm: Number(form.area_sqm),
    };

    try {
      const response = await fetch(
        editingId ? `/api/buildings/${editingId}` : "/api/buildings",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || data.error || "Impossibile salvare l'edificio");
      }

      await loadBuildings();
      setShowForm(false);
      setForm(emptyForm);
      setEditingId(null);
      setSuccess(editingId ? "Edificio aggiornato correttamente." : "Edificio registrato correttamente.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore durante il salvataggio");
    } finally {
      setLoading(false);
    }
  }

  async function deleteBuilding(id: number) {
    if (!window.confirm("Vuoi eliminare definitivamente questo edificio?")) return;

    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/buildings/${id}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.detail || "Errore durante l'eliminazione");

      await loadBuildings();
      setSuccess("Edificio eliminato correttamente.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore durante l'eliminazione");
    }
  }

  const inputClass =
    "mt-2 w-full rounded-xl border border-white/10 bg-[#0b1625] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400";

  return (
    <main className="min-h-screen bg-[#080f1b] text-slate-100 md:flex">
      <aside className="flex w-full flex-col border-b border-white/10 bg-[#0c1726] p-5 md:min-h-screen md:w-64 md:border-b-0 md:border-r">
        <div className="mb-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-400 font-black text-slate-950">
            AI
          </div>
          <div>
            <div className="font-bold tracking-wide">AISERVICEGROUP</div>
            <div className="text-xs tracking-widest text-cyan-400">BUILDING INTELLIGENCE</div>
          </div>
        </div>

        <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
          Workspace
        </div>

        <nav className="grid grid-cols-2 gap-2 md:grid-cols-1">
          {navigation.map((item) => (
            <button
              key={item}
              onClick={() => setActive(item)}
              className={`rounded-lg px-4 py-3 text-left text-sm transition ${
                active === item
                  ? "bg-cyan-400/10 font-semibold text-cyan-300 ring-1 ring-cyan-400/20"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              {item}
            </button>
          ))}
        </nav>

        <div className="mt-auto hidden rounded-xl border border-white/10 bg-white/[0.03] p-4 md:block">
          <div className="text-xs text-slate-500">SYSTEM STATUS</div>
          <div className="mt-2 flex items-center gap-2 text-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Backend collegato
          </div>
          <div className="mt-2 text-xs text-slate-500">Versione 0.2.0</div>
        </div>
      </aside>

      <section className="min-w-0 flex-1 p-5 md:p-9">
        <header className="mb-9 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-sm text-slate-500">AISG / Workspace / {active}</div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">{active}</h1>
            <p className="mt-2 text-sm text-slate-400">
              Centro di controllo intelligente degli edifici
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#101e30] px-4 py-3">
            <div className="text-xs text-slate-500">AMBIENTE</div>
            <div className="mt-1 flex items-center gap-2 text-sm font-medium">
              <span className="h-2 w-2 rounded-full bg-cyan-400" />
              DEMO
            </div>
          </div>
        </header>

        {error && (
          <div role="alert" className="mb-5 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {success && (
          <div role="status" className="mb-5 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-300">
            {success}
          </div>
        )}

        {active === "Edifici" ? (
          <>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Registro immobiliare</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Gestione centralizzata delle strutture registrate
                </p>
              </div>
              <button
                onClick={openNewForm}
                className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-300"
              >
                + Nuovo edificio
              </button>
            </div>

            <div className="mb-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-[#101e30] p-5">
                <div className="text-sm text-slate-400">Edifici registrati</div>
                <div className="mt-3 text-3xl font-bold">{buildings.length}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#101e30] p-5">
                <div className="text-sm text-slate-400">Superficie complessiva</div>
                <div className="mt-3 text-3xl font-bold">
                  {buildings.reduce((sum, b) => sum + b.area_sqm, 0).toLocaleString("it-IT")} <span className="text-sm font-normal text-slate-400">m²</span>
                </div>
              </div>
            </div>

            {showForm && (
              <form
                onSubmit={saveBuilding}
                className="mb-7 rounded-2xl border border-cyan-400/20 bg-[#101e30] p-6"
              >
                <div className="mb-6 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold">
                      {editingId ? "Modifica edificio" : "Registra nuovo edificio"}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">Compila i dati identificativi della struttura</p>
                  </div>
                  <button type="button" onClick={() => setShowForm(false)} className="text-sm text-slate-400 hover:text-white">
                    Chiudi
                  </button>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <label className="text-sm text-slate-300">
                    Nome edificio *
                    <input className={inputClass} required minLength={2} maxLength={120} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Es. AISG Headquarters" />
                  </label>

                  <label className="text-sm text-slate-300">
                    Tipologia *
                    <select className={inputClass} value={form.building_type} onChange={(e) => setForm({ ...form, building_type: e.target.value })}>
                      <option>Edificio direzionale</option>
                      <option>Residenziale</option>
                      <option>Commerciale</option>
                      <option>Industriale</option>
                      <option>Ricettivo</option>
                      <option>Sanitario</option>
                      <option>Scolastico</option>
                      <option>Altro</option>
                    </select>
                  </label>

                  <label className="text-sm text-slate-300">
                    Indirizzo *
                    <input className={inputClass} required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Via, numero civico" />
                  </label>

                  <label className="text-sm text-slate-300">
                    Città *
                    <input className={inputClass} required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Es. Catania" />
                  </label>

                  <label className="text-sm text-slate-300">
                    Superficie (m²) *
                    <input className={inputClass} required type="number" min="0.1" step="0.1" value={form.area_sqm} onChange={(e) => setForm({ ...form, area_sqm: e.target.value })} placeholder="Es. 2500" />
                  </label>

                  <label className="text-sm text-slate-300 md:col-span-2">
                    Note
                    <textarea className={inputClass} rows={3} maxLength={2000} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Informazioni aggiuntive sulla struttura..." />
                  </label>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button disabled={loading} className="rounded-xl bg-cyan-400 px-6 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-300 disabled:opacity-50">
                    {loading ? "Salvataggio..." : editingId ? "Salva modifiche" : "Registra edificio"}
                  </button>
                  <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-white/10 px-6 py-3 text-sm text-slate-300 hover:bg-white/5">
                    Annulla
                  </button>
                </div>
              </form>
            )}

            {buildings.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/15 bg-[#101e30]/50 p-12 text-center">
                <div className="text-3xl">⌂</div>
                <h3 className="mt-4 text-lg font-semibold">Nessun edificio registrato</h3>
                <p className="mt-2 text-sm text-slate-500">
                  Inizia creando la prima scheda immobiliare.
                </p>
                <button onClick={openNewForm} className="mt-5 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950">
                  Registra il primo edificio
                </button>
              </div>
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                {buildings.map((building) => (
                  <article key={building.id} className="rounded-2xl border border-white/10 bg-[#101e30] p-6">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-widest text-cyan-300">
                          AISG / BUILDING {String(building.id).padStart(3, "0")}
                        </div>
                        <h3 className="mt-3 text-lg font-semibold">{building.name}</h3>
                        <p className="mt-1 text-sm text-slate-400">{building.building_type}</p>
                      </div>
                      <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300">
                        Registrato
                      </span>
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-4 border-y border-white/10 py-5">
                      <div>
                        <div className="text-xs text-slate-500">LOCALIZZAZIONE</div>
                        <div className="mt-2 text-sm">{building.city}</div>
                        <div className="mt-1 text-xs text-slate-400">{building.address}</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500">SUPERFICIE</div>
                        <div className="mt-2 text-xl font-semibold">{building.area_sqm.toLocaleString("it-IT")} m²</div>
                      </div>
                    </div>

                    {building.notes && (
                      <p className="mt-4 text-sm leading-6 text-slate-400">{building.notes}</p>
                    )}

                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        onClick={() => window.location.href = `/buildings/${building.id}`}
                        className="rounded-lg border border-cyan-400/30 px-4 py-2 text-sm text-cyan-300 hover:bg-cyan-400/10"
                      >
                        Scheda tecnica →
                      </button>
                      <button onClick={() => openEditForm(building)} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300 hover:border-cyan-400/40 hover:text-cyan-300">
                        Modifica
                      </button>
                      <button onClick={() => deleteBuilding(building.id)} className="rounded-lg border border-red-400/20 px-4 py-2 text-sm text-red-300 hover:bg-red-400/10">
                        Elimina
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        ) : active === "Panoramica" ? (
          <>
            <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  label: "Edifici registrati",
                  value: portfolio?.buildings_count.toLocaleString("it-IT") ?? "—",
                  detail: "Edifici nel portafoglio"
                },
                {
                  label: "Superficie gestita",
                  value: portfolio ? `${portfolio.total_area_sqm.toLocaleString("it-IT")} m²` : "—",
                  detail: "Superficie complessiva registrata"
                },
                {
                  label: "Impianti configurati",
                  value: portfolio?.systems_count.toLocaleString("it-IT") ?? "—",
                  detail: "Asset tecnici registrati"
                },
                {
                  label: "Consumi energetici",
                  value: portfolio ? `${portfolio.energy.total_consumption_kwh.toLocaleString("it-IT")} kWh` : "—",
                  detail: `${portfolio?.energy.readings_count ?? 0} letture registrate`
                },
              ].map(({ label, value, detail }) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-[#101e30] p-5">
                  <div className="text-sm text-slate-400">{label}</div>
                  <div className="mt-4 text-3xl font-bold tracking-tight">{value}</div>
                  <div className="mt-2 text-xs text-slate-500">{detail}</div>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#101e30] p-6">
              <h2 className="text-lg font-semibold">Portfolio immobiliare</h2>
              <p className="mt-2 text-sm text-slate-400">
                Gli edifici registrati nel database sono disponibili nel modulo Edifici.
              </p>
              <button onClick={() => setActive("Edifici")} className="mt-5 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950">
                Apri gestione edifici
              </button>
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-[#101e30] p-8">
            <div className="text-sm text-cyan-300">AISG INTELLIGENCE</div>
            <h2 className="mt-3 text-2xl font-semibold">{active}</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">
              Modulo predisposto per lo sviluppo. Le funzionalità saranno integrate progressivamente.
            </p>
          </div>
        )}

        <footer className="mt-10 border-t border-white/10 pt-5 text-xs text-slate-600">
          AISERVICEGROUP · AISG BUILDING INTELLIGENCE · VERSION 0.2.0
          <span className="float-right">BUILDING MANAGEMENT</span>
        </footer>
      </section>
    </main>
  );
}
