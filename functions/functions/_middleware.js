export async function onRequest(context) {
    const request = context.request;
    const userAgent = request.headers.get('User-Agent') || '';
    const lowerUserAgent = userAgent.toLowerCase();


    const blockedAgents = [
        'saveweb2zip', 'httrack', 'wget', 'curl', 'python', 'ruby',
        'go-http-client', 'java', 'libwww', 'scrapy'
    ];

    for (const agent of blockedAgents) {
        if (lowerUserAgent.includes(agent)) {

            return Response.redirect('https://google.com', 302);
        }
    }


    return context.next();
}
