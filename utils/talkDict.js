import { getDicts } from '@/api/system/dict/data'

// 与 PC 端同一套字典口径：谈话类型/八必谈情形/关注等级都从 sys_dict 取，
// 拉不到时才用兜底值（后端未升级或离线），避免小程序页面空白
const FALLBACK = {
  talk_type: [
    { value: 'ideological', label: '思想' },
    { value: 'academic', label: '学习' },
    { value: 'life', label: '生活' },
    { value: 'psychological', label: '心理' },
    { value: 'discipline', label: '纪律' },
    { value: 'employment', label: '就业' },
    { value: 'other', label: '其他' }
  ],
  talk_required_scene: [
    { value: 'key_node', label: '关键节点' },
    { value: 'disciplinary', label: '违纪处分' },
    { value: 'academic', label: '学业困难' },
    { value: 'family', label: '家庭变故' },
    { value: 'interpersonal', label: '人际矛盾' },
    { value: 'emotional', label: '情感困扰' },
    { value: 'ideological', label: '思想偏激' },
    { value: 'psychological', label: '心理危机' }
  ],
  talk_care_level: [
    { value: '0', label: '常规' },
    { value: '1', label: '重点关注' },
    { value: '2', label: '高危上报' }
  ]
}

let cache = null

export function getTalkDicts() {
  if (cache) return cache
  cache = Promise.all([
    getDicts('talk_type'),
    getDicts('talk_required_scene'),
    getDicts('talk_care_level')
  ]).then(resList => {
    const types = ['talk_type', 'talk_required_scene', 'talk_care_level']
    const dicts = {}
    resList.forEach((res, i) => {
      const rows = (res && res.data) || []
      const enabled = rows.filter(r => r.status !== '1').map(r => ({ value: r.dictValue, label: r.dictLabel }))
      dicts[types[i]] = enabled.length > 0 ? enabled : FALLBACK[types[i]]
    })
    return dicts
  }).catch(() => {
    cache = null
    return { talk_type: FALLBACK.talk_type, talk_required_scene: FALLBACK.talk_required_scene, talk_care_level: FALLBACK.talk_care_level }
  })
  return cache
}

export function dictLabel(dicts, dictType, value) {
  if (!value) return ''
  const rows = (dicts && dicts[dictType]) || []
  const hit = rows.filter(r => r.value === value)[0]
  return hit ? hit.label : value
}
