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

function parseRemateDateTime(fechaCompleta: string) {
  const match = fechaCompleta.trim().match(REMATE_DATE_PATTERN);
  if (!match) return null;

  const [, dayText, monthText, yearText, hourText, minuteText] = match;
  const day = Number(dayText);
  const month = Number(monthText);
  const year = Number(yearText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const date = new Date(year, month - 1, day, hour, minute);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return { day, month, hour, minute };
}

export function isValidRemateDateTime(fechaCompleta: string): boolean {
  // Comprueba tanto el formato como la existencia real del día en el calendario.
  return parseRemateDateTime(fechaCompleta) !== null;
}

export function formatRemateDateSummary(
  fechaCompleta: string,
  fechaPorConfirmar = false
): string {
  if (fechaPorConfirmar) return "Fecha a confirmar";

  const parsedDate = parseRemateDateTime(fechaCompleta);
  if (!parsedDate) return "";

  const day = String(parsedDate.day).padStart(2, "0");
  const time = `${String(parsedDate.hour).padStart(2, "0")}:${String(
    parsedDate.minute
  ).padStart(2, "0")}`;
  return `${day} ${MONTH_ABBREVIATIONS[parsedDate.month - 1]} · ${time}`;
}

export function formatRemateDateDisplay(
  fechaCompleta: string,
  fechaPorConfirmar = false
): string {
  return fechaPorConfirmar ? "Fecha a confirmar" : fechaCompleta;
}
