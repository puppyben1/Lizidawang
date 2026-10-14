import assert from 'node:assert/strict'
import {
  localDay,
  localMinute,
  mealPool,
  monthDays,
  parseDiary,
} from '../src/data/daily-life.ts'

const time = new Date(2026, 9, 14, 0, 5)
assert.equal(localDay(time), '2026-10-14')
assert.equal(localMinute(time), '2026-10-14T00:05')
assert.equal(monthDays(2024, 1).filter(Boolean).length, 29)
assert.equal(monthDays(2026, 1).filter(Boolean).length, 28)
assert.equal(monthDays(2026, 2)[0], null)
assert.equal(monthDays(2026, 5)[0]?.getDate(), 1)
const diary = parseDiary(null)
diary.bowel.push({ id: 'one', time: time.toISOString(), state: '未选择' })
diary.meals.push({
  id: 'two',
  time: time.toISOString(),
  dish: '面条',
  kind: '午餐',
  note: '<script>不是 HTML</script>',
})
assert.deepEqual(parseDiary(JSON.stringify(diary)), diary)
assert.deepEqual(
  mealPool([
    ...diary.meals,
    { ...diary.meals[0], id: 'three', dish: ' 面条 ' },
  ]),
  ['面条'],
)
assert.throws(() => parseDiary(''))
assert.throws(() => parseDiary('{'))
assert.throws(() => parseDiary(JSON.stringify({ ...diary, version: 2 })))
assert.throws(() =>
  parseDiary(
    JSON.stringify({
      ...diary,
      bowel: [{ ...diary.bowel[0], state: 'unexpected' }],
    }),
  ),
)
assert.throws(() =>
  parseDiary(
    JSON.stringify({
      ...diary,
      bowel: [{ ...diary.bowel[0], time: '2026-02-30T00:00:00.000Z' }],
    }),
  ),
)
assert.throws(() =>
  parseDiary(
    JSON.stringify({ ...diary, meals: [{ ...diary.meals[0], id: 'one' }] }),
  ),
)
console.log(
  '生活记录检查通过：本地日期、月历、往返保存、历史去重、损坏数据保护。',
)
