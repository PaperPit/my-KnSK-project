/**
 * C4: Skeleton loading для асинхронных операций
 * Показывает анимированные заглушки во время загрузки
 */

class SkeletonLoader {
  constructor(config = {}) {
    this.enabled = config.enabled !== false;
    this.defaultRows = config.defaultRows || 15;
    this.animationDuration = config.animationDuration || 1.2;
    
    // Стили будут добавлены динамически (только в браузере)
    if (typeof document !== 'undefined') {
      this._injectStyles();
    }
  }
  
  /**
   * Создание skeleton для таблицы
   * @param {number} rows - Количество строк
   * @param {number} columns - Количество колонок
   * @returns {string} HTML строка
   */
  createTableSkeleton(rows = this.defaultRows, columns = null) {
    if (!this.enabled) return '';
    
    // Определение количества колонок из существующей таблицы (только в браузере)
    if (!columns && typeof document !== 'undefined') {
      const existingTable = document.querySelector('table thead tr');
      if (existingTable) {
        columns = existingTable.children.length;
      } else {
        columns = 5; // По умолчанию
      }
    } else if (!columns) {
      columns = 5;
    }
    
    let html = '<tbody class="skeleton-wrapper">';
    
    for (let i = 0; i < rows; i++) {
      html += '<tr class="skeleton-row">';
      for (let j = 0; j < columns; j++) {
        const width = this._getRandomWidth(j);
        html += `
          <td>
            <div class="skeleton-cell" style="width: ${width};">
              <div class="skeleton-shimmer"></div>
            </div>
          </td>
        `;
      }
      html += '</table>';
    }
    
    html += '</tbody>';
    return html;
  }
  
  /**
   * Создание skeleton для карточек
   * @param {number} count - Количество карточек
   * @returns {string} HTML строка
   */
  createCardSkeleton(count = 6) {
    if (!this.enabled) return '';
    
    let html = '<div class="skeleton-cards-grid">';
    
    for (let i = 0; i < count; i++) {
      html += `
        <div class="skeleton-card">
          <div class="skeleton-card-image">
            <div class="skeleton-shimmer"></div>
          </div>
          <div class="skeleton-card-content">
            <div class="skeleton-title" style="width: 80%;">
              <div class="skeleton-shimmer"></div>
            </div>
            <div class="skeleton-text" style="width: 95%;">
              <div class="skeleton-shimmer"></div>
            </div>
            <div class="skeleton-text" style="width: 60%;">
              <div class="skeleton-shimmer"></div>
            </div>
          </div>
        </div>
      `;
    }
    
    html += '</div>';
    return html;
  }
  
  /**
   * Создание skeleton для списка
   * @param {number} items - Количество элементов
   * @returns {string} HTML строка
   */
  createListSkeleton(items = 10) {
    if (!this.enabled) return '';
    
    let html = '<div class="skeleton-list">';
    
    for (let i = 0; i < items; i++) {
      html += `
        <div class="skeleton-list-item">
          <div class="skeleton-avatar" style="width: 40px; height: 40px;">
            <div class="skeleton-shimmer"></div>
          </div>
          <div class="skeleton-list-content">
            <div class="skeleton-title" style="width: 70%;">
              <div class="skeleton-shimmer"></div>
            </div>
            <div class="skeleton-text" style="width: 90%;">
              <div class="skeleton-shimmer"></div>
            </div>
          </div>
        </div>
      `;
    }
    
    html += '</div>';
    return html;
  }
  
  /**
   * Создание skeleton для формы
   * @param {number} fields - Количество полей
   * @returns {string} HTML строка
   */
  createFormSkeleton(fields = 5) {
    if (!this.enabled) return '';
    
    let html = '<div class="skeleton-form">';
    
    for (let i = 0; i < fields; i++) {
      html += `
        <div class="skeleton-form-field">
          <div class="skeleton-label" style="width: 30%;">
            <div class="skeleton-shimmer"></div>
          </div>
          <div class="skeleton-input" style="height: 40px;">
            <div class="skeleton-shimmer"></div>
          </div>
        </div>
      `;
    }
    
    html += `
      <div class="skeleton-button" style="height: 40px; width: 120px;">
        <div class="skeleton-shimmer"></div>
      </div>
    `;
    
    html += '</div>';
    return html;
  }
  
  /**
   * Показать skeleton в контейнере
   * @param {HTMLElement} container - Контейнер
   * @param {string} type - Тип скелетона (table, card, list, form)
   * @param {Object} options - Дополнительные параметры
   */
  show(container, type = 'table', options = {}) {
    if (!this.enabled || !container) return;
    
    // Сохраняем оригинальное содержимое
    const originalContent = container.innerHTML;
    container.setAttribute('data-skeleton-original', originalContent);
    
    // Генерация skeleton
    let skeletonHtml = '';
    switch (type) {
      case 'table':
        skeletonHtml = this.createTableSkeleton(options.rows, options.columns);
        break;
      case 'card':
        skeletonHtml = this.createCardSkeleton(options.count);
        break;
      case 'list':
        skeletonHtml = this.createListSkeleton(options.items);
        break;
      case 'form':
        skeletonHtml = this.createFormSkeleton(options.fields);
        break;
      default:
        skeletonHtml = this.createTableSkeleton();
    }
    
    container.innerHTML = skeletonHtml;
    container.classList.add('skeleton-active');
    
    return () => this.hide(container);
  }
  
  /**
   * Скрыть skeleton и восстановить содержимое
   */
  hide(container) {
    if (!container) return;
    
    const original = container.getAttribute('data-skeleton-original');
    if (original) {
      container.innerHTML = original;
      container.removeAttribute('data-skeleton-original');
    }
    container.classList.remove('skeleton-active');
  }
  
  /**
   * Вспомогательные методы
   * @private
   */
  _getRandomWidth(columnIndex) {
    // Разная ширина для разных колонок (более естественно)
    const widths = ['40%', '60%', '80%', '50%', '70%', '45%', '65%', '55%'];
    return widths[columnIndex % widths.length];
  }
  
  _injectStyles() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('skeleton-styles')) return;
    
    const styles = `
      <style id="skeleton-styles">
        .skeleton-wrapper {
          position: relative;
        }
        
        .skeleton-row {
          pointer-events: none;
        }
        
        .skeleton-cell {
          background: #e0e0e0;
          border-radius: 4px;
          height: 20px;
          overflow: hidden;
          position: relative;
        }
        
        .skeleton-card,
        .skeleton-list-item,
        .skeleton-form-field {
          background: #f5f5f5;
          border-radius: 8px;
          overflow: hidden;
        }
        
        .skeleton-card {
          padding: 16px;
          margin-bottom: 16px;
        }
        
        .skeleton-card-image {
          width: 100%;
          height: 150px;
          background: #e0e0e0;
          margin-bottom: 12px;
          border-radius: 4px;
          overflow: hidden;
        }
        
        .skeleton-title {
          height: 24px;
          background: #e0e0e0;
          margin-bottom: 12px;
          border-radius: 4px;
          overflow: hidden;
        }
        
        .skeleton-text {
          height: 16px;
          background: #e0e0e0;
          margin-bottom: 8px;
          border-radius: 4px;
          overflow: hidden;
        }
        
        .skeleton-avatar {
          background: #e0e0e0;
          border-radius: 50%;
          overflow: hidden;
          flex-shrink: 0;
        }
        
        .skeleton-list-item {
          display: flex;
          gap: 12px;
          padding: 12px;
          margin-bottom: 8px;
        }
        
        .skeleton-list-content {
          flex: 1;
        }
        
        .skeleton-input,
        .skeleton-button {
          background: #e0e0e0;
          border-radius: 4px;
          overflow: hidden;
        }
        
        .skeleton-label {
          height: 14px;
          background: #e0e0e0;
          margin-bottom: 8px;
          border-radius: 4px;
          overflow: hidden;
        }
        
        .skeleton-form-field {
          margin-bottom: 20px;
          padding: 8px;
        }
        
        .skeleton-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 20px;
        }
        
        /* Shimmer анимация */
        .skeleton-shimmer {
          position: relative;
          overflow: hidden;
        }
        
        .skeleton-shimmer::after {
          content: '';
          position: absolute;
          top: 0;
          right: 0;
          bottom: 0;
          left: 0;
          transform: translateX(-100%);
          background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0) 0%,
            rgba(255, 255, 255, 0.4) 50%,
            rgba(255, 255, 255, 0) 100%
          );
          animation: shimmer ${this.animationDuration}s infinite;
        }
        
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }
        
        /* Адаптация для тёмной темы */
        @media (prefers-color-scheme: dark) {
          .skeleton-cell,
          .skeleton-card-image,
          .skeleton-title,
          .skeleton-text,
          .skeleton-avatar,
          .skeleton-input,
          .skeleton-button,
          .skeleton-label {
            background: #2a2a2a;
          }
          
          .skeleton-card,
          .skeleton-list-item,
          .skeleton-form-field {
            background: #1e1e1e;
          }
        }
        
        /* Отключение анимаций если пользователь предпочитает */
        @media (prefers-reduced-motion: reduce) {
          .skeleton-shimmer::after {
            animation: none;
          }
        }
      </style>
    `;
    
    document.head.insertAdjacentHTML('beforeend', styles);
  }
}

// Глобальный экземпляр (только в браузере)
if (typeof window !== 'undefined') {
  // Получаем конфигурацию из CONFIG (если есть)
  let config = null;
  if (typeof CONFIG !== 'undefined' && CONFIG?.ui) {
    config = CONFIG.ui;
  }
  
  window.SkeletonLoader = new SkeletonLoader(config);
  
  // Автоматическая обёртка для загрузок
  if (window.SkeletonLoader && window.StateManager) {
    // Подписка на события загрузки
    window.StateManager.subscribe('loading', (isLoading) => {
      if (isLoading && window.SkeletonLoader.enabled) {
        const mainContainer = document.querySelector('.main-container, .data-container, #app');
        if (mainContainer && !mainContainer.querySelector('.skeleton-active')) {
          window.SkeletonLoader.show(mainContainer, 'table');
        }
      } else if (!isLoading) {
        const skeletonContainer = document.querySelector('.skeleton-active');
        if (skeletonContainer) {
          window.SkeletonLoader.hide(skeletonContainer);
        }
      }
    });
  }
}

// Для Google Apps Script (экспорт)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SkeletonLoader };
}