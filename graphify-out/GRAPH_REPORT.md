# Graph Report - .  (2026-06-14)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 228 nodes · 354 edges · 21 communities (17 shown, 4 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8c399e03`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]

## God Nodes (most connected - your core abstractions)
1. `scripts` - 10 edges
2. `applyReportToDashboard()` - 10 edges
3. `GoogleAppsScriptAdapter` - 9 edges
4. `setStatus()` - 9 edges
5. `escapeHtml()` - 7 edges
6. `renderHtmlContent()` - 7 edges
7. `syncTextsToDashboard()` - 7 edges
8. `applyArchiveReport()` - 7 edges
9. `initViewer()` - 7 edges
10. `getArchiveSheet_()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `migrateArchivePlansTo2026()` --calls--> `getPlanMapping2026()`  [INFERRED]
  Code.js → PlanMapping2026.js
- `migrateArchivePlansTo2026()` --calls--> `getPlanMapping2026()`  [INFERRED]
  src/server/migrations.js → PlanMapping2026.js
- `syncTextsToDashboard()` --calls--> `renderHtmlContent()`  [INFERRED]
  src/pages/editor.js → src/lib/sanitize.js
- `applyReportToDashboard()` --calls--> `escapeHtml()`  [INFERRED]
  src/pages/viewer.js → src/lib/sanitize.js
- `initViewer()` --calls--> `escapeHtml()`  [INFERRED]
  src/pages/viewer.js → src/lib/sanitize.js

## Import Cycles
- None detected.

## Communities (21 total, 4 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.11
Nodes (25): buildArchiveIndex_(), doGet(), extractFactFromMo_(), formatArchiveDate_(), getArchiveBootstrap(), getArchivedReportById(), getArchivedReportsList(), getArchivedReportWithPrevious() (+17 more)

### Community 1 - "Community 1"
Cohesion: 0.16
Nodes (24): addWeek(), applyArchiveReport(), buildExportHtml(), getCurrentWeeksData(), getNextWeekPeriod(), getTextareaSelection(), initWeeksWithLast5(), insertListItem() (+16 more)

### Community 2 - "Community 2"
Cohesion: 0.10
Nodes (20): description, devDependencies, eslint, @eslint/js, globals, prettier, vitest, name (+12 more)

### Community 3 - "Community 3"
Cohesion: 0.22
Nodes (16): escapeHtml(), hasAllowedMarkup(), renderHtmlContent(), sanitizeHtmlFragment(), applyReportToDashboard(), getNextWeekPeriod(), getWeekRangeFromReportDate(), initViewer() (+8 more)

### Community 4 - "Community 4"
Cohesion: 0.13
Nodes (13): normalizeArchiveReport(), Path, load_xlsx(), main(), norm(), artifactChanges, dirty, ROOT (+5 more)

### Community 5 - "Community 5"
Cohesion: 0.27
Nodes (16): buildArchiveIndex_(), formatArchiveDate_(), getArchiveBootstrap(), getArchivedReportById(), getArchivedReportsList(), getArchivedReportWithPrevious(), getArchivedReportWithPreviousFromIndex_(), getArchiveList_() (+8 more)

### Community 6 - "Community 6"
Cohesion: 0.22
Nodes (11): parseCSV(), buildMosFromData(), computePeriodDeltas(), computeTotals(), computeTotalsFromMosData(), computeYearPercent(), __dirname, sampleCsv (+3 more)

### Community 7 - "Community 7"
Cohesion: 0.24
Nodes (7): getPlanMapping2026(), extractFactFromMo_(), lookupNewPlan2026_(), migrateArchivePlansTo2026(), normalizeMoName_(), updateMoPlanFields_(), updateReportPlans2026_()

### Community 9 - "Community 9"
Cohesion: 0.39
Nodes (8): buildCodeJs(), concatScripts(), __dirname, read(), ROOT, wrapScript(), wrapStyle(), write()

### Community 10 - "Community 10"
Cohesion: 0.25
Nodes (7): dependencies, exceptionLogging, runtimeVersion, timeZone, webapp, access, executeAs

### Community 11 - "Community 11"
Cohesion: 0.87
Nodes (3): extractFact(), extractNumber(), toNum()

### Community 12 - "Community 12"
Cohesion: 0.53
Nodes (3): doGet(), getClientConfigJson(), getWebAppUrl()

### Community 13 - "Community 13"
Cohesion: 0.60
Nodes (4): convertToCSV(), downloadCSV(), exportRangeA1I48toCSV(), exportVisibleRangeA1I48toCSV()

## Knowledge Gaps
- **42 isolated node(s):** `timeZone`, `dependencies`, `exceptionLogging`, `runtimeVersion`, `executeAs` (+37 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Path` connect `Community 4` to `Community 9`, `Community 6`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Why does `renderHtmlContent()` connect `Community 3` to `Community 1`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Why does `syncTextsToDashboard()` connect `Community 1` to `Community 3`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `applyReportToDashboard()` (e.g. with `escapeHtml()` and `renderHtmlContent()`) actually correct?**
  _`applyReportToDashboard()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `timeZone`, `dependencies`, `exceptionLogging` to the rest of the system?**
  _42 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.11051693404634581 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._