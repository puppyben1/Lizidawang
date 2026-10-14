import { photos } from '../data/memory'

const desktop = document.querySelector<HTMLElement>('.memory-os')!
const themePicker = document.querySelector<HTMLSelectElement>('#theme-picker')!
const status = document.querySelector<HTMLElement>('#desktop-status')!
const panels = [...document.querySelectorAll<HTMLElement>('.retro-window')]
const taskButtons = [
  ...document.querySelectorAll<HTMLButtonElement>('[data-task]'),
]
const preview = document.querySelector<HTMLDialogElement>('#photo-preview')!
const storageKey = 'for-you-desktop-v1'
let topLayer = 10
let selectedLetter = 0
let readLetters: number[] = []
let savedTheme = 'pudding'
const returnFocus = new Map<string, HTMLElement>()

try {
  const saved = JSON.parse(localStorage.getItem(storageKey) || '{}')
  if (['bubble', 'picnic', 'pudding'].includes(saved.theme))
    savedTheme = saved.theme
  if (Array.isArray(saved.read))
    readLetters = [
      ...new Set(
        saved.read.filter(
          (index: unknown) =>
            Number.isInteger(index) && Number(index) >= 0 && Number(index) < 6,
        ),
      ),
    ] as number[]
} catch {
  savedTheme = 'pudding'
}

function savePreferences() {
  try {
    localStorage.setItem(
      storageKey,
      JSON.stringify({ theme: savedTheme, read: readLetters }),
    )
  } catch {
    status.textContent = '浏览器未允许保存设置；本次操作仍然有效。'
  }
}

function setTheme(theme: string) {
  if (!['bubble', 'picnic', 'pudding'].includes(theme)) return
  savedTheme = theme
  desktop.dataset.theme = theme
  themePicker.value = theme
  document
    .querySelectorAll<HTMLButtonElement>('[data-set-theme]')
    .forEach((button) =>
      button.setAttribute(
        'aria-pressed',
        String(button.dataset.setTheme === theme),
      ),
    )
  const color = getComputedStyle(desktop).getPropertyValue('--sky').trim()
  document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')!.content =
    color
  document.documentElement.style.backgroundColor = color
}

function updateReadState() {
  document.querySelector<HTMLElement>('#unread-count')!.textContent =
    `${6 - readLetters.length} UNREAD`
  document
    .querySelectorAll<HTMLButtonElement>('[data-letter]')
    .forEach((button) => {
      const index = Number(button.dataset.letter)
      button.querySelector<HTMLElement>('.letter-dot')!.textContent =
        readLetters.includes(index) ? '○' : '●'
      button.setAttribute('aria-pressed', String(index === selectedLetter))
    })
}

function selectLetter(index: number) {
  selectedLetter = index
  document
    .querySelectorAll<HTMLElement>('[data-letter-content]')
    .forEach((letter) => {
      letter.hidden = Number(letter.dataset.letterContent) !== index
    })
  if (!readLetters.includes(index)) readLetters.push(index)
  updateReadState()
  savePreferences()
}

function syncTasks() {
  document.querySelector<HTMLElement>('#idle-status')!.hidden =
    taskButtons.some((button) => !button.hidden)
  taskButtons.forEach((button) => {
    const panel = document.getElementById(`window-${button.dataset.task}`)!
    button.setAttribute('aria-pressed', String(!panel.hidden))
  })
}

function openPanel(name: string, trigger?: HTMLElement) {
  const panel = document.getElementById(`window-${name}`)
  if (!panel) return
  if (trigger) returnFocus.set(name, trigger)
  panel.hidden = false
  panel.style.zIndex = String(++topLayer)
  const task = taskButtons.find((button) => button.dataset.task === name)
  if (task) task.hidden = false
  if (name === 'mail') selectLetter(selectedLetter)
  syncTasks()
  panel.focus({ preventScroll: true })
  status.textContent = `已打开 ${panel.querySelector('h2')?.textContent}`
}

function hidePanel(panel: HTMLElement, close: boolean) {
  const name = panel.id.replace('window-', '')
  panel.hidden = true
  const task = taskButtons.find((button) => button.dataset.task === name)
  if (close && task) task.hidden = true
  syncTasks()
  if (!close && task) task.focus()
  else returnFocus.get(name)?.focus({ preventScroll: true })
  status.textContent = close
    ? '窗口已关闭'
    : '窗口已最小化，可以从底部任务栏恢复。'
}

document
  .querySelectorAll<HTMLButtonElement>('[data-open]')
  .forEach((button) =>
    button.addEventListener('click', () =>
      openPanel(button.dataset.open!, button),
    ),
  )
taskButtons.forEach((button) =>
  button.addEventListener('click', () => openPanel(button.dataset.task!)),
)
document
  .querySelectorAll<HTMLButtonElement>('[data-set-theme]')
  .forEach((button) =>
    button.addEventListener('click', () => {
      setTheme(button.dataset.setTheme!)
      savePreferences()
    }),
  )
themePicker.addEventListener('change', () => {
  setTheme(themePicker.value)
  savePreferences()
})
document
  .querySelectorAll<HTMLButtonElement>('[data-letter]')
  .forEach((button) =>
    button.addEventListener('click', () =>
      selectLetter(Number(button.dataset.letter)),
    ),
  )

panels.forEach((panel) => {
  panel
    .querySelector<HTMLButtonElement>('[data-close]')!
    .addEventListener('click', () => hidePanel(panel, true))
  panel
    .querySelector<HTMLButtonElement>('[data-minimize]')!
    .addEventListener('click', () => hidePanel(panel, false))
  panel.addEventListener('pointerdown', () => {
    panel.style.zIndex = String(++topLayer)
  })
  const titlebar = panel.querySelector<HTMLElement>('.window-titlebar')!
  let drag: {
    pointer: number
    startX: number
    startY: number
    left: number
    top: number
  } | null = null
  titlebar.addEventListener('pointerdown', (event) => {
    if (
      matchMedia('(max-width: 700px)').matches ||
      event.button !== 0 ||
      (event.target as HTMLElement).closest('button')
    )
      return
    const bounds = panel.getBoundingClientRect()
    const parent = panel.offsetParent!.getBoundingClientRect()
    drag = {
      pointer: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      left: bounds.left - parent.left,
      top: bounds.top - parent.top,
    }
    titlebar.setPointerCapture(event.pointerId)
  })
  titlebar.addEventListener('pointermove', (event) => {
    if (!drag || drag.pointer !== event.pointerId) return
    const parent = panel.offsetParent as HTMLElement
    const parentTop = parent.getBoundingClientRect().top
    const taskbarHeight =
      document.querySelector<HTMLElement>('.taskbar')!.offsetHeight
    const availableHeight = Math.min(
      parent.clientHeight,
      innerHeight - parentTop - taskbarHeight,
    )
    panel.style.left = `${Math.max(0, Math.min(parent.clientWidth - panel.offsetWidth - 12, drag.left + event.clientX - drag.startX))}px`
    panel.style.top = `${Math.max(0, Math.min(availableHeight - panel.offsetHeight - 12, drag.top + event.clientY - drag.startY))}px`
  })
  const stopDrag = () => {
    drag = null
  }
  titlebar.addEventListener('pointerup', stopDrag)
  titlebar.addEventListener('pointercancel', stopDrag)
  titlebar.addEventListener('lostpointercapture', stopDrag)
})

window.addEventListener('resize', () =>
  panels.forEach((panel) => {
    panel.style.removeProperty('left')
    panel.style.removeProperty('top')
  }),
)
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape' || preview.open) return
  const focusedPanel = (
    document.activeElement as HTMLElement
  )?.closest<HTMLElement>('.retro-window')
  const active =
    focusedPanel ||
    panels
      .filter((panel) => !panel.hidden)
      .sort(
        (first, second) =>
          Number(second.style.zIndex) - Number(first.style.zIndex),
      )[0]
  if (active) hidePanel(active, true)
})

document.querySelectorAll<HTMLButtonElement>('[data-photo]').forEach((button) =>
  button.addEventListener('click', () => {
    const index = Number(button.dataset.photo)
    const photo = photos[index]
    const image = button.querySelector('.photo-image')!.cloneNode(true)
    const container = document.querySelector<HTMLElement>('#preview-image')!
    container.className = `tone-${photo.tone}`
    container.replaceChildren(image)
    document.querySelector<HTMLElement>('#preview-title')!.textContent =
      `${photo.title} ♡`
    document.querySelector<HTMLElement>('#preview-number')!.textContent =
      photo.date
    document.querySelector<HTMLElement>('#preview-caption')!.textContent =
      photo.caption
    preview.showModal()
  }),
)
document
  .querySelector<HTMLButtonElement>('#preview-close')!
  .addEventListener('click', () => preview.close())
preview.addEventListener('click', (event) => {
  if (event.target === preview) {
    const bounds = preview.getBoundingClientRect()
    if (
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom
    )
      preview.close()
  }
})
setTheme(savedTheme)
updateReadState()
