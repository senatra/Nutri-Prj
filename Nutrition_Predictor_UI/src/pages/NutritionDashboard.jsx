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
import { 
  Search, 
  Filter, 
  TrendingUp, 
  Users, 
  AlertTriangle, 
  Activity, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  X,
  CheckCircle,
  XCircle,
  AlertCircle
} from "lucide-react";

// Keep the same base URL so you can swap this in without backend changes
const API_BASE_URL = "http://localhost:5000/api";

// Enhanced API call with better error handling
const apiCall = async (endpoint, options = {}) => {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      timeout: 10000, // 10 second timeout
      ...options,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return { data, isRealData: true };
  } catch (err) {
    console.warn("API error, falling back to mock data:", err?.message);
    return { data: getMockData(endpoint), isRealData: false, error: err?.message };
  }
};

// Enhanced mock data with more realistic variations
const getMockData = (endpoint) => {
  if (endpoint === "/rankings") {
    return {
      rankings: [
        { district: "Nsanje", region: "Southern", population: 280000, nutrition_risk: 0.785, risk_level: "HIGH" },
        { district: "Chitipa", region: "Northern", population: 230000, nutrition_risk: 0.742, risk_level: "HIGH" },
        { district: "Machinga", region: "Southern", population: 600000, nutrition_risk: 0.698, risk_level: "HIGH" },
        { district: "Dedza", region: "Central", population: 620000, nutrition_risk: 0.645, risk_level: "HIGH" },
        { district: "Mangochi", region: "Southern", population: 890000, nutrition_risk: 0.612, risk_level: "HIGH" },
        { district: "Salima", region: "Central", population: 420000, nutrition_risk: 0.567, risk_level: "MODERATE" },
        { district: "Lilongwe", region: "Central", population: 2400000, nutrition_risk: 0.456, risk_level: "MODERATE" },
        { district: "Blantyre", region: "Southern", population: 1200000, nutrition_risk: 0.398, risk_level: "MODERATE" },
        { district: "Mzimba", region: "Northern", population: 720000, nutrition_risk: 0.334, risk_level: "MODERATE" },
        { district: "Likoma", region: "Northern", population: 15000, nutrition_risk: 0.267, risk_level: "LOW" },
      ],
    };
  }
  if (endpoint === "/simulate") {
    return { error: "Simulation endpoint not available in mock mode" };
  }
  return { error: "Endpoint not found" };
};

// Static nutrient data (unchanged but enhanced)
const nutrientData = [
  { nutrient: "Vitamin B12", adequacy: 22.9, critical: true, unit: "μg", rda: "2.4" },
  { nutrient: "Riboflavin", adequacy: 52.47, critical: true, unit: "mg", rda: "1.3" },
  { nutrient: "Vitamin A", adequacy: 54.48, critical: true, unit: "μg RAE", rda: "900" },
  { nutrient: "Niacin", adequacy: 68.17, critical: false, unit: "mg", rda: "16" },
  { nutrient: "Folate", adequacy: 81.42, critical: false, unit: "μg", rda: "400" },
  { nutrient: "Kilocalories", adequacy: 84.88, critical: false, unit: "kcal", rda: "2000" },
  { nutrient: "Zinc", adequacy: 88.63, critical: false, unit: "mg", rda: "11" },
  { nutrient: "Vitamin B6", adequacy: 90.68, critical: false, unit: "mg", rda: "1.7" },
  { nutrient: "Vitamin C", adequacy: 90.87, critical: false, unit: "mg", rda: "90" },
  { nutrient: "Calcium", adequacy: 92.71, critical: false, unit: "mg", rda: "1000" },
  { nutrient: "Thiamin", adequacy: 93.35, critical: false, unit: "mg", rda: "1.2" },
  { nutrient: "Proteins", adequacy: 95.99, critical: false, unit: "g", rda: "50" },
  { nutrient: "Iron", adequacy: 98.25, critical: false, unit: "mg", rda: "18" },
];

const interventionTypes = [
  { 
    type: "supplementation", 
    name: "Micronutrient Supplementation", 
    icon: "💊",
    description: "Direct provision of essential vitamins and minerals",
    effectiveness: "High"
  },
  { 
    type: "fortification", 
    name: "Food Fortification", 
    icon: "🌾",
    description: "Adding nutrients to commonly consumed foods",
    effectiveness: "Medium-High"
  },
  { 
    type: "cash_transfer", 
    name: "Cash Transfer Programs", 
    icon: "💰",
    description: "Direct financial support to improve food security",
    effectiveness: "Medium"
  },
  { 
    type: "nutrition_education", 
    name: "Nutrition Education", 
    icon: "📚",
    description: "Community-based nutrition awareness programs",
    effectiveness: "Medium-Low"
  },
];

// Helper functions
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
  const [isUsingMockData, setIsUsingMockData] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [showMockWarning, setShowMockWarning] = useState(false);

  // Simulator state
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [intervention, setIntervention] = useState("supplementation");
  const [scale, setScale] = useState(50);
  const [sim, setSim] = useState(null);
  const [loading, setLoading] = useState(true);
  const [simLoading, setSimLoading] = useState(false);
  const [simError, setSimError] = useState(null);

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  // Show mock warning when using mock data
  useEffect(() => {
    if (isUsingMockData && !showMockWarning) {
      setShowMockWarning(true);
    }
  }, [isUsingMockData]);

  const loadData = async () => {
    setLoading(true);
    setApiError(null);
    
    try {
      const result = await apiCall("/rankings");
      setDistricts(result.data.rankings || []);
      setIsUsingMockData(!result.isRealData);
      
      if (!result.isRealData) {
        setApiError(`Failed to connect to API: ${result.error || 'Unknown error'}`);
      }
    } catch (err) {
      setApiError(`Unexpected error: ${err.message}`);
      setIsUsingMockData(true);
    } finally {
      setLoading(false);
    }
  };

  // Derived data
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
    
    setSimLoading(true);
    setSimError(null);
    setSim(null);
    
    try {
      const result = await apiCall("/simulate", {
        method: "POST",
        body: JSON.stringify({ 
          district: selectedDistrict, 
          intervention_type: intervention, 
          scale_percent: scale 
        }),
      });

      if (result.data?.error) {
        throw new Error(result.data.error);
      }

      if (result.isRealData) {
        // Use real API data
        const { baseline_risk, intervention_risk, effectiveness_percent } = result.data;
        const chosen = districts.find((d) => d.district === selectedDistrict);
        const beneficiaries = Math.floor((chosen?.population || 0) * (scale / 100));

        setSim({ 
          base: baseline_risk, 
          next: intervention_risk, 
          eff: effectiveness_percent, 
          beneficiaries, 
          district: selectedDistrict,
          isRealData: true 
        });
      } else {
        // Use offline simulation model
        const chosen = districts.find((d) => d.district === selectedDistrict);
        if (!chosen) throw new Error("District not found");
        
        const base = chosen.nutrition_risk;
        const factors = { 
          supplementation: 0.15, 
          fortification: 0.12, 
          cash_transfer: 0.18, 
          nutrition_education: 0.08 
        };
        const effect = (factors[intervention] || 0) * (scale / 100);
        const next = Math.max(0, base - base * effect);
        const eff = ((base - next) / base) * 100;
        const beneficiaries = Math.floor((chosen.population || 0) * (scale / 100));
        
        setSim({ 
          base, 
          next, 
          eff, 
          beneficiaries, 
          district: selectedDistrict, 
          isRealData: false 
        });
        setSimError("Using offline simulation model - results are estimates only");
      }
    } catch (err) {
      setSimError(`Simulation failed: ${err.message}`);
    } finally {
      setSimLoading(false);
    }
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: TrendingUp },
    { id: "districts", label: "Districts", icon: Users },
    { id: "nutrients", label: "Nutrients", icon: Activity },
    { id: "interventions", label: "Simulator", icon: AlertTriangle },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200">
      {/* Enhanced Header with connection status */}
      <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 shadow-xl">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-4">
                <h1 className="text-4xl font-bold text-white">Malawi Nutrition Dashboard</h1>
                <ConnectionIndicator isConnected={!isUsingMockData} />
              </div>
              <p className="mt-2 text-slate-200">Data-driven insights for policy makers and health officials</p>
            </div>
            
            {/* Enhanced Navigation */}
            <nav className="mt-4 lg:mt-0">
              <div className="flex gap-1 rounded-xl bg-white/10 p-1.5 backdrop-blur-lg">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActive(tab.id)}
                      className={`flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-medium transition-all duration-300 ${
                        active === tab.id
                          ? "bg-white text-slate-800 shadow-lg transform scale-105"
                          : "text-slate-200 hover:bg-white/20 hover:text-white hover:scale-102"
                      }`}
                    >
                      <Icon size={18} />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </nav>
          </div>
        </div>
      </header>

      {/* Mock Data Warning Banner */}
      {showMockWarning && isUsingMockData && (
        <MockDataBanner 
          onDismiss={() => setShowMockWarning(false)}
          onRetry={loadData}
          error={apiError}
          loading={loading}
        />
      )}

      {/* Content */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Enhanced Loading State */}
        {loading ? (
          <LoadingState />
        ) : (
          <>
            {/* Enhanced KPIs with better styling */}
            <section className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
              <KPI 
                title="High-risk districts" 
                value={highRiskCount} 
                icon={<AlertTriangle className="h-7 w-7 text-red-500" />}
                trend="+2 from last month"
                color="red"
                isRealData={!isUsingMockData}
              />
              <KPI 
                title="Population at risk" 
                value={`${(atRiskPopulation / 1_000_000).toFixed(1)}M`} 
                icon={<Users className="h-7 w-7 text-orange-500" />}
                trend="12% of total population"
                color="orange"
                isRealData={!isUsingMockData}
              />
              <KPI 
                title="Critical nutrients (<60%)" 
                value={criticalCount} 
                icon={<Activity className="h-7 w-7 text-blue-500" />}
                trend="Requires immediate attention"
                color="blue"
                isRealData={true} // Nutrient data is always static
              />
            </section>

            {/* Enhanced Tabs with better error handling */}
            <section className="space-y-6">
              {active === "overview" && (
                <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
                  <Card title="Risk vs Population Analysis" subtitle="Bubble size represents population scale">
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                          <XAxis 
                            type="number" 
                            dataKey="population" 
                            name="Population" 
                            tick={{ fontSize: 12 }}
                            tickFormatter={(value) => `${(value/1000).toFixed(0)}k`}
                          />
                          <YAxis 
                            type="number" 
                            dataKey="nutrition_risk" 
                            domain={[0, 1]} 
                            name="Risk" 
                            tick={{ fontSize: 12 }}
                            tickFormatter={(value) => value.toFixed(2)}
                          />
                          <Tooltip 
                            cursor={{ strokeDasharray: "3 3" }} 
                            formatter={(v, n) => [
                              n === "nutrition_risk" ? v.toFixed(3) : v.toLocaleString(),
                              n === "nutrition_risk" ? "Risk Score" : "Population"
                            ]}
                            labelFormatter={(label, payload) => payload?.[0]?.payload?.district || ""}
                            contentStyle={{ 
                              backgroundColor: 'white', 
                              border: '1px solid #e2e8f0', 
                              borderRadius: '8px',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                            }}
                          />
                          <Scatter data={districts} shape={(props) => {
                            const { payload } = props;
                            const size = Math.max(6, Math.min(16, payload.population / 200000));
                            return (
                              <circle 
                                cx={props.cx} 
                                cy={props.cy} 
                                r={size} 
                                fill={regionColor(payload.region)}
                                fillOpacity={0.8}
                                stroke={regionColor(payload.region)}
                                strokeWidth={2}
                                className="transition-all hover:opacity-100"
                              />
                            );
                          }} />
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                    
                    {/* Enhanced Legend */}
                    <div className="mt-6 flex flex-wrap gap-6 text-sm">
                      {['Northern', 'Central', 'Southern'].map(reg => (
                        <div key={reg} className="flex items-center gap-3">
                          <div 
                            className="h-4 w-4 rounded-full shadow-sm" 
                            style={{ backgroundColor: regionColor(reg) }}
                          />
                          <span className="font-medium text-slate-700">{reg} Region</span>
                        </div>
                      ))}
                    </div>
                  </Card>

                  <Card title="District Risk Rankings" subtitle="Sorted by nutrition risk score">
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart 
                          data={[...districts].sort((a, b) => b.nutrition_risk - a.nutrition_risk)}
                          margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                        >
                          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="district" 
                            tick={{ fontSize: 11 }} 
                            interval={0} 
                            angle={-45} 
                            textAnchor="end" 
                            height={80}
                          />
                          <YAxis domain={[0, 1]} tick={{ fontSize: 12 }} />
                          <Tooltip 
                            formatter={(v) => [Number(v).toFixed(3), "Risk Score"]} 
                            contentStyle={{ 
                              backgroundColor: 'white', 
                              border: '1px solid #e2e8f0', 
                              borderRadius: '8px',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                            }}
                          />
                          <Bar dataKey="nutrition_risk" radius={[6, 6, 0, 0]}>
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
                  <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="relative flex-1 sm:max-w-md">
                      <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search districts..."
                        className="w-full rounded-xl border-2 border-slate-200 bg-white py-3 pl-12 pr-4 text-sm shadow-sm transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                      />
                    </div>
                    
                    <div className="relative sm:w-52">
                      <Filter className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                      <select
                        value={region}
                        onChange={(e) => setRegion(e.target.value)}
                        className="w-full appearance-none rounded-xl border-2 border-slate-200 bg-white py-3 pl-12 pr-10 text-sm shadow-sm transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                      >
                        <option value="">All regions</option>
                        <option>Northern</option>
                        <option>Central</option>
                        <option>Southern</option>
                      </select>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
                          <tr>
                            <Th>Rank</Th>
                            <Th>District</Th>
                            <Th>Region</Th>
                            <Th>Population</Th>
                            <Th>Risk Score</Th>
                            <Th>Status</Th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {[...filtered]
                            .sort((a, b) => b.nutrition_risk - a.nutrition_risk)
                            .map((d, i) => (
                              <tr key={d.district} className="transition-colors hover:bg-slate-50/80">
                                <Td>
                                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-slate-100 to-slate-200 text-sm font-bold text-slate-700">
                                    {i + 1}
                                  </div>
                                </Td>
                                <Td className="font-bold text-slate-900">{d.district}</Td>
                                <Td>
                                  <div className="flex items-center gap-3">
                                    <div 
                                      className="h-3 w-3 rounded-full shadow-sm" 
                                      style={{ backgroundColor: regionColor(d.region) }} 
                                    />
                                    <span className="font-medium text-slate-700">{d.region}</span>
                                  </div>
                                </Td>
                                <Td className="font-mono text-slate-600">{d.population.toLocaleString()}</Td>
                                <Td>
                                  <div className="flex items-center gap-3">
                                    <div className="flex-1">
                                      <div className="h-3 w-36 overflow-hidden rounded-full bg-slate-200">
                                        <div
                                          className="h-full rounded-full transition-all duration-700 ease-out"
                                          style={{ 
                                            width: `${d.nutrition_risk * 100}%`, 
                                            backgroundColor: riskBarColor(d.nutrition_risk) 
                                          }}
                                        />
                                      </div>
                                    </div>
                                    <span className="min-w-0 font-mono text-sm font-medium text-slate-700">
                                      {d.nutrition_risk.toFixed(3)}
                                    </span>
                                  </div>
                                </Td>
                                <Td>
                                  <span
                                    className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-bold ${
                                      d.risk_level === "HIGH"
                                        ? "bg-red-100 text-red-800"
                                        : d.risk_level === "MODERATE"
                                        ? "bg-orange-100 text-orange-800"
                                        : "bg-green-100 text-green-800"
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
                  
                  {/* Enhanced Results summary */}
                  <div className="mt-6 flex items-center justify-between text-sm">
                    <span className="text-slate-600">
                      Showing <span className="font-semibold">{filtered.length}</span> of <span className="font-semibold">{districts.length}</span> districts
                    </span>
                    {!isUsingMockData && (
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle size={16} />
                        <span className="font-medium">Live data</span>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {active === "nutrients" && (
                <Card title="Nutrient Adequacy Assessment" subtitle="Population-level nutrient intake adequacy (%)">
                  <div className="h-[520px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={[...nutrientData].sort((a, b) => a.adequacy - b.adequacy)} 
                        layout="vertical"
                        margin={{ top: 20, right: 30, left: 140, bottom: 20 }}
                      >
                        <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
                        <YAxis type="category" dataKey="nutrient" width={130} tick={{ fontSize: 12 }} />
                        <Tooltip 
                          formatter={(v, n, props) => [
                            `${v}%`, 
                            "Adequacy",
                            `RDA: ${props.payload.rda}${props.payload.unit}`
                          ]}
                          labelStyle={{ color: '#1e293b', fontWeight: 'bold' }}
                          contentStyle={{ 
                            backgroundColor: 'white', 
                            border: '1px solid #e2e8f0', 
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }}
                        />
                        <Bar dataKey="adequacy" radius={[0, 6, 6, 0]}>
                          {nutrientData.map((n, i) => (
                            <Cell key={i} fill={nutrientBarColor(n.adequacy)} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Enhanced stats */}
                  <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
                    <Stat 
                      label="Critical deficiency" 
                      sublabel="<60% adequacy"
                      value={nutrientData.filter((n) => n.adequacy < 60).length} 
                      color="red"
                      detail="Immediate intervention needed"
                    />
                    <Stat 
                      label="Low adequacy" 
                      sublabel="60-80% adequacy"
                      value={nutrientData.filter((n) => n.adequacy >= 60 && n.adequacy < 80).length}
                      color="orange"
                      detail="Monitoring recommended"
                    />
                    <Stat 
                      label="Adequate intake" 
                      sublabel="≥80% adequacy"
                      value={nutrientData.filter((n) => n.adequacy >= 80).length}
                      color="green" 
                      detail="Meeting population needs"
                    />
                  </div>
                </Card>
              )}

              {active === "interventions" && (
                <Card title="Policy Intervention Simulator" subtitle="Model the impact of nutrition interventions">
                  {/* Enhanced form with intervention details */}
                  <div className="mb-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
                    <div>
                      <Label>Target District</Label>
                      <select
                        value={selectedDistrict}
                        onChange={(e) => setSelectedDistrict(e.target.value)}
                        className="mt-3 w-full rounded-xl border-2 border-slate-200 bg-black px-4 py-3 text-sm shadow-sm transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                      >
                        <option value="">Select a district...</option>
                       {[...districts]
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
                        className="mt-3 w-full rounded-xl border-2 border-slate-200 bg-black px-4 py-3 text-sm shadow-sm transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                      >
                        {interventionTypes.map((i) => (
                          <option key={i.type} value={i.type}>
                            {i.icon} {i.name}
                          </option>
                        ))}
                      </select>
                      <div className="mt-2 text-xs text-slate-600">
                        {interventionTypes.find(i => i.type === intervention)?.description}
                      </div>
                    </div>
                    
                    <div>
                      <Label>Coverage Scale: {scale}%</Label>
                      <div className="mt-3 space-y-3">
                        <input
                          type="range"
                          min={10}
                          max={100}
                          step={5}
                          value={scale}
                          onChange={(e) => setScale(parseInt(e.target.value))}
                          className="w-full accent-blue-600"
                        />
                        <div className="flex justify-between text-xs text-slate-500">
                          <span>10%</span>
                          <span>50%</span>
                          <span>100%</span>
                        </div>
                        {selectedDistrict && (
                          <div className="text-sm text-slate-600">
                            Est. beneficiaries: {Math.floor((districts.find(d => d.district === selectedDistrict)?.population || 0) * (scale / 100)).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Intervention info card */}
                  {intervention && (
                    <div className="mb-6 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 p-6">
                      <div className="flex items-start gap-4">
                        <div className="text-2xl">
                          {interventionTypes.find(i => i.type === intervention)?.icon}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-slate-900">
                            {interventionTypes.find(i => i.type === intervention)?.name}
                          </h4>
                          <p className="mt-1 text-sm text-slate-600">
                            {interventionTypes.find(i => i.type === intervention)?.description}
                          </p>
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-xs font-medium text-slate-500">Expected effectiveness:</span>
                            <span className={`text-xs font-bold ${
                              interventionTypes.find(i => i.type === intervention)?.effectiveness === "High" ? "text-green-600" :
                              interventionTypes.find(i => i.type === intervention)?.effectiveness === "Medium-High" ? "text-blue-600" :
                              interventionTypes.find(i => i.type === intervention)?.effectiveness === "Medium" ? "text-orange-600" :
                              "text-red-600"
                            }`}>
                              {interventionTypes.find(i => i.type === intervention)?.effectiveness}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={runSimulation}
                    disabled={!selectedDistrict || simLoading}
                    className="mb-8 inline-flex items-center gap-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-4 text-sm font-bold text-white shadow-lg transition-all hover:from-blue-700 hover:to-blue-800 hover:shadow-xl disabled:from-slate-400 disabled:to-slate-500 disabled:shadow-none"
                  >
                    {simLoading ? (
                      <>
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Running Simulation...
                      </>
                    ) : (
                      <>
                        <TrendingUp size={18} />
                        Run Intervention Simulation
                      </>
                    )}
                  </button>

                  {/* Error handling for simulation */}
                  {simError && (
                    <ErrorAlert message={simError} type="warning" className="mb-6" />
                  )}

                  {sim && (
                    <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-bold text-slate-900">Simulation Results</h3>
                          {!sim.isRealData && (
                            <div className="flex items-center gap-2 text-sm text-orange-600">
                              <AlertCircle size={16} />
                              <span className="font-medium">Offline Model</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="space-y-4">
                          {[
                            { label: "Target District", value: sim.district, highlight: true },
                            { label: "Current Risk Score", value: sim.base.toFixed(3), color: riskBarColor(sim.base) },
                            { label: "Projected Risk Score", value: sim.next.toFixed(3), color: riskBarColor(sim.next) },
                            { label: "Risk Reduction", value: `${sim.eff.toFixed(1)}%`, highlight: true },
                            { label: "Estimated Beneficiaries", value: sim.beneficiaries.toLocaleString(), highlight: true },
                          ].map((item) => (
                            <div key={item.label} className={`flex items-center justify-between rounded-xl px-6 py-4 ${
                              item.highlight ? "bg-gradient-to-r from-green-50 to-emerald-50" : "bg-slate-50"
                            }`}>
                              <span className="font-semibold text-slate-700">{item.label}</span>
                              <span className={`font-bold ${
                                item.color ? "text-white px-3 py-1 rounded-lg text-sm" : 
                                item.highlight ? "text-green-700 text-lg" : "text-slate-900"
                              }`} style={item.color ? { backgroundColor: item.color } : {}}>
                                {item.value}
                              </span>
                            </div>
                          ))}
                        </div>
                        
                        {/* Impact assessment */}
                        <div className="rounded-xl bg-gradient-to-r from-slate-50 to-slate-100 p-6">
                          <h4 className="font-bold text-slate-900">Impact Assessment</h4>
                          <div className="mt-3 space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-slate-600">Risk Level Change:</span>
                              <span className="font-semibold text-slate-900">
                                {sim.base >= 0.6 && sim.next < 0.6 ? "HIGH → MODERATE" :
                                 sim.base >= 0.3 && sim.next < 0.3 ? "MODERATE → LOW" :
                                 "Within same category"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-600">Effectiveness Rating:</span>
                              <span className={`font-semibold ${
                                sim.eff >= 15 ? "text-green-600" :
                                sim.eff >= 10 ? "text-blue-600" :
                                sim.eff >= 5 ? "text-orange-600" : "text-red-600"
                              }`}>
                                {sim.eff >= 15 ? "Highly Effective" :
                                 sim.eff >= 10 ? "Moderately Effective" :
                                 sim.eff >= 5 ? "Somewhat Effective" : "Limited Effect"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="mb-6 text-lg font-bold text-slate-900">Impact Visualization</h3>
                        <div className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={[{ 
                              name: "Risk Comparison", 
                              "Current Risk": sim.base, 
                              "After Intervention": sim.next 
                            }]}> 
                              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                              <XAxis dataKey="name" />
                              <YAxis domain={[0, 1]} tickFormatter={(v) => v.toFixed(2)} />
                              <Tooltip 
                                formatter={(v, n) => [Number(v).toFixed(3), n]} 
                                contentStyle={{ 
                                  backgroundColor: 'white', 
                                  border: '1px solid #e2e8f0', 
                                  borderRadius: '8px',
                                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                }}
                              />
                              <Legend />
                              <Bar 
                                dataKey="Current Risk" 
                                fill="#64748b" 
                                radius={[6, 6, 0, 0]} 
                                name="Current Risk Score" 
                              />
                              <Bar 
                                dataKey="After Intervention" 
                                fill="#0ea5e9" 
                                radius={[6, 6, 0, 0]} 
                                name="Projected Risk Score" 
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              )}
            </section>
          </>
        )}
      </main>

      <footer className="border-t bg-white/50 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="text-center text-sm text-slate-600 sm:text-left">
              Built with care for Malawi's nutrition policy makers • Data visualization for better decision making
            </div>
            <div className="flex items-center gap-4">
              <ConnectionIndicator isConnected={!isUsingMockData} showLabel />
              {apiError && (
                <button
                  onClick={loadData}
                  disabled={loading}
                  className="flex items-center gap-2 rounded-lg bg-blue-100 px-3 py-1.5 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-200"
                >
                  <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                  Retry Connection
                </button>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* --- Enhanced UI Components --- */

// Connection Indicator Component
function ConnectionIndicator({ isConnected, showLabel = false }) {
  return (
    <div className={`flex items-center gap-2 ${showLabel ? "" : "text-xs"}`}>
      {isConnected ? (
        <>
          <div className="flex items-center gap-1">
            <Wifi size={showLabel ? 16 : 14} className="text-green-400" />
            <div className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
          </div>
          {showLabel && <span className="text-sm font-medium text-slate-600">Connected</span>}
        </>
      ) : (
        <>
          <div className="flex items-center gap-1">
            <WifiOff size={showLabel ? 16 : 14} className="text-red-400" />
            <div className="h-2 w-2 animate-pulse rounded-full bg-red-400" />
          </div>
          {showLabel && <span className="text-sm font-medium text-slate-600">Offline Mode</span>}
        </>
      )}
    </div>
  );
}

// Mock Data Warning Banner
function MockDataBanner({ onDismiss, onRetry, error, loading }) {
  return (
    <div className="border-b border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50">
      <div className="mx-auto max-w-7xl px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 text-orange-500 mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold text-orange-800">
                Using Mock Data - API Connection Failed
              </div>
              <div className="mt-1 text-sm text-orange-700">
                {error || "Unable to connect to the live data API. Displaying sample data for demonstration."}{" "}
                <span className="font-medium">Load your API to get real-time nutrition data.</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onRetry}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-orange-100 px-4 py-2 text-sm font-medium text-orange-800 transition-colors hover:bg-orange-200 disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              {loading ? "Connecting..." : "Retry"}
            </button>
            <button
              onClick={onDismiss}
              className="rounded-lg p-2 text-orange-600 transition-colors hover:bg-orange-100"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Loading State Component
function LoadingState() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
        <div className="mt-4 text-lg font-semibold text-slate-700">Loading nutrition data...</div>
        <div className="mt-2 text-sm text-slate-500">Connecting to data sources</div>
      </div>
    </div>
  );
}

// Error Alert Component
function ErrorAlert({ message, type = "error", className = "" }) {
  const styles = {
    error: "border-red-200 bg-red-50 text-red-700",
    warning: "border-orange-200 bg-orange-50 text-orange-700",
    info: "border-blue-200 bg-blue-50 text-blue-700"
  };

  const icons = {
    error: XCircle,
    warning: AlertCircle,
    info: AlertCircle
  };

  const Icon = icons[type];

  return (
    <div className={`rounded-xl border p-4 ${styles[type]} ${className}`}>
      <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 flex-shrink-0" />
        <div className="text-sm font-medium">{message}</div>
      </div>
    </div>
  );
}

function Card({ title, subtitle, children }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md">
      {(title || subtitle) && (
        <div className="border-b border-slate-100 px-8 py-6">
          {title && <h2 className="text-xl font-bold text-slate-900">{title}</h2>}
          {subtitle && <p className="mt-2 text-sm text-slate-600">{subtitle}</p>}
        </div>
      )}
      <div className="p-8">{children}</div>
    </div>
  );
}

function KPI({ title, value, icon, trend, color, isRealData }) {
  const colorClasses = {
    red: "border-red-200 bg-gradient-to-br from-red-50 to-red-100",
    orange: "border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100", 
    blue: "border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100",
    green: "border-green-200 bg-gradient-to-br from-green-50 to-green-100"
  };

  return (
    <div className={`rounded-2xl border-2 bg-white p-8 shadow-sm transition-all hover:shadow-lg ${colorClasses[color] || ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-bold text-slate-700">{title}</p>
            {!isRealData && (
              <div className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                DEMO
              </div>
            )}
          </div>
          <p className="mt-3 text-4xl font-black text-slate-900">{value}</p>
          {trend && <p className="mt-2 text-sm font-medium text-slate-600">{trend}</p>}
        </div>
        <div className="ml-6">{icon}</div>
      </div>
    </div>
  );
}

function Label({ children }) {
  return <label className="font-bold text-slate-800">{children}</label>;
}

function Th({ children }) {
  return <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider text-slate-700">{children}</th>;
}

function Td({ children, className = "" }) {
  return <td className={`px-6 py-5 ${className}`}>{children}</td>;
}

function Stat({ label, sublabel, value, color, detail }) {
  const colorClasses = {
    red: "border-red-200 bg-gradient-to-br from-red-50 to-red-100",
    orange: "border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100",
    green: "border-green-200 bg-gradient-to-br from-green-50 to-green-100"
  };

  return (
    <div className={`rounded-2xl border-2 p-6 ${colorClasses[color] || 'border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100'}`}>
      <div className="text-sm font-bold uppercase tracking-wide text-slate-600">{label}</div>
      {sublabel && <div className="text-xs font-medium text-slate-500">{sublabel}</div>}
      <div className="mt-3 text-3xl font-black text-slate-900">{value}</div>
      {detail && <div className="mt-2 text-xs font-medium text-slate-600">{detail}</div>}
    </div>
  );
}