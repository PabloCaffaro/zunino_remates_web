export const REMATE_TIME_ZONE = "America/Montevideo";

const MONTH_ABBREVIATIONS = [
  "ENE",
  "FEB",
  "MAR",
  "ABR",
  "MAY",
  "JUN",
  "JUL",
  "AGO",
  "SEP",
  "OCT",
  "NOV",
  "DIC",
];

const REMATE_DATE_PATTERN = /^(\d{2})\/(\d{2})\/(\d{4}) ([01]\d|2[0-3]):([0-5]\d)$/;

type DateParts = {
  day: number;
  month: number;
  year: number;
  hour: number;
  minute: number;
};

const zonedDateFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: REMATE_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function parseRemateDateTimeInput(value: string): DateParts | null {
  const match = value.trim().match(REMATE_DATE_PATTERN);
  if (!match) return null;

  const [, dayText, monthText, yearText, hourText, minuteText] = match;
  const parts = {
    day: Number(dayText),
    month: Number(monthText),
    year: Number(yearText),
    hour: Number(hourText),
    minute: Number(minuteText),
  };
  const calendarDate = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute)
  );

  if (
    calendarDate.getUTCFullYear() !== parts.year ||
    calendarDate.getUTCMonth() !== parts.month - 1 ||
    calendarDate.getUTCDate() !== parts.day
  ) {
    return null;
  }

  return parts;
}

function getZonedDateParts(date: Date): DateParts | null {
  if (Number.isNaN(date.getTime())) return null;

  const values = Object.fromEntries(
    zonedDateFormatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)])
  );

  return {
    day: values.day,
    month: values.month,
    year: values.year,
    hour: values.hour,
    minute: values.minute,
  };
}

function formatInputParts(parts: DateParts): string {
  return `${String(parts.day).padStart(2, "0")}/${String(parts.month).padStart(
    2,
    "0"
  )}/${parts.year} ${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(
    2,
    "0"
  )}`;
}

export function isValidRemateDateTime(value: string): boolean {
  return parseRemateDateTimeInput(value) !== null;
}

export function remateDateTimeInputToIso(value: string): string | null {
  const desired = parseRemateDateTimeInput(value);
  if (!desired) return null;

  // Calcula el desplazamiento de Montevideo para esa fecha sin depender de la zona del navegador.
  const localAsUtc = Date.UTC(
    desired.year,
    desired.month - 1,
    desired.day,
    desired.hour,
    desired.minute
  );
  const firstPass = new Date(localAsUtc);
  const firstPassParts = getZonedDateParts(firstPass);
  if (!firstPassParts) return null;

  const representedAsUtc = Date.UTC(
    firstPassParts.year,
    firstPassParts.month - 1,
    firstPassParts.day,
    firstPassParts.hour,
    firstPassParts.minute
  );
  const instant = new Date(localAsUtc - (representedAsUtc - localAsUtc));
  const verifiedParts = getZonedDateParts(instant);

  return verifiedParts && formatInputParts(verifiedParts) === formatInputParts(desired)
    ? instant.toISOString()
    : null;
}

export function formatRemateDateInput(fechaHora: string | null): string {
  if (!fechaHora) return "";
  const parts = getZonedDateParts(new Date(fechaHora));
  return parts ? formatInputParts(parts) : "";
}

export function formatRemateDateSummary(
  fechaHora: string | null,
  fechaPorConfirmar = false
): string {
  if (fechaPorConfirmar) return "Fecha a confirmar";

  const parts = fechaHora ? getZonedDateParts(new Date(fechaHora)) : null;
  if (!parts) return "";

  const day = String(parts.day).padStart(2, "0");
  const time = `${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(
    2,
    "0"
  )}`;
  return `${day} ${MONTH_ABBREVIATIONS[parts.month - 1]} · ${time}`;
}

export function formatRemateDateDisplay(
  fechaHora: string | null,
  fechaPorConfirmar = false
): string {
  return fechaPorConfirmar ? "Fecha a confirmar" : formatRemateDateInput(fechaHora);
}
