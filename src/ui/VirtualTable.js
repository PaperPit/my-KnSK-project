/**
 * E1: Виртуализация таблиц для больших объёмов данных (>1000 строк)
 * Рендерит только видимые строки для максимальной производительности
 */

class VirtualTable {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' 
      ? document.querySelector(container) 
      : container;
    
    this.options = {
      rowHeight: options.rowHeight || 35,
      overscan: options.overscan || 5,
      threshold: options.threshold || 500, // Включать после N строк
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
    this.scrollContainer.addEventListener('scroll', () => {
      if (this.renderTimeout) clearTimeout(this.renderTimeout);
      this.renderTimeout = setTimeout(() => this._onScroll(), 16); // 60fps
    });
    
    // Обновление размера окна
    window.addEventListener('resize', () => this._updateViewport());
  }
  
  /**
   * Установка данных
   */
  setData(data, columns = null) {
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
    this.data = data;
    this._updateTotalHeight();
    this._render();
  }
  
  /**
   * Установка колонок
   */
  setColumns(columns) {
    this.columns = columns;
    this._render();
  }
  
  /**
   * Прокрутка к строке
   */
  scrollToRow(index) {
    if (!this.isActive) {
      // Для обычной таблицы
      const rows = this.tableBody.querySelectorAll('tr');
      if (rows[index]) {
        rows[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    
    // Для виртуальной таблицы
    const targetScrollTop = index * this.options.rowHeight;
    this.scrollContainer.scrollTop = targetScrollTop;
  }
  
  /**
   * Получение текущих видимых строк
   */
  getVisibleRows() {
    if (!this.isActive) {
      // Возвращаем все строки
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
    this.data = [];
    this.columns = [];
    this._render();
  }
  
  /**
   * Создание DOM структуры
   * @private
   */
  _createStructure() {
    // Очистка контейнера
    this.container.innerHTML = '';
    
    // Создание обёртки для скролла
    this.scrollContainer = document.createElement('div');
    this.scrollContainer.className = 'virtual-table-scroll';
    this.scrollContainer.style.cssText = `
      overflow: auto;
      position: relative;
      width: 100%;
      height: 100%;
      max-height: 600px;
    `;
    
    // Контейнер для таблицы
    this.table = document.createElement('table');
    this.table.className = 'virtual-table';
    this.table.style.cssText = `
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    `;
    
    // Заголовок
    this.thead = document.createElement('thead');
    this.table.appendChild(this.thead);
    
    // Контейнер для тела с абсолютным позиционированием
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
    if (!this.columns.length) return;
    
    // Рендер заголовка
    this._renderHeader();
    
    if (!this.isActive || this.data.length <= this.options.threshold) {
      // Обычный рендер всех строк
      this._renderAllRows();
      this.tableBody.style.position = '';
      this.tbodyContainer.style.height = 'auto';
    } else {
      // Виртуальный рендер
      this._renderVirtualRows();
    }
  }
  
  _renderHeader() {
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
      
      // Добавление сортировки
      th.style.cursor = 'pointer';
      th.addEventListener('click', () => this._sortBy(col.field));
      
      headerRow.appendChild(th);
    }
    
    this.thead.innerHTML = '';
    this.thead.appendChild(headerRow);
  }
  
  _renderAllRows() {
    const fragment = document.createDocumentFragment();
    
    for (let i = 0; i < this.data.length; i++) {
      const row = this._createRow(this.data[i], i);
      fragment.appendChild(row);
    }
    
    this.tableBody.innerHTML = '';
    this.tableBody.appendChild(fragment);
    this.tableBody.style.position = '';
  }
  
  _renderVirtualRows() {
    const startIdx = Math.max(0, Math.floor(this.scrollTop / this.options.rowHeight) - this.options.overscan);
    const endIdx = Math.min(
      this.data.length,
      startIdx + Math.ceil(this.viewportHeight / this.options.rowHeight) + (this.options.overscan * 2)
    );
    
    const offsetY = startIdx * this.options.rowHeight;
    
    const fragment = document.createDocumentFragment();
    
    for (let i = startIdx; i < endIdx; i++) {
      const row = this._createRow(this.data[i], i);
      fragment.appendChild(row);
    }
    
    this.tableBody.innerHTML = '';
    this.tableBody.appendChild(fragment);
    this.tableBody.style.position = 'absolute';
    this.tableBody.style.top = `${offsetY}px`;
    this.tableBody.style.left = '0';
    this.tableBody.style.right = '0';
    
    // Обновление высоты контейнера
    this.tbodyContainer.style.height = `${this.totalHeight}px`;
    this.tbodyContainer.style.position = 'relative';
  }
  
  _createRow(data, index) {
    const row = document.createElement('tr');
    row.style.height = `${this.options.rowHeight}px`;
    row.style.borderBottom = '1px solid #eee';
    
    // Чередование цветов
    if (index % 2 === 0) {
      row.style.backgroundColor = '#ffffff';
    } else {
      row.style.backgroundColor = '#fafafa';
    }
    
    // Hover эффект
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
      td.title = value; // Tooltip для длинного текста
      
      row.appendChild(td);
    }
    
    // Клик по строке
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
    this.viewportHeight = this.scrollContainer.clientHeight;
  }
  
  _onScroll() {
    if (!this.isActive) return;
    
    const newScrollTop = this.scrollContainer.scrollTop;
    if (Math.abs(newScrollTop - this.scrollTop) < this.options.rowHeight) return;
    
    this.scrollTop = newScrollTop;
    this._renderVirtualRows();
  }
  
  _sortBy(field) {
    // Сортировка (простая)
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
    if (window.Logger) {
      window.Logger[level](`[VirtualTable]`, ...args);
    }
  }
}

// Экспорт для