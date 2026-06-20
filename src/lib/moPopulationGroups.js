/**
 * moPopulationGroups.js — категории МО по численности прикреплённого населения
 * Источник: data/mo-population-groups.json (scripts/build-mo-population-groups.py)
 */
import groupsData from '../../data/mo-population-groups.json';

export const POPULATION_GROUP_IDS = ['малая', 'средняя', 'большая'];

export const DEFAULT_POPULATION_GROUP = 'средняя';

/** Нормализация названия МО (как в build-mo-population-groups.py). */
export function normMoName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9]+/g, '');
}

/**
 * @param {string} moName
 * @returns {'малая'|'средняя'|'большая'|null}
 */
export function getMoPopulationGroup(moName) {
  const key = normMoName(moName);
  if (!key) return null;
  const entry = groupsData.byNormalizedName[key];
  return entry && entry.group ? entry.group : null;
}

/**
 * @param {string} groupId
 * @returns {{ label: string, populationRange: string }|null}
 */
export function getPopulationGroupDefinition(groupId) {
  const def = groupsData.groupDefinitions[groupId];
  if (!def) return null;
  return { label: def.label, populationRange: def.populationRange };
}

/**
 * @param {string} groupId
 * @returns {string}
 */
export function getPopulationGroupLabel(groupId) {
  const def = getPopulationGroupDefinition(groupId);
  return def ? def.label : groupId;
}

/**
 * @param {Array} mos — массив МО текущего отчёта
 * @param {string} groupId
 * @returns {Array}
 */
export function filterMosByPopulationGroup(mos, groupId) {
  if (!groupId || !Array.isArray(mos)) return mos || [];
  return mos.filter((mo) => getMoPopulationGroup(mo.name) === groupId);
}

/**
 * Пул для рейтинга одной МО: только МО той же категории из текущего отчёта.
 * @param {string} moName
 * @param {Array} allMos
 * @returns {Array}
 */
export function getMoPeerPool(moName, allMos) {
  const groupId = getMoPopulationGroup(moName);
  if (!groupId) return allMos || [];
  const peers = filterMosByPopulationGroup(allMos, groupId);
  return peers.length ? peers : allMos || [];
}

export { groupsData as MO_POPULATION_GROUPS_DATA };
