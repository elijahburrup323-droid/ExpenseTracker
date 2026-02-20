import { TAG_COLORS } from "controllers/tags_controller"

function escapeHtml(str) {
  if (!str) return ""
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

export async function fetchTags(apiUrl) {
  try {
    const res = await fetch(apiUrl, { headers: { "Accept": "application/json" } })
    if (!res.ok) return []
    return res.json()
  } catch (e) {
    return []
  }
}

export function renderTagFilterCheckboxes(allTags, selectedIds, controllerName) {
  if (allTags.length === 0) {
    return `<p class="text-sm text-gray-400 dark:text-gray-500 italic">No tags defined.</p>`
  }

  const searchInput = `<input type="text" placeholder="Search tags..."
    class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white px-3 py-2 mb-2 focus:ring-brand-500 focus:border-brand-500"
    data-action="input->${controllerName}#onTagSearchInput"
    data-${controllerName}-target="tagSearchInput">`

  const checkboxes = allTags.map(t => {
    const c = TAG_COLORS.find(tc => tc.key === t.color_key) || TAG_COLORS[0]
    const checked = selectedIds.includes(t.id) ? "checked" : ""
    return `<label class="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30 px-2 py-1.5 rounded tag-filter-item" data-tag-name="${escapeHtml(t.name.toLowerCase())}">
      <input type="checkbox" value="${t.id}" ${checked}
        class="h-4 w-4 rounded text-brand-600 focus:ring-brand-500 border-gray-300 dark:border-gray-600"
        data-action="change->${controllerName}#onTagCheckboxChange">
      <span class="w-2.5 h-2.5 rounded-full ${c.dot} flex-shrink-0"></span>
      <span class="text-sm text-gray-700 dark:text-gray-300">${escapeHtml(t.name)}</span>
    </label>`
  }).join("")

  return `<div>
    ${allTags.length > 5 ? searchInput : ""}
    <div class="max-h-40 overflow-y-auto space-y-0.5" data-${controllerName}-target="tagCheckboxList">
      ${checkboxes}
    </div>
  </div>`
}

export function tagIdsQueryString(selectedIds) {
  if (!selectedIds || selectedIds.length === 0) return ""
  return selectedIds.map(id => `&tag_ids[]=${id}`).join("")
}

export function renderAppliedTagsBanner(appliedTags) {
  if (!appliedTags || appliedTags.length === 0) return ""

  const pills = appliedTags.map(t => {
    const c = TAG_COLORS.find(tc => tc.key === t.color_key) || TAG_COLORS[0]
    return `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}">${escapeHtml(t.name)}</span>`
  }).join("")

  return `<div class="mt-2 flex items-center flex-wrap gap-1.5">
    <span class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mr-1">Tags:</span>
    ${pills}
  </div>`
}

export function renderAppliedTagsPrint(appliedTags) {
  if (!appliedTags || appliedTags.length === 0) return ""
  const names = appliedTags.map(t => escapeHtml(t.name)).join(", ")
  return `<p><strong>Tags:</strong> ${names}</p>`
}
