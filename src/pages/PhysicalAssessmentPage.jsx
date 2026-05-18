import React, { useEffect, useState, useMemo } from "react";
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
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function PhysicalAssessmentPage() {
  const { user, isPersonal } = useAuth();
  const { t } = useI18n();

  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [profile, setProfile] = useState(null);
  const [assessments, setAssessments] = useState([]);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    weight: "",
    height: "",
    gender: "",
    fat: "",
    photos: [],
    notes: "",
  });

  useEffect(() => {
    async function load() {
      if (isPersonal) {
        try {
          const data = await listStudents();
          setStudents(Array.isArray(data) ? data : []);
        } catch (e) {
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
        } catch (e) {
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
    const found = students.find(
      (s) => String(s.id) === String(selectedStudentId),
    );
    if (found) setProfile(found);

    // load assessments from API
    (async () => {
      try {
        const a = await listAssessments(selectedStudentId);
        setAssessments(Array.isArray(a) ? a : []);
      } catch (_e) {
        setAssessments([]);
      }
    })();
  }, [selectedStudentId]);

  const chartData = useMemo(() => {
    const arr = (assessments || [])
      .slice()
      .reverse()
      .map((it) => ({
        date: it.date ? String(it.date).slice(0, 10) : "",
        weight: it.weight ? Number(it.weight) : null,
        fat: it.fatPercentage ?? (it.fat ? Number(it.fat) : null),
      }));

    return arr;
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
    setProfile(updated);

    // persist to backend
    (async () => {
      try {
        const payload = {
          fullName: updated.name || updated.fullName || undefined,
          birthDate: updated.birthdate || updated.birthDate || undefined,
          gender: updated.gender || undefined,
          photoUrl: updated.photo || updated.photoUrl || undefined,
        };

        if (isPersonal && selectedStudentId) {
          await updateStudent(selectedStudentId, payload);
        } else {
          await updateMyProfile(payload);
        }
      } catch (err) {
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
    if (!form.weight && !form.height && !form.fat) return;

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
          fatPercentage: entry.fat
            ? parseFloat(String(entry.fat).replace(",", "."))
            : null,
          // age removed from UI; backend can infer from birthDate if needed
          notes: entry.notes,
          photos: Array.isArray(entry.photos) ? entry.photos : [],
        };

        const created = await createAssessment(payload);
        setAssessments((s) => [created || entry, ...s]);
      } catch (err) {
        // fallback to local state
        setAssessments((s) => [entry, ...s]);
      }
    })();
  }

  function handleDeleteAssessment(id) {
    if (!selectedStudentId) return;
    (async () => {
      try {
        await deleteAssessment(id);
        setAssessments((s) => s.filter((a) => a.id !== id));
      } catch (err) {
        // optimistic local delete
        setAssessments((s) => s.filter((a) => a.id !== id));
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
            onChange={(e) => setSelectedStudentId(e.target.value)}
          >
            <option value="">— {t("CHOOSE", "Escolher")} —</option>
            {students.map((s) => (
              <option key={s.id} value={String(s.id)}>
                {s.name || s.email || s.id}
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
          {!profile && (
            <div className="col-span-1 rounded-lg border border-white/[0.06] bg-white/[0.01] p-4">
              <h2 className="font-semibold mb-3">
                {t("PROFILE", "Cadastro inicial")}
              </h2>
              <div className="flex flex-col items-center gap-3">
                <div className="h-28 w-28 rounded-lg overflow-hidden bg-white/5">
                  {profile?.photo ? (
                    <img
                      src={profile.photo}
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
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                />

                <label className="block w-full">
                  <div className="text-xs text-white/60">
                    {t("NAME", "Nome")}
                  </div>
                  <input
                    value={profile?.name || ""}
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
                    value={profile?.birthdate || ""}
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
            className={`${profile ? "col-span-3" : "col-span-2"} rounded-lg border border-white/[0.06] bg-white/[0.01] p-4`}
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
              <input
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
                className="mt-2"
              />
            </div>
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
                  key={a.id}
                  className="flex items-center justify-between rounded-md border border-white/[0.04] p-3"
                >
                  <div>
                    <div className="text-sm font-medium">{a.date}</div>
                    <div className="text-xs text-white/50">
                      {t("WEIGHT", "Peso")}: {a.weight} kg —{" "}
                      {t("HEIGHT", "Altura")}: {a.height} —{" "}
                      {t("FAT", "Gordura")}: {a.fatPercentage ?? a.fat}%
                    </div>
                    {a.notes && (
                      <div className="text-xs text-white/40 mt-1">
                        {a.notes}
                      </div>
                    )}
                    {Array.isArray(a.photos) && a.photos.length > 0 && (
                      <div className="mt-2 flex gap-2">
                        {a.photos.slice(0, 4).map((p, idx) => (
                          <img
                            key={idx}
                            src={p}
                            alt={`foto-${idx}`}
                            className="h-12 w-12 rounded object-cover border border-white/[0.04]"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDeleteAssessment(a.id)}
                      className="text-xs text-red-400"
                    >
                      {t("DELETE", "Excluir")}
                    </button>
                  </div>
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
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
