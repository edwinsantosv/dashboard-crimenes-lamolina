// Grouped <select> for modalidades — uses MODALIDAD_CATEGORIES from dataUtils
import { MODALIDAD_CATEGORIES } from '../utils/dataUtils'

/**
 * Props:
 *  value               – current value: 'TODAS' | 'CAT:xxx' | 'MODALIDAD EXACTA'
 *  onChange            – (e) => void
 *  availableModalidades – string[] of modalidades present in current data
 *  className / style   – forwarded to <select>
 */
export default function ModalidadSelect({ value, onChange, availableModalidades = [], className = 'filter-select', style }) {
  // Map each category to its available modalidades (in their original order from the data)
  const catMods = {}
  const uncategorized = []
  const availSet = new Set(availableModalidades)

  for (const cat of MODALIDAD_CATEGORIES) {
    // Preserve declaration order within the category; only show if present in data
    const present = cat.modalidades.filter(m => availSet.has(m))
    if (present.length) catMods[cat.id] = present
  }
  // Anything not in any category goes to "Otros"
  for (const m of availableModalidades) {
    const inCat = MODALIDAD_CATEGORIES.some(c => c.modalidades.includes(m))
    if (!inCat) uncategorized.push(m)
  }

  // Resolve display label for currently selected value
  function currentLabel() {
    if (!value || value === 'TODAS') return null
    if (value.startsWith('CAT:')) {
      const cat = MODALIDAD_CATEGORIES.find(c => c.id === value.slice(4))
      return cat ? `${cat.label} (todas)` : value
    }
    return value
  }
  const selLabel = currentLabel()

  return (
    <select className={className} style={style} value={value} onChange={onChange}>
      <option value="TODAS">Todas las modalidades</option>

      {MODALIDAD_CATEGORIES.map(cat => {
        const mods = catMods[cat.id]
        if (!mods) return null
        return (
          <optgroup key={cat.id} label={cat.label}>
            {/* Category-level option to filter all subcategories at once */}
            <option value={`CAT:${cat.id}`}>
              {'↳ Todas: '}{cat.label.replace(/^\S+\s/, '')}
              {' ('}{mods.length}{')'}
            </option>
            {mods.map(m => (
              <option key={m} value={m}>
                {m.length > 45 ? m.slice(0, 45) + '…' : m}
              </option>
            ))}
          </optgroup>
        )
      })}

      {uncategorized.length > 0 && (
        <optgroup label="Otros">
          {uncategorized.map(m => (
            <option key={m} value={m}>
              {m.length > 45 ? m.slice(0, 45) + '…' : m}
            </option>
          ))}
        </optgroup>
      )}
    </select>
  )
}
