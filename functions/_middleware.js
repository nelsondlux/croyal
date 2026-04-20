const REDIRECT_URL = 'https://google.com';
const UTM_COOKIE_NAME = 'utm_parameters';

const IP_WHITELIST = [
    '162.120.186.150',
    '193.186.4.201',
    '186.235.63.119',
];

/**
 * Resposta HTML que, antes de redirecionar, grava utm_parameters no localStorage e no cookie
 * (para o servidor poder detectar em visitas futuras). Usado em todo bloqueio.
 */
function blockedRedirectResponse() {
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>
<script>
try{localStorage.setItem('${UTM_COOKIE_NAME}','true');}catch(e){}
document.cookie='${UTM_COOKIE_NAME}=true;path=/;max-age=31536000;SameSite=Lax';
location.replace('${REDIRECT_URL}');
</script><p>Redirecionando...</p></body></html>`;
    return new Response(html, {
        status: 200,
        headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
    });
}

function isDesktopUserAgent(ua) {
    const lower = ua.toLowerCase();
    const mobile = /android|iphone|ipad|ipod|mobile|webos|blackberry|iemobile|opera mini/i.test(lower);
    if (mobile) return false;
    const desktop = /win32|win64|windows|wince|macintosh|macintel|macppc|mac68k/i.test(lower);
    return desktop;
}

function isPageRequest(method, pathname) {
    if (method !== 'GET' && method !== 'HEAD') return false;
    if (pathname.startsWith('/api/')) return false;
    if (pathname === '/' || pathname === '') return true;
    if (pathname.startsWith('/chat')) return true;
    return false;
}

function hasUtmParametersCookie(request) {
    const cookie = request.headers.get('Cookie') || '';
    return cookie.includes(UTM_COOKIE_NAME + '=');
}

export async function onRequest(context) {
    const request = context.request;
    const userAgent = request.headers.get('User-Agent') || '';
    const lowerUserAgent = userAgent.toLowerCase();
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method;

    const clientIP = request.headers.get('CF-Connecting-IP') || '0.0.0.0';
    if (IP_WHITELIST.includes(clientIP)) {
        return context.next();
    }

    // 0) Para pedidos de PÁGINA: se tiver cookie utm_parameters (foi bloqueado antes), mesmo que
    //    passe em todas as outras proteções e o IP seja "válido", redirecionar e bloquear este IP no DB.
    if (isPageRequest(method, pathname)) {
        const clientIP = request.headers.get('CF-Connecting-IP') || '0.0.0.0';
        const env = context.env;

        if (hasUtmParametersCookie(request)) {
            if (env && env.DB) {
                try {
                    await env.DB.prepare('INSERT OR IGNORE INTO visitor_logs (ip_address) VALUES (?)')
                        .bind(clientIP)
                        .run();
                } catch (_) {}
            }
            return blockedRedirectResponse();
        }
    }


    const blockedAgents = [
        'saveweb2zip', 'httrack', 'wget', 'curl', 'httpie',
        'fetch', 'powershell', 'libcurl',
        'python', 'python-requests', 'aiohttp',
        'ruby', 'mechanize',
        'php', 'guzzle',
        'go-http-client', 'okhttp',
        'java', 'apache-httpclient',
        'libwww', 'lwp',
        'node-fetch', 'axios', 'got',
        'perl', 'node',
        'scrapy', 'beautifulsoup', 'bs4',
        'selenium', 'puppeteer', 'playwright',
        'phantomjs', 'headless',
        'crawler', 'crowler', 'spider', 'bot', 'scan',
        'harvest', 'grabber', 'parser',
        'bingbot', 'slurp', 'duckduckbot',
        'baiduspider', 'yandexbot', 'sogou',
        'exabot', 'facebot', 'facebookexternalhit',
        'ia_archiver', 'ahrefsbot', 'semrushbot',
        'mj12bot', 'dotbot', 'rogerbot',
        'uptimerobot', 'site24x7', 'pingdom',
        'sqlmap', 'nikto', 'acunetix', 'netsparker',
        'nmap', 'masscan', 'zgrab',
        'httpclient', 'restsharp', 'winhttp',
        'okhttp', 'urllib', 'requests'
    ];

    for (const agent of blockedAgents) {
        if (lowerUserAgent.includes(agent)) {
            return blockedRedirectResponse();
        }
    }

    // 2) Para pedidos de PÁGINA: verificar se o IP está na blacklist (visitor_logs).
    if (isPageRequest(method, pathname)) {
        const clientIP = request.headers.get('CF-Connecting-IP') || '0.0.0.0';
        const env = context.env;

        if (env && env.DB) {
            try {
                const inBlacklist = await env.DB.prepare('SELECT 1 FROM visitor_logs WHERE ip_address = ? LIMIT 1')
                    .bind(clientIP)
                    .first();
                if (inBlacklist) {
                    return blockedRedirectResponse();
                }
            } catch (_) { /* segue mesmo se o DB falhar */ }
        }

        // 3) Não está na blacklist mas é desktop → adiciona à blacklist e redireciona (marca utm_parameters antes)
        if (isDesktopUserAgent(userAgent)) {
            if (env && env.DB) {
                try {
                    await env.DB.prepare('INSERT OR IGNORE INTO visitor_logs (ip_address) VALUES (?)')
                        .bind(clientIP)
                        .run();
                } catch (_) {}
            }
            return blockedRedirectResponse();
        }
    }

    return context.next();
}
