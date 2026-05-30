/**
 * Общий клиент архива (google.script.run)
 */
const ArchiveClient = (function () {
  function isAvailable() {
    return typeof google !== 'undefined' && google.script && google.script.run;
  }

  function fetchList(onSuccess, onFailure) {
    if (!isAvailable()) {
      if (onFailure) onFailure(new Error('Google Apps Script API недоступен'));
      return;
    }
    google.script.run
      .withSuccessHandler(function (list) {
        if (onSuccess) onSuccess(list && Array.isArray(list) ? list : []);
      })
      .withFailureHandler(function (err) {
        if (onFailure) onFailure(err);
      })
      .getArchivedReportsList();
  }

  function fetchReportById(reportId, onSuccess, onFailure) {
    if (!isAvailable()) {
      if (onFailure) onFailure(new Error('Google Apps Script API недоступен'));
      return;
    }
    google.script.run
      .withSuccessHandler(onSuccess)
      .withFailureHandler(onFailure)
      .getArchivedReportById(reportId);
  }

  /**
   * Загружает отчёт и данные предыдущего архива для дельт KPI
   */
  function fetchReportWithPrevious(reportId, reportsList, onSuccess, onFailure) {
    const prevId =
      window.DashboardPhase1 && reportsList
        ? DashboardPhase1.getPreviousArchiveId(reportsList, reportId)
        : null;

    fetchReportById(
      reportId,
      function (report) {
        if (!prevId) {
          onSuccess(report, null, null);
          return;
        }
        fetchReportById(
          prevId,
          function (prevReport) {
            const prevTotals = DashboardPhase1.computeTotalsFromMosData(prevReport.mosData);
            const prevMos = DashboardPhase1.buildMosFromData(prevReport.mosData);
            onSuccess(report, prevTotals, prevMos);
          },
          function () {
            onSuccess(report, null, null);
          }
        );
      },
      onFailure
    );
  }

  function fillSelect(selectEl, list, options) {
    const opts = options || {};
    if (!selectEl) return;

    const placeholder = opts.placeholder || '— Выберите отчёт —';
    selectEl.innerHTML = `<option value="">${placeholder}</option>`;

    if (!list || !list.length) {
      if (opts.emptyLabel) {
        const empty = document.createElement('option');
        empty.value = '';
        empty.disabled = true;
        empty.textContent = opts.emptyLabel;
        selectEl.appendChild(empty);
      }
      return;
    }

    const sorted = [...list].sort((a, b) => b.id - a.id);
    sorted.forEach((item) => {
      const option = document.createElement('option');
      option.value = item.id;
      option.textContent =
        opts.formatLabel ? opts.formatLabel(item) : item.dateStr || `Отчёт #${item.id}`;
      selectEl.appendChild(option);
    });
  }

  return {
    isAvailable,
    fetchList,
    fetchReportById,
    fetchReportWithPrevious,
    fillSelect,
  };
})();

if (typeof window !== 'undefined') {
  window.ArchiveClient = ArchiveClient;
}
