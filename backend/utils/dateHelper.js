/**
 * Date and Timezone utility for BizManage Reports & Analytics
 * Authoritative Timezone: Asia/Jakarta (UTC+7)
 */

const JAKARTA_OFFSET_HOURS = 7;
const JAKARTA_OFFSET_MS = JAKARTA_OFFSET_HOURS * 60 * 60 * 1000;

/**
 * Get current date object adjusted to Asia/Jakarta timezone
 */
const getJakartaNow = () => {
  const now = new Date();
  // Return UTC Date shifted to Jakarta time
  return new Date(now.getTime() + JAKARTA_OFFSET_MS);
};

/**
 * Parse date range with presets support: today, yesterday, this_week, this_month, custom
 * @param {Object} query - Query parameters (preset, date_from, date_to)
 * @param {string} defaultPreset - Default preset if none provided
 * @returns {{ startDate: Date, endDate: Date, preset: string }}
 */
const parseDateRange = (query = {}, defaultPreset = 'today') => {
  const preset = (query.preset || query.date_preset || (query.date_from || query.date_to ? 'custom' : defaultPreset)).toLowerCase();

  const nowUTC = new Date();
  const jNow = new Date(nowUTC.getTime() + JAKARTA_OFFSET_MS);

  const jYear = jNow.getUTCFullYear();
  const jMonth = jNow.getUTCMonth(); // 0-indexed
  const jDate = jNow.getUTCDate();
  const jDay = jNow.getUTCDay(); // 0 = Sunday, 1 = Monday, ...

  let startJDate;
  let endJDate;

  switch (preset) {
    case 'yesterday': {
      startJDate = new Date(Date.UTC(jYear, jMonth, jDate - 1, 0, 0, 0, 0));
      endJDate = new Date(Date.UTC(jYear, jMonth, jDate - 1, 23, 59, 59, 999));
      break;
    }
    case 'this_week': {
      // Monday as start of week (in ISO/Indonesian standards)
      const dayOffset = (jDay === 0 ? 6 : jDay - 1);
      startJDate = new Date(Date.UTC(jYear, jMonth, jDate - dayOffset, 0, 0, 0, 0));
      endJDate = new Date(Date.UTC(jYear, jMonth, jDate - dayOffset + 6, 23, 59, 59, 999));
      break;
    }
    case 'this_month': {
      startJDate = new Date(Date.UTC(jYear, jMonth, 1, 0, 0, 0, 0));
      // Last day of month
      const lastDay = new Date(Date.UTC(jYear, jMonth + 1, 0)).getUTCDate();
      endJDate = new Date(Date.UTC(jYear, jMonth, lastDay, 23, 59, 59, 999));
      break;
    }
    case 'custom': {
      if (query.date_from && query.date_to) {
        const [fromY, fromM, fromD] = query.date_from.split('-').map(Number);
        const [toY, toM, toD] = query.date_to.split('-').map(Number);
        startJDate = new Date(Date.UTC(fromY, fromM - 1, fromD, 0, 0, 0, 0));
        endJDate = new Date(Date.UTC(toY, toM - 1, toD, 23, 59, 59, 999));
      } else if (query.date_from) {
        const [fromY, fromM, fromD] = query.date_from.split('-').map(Number);
        startJDate = new Date(Date.UTC(fromY, fromM - 1, fromD, 0, 0, 0, 0));
        endJDate = new Date(Date.UTC(fromY, fromM - 1, fromD, 23, 59, 59, 999));
      } else if (query.date_to) {
        const [toY, toM, toD] = query.date_to.split('-').map(Number);
        startJDate = new Date(Date.UTC(toY, toM - 1, toD, 0, 0, 0, 0));
        endJDate = new Date(Date.UTC(toY, toM - 1, toD, 23, 59, 59, 999));
      } else {
        // Fallback to today
        startJDate = new Date(Date.UTC(jYear, jMonth, jDate, 0, 0, 0, 0));
        endJDate = new Date(Date.UTC(jYear, jMonth, jDate, 23, 59, 59, 999));
      }
      break;
    }
    case 'today':
    default: {
      startJDate = new Date(Date.UTC(jYear, jMonth, jDate, 0, 0, 0, 0));
      endJDate = new Date(Date.UTC(jYear, jMonth, jDate, 23, 59, 59, 999));
      break;
    }
  }

  // Convert back from Jakarta local representations to UTC timestamps for database querying
  const startDate = new Date(startJDate.getTime() - JAKARTA_OFFSET_MS);
  const endDate = new Date(endJDate.getTime() - JAKARTA_OFFSET_MS);

  return {
    startDate,
    endDate,
    preset
  };
};

module.exports = {
  getJakartaNow,
  parseDateRange
};
