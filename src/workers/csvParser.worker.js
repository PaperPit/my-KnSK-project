/**
 * E4: Web Worker для фонового парсинга CSV
 * Не блокирует UI при обработке больших файлов
 */

// Worker контекст
self = this;

self.addEventListener('message', function(e) {
  const { file, options, chunkSize } = e.data;
  
  if (!file) {
    self.postMessage({ error: 'Файл не предоставлен' });
    return;
  }
  
  parseCSVFile(file, options, chunkSize);
});

async function parseCSVFile(file, options = {}, chunkSize = 1024 * 1024) {
  const {
    delimiter = ',',
    encoding = 'UTF-8',
    hasHeader = true,
    skipEmptyLines = true,
    maxRows = null,
  } = options;
  
  const fileSize = file.size;
  let offset = 0;
  let remainder = '';
  let headers = [];
  let results = [];
  let rowCount = 0;
  let isFirstChunk = true;
  
  self.postMessage({ 
    type: 'start', 
    total: fileSize,
    fileName: file.name,
  });
  
  while (offset < fileSize) {
    const chunk = file.slice(offset, offset + chunkSize);
    const text = await chunk.text();
    const lines = (remainder + text).split(/\r?\n/);
    
    // Последняя строка может быть неполной
    remainder = lines.pop();
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Пропуск пустых строк
      if (skipEmptyLines && line === '') continue;
      
      // Парсинг строки CSV с учётом кавычек
      const parsed = parseCSVLine(line, delimiter);
      
      if (isFirstChunk && i === 0 && hasHeader) {
        // Заголовки
        headers = parsed;
        self.postMessage({ 
          type: 'headers', 
          headers: headers,
        });
        continue;
      }
      
      // Создание объекта
      const row = {};
      if (headers.length > 0) {
        for (let j = 0; j < headers.length && j < parsed.length; j++) {
          row[headers[j]] = parsed[j];
        }
      } else {
        // Без заголовков - просто массив
        results.push(parsed);
        continue;
      }
      
      results.push(row);
      rowCount++;
      
      // Проверка лимита строк
      if (maxRows && rowCount >= maxRows) {
        self.postMessage({ 
          type: 'progress', 
          loaded: fileSize,
          total: fileSize,
          rows: rowCount,
          percentage: 100,
        });
        
        self.postMessage({ 
          type: 'complete', 
          data: results.slice(0, maxRows),
          headers: headers,
          totalRows: rowCount,
          truncated: true,
        });
        return;
      }
      
      // Отправка прогресса каждые 1000 строк
      if (rowCount % 1000 === 0) {
        const loaded = Math.min(offset + chunk.size, fileSize);
        const percentage = (loaded / fileSize) * 100;
        
        self.postMessage({ 
          type: 'progress', 
          loaded: loaded,
          total: fileSize,
          rows: rowCount,
          percentage: percentage,
        });
      }
    }
    
    offset += chunk.size;
    isFirstChunk = false;
    
    // Yield для предотвращения блокировки
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  
  // Финальная обработка остатка
  if (remainder.trim()) {
    const parsed = parseCSVLine(remainder, delimiter);
    if (!(hasHeader && results.length === 0)) {
      if (headers.length > 0) {
        const row = {};
        for (let j = 0; j < headers.length && j < parsed.length; j++) {
          row[headers[j]] = parsed[j];
        }
        results.push(row);
      } else {
        results.push(parsed);
      }
      rowCount++;
    }
  }
  
  self.postMessage({ 
    type: 'complete', 
    data: results,
    headers: headers,
    totalRows: rowCount,
    truncated: false,
  });
}

/**
 * Парсинг одной строки CSV с учётом кавычек
 * @param {string} line - Строка CSV
 * @param {string} delimiter - Разделитель (по умолчанию ',')
 * @returns {Array} - Массив полей
 */
function parseCSVLine(line, delimiter = ',') {
  const result = [];
  let current = '';
  let inQuotes = false;
  let i = 0;
  
  while (i < line.length) {
    const char = line[i];
    
    if (char === '"') {
      // Обработка экранированных кавычек
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      // Конец поля
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
    
    i++;
  }
  
  // Последнее поле
  result.push(current.trim());
  
  return result;
}

// Обработка ошибок
self.addEventListener('error', function(e) {
  self.postMessage({ 
    type: 'error', 
    error: e.message,
    stack: e.error?.stack,
  });
});