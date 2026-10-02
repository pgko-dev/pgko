import dayjs from "dayjs";

export function formatDateYMD(value: string) {
  return dayjs(value).format("YYYY-MM-DD");
}

export function formatDateYMDHM(value: string) {
  return dayjs(value).format("YYYY/MM/DD HH:mm");
}
