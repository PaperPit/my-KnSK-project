/**
 * E1: Виртуализация таблиц для больших объёмов данных (>1000 строк)
 * Рендерит только видимые строки для максимальной производительности
 */

class VirtualTable {
  constructor(container, options = {}) {
    // Проверяем, что мы в браузере
    if (typeof document === 'undefined') {
      console.warn('[VirtualTable] Не в браузерной среде, инициализация пропущена');
      return;
    }
    
    this.container = typeof container === 'string' 
      ? document.querySelector(container) 
      : container;
    
    if (!this.container) {
      console.warn('[VirtualTable] Контейнер не найден');
      return;
    }
    
    this.options = {
      rowHeight: options.rowHeight || 35,
      overscan: options.overscan || 5,
      threshold: options.threshold || 500,
      ...options
    };
    
    this.data = [];
    this.columns = [];
    this.scrollTop = 0;
    this.viewportHeight = 0;
    this.totalHeight = 0;
    this.renderTimeout = null;
    this.isActive = false;
    
    // Создание DOM элементов
    this._createStructure();
    
    // Обработчик скролла (с дебаунсом)
    this._onScroll = this._onScroll.bind(this);
    if (this.scrollContainer) {
      this.scrollContainer.addEventListener('scroll', () => {
        if (this.renderTimeout) clearTimeout(this.renderTimeout);
        this.renderTimeout = setTimeout(() => this._onScroll(), 16);
      });
    }
    
    // Обновление размера окна (только в браузере)
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', () => this._updateViewport());
    }
  }
  
  /**
   * Установка данных
   */
  setData(data, columns = null) {
    if (!this.container) return;
    
    this.data = data || [];
    
    // Автоопределение колонок
    if (!columns && this.data.length > 0) {
      this.columns = Object.keys(this.data[0]).map(key => ({
        field: key,
        title: key,
        width: 150,
      }));
    } else if (columns) {
      this.columns = columns;
    }
    
    // Решение о включении виртуализации
    this.isActive = this.data.length > this.options.threshold;
    
    this._updateTotalHeight();
    this._updateViewport();
    this._render();
    
    this._log('info', `VirtualTable: ${this.data.length} строк, виртуализация ${this.isActive ? 'включена' : 'выключена'}`);
  }
  
  /**
   * Обновление данных (для реактивности)
   */
  updateData(data) {
    if (!this.container) return;
    this.data = data;
    this._updateTotalHeight();
    this._render();
  }
  
  /**
   * Установка колонок
   */
  setColumns(columns) {
    if (!this.container) return;
    this.columns = columns;
    this._render();
  }
  
  /**
   * Прокрутка к строке
   */
  scrollToRow(index) {
    if (!this.container || !this.tableBody) return;
    
    if (!this.isActive) {
      const rows = this.tableBody.querySelectorAll('tr');
      if (rows[index]) {
        rows[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    
    if (this.scrollContainer) {
      const targetScrollTop = index * this.options.rowHeight;
      this.scrollContainer.scrollTop = targetScrollTop;
    }
  }
  
  /**
   * Получение текущих видимых строк
   */
  getVisibleRows() {
    if (!this.isActive) {
      return this.data;
    }
    
    const startIdx = Math.floor(this.scrollTop / this.options.rowHeight);
    const endIdx = Math.min(
      startIdx + Math.ceil(this.viewportHeight / this.options.rowHeight) + this.options.overscan,
      this.data.length
    );
    
    return this.data.slice(startIdx, endIdx);
  }
  
  /**
   * Очистка таблицы
   */
  clear() {
    if (!this.container) return;
    this.data = [];
    this.columns = [];
    this._render();
  }
  
  /**
   * Создание DOM структуры
   * @private
   */
  _createStructure() {
    if (!this.container || typeof document === 'undefined') return;
    
    this.container.innerHTML = '';
    
    this.scrollContainer = document.createElement('div');
    this.scrollContainer.className = 'virtual-table-scroll';
    this.scrollContainer.style.cssText = `
      overflow: auto;
      position: relative;
      width: 100%;
      height: 100%;
      max-height: 600px;
    `;
    
    this.table = document.createElement('table');
    this.table.className = 'virtual-table';
    this.table.style.cssText = `
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    `;
    
    this.thead = document.createElement('thead');
    this.table.appendChild(this.thead);
    
    this.tbodyContainer = document.createElement('div');
    this.tbodyContainer.style.position = 'relative';
    
    this.tableBody = document.createElement('tbody');
    this.tbodyContainer.appendChild(this.tableBody);
    
    this.scrollContainer.appendChild(this.table);
    this.scrollContainer.appendChild(this.tbodyContainer);
    this.container.appendChild(this.scrollContainer);
  }
  
  /**
   * Рендер таблицы
   * @private
   */
  _render() {
    if (!this.columns.length || !this.tableBody) return;
    
    this._renderHeader();
    
    if (!this.isActive || this.data.length <= this.options.threshold) {
      this._renderAllRows();
      this.tableBody.style.position = '';
      if (this.tbodyContainer) {
        this.tbodyContainer.style.height = 'auto';
      }
    } else {
      this._renderVirtualRows();
    }
  }
  
  _renderHeader() {
    if (!this.thead) return;
    
    const headerRow = document.createElement('tr');
    
    for (const col of this.columns) {
      const th = document.createElement('th');
      th.textContent = col.title || col.field;
      th.style.width = col.width ? `${col.width}px` : 'auto';
      th.style.padding = '10px';
      th.style.borderBottom = '2px solid #ddd';
      th.style.backgroundColor = '#f5f5f5';
      th.style.textAlign = 'left';
      th.style.position = 'sticky';
      th.style.top = '0';
      th.style.zIndex = '10';
      th.style.cursor = 'pointer';
      th.addEventListener('click', () => this._sortBy(col.field));
      
      headerRow.appendChild(th);
    }
    
    this.thead.innerHTML = '';
    this.thead.appendChild(headerRow);
  }
  
  _renderAllRows() {
    if (!this.tableBody) return;
    
    const fragment = document.createDocumentFragment();
    
    for (let i = 0; i < this.data.length; i++) {
      const row = this._createRow(this.data[i], i);
      if (row) fragment.appendChild(row);
    }
    
    this.tableBody.innerHTML = '';
    this.tableBody.appendChild(fragment);
    this.tableBody.style.position = '';
  }
  
  _renderVirtualRows() {
    if (!this.tableBody || !this.tbodyContainer) return;
    
    const startIdx = Math.max(0, Math.floor(this.scrollTop / this.options.rowHeight) - this.options.overscan);
    const endIdx = Math.min(
      this.data.length,
      startIdx + Math.ceil(this.viewportHeight / this.options.rowHeight) + (this.options.overscan * 2)
    );
    
    const offsetY = startIdx * this.options.rowHeight;
    
    const fragment = document.createDocumentFragment();
    
    for (let i = startIdx; i < endIdx; i++) {
      const row = this._createRow(this.data[i], i);
      if (row) fragment.appendChild(row);
    }
    
    this.tableBody.innerHTML = '';
    this.tableBody.appendChild(fragment);
    this.tableBody.style.position = 'absolute';
    this.tableBody.style.top = `${offsetY}px`;
    this.tableBody.style.left = '0';
    this.tableBody.style.right = '0';
    
    this.tbodyContainer.style.height = `${this.totalHeight}px`;
    this.tbodyContainer.style.position = 'relative';
  }
  
  _createRow(data, index) {
    if (typeof document === 'undefined') return null;
    
    const row = document.createElement('tr');
    row.style.height = `${this.options.rowHeight}px`;
    row.style.borderBottom = '1px solid #eee';
    
    if (index % 2 === 0) {
      row.style.backgroundColor = '#ffffff';
    } else {
      row.style.backgroundColor = '#fafafa';
    }
    
    row.addEventListener('mouseenter', () => {
      row.style.backgroundColor = '#f0f0f0';
    });
    row.addEventListener('mouseleave', () => {
      row.style.backgroundColor = index % 2 === 0 ? '#ffffff' : '#fafafa';
    });
    
    for (const col of this.columns) {
      const td = document.createElement('td');
      td.style.padding = '8px 10px';
      td.style.overflow = 'hidden';
      td.style.textOverflow = 'ellipsis';
      td.style.whiteSpace = 'nowrap';
      
      let value = data[col.field];
      if (value === undefined || value === null) value = '';
      if (typeof value === 'object') value = JSON.stringify(value);
      
      td.textContent = value;
      td.title = value;
      
      row.appendChild(td);
    }
    
    row.addEventListener('click', () => {
      if (this.options.onRowClick) {
        this.options.onRowClick(data, index);
      }
    });
    
    return row;
  }
  
  _updateTotalHeight() {
    this.totalHeight = this.data.length * this.options.rowHeight;
  }
  
  _updateViewport() {
    if (this.scrollContainer) {
      this.viewportHeight = this.scrollContainer.clientHeight;
    }
  }
  
  _onScroll() {
    if (!this.isActive || !this.scrollContainer) return;
    
    const newScrollTop = this.scrollContainer.scrollTop;
    if (Math.abs(newScrollTop - this.scrollTop) < this.options.rowHeight) return;
    
    this.scrollTop = newScrollTop;
    this._renderVirtualRows();
  }
  
  _sortBy(field) {
    this.data.sort((a, b) => {
      const valA = a[field] || '';
      const valB = b[field] || '';
      if (valA < valB) return -1;
      if (valA > valB) return 1;
      return 0;
    });
    
    this._render();
    
    if (this.options.onSort) {
      this.options.onSort(field);
    }
  }
  
  _log(level, ...args) {
    if (typeof window !== 'undefined' && window.Logger) {
      window.Logger[level](`[VirtualTable]`, ...args);
    } else if (typeof console !== 'undefined' && console[level]) {
      console[level](`[VirtualTable]`, ...args);
    }
  }
}

// Глобальный экспорт (только в браузере)
if (typeof window !== 'undefined') {
  window.VirtualTable = VirtualTable;
}

// Для Google Apps Script (экспорт)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { VirtualTable };
}