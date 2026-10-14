export const bowelStates = [
  '未选择',
  '顺畅',
  '偏干',
  '偏稀',
  '费力',
  '其他',
] as const
export const mealKinds = ['早餐', '午餐', '晚餐', '加餐'] as const
export type BowelEntry = { id: string; time: string; state: string }
export type MealEntry = {
  id: string
  time: string
  dish: string
  kind: string
  note: string
}
export type Diary = { version: 1; bowel: BowelEntry[]; meals: MealEntry[] }

export function localDay(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function localMinute(date: Date): string {
  return `${localDay(date)}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

export function parseDiary(raw: string | null): Diary {
  if (raw === null) return { version: 1, bowel: [], meals: [] }
  const value: unknown = JSON.parse(raw)
  const object = (entry: unknown): entry is Record<string, unknown> =>
    typeof entry === 'object' && entry !== null && !Array.isArray(entry)
  const base = (entry: unknown): entry is Record<string, unknown> =>
    object(entry) &&
    typeof entry.id === 'string' &&
    entry.id.length > 0 &&
    typeof entry.time === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(entry.time) &&
    Number.isFinite(Date.parse(entry.time)) &&
    new Date(entry.time).toISOString() === entry.time
  if (
    !object(value) ||
    value.version !== 1 ||
    !Array.isArray(value.bowel) ||
    !Array.isArray(value.meals) ||
    !value.bowel.every(
      (entry) =>
        base(entry) && bowelStates.some((state) => state === entry.state),
    ) ||
    !value.meals.every(
      (entry) =>
        base(entry) &&
        typeof entry.dish === 'string' &&
        entry.dish.trim().length > 0 &&
        entry.dish.length <= 80 &&
        mealKinds.some((kind) => kind === entry.kind) &&
        typeof entry.note === 'string' &&
        entry.note.length <= 200,
    )
  ) {
    throw new Error('生活记录格式不受支持，请先备份原始数据。')
  }
  const identifiers = [...value.bowel, ...value.meals].map((entry) => entry.id)
  if (new Set(identifiers).size !== identifiers.length)
    throw new Error('记录标识重复，请先备份原始数据。')
  return value as Diary
}

export function monthDays(year: number, month: number): (Date | null)[] {
  const padding = (new Date(year, month, 1).getDay() + 6) % 7
  return [
    ...Array<null>(padding).fill(null),
    ...Array.from(
      { length: new Date(year, month + 1, 0).getDate() },
      (_, index) => new Date(year, month, index + 1),
    ),
  ]
}

export function mealPool(meals: MealEntry[]): string[] {
  return [...new Set(meals.map((meal) => meal.dish.trim()))]
}
