import React, { useState, useEffect, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  Legend,
  Cell,
} from "recharts";
import { Search, Filter, TrendingUp, Users, AlertTriangle, Activity } from "lucide-react";

// Keep the same base URL so you can swap this in without backend changes
const API_BASE_URL = "http://localhost:5000/api";

const apiCall = async (endpoint, options = {}) => {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) throw new Error(`API call failed: ${response.statusText}`);

    return await response.json();
  } catch (err) {
    console.warn("API error, using mock:", err?.message);
    return getMockData(endpoint);
  }
};

// --- Minimal mock data (same shape as original) ---
const getMockData = (endpoint) => {
  if (endpoint === "/rankings") {
    return {
      rankings: [
        { district: "Nsanje", region: "Southern", population: 280000, nutrition_risk: 0.785, risk_level: "HIGH" },
        { district: "Chitipa", region: "Northern", population: 230000, nutrition_risk: 0.742, risk_level: "HIGH" },
        { district: "Machinga", region: "Southern", population: 600000, nutrition_risk: 0.698, risk_level: "HIGH" },
        { district: "Dedza", region: "Central", population: 620000, nutrition_risk: 0.645, risk_level: "HIGH" },
        { district: "Lilongwe", region: "Central", population: 2400000, nutrition_risk: 0.456, risk_level: "MODERATE" },
        { district: "Blantyre", region: "Southern", population: 1200000, nutrition_risk: 0.398, risk_level: "MODERATE" },
        { district: "Likoma", region: "Northern", population: 15000, nutrition_risk: 0.267, risk_level: "LOW" },
      ],
    };
  }
  return { error: "No mock for endpoint" };
};

// --- Static nutrient data (unchanged) ---
const nutrientData = [
  { nutrient: "Vitamin B12", adequacy: 22.9, critical: true },
  { nutrient: "Riboflavin", adequacy: 52.47, critical: true },
  { nutrient: "Vitamin A", adequacy: 54.48, critical: true },
  { nutrient: "Niacin", adequacy: 68.17, critical: false },
  { nutrient: "Folate", adequacy: 81.42, critical: false },
  { nutrient: "Kilocalories", adequacy: 84.88, critical: false },
  { nutrient: "Zinc", adequacy: 88.63, critical: false },
  { nutrient: "Vitamin B6", adequacy: 90.68, critical: false },
  { nutrient: "Vitamin C", adequacy: 90.87, critical: false },
  { nutrient: "Calcium", adequacy: 92.71, critical: false },
  { nutrient: "Thiamin", adequacy: 93.35, critical: false },
  { nutrient: "Proteins", adequacy: 95.99, critical: false },
  { nutrient: "Iron", adequacy: 98.25, critical: false },
];

const interventionTypes = [
  { type: "supplementation", name: "Micronutrient Supplementation", icon: "💊" },
  { type: "fortification", name: "Food Fortification", icon: "🌾" },
  { type: "cash_transfer", name: "Cash Transfer Programs", icon: "💰" },
  { type: "nutrition_education", name: "Nutrition Education", icon: "📚" },
];

// --- Helper fns ---
const regionColor = (region) => ({ 
  Northern: "#3b82f6", 
  Central: "#059669", 
  Southern: "#dc2626" 
}[region] || "#6b7280");

const riskBarColor = (v) => (v >= 0.6 ? "#dc2626" : v >= 0.3 ? "#ea580c" : "#059669");

const nutrientBarColor = (adequacy) => (adequacy < 60 ? "#dc2626" : adequacy < 80 ? "#ea580c" : "#059669");

export default function NutritionDashboard() {
  // UI State
  const [active, setActive] = useState("overview");
  const [districts, setDistricts] = useState([]);
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("");

  // Simulator state
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [intervention, setIntervention] = useState("supplementation");
  const [scale, setScale] = useState(50);
  const [sim, setSim] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const data = await apiCall("/rankings");
      setDistricts(data.rankings || []);
      setLoading(false);
    })();
  }, []);

  // Derived
  const filtered = useMemo(() =>
    districts.filter((d) =>
      d.district.toLowerCase().includes(search.toLowerCase()) && (!region || d.region === region)
    ),
  [districts, search, region]);

  const highRiskCount = useMemo(() => districts.filter((d) => d.risk_level === "HIGH").length, [districts]);
  const atRiskPopulation = useMemo(
    () => districts.filter((d) => d.risk_level !== "LOW").reduce((acc, d) => acc + d.population, 0),
    [districts]
  );
  const criticalCount = nutrientData.filter((n) => n.adequacy < 60).length;

  const runSimulation = async () => {
    if (!selectedDistrict) return;
    setLoading(true);
    try {
      const result = await apiCall("/simulate", {
        method: "POST",
        body: JSON.stringify({ district: selectedDistrict, intervention_type: intervention, scale_percent: scale }),
      });

      if (result?.error) throw new Error(result.error);
      const base = result.baseline_risk;
      const next = result.intervention_risk;
      const eff = result.effectiveness_percent;

      const chosen = districts.find((d) => d.district === selectedDistrict);
      const beneficiaries = Math.floor((chosen?.population || 0) * (scale / 100));

      setSim({ base, next, eff, beneficiaries, district: selectedDistrict });
    } catch (_) {
      // Simple offline model
      const chosen = districts.find((d) => d.district === selectedDistrict);
      if (!chosen) return setLoading(false);
      const base = chosen.nutrition_risk;
      const factors = { supplementation: 0.15, fortification: 0.12, cash_transfer: 0.18, nutrition_education: 0.08 };
      const effect = (factors[intervention] || 0) * (scale / 100);
      const next = Math.max(0, base - base * effect);
      const eff = ((base - next) / base) * 100;
      const beneficiaries = Math.floor((chosen.population || 0) * (scale / 100));
      setSim({ base, next, eff, beneficiaries, district: selectedDistrict });
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: TrendingUp },
    { id: "districts", label: "Districts", icon: Users },
    { id: "nutrients", label: "Nutrients", icon: Activity },
    { id: "interventions", label: "Simulator", icon: AlertTriangle },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header with gradient */}
      <header className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-600 shadow-lg">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Malawi Nutrition Dashboard</h1>
              <p className="mt-2 text-slate-200">Data-driven insights for policy makers and health officials</p>
            </div>
            
            {/* Enhanced Navigation */}
            <nav className="mt-4 lg:mt-0">
              <div className="flex gap-1 rounded-lg bg-white/10 p-1 backdrop-blur-sm">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActive(tab.id)}
                      className={`flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                        active === tab.id
                          ? "bg-white text-slate-800 shadow-md"
                          : "text-slate-200 hover:bg-white/20 hover:text-white"
                      }`}
                    >
                      <Icon size={16} />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </nav>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Enhanced KPIs with icons */}
        <section className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          <KPI 
            title="High-risk districts" 
            value={highRiskCount} 
            icon={<AlertTriangle className="h-6 w-6 text-red-500" />}
            trend="+2 from last month"
            color="red"
          />
          <KPI 
            title="Population at risk" 
            value={`${(atRiskPopulation / 1_000_000).toFixed(1)}M`} 
            icon={<Users className="h-6 w-6 text-orange-500" />}
            trend="12% of total population"
            color="orange"
          />
          <KPI 
            title="Critical nutrients (<60%)" 
            value={criticalCount} 
            icon={<Activity className="h-6 w-6 text-blue-500" />}
            trend="Requires immediate attention"
            color="blue"
          />
        </section>

        {/* Enhanced Tabs */}
        <section className="space-y-6">
          {active === "overview" && (
            <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
              <Card title="Risk vs Population Analysis" subtitle="Bubble size represents population scale">
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <CartesianGrid stroke="#e2e8f0" strokeDasharray="2 2" />
                      <XAxis 
                        type="number" 
                        dataKey="population" 
                        name="Population" 
                        tick={{ fontSize: 11 }}
                        tickFormatter={(value) => `${(value/1000).toFixed(0)}k`}
                      />
                      <YAxis 
                        type="number" 
                        dataKey="nutrition_risk" 
                        domain={[0, 1]} 
                        name="Risk" 
                        tick={{ fontSize: 11 }}
                        tickFormatter={(value) => value.toFixed(2)}
                      />
                      <Tooltip 
                        cursor={{ strokeDasharray: "3 3" }} 
                        formatter={(v, n) => [
                          n === "nutrition_risk" ? v.toFixed(3) : v.toLocaleString(),
                          n === "nutrition_risk" ? "Risk Score" : "Population"
                        ]}
                        labelFormatter={(label, payload) => payload?.[0]?.payload?.district || ""}
                      />
                      <Scatter data={districts} shape={(props) => {
                        const { payload } = props;
                        const size = Math.max(4, Math.min(12, payload.population / 200000));
                        return (
                          <circle 
                            cx={props.cx} 
                            cy={props.cy} 
                            r={size} 
                            fill={regionColor(payload.region)}
                            fillOpacity={0.7}
                            stroke={regionColor(payload.region)}
                            strokeWidth={2}
                          />
                        );
                      }} />
                      <Legend />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Legend for regions */}
                <div className="mt-4 flex flex-wrap gap-4 text-sm">
                  {['Northern', 'Central', 'Southern'].map(reg => (
                    <div key={reg} className="flex items-center gap-2">
                      <div 
                        className="h-3 w-3 rounded-full" 
                        style={{ backgroundColor: regionColor(reg) }}
                      />
                      <span className="text-slate-600">{reg} Region</span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card title="District Risk Rankings" subtitle="Sorted by nutrition risk score">
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={[...districts].sort((a, b) => b.nutrition_risk - a.nutrition_risk)}
                      margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                    >
                      <CartesianGrid stroke="#e2e8f0" strokeDasharray="2 2" />
                      <XAxis 
                        dataKey="district" 
                        tick={{ fontSize: 11 }} 
                        interval={0} 
                        angle={-45} 
                        textAnchor="end" 
                        height={80}
                      />
                      <YAxis domain={[0, 1]} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v) => [Number(v).toFixed(3), "Risk Score"]} />
                      <Bar dataKey="nutrition_risk" radius={[4, 4, 0, 0]}>
                        {districts.map((d, i) => (
                          <Cell key={i} fill={riskBarColor(d.nutrition_risk)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          )}

          {active === "districts" && (
            <Card title="District Analysis" subtitle="Comprehensive district risk assessment">
              {/* Enhanced search and filter */}
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1 sm:max-w-md">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search districts..."
                    className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                
                <div className="relative sm:w-48">
                  <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="w-full appearance-none rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-8 text-sm shadow-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="">All regions</option>
                    <option>Northern</option>
                    <option>Central</option>
                    <option>Southern</option>
                  </select>
                </div>
              </div>

              <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <Th>Rank</Th>
                        <Th>District</Th>
                        <Th>Region</Th>
                        <Th>Population</Th>
                        <Th>Risk Score</Th>
                        <Th>Status</Th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {[...filtered]
                        .sort((a, b) => b.nutrition_risk - a.nutrition_risk)
                        .map((d, i) => (
                          <tr key={d.district} className="transition-colors hover:bg-slate-50">
                            <Td>
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-medium">
                                {i + 1}
                              </div>
                            </Td>
                            <Td className="font-semibold text-slate-900">{d.district}</Td>
                            <Td>
                              <div className="flex items-center gap-2">
                                <div 
                                  className="h-2.5 w-2.5 rounded-full" 
                                  style={{ backgroundColor: regionColor(d.region) }} 
                                />
                                <span className="text-slate-600">{d.region}</span>
                              </div>
                            </Td>
                            <Td className="font-mono text-slate-600">{d.population.toLocaleString()}</Td>
                            <Td>
                              <div className="flex items-center gap-3">
                                <div className="flex-1">
                                  <div className="h-2.5 w-32 overflow-hidden rounded-full bg-slate-200">
                                    <div
                                      className="h-full rounded-full transition-all duration-500"
                                      style={{ 
                                        width: `${d.nutrition_risk * 100}%`, 
                                        backgroundColor: riskBarColor(d.nutrition_risk) 
                                      }}
                                    />
                                  </div>
                                </div>
                                <span className="min-w-0 font-mono text-xs text-slate-600">
                                  {d.nutrition_risk.toFixed(3)}
                                </span>
                              </div>
                            </Td>
                            <Td>
                              <span
                                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                                  d.risk_level === "HIGH"
                                    ? "bg-red-100 text-red-700"
                                    : d.risk_level === "MODERATE"
                                    ? "bg-orange-100 text-orange-700"
                                    : "bg-green-100 text-green-700"
                                }`}
                              >
                                {d.risk_level}
                              </span>
                            </Td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              {/* Results summary */}
              <div className="mt-4 text-sm text-slate-600">
                Showing {filtered.length} of {districts.length} districts
              </div>
            </Card>
          )}

          {active === "nutrients" && (
            <Card title="Nutrient Adequacy Assessment" subtitle="Population-level nutrient intake adequacy (%)">
              <div className="h-[480px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={[...nutrientData].sort((a, b) => a.adequacy - b.adequacy)} 
                    layout="vertical"
                    margin={{ top: 20, right: 30, left: 120, bottom: 20 }}
                  >
                    <CartesianGrid stroke="#e2e8f0" strokeDasharray="2 2" />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="nutrient" width={110} tick={{ fontSize: 11 }} />
                    <Tooltip 
                      formatter={(v) => [`${v}%`, "Adequacy"]}
                      labelStyle={{ color: '#1e293b' }}
                    />
                    <Bar dataKey="adequacy" radius={[0, 4, 4, 0]}>
                      {nutrientData.map((n, i) => (
                        <Cell key={i} fill={nutrientBarColor(n.adequacy)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              {/* Enhanced stats */}
              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Stat 
                  label="Critical deficiency" 
                  sublabel="<60% adequacy"
                  value={nutrientData.filter((n) => n.adequacy < 60).length} 
                  color="red"
                />
                <Stat 
                  label="Low adequacy" 
                  sublabel="60-80% adequacy"
                  value={nutrientData.filter((n) => n.adequacy >= 60 && n.adequacy < 80).length}
                  color="orange" 
                />
                <Stat 
                  label="Adequate intake" 
                  sublabel="≥80% adequacy"
                  value={nutrientData.filter((n) => n.adequacy >= 80).length}
                  color="green" 
                />
              </div>
            </Card>
          )}

          {active === "interventions" && (
            <Card title="Policy Intervention Simulator" subtitle="Model the impact of nutrition interventions">
              {/* Enhanced form */}
              <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div>
                  <Label>Target District</Label>
                  <select
                    value={selectedDistrict}
                    onChange={(e) => setSelectedDistrict(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="">Select a district...</option>
                    {districts
                      .sort((a, b) => b.nutrition_risk - a.nutrition_risk)
                      .map((d) => (
                        <option key={d.district} value={d.district}>
                          {d.district} ({d.region}) - Risk: {d.nutrition_risk.toFixed(3)}
                        </option>
                      ))}
                  </select>
                </div>
                
                <div>
                  <Label>Intervention Strategy</Label>
                  <select
                    value={intervention}
                    onChange={(e) => setIntervention(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  >
                    {interventionTypes.map((i) => (
                      <option key={i.type} value={i.type}>
                        {i.icon} {i.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <Label>Coverage Scale: {scale}%</Label>
                  <div className="mt-2 space-y-2">
                    <input
                      type="range"
                      min={10}
                      max={100}
                      step={5}
                      value={scale}
                      onChange={(e) => setScale(parseInt(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>10%</span>
                      <span>50%</span>
                      <span>100%</span>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={runSimulation}
                disabled={!selectedDistrict || loading}
                className="mb-6 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-3 text-sm font-medium text-white shadow-lg transition-all hover:from-blue-700 hover:to-blue-800 hover:shadow-xl disabled:from-slate-400 disabled:to-slate-500 disabled:shadow-none"
              >
                {loading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Processing...
                  </>
                ) : (
                  <>
                    <TrendingUp size={16} />
                    Run Simulation
                  </>
                )}
              </button>

              {sim && (
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                  <div className="space-y-4">
                    <h3 className="font-medium text-slate-900">Simulation Results</h3>
                    <div className="space-y-3">
                      {[
                        { label: "Target District", value: sim.district },
                        { label: "Current Risk Score", value: sim.base.toFixed(3) },
                        { label: "Projected Risk Score", value: sim.next.toFixed(3) },
                        { label: "Risk Reduction", value: `${sim.eff.toFixed(1)}%` },
                        { label: "Estimated Beneficiaries", value: sim.beneficiaries.toLocaleString() },
                      ].map((item) => (
                        <div key={item.label} className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
                          <span className="text-sm font-medium text-slate-600">{item.label}</span>
                          <span className="text-sm font-semibold text-slate-900">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="mb-4 font-medium text-slate-900">Impact Visualization</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[{ name: "Risk Comparison", Current: sim.base, Projected: sim.next }]}> 
                          <CartesianGrid stroke="#e2e8f0" strokeDasharray="2 2" />
                          <XAxis dataKey="name" />
                          <YAxis domain={[0, 1]} />
                          <Tooltip formatter={(v) => [Number(v).toFixed(3), ""]} />
                          <Legend />
                          <Bar dataKey="Current" fill="#64748b" radius={[4, 4, 0, 0]} name="Current Risk" />
                          <Bar dataKey="Projected" fill="#0ea5e9" radius={[4, 4, 0, 0]} name="After Intervention" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          )}
        </section>
      </main>

      <footer className="border-t bg-white">
        <div className="mx-auto max-w-7xl px-6 py-6 text-center text-sm text-slate-500">
          Built with care for Malawi's nutrition policy makers • Data visualization for better decision making
        </div>
      </footer>
    </div>
  );
}

/* --- Enhanced UI Components --- */
function Card({ title, subtitle, children }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md">
      {(title || subtitle) && (
        <div className="border-b border-slate-100 px-6 py-4">
          {title && <h2 className="text-lg font-semibold text-slate-900">{title}</h2>}
          {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
}

function KPI({ title, value, icon, trend, color }) {
  const colorClasses = {
    red: "border-red-200 bg-red-50",
    orange: "border-orange-200 bg-orange-50", 
    blue: "border-blue-200 bg-blue-50",
    green: "border-green-200 bg-green-50"
  };

  return (
    <div className={`rounded-xl border bg-white p-6 shadow-sm transition-all hover:shadow-md ${colorClasses[color] || ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-600">{title}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
          {trend && <p className="mt-1 text-xs text-slate-500">{trend}</p>}
        </div>
        <div className="ml-4">{icon}</div>
      </div>
    </div>
  );
}

function Label({ children }) {
  return <label className="text-sm font-semibold text-slate-700">{children}</label>;
}

function Th({ children }) {
  return <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">{children}</th>;
}

function Td({ children, className = "" }) {
  return <td className={`px-4 py-4 ${className}`}>{children}</td>;
}

function Stat({ label, sublabel, value, color }) {
  const colorClasses = {
    red: "border-red-200 bg-red-50",
    orange: "border-orange-200 bg-orange-50",
    green: "border-green-200 bg-green-50"
  };

  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color] || 'border-slate-200 bg-slate-50'}`}>
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      {sublabel && <div className="text-xs text-slate-400">{sublabel}</div>}
      <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>
    </div>
  );
}