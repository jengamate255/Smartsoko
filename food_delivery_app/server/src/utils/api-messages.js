/**
 * API message catalogue (LOC-006).
 *
 * Errors are identified by a stable code so clients can map them in their own
 * layer, while `error` stays human-readable. Kiswahili is the product language,
 * so it is the default when a client sends no language signal.
 */
const DEFAULT_LANGUAGE = 'sw';

const MESSAGES = {
    AUTH_NO_TOKEN: {
        en: 'No token provided',
        sw: 'Hakuna tokeni iliyotolewa',
    },
    AUTH_INVALID_TOKEN: {
        en: 'Invalid or expired token',
        sw: 'Tokeni batili au imeisha muda',
    },
    AUTH_REQUIRED: {
        en: 'Authentication required',
        sw: 'Lazima uingie kwanza',
    },
    AUTH_BACKEND_UNCONFIGURED: {
        en: 'Auth backend not configured (missing Firebase credentials)',
        sw: 'Huduma ya uthibitishaji haijawekwa (hakuna kibali cha Firebase)',
    },
    AUTH_ROLES_REQUIRED: {
        en: 'Requires one of roles: %s',
        sw: 'Inahitaji mojawapo ya majukumu: %s',
    },
    ACCESS_DENIED: {
        en: 'Access denied',
        sw: 'Ufikiaji umekataliwa',
    },
    MERCHANT_ACCESS_REQUIRED: {
        en: 'Merchant access required',
        sw: 'Lazima uwe muuzaji',
    },
    ADMIN_ACCESS_REQUIRED: {
        en: 'Admin access required',
        sw: 'Lazima uwe msimamizi',
    },
    RIDER_ACCESS_REQUIRED: {
        en: 'Rider access required',
        sw: 'Lazima uwe mwafirishaji',
    },
    VALIDATION_FAILED: {
        en: 'Validation failed',
        sw: 'Uthibitishaji wa data umeshindwa',
    },
    INVALID_QUERY_PARAMS: {
        en: 'Invalid query parameters',
        sw: 'Vigezo vya utafutaji si halali',
    },
    INVALID_ROUTE_PARAMS: {
        en: 'Invalid route parameters',
        sw: 'Vigezo vya njia si halali',
    },
    OTP_PHONE_REQUIRED: {
        en: 'Valid phone number required (e.g. 0712345678 or +255712345678)',
        sw: 'Nambari halali ya simu inahitajika (mf. 0712345678 au +255712345678)',
    },
    OTP_WAIT: {
        en: 'Please wait %s before requesting another code',
        sw: 'Tafadhali subiri %s kabla ya kuomba msimbo mwingine',
    },
    DATABASE_UNAVAILABLE: {
        en: 'Database not available',
        sw: 'Hifadhidata haipatikani kwa sasa',
    },
    OTP_SMS_FAILED: {
        en: 'Failed to send verification SMS',
        sw: 'Imeshindikana kutuma SMS ya uthibitisho',
    },
    OTP_SEND_FAILED: {
        en: 'Failed to send OTP',
        sw: 'Imeshindikana kutuma msimbo wa uthibitisho',
    },
    OTP_FIELDS_REQUIRED: {
        en: 'phone and 6-digit otp required',
        sw: 'Nambari ya simu na msimbo wa tarakimu 6 zinahitajika',
    },
    OTP_TOO_MANY_ATTEMPTS: {
        en: 'Too many attempts — request a new code',
        sw: 'Majaribio mengi — omba msimbo mpya',
    },
    OTP_INVALID: {
        en: 'Invalid OTP code',
        sw: 'Msimbo wa uthibitisho si halali',
    },
    OTP_EXPIRED: {
        en: 'OTP expired — request a new code',
        sw: 'Msimbo umeisha muda — omba msimbo mpya',
    },
    OTP_VERIFY_FAILED: {
        en: 'Verification failed',
        sw: 'Uthibitishaji umeshindwa',
    },
    IDEMPOTENCY_KEY_INVALID: {
        en: 'Invalid idempotency key',
        sw: 'Ufunguo wa kuzuia marudio si halali',
    },
    IDEMPOTENCY_KEY_CONFLICT: {
        en: 'Checkout key was already used for different items',
        sw: 'Ufunguo wa malipo tayari umetumika kwa bidhaa tofauti',
    },
    IDEMPOTENCY_IN_PROGRESS: {
        en: 'This checkout is already processing. Retry the same checkout shortly.',
        sw: 'Malipo haya tayari yanachakatwa. Jaribu tena mara chache.',
    },
    IDEMPOTENCY_UNAVAILABLE: {
        en: 'Checkout is temporarily unavailable',
        sw: 'Malipo hayapatikani kwa muda',
    },
};

const SUPPORTED = new Set(['en', 'sw']);

/**
 * 'sw' | 'en' from ?lang=, X-Language, then Accept-Language; Swahili otherwise.
 */
function resolveLanguage(request) {
    const headers = (request && request.headers) || {};
    const query = (request && request.query) || {};

    // Each signal is tried in order, so an unsupported `?lang=fr` still falls
    // through to X-Language instead of silencing it.
    const signals = [query.lang, headers['x-language']];
    for (const signal of signals) {
        const code = String(signal || '')
            .trim()
            .toLowerCase()
            .slice(0, 2);
        if (SUPPORTED.has(code)) return code;
    }

    // Accept-Language is an ordered preference list; take the first tag the
    // product speaks ('en-US,en;q=0.9,sw;q=0.8' asks for English).
    const accept = String(headers['accept-language'] || '');
    for (const tag of accept.split(',')) {
        const code = tag
            .split(';')[0]
            .trim()
            .toLowerCase()
            .slice(0, 2);
        if (SUPPORTED.has(code)) return code;
    }

    return DEFAULT_LANGUAGE;
}

function message(code, language, params = []) {
    const entry = MESSAGES[code];
    if (!entry) return code;
    const template = entry[language] || entry.en;
    let text = template;
    const values = Array.isArray(params) ? params : [params];
    values.forEach(value => {
        text = text.replace('%s', value == null ? '' : String(value));
    });
    return text;
}

/**
 * Sends `{ success: false, error, code }`. Extra fields (e.g. `errors`) are
 * appended last so callers can override `error`/`code` deliberately.
 */
function sendError(response, request, status, code, extra = {}) {
    const language = resolveLanguage(request);
    const params = extra.params || [];
    const body = { success: false };
    Object.keys(extra).forEach(key => {
        if (key !== 'params') body[key] = extra[key];
    });
    body.error = extra.error || message(code, language, params);
    body.code = extra.code || code;
    return response.status(status).json(body);
}

module.exports = {
    DEFAULT_LANGUAGE,
    MESSAGES,
    resolveLanguage,
    message,
    sendError,
};
