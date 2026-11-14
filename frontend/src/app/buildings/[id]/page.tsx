
"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Building = {
  id: number;
  name: string;
  address?: string;
  city?: string;
  building_type?: string;
  area_sqm?: number;
  notes?: string;
  cadastral_reference?: string;
  construction_year?: number;
  floors?: number;
  energy_class?: string;
  occupancy_type?: string;
};

type Zone = {
  id: number;
  name: string;
  zone_type?: string;
  area_sqm?: number;
  floor_number?: number;
  notes?: string;
};

type EnergyReading = {
  id: number;
  energy_type: string;
  period_start: string;
  period_end: string;
  consumption_kwh: number;
  cost_eur: number;
  source: string;
  notes?: string;
};

type EnergyAnalysis = {
  building_id: number;
  readings_count: number;
  total_consumption_kwh: number;
  total_cost_eur: number;
  average_cost_per_kwh: number;
  breakdown: {
    energy_type: string;
    readings_count: number;
    consumption_kwh: number;
    cost_eur: number;
    average_cost_per_kwh: number;
  }[];
};


type EnergyTrend = {
  month: string;
  electricity_kwh: number;
  gas_kwh: number;
  other_kwh: number;
  total_consumption_kwh: number;
  total_cost_eur: number;
  has_estimated_allocation: boolean;
};

type System = {
  id: number;
  name: string;
  category?: string;
  manufacturer?: string;
  model?: string;
  installation_year?: number;
  zone_id?: number | null;
  notes?: string;
};


type Maintenance = {
  id: number;
  system_id: number;
  maintenance_date: string;
  maintenance_type: string;
  description: string;
  technician: string;
  cost_eur: number;
  next_maintenance_date: string | null;
  status: string;
};


type Device = {
  id: number;
  name: string;
  external_id: string;
  device_type: string;
  manufacturer?: string;
  model?: string;
  protocol?: string;
  last_seen_at?: string | null;
  connection_status: "online" | "offline" | "never_connected";
};

type TelemetryReading = {
  id: number;
  device_id: number;
  metric: string;
  value: number;
  unit: string;
  measured_at: string;
  received_at: string;
  quality: string;
  source: string;
};

const inputClass =
  "w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400";

const buttonClass =
  "rounded-xl border border-cyan-400/30 px-4 py-2 text-sm text-cyan-300 hover:bg-cyan-400/10 disabled:opacity-50";

function BuildingDetailContent() {
  const params = useParams();
  const id = String(params.id);

  const [building, setBuilding] = useState<Building | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [systems, setSystems] = useState<System[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<Record<number, Maintenance[]>>({});
  const [maintenanceSystemId, setMaintenanceSystemId] = useState<number | null>(null);
  const [maintenanceForm, setMaintenanceForm] = useState({
    maintenance_date: new Date().toISOString().slice(0, 10),
    maintenance_type: "Ordinaria",
    description: "",
    technician: "",
    cost_eur: "0",
    next_maintenance_date: "",
    status: "completata",
  });
  const [energyReadings, setEnergyReadings] = useState<EnergyReading[]>([]);
  const [energyAnalysis, setEnergyAnalysis] =
    useState<EnergyAnalysis | null>(null);
  const [energyTrends, setEnergyTrends] = useState<EnergyTrend[]>([]);

  const [devices, setDevices] = useState<Device[]>([]);
  const [telemetry, setTelemetry] = useState<Record<number, TelemetryReading[]>>({});

  const [deviceForm, setDeviceForm] = useState({
    name: "",
    external_id: "",
    device_type: "Sensore",
    manufacturer: "",
    model: "",
    protocol: "",
    system_id: "",
    zone_id: "",
  });


  const [energyForm, setEnergyForm] = useState({
    energy_type: "elettricita",
    period_start: "",
    period_end: "",
    consumption_kwh: "",
    cost_eur: "",
    source: "manuale",
    notes: "",
  });
  const [activeTab, setActiveTab] = useState("Anagrafica");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [zoneForm, setZoneForm] = useState({
    name: "",
    zone_type: "Ufficio",
    area_sqm: "",
    floor_number: "",
    notes: "",
  });

  const [systemForm, setSystemForm] = useState({
    name: "",
    category: "Climatizzazione",
    manufacturer: "",
    model: "",
    installation_year: "",
    zone_id: "",
    notes: "",
  });

  async function request(url: string, options?: RequestInit) {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.detail || "Operazione non riuscita");
    }

    return data;
  }

  async function loadData() {
    setLoading(true);
    setError("");

    try {
     
const [
        buildingData,
        zoneData,
        systemData,
        energyData,
        deviceData,
        energyAnalysisData,
        energyTrendsData,
      ] = await Promise.all([
        request(`/api/buildings/${id}`),
        request(`/api/buildings/${id}/zones`),
        request(`/api/buildings/${id}/systems`),
        request(`/api/buildings/${id}/energy-readings`),
        request(`/api/buildings/${id}/devices`),
        request(`/api/buildings/${id}/energy-analysis`),
        request(`/api/buildings/${id}/energy-trends`),
      ]);

      setBuilding(buildingData);
      setZones(zoneData);
      setSystems(systemData);
      const maintenanceData = await Promise.all(
        systemData.map(async (system: System) => {
          const records = await request(
            `/api/buildings/${id}/systems/${system.id}/maintenance`
          );
          return [system.id, records] as const;
        })
      );
      setMaintenanceRecords(Object.fromEntries(maintenanceData));
      setEnergyReadings(energyData);
      setDevices(deviceData);
      setEnergyAnalysis(energyAnalysisData);
      setEnergyTrends(energyTrendsData.trends ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore di caricamento");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [id]);
  

  async function createDevice(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      await request(`/api/buildings/${id}/devices`, {
        method: "POST",
        body: JSON.stringify({
          ...deviceForm,
          system_id: deviceForm.system_id
            ? Number(deviceForm.system_id)
            : null,
          zone_id: deviceForm.zone_id
            ? Number(deviceForm.zone_id)
            : null,
        }),
      });

      setDeviceForm({
        name: "",
        external_id: "",
        device_type: "Sensore",
        manufacturer: "",
        model: "",
        protocol: "",
        system_id: "",
        zone_id: "",
      });

      await loadData();
      setMessage("Dispositivo registrato correttamente.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Errore nella registrazione"
      );
    } finally {
      setSaving(false);
    }
  }


  async function createMaintenance(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (maintenanceSystemId === null) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      await request(
        `/api/buildings/${id}/systems/${maintenanceSystemId}/maintenance`,
        {
          method: "POST",
          body: JSON.stringify({
            ...maintenanceForm,
            cost_eur: Number(maintenanceForm.cost_eur),
            next_maintenance_date: maintenanceForm.next_maintenance_date || null,
          }),
        }
      );

      await loadSystemMaintenance(maintenanceSystemId);
      setMaintenanceSystemId(null);
      setMaintenanceForm({
        maintenance_date: new Date().toISOString().slice(0, 10),
        maintenance_type: "Ordinaria",
        description: "",
        technician: "",
        cost_eur: "0",
        next_maintenance_date: "",
        status: "completata",
      });
      setMessage("Manutenzione registrata correttamente.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Errore nella registrazione della manutenzione"
      );
    } finally {
      setSaving(false);
    }
  }

  async function loadSystemMaintenance(systemId: number) {
    try {
      const records = await request(
        `/api/buildings/${id}/systems/${systemId}/maintenance`
      );

      setMaintenanceRecords((prev) => ({
        ...prev,
        [systemId]: records,
      }));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Errore nel caricamento delle manutenzioni"
      );
    }
  }

  async function loadDeviceTelemetry(deviceId: number) {
    try {
      const readings = await request(
        `/api/devices/${deviceId}/telemetry?limit=20`
      );

      setTelemetry((prev) => ({
        ...prev,
        [deviceId]: readings,
      }));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Errore nel caricamento della telemetria"
      );
    }
  }

  async function saveBuilding(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!building) return;

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const updated = await request(`/api/buildings/${id}`, {
        method: "PUT",
        body: JSON.stringify(building),
      });

      setBuilding(updated);
      setMessage("Anagrafica aggiornata correttamente.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore durante il salvataggio");
    } finally {
      setSaving(false);
    }
  }

  async function createZone(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      await request(`/api/buildings/${id}/zones`, {
        method: "POST",
        body: JSON.stringify({
          ...zoneForm,
          area_sqm: zoneForm.area_sqm ? Number(zoneForm.area_sqm) : null,
          floor_number: zoneForm.floor_number
            ? Number(zoneForm.floor_number)
            : null,
        }),
      });

      setZoneForm({
        name: "",
        zone_type: "Ufficio",
        area_sqm: "",
        floor_number: "",
        notes: "",
      });

      setMessage("Zona aggiunta correttamente.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore durante la creazione della zona");
    } finally {
      setSaving(false);
    }
  }

  async function deleteZone(zoneId: number) {
    if (!window.confirm("Vuoi eliminare questa zona?")) return;

    try {
      await request(`/api/buildings/${id}/zones/${zoneId}`, {
        method: "DELETE",
      });
      setMessage("Zona eliminata.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore durante l'eliminazione");
    }
  }

  async function createSystem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      await request(`/api/buildings/${id}/systems`, {
        method: "POST",
        body: JSON.stringify({
          ...systemForm,
          installation_year: systemForm.installation_year
            ? Number(systemForm.installation_year)
            : null,
          zone_id: systemForm.zone_id ? Number(systemForm.zone_id) : null,
        }),
      });

      setSystemForm({
        name: "",
        category: "Climatizzazione",
        manufacturer: "",
        model: "",
        installation_year: "",
        zone_id: "",
        notes: "",
      });

      setMessage("Impianto aggiunto correttamente.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore durante la creazione dell'impianto");
    } finally {
      setSaving(false);
    }
  }

  async function deleteSystem(systemId: number) {
    if (!window.confirm("Vuoi eliminare questo impianto?")) return;

    try {
      await request(`/api/buildings/${id}/systems/${systemId}`, {
        method: "DELETE",
      });
      setMessage("Impianto eliminato.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore durante l'eliminazione");
    }
  }


  async function createEnergyReading(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      await request(`/api/buildings/${id}/energy-readings`, {
        method: "POST",
        body: JSON.stringify({
          ...energyForm,
          consumption_kwh: Number(energyForm.consumption_kwh),
          cost_eur: energyForm.cost_eur ? Number(energyForm.cost_eur) : 0,
        }),
      });

      setEnergyForm({
        energy_type: "elettricita",
        period_start: "",
        period_end: "",
        consumption_kwh: "",
        cost_eur: "",
        source: "manuale",
        notes: "",
      });

      setMessage("Registrazione energetica salvata correttamente.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore nel salvataggio energetico");
    } finally {
      setSaving(false);
    }
  }

  async function deleteEnergyReading(readingId: number) {
    if (!window.confirm("Vuoi eliminare questa registrazione energetica?")) return;

    try {
      await request(`/api/buildings/${id}/energy-readings/${readingId}`, {
        method: "DELETE",
      });
      setMessage("Registrazione energetica eliminata.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore durante l'eliminazione");
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#07111f] p-8 text-white">
        Caricamento scheda tecnica...
      </main>
    );
  }

  if (error && !building) {
    return (
      <main className="min-h-screen bg-[#07111f] p-8 text-white">
        <a href="/" className="text-cyan-300">← Torna alla dashboard</a>
        <p className="mt-8 text-red-300">{error}</p>
        <button onClick={loadData} className={buttonClass + " mt-4"}>
          Riprova
        </button>
      </main>
    );
  }

  if (!building) return null;

  const totalConsumption = energyReadings.reduce(
    (sum, reading) => sum + reading.consumption_kwh, 0
  );
  const totalCost = energyReadings.reduce(
    (sum, reading) => sum + reading.cost_eur, 0
  );
  const electricityConsumption = energyReadings
    .filter((reading) => reading.energy_type === "elettricita")
    .reduce((sum, reading) => sum + reading.consumption_kwh, 0);
  const gasConsumption = energyReadings
    .filter((reading) => reading.energy_type === "gas")
    .reduce((sum, reading) => sum + reading.consumption_kwh, 0);
  const maxConsumption = Math.max(
    1,
    ...energyReadings.map((reading) => reading.consumption_kwh)
  );

  const tabs = ["Anagrafica", "Zone", "Impianti", "Energia", "Dispositivi"];
  return (
    <main className="min-h-screen bg-[#07111f] px-5 py-8 text-white md:px-10">
      <div className="mx-auto max-w-6xl">
        <a href="/" className="text-sm text-cyan-300 hover:text-cyan-200">
          ← Dashboard
        </a>

        <div className="mt-7 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-400">
              AISG Building Intelligence
            </p>
            <h1 className="mt-3 text-3xl font-bold">{building.name}</h1>
            <p className="mt-2 text-slate-400">
              {building.address || "Indirizzo non specificato"}
              {building.city ? ` · ${building.city}` : ""}
            </p>
          </div>

          <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-xs text-cyan-300">
            Scheda tecnica edificio
          </span>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm text-slate-400">Superficie</p>
            <p className="mt-2 text-2xl font-semibold">
              {building.area_sqm ?? "—"}
              {building.area_sqm ? " m²" : ""}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm text-slate-400">Zone censite</p>
            <p className="mt-2 text-2xl font-semibold">{zones.length}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm text-slate-400">Impianti censiti</p>
            <p className="mt-2 text-2xl font-semibold">{systems.length}</p>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-2 border-b border-white/10 pb-4">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-xl px-5 py-3 text-sm ${
                activeTab === tab
                  ? "bg-cyan-400/15 text-cyan-300"
                  : "text-slate-400 hover:bg-white/5"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {message && (
          <p className="mt-5 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-300">
            {message}
          </p>
        )}

        {error && (
          <p className="mt-5 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300">
            {error}
          </p>
        )}

        {activeTab === "Anagrafica" && (
          <form
            onSubmit={saveBuilding}
            className="mt-6 grid gap-5 rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:grid-cols-2"
          >
            <h2 className="text-xl font-semibold md:col-span-2">
              Dati generali dell'edificio
            </h2>

            {(
              [
                ["name", "Nome edificio"],
                ["address", "Indirizzo"],
                ["city", "Città"],
                ["building_type", "Tipologia edificio"],
                ["area_sqm", "Superficie (m²)"],
                ["cadastral_reference", "Riferimento catastale"],
                ["construction_year", "Anno di costruzione"],
                ["floors", "Numero piani"],
                ["energy_class", "Classe energetica"],
                ["occupancy_type", "Destinazione d'uso"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="text-sm text-slate-400">
                {label}
                <input
                  className={inputClass + " mt-2"}
                  value={building[key] ?? ""}
                  onChange={(event) =>
                    setBuilding({
                      ...building,
                      [key]:
                        key === "area_sqm" ||
                        key === "construction_year" ||
                        key === "floors"
                          ? event.target.value === ""
                            ? undefined
                            : Number(event.target.value)
                          : event.target.value,
                    })
                  }
                />
              </label>
            ))}

            <label className="text-sm text-slate-400 md:col-span-2">
              Note
              <textarea
                className={inputClass + " mt-2"}
                rows={4}
                value={building.notes ?? ""}
                onChange={(event) =>
                  setBuilding({ ...building, notes: event.target.value })
                }
              />
            </label>

            <div className="md:col-span-2">
              <button disabled={saving} className={buttonClass}>
                {saving ? "Salvataggio..." : "Salva anagrafica"}
              </button>
            </div>
          </form>
        )}

        {activeTab === "Zone" && (
          <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.3fr]">
            <form
              onSubmit={createZone}
              className="h-fit rounded-2xl border border-white/10 bg-white/[0.03] p-6"
            >
              <h2 className="text-xl font-semibold">Nuova zona</h2>
              <div className="mt-5 space-y-4">
                <input
                  required
                  placeholder="Nome zona"
                  className={inputClass}
                  value={zoneForm.name}
                  onChange={(e) =>
                    setZoneForm({ ...zoneForm, name: e.target.value })
                  }
                />
                <select
                  className={inputClass}
                  value={zoneForm.zone_type}
                  onChange={(e) =>
                    setZoneForm({ ...zoneForm, zone_type: e.target.value })
                  }
                >
                  {["Ufficio", "Area comune", "Tecnica", "Commerciale", "Altro"].map(
                    (v) => <option key={v}>{v}</option>
                  )}
                </select>
                <input
                  type="number"
                  min="0"
                  placeholder="Superficie m²"
                  className={inputClass}
                  value={zoneForm.area_sqm}
                  onChange={(e) =>
                    setZoneForm({ ...zoneForm, area_sqm: e.target.value })
                  }
                />
                <input
                  type="number"
                  placeholder="Piano"
                  className={inputClass}
                  value={zoneForm.floor_number}
                  onChange={(e) =>
                    setZoneForm({ ...zoneForm, floor_number: e.target.value })
                  }
                />
                <textarea
                  placeholder="Note"
                  className={inputClass}
                  value={zoneForm.notes}
                  onChange={(e) =>
                    setZoneForm({ ...zoneForm, notes: e.target.value })
                  }
                />
                <button disabled={saving} className={buttonClass}>
                  Aggiungi zona
                </button>
              </div>
            </form>

            <div className="space-y-3">
              <h2 className="text-xl font-semibold">Zone registrate</h2>
              {zones.length === 0 && (
                <p className="rounded-xl border border-white/10 p-5 text-slate-400">
                  Nessuna zona registrata.
                </p>
              )}
              {zones.map((zone) => (
                <div
                  key={zone.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
                >
                  <div className="flex justify-between gap-4">
                    <div>
                      <h3 className="font-semibold">{zone.name}</h3>
                      <p className="mt-1 text-sm text-slate-400">
                        {zone.zone_type || "Zona"} · {zone.area_sqm ?? "—"} m²
                        {zone.floor_number != null ? ` · Piano ${zone.floor_number}` : ""}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteZone(zone.id)}
                      className="text-sm text-red-300"
                    >
                      Elimina
                    </button>
                  </div>
                  {zone.notes && (
                    <p className="mt-3 text-sm text-slate-400">{zone.notes}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === "Impianti" && (
          <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.3fr]">
            <form
              onSubmit={createSystem}
              className="h-fit rounded-2xl border border-white/10 bg-white/[0.03] p-6"
            >
              <h2 className="text-xl font-semibold">Nuovo impianto</h2>
              <div className="mt-5 space-y-4">
                <input
                  required
                  placeholder="Nome impianto"
                  className={inputClass}
                  value={systemForm.name}
                  onChange={(e) =>
                    setSystemForm({ ...systemForm, name: e.target.value })
                  }
                />
                <select
                  className={inputClass}
                  value={systemForm.category}
                  onChange={(e) =>
                    setSystemForm({ ...systemForm, category: e.target.value })
                  }
                >
                  {["Climatizzazione", "Elettrico", "Idrico", "Antincendio", "Illuminazione", "Altro"].map(
                    (v) => <option key={v}>{v}</option>
                  )}
                </select>
                <input
                  placeholder="Produttore"
                  className={inputClass}
                  value={systemForm.manufacturer}
                  onChange={(e) =>
                    setSystemForm({ ...systemForm, manufacturer: e.target.value })
                  }
                />
                <input
                  placeholder="Modello"
                  className={inputClass}
                  value={systemForm.model}
                  onChange={(e) =>
                    setSystemForm({ ...systemForm, model: e.target.value })
                  }
                />
                <input
                  type="number"
                  placeholder="Anno installazione"
                  className={inputClass}
                  value={systemForm.installation_year}
                  onChange={(e) =>
                    setSystemForm({
                      ...systemForm,
                      installation_year: e.target.value,
                    })
                  }
                />
                <select
                  className={inputClass}
                  value={systemForm.zone_id}
                  onChange={(e) =>
                    setSystemForm({ ...systemForm, zone_id: e.target.value })
                  }
                >
                  <option value="">Nessuna zona assegnata</option>
                  {zones.map((zone) => (
                    <option key={zone.id} value={zone.id}>
                      {zone.name}
                    </option>
                  ))}
                </select>
                <textarea
                  placeholder="Note"
                  className={inputClass}
                  value={systemForm.notes}
                  onChange={(e) =>
                    setSystemForm({ ...systemForm, notes: e.target.value })
                  }
                />
                <button disabled={saving} className={buttonClass}>
                  Aggiungi impianto
                </button>
              </div>
            </form>

            <div className="space-y-3">
              <h2 className="text-xl font-semibold">Impianti registrati</h2>
              {systems.length === 0 && (
                <p className="rounded-xl border border-white/10 p-5 text-slate-400">
                  Nessun impianto registrato.
                </p>
              )}
              {systems.map((system) => {
                const zone = zones.find((z) => z.id === system.zone_id);
                return (
                  <div
                    key={system.id}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
                  >
                    <div className="flex justify-between gap-4">
                      <div>
                        <h3 className="font-semibold">{system.name}</h3>
                        <p className="mt-1 text-sm text-cyan-300">
                          {system.category || "Impianto"}
                        </p>
                      </div>
                      <button
                        onClick={() => deleteSystem(system.id)}
                        className="text-sm text-red-300"
                      >
                        Elimina
                      </button>
                    </div>
                    <div className="mt-3 space-y-1 text-sm text-slate-400">
                      {system.manufacturer && <p>Produttore: {system.manufacturer}</p>}
                      {system.model && <p>Modello: {system.model}</p>}
                      {system.installation_year && <p>Installazione: {system.installation_year}</p>}
                      <p>Zona: {zone?.name || "Non assegnata"}</p>
                      {system.notes && <p>{system.notes}</p>}
                    </div>

                    <div className="mt-5 border-t border-white/10 pt-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h4 className="font-semibold text-white">Storico manutenzioni</h4>
                        <button
                          type="button"
                          onClick={() =>
                            setMaintenanceSystemId(
                              maintenanceSystemId === system.id ? null : system.id
                            )
                          }
                          className={buttonClass}
                        >
                          {maintenanceSystemId === system.id
                            ? "Chiudi modulo"
                            : "Registra intervento"}
                        </button>
                      </div>

                      {(maintenanceRecords[system.id] ?? []).length === 0 ? (
                        <p className="mt-3 text-sm text-slate-500">
                          Nessun intervento registrato.
                        </p>
                      ) : (
                        <div className="mt-3 space-y-3">
                          {(maintenanceRecords[system.id] ?? []).map((record) => (
                            <div
                              key={record.id}
                              className="rounded-xl border border-white/10 bg-slate-950/40 p-4"
                            >
                              <div className="flex flex-wrap justify-between gap-2">
                                <span className="font-medium text-cyan-300">
                                  {record.maintenance_type}
                                </span>
                                <span className="text-sm text-slate-400">
                                  {new Date(record.maintenance_date).toLocaleDateString("it-IT")}
                                </span>
                              </div>
                              <p className="mt-2 text-sm text-slate-300">
                                {record.description}
                              </p>
                              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                                {record.technician && <span>Tecnico: {record.technician}</span>}
                                <span>Costo: € {record.cost_eur.toLocaleString("it-IT", { minimumFractionDigits: 2 })}</span>
                                <span>Stato: {record.status}</span>
                                {record.next_maintenance_date && (
                                  <span>
                                    Prossima manutenzione: {new Date(record.next_maintenance_date).toLocaleDateString("it-IT")}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {maintenanceSystemId === system.id && (
                        <form onSubmit={createMaintenance} className="mt-4 space-y-3 rounded-xl border border-cyan-400/20 bg-slate-950/40 p-4">
                          <h5 className="font-medium text-white">Nuovo intervento</h5>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <input
                              type="date"
                              required
                              className={inputClass}
                              value={maintenanceForm.maintenance_date}
                              onChange={(e) => setMaintenanceForm({ ...maintenanceForm, maintenance_date: e.target.value })}
                            />
                            <select
                              className={inputClass + " appearance-none relative z-10"}
                              value={maintenanceForm.maintenance_type}
                              onChange={(e) => setMaintenanceForm({ ...maintenanceForm, maintenance_type: e.target.value })}
                            >
                              <option value="Ordinaria">Ordinaria</option>
                              <option value="Straordinaria">Straordinaria</option>
                              <option value="Guasto">Guasto</option>
                              <option value="Ispezione">Ispezione</option>
                            </select>
                            <input
                              className={inputClass}
                              placeholder="Tecnico / Ditta"
                              value={maintenanceForm.technician}
                              onChange={(e) => setMaintenanceForm({ ...maintenanceForm, technician: e.target.value })}
                            />
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              className={inputClass}
                              placeholder="Costo (€)"
                              value={maintenanceForm.cost_eur}
                              onChange={(e) => setMaintenanceForm({ ...maintenanceForm, cost_eur: e.target.value })}
                            />
                            <label className="text-xs text-slate-400">
                              Prossima manutenzione
                              <input
                                type="date"
                                className={inputClass + " mt-1"}
                                value={maintenanceForm.next_maintenance_date}
                                onChange={(e) => setMaintenanceForm({ ...maintenanceForm, next_maintenance_date: e.target.value })}
                              />
                            </label>
                            <select
                              className={inputClass}
                              value={maintenanceForm.status}
                              onChange={(e) => setMaintenanceForm({ ...maintenanceForm, status: e.target.value })}
                            >
                              <option value="completata">Completata</option>
                              <option value="programmata">Programmata</option>
                              <option value="annullata">Annullata</option>
                            </select>
                          </div>
                          <textarea
                            required
                            minLength={2}
                            maxLength={2000}
                            className={inputClass}
                            placeholder="Descrizione dell'intervento"
                            value={maintenanceForm.description}
                            onChange={(e) => setMaintenanceForm({ ...maintenanceForm, description: e.target.value })}
                          />
                          <button disabled={saving} className={buttonClass}>
                            Salva intervento
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {activeTab === "Energia" && (
          <section className="mt-6 space-y-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-cyan-400">
                Energy Management
              </p>
              <h2 className="mt-2 text-2xl font-bold">Monitoraggio energetico</h2>
              <p className="mt-2 text-sm text-slate-400">
                Consumi e costi basati sulle registrazioni disponibili.
              </p>
            </div>

            <div className="rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-cyan-400/[0.08] to-white/[0.02] p-6 space-y-6">

  <div>
    <p className="text-xs font-semibold uppercase tracking-widest text-cyan-400">
      AISG Intelligence Engine
    </p>
    <h3 className="mt-2 text-xl font-semibold text-white">
      Economic Intelligence
    </h3>
    <p className="mt-2 text-sm text-slate-400">
      Analisi economica delle prestazioni energetiche dell'edificio.
    </p>
  </div>

  {energyAnalysis && (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-slate-950/50 p-5">
          <p className="text-sm text-slate-400">Costo medio energetico</p>
          <p className="mt-3 text-3xl font-semibold text-cyan-300">
            € {energyAnalysis.average_cost_per_kwh.toLocaleString("it-IT", {
              minimumFractionDigits: 4,
              maximumFractionDigits: 4
            })}
          </p>
          <p className="mt-2 text-xs text-slate-500">Per kWh registrato</p>
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-950/50 p-5">
          <p className="text-sm text-slate-400">Registrazioni analizzate</p>
          <p className="mt-3 text-3xl font-semibold text-white">
            {energyAnalysis.readings_count}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Dati energetici disponibili
          </p>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-white mb-4">
          Economic breakdown
        </h4>

        {energyAnalysis.breakdown.length === 0 ? (
          <p className="text-sm text-slate-400">
            Nessun dato energetico disponibile.
          </p>
        ) : (
          <div className="space-y-5">
            {energyAnalysis.breakdown.map((item) => {
              const share = energyAnalysis.total_consumption_kwh > 0
                ? item.consumption_kwh / energyAnalysis.total_consumption_kwh * 100
                : 0;

              return (
                <div key={item.energy_type}>
                  <div className="flex justify-between gap-4 text-sm">
                    <span className="text-white capitalize">
                      {item.energy_type}
                    </span>
                    <span className="text-slate-300">
                      {share.toLocaleString("it-IT", {
                        maximumFractionDigits: 1
                      })}%
                    </span>
                  </div>

                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-cyan-400"
                      style={{ width: `${share}%` }}
                    />
                  </div>

                  <div className="mt-2 flex justify-between text-xs text-slate-500">
                    <span>
                      {item.consumption_kwh.toLocaleString("it-IT")} kWh
                    </span>
                    <span>
                      € {item.cost_eur.toLocaleString("it-IT", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  )}
</div>


            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-cyan-400">
                  AISG Intelligence Engine
                </p>
                <h3 className="mt-2 text-xl font-semibold text-white">
                  Energy Trend Intelligence
                </h3>
                <p className="mt-2 text-sm text-slate-400">
                  Evoluzione mensile dei consumi e dei costi energetici.
                </p>
              </div>

              {energyTrends.length === 0 ? (
                <p className="text-sm text-slate-400">
                  Non ci sono ancora dati sufficienti per generare lo storico.
                </p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-sm bg-cyan-400" />
                      Elettricità
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-sm bg-violet-400" />
                      Gas
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-sm bg-amber-400" />
                      Altro
                    </span>
                  </div>

                  <div className="space-y-6">
                    {energyTrends.map((item) => {
                      const maxConsumption = Math.max(
                        ...energyTrends.map(
                          (trend) => trend.total_consumption_kwh
                        ),
                        1
                      );

                      const electricityWidth =
                        item.electricity_kwh / maxConsumption * 100;
                      const gasWidth =
                        item.gas_kwh / maxConsumption * 100;
                      const otherWidth =
                        item.other_kwh / maxConsumption * 100;

                      return (
                        <div key={item.month}>
                          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                            <span className="text-sm font-medium capitalize text-white">
                              {new Date(
                                `${item.month}-01T12:00:00`
                              ).toLocaleDateString("it-IT", {
                                month: "long",
                                year: "numeric"
                              })}
                            </span>
                            <span className="text-xs text-slate-400">
                              {item.total_consumption_kwh.toLocaleString("it-IT")} kWh
                            </span>
                          </div>

                          <div className="flex h-4 w-full overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full bg-cyan-400"
                              style={{ width: `${electricityWidth}%` }}
                            />
                            <div
                              className="h-full bg-violet-400"
                              style={{ width: `${gasWidth}%` }}
                            />
                            <div
                              className="h-full bg-amber-400"
                              style={{ width: `${otherWidth}%` }}
                            />
                          </div>

                          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                            <span>
                              Costo: € {item.total_cost_eur.toLocaleString("it-IT", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              })}
                            </span>
                            {item.has_estimated_allocation && (
                              <span className="text-amber-400">
                                Ripartizione stimata
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>


            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-cyan-400">
                  AISG Intelligence Engine
                </p>
                <h3 className="mt-2 text-xl font-semibold text-white">
                  Energy Period Comparison
                </h3>
                <p className="mt-2 text-sm text-slate-400">
                  Confronto tra gli ultimi due mesi disponibili.
                </p>
              </div>

              {energyTrends.length < 2 ? (
                <p className="text-sm text-slate-400">
                  Sono necessari almeno due mesi di dati per effettuare un confronto.
                </p>
              ) : (() => {
                const ordered = [...energyTrends].sort(
                  (a, b) => a.month.localeCompare(b.month)
                );
                const previous = ordered[ordered.length - 2];
                const current = ordered[ordered.length - 1];

                const consumptionDelta =
                  current.total_consumption_kwh - previous.total_consumption_kwh;
                const costDelta =
                  current.total_cost_eur - previous.total_cost_eur;

                const percentage = (delta: number, baseline: number) =>
                  baseline === 0
                    ? "Non calcolabile"
                    : `${delta > 0 ? "+" : ""}${(delta / baseline * 100).toLocaleString("it-IT", {
                        maximumFractionDigits: 1
                      })}%`;

                const amount = (value: number, unit: string) =>
                  `${value > 0 ? "+" : ""}${value.toLocaleString("it-IT", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })} ${unit}`;

                const monthName = (month: string) =>
                  new Date(`${month}-01T12:00:00`).toLocaleDateString("it-IT", {
                    month: "long",
                    year: "numeric"
                  });

                return (
                  <>
                    <p className="text-sm text-slate-400 capitalize">
                      {monthName(previous.month)} → {monthName(current.month)}
                    </p>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-xl border border-white/10 bg-slate-950/50 p-5">
                        <p className="text-sm text-slate-400">Variazione consumi</p>
                        <p className="mt-3 text-2xl font-semibold text-cyan-300">
                          {amount(consumptionDelta, "kWh")}
                        </p>
                        <p className="mt-2 text-sm text-slate-400">
                          {percentage(consumptionDelta, previous.total_consumption_kwh)}
                        </p>
                      </div>

                      <div className="rounded-xl border border-white/10 bg-slate-950/50 p-5">
                        <p className="text-sm text-slate-400">Variazione costi</p>
                        <p className="mt-3 text-2xl font-semibold text-cyan-300">
                          {amount(costDelta, "€")}
                        </p>
                        <p className="mt-2 text-sm text-slate-400">
                          {percentage(costDelta, previous.total_cost_eur)}
                        </p>
                      </div>
                    </div>

                    {(previous.has_estimated_allocation || current.has_estimated_allocation) && (
                      <p className="text-xs text-amber-400">
                        Almeno uno dei periodi contiene dati ripartiti in modo stimato.
                      </p>
                    )}
                  </>
                );
              })()}
            </div>

<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  label: "Consumo complessivo",
                  value: `${totalConsumption.toLocaleString("it-IT", { maximumFractionDigits: 2 })} kWh`,
                },
                {
                  label: "Costo registrato",
                  value: `€ ${totalCost.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                },
                {
                  label: "Elettricità",
                  value: `${electricityConsumption.toLocaleString("it-IT")} kWh`,
                },
                {
                  label: "Gas",
                  value: `${gasConsumption.toLocaleString("it-IT")} kWh`,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
                >
                  <p className="text-sm text-slate-400">{item.label}</p>
                  <p className="mt-3 text-2xl font-semibold text-white">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-[0.9fr_1.4fr]">
              <form
                onSubmit={createEnergyReading}
                className="h-fit space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6"
              >
                <h3 className="text-lg font-semibold">Nuova registrazione</h3>

                <label className="block text-sm text-slate-400">
                  Tipo di energia
                  <select
                    required
                    className={inputClass + " mt-2"}
                    value={energyForm.energy_type}
                    onChange={(e) =>
                      setEnergyForm({ ...energyForm, energy_type: e.target.value })
                    }
                  >
                    <option value="elettricita">Elettricità</option>
                    <option value="gas">Gas</option>
                    <option value="altro">Altro</option>
                  </select>
                </label>

                <label className="block text-sm text-slate-400">
                  Data iniziale
                  <input
                    required
                    type="date"
                    className={inputClass + " mt-2"}
                    value={energyForm.period_start}
                    onChange={(e) =>
                      setEnergyForm({ ...energyForm, period_start: e.target.value })
                    }
                  />
                </label>

                <label className="block text-sm text-slate-400">
                  Data finale
                  <input
                    required
                    type="date"
                    className={inputClass + " mt-2"}
                    value={energyForm.period_end}
                    onChange={(e) =>
                      setEnergyForm({ ...energyForm, period_end: e.target.value })
                    }
                  />
                </label>

                <label className="block text-sm text-slate-400">
                  Consumo (kWh)
                  <input
                    required
                    type="number"
                    min="0.01"
                    step="any"
                    className={inputClass + " mt-2"}
                    placeholder="Es. 12500"
                    value={energyForm.consumption_kwh}
                    onChange={(e) =>
                      setEnergyForm({ ...energyForm, consumption_kwh: e.target.value })
                    }
                  />
                </label>

                <label className="block text-sm text-slate-400">
                  Costo (€)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className={inputClass + " mt-2"}
                    placeholder="Es. 2800"
                    value={energyForm.cost_eur}
                    onChange={(e) =>
                      setEnergyForm({ ...energyForm, cost_eur: e.target.value })
                    }
                  />
                </label>

                <label className="block text-sm text-slate-400">
                  Provenienza del dato
                  <select
                    className={inputClass + " mt-2"}
                    value={energyForm.source}
                    onChange={(e) =>
                      setEnergyForm({ ...energyForm, source: e.target.value })
                    }
                  >
                    <option value="manuale">Inserimento manuale</option>
                    <option value="fattura">Fattura energetica</option>
                    <option value="contatore">Lettura contatore</option>
                  </select>
                </label>

                <textarea
                  className={inputClass}
                  placeholder="Note aggiuntive"
                  value={energyForm.notes}
                  onChange={(e) =>
                    setEnergyForm({ ...energyForm, notes: e.target.value })
                  }
                />

                <button disabled={saving} className={buttonClass}>
                  {saving ? "Salvataggio..." : "Registra consumo"}
                </button>
              </form>

              <div className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                  <h3 className="text-lg font-semibold">Andamento dei consumi</h3>
                  <p className="mt-1 text-sm text-slate-400">
                    Confronto tra le registrazioni disponibili.
                  </p>

                  {energyReadings.length === 0 ? (
                    <p className="mt-6 text-sm text-slate-400">
                      Non sono ancora presenti registrazioni.
                    </p>
                  ) : (
                    <div className="mt-6 space-y-5">
                      {energyReadings.map((reading) => (
                        <div key={reading.id}>
                          <div className="mb-2 flex justify-between gap-3 text-sm">
                            <span className="text-slate-300">
                              {reading.energy_type === "elettricita"
                                ? "Elettricità"
                                : reading.energy_type === "gas"
                                  ? "Gas"
                                  : "Altro"}
                              {" · "}
                              {reading.period_start} – {reading.period_end}
                            </span>
                            <span className="font-medium text-white">
                              {reading.consumption_kwh.toLocaleString("it-IT")} kWh
                            </span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full rounded-full bg-cyan-400"
                              style={{
                                width: `${Math.max(2, reading.consumption_kwh / maxConsumption * 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                  <h3 className="text-lg font-semibold">Storico energetico</h3>

                  {energyReadings.length === 0 ? (
                    <p className="mt-4 text-sm text-slate-400">
                      Nessun dato energetico registrato.
                    </p>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {energyReadings.map((reading) => (
                        <div
                          key={reading.id}
                          className="rounded-xl border border-white/10 p-4"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="font-medium">
                                {reading.energy_type === "elettricita"
                                  ? "Elettricità"
                                  : reading.energy_type === "gas"
                                    ? "Gas"
                                    : "Altro"}
                              </p>
                              <p className="mt-1 text-xs text-slate-400">
                                {reading.period_start} – {reading.period_end}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => deleteEnergyReading(reading.id)}
                              className="text-sm text-red-300 hover:text-red-200"
                            >
                              Elimina
                            </button>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-300">
                            <span>
                              {reading.consumption_kwh.toLocaleString("it-IT")} kWh
                            </span>
                            <span>
                              € {reading.cost_eur.toLocaleString("it-IT", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                            <span className="text-slate-400">
                              Fonte: {reading.source}
                            </span>
                          </div>
                          {reading.notes && (
                            <p className="mt-2 text-sm text-slate-400">
                              {reading.notes}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

                {activeTab === "Dispositivi" && (
          <section className="mt-6 space-y-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-cyan-400">
                Device Management
              </p>
              <h2 className="mt-2 text-2xl font-bold">
                Gestione dispositivi
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                Registra e monitora i dispositivi collegati all'edificio.
              </p>
            </div>

            <form
              onSubmit={createDevice}
              className="grid gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:grid-cols-2"
            >
              <h3 className="text-lg font-semibold md:col-span-2">
                Registra nuovo dispositivo
              </h3>

              <input
                required
                className={inputClass}
                placeholder="Nome dispositivo"
                value={deviceForm.name}
                onChange={(e) =>
                  setDeviceForm({ ...deviceForm, name: e.target.value })
                }
              />

              <input
                required
                className={inputClass}
                placeholder="Identificativo univoco"
                value={deviceForm.external_id}
                onChange={(e) =>
                  setDeviceForm({ ...deviceForm, external_id: e.target.value })
                }
              />

              <input
                required
                className={inputClass}
                placeholder="Tipo dispositivo"
                value={deviceForm.device_type}
                onChange={(e) =>
                  setDeviceForm({ ...deviceForm, device_type: e.target.value })
                }
              />

              <input
                className={inputClass}
                placeholder="Produttore"
                value={deviceForm.manufacturer}
                onChange={(e) =>
                  setDeviceForm({ ...deviceForm, manufacturer: e.target.value })
                }
              />

              <input
                className={inputClass}
                placeholder="Modello"
                value={deviceForm.model}
                onChange={(e) =>
                  setDeviceForm({ ...deviceForm, model: e.target.value })
                }
              />

              <input
                className={inputClass}
                placeholder="Protocollo (es. MQTT, Modbus)"
                value={deviceForm.protocol}
                onChange={(e) =>
                  setDeviceForm({ ...deviceForm, protocol: e.target.value })
                }
              />

              <select
                className={inputClass}
                value={deviceForm.system_id}
                onChange={(e) =>
                  setDeviceForm({ ...deviceForm, system_id: e.target.value })
                }
              >
                <option value="">Nessun impianto associato</option>
                {systems.map((system) => (
                  <option key={system.id} value={system.id}>
                    {system.name}
                  </option>
                ))}
              </select>

              <select
                className={inputClass}
                value={deviceForm.zone_id}
                onChange={(e) =>
                  setDeviceForm({ ...deviceForm, zone_id: e.target.value })
                }
              >
                <option value="">Nessuna zona associata</option>
                {zones.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.name}
                  </option>
                ))}
              </select>

              <div className="md:col-span-2">
                <button disabled={saving} className={buttonClass}>
                  {saving ? "Registrazione..." : "Registra dispositivo"}
                </button>
              </div>
            </form>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">
                Dispositivi registrati ({devices.length})
              </h3>

              {devices.length === 0 ? (
                <p className="rounded-2xl border border-white/10 p-6 text-sm text-slate-400">
                  Nessun dispositivo registrato.
                </p>
              ) : (
                devices.map((device) => (
                  <div
                    key={device.id}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
                  >
                    <div className="flex flex-wrap justify-between gap-3">
                      <div>
                        <h4 className="font-semibold">{device.name}</h4>
                        <p className="mt-1 text-sm text-slate-400">
                          {device.device_type} · {device.manufacturer} {device.model}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          ID: {device.external_id} · Protocollo: {device.protocol || "Non specificato"}
                        </p>
                      </div>
                      <span className="text-sm text-cyan-300">
                        {device.connection_status === "online"
                          ? "Online"
                          : device.connection_status === "offline"
                            ? "Offline"
                            : "Mai connesso"}
                      </span>
                    </div>

                    <div className="mt-5 border-t border-white/10 pt-4">
                      <button
                        type="button"
                        onClick={() => loadDeviceTelemetry(device.id)}
                        className={buttonClass}
                      >
                        Carica misurazioni
                      </button>

                      {telemetry[device.id] !== undefined && (
                        <div className="mt-4 space-y-3">
                          <h5 className="text-sm font-semibold text-slate-300">
                            Ultime misurazioni
                          </h5>

                          {telemetry[device.id].length === 0 ? (
                            <p className="text-sm text-slate-400">
                              Nessuna misurazione ricevuta.
                            </p>
                          ) : (
                            telemetry[device.id].map((reading) => (
                              <div
                                key={reading.id}
                                className="rounded-xl bg-white/[0.03] p-4 text-sm"
                              >
                                <p className="font-medium text-white">
                                  {reading.metric}: {reading.value} {reading.unit}
                                </p>
                                <p className="mt-1 text-xs text-slate-400">
                                  Misurata: {new Date(reading.measured_at).toLocaleString("it-IT")}
                                </p>
                                <p className="text-xs text-slate-500">
                                  Qualità: {reading.quality} · Fonte: {reading.source}
                                </p>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

      </div>
    </main>
  );
}



export default function BuildingDetailPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#07111f] p-8 text-white">
          Caricamento scheda tecnica...
        </main>
      }
    >
      <BuildingDetailContent />
    </Suspense>
  );
}
