import { useEffect, useState, useMemo } from "react";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useI18n } from "../contexts/I18nContext.jsx";
import {
  listStudents,
  getMyStudentProfile,
  listAssessments,
  createAssessment,
  deleteAssessment,
  updateStudent,
  updateMyProfile,
} from "../lib/api.js";
import {
  Camera,
  Image as ImageIcon,
  X,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const BRAZIL_TIME_ZONE = "America/Sao_Paulo";

function getTodayInBrazil() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BRAZIL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

function toBrazilDateInputValue(value) {
  if (!value) return "";
  const raw = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw.slice(0, 10);

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BRAZIL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

function formatBrazilDate(value) {
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

export default function PhysicalAssessmentPage() {
  const { user, isPersonal } = useAuth();
  const { t } = useI18n();

  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [profile, setProfile] = useState(null);
  const [assessments, setAssessments] = useState([]);
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [showEvolutionPhotos, setShowEvolutionPhotos] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [form, setForm] = useState({
    date: getTodayInBrazil(),
    weight: "",
    height: "",
    leanMass: "",
    leanMassPercentage: "",
    fatWeight: "",
    gender: "",
    fat: "",
    photos: [],
    notes: "",
  });

  const isInitialProfileComplete = (candidate) =>
    Boolean(
      (candidate?.fullName || candidate?.name || "").trim() &&
        (candidate?.birthDate || candidate?.birthdate) &&
        (candidate?.gender || "").trim(),
    );

  const getDateInputValue = (value) => {
    return toBrazilDateInputValue(value);
  };

  const profilePhoto = profile?.photo || profile?.photoUrl || null;
  const profileName =
    profile?.fullName || profile?.name || user?.email || "Aluno";
  const showProfileForm =
    Boolean(profile) && (!profile.profileCompleted || isEditingProfile);
  const selectedPhotos = Array.isArray(selectedAssessment?.photos)
    ? selectedAssessment.photos
    : [];

  const formatAssessmentDate = (value) => {
    if (!value) return "-";
    return formatBrazilDate(value);
  };

  useEffect(() => {
    async function load() {
      if (isPersonal) {
        try {
          const data = await listStudents();
          setStudents(Array.isArray(data) ? data : []);
        } catch {
          setStudents([]);
        }
      } else {
        // client: load own profile
        try {
          const p = await getMyStudentProfile();
          setSelectedStudentId(String(p?.id || user?.id));
          setProfile(p || null);
          const a = await listAssessments(p?.id || user?.id);
          setAssessments(Array.isArray(a) ? a : []);
        } catch {
          const id = user?.id || "me";
          setSelectedStudentId(String(id));
          setProfile(null);
          setAssessments([]);
        }
      }
    }

    load();
  }, [isPersonal, user]);

  useEffect(() => {
    if (!selectedStudentId) return;
    // if admin, try to find profile in students list
    (async () => {
      try {
        const found = students.find(
          (s) => String(s.id) === String(selectedStudentId),
        );
        if (found) setProfile(found);

        const a = await listAssessments(selectedStudentId);
        setAssessments(Array.isArray(a) ? a : []);
      } catch {
        setAssessments([]);
      }
    })();
  }, [selectedStudentId, students]);

  const chartData = useMemo(() => {
    const arr = (assessments || [])
      .slice()
      .reverse()
      .map((it) => ({
        date: toBrazilDateInputValue(it.date),
        weight: it.weight ? Number(it.weight) : null,
        leanMass: it.leanMass ? Number(it.leanMass) : null,
        leanMassPercentage: it.leanMassPercentage
          ? Number(it.leanMassPercentage)
          : null,
        fatWeight: it.fatWeight ? Number(it.fatWeight) : null,
        fat: it.fatPercentage ?? (it.fat ? Number(it.fat) : null),
      }));

    return arr;
  }, [assessments]);

  const evolutionPhotos = useMemo(() => {
    const withPhotos = (assessments || [])
      .filter((assessment) => Array.isArray(assessment.photos) && assessment.photos[0])
      .slice()
      .sort((a, b) => {
        const left = toBrazilDateInputValue(a.date || a.createdAt);
        const right = toBrazilDateInputValue(b.date || b.createdAt);
        if (!left) return 1;
        if (!right) return -1;
        return left.localeCompare(right);
      });

    if (withPhotos.length === 0) {
      return { first: null, latest: null };
    }

    return {
      first: withPhotos[0],
      latest: withPhotos[withPhotos.length - 1],
    };
  }, [assessments]);

  // Compress image to reduce payload size
  async function compressImage(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;

          // Resize if larger than 1200px
          if (width > 1200 || height > 1200) {
            const ratio = Math.min(1200 / width, 1200 / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          // Compress to JPEG with 70% quality
          const compressed = canvas.toDataURL("image/jpeg", 0.7);
          resolve(compressed);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function handleProfileChange(changes) {
    const updated = { ...(profile || {}), ...changes };
    const profileCompleted =
      updated.profileCompleted || isInitialProfileComplete(updated);
    setProfile({ ...updated, profileCompleted });

    // persist to backend
    (async () => {
      try {
        const payload = {
          fullName: updated.name || updated.fullName || undefined,
          birthDate: updated.birthdate || updated.birthDate || undefined,
          gender: updated.gender || undefined,
          photoUrl: updated.photo || updated.photoUrl || undefined,
          profileCompleted,
        };

        if (isPersonal && selectedStudentId) {
          const saved = await updateStudent(selectedStudentId, payload);
          setProfile(saved || { ...updated, profileCompleted });
        } else {
          const saved = await updateMyProfile(payload);
          setProfile(saved || { ...updated, profileCompleted });
        }
      } catch {
        // ignore for now; could add toast
      }
    })();
  }

  function handlePhotoUpload(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Limit to 3 photos max
    const filesToProcess = files.slice(0, 3);

    Promise.all(
      filesToProcess.map(async (file) => {
        // Validate file size (max 5MB per file before compression)
        if (file.size > 5 * 1024 * 1024) {
          console.warn("File too large, will be compressed");
        }
        return compressImage(file);
      }),
    ).then((results) => {
      // Save photos array to profile (first use-case)
      handleProfileChange({ photo: results[0], photos: results });
    });
  }

  function handleAddAssessment() {
    if (!selectedStudentId) return;
    // validation
    if (!form.date) return;
    if (
      !form.weight &&
      !form.height &&
      !form.fat &&
      !form.leanMass &&
      !form.leanMassPercentage &&
      !form.fatWeight
    ) {
      return;
    }

    const entry = { ...form };

    (async () => {
      try {
        const payload = {
          alunoId: selectedStudentId,
          date: entry.date,
          weight: entry.weight
            ? parseFloat(String(entry.weight).replace(",", "."))
            : null,
          height: entry.height
            ? parseFloat(String(entry.height).replace(",", "."))
            : null,
          leanMass: entry.leanMass
            ? parseFloat(String(entry.leanMass).replace(",", "."))
            : null,
          leanMassPercentage: entry.leanMassPercentage
            ? parseFloat(String(entry.leanMassPercentage).replace(",", "."))
            : null,
          fatWeight: entry.fatWeight
            ? parseFloat(String(entry.fatWeight).replace(",", "."))
            : null,
          fatPercentage: entry.fat
            ? parseFloat(String(entry.fat).replace(",", "."))
            : null,
          notes: entry.notes,
          photos: Array.isArray(entry.photos) ? entry.photos : [],
        };

        const created = await createAssessment(payload);
        const nextAssessment = created || entry;
        setAssessments((s) => [nextAssessment, ...s]);
        setSelectedAssessment(nextAssessment);
      } catch {
        // fallback to local state
        setAssessments((s) => [entry, ...s]);
        setSelectedAssessment(entry);
      }
    })();
  }

  function handleDeleteAssessment(id) {
    if (!selectedStudentId) return;
    (async () => {
      try {
        await deleteAssessment(id);
        setAssessments((s) => s.filter((a) => a.id !== id));
        setSelectedAssessment((current) =>
          current?.id === id ? null : current,
        );
      } catch {
        // optimistic local delete
        setAssessments((s) => s.filter((a) => a.id !== id));
        setSelectedAssessment((current) =>
          current?.id === id ? null : current,
        );
      }
    })();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">
        {t("PHYS_ASSESS_TITLE", "Avaliação Física")}
      </h1>

      {isPersonal && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-white/70 mb-2">
            {t("SELECT_STUDENT", "Selecionar aluno")}
          </label>
          <select
            className="rounded-md bg-[#0b0b0b] border border-white/[0.06] px-3 py-2"
            value={selectedStudentId || ""}
            onChange={(e) => {
              setIsEditingProfile(false);
              setSelectedStudentId(e.target.value);
            }}
          >
            <option value="">— {t("CHOOSE", "Escolher")} —</option>
            {students.map((s) => (
              <option key={s.id} value={String(s.id)}>
                {s.fullName || s.name || s.email || s.id}
              </option>
            ))}
          </select>
        </div>
      )}

      {!selectedStudentId && (
        <p className="text-sm text-white/50">
          {t("NO_STUDENT_SELECTED", "Nenhum aluno selecionado")}
        </p>
      )}

      {selectedStudentId && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {profile && (
            <section className="lg:col-span-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-4">
                <div className="h-20 w-20 overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.04]">
                  {profilePhoto ? (
                    <img
                      src={profilePhoto}
                      alt={profileName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-white/35">
                      {t("NO_PHOTO", "Sem foto")}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-white/40">
                    {t("PROFILE", "Perfil")}
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-white">
                    {profileName}
                  </h2>
                  <p className="mt-1 text-sm text-white/50">
                    {profile?.gender || t("GENDER", "Genero")}
                    {profile?.birthDate || profile?.birthdate
                      ? ` - ${formatAssessmentDate(profile.birthDate || profile.birthdate)}`
                      : ""}
                  </p>
                </div>
                </div>
                {isPersonal && (
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile((current) => !current)}
                    className="rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm font-semibold text-white/80 transition hover:border-[#b5f03c]/40 hover:bg-white/[0.07]"
                  >
                    {isEditingProfile
                      ? t("CLOSE", "Fechar")
                      : t("EDIT_PROFILE", "Editar cadastro")}
                  </button>
                )}
              </div>
            </section>
          )}

          {showProfileForm && (
            <div className="col-span-1 rounded-lg border border-white/[0.06] bg-white/[0.01] p-4">
              <h2 className="font-semibold mb-3">
                {profile.profileCompleted
                  ? t("EDIT_PROFILE", "Editar cadastro")
                  : t("PROFILE", "Cadastro inicial")}
              </h2>
              <div className="flex flex-col items-center gap-3">
                <div className="h-28 w-28 rounded-lg overflow-hidden bg-white/5">
                  {profile?.photo || profile?.photoUrl ? (
                    <img
                      src={profile.photo || profile.photoUrl}
                      alt="foto"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-white/30">
                      {t("NO_PHOTO", "Sem foto")}
                    </div>
                  )}
                </div>
                <input
                  id="profile-photo-upload"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  className="sr-only"
                />
                <label
                  htmlFor="profile-photo-upload"
                  className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm font-semibold text-white/80 transition hover:border-[#b5f03c]/40 hover:bg-white/[0.07]"
                >
                  <Camera size={16} className="text-[#b5f03c]" />
                  {t("ADD_PHOTO", "Adicionar foto")}
                </label>

                <label className="block w-full">
                  <div className="text-xs text-white/60">
                    {t("NAME", "Nome")}
                  </div>
                  <input
                    value={profile?.name || profile?.fullName || ""}
                    onChange={(e) =>
                      handleProfileChange({ name: e.target.value })
                    }
                    className="w-full rounded-md bg-[#0b0b0b] border border-white/[0.06] px-3 py-2 mt-1"
                  />
                </label>

                <label className="block w-full">
                  <div className="text-xs text-white/60">
                    {t("BIRTHDATE", "Data de nascimento")}
                  </div>
                  <input
                    type="date"
                    value={getDateInputValue(
                      profile?.birthdate || profile?.birthDate,
                    )}
                    onChange={(e) =>
                      handleProfileChange({ birthdate: e.target.value })
                    }
                    className="w-full rounded-md bg-[#0b0b0b] border border-white/[0.06] px-3 py-2 mt-1"
                  />
                </label>

                <label className="block w-full">
                  <div className="text-xs text-white/60">
                    {t("GENDER", "Gênero")}
                  </div>
                  <input
                    value={profile?.gender || ""}
                    onChange={(e) =>
                      handleProfileChange({ gender: e.target.value })
                    }
                    className="w-full rounded-md bg-[#0b0b0b] border border-white/[0.06] px-3 py-2 mt-1"
                  />
                </label>
              </div>
            </div>
          )}

          <div
            className={`${showProfileForm ? "col-span-2" : "col-span-3"} rounded-lg border border-white/[0.06] bg-white/[0.01] p-4`}
          >
            <h2 className="font-semibold mb-3">
              {t("ASSESSMENT", "Nova avaliação")}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <input
                type="date"
                value={form.date}
                onChange={(e) =>
                  setForm((s) => ({ ...s, date: e.target.value }))
                }
                className="rounded-md bg-[#0b0b0b] border border-white/[0.06] px-3 py-2"
              />
              <input
                inputMode="decimal"
                placeholder={t("WEIGHT", "Peso (kg)")}
                value={form.weight}
                onChange={(e) =>
                  setForm((s) => ({ ...s, weight: e.target.value }))
                }
                className="rounded-md bg-[#0b0b0b] border border-white/[0.06] px-3 py-2"
              />
              <input
                inputMode="decimal"
                placeholder={t("HEIGHT", "Altura (m)")}
                value={form.height}
                onChange={(e) =>
                  setForm((s) => ({ ...s, height: e.target.value }))
                }
                className="rounded-md bg-[#0b0b0b] border border-white/[0.06] px-3 py-2"
              />
              <input
                inputMode="decimal"
                placeholder={t("LEAN_MASS", "Massa magra (kg)")}
                value={form.leanMass}
                onChange={(e) =>
                  setForm((s) => ({ ...s, leanMass: e.target.value }))
                }
                className="rounded-md bg-[#0b0b0b] border border-white/[0.06] px-3 py-2"
              />
              <input
                inputMode="decimal"
                placeholder={t("LEAN_MASS_PERCENTAGE", "Massa magra (%)")}
                value={form.leanMassPercentage}
                onChange={(e) =>
                  setForm((s) => ({
                    ...s,
                    leanMassPercentage: e.target.value,
                  }))
                }
                className="rounded-md bg-[#0b0b0b] border border-white/[0.06] px-3 py-2"
              />
              <input
                inputMode="decimal"
                placeholder={t("FAT_WEIGHT", "Peso de gordura (kg)")}
                value={form.fatWeight}
                onChange={(e) =>
                  setForm((s) => ({ ...s, fatWeight: e.target.value }))
                }
                className="rounded-md bg-[#0b0b0b] border border-white/[0.06] px-3 py-2"
              />
              <input
                inputMode="decimal"
                placeholder={t("FAT", "Gordura (%)")}
                value={form.fat}
                onChange={(e) =>
                  setForm((s) => ({ ...s, fat: e.target.value }))
                }
                className="rounded-md bg-[#0b0b0b] border border-white/[0.06] px-3 py-2"
              />
              {/* Age removed per request */}
              <input
                placeholder={t("NOTES", "Observações")}
                value={form.notes}
                onChange={(e) =>
                  setForm((s) => ({ ...s, notes: e.target.value }))
                }
                className="rounded-md bg-[#0b0b0b] border border-white/[0.06] px-3 py-2"
              />
              <div className="flex items-center gap-3">
                <input
                  id="assessment-photo-upload"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length === 0) return;

                    // Limit to 3 photos max
                    const filesToProcess = files.slice(0, 3);

                    Promise.all(
                      filesToProcess.map(async (file) => {
                        if (file.size > 5 * 1024 * 1024) {
                          console.warn("File too large, will be compressed");
                        }
                        return compressImage(file);
                      }),
                    ).then((results) => {
                      setForm((s) => ({ ...s, photos: results }));
                    });
                  }}
                  className="sr-only"
                />
                <label
                  htmlFor="assessment-photo-upload"
                  className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm font-semibold text-white/80 transition hover:border-[#b5f03c]/40 hover:bg-white/[0.07]"
                >
                  <Camera size={16} className="text-[#b5f03c]" />
                  {t("ADD_PHOTO", "Adicionar foto")}
                </label>
                {form.photos.length > 0 && (
                  <span className="text-xs text-white/45">
                    {form.photos.length}{" "}
                    {form.photos.length === 1 ? "foto" : "fotos"}
                  </span>
                )}
              </div>
            </div>
            {Array.isArray(form.photos) && form.photos.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {form.photos.map((photo, index) => (
                  <img
                    key={`${photo}-${index}`}
                    src={photo}
                    alt={`preview-${index + 1}`}
                    className="h-16 w-16 rounded-md border border-white/[0.06] object-cover"
                  />
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleAddAssessment}
                disabled={!selectedStudentId || !form.date}
                className="rounded-md bg-[#b5f03c] px-4 py-2 text-black font-semibold disabled:opacity-40"
              >
                {t("SAVE", "Salvar")}
              </button>
            </div>

            <hr className="my-4 border-white/[0.04]" />

            <h3 className="font-semibold mb-2">{t("HISTORY", "Histórico")}</h3>
            {assessments.length === 0 && (
              <p className="text-sm text-white/50">
                {t("NO_HISTORY", "Nenhuma avaliação registrada")}
              </p>
            )}

            <div className="space-y-2">
              {assessments.map((a) => (
                <div
                  role="button"
                  tabIndex={0}
                  key={a.id}
                  onClick={() => setSelectedAssessment(a)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedAssessment(a);
                    }
                  }}
                  className="flex w-full items-center justify-between rounded-md border border-white/[0.04] p-3 text-left transition hover:border-[#b5f03c]/35 hover:bg-white/[0.03]"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md border border-white/[0.05] bg-white/[0.03]">
                      {Array.isArray(a.photos) && a.photos[0] ? (
                        <img
                          src={a.photos[0]}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : profilePhoto ? (
                        <img
                          src={profilePhoto}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-white/25">
                          <ImageIcon size={16} />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium">
                        {formatAssessmentDate(a.date)}
                      </div>
                      <div className="text-xs text-white/50">
                        {t("WEIGHT", "Peso")}: {a.weight} kg —{" "}
                        {t("HEIGHT", "Altura")}: {a.height} —{" "}
                        {t("LEAN_MASS", "Massa magra")}: {a.leanMass ?? "-"} kg
                        — {t("LEAN_MASS_PERCENTAGE", "Massa magra")}:
                        {a.leanMassPercentage ?? "-"}% —{" "}
                        {t("FAT_WEIGHT", "Peso gordura")}: {a.fatWeight ?? "-"}{" "}
                        kg — {t("FAT", "Gordura")}: {a.fatPercentage ?? a.fat}%
                      </div>
                      {a.notes && (
                        <div className="text-xs text-white/40 mt-1">
                          {a.notes}
                        </div>
                      )}
                    </div>
                  </div>
                  {isPersonal && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDeleteAssessment(a.id);
                        }}
                        className="text-xs text-red-400"
                      >
                        {t("DELETE", "Excluir")}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6">
              <h3 className="font-semibold mb-2">
                {t("EVOLUTION", "Evolução")}
              </h3>
              <div style={{ width: "100%", height: 240 }}>
                <ResponsiveContainer>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                    <XAxis dataKey="date" stroke="#aaa" />
                    <YAxis stroke="#aaa" />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="weight"
                      stroke="#82ca9d"
                      name={t("WEIGHT", "Peso (kg)")}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="fat"
                      stroke="#8884d8"
                      name={t("FAT", "Gordura (%)")}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="leanMass"
                      stroke="#facc15"
                      name={t("LEAN_MASS", "Massa magra (kg)")}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="leanMassPercentage"
                      stroke="#fb923c"
                      name={t("LEAN_MASS_PERCENTAGE", "Massa magra (%)")}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="fatWeight"
                      stroke="#f43f5e"
                      name={t("FAT_WEIGHT", "Peso de gordura (kg)")}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowEvolutionPhotos(true)}
                  className="rounded-md bg-[#b5f03c] px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110"
                >
                  {t("VIEW_EVOLUTION", "Ver evolução")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEvolutionPhotos && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8">
          <section className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-lg border border-white/[0.08] bg-[#0b0b0b] p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-white/40">
                  {profileName}
                </p>
                <h2 className="mt-1 text-xl font-semibold text-white">
                  {t("VIEW_EVOLUTION", "Ver evolução")}
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
                <article className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/40">
                    {t("FIRST_PHOTO", "Primeira foto")}
                  </p>
                  <p className="mt-1 text-sm text-white/65">
                    {formatAssessmentDate(evolutionPhotos.first.date)}
                  </p>
                  <img
                    src={evolutionPhotos.first.photos[0]}
                    alt="primeira-foto-evolucao"
                    className="mt-3 max-h-[62vh] w-full rounded-md border border-white/[0.06] object-contain"
                  />
                </article>

                <article className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/40">
                    {t("LATEST_PHOTO", "Último histórico")}
                  </p>
                  <p className="mt-1 text-sm text-white/65">
                    {formatAssessmentDate(evolutionPhotos.latest.date)}
                  </p>
                  <img
                    src={evolutionPhotos.latest.photos[0]}
                    alt="ultima-foto-evolucao"
                    className="mt-3 max-h-[62vh] w-full rounded-md border border-white/[0.06] object-contain"
                  />
                </article>
              </div>
            ) : (
              <div className="mt-5 rounded-md border border-white/[0.06] bg-white/[0.02] p-4 text-sm text-white/55">
                {t(
                  "NO_EVOLUTION_PHOTOS",
                  "Adicione fotos nos históricos para comparar a evolução.",
                )}
              </div>
            )}
          </section>
        </div>
      )}

      {selectedAssessment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8">
          <section className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-white/[0.08] bg-[#0b0b0b] p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-16 w-16 overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.04]">
                  {profilePhoto ? (
                    <img
                      src={profilePhoto}
                      alt={profileName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-white/35">
                      {t("NO_PHOTO", "Sem foto")}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-white/40">
                    {profileName}
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-white">
                    {t("ASSESSMENT", "Avaliação")}{" "}
                    {formatAssessmentDate(selectedAssessment.date)}
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAssessment(null)}
                className="rounded-md border border-white/[0.08] p-2 text-white/60 transition hover:bg-white/[0.05] hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-md border border-white/[0.06] bg-white/[0.02] p-3">
                <p className="text-xs text-white/40">{t("WEIGHT", "Peso")}</p>
                <p className="mt-1 text-lg font-semibold text-white">
                  {selectedAssessment.weight ?? "-"} kg
                </p>
              </div>
              <div className="rounded-md border border-white/[0.06] bg-white/[0.02] p-3">
                <p className="text-xs text-white/40">{t("HEIGHT", "Altura")}</p>
                <p className="mt-1 text-lg font-semibold text-white">
                  {selectedAssessment.height ?? "-"} m
                </p>
              </div>
              <div className="rounded-md border border-white/[0.06] bg-white/[0.02] p-3">
                <p className="text-xs text-white/40">{t("FAT", "Gordura")}</p>
                <p className="mt-1 text-lg font-semibold text-white">
                  {selectedAssessment.fatPercentage ??
                    selectedAssessment.fat ??
                    "-"}
                  %
                </p>
              </div>
              <div className="rounded-md border border-white/[0.06] bg-white/[0.02] p-3">
                <p className="text-xs text-white/40">
                  {t("LEAN_MASS", "Massa magra")}
                </p>
                <p className="mt-1 text-lg font-semibold text-white">
                  {selectedAssessment.leanMass ?? "-"} kg
                </p>
              </div>
              <div className="rounded-md border border-white/[0.06] bg-white/[0.02] p-3">
                <p className="text-xs text-white/40">
                  {t("LEAN_MASS_PERCENTAGE", "Massa magra (%)")}
                </p>
                <p className="mt-1 text-lg font-semibold text-white">
                  {selectedAssessment.leanMassPercentage ?? "-"}%
                </p>
              </div>
              <div className="rounded-md border border-white/[0.06] bg-white/[0.02] p-3">
                <p className="text-xs text-white/40">
                  {t("FAT_WEIGHT", "Peso de gordura")}
                </p>
                <p className="mt-1 text-lg font-semibold text-white">
                  {selectedAssessment.fatWeight ?? "-"} kg
                </p>
              </div>
            </div>

            {selectedAssessment.notes && (
              <div className="mt-4 rounded-md border border-white/[0.06] bg-white/[0.02] p-3">
                <p className="text-xs text-white/40">
                  {t("NOTES", "Observações")}
                </p>
                <p className="mt-1 text-sm leading-6 text-white/75">
                  {selectedAssessment.notes}
                </p>
              </div>
            )}

            <div className="mt-5">
              <h3 className="font-semibold text-white">
                {t("PHOTOS", "Fotos")}
              </h3>
              {selectedPhotos.length > 0 ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {selectedPhotos.map((photo, index) => (
                    <img
                      key={`${photo}-${index}`}
                      src={photo}
                      alt={`foto-avaliacao-${index + 1}`}
                      className="max-h-80 w-full rounded-md border border-white/[0.06] object-cover"
                    />
                  ))}
                </div>
              ) : (
                <div className="mt-3 rounded-md border border-white/[0.06] bg-white/[0.02] p-4 text-sm text-white/50">
                  {t("NO_PHOTOS", "Nenhuma foto registrada nesta avaliação.")}
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
