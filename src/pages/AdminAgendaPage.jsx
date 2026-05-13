import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Dumbbell,
  Salad,
  Save,
  User,
} from "lucide-react";
import {
  createAgendaEvent,
  deleteAgendaEvent,
  listAgendaEvents,
  listStudents,
  listWorkoutSessions,
  listWorkoutPlans,
  reviewAgendaChangeRequest,
  updateAgendaEvent,
} from "../lib/api.js";
import { useTenant } from "../contexts/TenantContext.jsx";
import { useI18n } from "../contexts/I18nContext.jsx";

const ADMIN_AGENDA_FALLBACKS = {
  "pt-BR": {
    ADMIN_AGENDA_LABEL_THIAGOIAZZETTI: "Agenda",
    ADMIN_AGENDA_TITLE_THIAGOIAZZETTI: "Agenda do Personal",
    ADMIN_AGENDA_SUBTITLE_THIAGOIAZZETTI:
      "Calendario mensal, recorrencia semanal/mensal e presenca do aluno.",
    ADMIN_AGENDA_ERROR_LOAD_THIAGOIAZZETTI: "Nao foi possivel carregar agenda",
    ADMIN_AGENDA_REQUIRED_FIELDS_THIAGOIAZZETTI:
      "Aluno, titulo e horario inicial sao obrigatorios",
    ADMIN_AGENDA_EVENT_UPDATED_THIAGOIAZZETTI: "Evento atualizado com sucesso",
    ADMIN_AGENDA_EVENT_CREATED_THIAGOIAZZETTI: "Evento criado com sucesso",
    ADMIN_AGENDA_SAVE_ERROR_THIAGOIAZZETTI: "Falha ao salvar evento",
    ADMIN_AGENDA_CONFIRM_DELETE_THIAGOIAZZETTI:
      "Excluir este evento da agenda?",
    ADMIN_AGENDA_EVENT_DELETED_THIAGOIAZZETTI: "Evento removido",
    ADMIN_AGENDA_DELETE_ERROR_THIAGOIAZZETTI: "Nao foi possivel excluir evento",
    ADMIN_AGENDA_EDIT_EVENT_TITLE_THIAGOIAZZETTI: "Editar evento",
    ADMIN_AGENDA_NEW_EVENT_TITLE_THIAGOIAZZETTI: "Novo evento",
    ADMIN_AGENDA_STUDENT_LABEL_THIAGOIAZZETTI: "Aluno",
    ADMIN_AGENDA_SELECT_STUDENT_THIAGOIAZZETTI: "Selecione",
    ADMIN_AGENDA_TYPE_LABEL_THIAGOIAZZETTI: "Tipo",
    ADMIN_AGENDA_TYPE_WORKOUT_THIAGOIAZZETTI: "Treino",
    ADMIN_AGENDA_TYPE_DIET_THIAGOIAZZETTI: "Dieta",
    ADMIN_AGENDA_TYPE_CONSULT_THIAGOIAZZETTI: "Consulta",
    ADMIN_AGENDA_TYPE_CHECKIN_THIAGOIAZZETTI: "Check-in",
    ADMIN_AGENDA_TYPE_OTHER_THIAGOIAZZETTI: "Outro",
    ADMIN_AGENDA_ATTENDANCE_LABEL_THIAGOIAZZETTI: "Presenca",
    ADMIN_AGENDA_STATUS_PENDING_THIAGOIAZZETTI: "Pendente",
    ADMIN_AGENDA_STATUS_CONFIRMED_THIAGOIAZZETTI: "Confirmado",
    ADMIN_AGENDA_STATUS_MISSED_THIAGOIAZZETTI: "Faltou",
    ADMIN_AGENDA_TITLE_FIELD_THIAGOIAZZETTI: "Titulo",
    ADMIN_AGENDA_DESCRIPTION_LABEL_THIAGOIAZZETTI: "Descricao",
    ADMIN_AGENDA_START_LABEL_THIAGOIAZZETTI: "Inicio",
    ADMIN_AGENDA_END_LABEL_THIAGOIAZZETTI: "Fim",
    ADMIN_AGENDA_RECURRENCE_LABEL_THIAGOIAZZETTI: "Recorrencia",
    ADMIN_AGENDA_RECURRENCE_NONE_THIAGOIAZZETTI: "Nao repetir",
    ADMIN_AGENDA_RECURRENCE_WEEKLY_THIAGOIAZZETTI: "Semanal",
    ADMIN_AGENDA_RECURRENCE_MONTHLY_THIAGOIAZZETTI: "Mensal",
    ADMIN_AGENDA_REPEAT_UNTIL_THIAGOIAZZETTI: "Repetir ate",
    ADMIN_AGENDA_RELATED_WORKOUT_THIAGOIAZZETTI: "Treino relacionado",
    ADMIN_AGENDA_NO_WORKOUT_THIAGOIAZZETTI: "Sem treino vinculado",
    ADMIN_AGENDA_DIET_NOTES_LABEL_THIAGOIAZZETTI: "Dieta / orientacoes",
    ADMIN_AGENDA_SAVE_CHANGES_THIAGOIAZZETTI: "Salvar alteracoes",
    ADMIN_AGENDA_CREATE_EVENT_THIAGOIAZZETTI: "Criar evento",
    ADMIN_AGENDA_CANCEL_THIAGOIAZZETTI: "Cancelar",
    ADMIN_AGENDA_EVENTS_TITLE_THIAGOIAZZETTI: "Eventos",
    ADMIN_AGENDA_SELECTED_STUDENT_THIAGOIAZZETTI: "Aluno selecionado",
    ADMIN_AGENDA_GENERAL_SCHEDULE_THIAGOIAZZETTI: "Mostrando agenda geral",
    ADMIN_AGENDA_LOADING_THIAGOIAZZETTI: "Carregando...",
    ADMIN_AGENDA_EMPTY_THIAGOIAZZETTI: "Nenhum evento cadastrado.",
    ADMIN_AGENDA_EDIT_BUTTON_THIAGOIAZZETTI: "Editar",
    ADMIN_AGENDA_DELETE_BUTTON_THIAGOIAZZETTI: "Excluir",
    CLIENT_AGENDA_EVENTS_THIAGOIAZZETTI: "eventos",
  },
  "pt-PT": {
    ADMIN_AGENDA_LABEL_THIAGOIAZZETTI: "Agenda",
    ADMIN_AGENDA_TITLE_THIAGOIAZZETTI: "Agenda do Personal",
    ADMIN_AGENDA_SUBTITLE_THIAGOIAZZETTI:
      "Calendario mensal, recorrencia semanal/mensal e presenca do aluno.",
    ADMIN_AGENDA_ERROR_LOAD_THIAGOIAZZETTI:
      "Nao foi possivel carregar a agenda",
    ADMIN_AGENDA_REQUIRED_FIELDS_THIAGOIAZZETTI:
      "Aluno, titulo e horario inicial sao obrigatorios",
    ADMIN_AGENDA_EVENT_UPDATED_THIAGOIAZZETTI: "Evento atualizado com sucesso",
    ADMIN_AGENDA_EVENT_CREATED_THIAGOIAZZETTI: "Evento criado com sucesso",
    ADMIN_AGENDA_SAVE_ERROR_THIAGOIAZZETTI: "Falha ao salvar evento",
    ADMIN_AGENDA_CONFIRM_DELETE_THIAGOIAZZETTI:
      "Excluir este evento da agenda?",
    ADMIN_AGENDA_EVENT_DELETED_THIAGOIAZZETTI: "Evento removido",
    ADMIN_AGENDA_DELETE_ERROR_THIAGOIAZZETTI: "Nao foi possivel excluir evento",
    ADMIN_AGENDA_EDIT_EVENT_TITLE_THIAGOIAZZETTI: "Editar evento",
    ADMIN_AGENDA_NEW_EVENT_TITLE_THIAGOIAZZETTI: "Novo evento",
    ADMIN_AGENDA_STUDENT_LABEL_THIAGOIAZZETTI: "Aluno",
    ADMIN_AGENDA_SELECT_STUDENT_THIAGOIAZZETTI: "Selecione",
    ADMIN_AGENDA_TYPE_LABEL_THIAGOIAZZETTI: "Tipo",
    ADMIN_AGENDA_TYPE_WORKOUT_THIAGOIAZZETTI: "Treino",
    ADMIN_AGENDA_TYPE_DIET_THIAGOIAZZETTI: "Dieta",
    ADMIN_AGENDA_TYPE_CONSULT_THIAGOIAZZETTI: "Consulta",
    ADMIN_AGENDA_TYPE_CHECKIN_THIAGOIAZZETTI: "Check-in",
    ADMIN_AGENDA_TYPE_OTHER_THIAGOIAZZETTI: "Outro",
    ADMIN_AGENDA_ATTENDANCE_LABEL_THIAGOIAZZETTI: "Presenca",
    ADMIN_AGENDA_STATUS_PENDING_THIAGOIAZZETTI: "Pendente",
    ADMIN_AGENDA_STATUS_CONFIRMED_THIAGOIAZZETTI: "Confirmado",
    ADMIN_AGENDA_STATUS_MISSED_THIAGOIAZZETTI: "Faltou",
    ADMIN_AGENDA_TITLE_FIELD_THIAGOIAZZETTI: "Titulo",
    ADMIN_AGENDA_DESCRIPTION_LABEL_THIAGOIAZZETTI: "Descricao",
    ADMIN_AGENDA_START_LABEL_THIAGOIAZZETTI: "Inicio",
    ADMIN_AGENDA_END_LABEL_THIAGOIAZZETTI: "Fim",
    ADMIN_AGENDA_RECURRENCE_LABEL_THIAGOIAZZETTI: "Recorrencia",
    ADMIN_AGENDA_RECURRENCE_NONE_THIAGOIAZZETTI: "Nao repetir",
    ADMIN_AGENDA_RECURRENCE_WEEKLY_THIAGOIAZZETTI: "Semanal",
    ADMIN_AGENDA_RECURRENCE_MONTHLY_THIAGOIAZZETTI: "Mensal",
    ADMIN_AGENDA_REPEAT_UNTIL_THIAGOIAZZETTI: "Repetir ate",
    ADMIN_AGENDA_RELATED_WORKOUT_THIAGOIAZZETTI: "Treino relacionado",
    ADMIN_AGENDA_NO_WORKOUT_THIAGOIAZZETTI: "Sem treino vinculado",
    ADMIN_AGENDA_DIET_NOTES_LABEL_THIAGOIAZZETTI: "Dieta / orientacoes",
    ADMIN_AGENDA_SAVE_CHANGES_THIAGOIAZZETTI: "Salvar alteracoes",
    ADMIN_AGENDA_CREATE_EVENT_THIAGOIAZZETTI: "Criar evento",
    ADMIN_AGENDA_CANCEL_THIAGOIAZZETTI: "Cancelar",
    ADMIN_AGENDA_EVENTS_TITLE_THIAGOIAZZETTI: "Eventos",
    ADMIN_AGENDA_SELECTED_STUDENT_THIAGOIAZZETTI: "Aluno selecionado",
    ADMIN_AGENDA_GENERAL_SCHEDULE_THIAGOIAZZETTI: "Mostrando agenda geral",
    ADMIN_AGENDA_LOADING_THIAGOIAZZETTI: "A carregar...",
    ADMIN_AGENDA_EMPTY_THIAGOIAZZETTI: "Nenhum evento cadastrado.",
    ADMIN_AGENDA_EDIT_BUTTON_THIAGOIAZZETTI: "Editar",
    ADMIN_AGENDA_DELETE_BUTTON_THIAGOIAZZETTI: "Excluir",
    CLIENT_AGENDA_EVENTS_THIAGOIAZZETTI: "eventos",
  },
  "en-US": {
    ADMIN_AGENDA_LABEL_THIAGOIAZZETTI: "Schedule",
    ADMIN_AGENDA_TITLE_THIAGOIAZZETTI: "Personal Schedule",
    ADMIN_AGENDA_SUBTITLE_THIAGOIAZZETTI:
      "Monthly calendar, weekly/monthly recurrence and student attendance.",
    ADMIN_AGENDA_ERROR_LOAD_THIAGOIAZZETTI: "Could not load schedule",
    ADMIN_AGENDA_REQUIRED_FIELDS_THIAGOIAZZETTI:
      "Student, title and start time are required",
    ADMIN_AGENDA_EVENT_UPDATED_THIAGOIAZZETTI: "Event updated successfully",
    ADMIN_AGENDA_EVENT_CREATED_THIAGOIAZZETTI: "Event created successfully",
    ADMIN_AGENDA_SAVE_ERROR_THIAGOIAZZETTI: "Failed to save event",
    ADMIN_AGENDA_CONFIRM_DELETE_THIAGOIAZZETTI: "Delete this schedule event?",
    ADMIN_AGENDA_EVENT_DELETED_THIAGOIAZZETTI: "Event removed",
    ADMIN_AGENDA_DELETE_ERROR_THIAGOIAZZETTI: "Could not delete event",
    ADMIN_AGENDA_EDIT_EVENT_TITLE_THIAGOIAZZETTI: "Edit event",
    ADMIN_AGENDA_NEW_EVENT_TITLE_THIAGOIAZZETTI: "New event",
    ADMIN_AGENDA_STUDENT_LABEL_THIAGOIAZZETTI: "Student",
    ADMIN_AGENDA_SELECT_STUDENT_THIAGOIAZZETTI: "Select",
    ADMIN_AGENDA_TYPE_LABEL_THIAGOIAZZETTI: "Type",
    ADMIN_AGENDA_TYPE_WORKOUT_THIAGOIAZZETTI: "Workout",
    ADMIN_AGENDA_TYPE_DIET_THIAGOIAZZETTI: "Diet",
    ADMIN_AGENDA_TYPE_CONSULT_THIAGOIAZZETTI: "Consultation",
    ADMIN_AGENDA_TYPE_CHECKIN_THIAGOIAZZETTI: "Check-in",
    ADMIN_AGENDA_TYPE_OTHER_THIAGOIAZZETTI: "Other",
    ADMIN_AGENDA_ATTENDANCE_LABEL_THIAGOIAZZETTI: "Attendance",
    ADMIN_AGENDA_STATUS_PENDING_THIAGOIAZZETTI: "Pending",
    ADMIN_AGENDA_STATUS_CONFIRMED_THIAGOIAZZETTI: "Confirmed",
    ADMIN_AGENDA_STATUS_MISSED_THIAGOIAZZETTI: "Missed",
    ADMIN_AGENDA_TITLE_FIELD_THIAGOIAZZETTI: "Title",
    ADMIN_AGENDA_DESCRIPTION_LABEL_THIAGOIAZZETTI: "Description",
    ADMIN_AGENDA_START_LABEL_THIAGOIAZZETTI: "Start",
    ADMIN_AGENDA_END_LABEL_THIAGOIAZZETTI: "End",
    ADMIN_AGENDA_RECURRENCE_LABEL_THIAGOIAZZETTI: "Recurrence",
    ADMIN_AGENDA_RECURRENCE_NONE_THIAGOIAZZETTI: "Do not repeat",
    ADMIN_AGENDA_RECURRENCE_WEEKLY_THIAGOIAZZETTI: "Weekly",
    ADMIN_AGENDA_RECURRENCE_MONTHLY_THIAGOIAZZETTI: "Monthly",
    ADMIN_AGENDA_REPEAT_UNTIL_THIAGOIAZZETTI: "Repeat until",
    ADMIN_AGENDA_RELATED_WORKOUT_THIAGOIAZZETTI: "Related workout",
    ADMIN_AGENDA_NO_WORKOUT_THIAGOIAZZETTI: "No linked workout",
    ADMIN_AGENDA_DIET_NOTES_LABEL_THIAGOIAZZETTI: "Diet / guidance",
    ADMIN_AGENDA_SAVE_CHANGES_THIAGOIAZZETTI: "Save changes",
    ADMIN_AGENDA_CREATE_EVENT_THIAGOIAZZETTI: "Create event",
    ADMIN_AGENDA_CANCEL_THIAGOIAZZETTI: "Cancel",
    ADMIN_AGENDA_EVENTS_TITLE_THIAGOIAZZETTI: "Events",
    ADMIN_AGENDA_SELECTED_STUDENT_THIAGOIAZZETTI: "Selected student",
    ADMIN_AGENDA_GENERAL_SCHEDULE_THIAGOIAZZETTI: "Showing general schedule",
    ADMIN_AGENDA_LOADING_THIAGOIAZZETTI: "Loading...",
    ADMIN_AGENDA_EMPTY_THIAGOIAZZETTI: "No events registered.",
    ADMIN_AGENDA_EDIT_BUTTON_THIAGOIAZZETTI: "Edit",
    ADMIN_AGENDA_DELETE_BUTTON_THIAGOIAZZETTI: "Delete",
    CLIENT_AGENDA_EVENTS_THIAGOIAZZETTI: "events",
  },
  "it-IT": {
    ADMIN_AGENDA_LABEL_THIAGOIAZZETTI: "Agenda",
    ADMIN_AGENDA_TITLE_THIAGOIAZZETTI: "Agenda del Personal",
    ADMIN_AGENDA_SUBTITLE_THIAGOIAZZETTI:
      "Calendario mensile, ricorrenza settimanale/mensile e presenza dello studente.",
    ADMIN_AGENDA_ERROR_LOAD_THIAGOIAZZETTI: "Impossibile caricare l'agenda",
    ADMIN_AGENDA_REQUIRED_FIELDS_THIAGOIAZZETTI:
      "Studente, titolo e orario di inizio sono obbligatori",
    ADMIN_AGENDA_EVENT_UPDATED_THIAGOIAZZETTI: "Evento aggiornato con successo",
    ADMIN_AGENDA_EVENT_CREATED_THIAGOIAZZETTI: "Evento creato con successo",
    ADMIN_AGENDA_SAVE_ERROR_THIAGOIAZZETTI: "Errore nel salvataggio",
    ADMIN_AGENDA_CONFIRM_DELETE_THIAGOIAZZETTI:
      "Eliminare questo evento dall'agenda?",
    ADMIN_AGENDA_EVENT_DELETED_THIAGOIAZZETTI: "Evento rimosso",
    ADMIN_AGENDA_DELETE_ERROR_THIAGOIAZZETTI: "Impossibile eliminare l'evento",
    ADMIN_AGENDA_EDIT_EVENT_TITLE_THIAGOIAZZETTI: "Modifica evento",
    ADMIN_AGENDA_NEW_EVENT_TITLE_THIAGOIAZZETTI: "Nuovo evento",
    ADMIN_AGENDA_STUDENT_LABEL_THIAGOIAZZETTI: "Studente",
    ADMIN_AGENDA_SELECT_STUDENT_THIAGOIAZZETTI: "Seleziona",
    ADMIN_AGENDA_TYPE_LABEL_THIAGOIAZZETTI: "Tipo",
    ADMIN_AGENDA_TYPE_WORKOUT_THIAGOIAZZETTI: "Allenamento",
    ADMIN_AGENDA_TYPE_DIET_THIAGOIAZZETTI: "Dieta",
    ADMIN_AGENDA_TYPE_CONSULT_THIAGOIAZZETTI: "Consulta",
    ADMIN_AGENDA_TYPE_CHECKIN_THIAGOIAZZETTI: "Check-in",
    ADMIN_AGENDA_TYPE_OTHER_THIAGOIAZZETTI: "Altro",
    ADMIN_AGENDA_ATTENDANCE_LABEL_THIAGOIAZZETTI: "Presenza",
    ADMIN_AGENDA_STATUS_PENDING_THIAGOIAZZETTI: "In attesa",
    ADMIN_AGENDA_STATUS_CONFIRMED_THIAGOIAZZETTI: "Confermato",
    ADMIN_AGENDA_STATUS_MISSED_THIAGOIAZZETTI: "Assente",
    ADMIN_AGENDA_TITLE_FIELD_THIAGOIAZZETTI: "Titolo",
    ADMIN_AGENDA_DESCRIPTION_LABEL_THIAGOIAZZETTI: "Descrizione",
    ADMIN_AGENDA_START_LABEL_THIAGOIAZZETTI: "Inizio",
    ADMIN_AGENDA_END_LABEL_THIAGOIAZZETTI: "Fine",
    ADMIN_AGENDA_RECURRENCE_LABEL_THIAGOIAZZETTI: "Ricorrenza",
    ADMIN_AGENDA_RECURRENCE_NONE_THIAGOIAZZETTI: "Non ripetere",
    ADMIN_AGENDA_RECURRENCE_WEEKLY_THIAGOIAZZETTI: "Settimanale",
    ADMIN_AGENDA_RECURRENCE_MONTHLY_THIAGOIAZZETTI: "Mensile",
    ADMIN_AGENDA_REPEAT_UNTIL_THIAGOIAZZETTI: "Ripeti fino a",
    ADMIN_AGENDA_RELATED_WORKOUT_THIAGOIAZZETTI: "Allenamento correlato",
    ADMIN_AGENDA_NO_WORKOUT_THIAGOIAZZETTI: "Nessun allenamento collegato",
    ADMIN_AGENDA_DIET_NOTES_LABEL_THIAGOIAZZETTI: "Dieta / indicazioni",
    ADMIN_AGENDA_SAVE_CHANGES_THIAGOIAZZETTI: "Salva modifiche",
    ADMIN_AGENDA_CREATE_EVENT_THIAGOIAZZETTI: "Crea evento",
    ADMIN_AGENDA_CANCEL_THIAGOIAZZETTI: "Annulla",
    ADMIN_AGENDA_EVENTS_TITLE_THIAGOIAZZETTI: "Eventi",
    ADMIN_AGENDA_SELECTED_STUDENT_THIAGOIAZZETTI: "Studente selezionato",
    ADMIN_AGENDA_GENERAL_SCHEDULE_THIAGOIAZZETTI:
      "Visualizzazione agenda generale",
    ADMIN_AGENDA_LOADING_THIAGOIAZZETTI: "Caricamento...",
    ADMIN_AGENDA_EMPTY_THIAGOIAZZETTI: "Nessun evento registrato.",
    ADMIN_AGENDA_EDIT_BUTTON_THIAGOIAZZETTI: "Modifica",
    ADMIN_AGENDA_DELETE_BUTTON_THIAGOIAZZETTI: "Elimina",
    CLIENT_AGENDA_EVENTS_THIAGOIAZZETTI: "eventi",
  },
  "es-ES": {
    ADMIN_AGENDA_LABEL_THIAGOIAZZETTI: "Agenda",
    ADMIN_AGENDA_TITLE_THIAGOIAZZETTI: "Agenda del Personal",
    ADMIN_AGENDA_SUBTITLE_THIAGOIAZZETTI:
      "Calendario mensual, recurrencia semanal/mensual y asistencia del alumno.",
    ADMIN_AGENDA_ERROR_LOAD_THIAGOIAZZETTI: "No fue posible cargar la agenda",
    ADMIN_AGENDA_REQUIRED_FIELDS_THIAGOIAZZETTI:
      "Alumno, titulo y hora de inicio son obligatorios",
    ADMIN_AGENDA_EVENT_UPDATED_THIAGOIAZZETTI: "Evento actualizado con exito",
    ADMIN_AGENDA_EVENT_CREATED_THIAGOIAZZETTI: "Evento creado con exito",
    ADMIN_AGENDA_SAVE_ERROR_THIAGOIAZZETTI: "Error al guardar evento",
    ADMIN_AGENDA_CONFIRM_DELETE_THIAGOIAZZETTI:
      "¿Eliminar este evento de la agenda?",
    ADMIN_AGENDA_EVENT_DELETED_THIAGOIAZZETTI: "Evento eliminado",
    ADMIN_AGENDA_DELETE_ERROR_THIAGOIAZZETTI: "No fue posible eliminar evento",
    ADMIN_AGENDA_EDIT_EVENT_TITLE_THIAGOIAZZETTI: "Editar evento",
    ADMIN_AGENDA_NEW_EVENT_TITLE_THIAGOIAZZETTI: "Nuevo evento",
    ADMIN_AGENDA_STUDENT_LABEL_THIAGOIAZZETTI: "Alumno",
    ADMIN_AGENDA_SELECT_STUDENT_THIAGOIAZZETTI: "Seleccionar",
    ADMIN_AGENDA_TYPE_LABEL_THIAGOIAZZETTI: "Tipo",
    ADMIN_AGENDA_TYPE_WORKOUT_THIAGOIAZZETTI: "Entrenamiento",
    ADMIN_AGENDA_TYPE_DIET_THIAGOIAZZETTI: "Dieta",
    ADMIN_AGENDA_TYPE_CONSULT_THIAGOIAZZETTI: "Consulta",
    ADMIN_AGENDA_TYPE_CHECKIN_THIAGOIAZZETTI: "Check-in",
    ADMIN_AGENDA_TYPE_OTHER_THIAGOIAZZETTI: "Otro",
    ADMIN_AGENDA_ATTENDANCE_LABEL_THIAGOIAZZETTI: "Asistencia",
    ADMIN_AGENDA_STATUS_PENDING_THIAGOIAZZETTI: "Pendiente",
    ADMIN_AGENDA_STATUS_CONFIRMED_THIAGOIAZZETTI: "Confirmado",
    ADMIN_AGENDA_STATUS_MISSED_THIAGOIAZZETTI: "Faltó",
    ADMIN_AGENDA_TITLE_FIELD_THIAGOIAZZETTI: "Titulo",
    ADMIN_AGENDA_DESCRIPTION_LABEL_THIAGOIAZZETTI: "Descripcion",
    ADMIN_AGENDA_START_LABEL_THIAGOIAZZETTI: "Inicio",
    ADMIN_AGENDA_END_LABEL_THIAGOIAZZETTI: "Fin",
    ADMIN_AGENDA_RECURRENCE_LABEL_THIAGOIAZZETTI: "Recurrencia",
    ADMIN_AGENDA_RECURRENCE_NONE_THIAGOIAZZETTI: "No repetir",
    ADMIN_AGENDA_RECURRENCE_WEEKLY_THIAGOIAZZETTI: "Semanal",
    ADMIN_AGENDA_RECURRENCE_MONTHLY_THIAGOIAZZETTI: "Mensual",
    ADMIN_AGENDA_REPEAT_UNTIL_THIAGOIAZZETTI: "Repetir hasta",
    ADMIN_AGENDA_RELATED_WORKOUT_THIAGOIAZZETTI: "Entrenamiento relacionado",
    ADMIN_AGENDA_NO_WORKOUT_THIAGOIAZZETTI: "Sin entrenamiento vinculado",
    ADMIN_AGENDA_DIET_NOTES_LABEL_THIAGOIAZZETTI: "Dieta / orientaciones",
    ADMIN_AGENDA_SAVE_CHANGES_THIAGOIAZZETTI: "Guardar cambios",
    ADMIN_AGENDA_CREATE_EVENT_THIAGOIAZZETTI: "Crear evento",
    ADMIN_AGENDA_CANCEL_THIAGOIAZZETTI: "Cancelar",
    ADMIN_AGENDA_EVENTS_TITLE_THIAGOIAZZETTI: "Eventos",
    ADMIN_AGENDA_SELECTED_STUDENT_THIAGOIAZZETTI: "Alumno seleccionado",
    ADMIN_AGENDA_GENERAL_SCHEDULE_THIAGOIAZZETTI: "Mostrando agenda general",
    ADMIN_AGENDA_LOADING_THIAGOIAZZETTI: "Cargando...",
    ADMIN_AGENDA_EMPTY_THIAGOIAZZETTI: "Ningun evento registrado.",
    ADMIN_AGENDA_EDIT_BUTTON_THIAGOIAZZETTI: "Editar",
    ADMIN_AGENDA_DELETE_BUTTON_THIAGOIAZZETTI: "Eliminar",
    CLIENT_AGENDA_EVENTS_THIAGOIAZZETTI: "eventos",
  },
};

function translateAdminAgenda(rawT, locale, key, fallback = "") {
  const remoteValue = rawT(key, "");
  const localValue = ADMIN_AGENDA_FALLBACKS[locale]?.[key];
  return remoteValue || localValue || fallback || key;
}

function eventTone(type) {
  if (type === "TREINO")
    return "border-[#b5f03c]/45 bg-[#b5f03c]/12 text-[#d4f7a0]";
  if (type === "DIETA")
    return "border-emerald-400/45 bg-emerald-500/12 text-emerald-200";
  if (type === "CONSULTA")
    return "border-sky-400/45 bg-sky-500/12 text-sky-200";
  if (type === "CHECKIN")
    return "border-violet-400/45 bg-violet-500/12 text-violet-200";
  return "border-white/20 bg-white/10 text-white/75";
}

function attendanceTone(status) {
  if (status === "CONFIRMADO")
    return "border-emerald-400/40 bg-emerald-500/15 text-emerald-200";
  if (status === "FALTOU")
    return "border-red-400/40 bg-red-500/15 text-red-200";
  return "border-amber-300/40 bg-amber-400/10 text-amber-100";
}

function toInputDateTime(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (v) => String(v).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDateTime(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

function formatDurationSeconds(durationSeconds) {
  const total = Math.max(0, Number(durationSeconds || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const WEEKDAY_SLOTS = [
  { key: "SUN", label: "Dom", dayIndex: 0 },
  { key: "MON", label: "Seg", dayIndex: 1 },
  { key: "TUE", label: "Ter", dayIndex: 2 },
  { key: "WED", label: "Qua", dayIndex: 3 },
  { key: "THU", label: "Qui", dayIndex: 4 },
  { key: "FRI", label: "Sex", dayIndex: 5 },
  { key: "SAT", label: "Sab", dayIndex: 6 },
];

function buildDateWithTime(baseDate, timeValue) {
  if (!timeValue || !String(timeValue).includes(":")) {
    return null;
  }

  const [hours, minutes] = String(timeValue).split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }

  const nextDate = new Date(baseDate);
  nextDate.setHours(hours, minutes, 0, 0);
  return nextDate;
}

function timeToMinutes(timeValue) {
  if (!timeValue || !String(timeValue).includes(":")) {
    return null;
  }

  const [hours, minutes] = String(timeValue).split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
}

export default function AdminAgendaPage() {
  const { t: rawT, locale } = useI18n();
  const t = useCallback(
    (key, fallback = "") => translateAdminAgenda(rawT, locale, key, fallback),
    [rawT, locale],
  );
  const { tenantId } = useTenant();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [students, setStudents] = useState([]);
  const [events, setEvents] = useState([]);
  const [workoutSessions, setWorkoutSessions] = useState([]);
  const [workouts, setWorkouts] = useState([]);
  const [editingId, setEditingId] = useState("");
  const [monthCursor, setMonthCursor] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(() => new Date());
  const [creatingGrid, setCreatingGrid] = useState(false);
  const [eventFilterAlunoId, setEventFilterAlunoId] = useState("");
  const [weeklyGrid, setWeeklyGrid] = useState(() =>
    WEEKDAY_SLOTS.reduce((acc, slot) => {
      acc[slot.key] = {
        enabled: false,
        startsAtTime: "07:00",
        endsAtTime: "08:00",
      };
      return acc;
    }, {}),
  );

  const [form, setForm] = useState({
    alunoId: "",
    title: "",
    description: "",
    type: "TREINO",
    startsAt: "",
    endsAt: "",
    workoutPlanId: "",
    dietNotes: "",
    recurrence: "NONE",
    recurrenceUntil: "",
    attendanceStatus: "PENDENTE",
  });

  const selectedStudent = useMemo(
    () => students.find((s) => s.id === form.alunoId) || null,
    [students, form.alunoId],
  );

  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(locale || "pt-BR", {
        month: "long",
        year: "numeric",
      }).format(monthCursor),
    [monthCursor, locale],
  );

  const monthRange = useMemo(() => {
    const first = new Date(
      monthCursor.getFullYear(),
      monthCursor.getMonth(),
      1,
    );
    const last = new Date(
      monthCursor.getFullYear(),
      monthCursor.getMonth() + 1,
      0,
    );
    return { first, last };
  }, [monthCursor]);

  const calendarDays = useMemo(() => {
    const first = new Date(monthRange.first);
    const firstWeekDay = first.getDay();
    first.setDate(first.getDate() - firstWeekDay);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(first);
      d.setDate(first.getDate() + i);
      return d;
    });
  }, [monthRange]);

  const loadAllEvents = async () => {
    const fromDate = new Date(
      monthRange.first.getFullYear(),
      monthRange.first.getMonth(),
      1,
      0,
      0,
      0,
    );
    const toDate = new Date(
      monthRange.first.getFullYear(),
      monthRange.first.getMonth() + 1,
      31,
      23,
      59,
      59,
    );

    const filters = {
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
    };

    const eventsData = await listAgendaEvents(tenantId, filters);
    setEvents(Array.isArray(eventsData) ? eventsData : []);
  };

  const loadSessionsForStudent = async (alunoId) => {
    if (!alunoId) {
      setWorkoutSessions([]);
      return;
    }

    const sessionsData = await listWorkoutSessions(tenantId, {
      alunoId,
      from: new Date(
        monthRange.first.getFullYear(),
        monthRange.first.getMonth(),
        1,
        0,
        0,
        0,
      ).toISOString(),
      to: new Date(
        monthRange.first.getFullYear(),
        monthRange.first.getMonth() + 1,
        31,
        23,
        59,
        59,
      ).toISOString(),
    });
    setWorkoutSessions(Array.isArray(sessionsData) ? sessionsData : []);
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setMessage("");
      try {
        const allStudents = await listStudents(tenantId);
        if (cancelled) return;
        const normalizedStudents = Array.isArray(allStudents)
          ? allStudents
          : [];
        setStudents(normalizedStudents);

        const firstId = normalizedStudents[0]?.id || "";
        if (firstId) {
          setForm((prev) => ({ ...prev, alunoId: prev.alunoId || firstId }));
          const [allEvents, studentWorkouts, sessions] = await Promise.all([
            listAgendaEvents(tenantId, {
              from: new Date(
                monthRange.first.getFullYear(),
                monthRange.first.getMonth(),
                1,
                0,
                0,
                0,
              ).toISOString(),
              to: new Date(
                monthRange.first.getFullYear(),
                monthRange.first.getMonth() + 1,
                31,
                23,
                59,
                59,
              ).toISOString(),
            }),
            listWorkoutPlans(firstId, tenantId),
            listWorkoutSessions(tenantId, {
              alunoId: firstId,
              from: new Date(
                monthRange.first.getFullYear(),
                monthRange.first.getMonth(),
                1,
                0,
                0,
                0,
              ).toISOString(),
              to: new Date(
                monthRange.first.getFullYear(),
                monthRange.first.getMonth() + 1,
                31,
                23,
                59,
                59,
              ).toISOString(),
            }),
          ]);
          if (cancelled) return;
          setEvents(Array.isArray(allEvents) ? allEvents : []);
          setWorkouts(Array.isArray(studentWorkouts) ? studentWorkouts : []);
          setWorkoutSessions(Array.isArray(sessions) ? sessions : []);
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(
            error?.message ||
              t(
                "ADMIN_AGENDA_ERROR_LOAD_THIAGOIAZZETTI",
                "Nao foi possivel carregar agenda",
              ),
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    if (tenantId) load();

    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  useEffect(() => {
    if (!tenantId) return;
    loadAllEvents().catch(() => {});
    loadSessionsForStudent(form.alunoId).catch(() => {});
  }, [
    monthRange.first.getMonth(),
    monthRange.first.getFullYear(),
    form.alunoId,
  ]);

  useEffect(() => {
    let cancelled = false;

    const loadByStudent = async () => {
      if (!form.alunoId) {
        setWorkouts([]);
        return;
      }

      try {
        const [studentWorkouts, sessions] = await Promise.all([
          listWorkoutPlans(form.alunoId, tenantId),
          listWorkoutSessions(tenantId, {
            alunoId: form.alunoId,
            from: new Date(
              monthRange.first.getFullYear(),
              monthRange.first.getMonth(),
              1,
              0,
              0,
              0,
            ).toISOString(),
            to: new Date(
              monthRange.first.getFullYear(),
              monthRange.first.getMonth() + 1,
              31,
              23,
              59,
              59,
            ).toISOString(),
          }),
        ]);
        if (!cancelled) {
          setWorkouts(Array.isArray(studentWorkouts) ? studentWorkouts : []);
          setWorkoutSessions(Array.isArray(sessions) ? sessions : []);
        }
      } catch (_error) {
        if (!cancelled) {
          setWorkouts([]);
          setWorkoutSessions([]);
        }
      }
    };

    if (tenantId) loadByStudent();

    return () => {
      cancelled = true;
    };
  }, [form.alunoId, tenantId]);

  const resetForm = () => {
    setEditingId("");
    setForm((prev) => ({
      ...prev,
      title: "",
      description: "",
      startsAt: "",
      endsAt: "",
      workoutPlanId: "",
      dietNotes: "",
      type: "TREINO",
      recurrence: "NONE",
      recurrenceUntil: "",
      attendanceStatus: "PENDENTE",
    }));
  };

  const checkTimeConflicts = (startsAt, endsAt, excludeEventId = null) => {
    const start = new Date(startsAt);
    const end = endsAt ? new Date(endsAt) : new Date(start.getTime() + 3600000);

    const conflicts = events.filter((ev) => {
      if (excludeEventId && ev.id === excludeEventId) return false;

      const evStart = new Date(ev.startsAt);
      const evEnd = ev.endsAt
        ? new Date(ev.endsAt)
        : new Date(evStart.getTime() + 3600000);

      return !(end <= evStart || start >= evEnd);
    });

    return conflicts;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!form.alunoId || !form.title.trim() || !form.startsAt) {
      setMessage(
        t(
          "ADMIN_AGENDA_REQUIRED_FIELDS_THIAGOIAZZETTI",
          "Aluno, titulo e horario inicial sao obrigatorios",
        ),
      );
      return;
    }

    const conflicts = checkTimeConflicts(form.startsAt, form.endsAt, editingId);
    if (conflicts.length > 0) {
      const conflictNames = conflicts
        .map((c) => c.aluno?.fullName || c.title)
        .join(", ");
      setMessage(
        `Conflito de horário! Já existe treino agendado: ${conflictNames}`,
      );
      return;
    }

    const payload = {
      alunoId: form.alunoId,
      title: form.title.trim(),
      description: form.description || null,
      type: form.type,
      startsAt: form.startsAt,
      endsAt: form.endsAt || null,
      workoutPlanId: form.workoutPlanId || null,
      dietNotes: form.dietNotes || null,
      recurrence: form.recurrence,
      recurrenceUntil: form.recurrenceUntil || null,
      attendanceStatus: form.attendanceStatus,
    };

    try {
      if (editingId) {
        const updated = await updateAgendaEvent(editingId, payload, tenantId);
        setEvents((prev) =>
          prev.map((ev) => (ev.id === editingId ? updated : ev)),
        );
        setMessage(
          t(
            "ADMIN_AGENDA_EVENT_UPDATED_THIAGOIAZZETTI",
            "Evento atualizado com sucesso",
          ),
        );
      } else {
        await createAgendaEvent(payload, tenantId);
        setMessage(
          t(
            "ADMIN_AGENDA_EVENT_CREATED_THIAGOIAZZETTI",
            "Evento criado com sucesso",
          ),
        );
      }
      resetForm();
      await loadAllEvents();
      await loadSessionsForStudent(form.alunoId);
    } catch (error) {
      setMessage(
        error?.message ||
          t("ADMIN_AGENDA_SAVE_ERROR_THIAGOIAZZETTI", "Falha ao salvar evento"),
      );
    }
  };

  const handleWeeklyGridChange = (slotKey, field, value) => {
    setWeeklyGrid((current) => ({
      ...current,
      [slotKey]: {
        ...current[slotKey],
        [field]: value,
      },
    }));
  };

  const handleCreateMonthlyGrid = async () => {
    if (!form.alunoId || !form.title.trim()) {
      setMessage("Selecione aluno e título para gerar a grade.");
      return;
    }

    const enabledSlots = WEEKDAY_SLOTS.filter(
      (slot) => weeklyGrid[slot.key]?.enabled,
    );

    if (enabledSlots.length === 0) {
      setMessage("Marque pelo menos um dia da semana para gerar a grade.");
      return;
    }

    if (hasWeeklyGridConflicts) {
      setMessage(
        "Nao e possivel criar a grade: ha conflito de horario com outro aluno.",
      );
      return;
    }

    const fromDate = new Date(
      monthRange.first.getFullYear(),
      monthRange.first.getMonth(),
      1,
      0,
      0,
      0,
      0,
    );
    const toDate = new Date(
      monthRange.first.getFullYear(),
      monthRange.first.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );

    const eventsToCreate = [];

    for (
      let cursor = new Date(fromDate);
      cursor <= toDate;
      cursor.setDate(cursor.getDate() + 1)
    ) {
      const dayIndex = cursor.getDay();
      const daySlot = enabledSlots.find((slot) => slot.dayIndex === dayIndex);
      if (!daySlot) {
        continue;
      }

      const config = weeklyGrid[daySlot.key];
      const startsAt = buildDateWithTime(cursor, config?.startsAtTime);
      const endsAt = buildDateWithTime(cursor, config?.endsAtTime);

      if (!startsAt) {
        continue;
      }

      eventsToCreate.push({
        alunoId: form.alunoId,
        title: form.title.trim(),
        description: form.description || null,
        type: form.type,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt ? endsAt.toISOString() : null,
        workoutPlanId: form.workoutPlanId || null,
        dietNotes: form.dietNotes || null,
        recurrence: "NONE",
        recurrenceUntil: null,
        attendanceStatus: form.attendanceStatus,
      });
    }

    if (eventsToCreate.length === 0) {
      setMessage("Nenhum horário válido encontrado para criar a grade.");
      return;
    }

    setCreatingGrid(true);
    let createdCount = 0;
    let conflictCount = 0;

    try {
      for (const payload of eventsToCreate) {
        try {
          await createAgendaEvent(payload, tenantId);
          createdCount += 1;
        } catch (error) {
          if (error?.status === 409) {
            conflictCount += 1;
            continue;
          }
          throw error;
        }
      }

      await loadAllEvents();
      await loadSessionsForStudent(form.alunoId);
      setMessage(
        `Grade criada: ${createdCount} horários adicionados${conflictCount ? `, ${conflictCount} em conflito` : ""}.`,
      );
    } catch (error) {
      setMessage(
        error?.message || "Não foi possível criar a grade de horários.",
      );
    } finally {
      setCreatingGrid(false);
    }
  };

  const handleEdit = (event) => {
    setEditingId(event.id);
    setForm({
      alunoId: event.alunoId || "",
      title: event.title || "",
      description: event.description || "",
      type: event.type || "OUTRO",
      startsAt: toInputDateTime(event.startsAt),
      endsAt: toInputDateTime(event.endsAt),
      workoutPlanId: event.workoutPlanId || "",
      dietNotes: event.dietNotes || "",
      recurrence: event.recurrence || "NONE",
      recurrenceUntil: event.recurrenceUntil
        ? toInputDateTime(event.recurrenceUntil)
        : "",
      attendanceStatus: event.attendanceStatus || "PENDENTE",
    });
  };

  const handleToggleCompletion = async (event) => {
    const newStatus =
      event.attendanceStatus === "CONFIRMADO" ? "PENDENTE" : "CONFIRMADO";
    const payload = {
      ...event,
      attendanceStatus: newStatus,
    };

    try {
      const updated = await updateAgendaEvent(event.id, payload, tenantId);
      setEvents((prev) =>
        prev.map((ev) => (ev.id === event.id ? updated : ev)),
      );
    } catch (error) {
      setMessage(error?.message || "Erro ao marcar como concluído.");
    }
  };

  const handleDelete = async (eventId) => {
    const ok = window.confirm(
      t(
        "ADMIN_AGENDA_CONFIRM_DELETE_THIAGOIAZZETTI",
        "Excluir este evento da agenda?",
      ),
    );
    if (!ok) return;
    try {
      await deleteAgendaEvent(eventId, tenantId);
      setEvents((prev) => prev.filter((ev) => ev.id !== eventId));
      setMessage(
        t("ADMIN_AGENDA_EVENT_DELETED_THIAGOIAZZETTI", "Evento removido"),
      );
    } catch (error) {
      setMessage(
        error?.message ||
          t(
            "ADMIN_AGENDA_DELETE_ERROR_THIAGOIAZZETTI",
            "Nao foi possivel excluir evento",
          ),
      );
    }
  };

  const handleReviewRequest = async (event, decision) => {
    try {
      const response = await reviewAgendaChangeRequest(
        event.id,
        decision,
        tenantId,
      );
      if (response?.deleted) {
        setEvents((prev) => prev.filter((ev) => ev.id !== event.id));
      } else if (response?.event) {
        setEvents((prev) =>
          prev.map((ev) => (ev.id === event.id ? response.event : ev)),
        );
      }
      setMessage(
        decision === "APPROVE"
          ? "Solicitacao aprovada com sucesso."
          : "Solicitacao recusada.",
      );
    } catch (error) {
      setMessage(error?.message || "Nao foi possivel revisar solicitacao.");
    }
  };

  const eventsByDay = useMemo(() => {
    const map = new Map();
    events.forEach((event) => {
      const key = new Date(event.startsAt).toDateString();
      const arr = map.get(key) || [];
      arr.push(event);
      map.set(key, arr);
    });
    return map;
  }, [events]);

  const filteredEvents = useMemo(() => {
    if (!eventFilterAlunoId) {
      return events;
    }
    return events.filter((event) => event.alunoId === eventFilterAlunoId);
  }, [events, eventFilterAlunoId]);

  const filteredEventsByDay = useMemo(() => {
    const map = new Map();
    filteredEvents.forEach((event) => {
      const key = new Date(event.startsAt).toDateString();
      const arr = map.get(key) || [];
      arr.push(event);
      map.set(key, arr);
    });
    return map;
  }, [filteredEvents]);

  const sessionsByDay = useMemo(() => {
    const map = new Map();
    workoutSessions.forEach((session) => {
      const key = new Date(session.startedAt).toDateString();
      const arr = map.get(key) || [];
      arr.push(session);
      map.set(key, arr);
    });
    return map;
  }, [workoutSessions]);

  const selectedDaySessions = useMemo(() => {
    const key = selectedDay.toDateString();
    return sessionsByDay.get(key) || [];
  }, [selectedDay, sessionsByDay]);

  const weeklyGridConflicts = useMemo(() => {
    const conflictsMap = {};

    WEEKDAY_SLOTS.forEach((slot) => {
      const slotState = weeklyGrid[slot.key];
      if (!slotState?.enabled) {
        conflictsMap[slot.key] = { count: 0, names: [] };
        return;
      }

      const startMinutes = timeToMinutes(slotState.startsAtTime);
      const endMinutes =
        timeToMinutes(slotState.endsAtTime) ??
        (startMinutes !== null ? startMinutes + 60 : null);

      if (startMinutes === null) {
        conflictsMap[slot.key] = { count: 0, names: [] };
        return;
      }

      const overlapping = events.filter((event) => {
        if (event.alunoId === form.alunoId) {
          return false;
        }

        const eventStart = new Date(event.startsAt);
        const sameMonth =
          eventStart.getFullYear() === monthRange.first.getFullYear() &&
          eventStart.getMonth() === monthRange.first.getMonth();
        if (!sameMonth || eventStart.getDay() !== slot.dayIndex) {
          return false;
        }

        const eventStartMinutes =
          eventStart.getHours() * 60 + eventStart.getMinutes();
        const eventEndDate = event.endsAt ? new Date(event.endsAt) : null;
        const eventEndMinutes = eventEndDate
          ? eventEndDate.getHours() * 60 + eventEndDate.getMinutes()
          : eventStartMinutes + 60;

        return !(
          endMinutes <= eventStartMinutes || startMinutes >= eventEndMinutes
        );
      });

      const names = [
        ...new Set(
          overlapping.map((event) => event.aluno?.fullName || "Outro aluno"),
        ),
      ];

      conflictsMap[slot.key] = {
        count: overlapping.length,
        names,
      };
    });

    return conflictsMap;
  }, [weeklyGrid, events, form.alunoId, monthRange.first]);

  const hasWeeklyGridConflicts = useMemo(
    () =>
      WEEKDAY_SLOTS.some(
        (slot) => (weeklyGridConflicts[slot.key]?.count || 0) > 0,
      ),
    [weeklyGridConflicts],
  );

  return (
    <main className="space-y-6">
      <section className="rounded-[1.75rem] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(181,240,60,0.15),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-white/40">
              {t("ADMIN_AGENDA_LABEL_THIAGOIAZZETTI", "Agenda")}
            </p>
            <h1 className="mt-2 font-title text-4xl text-[#d4f7a0]">
              {t("ADMIN_AGENDA_TITLE_THIAGOIAZZETTI", "Agenda do Personal")}
            </h1>
            <p className="mt-3 text-sm text-white/68">
              {t(
                "ADMIN_AGENDA_SUBTITLE_THIAGOIAZZETTI",
                "Calendario mensal, recorrencia semanal/mensal e presenca do aluno.",
              )}
            </p>
          </div>
          <CalendarDays className="text-[#b5f03c]" size={28} />
        </div>
      </section>

      {message ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/75">
          {message}
        </div>
      ) : null}

      <section className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-4 md:p-6">
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() =>
              setMonthCursor(
                (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
              )
            }
            className="rounded-lg border border-white/15 p-2 text-white/70"
          >
            <ChevronLeft size={16} />
          </button>
          <h2 className="font-title text-2xl capitalize text-[#b5f03c]">
            {monthLabel}
          </h2>
          <button
            type="button"
            onClick={() =>
              setMonthCursor(
                (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
              )
            }
            className="rounded-lg border border-white/15 p-2 text-white/70"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-2 text-center text-xs uppercase tracking-[0.08em] text-white/45">
          {[
            t("WEEKDAY_SUN_THIAGOIAZZETTI", "Dom"),
            t("WEEKDAY_MON_THIAGOIAZZETTI", "Seg"),
            t("WEEKDAY_TUE_THIAGOIAZZETTI", "Ter"),
            t("WEEKDAY_WED_THIAGOIAZZETTI", "Qua"),
            t("WEEKDAY_THU_THIAGOIAZZETTI", "Qui"),
            t("WEEKDAY_FRI_THIAGOIAZZETTI", "Sex"),
            t("WEEKDAY_SAT_THIAGOIAZZETTI", "Sab"),
          ].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-7 gap-2">
          {calendarDays.map((day) => {
            const key = day.toDateString();
            const dayEvents = filteredEventsByDay.get(key) || [];
            const daySessions = sessionsByDay.get(key) || [];
            const inMonth = day.getMonth() === monthRange.first.getMonth();
            return (
              <div
                key={key}
                onClick={() => setSelectedDay(day)}
                className={`min-h-28 rounded-xl border p-2 ${inMonth ? "border-white/15 bg-black/25" : "border-white/5 bg-black/10"}`}
              >
                <p
                  className={`text-xs ${inMonth ? "text-white/75" : "text-white/30"}`}
                >
                  {day.getDate()}
                </p>
                <div className="mt-1 space-y-1">
                  {dayEvents.slice(0, 3).map((event) => (
                    <div
                      key={event.id}
                      className="rounded-md border border-white/10 bg-white/5 px-1.5 py-1 text-[10px] text-white/80 flex items-start gap-1"
                    >
                      <input
                        type="checkbox"
                        checked={event.attendanceStatus === "CONFIRMADO"}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleToggleCompletion(event);
                        }}
                        className="h-3 w-3 cursor-pointer accent-[#b5f03c] mt-0.5 flex-shrink-0"
                        title="Marcar como concluído"
                      />
                      <div className="flex-1">
                        <div className="font-semibold">
                          {new Date(event.startsAt).toLocaleTimeString(
                            locale || "pt-BR",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                          {event.endsAt && (
                            <>
                              {" - "}
                              {new Date(event.endsAt).toLocaleTimeString(
                                locale || "pt-BR",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </>
                          )}{" "}
                          {event.title}
                        </div>
                        <div className="text-[9px] text-white/60">
                          {event.aluno?.fullName || "Aluno"}
                        </div>
                      </div>
                    </div>
                  ))}
                  {dayEvents.length > 3 ? (
                    <p className="text-[10px] text-white/55">
                      +{dayEvents.length - 3}{" "}
                      {t("CLIENT_AGENDA_EVENTS_THIAGOIAZZETTI", "eventos")}
                    </p>
                  ) : null}
                  {daySessions.length > 0 ? (
                    <p className="text-[10px] text-emerald-200">
                      {daySessions.length} treino(s) concluido(s)
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-6">
        <h3 className="font-title text-lg text-[#b5f03c]">
          Filtrar Calendário por Aluno
        </h3>
        <div className="mt-4">
          <select
            value={eventFilterAlunoId}
            onChange={(e) => setEventFilterAlunoId(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
          >
            <option value="">
              📅 Todos os alunos (mostrar todos os eventos)
            </option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                👤 {student.fullName}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <article className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-6">
          <h2 className="font-title text-2xl text-[#b5f03c]">
            {editingId
              ? t(
                  "ADMIN_AGENDA_EDIT_EVENT_TITLE_THIAGOIAZZETTI",
                  "Editar evento",
                )
              : t("ADMIN_AGENDA_NEW_EVENT_TITLE_THIAGOIAZZETTI", "Novo evento")}
          </h2>
          <form className="mt-5 space-y-4" onSubmit={handleSave}>
            <label className="block text-sm text-white/70">
              {t("ADMIN_AGENDA_STUDENT_LABEL_THIAGOIAZZETTI", "Aluno")}
              <select
                value={form.alunoId}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, alunoId: e.target.value }))
                }
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white outline-none"
              >
                <option value="">
                  {t("ADMIN_AGENDA_SELECT_STUDENT_THIAGOIAZZETTI", "Selecione")}
                </option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.fullName}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block text-sm text-white/70">
                {t("ADMIN_AGENDA_TYPE_LABEL_THIAGOIAZZETTI", "Tipo")}
                <select
                  value={form.type}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, type: e.target.value }))
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white outline-none"
                >
                  <option value="TREINO">
                    {t("ADMIN_AGENDA_TYPE_WORKOUT_THIAGOIAZZETTI", "Treino")}
                  </option>
                  <option value="DIETA">
                    {t("ADMIN_AGENDA_TYPE_DIET_THIAGOIAZZETTI", "Dieta")}
                  </option>
                  <option value="CONSULTA">
                    {t("ADMIN_AGENDA_TYPE_CONSULT_THIAGOIAZZETTI", "Consulta")}
                  </option>
                  <option value="CHECKIN">
                    {t("ADMIN_AGENDA_TYPE_CHECKIN_THIAGOIAZZETTI", "Check-in")}
                  </option>
                  <option value="OUTRO">
                    {t("ADMIN_AGENDA_TYPE_OTHER_THIAGOIAZZETTI", "Outro")}
                  </option>
                </select>
              </label>
              <label className="block text-sm text-white/70">
                {t("ADMIN_AGENDA_ATTENDANCE_LABEL_THIAGOIAZZETTI", "Presenca")}
                <select
                  value={form.attendanceStatus}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      attendanceStatus: e.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white outline-none"
                >
                  <option value="PENDENTE">
                    {t(
                      "ADMIN_AGENDA_STATUS_PENDING_THIAGOIAZZETTI",
                      "Pendente",
                    )}
                  </option>
                  <option value="CONFIRMADO">
                    {t(
                      "ADMIN_AGENDA_STATUS_CONFIRMED_THIAGOIAZZETTI",
                      "Confirmado",
                    )}
                  </option>
                  <option value="FALTOU">
                    {t("ADMIN_AGENDA_STATUS_MISSED_THIAGOIAZZETTI", "Faltou")}
                  </option>
                </select>
              </label>
            </div>
            <label className="block text-sm text-white/70">
              {t("ADMIN_AGENDA_TITLE_FIELD_THIAGOIAZZETTI", "Titulo")}
              <input
                value={form.title}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, title: e.target.value }))
                }
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white outline-none"
              />
            </label>
            <label className="block text-sm text-white/70">
              {t("ADMIN_AGENDA_DESCRIPTION_LABEL_THIAGOIAZZETTI", "Descricao")}
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, description: e.target.value }))
                }
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white outline-none"
              />
            </label>

            {form.recurrence === "NONE" && (
              <div className="grid gap-3 md:grid-cols-2">
                <label className="block text-sm text-white/70">
                  {t("ADMIN_AGENDA_START_LABEL_THIAGOIAZZETTI", "Inicio")}
                  <input
                    type="datetime-local"
                    value={form.startsAt}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, startsAt: e.target.value }))
                    }
                    className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white outline-none"
                  />
                </label>
                <label className="block text-sm text-white/70">
                  {t("ADMIN_AGENDA_END_LABEL_THIAGOIAZZETTI", "Fim")}
                  <input
                    type="datetime-local"
                    value={form.endsAt}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, endsAt: e.target.value }))
                    }
                    className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white outline-none"
                  />
                </label>
              </div>
            )}

            <div className="grid gap-3 md:grid-cols-2">
              <label className="block text-sm text-white/70">
                {t(
                  "ADMIN_AGENDA_RECURRENCE_LABEL_THIAGOIAZZETTI",
                  "Recorrencia",
                )}
                <select
                  value={form.recurrence}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, recurrence: e.target.value }))
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white outline-none"
                >
                  <option value="NONE">
                    {t(
                      "ADMIN_AGENDA_RECURRENCE_NONE_THIAGOIAZZETTI",
                      "Nao repetir",
                    )}
                  </option>
                  <option value="WEEKLY">
                    {t(
                      "ADMIN_AGENDA_RECURRENCE_WEEKLY_THIAGOIAZZETTI",
                      "Semanal",
                    )}
                  </option>
                  <option value="MONTHLY">
                    {t(
                      "ADMIN_AGENDA_RECURRENCE_MONTHLY_THIAGOIAZZETTI",
                      "Mensal",
                    )}
                  </option>
                </select>
              </label>
              <label className="block text-sm text-white/70">
                {t("ADMIN_AGENDA_REPEAT_UNTIL_THIAGOIAZZETTI", "Repetir ate")}
                <input
                  type="datetime-local"
                  value={form.recurrenceUntil}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      recurrenceUntil: e.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white outline-none"
                  disabled={form.recurrence === "NONE"}
                />
              </label>
            </div>

            {form.recurrence !== "NONE" && (
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      Grade semanal de horários
                    </p>
                    <p className="text-xs text-white/55">
                      Marque os dias e horários para gerar a grade do mês
                      selecionado.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCreateMonthlyGrid}
                    disabled={creatingGrid || hasWeeklyGridConflicts}
                    className="rounded-xl border border-[#b5f03c]/50 bg-[#b5f03c]/10 px-4 py-2 text-sm font-semibold text-[#b5f03c] transition hover:bg-[#b5f03c]/20 disabled:opacity-50"
                  >
                    {creatingGrid ? "Gerando..." : "Criar grade do mês"}
                  </button>
                </div>

                <div className="mt-4 space-y-2">
                  {WEEKDAY_SLOTS.map((slot) => {
                    const slotState = weeklyGrid[slot.key] || {
                      enabled: false,
                      startsAtTime: "07:00",
                      endsAtTime: "08:00",
                    };
                    const slotConflict = weeklyGridConflicts[slot.key] || {
                      count: 0,
                      names: [],
                    };
                    const hasConflict =
                      slotState.enabled && slotConflict.count > 0;

                    return (
                      <div
                        key={slot.key}
                        className={`grid grid-cols-[auto_1fr_1fr] items-center gap-3 rounded-xl border p-3 ${hasConflict ? "border-red-400/50 bg-red-500/10" : "border-white/10 bg-white/5"}`}
                      >
                        <label className="inline-flex items-center gap-2 text-sm text-white/75">
                          <input
                            type="checkbox"
                            checked={slotState.enabled}
                            onChange={(e) =>
                              handleWeeklyGridChange(
                                slot.key,
                                "enabled",
                                e.target.checked,
                              )
                            }
                          />
                          {slot.label}
                        </label>

                        <input
                          type="time"
                          value={slotState.startsAtTime}
                          disabled={!slotState.enabled}
                          onChange={(e) =>
                            handleWeeklyGridChange(
                              slot.key,
                              "startsAtTime",
                              e.target.value,
                            )
                          }
                          className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none disabled:opacity-40"
                        />

                        <input
                          type="time"
                          value={slotState.endsAtTime}
                          disabled={!slotState.enabled}
                          onChange={(e) =>
                            handleWeeklyGridChange(
                              slot.key,
                              "endsAtTime",
                              e.target.value,
                            )
                          }
                          className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none disabled:opacity-40"
                        />

                        {hasConflict ? (
                          <p className="col-span-3 text-xs text-red-300">
                            Conflito: ja existe horario com{" "}
                            {slotConflict.names.join(", ")}.
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <label className="block text-sm text-white/70">
              {t(
                "ADMIN_AGENDA_RELATED_WORKOUT_THIAGOIAZZETTI",
                "Treino relacionado",
              )}
              <select
                value={form.workoutPlanId}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    workoutPlanId: e.target.value,
                  }))
                }
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white outline-none"
              >
                <option value="">
                  {t(
                    "ADMIN_AGENDA_NO_WORKOUT_THIAGOIAZZETTI",
                    "Sem treino vinculado",
                  )}
                </option>
                {workouts.map((workout) => (
                  <option key={workout.id} value={workout.id}>
                    {workout.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm text-white/70">
              {t(
                "ADMIN_AGENDA_DIET_NOTES_LABEL_THIAGOIAZZETTI",
                "Dieta / orientacoes",
              )}
              <textarea
                rows={3}
                value={form.dietNotes}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, dietNotes: e.target.value }))
                }
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white outline-none"
              />
            </label>
            <div className="flex gap-2">
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl bg-[#b5f03c] px-5 py-3 font-semibold text-black"
              >
                <Save size={16} />
                {editingId
                  ? t(
                      "ADMIN_AGENDA_SAVE_CHANGES_THIAGOIAZZETTI",
                      "Salvar alteracoes",
                    )
                  : t(
                      "ADMIN_AGENDA_CREATE_EVENT_THIAGOIAZZETTI",
                      "Criar evento",
                    )}
              </button>
              {editingId ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl border border-white/15 px-5 py-3 text-sm text-white/70"
                >
                  {t("ADMIN_AGENDA_CANCEL_THIAGOIAZZETTI", "Cancelar")}
                </button>
              ) : null}
            </div>
          </form>
        </article>

        <article className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-6">
          <h2 className="font-title text-2xl text-[#b5f03c]">
            Historico de treino do dia (
            {selectedDay.toLocaleDateString("pt-BR")})
          </h2>
          <div className="mt-4 space-y-3">
            {selectedDaySessions.length === 0 ? (
              <p className="rounded-2xl border border-white/10 bg-black/30 px-4 py-4 text-sm text-white/60">
                Nenhum treino finalizado neste dia.
              </p>
            ) : (
              selectedDaySessions.map((session) => (
                <div
                  key={session.id}
                  className="rounded-2xl border border-white/10 bg-black/30 p-4"
                >
                  <p className="font-semibold text-white">
                    {session.workoutPlan?.title || "Treino"}
                  </p>
                  <p className="mt-1 text-sm text-white/60">
                    Duracao: {formatDurationSeconds(session.durationSeconds)}
                  </p>
                  <p className="text-xs text-white/45">
                    Inicio: {formatDateTime(session.startedAt)}
                  </p>
                  <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
                    {(session.items || []).map((item) => (
                      <div
                        key={item.id}
                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/75"
                      >
                        <p className="font-semibold text-white">
                          {item.exerciseName}
                        </p>
                        <p className="text-white/60">
                          Cargas: {item.loadNotes || "-"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-6">
          <h2 className="font-title text-2xl text-[#b5f03c]">
            {t("ADMIN_AGENDA_EVENTS_TITLE_THIAGOIAZZETTI", "Eventos")} (
            {filteredEvents.length})
          </h2>
          <div className="mt-5 space-y-3">
            {loading ? (
              <p className="text-sm text-white/60">
                {t("ADMIN_AGENDA_LOADING_THIAGOIAZZETTI", "Carregando...")}
              </p>
            ) : filteredEvents.length === 0 ? (
              <p className="rounded-2xl border border-white/10 bg-black/30 px-4 py-5 text-sm text-white/65">
                {t(
                  "ADMIN_AGENDA_EMPTY_THIAGOIAZZETTI",
                  "Nenhum evento cadastrado.",
                )}
              </p>
            ) : (
              filteredEvents.map((event) => (
                <div
                  key={event.id}
                  className="rounded-2xl border border-white/10 bg-black/30 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <input
                          type="checkbox"
                          checked={event.attendanceStatus === "CONFIRMADO"}
                          onChange={() => handleToggleCompletion(event)}
                          className="h-5 w-5 cursor-pointer accent-[#b5f03c]"
                          title="Marcar como concluído"
                        />
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${eventTone(event.type)}`}
                        >
                          {event.type}
                        </span>
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${attendanceTone(event.attendanceStatus)}`}
                        >
                          {event.attendanceStatus}
                        </span>
                        <p className="font-semibold text-white">
                          {event.title}
                        </p>
                      </div>
                      <p className="text-xs text-white/50 flex items-center gap-1">
                        <User size={12} className="text-white/30" />
                        {event.aluno?.fullName || "Aluno desconhecido"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(event)}
                        className="rounded-lg border border-white/10 px-3 py-1 text-xs text-white/70 hover:text-white"
                      >
                        {t("ADMIN_AGENDA_EDIT_BUTTON_THIAGOIAZZETTI", "Editar")}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(event.id)}
                        className="rounded-lg border border-red-400/30 px-3 py-1 text-xs text-red-200"
                      >
                        {t(
                          "ADMIN_AGENDA_DELETE_BUTTON_THIAGOIAZZETTI",
                          "Excluir",
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
                    <div className="flex items-center gap-2 text-white/75">
                      <User size={14} className="text-white/45" />
                      <span>{event.aluno?.fullName || "Aluno"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/75">
                      <Clock3 size={14} className="text-white/45" />
                      <span>
                        {formatDateTime(event.startsAt)}{" "}
                        {event.endsAt
                          ? `- ${formatDateTime(event.endsAt)}`
                          : ""}
                      </span>
                    </div>
                    {event.workoutPlan?.title ? (
                      <div className="flex items-center gap-2 text-white/75">
                        <Dumbbell size={14} className="text-white/45" />
                        <span>{event.workoutPlan.title}</span>
                      </div>
                    ) : null}
                    {event.dietNotes ? (
                      <div className="flex items-center gap-2 text-white/75">
                        <Salad size={14} className="text-white/45" />
                        <span>{event.dietNotes}</span>
                      </div>
                    ) : null}
                  </div>
                  {event.description ? (
                    <p className="mt-2 text-sm text-white/60">
                      {event.description}
                    </p>
                  ) : null}
                  {event.changeRequestStatus === "PENDING" ? (
                    <div className="mt-3 rounded-xl border border-amber-300/30 bg-amber-500/10 p-3">
                      <p className="text-xs font-semibold text-amber-200">
                        Solicitacao pendente do aluno:{" "}
                        {event.changeRequestType === "RESCHEDULE"
                          ? "Remarcacao"
                          : "Cancelamento"}
                      </p>
                      {event.proposedStartsAt ? (
                        <p className="mt-1 text-xs text-amber-100/85">
                          Novo horario proposto:{" "}
                          {formatDateTime(event.proposedStartsAt)}
                        </p>
                      ) : null}
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleReviewRequest(event, "APPROVE")}
                          className="rounded-lg border border-emerald-400/35 px-3 py-1.5 text-xs text-emerald-200"
                        >
                          Aprovar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReviewRequest(event, "REJECT")}
                          className="rounded-lg border border-red-400/35 px-3 py-1.5 text-xs text-red-200"
                        >
                          Recusar
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </article>
      </section>
    </main>
  );
}
