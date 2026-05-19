/**
 * F1: Генератор документации из JSDoc комментариев
 * Сканирует код и создаёт HTML документацию
 */

class DocGenerator {
  constructor() {
    this.docs = {
      modules: {},
      functions: [],
      classes: [],
      types: [],
    };
  }
  
  /**
   * Сканирование всех скриптов на странице
   * @returns {Promise<Object>} - Собранная документация
   */
  async scanAll() {
    this._log('info', 'Начало сканирования документации...');
    
    // Сбор всех скриптов на странице
    const scripts = document.querySelectorAll('script:not([src])');
    
    for (const script of scripts) {
      const content = script.textContent;
      this._parseJSDoc(content);
    }
    
    // Также проверяем глобальные объекты
    this._scanGlobals();
    
    this._log('info', `Сканирование завершено. Найдено: ${Object.keys(this.docs.modules).length} модулей, ${this.docs.functions.length} функций`);
    
    return this.docs;
  }
  
  /**
   * Генерация HTML документации
   * @returns {string} - HTML строка
   */
  generateHTML() {
    return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Документация проекта my-KnSK</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace; line-height: 1.6; color: #1a1a1a; background: #f5f5f5; }
        .container { display: flex; max-width: 1400px; margin: 0 auto; background: white; min-height: 100vh; }
        .sidebar { width: 280px; background: #2c3e50; color: white; position: fixed; height: 100vh; overflow-y: auto; padding: 20px; }
        .sidebar h1 { font-size: 20px; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #3498db; }
        .sidebar h2 { font-size: 14px; text-transform: uppercase; margin: 20px 0 10px 0; color: #95a5a6; }
        .sidebar ul { list-style: none; }
        .sidebar li { margin: 8px 0; }
        .sidebar a { color: #ecf0f1; text-decoration: none; font-size: 14px; transition: color 0.3s; }
        .sidebar a:hover { color: #3498db; }
        .content { margin-left: 280px; flex: 1; padding: 40px; max-width: calc(100% - 280px); }
        .module { background: white; border-radius: 8px; margin-bottom: 40px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .module h2 { color: #2c3e50; border-left: 4px solid #3498db; padding-left: 15px; margin-bottom: 20px; }
        .function, .class { margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 6px; border-left: 3px solid #27ae60; }
        .function h3, .class h3 { color: #2c3e50; font-family: monospace; margin-bottom: 10px; }
        .signature { background: #2c3e50; color: #ecf0f1; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 13px; margin: 10px 0; overflow-x: auto; }
        .description { margin: 10px 0; color: #34495e; }
        .params, .returns { margin: 10px 0; padding: 10px; background: #e8f4f8; border-radius: 4px; }
        .params h4, .returns h4 { color: #16a085; margin-bottom: 8px; }
        .param { margin: 5px 0; font-size: 13px; }
        .param-name { font-weight: bold; color: #2980b9; font-family: monospace; }
        .example { margin: 10px 0; padding: 10px; background: #fef9e7; border-left: 3px solid #f39c12; }
        .example pre { background: #2c3e50; color: #ecf0f1; padding: 10px; border-radius: 4px; overflow-x: auto; font-size: 12px; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; margin-left: 10px; }
        .badge.function { background: #3498db; color: white; }
        .badge.class { background: #9b59b6; color: white; }
        .badge.deprecated { background: #e74c3c; color: white; }
        @media (max-width: 768px) {
            .sidebar { transform: translateX(-100%); transition: transform 0.3s; z-index: 1000; }
            .sidebar.open { transform: translateX(0); }
            .content { margin-left: 0; max-width: 100%; }
            .menu-toggle { display: block; position: fixed; top: 20px; left: 20px; z-index: 1001; background: #3498db; color: white; border: none; padding: 10px; border-radius: 4px; cursor: pointer; }
        }
        @media (min-width: 769px) { .menu-toggle { display: none; } }
    </style>
</head>
<body>
    <button class="menu-toggle" onclick="document.querySelector('.sidebar').classList.toggle('open')">☰ Меню</button>
    <div class="container">
        <div class="sidebar">
            <h1>📚 my-KnSK Documentation</h1>
            <h2>Модули</h2>
            <ul>
                ${Object.keys(this.docs.modules).map(mod => `<li><a href="#module-${mod}">${mod}</a></li>`).join('')}
            </ul>
            <h2>Функции</h2>
            <ul>
                ${this.docs.functions.slice(0, 30).map(fn => `<li><a href="#fn-${fn.name}">${fn.name}</a></li>`).join('')}
            </ul>
            <h2>Классы</h2>
            <ul>
                ${this.docs.classes.map(cls => `<li><a href="#class-${cls.name}">${cls.name}</a></li>`).join('')}
            </ul>
        </div>
        <div class="content">
            <h1>Документация проекта</h1>
            <p>Сгенерировано: ${new Date().toLocaleString()}</p>
            
            ${Object.entries(this.docs.modules).map(([name, content]) => `
                <div class="module" id="module-${name}">
                    <h2>📦 ${name}</h2>
                    <p>${content.description || 'Нет описания'}</p>
                </div>
            `).join('')}
            
            <h2>Функции</h2>
            ${this.docs.functions.map(fn => `
                <div class="function" id="fn-${fn.name}">
                    <h3>🔧 ${fn.name} <span class="badge function">function</span></h3>
                    <div class="signature">${fn.signature || fn.name}(${fn.params?.map(p => p.name).join(', ') || ''})</div>
                    <div class="description">${fn.description || 'Нет описания'}</div>
                    ${fn.params && fn.params.length ? `
                        <div class="params">
                            <h4>📥 Параметры</h4>
                            ${fn.params.map(p => `
                                <div class="param">
                                    <span class="param-name">${p.name}</span>
                                    ${p.type ? `: <em>${p.type}</em>` : ''}
                                    ${p.description ? `- ${p.description}` : ''}
                                    ${p.optional ? '<span style="color:#7f8c8d"> (опционально)</span>' : ''}
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                    ${fn.returns ? `
                        <div class="returns">
                            <h4>📤 Возвращает</h4>
                            <div>${fn.returns.type || 'any'} - ${fn.returns.description || ''}</div>
                        </div>
                    ` : ''}
                    ${fn.example ? `
                        <div class="example">
                            <h4>💡 Пример</h4>
                            <pre><code>${fn.example}</code></pre>
                        </div>
                    ` : ''}
                </div>
            `).join('')}
            
            <h2>Классы</h2>
            ${this.docs.classes.map(cls => `
                <div class="class" id="class-${cls.name}">
                    <h3>🏛️ ${cls.name} <span class="badge class">class</span></h3>
                    <div class="description">${cls.description || 'Нет описания'}</div>
                    ${cls.methods && cls.methods.length ? `
                        <div class="params">
                            <h4>Методы</h4>
                            ${cls.methods.map(m => `
                                <div><strong>${m.name}</strong>(${m.params?.join(', ') || ''}) - ${m.description || ''}</div>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            `).join('')}
        </div>
    </div>
</body>
</html>`;
  }
  
  /**
   * Сохранение документации в файл
   */
  async saveToFile() {
    const html = this.generateHTML();
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'documentation.html';
    a.click();
    URL.revokeObjectURL(url);
    
    this._log('info', 'Документация сохранена в documentation.html');
  }
  
  /**
   * Генерация и скачивание всей документации
   */
  async generateAll() {
    await this.scanAll();
    this.saveToFile();
  }
  
  /**
   * Парсинг JSDoc комментариев
   * @private
   */
  _parseJSDoc(content) {
    const jsdocRegex = /\/\*\*([\s\S]*?)\*\/(?:\s*function\s+(\w+)|const\s+(\w+)\s*=\s*function|\s*class\s+(\w+))/g;
    
    let match;
    while ((match = jsdocRegex.exec(content)) !== null) {
      const comment = match[1];
      const functionName = match[2] || match[3];
      const className = match[4];
      
      const tags = this._parseTags(comment);
      
      if (functionName) {
        // Проверяем, нет ли уже такой функции
        if (!this.docs.functions.find(f => f.name === functionName)) {
          this.docs.functions.push({
            name: functionName,
            description: tags.description,
            params: tags.params,
            returns: tags.returns,
            example: tags.example,
            signature: tags.signature,
          });
        }
      }
      
      if (className) {
        if (!this.docs.classes.find(c => c.name === className)) {
          this.docs.classes.push({
            name: className,
            description: tags.description,
            methods: tags.methods,
          });
        }
      }
    }
  }
  
  _parseTags(comment) {
    const result = {
      description: '',
      params: [],
      returns: null,
      example: null,
      signature: null,
      methods: [],
    };
    
    const lines = comment.split('\n');
    let inDescription = true;
    
    for (const line of lines) {
      const trimmed = line.replace(/^\s*\* ?/, '').trim();
      
      if (trimmed.startsWith('@param')) {
        inDescription = false;
        const paramMatch = trimmed.match(/@param\s+{([^}]+)}\s+(\w+)\s*-?\s*(.*)/);
        if (paramMatch) {
          result.params.push({
            type: paramMatch[1],
            name: paramMatch[2],
            description: paramMatch[3],
          });
        }
      } else if (trimmed.startsWith('@returns') || trimmed.startsWith('@return')) {
        inDescription = false;
        const returnMatch = trimmed.match(/@returns?\s+{([^}]+)}\s*(.*)/);
        if (returnMatch) {
          result.returns = {
            type: returnMatch[1],
            description: returnMatch[2],
          };
        }
      } else if (trimmed.startsWith('@example')) {
        inDescription = false;
        const exampleMatch = trimmed.replace('@example', '').trim();
        result.example = exampleMatch;
      } else if (trimmed.startsWith('@method')) {
        inDescription = false;
        const methodMatch = trimmed.match(/@method\s+(\w+)\((.*)\)/);
        if (methodMatch) {
          result.methods.push({
            name: methodMatch[1],
            params: methodMatch[2].split(',').map(p => p.trim()),
            description: '',
          });
        }
      } else if (trimmed.startsWith('@signature')) {
        inDescription = false;
        result.signature = trimmed.replace('@signature', '').trim();
      } else if (inDescription && trimmed && !trimmed.startsWith('@')) {
        result.description += trimmed + ' ';
      }
    }
    
    result.description = result.description.trim();
    return result;
  }
  
  _scanGlobals() {
    const globals = ['GASAdapter', 'EventBus', 'StateManager', 'Logger', 'BackupManager', 'SkeletonLoader', 'VirtualTable', 'DocGenerator'];
    
    for (const global of globals) {
      if (window[global]) {
        this.docs.modules[global] = {
          description: `Глобальный экземпляр ${global}`,
          type: typeof window[global],
        };
      }
    }
  }
  
  _log(level, ...args) {
    if (window.Logger) {
      window.Logger[level]('[DocGenerator]', ...args);
    } else if (console[level]) {
      console[level]('[DocGenerator]', ...args);
    }
  }
}

// Глобальный экземпляр
if (typeof window !== 'undefined') {
  window.DocGenerator = new DocGenerator();
  
  // Команда для генерации документации в консоли
  window.generateDocs = async () => {
    await window.DocGenerator.scanAll();
    window.DocGenerator.saveToFile();
  };
}