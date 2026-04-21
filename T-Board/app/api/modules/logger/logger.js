const fs = require('fs');
const path = require('path');

class Logger {
  /**
   * Инициализация логгера
   * @param {string} logsDir - Директория для сохранения логов (по умолчанию 'logs')
   */
  constructor(logsDir = 'logs') {
    this.logsDir = logsDir;
    this.ensureLogsDirectory();
  }

  /**
   * Убедиться, что директория для логов существует
   */
  ensureLogsDirectory() {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  /**
   * Получить отформатированную дату и время
   */
  getTimestamp() {
    return new Date().toISOString();
  }

  /**
   * Получить имя файла логов на основе типа и даты
   * @param {string} type - Тип лога (event, error, trace)
   */
  getLogFileName(type) {
    const date = new Date().toISOString().split('T')[0];
    return path.join(this.logsDir, `${type}-${date}.json`);
  }

  /**
   * Прочитать существующие логи из файла
   * @param {string} filePath - Путь к файлу
   */
  readLogs(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
      }
    } catch (err) {
      console.warn(`Ошибка при чтении файла ${filePath}:`, err.message);
    }
    return [];
  }

  /**
   * Сохранить логи в файл
   * @param {string} filePath - Путь к файлу
   * @param {array} logs - Массив логов
   */
  saveLogs(filePath, logs) {
    try {
      fs.writeFileSync(filePath, JSON.stringify(logs, null, 2), 'utf8');
    } catch (err) {
      console.error(`Ошибка при сохранении логов в ${filePath}:`, err.message);
    }
  }

  /**
   * Логировать Event
   * @param {string} eventName - Название события
   * @param {object} data - Данные события
   */
  event(eventName, data = {}) {
    const filePath = this.getLogFileName('event');
    const logs = this.readLogs(filePath);

    const logEntry = {
      timestamp: this.getTimestamp(),
      type: 'EVENT',
      name: eventName,
      data: data
    };

    logs.push(logEntry);
    this.saveLogs(filePath, logs);

    console.log(`Event логирован: ${eventName}`);
  }

  /**
   * Логировать Error
   * @param {string|Error} errorMsg - Сообщение об ошибке или объект Error
   * @param {object} metadata - Дополнительные данные об ошибке
   */
  error(errorMsg, metadata = {}) {
    const filePath = this.getLogFileName('error');
    const logs = this.readLogs(filePath);

    let errorData = {
      message: '',
      stack: ''
    };

    if (errorMsg instanceof Error) {
      errorData.message = errorMsg.message;
      errorData.stack = errorMsg.stack;
    } else {
      errorData.message = String(errorMsg);
    }

    const logEntry = {
      timestamp: this.getTimestamp(),
      type: 'ERROR',
      error: errorData,
      metadata: metadata
    };

    logs.push(logEntry);
    this.saveLogs(filePath, logs);

    console.error(`✗ Error логирован: ${errorData.message}`);
  }

  /**
   * Универсальный trace: если передана функция — выполнит её через traceFunction,
   * если массив — выполнит через traceSteps, иначе ведёт себя как простая запись trace(name, data).
   * Поддерживает вызовы:
   * - `trace(fn, ...args)` — выполняет функцию и логирует через `traceFunction`
   * - `trace(stepsArray, traceName)` — выполняет последовательность шагов через `traceSteps`
   * - `trace(name, data)` — записывает простой trace-запись (как было раньше)
   */
  trace(first, second = {}) {
    // массив
    if (Array.isArray(first)) {
      const steps = first;
      const traceName = typeof second === 'string' ? second : 'steps_trace';
      return this.traceSteps(steps, traceName);
    }

    // функция делегируем в traceFunction
    if (typeof first === 'function') {
      const fn = first;
      const args = Array.prototype.slice.call(arguments, 1);
      return this.traceFunction(fn, null, ...args);
    }

    // по умолчанию простая запись trace(name, data)
    const traceName = String(first || 'trace');
    const data = (typeof second === 'object' && !Array.isArray(second)) ? second : {};

    const filePath = this.getLogFileName('trace');
    const logs = this.readLogs(filePath);

    const logEntry = {
      timestamp: this.getTimestamp(),
      type: 'TRACE',
      name: traceName,
      data: data,
      stackTrace: (new Error().stack || '').split('\n').slice(1)
    };

    logs.push(logEntry);
    this.saveLogs(filePath, logs);

    console.log(`Trace логирован: ${traceName}`);
    return logEntry;
  }

  /**
   * Выполнить функцию с автоматической трассировкой: замерить время, сохранить результат или ошибку
   * Поддерживает синхронные и async функции.
   * @param {Function} fn - Функция для выполнения
   * @param {string} traceName - Имя трассировки
   * @param {...any} args - Аргументы для передачи в функцию
   * @returns {any} - Возвращает результат функции или пробрасывает ошибку
   */
  async traceFunction(fn, traceName = null, ...args) {
    const name = traceName || fn.name || 'anonymous_function';
    const start = Date.now();

    let result;
    let err = null;

    try {
      result = fn.apply(null, args);
      // Если вернулся промис — дождаться
      if (result && typeof result.then === 'function') {
        result = await result;
      }
    } catch (e) {
      err = e;
    }

    const durationMs = Date.now() - start;

    const filePath = this.getLogFileName('trace');
    const logs = this.readLogs(filePath);

    const logEntry = {
      timestamp: this.getTimestamp(),
      type: 'TRACE',
      name: name,
      data: {
        arguments: args,
        durationMs: durationMs,
        result: err ? undefined : result,
        error: err ? (err instanceof Error ? { message: err.message, stack: err.stack } : { message: String(err) }) : undefined
      },
      stackTrace: err ? ((err.stack || '').split('\n').slice(1)) : (new Error().stack || '').split('\n').slice(1)
    };

    logs.push(logEntry);
    this.saveLogs(filePath, logs);

    if (err) {
      console.log(`Trace (error) логирован: ${name} (${durationMs}ms)`);
      throw err;
    }

    console.log(`Trace логирован: ${name} (${durationMs}ms)`);
    return result;
  }

  /**
   * Выполнить последовательность шагов с трассировкой каждого шага.
   * steps — массив элементов вида { name: string, fn: Function } или просто Function.
   * Прервёт выполнение при первой ошибке, но в логе будут сохранены статусы всех выполненных шагов.
   * @param {Array<Function|Object>} steps
   * @param {string} traceName
   */
  async traceSteps(steps = [], traceName = 'steps_trace') {
    const start = Date.now();
    const stepResults = [];

    for (let i = 0; i < steps.length; i++) {
      const item = steps[i];
      const fn = typeof item === 'function' ? item : item.fn;
      const name = typeof item === 'function' ? (fn.name || `step${i+1}`) : (item.name || `step${i+1}`);

      try {
        let res = fn.apply(null);
        if (res && typeof res.then === 'function') res = await res;
        stepResults.push({ index: i + 1, name, status: 'ok', result: res });
      } catch (e) {
        stepResults.push({ index: i + 1, name, status: 'error', error: e instanceof Error ? { message: e.message, stack: e.stack } : { message: String(e) } });

        // Сохраняем лог с текущими результатами и прерываем выполнение
        const durationMs = Date.now() - start;
        const filePath = this.getLogFileName('trace');
        const logs = this.readLogs(filePath);
        const logEntry = {
          timestamp: this.getTimestamp(),
          type: 'TRACE',
          name: traceName,
          data: {
            durationMs,
            steps: stepResults
          },
          stackTrace: (e && e.stack ? e.stack : new Error().stack).split('\n').slice(1)
        };
        logs.push(logEntry);
        this.saveLogs(filePath, logs);

        console.log(`TraceSteps логирован (ошибка): ${traceName} (${durationMs}ms)`);
        throw e;
      }
    }

    const durationMs = Date.now() - start;
    const filePath = this.getLogFileName('trace');
    const logs = this.readLogs(filePath);
    const logEntry = {
      timestamp: this.getTimestamp(),
      type: 'TRACE',
      name: traceName,
      data: {
        durationMs,
        steps: stepResults
      },
      stackTrace: (new Error().stack || '').split('\n').slice(1)
    };
    logs.push(logEntry);
    this.saveLogs(filePath, logs);

    console.log(`TraceSteps логирован: ${traceName} (${durationMs}ms)`);
    return stepResults;
  }

  /**
   * Получить все логи определенного типа
   * @param {string} type - Тип лога (event, error, trace)
   * @param {string} date - Дата в формате YYYY-MM-DD (опционально)
   */
  getLogs(type, date = null) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const filePath = path.join(this.logsDir, `${type}-${targetDate}.json`);
    return this.readLogs(filePath);
  }

  /**
   * Очистить все логи определенного типа за определенный день
   * @param {string} type - Тип лога (event, error, trace)
   * @param {string} date - Дата в формате YYYY-MM-DD (опционально)
   */
  clearLogs(type, date = null) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const filePath = path.join(this.logsDir, `${type}-${targetDate}.json`);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`Логи ${type} за ${targetDate} очищены`);
    }
  }
}

module.exports = Logger;
