const Logger = require('./logger');

// Создание логгера с папкой по умолчанию 'logs'
const logger = new Logger();

// Или указание пользовательской папки:
// const logger = new Logger('./my-logs');

// ==================== Примеры использования ======================
// 1. Логирование Event
logger.event('user_login', {
  userId: 123,
  username: 'john_doe',
  ip: '192.168.1.1'
});

logger.event('purchase_completed', {
  orderId: 'ORD-2025-001',
  amount: 99.99,
  currency: 'USD'
});

// 2. Логирование Error
try {
  throw new Error('Не удалось подключиться к базе данных');
} catch (err) {
  logger.error(err, {
    database: 'postgresql',
    host: 'localhost',
    port: 5432
  });
}

// Или просто строка ошибки
logger.error('Файл не найден', {
  filePath: '/data/config.json'
});

// 3. Логирование Trace
logger.trace('function_execution', {
  functionName: 'calculateTotal',
  duration: '125ms',
  result: 5000
});

logger.trace('api_call', {
  endpoint: '/api/users',
  method: 'GET',
  status: 200,
  responseTime: '45ms'
});

// 3.1. Логирование выполнения функции с возвратом результата

function calculateTotal(items) {
  return items.reduce((s, it) => s + (it.price || 0) * (it.qty || 1), 0);
}

async function fetchUser(id) {
  // имитируем задержку
  await new Promise(r => setTimeout(r, 50));
  return { id, name: 'User'+id };
}

function willFail() {
  throw new Error('Внутренняя ошибка при обработке');
}

(async () => {
  // syn
  const sum = await logger.trace(() => calculateTotal([
    { price: 10, qty: 2 },
    { price: 5, qty: 3 }
  ]));
  console.log('calculateTotal ->', sum);

  // async
  const user = await logger.trace(fetchUser, 42);
  console.log('fetchUser ->', user);

  // ошибка
  try {
    await logger.trace(willFail);
  } catch (err) {
    console.log('Пойманная ошибка из willFail');
  }
})();

// 3.2. Трёхшаговый процесс: первые два шага успешны, третий шаг — ошибка
function stepOne() {
  // успешно возвращаем значение
  return 'step1 ok';
}

async function stepTwo() {
  // имитируем async работу
  await new Promise(r => setTimeout(r, 20));
  return 'step2 ok';
}

function stepThree() {
  // падаем
  throw new Error('step3 failed');
}

(async () => {
  try {
    await logger.trace([
      { name: 'Step 1: init', fn: stepOne },
      { name: 'Step 2: load', fn: stepTwo },
      { name: 'Step 3: finalize', fn: stepThree }
    ], 'three_step_process');
  } catch (e) {
    console.log('Процесс three_step_process завершился с ошибкой (см. лог trace).');
  }
})();

// ==================== Чтение логов ======================

// Получить все логи события за сегодня
const eventLogs = logger.getLogs('event');
console.log('Все event логи:', eventLogs);

// Получить все ошибки за сегодня
const errorLogs = logger.getLogs('error');
console.log('Все error логи:', errorLogs);

// Получить логи за конкретную дату
const oldLogs = logger.getLogs('event', '2025-11-27');
console.log('Event логи за 2025-11-27:', oldLogs);

// ==================== Очистка логов ======================

// Раскомментируйте для очистки:
// logger.clearLogs('event'); // Очистить event логи за сегодня
// logger.clearLogs('error', '2025-11-26'); // Очистить error логи за конкретную дату
