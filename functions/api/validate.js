export async function onRequestPost(context) {
    const { request, env } = context;


    const clientIP = request.headers.get('CF-Connecting-IP') || '0.0.0.0';

    try {
        const formData = await request.formData();
        const evt = formData.get('evt');

        if (evt === 'init_validate') {


            if (!env.DB) {
                return new Response('Database not configured', { status: 500 });
            }


            const existing = await env.DB.prepare('SELECT 1 FROM visitor_logs WHERE ip_address = ? LIMIT 1')
                .bind(clientIP)
                .first();

            if (!existing) {
                await env.DB.prepare('INSERT OR IGNORE INTO visitor_logs (ip_address) VALUES (?)')
                    .bind(clientIP)
                    .run();
            }

            // Cliente deve gravar utm_parameters no localStorage/cookie antes de redirecionar
            return new Response(JSON.stringify({ validated: true, setUtm: true }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        return new Response('Invalid event', { status: 400 });

    } catch (err) {
        return new Response('Error processing request: ' + err.message, { status: 500 });
    }
}
