import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Calculator,
  Camera,
  Image as ImageIcon,
  Ruler,
  Save,
  Timer,
  X,
} from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "../contexts/AuthContext.jsx";
import {
  ApiError,
  calculatePhysicalAssessment,
  calculateRunningCalories,
  calculateRunningPerformance,
  convertRunningDistance,
  createAssessment,
  getMyStudentProfile,
  listAssessments,
  listStudents,
} from "../lib/api.js";

const BRAZIL_TIME_ZONE = "America/Sao_Paulo";

const tabs = [
  { id: "physical", label: "Avaliacao fisica" },
  { id: "performance", label: "Corrida: desempenho" },
  { id: "calories", label: "Corrida: calorias" },
  { id: "converter", label: "Conversores" },
];

const targetPerformanceDistances = [1000, 3000, 5000, 10000, 21096.84, 42200];

function getTodayInBrazil() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BRAZIL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function readNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function formatValue(value, suffix = "") {
  if (value === null || value === undefined || value === "") return "-";
  if (value === "-") return "-";
  if (typeof value === "number") {
    return `${new Intl.NumberFormat("pt-BR", {
      maximumFractionDigits: 2,
    }).format(value)}${suffix}`;
  }
  return `${value}${suffix}`;
}

function formatDate(value) {
  if (!value) return "-";
  const raw = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const [year, month, day] = raw.slice(0, 10).split("-");
    return `${day}/${month}/${year}`;
  }
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: BRAZIL_TIME_ZONE,
  }).format(date);
}

function getErrorMessage(error) {
  if (error instanceof ApiError) return error.message;
  return error?.message || "Nao foi possivel concluir a operacao.";
}

function getCalculationMethodItems(method) {
  if (!method) return [];

  if (method === "US_NAVY_BODY_FAT_MIFFLIN_ST_JEOR_BMR") {
    return [
      { label: "Gordura corporal", value: "Marinha dos EUA" },
      { label: "TMB", value: "Mifflin-St Jeor" },
    ];
  }

  return [{ label: "Metodo", value: String(method).replaceAll("_", " ") }];
}

function readMetric(item, keys) {
  for (const key of keys) {
    const value = item?.[key];
    if (value !== undefined && value !== null && value !== "") {
      const parsed = Number(String(value).replace(",", "."));
      return Number.isFinite(parsed) ? parsed : null;
    }
  }
  return null;
}

function getAssessmentPhotos(assessment) {
  return Array.isArray(assessment?.photos)
    ? assessment.photos.filter(Boolean)
    : [];
}

function normalizeRows(result) {
  if (Array.isArray(result)) return result;
  const candidates = [
    result?.rows,
    result?.table,
    result?.results,
    result?.predictions,
    result?.estimates,
    result?.equivalents,
    result?.equivalentTimes,
    result?.targetResults,
    result?.targets,
    result?.paces,
  ];
  return candidates.find(Array.isArray) || [];
}

function pick(row, keys) {
  for (const key of keys) {
    if (row?.[key] !== undefined && row?.[key] !== null) return row[key];
  }
  return "-";
}

function SectionHeader({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md border border-[#b5f03c]/25 bg-[#b5f03c]/10 text-[#b5f03c]">
            <Icon size={16} />
          </span>
          <h2 className="text-lg font-semibold text-white">{title}</h2>
        </div>
        {subtitle && <p className="mt-2 text-sm text-white/50">{subtitle}</p>}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-white/55">
        {label}
      </span>
      {children}
    </label>
  );
}

function TextInput(props) {
  return (
    <input
      {...props}
      className={`h-10 w-full rounded-md border border-white/[0.08] bg-[#0b0b0b] px-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#b5f03c]/45 ${props.className || ""}`}
    />
  );
}

function SelectInput(props) {
  return (
    <select
      {...props}
      className={`h-10 w-full rounded-md border border-white/[0.08] bg-[#0b0b0b] px-3 text-sm text-white outline-none transition focus:border-[#b5f03c]/45 ${props.className || ""}`}
    />
  );
}

function ResultCards({ items }) {
  const visibleItems = items.filter((item) => item.value !== undefined);
  if (visibleItems.length === 0) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {visibleItems.map((item) => (
        <article
          key={item.label}
          className="rounded-md border border-white/[0.06] bg-white/[0.025] p-3"
        >
          <p className="text-xs text-white/42">{item.label}</p>
          <p className="mt-1 text-lg font-semibold text-white">
            {formatValue(item.value, item.suffix)}
          </p>
        </article>
      ))}
    </div>
  );
}

function RunningTable({ result }) {
  const rows = normalizeRows(result);
  if (rows.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-md border border-white/[0.06]">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-white/[0.04] text-xs uppercase tracking-[0.16em] text-white/38">
          <tr>
            <th className="px-3 py-3">Distancia</th>
            <th className="px-3 py-3">Tempo estimado</th>
            <th className="px-3 py-3">Ritmo/km</th>
            <th className="px-3 py-3">Ritmo/milha</th>
            <th className="px-3 py-3">Velocidade</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.05]">
          {rows.map((row, index) => (
            <tr key={row.id || `${pick(row, ["distanceMeters", "distance"])}-${index}`}>
              <td className="px-3 py-3 text-white/80">
                {pick(row, [
                  "distance",
                  "distanceLabel",
                  "targetDistance",
                  "targetDistanceLabel",
                  "distanceMeters",
                  "targetDistanceMeters",
                ])}
              </td>
              <td className="px-3 py-3 text-white/72">
                {pick(row, ["estimatedTime", "time", "timeFormatted"])}
              </td>
              <td className="px-3 py-3 text-white/72">
                {pick(row, ["pacePerKm", "paceKm", "pacePerKilometer"])}
              </td>
              <td className="px-3 py-3 text-white/72">
                {pick(row, ["pacePerMile", "paceMile"])}
              </td>
              <td className="px-3 py-3 text-white/72">
                {formatValue(pick(row, ["speedKmh", "speedKmH", "averageSpeedKmh"]), " km/h")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HistoryTable({ assessments, onSelect }) {
  if (!assessments.length) {
    return (
      <div className="rounded-md border border-white/[0.06] bg-white/[0.02] p-4 text-sm text-white/50">
        Nenhuma avaliacao registrada para este aluno.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-white/[0.06]">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-white/[0.04] text-xs uppercase tracking-[0.16em] text-white/38">
          <tr>
            <th className="px-3 py-3">Data</th>
            <th className="px-3 py-3">Peso</th>
            <th className="px-3 py-3">Altura</th>
            <th className="px-3 py-3">IMC</th>
            <th className="px-3 py-3">Gordura</th>
            <th className="px-3 py-3">Massa magra</th>
            <th className="px-3 py-3">Fotos</th>
            <th className="px-3 py-3">Obs.</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.05]">
          {assessments.map((item, index) => (
            <tr
              key={item.id || `${item.date}-${index}`}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(item)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(item);
                }
              }}
              className="cursor-pointer transition hover:bg-white/[0.035]"
            >
              <td className="px-3 py-3 text-white/80">{formatDate(item.date)}</td>
              <td className="px-3 py-3 text-white/70">
                {formatValue(item.weightKg ?? item.weight, " kg")}
              </td>
              <td className="px-3 py-3 text-white/70">
                {formatValue(item.heightCm ?? item.height, " cm")}
              </td>
              <td className="px-3 py-3 text-white/70">{formatValue(item.bmi)}</td>
              <td className="px-3 py-3 text-white/70">
                {formatValue(item.fatPercentage ?? item.fat, "%")}
              </td>
              <td className="px-3 py-3 text-white/70">
                {formatValue(item.leanMass, " kg")}
              </td>
              <td className="px-3 py-3 text-white/70">
                {getAssessmentPhotos(item).length > 0 ? (
                  <span className="inline-flex items-center gap-1 text-[#b5f03c]">
                    <ImageIcon size={14} />
                    {getAssessmentPhotos(item).length}
                  </span>
                ) : (
                  "-"
                )}
              </td>
              <td className="max-w-[220px] truncate px-3 py-3 text-white/50">
                {item.notes || "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AssessmentCharts({ data }) {
  if (data.length === 0) {
    return (
      <div className="rounded-md border border-white/[0.06] bg-white/[0.02] p-4 text-sm text-white/50">
        Salve avaliacoes para acompanhar a evolucao em graficos.
      </div>
    );
  }

  return (
    <div className="rounded-md border border-white/[0.06] bg-white/[0.015] p-4">
      <h2 className="text-base font-semibold text-white">Graficos de evolucao</h2>
      <div className="mt-4 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid stroke="#222" strokeDasharray="3 3" />
            <XAxis dataKey="date" stroke="#aaa" fontSize={12} />
            <YAxis stroke="#aaa" fontSize={12} />
            <Tooltip
              contentStyle={{
                background: "#0b0b0b",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 6,
                color: "#fff",
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="weight"
              stroke="#82ca9d"
              name="Peso (kg)"
              dot={false}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="fat"
              stroke="#8884d8"
              name="Gordura (%)"
              dot={false}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="leanMass"
              stroke="#facc15"
              name="Massa magra (kg)"
              dot={false}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="leanMassPercentage"
              stroke="#fb923c"
              name="Massa magra (%)"
              dot={false}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="fatWeight"
              stroke="#f43f5e"
              name="Peso gordura (kg)"
              dot={false}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function PhysicalAssessmentPage() {
  const { user, isPersonal } = useAuth();
  const [activeTab, setActiveTab] = useState("physical");
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [assessments, setAssessments] = useState([]);
  const [physicalResult, setPhysicalResult] = useState(null);
  const [performanceResult, setPerformanceResult] = useState(null);
  const [caloriesResult, setCaloriesResult] = useState(null);
  const [converterResult, setConverterResult] = useState(null);
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [showEvolutionPhotos, setShowEvolutionPhotos] = useState(false);
  const [message, setMessage] = useState("");
  const [loadingAction, setLoadingAction] = useState("");

  const [physicalForm, setPhysicalForm] = useState({
    sex: "M",
    age: "",
    weightKg: "",
    heightCm: "",
    waistCm: "",
    neckCm: "",
    hipCm: "",
    date: getTodayInBrazil(),
    notes: "",
    photos: [],
  });
  const [performanceForm, setPerformanceForm] = useState({
    distanceMeters: "3000",
    time: "00:15:15",
  });
  const [caloriesForm, setCaloriesForm] = useState({
    sex: "M",
    weightKg: "",
    distanceKm: "10",
    timeMinutes: "55",
    heightCm: "",
    age: "",
  });
  const [converterForm, setConverterForm] = useState({
    mode: "kilometers",
    value: "5",
  });

  const selectedStudent = useMemo(
    () => students.find((student) => String(student.id) === String(selectedStudentId)),
    [selectedStudentId, students],
  );

  const chartData = useMemo(() => {
    return assessments
      .slice()
      .sort((left, right) =>
        String(left.date || left.createdAt || "").localeCompare(
          String(right.date || right.createdAt || ""),
        ),
      )
      .map((item) => ({
        date: formatDate(item.date || item.createdAt),
        weight: readMetric(item, ["weightKg", "weight"]),
        fat: readMetric(item, ["fatPercentage", "fat"]),
        leanMass: readMetric(item, ["leanMass"]),
        leanMassPercentage: readMetric(item, ["leanMassPercentage"]),
        fatWeight: readMetric(item, ["fatWeight"]),
      }));
  }, [assessments]);

  const evolutionPhotos = useMemo(() => {
    const withPhotos = assessments
      .filter((assessment) => getAssessmentPhotos(assessment).length > 0)
      .slice()
      .sort((left, right) =>
        String(left.date || left.createdAt || "").localeCompare(
          String(right.date || right.createdAt || ""),
        ),
      );

    if (withPhotos.length === 0) {
      return { first: null, latest: null };
    }

    return {
      first: withPhotos[0],
      latest: withPhotos[withPhotos.length - 1],
    };
  }, [assessments]);

  useEffect(() => {
    let mounted = true;

    async function loadInitialData() {
      try {
        if (isPersonal) {
          const data = await listStudents();
          if (mounted) setStudents(Array.isArray(data) ? data : []);
          return;
        }

        const profile = await getMyStudentProfile();
        const ownId = String(profile?.id || user?.id || "");
        if (mounted) {
          setSelectedStudentId(ownId);
          setStudents(profile ? [profile] : []);
        }
      } catch (error) {
        if (mounted) setMessage(getErrorMessage(error));
      }
    }

    loadInitialData();
    return () => {
      mounted = false;
    };
  }, [isPersonal, user]);

  useEffect(() => {
    let mounted = true;

    async function loadHistory() {
      if (!selectedStudentId) {
        setAssessments([]);
        return;
      }

      try {
        const data = await listAssessments(selectedStudentId);
        if (mounted) setAssessments(Array.isArray(data) ? data : []);
      } catch (error) {
        if (mounted) {
          setAssessments([]);
          setMessage(getErrorMessage(error));
        }
      }
    }

    loadHistory();
    return () => {
      mounted = false;
    };
  }, [selectedStudentId]);

  function updatePhysical(changes) {
    setPhysicalForm((current) => ({ ...current, ...changes }));
  }

  function validatePhysical() {
    const required = ["sex", "age", "weightKg", "heightCm", "waistCm", "neckCm"];
    const missing = required.some((key) => !String(physicalForm[key] || "").trim());
    if (missing) return "Preencha sexo, idade, peso em kg, altura em cm, cintura e pescoco.";
    if (physicalForm.sex === "F" && !String(physicalForm.hipCm || "").trim()) {
      return "Para sexo feminino, quadril e obrigatorio.";
    }
    return "";
  }

  function buildPhysicalPayload() {
    const payload = {
      sex: physicalForm.sex,
      age: readNumber(physicalForm.age),
      weightKg: readNumber(physicalForm.weightKg),
      heightCm: readNumber(physicalForm.heightCm),
      waistCm: readNumber(physicalForm.waistCm),
      neckCm: readNumber(physicalForm.neckCm),
    };
    const hipCm = readNumber(physicalForm.hipCm);
    if (hipCm !== null) payload.hipCm = hipCm;
    return payload;
  }

  async function handleCalculatePhysical() {
    setMessage("");
    const validation = validatePhysical();
    if (validation) {
      setMessage(validation);
      return;
    }

    setLoadingAction("physical");
    try {
      const result = await calculatePhysicalAssessment(buildPhysicalPayload());
      setPhysicalResult(result);
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setLoadingAction("");
    }
  }

  async function handleSaveAssessment() {
    setMessage("");
    if (!selectedStudentId) {
      setMessage("Selecione um aluno antes de salvar a avaliacao.");
      return;
    }

    const validation = validatePhysical();
    if (validation) {
      setMessage(validation);
      return;
    }

    setLoadingAction("save-assessment");
    try {
      const saved = await createAssessment({
        alunoId: selectedStudentId,
        date: physicalForm.date,
        notes: physicalForm.notes,
        photos: physicalForm.photos,
        ...buildPhysicalPayload(),
      });
      setAssessments((current) => [saved?.assessment || saved, ...current]);
      setMessage("Avaliacao salva com sucesso.");
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setLoadingAction("");
    }
  }

  function isValidTime(value) {
    return /^(\d{1,2}:)?[0-5]?\d:[0-5]\d$/.test(String(value || ""));
  }

  async function handleRunning(kind) {
    setMessage("");
    setLoadingAction(kind);
    try {
      if (kind === "performance") {
        if (!performanceForm.distanceMeters || !isValidTime(performanceForm.time)) {
          setMessage("Tempo aceita hh:mm:ss ou mm:ss.");
          return;
        }
        const result = await calculateRunningPerformance({
          distanceMeters: readNumber(performanceForm.distanceMeters),
          time: performanceForm.time,
          targetDistancesMeters: targetPerformanceDistances,
        });
        setPerformanceResult(result);
      }

      if (kind === "calories") {
        const result = await calculateRunningCalories({
          sex: caloriesForm.sex,
          weightKg: readNumber(caloriesForm.weightKg),
          distanceKm: readNumber(caloriesForm.distanceKm),
          timeMinutes: readNumber(caloriesForm.timeMinutes),
          heightCm: readNumber(caloriesForm.heightCm),
          age: readNumber(caloriesForm.age),
        });
        setCaloriesResult(result);
      }

      if (kind === "converter") {
        const result = await convertRunningDistance({
          [converterForm.mode]: readNumber(converterForm.value),
        });
        setConverterResult(result);
      }
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setLoadingAction("");
    }
  }

  async function handlePhotoUpload(event) {
    const files = Array.from(event.target.files || []).slice(0, 3);
    if (files.length === 0) return;

    const photos = await Promise.all(
      files.map(
        (file) =>
          new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(file);
          }),
      ),
    );
    updatePhysical({ photos });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.32em] text-[#b5f03c]/70">
            Calculadoras
          </p>
          <h1 className="mt-2 text-2xl font-bold text-white">
            Avaliacao fisica e corrida
          </h1>
          <p className="mt-2 text-sm text-white/50">
            Altura sempre em cm, peso em kg e tempo em hh:mm:ss ou mm:ss.
          </p>
        </div>

        {isPersonal && (
          <div className="w-full sm:w-72">
            <Field label="Aluno">
              <SelectInput
                value={selectedStudentId}
                onChange={(event) => setSelectedStudentId(event.target.value)}
              >
                <option value="">Selecione para salvar historico</option>
                {students.map((student) => (
                  <option key={student.id} value={String(student.id)}>
                    {student.fullName || student.name || student.email || student.id}
                  </option>
                ))}
              </SelectInput>
            </Field>
          </div>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto border-b border-white/[0.06] pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`h-9 shrink-0 rounded-md px-3 text-sm font-semibold transition ${
              activeTab === tab.id
                ? "bg-[#b5f03c] text-black"
                : "border border-white/[0.07] bg-white/[0.025] text-white/62 hover:border-[#b5f03c]/35 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {message && (
        <div className="rounded-md border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
          {message}
        </div>
      )}

      {activeTab === "physical" && (
        <section className="space-y-5">
          <div className="rounded-md border border-white/[0.06] bg-white/[0.015] p-4">
            <SectionHeader
              icon={Calculator}
              title="Avaliacao fisica"
              subtitle="O backend calcula IMC, gordura, massas e TMB. No frontend fazemos apenas validacao basica."
            />

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Field label="Sexo">
                <SelectInput
                  value={physicalForm.sex}
                  onChange={(event) => updatePhysical({ sex: event.target.value })}
                >
                  <option value="M">Masculino</option>
                  <option value="F">Feminino</option>
                </SelectInput>
              </Field>
              <Field label="Idade">
                <TextInput
                  inputMode="numeric"
                  value={physicalForm.age}
                  onChange={(event) => updatePhysical({ age: event.target.value })}
                />
              </Field>
              <Field label="Peso em kg">
                <TextInput
                  inputMode="decimal"
                  value={physicalForm.weightKg}
                  onChange={(event) => updatePhysical({ weightKg: event.target.value })}
                />
              </Field>
              <Field label="Altura em cm">
                <TextInput
                  inputMode="decimal"
                  value={physicalForm.heightCm}
                  onChange={(event) => updatePhysical({ heightCm: event.target.value })}
                />
              </Field>
              <Field label="Cintura em cm">
                <TextInput
                  inputMode="decimal"
                  value={physicalForm.waistCm}
                  onChange={(event) => updatePhysical({ waistCm: event.target.value })}
                />
              </Field>
              <Field label="Pescoco em cm">
                <TextInput
                  inputMode="decimal"
                  value={physicalForm.neckCm}
                  onChange={(event) => updatePhysical({ neckCm: event.target.value })}
                />
              </Field>
              <Field label="Quadril em cm">
                <TextInput
                  inputMode="decimal"
                  placeholder={physicalForm.sex === "F" ? "Obrigatorio" : "Opcional"}
                  value={physicalForm.hipCm}
                  onChange={(event) => updatePhysical({ hipCm: event.target.value })}
                />
              </Field>
              <Field label="Data">
                <TextInput
                  type="date"
                  value={physicalForm.date}
                  onChange={(event) => updatePhysical({ date: event.target.value })}
                />
              </Field>
            </div>

            <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_auto]">
              <Field label="Observacoes">
                <TextInput
                  value={physicalForm.notes}
                  onChange={(event) => updatePhysical({ notes: event.target.value })}
                />
              </Field>
              <div className="flex items-end gap-2">
                <input
                  id="assessment-photos"
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={handlePhotoUpload}
                />
                <label
                  htmlFor="assessment-photos"
                  className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-white/[0.08] bg-white/[0.035] px-3 text-sm font-semibold text-white/75 transition hover:border-[#b5f03c]/35 hover:text-white"
                >
                  <Camera size={15} />
                  Fotos
                </label>
              </div>
            </div>

            {physicalForm.photos.length > 0 && (
              <p className="mt-2 text-xs text-white/45">
                {physicalForm.photos.length} foto(s) pronta(s) para salvar.
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleCalculatePhysical}
                disabled={loadingAction === "physical"}
                className="inline-flex h-10 items-center gap-2 rounded-md bg-[#b5f03c] px-4 text-sm font-bold text-black transition hover:brightness-110 disabled:opacity-50"
              >
                <Calculator size={15} />
                {loadingAction === "physical" ? "Calculando..." : "Calcular"}
              </button>
              {selectedStudentId && (
                <button
                  type="button"
                  onClick={handleSaveAssessment}
                  disabled={loadingAction === "save-assessment"}
                  className="inline-flex h-10 items-center gap-2 rounded-md border border-white/[0.08] bg-white/[0.04] px-4 text-sm font-bold text-white/78 transition hover:border-[#b5f03c]/35 hover:text-white disabled:opacity-50"
                >
                  <Save size={15} />
                  {loadingAction === "save-assessment"
                    ? "Salvando..."
                    : "Salvar avaliacao"}
                </button>
              )}
            </div>
          </div>

          {physicalResult && (
            <ResultCards
              items={[
                { label: "IMC", value: physicalResult.bmi },
                { label: "Classificacao", value: physicalResult.bmiClassification },
                { label: "Gordura", value: physicalResult.fatPercentage, suffix: "%" },
                { label: "Peso de gordura", value: physicalResult.fatWeight, suffix: " kg" },
                { label: "Massa magra", value: physicalResult.leanMass, suffix: " kg" },
                {
                  label: "Massa magra",
                  value: physicalResult.leanMassPercentage,
                  suffix: "%",
                },
                {
                  label: "TMB",
                  value: physicalResult.basalMetabolicRate,
                  suffix: " kcal",
                },
                ...getCalculationMethodItems(physicalResult.calculationMethod),
              ]}
            />
          )}

          <AssessmentCharts data={chartData} />

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-white">Historico</h2>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <p className="text-xs text-white/42">
                  {selectedStudent?.fullName || selectedStudent?.name || ""}
                </p>
                <button
                  type="button"
                  onClick={() => setShowEvolutionPhotos(true)}
                  disabled={!evolutionPhotos.first}
                  className="inline-flex h-8 items-center gap-2 rounded-md border border-white/[0.08] bg-white/[0.035] px-3 text-xs font-semibold text-white/70 transition hover:border-[#b5f03c]/35 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ImageIcon size={14} />
                  Ver evolucao
                </button>
              </div>
            </div>
            <HistoryTable
              assessments={assessments}
              onSelect={setSelectedAssessment}
            />
          </div>
        </section>
      )}

      {activeTab === "performance" && (
        <section className="space-y-5 rounded-md border border-white/[0.06] bg-white/[0.015] p-4">
          <SectionHeader
            icon={Activity}
            title="Corrida: desempenho"
            subtitle="Informe uma prova base para estimar outros tempos."
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Distancia em metros">
              <TextInput
                inputMode="decimal"
                value={performanceForm.distanceMeters}
                onChange={(event) =>
                  setPerformanceForm((current) => ({
                    ...current,
                    distanceMeters: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Tempo">
              <TextInput
                value={performanceForm.time}
                onChange={(event) =>
                  setPerformanceForm((current) => ({
                    ...current,
                    time: event.target.value,
                  }))
                }
              />
            </Field>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => handleRunning("performance")}
                className="inline-flex h-10 items-center gap-2 rounded-md bg-[#b5f03c] px-4 text-sm font-bold text-black"
              >
                <Timer size={15} />
                Calcular
              </button>
            </div>
          </div>
          <RunningTable result={performanceResult} />
        </section>
      )}

      {activeTab === "calories" && (
        <section className="space-y-5 rounded-md border border-white/[0.06] bg-white/[0.015] p-4">
          <SectionHeader
            icon={Activity}
            title="Corrida: calorias"
            subtitle="Mostra calorias da corrida, TMB, total basal + corrida e velocidade media."
          />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <Field label="Sexo">
              <SelectInput
                value={caloriesForm.sex}
                onChange={(event) =>
                  setCaloriesForm((current) => ({ ...current, sex: event.target.value }))
                }
              >
                <option value="M">Masculino</option>
                <option value="F">Feminino</option>
              </SelectInput>
            </Field>
            <Field label="Peso em kg">
              <TextInput
                inputMode="decimal"
                value={caloriesForm.weightKg}
                onChange={(event) =>
                  setCaloriesForm((current) => ({
                    ...current,
                    weightKg: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Distancia em km">
              <TextInput
                inputMode="decimal"
                value={caloriesForm.distanceKm}
                onChange={(event) =>
                  setCaloriesForm((current) => ({
                    ...current,
                    distanceKm: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Tempo em min">
              <TextInput
                inputMode="decimal"
                value={caloriesForm.timeMinutes}
                onChange={(event) =>
                  setCaloriesForm((current) => ({
                    ...current,
                    timeMinutes: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Altura em cm">
              <TextInput
                inputMode="decimal"
                value={caloriesForm.heightCm}
                onChange={(event) =>
                  setCaloriesForm((current) => ({
                    ...current,
                    heightCm: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Idade">
              <TextInput
                inputMode="numeric"
                value={caloriesForm.age}
                onChange={(event) =>
                  setCaloriesForm((current) => ({ ...current, age: event.target.value }))
                }
              />
            </Field>
          </div>
          <button
            type="button"
            onClick={() => handleRunning("calories")}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-[#b5f03c] px-4 text-sm font-bold text-black"
          >
            <Activity size={15} />
            Calcular
          </button>
          {caloriesResult && (
            <ResultCards
              items={[
                {
                  label: "Calorias da corrida",
                  value:
                    caloriesResult.runningCalories ??
                    caloriesResult.calories ??
                    caloriesResult.runCalories,
                  suffix: " kcal",
                },
                {
                  label: "TMB",
                  value:
                    caloriesResult.basalMetabolicRate ?? caloriesResult.bmr,
                  suffix: " kcal",
                },
                {
                  label: "Total basal + corrida",
                  value:
                    caloriesResult.totalCalories ??
                    caloriesResult.totalBasalPlusRunning,
                  suffix: " kcal",
                },
                {
                  label: "Velocidade media",
                  value:
                    caloriesResult.averageSpeedKmh ??
                    caloriesResult.speedKmh ??
                    caloriesResult.speedKmH,
                  suffix: " km/h",
                },
              ]}
            />
          )}
        </section>
      )}

      {activeTab === "converter" && (
        <section className="space-y-5 rounded-md border border-white/[0.06] bg-white/[0.015] p-4">
          <SectionHeader
            icon={Ruler}
            title="Conversores"
            subtitle="Converta quilometros e milhas pelo endpoint do backend."
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Entrada">
              <SelectInput
                value={converterForm.mode}
                onChange={(event) =>
                  setConverterForm((current) => ({
                    ...current,
                    mode: event.target.value,
                  }))
                }
              >
                <option value="kilometers">Quilometros</option>
                <option value="miles">Milhas</option>
              </SelectInput>
            </Field>
            <Field label="Valor">
              <TextInput
                inputMode="decimal"
                value={converterForm.value}
                onChange={(event) =>
                  setConverterForm((current) => ({
                    ...current,
                    value: event.target.value,
                  }))
                }
              />
            </Field>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => handleRunning("converter")}
                className="inline-flex h-10 items-center gap-2 rounded-md bg-[#b5f03c] px-4 text-sm font-bold text-black"
              >
                <Ruler size={15} />
                Converter
              </button>
            </div>
          </div>
          {converterResult && (
            <ResultCards
              items={[
                {
                  label: "Quilometros",
                  value: converterResult.kilometers ?? converterResult.km,
                  suffix: " km",
                },
                {
                  label: "Milhas",
                  value: converterResult.miles,
                  suffix: " mi",
                },
              ]}
            />
          )}
        </section>
      )}

      {showEvolutionPhotos && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 py-8">
          <section className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-md border border-white/[0.08] bg-[#0b0b0b] p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-white/40">
                  Evolucao por fotos
                </p>
                <h2 className="mt-1 text-xl font-semibold text-white">
                  {selectedStudent?.fullName || selectedStudent?.name || "Aluno"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowEvolutionPhotos(false)}
                className="rounded-md border border-white/[0.08] p-2 text-white/60 transition hover:bg-white/[0.05] hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {evolutionPhotos.first && evolutionPhotos.latest ? (
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {[
                  { label: "Primeira foto", assessment: evolutionPhotos.first },
                  { label: "Ultimo historico", assessment: evolutionPhotos.latest },
                ].map((item) => (
                  <article
                    key={item.label}
                    className="rounded-md border border-white/[0.06] bg-white/[0.02] p-3"
                  >
                    <p className="text-xs uppercase tracking-[0.2em] text-white/40">
                      {item.label}
                    </p>
                    <p className="mt-1 text-sm text-white/65">
                      {formatDate(item.assessment.date || item.assessment.createdAt)}
                    </p>
                    <img
                      src={getAssessmentPhotos(item.assessment)[0]}
                      alt={item.label}
                      className="mt-3 max-h-[62vh] w-full rounded-md border border-white/[0.06] object-contain"
                    />
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-md border border-white/[0.06] bg-white/[0.02] p-4 text-sm text-white/55">
                Nenhuma foto encontrada nos historicos salvos.
              </div>
            )}
          </section>
        </div>
      )}

      {selectedAssessment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 py-8">
          <section className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-md border border-white/[0.08] bg-[#0b0b0b] p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-white/40">
                  Avaliacao salva
                </p>
                <h2 className="mt-1 text-xl font-semibold text-white">
                  {formatDate(selectedAssessment.date || selectedAssessment.createdAt)}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAssessment(null)}
                className="rounded-md border border-white/[0.08] p-2 text-white/60 transition hover:bg-white/[0.05] hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5">
              <ResultCards
                items={[
                  {
                    label: "Peso",
                    value: selectedAssessment.weightKg ?? selectedAssessment.weight,
                    suffix: " kg",
                  },
                  {
                    label: "Altura",
                    value: selectedAssessment.heightCm ?? selectedAssessment.height,
                    suffix: " cm",
                  },
                  { label: "IMC", value: selectedAssessment.bmi },
                  {
                    label: "Gordura",
                    value:
                      selectedAssessment.fatPercentage ?? selectedAssessment.fat,
                    suffix: "%",
                  },
                  {
                    label: "Massa magra",
                    value: selectedAssessment.leanMass,
                    suffix: " kg",
                  },
                  {
                    label: "TMB",
                    value: selectedAssessment.basalMetabolicRate,
                    suffix: " kcal",
                  },
                ]}
              />
            </div>

            {selectedAssessment.notes && (
              <div className="mt-4 rounded-md border border-white/[0.06] bg-white/[0.02] p-3">
                <p className="text-xs text-white/40">Observacoes</p>
                <p className="mt-1 text-sm leading-6 text-white/75">
                  {selectedAssessment.notes}
                </p>
              </div>
            )}

            <div className="mt-5">
              <h3 className="font-semibold text-white">Fotos</h3>
              {getAssessmentPhotos(selectedAssessment).length > 0 ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {getAssessmentPhotos(selectedAssessment).map((photo, index) => (
                    <img
                      key={`${photo}-${index}`}
                      src={photo}
                      alt={`foto-avaliacao-${index + 1}`}
                      className="max-h-96 w-full rounded-md border border-white/[0.06] object-contain"
                    />
                  ))}
                </div>
              ) : (
                <div className="mt-3 rounded-md border border-white/[0.06] bg-white/[0.02] p-4 text-sm text-white/50">
                  Nenhuma foto registrada nesta avaliacao.
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
