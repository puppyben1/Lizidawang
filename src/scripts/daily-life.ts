import { foodOptions } from '../data/food-options'
import {
  bowelStates,
  localDay,
  localMinute,
  mealPool,
  monthDays,
  parseDiary,
} from '../data/daily-life'
import type { Diary } from '../data/daily-life'

type Calendar = 'bowel' | 'meals'
const storageKey = 'piggy-daily-life-v1'
const element = <ElementType extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id)! as ElementType
let diary: Diary = { version: 1, bowel: [], meals: [] }
let original = ''
let locked = false
const now = new Date()
const selected = { bowel: localDay(now), meals: localDay(now) }
const months = {
  bowel: new Date(now.getFullYear(), now.getMonth(), 1),
  meals: new Date(now.getFullYear(), now.getMonth(), 1),
}
const timeFormat = new Intl.DateTimeFormat('zh-CN', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

function feedback(app: Calendar | 'food', message: string) {
  element(`${app}-feedback`).textContent = message
}

try {
  const stored = localStorage.getItem(storageKey)
  original = stored ?? ''
  diary = parseDiary(stored)
} catch {
  locked = true
  for (const app of ['bowel', 'meals'] as const)
    feedback(
      app,
      '无法读取本地记录，已暂停写入以保护原数据。请导出备份后检查浏览器存储权限或数据。',
    )
}

function save(next: Diary, app: Calendar): boolean {
  if (locked) {
    feedback(app, '记录目前只读，未保存。请先导出备份并检查浏览器存储。')
    return false
  }
  try {
    if ((localStorage.getItem(storageKey) ?? '') !== original) {
      feedback(app, '其他页面更新了记录，本次未保存。请刷新后重试，避免覆盖。')
      return false
    }
    const serialized = JSON.stringify(next)
    localStorage.setItem(storageKey, serialized)
    original = serialized
    diary = next
    feedback(app, '已存进小猪的生活存钱罐 ♡')
    renderAll()
    return true
  } catch {
    feedback(
      app,
      '保存失败：浏览器存储不可用或已满。本次未保存，请导出已有记录备份。',
    )
    return false
  }
}

function renderCalendar(app: Calendar) {
  const month = months[app]
  element(`${app}-month`).textContent =
    `${month.getFullYear()} 年 ${month.getMonth() + 1} 月`
  const counts = new Map<string, number>()
  diary[app].forEach((entry) => {
    const day = localDay(new Date(entry.time))
    counts.set(day, (counts.get(day) ?? 0) + 1)
  })
  const grid = element(`${app}-calendar`)
  grid.replaceChildren()
  let monthlyTotal = 0
  let recordedDays = 0
  monthDays(month.getFullYear(), month.getMonth()).forEach((date) => {
    if (!date) {
      const blank = document.createElement('span')
      blank.setAttribute('aria-hidden', 'true')
      grid.append(blank)
      return
    }
    const key = localDay(date)
    const count = counts.get(key) ?? 0
    monthlyTotal += count
    if (count) recordedDays++
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'calendar-day'
    button.classList.toggle('has-records', count > 0)
    button.setAttribute('aria-pressed', String(key === selected[app]))
    button.setAttribute('aria-label', `${key}，${count} 条记录`)
    if (key === localDay(new Date()))
      button.setAttribute('aria-current', 'date')
    const number = document.createElement('span')
    number.textContent = String(date.getDate())
    const mark = document.createElement('small')
    mark.textContent = count ? `${app === 'bowel' ? '💩' : '🍚'} ${count}` : '·'
    button.append(number, mark)
    button.addEventListener('click', () => {
      selected[app] = key
      renderCalendar(app)
      renderEntries(app)
    })
    grid.append(button)
  })
  element(`${app}-summary`).textContent =
    `本月存下 ${monthlyTotal} 条记录 · ${recordedDays} 个有记录的日子`
}

function renderEntries(app: Calendar) {
  element(`${app}-day-title`).textContent = `${selected[app]} 的小记`
  const container = element(`${app}-entries`)
  container.replaceChildren()
  const entries = diary[app]
    .filter((entry) => localDay(new Date(entry.time)) === selected[app])
    .sort((first, second) => second.time.localeCompare(first.time))
  if (!entries.length) {
    const empty = document.createElement('p')
    empty.className = 'diary-empty'
    empty.textContent = '这一天还没有记录，留一点小日常给小猪吧 ♡'
    container.append(empty)
  }
  entries.forEach((entry) => {
    const card = document.createElement('article')
    card.className = 'diary-entry'
    const heading = document.createElement('strong')
    heading.textContent = `${timeFormat.format(new Date(entry.time))} · ${'dish' in entry ? `${entry.kind} / ${entry.dish}` : '便便签到'}`
    card.append(heading)
    if ('state' in entry) {
      const label = document.createElement('label')
      label.textContent = '这次的状态 '
      const select = document.createElement('select')
      bowelStates.forEach((state) => {
        const option = document.createElement('option')
        option.value = state
        option.textContent = state
        select.append(option)
      })
      select.value = entry.state
      select.disabled = locked
      select.addEventListener('change', () => {
        if (
          !save(
            {
              ...diary,
              bowel: diary.bowel.map((item) =>
                item.id === entry.id ? { ...item, state: select.value } : item,
              ),
            },
            'bowel',
          )
        )
          select.value = entry.state
      })
      label.append(select)
      card.append(label)
    } else if (entry.note) {
      const note = document.createElement('p')
      note.textContent = entry.note
      card.append(note)
    }
    const remove = document.createElement('button')
    remove.className = 'entry-delete'
    remove.textContent = '删除这条记录'
    remove.disabled = locked
    remove.addEventListener('click', () => {
      if (!confirm('确定删除这条记录？此操作不能撤销。')) return
      if (app === 'bowel')
        save(
          {
            ...diary,
            bowel: diary.bowel.filter((item) => item.id !== entry.id),
          },
          app,
        )
      else
        save(
          {
            ...diary,
            meals: diary.meals.filter((item) => item.id !== entry.id),
          },
          app,
        )
    })
    card.append(remove)
    container.append(card)
  })
}

function renderAll() {
  for (const app of ['bowel', 'meals'] as const) {
    renderCalendar(app)
    renderEntries(app)
  }
  updatePool()
}

function selectDate(app: Calendar, date: Date) {
  selected[app] = localDay(date)
  months[app] = new Date(date.getFullYear(), date.getMonth(), 1)
}

element<HTMLButtonElement>('bowel-checkin').addEventListener('click', () => {
  const date = new Date()
  selectDate('bowel', date)
  save(
    {
      ...diary,
      bowel: [
        ...diary.bowel,
        { id: crypto.randomUUID(), time: date.toISOString(), state: '未选择' },
      ],
    },
    'bowel',
  )
})
const mealTime = element<HTMLInputElement>('meal-time')
mealTime.value = localMinute(now)
element<HTMLFormElement>('meal-form').addEventListener('submit', (event) => {
  event.preventDefault()
  const dish = element<HTMLInputElement>('meal-name').value.trim()
  const note = element<HTMLInputElement>('meal-note').value.trim()
  const kind = element<HTMLSelectElement>('meal-kind').value
  const date = new Date(mealTime.value)
  if (
    !dish ||
    dish.length > 80 ||
    note.length > 200 ||
    !Number.isFinite(date.getTime()) ||
    date.getFullYear() < 1000 ||
    date.getFullYear() > 9999
  ) {
    feedback('meals', '请填写有效的菜名和用餐时间。')
    return
  }
  selectDate('meals', date)
  if (
    save(
      {
        ...diary,
        meals: [
          ...diary.meals,
          {
            id: crypto.randomUUID(),
            time: date.toISOString(),
            dish,
            kind,
            note,
          },
        ],
      },
      'meals',
    )
  ) {
    element<HTMLFormElement>('meal-form').reset()
    mealTime.value = localMinute(new Date())
  }
})
document.querySelectorAll<HTMLButtonElement>('[data-month]').forEach((button) =>
  button.addEventListener('click', () => {
    const app = button.dataset.month as Calendar
    const month = months[app]
    const next = new Date(
      month.getFullYear(),
      month.getMonth() + Number(button.dataset.step),
      1,
    )
    if (next.getFullYear() < 1000 || next.getFullYear() > 9999) return
    months[app] = next
    selected[app] = localDay(next)
    renderCalendar(app)
    renderEntries(app)
  }),
)
document.querySelectorAll<HTMLButtonElement>('[data-today]').forEach((button) =>
  button.addEventListener('click', () => {
    const app = button.dataset.today as Calendar
    selectDate(app, new Date())
    renderCalendar(app)
    renderEntries(app)
  }),
)

document
  .querySelectorAll<HTMLButtonElement>('[data-export-diary]')
  .forEach((button) =>
    button.addEventListener('click', () => {
      const content = locked ? original : JSON.stringify(diary, null, 2)
      if (locked && !content) {
        for (const app of ['bowel', 'meals'] as const)
          feedback(app, '未读取到可导出的原数据，请检查浏览器存储权限。')
        return
      }
      const url = URL.createObjectURL(
        new Blob([content], { type: 'application/json' }),
      )
      const link = document.createElement('a')
      link.href = url
      link.download = `piggy-diary-${localDay(new Date())}${locked ? '-original' : ''}.json`
      document.body.append(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    }),
  )

let foodMode = 'all'
let spinning = false
let chosenDish = ''
const spin = element<HTMLButtonElement>('food-spin')
const addMeal = element<HTMLButtonElement>('food-add-meal')
function pool() {
  return foodMode === 'history'
    ? mealPool(diary.meals)
    : foodOptions.flatMap((group) => group.dishes)
}
function updatePool() {
  const options = pool()
  element('food-pool-note').textContent =
    foodMode === 'history'
      ? `已记录 ${options.length} 道不同的饭${options.length ? '，每道被抽中的机会相同。' : '，先去吃饭记录存下一餐吧。'}`
      : `8 个种类 · ${options.length} 道内置候选 · 每道等概率`
  element('food-categories').hidden = foodMode === 'history'
  spin.disabled = spinning || !options.length
}
document
  .querySelectorAll<HTMLButtonElement>('[data-food-mode]')
  .forEach((button) =>
    button.addEventListener('click', () => {
      foodMode = button.dataset.foodMode!
      chosenDish = ''
      addMeal.disabled = true
      element('food-result').textContent = '把选择困难交给小猪吧'
      document
        .querySelectorAll<HTMLButtonElement>('[data-food-mode]')
        .forEach((mode) =>
          mode.setAttribute('aria-pressed', String(mode === button)),
        )
      updatePool()
    }),
  )
spin.addEventListener('click', () => {
  const options = pool()
  if (spinning || !options.length) return
  spinning = true
  chosenDish = ''
  addMeal.disabled = true
  spin.disabled = true
  feedback('food', '')
  const modes = document.querySelectorAll<HTMLButtonElement>('[data-food-mode]')
  modes.forEach((button) => {
    button.disabled = true
  })
  element('food-machine').classList.add('is-spinning')
  element('food-result').textContent = '小猪正在翻菜谱…'
  setTimeout(
    () => {
      chosenDish = options[Math.floor(Math.random() * options.length)]
      element('food-result').textContent = chosenDish
      element('food-machine').classList.remove('is-spinning')
      feedback('food', '今天就吃这个？不喜欢也可以再抽一次 ♡')
      spinning = false
      modes.forEach((button) => {
        button.disabled = false
      })
      addMeal.disabled = false
      updatePool()
    },
    matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 900,
  )
})
addMeal.addEventListener('click', () => {
  if (!chosenDish) return
  document.querySelector<HTMLButtonElement>('[data-open="meals"]')!.click()
  element<HTMLInputElement>('meal-name').value = chosenDish
  mealTime.value = localMinute(new Date())
  element<HTMLInputElement>('meal-name').focus()
  feedback('meals', '已填入抽中的菜名，确认吃过后再保存，不会自动记账。')
})
renderAll()
