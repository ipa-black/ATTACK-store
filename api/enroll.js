export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    try {
        let body = '';
        for await (const chunk of req) {
            body += chunk;
        }

        const extractValue = (key) => {
            const regex = new RegExp(`<key>${key}</key>\\s*<string>(.*?)</string>`);
            const match = body.match(regex);
            return match ? match[1] : 'غير_معروف';
        };

        const udid = extractValue('UDID');
        const product = extractValue('PRODUCT');
        const version = extractValue('VERSION');

        const host = req.headers.host;
        const redirectProtocol = host.includes('localhost') ? 'http' : 'https';
        const redirectUrl = `${redirectProtocol}://${host}/?udid=${udid}&product=${product}&version=${version}`;

        res.writeHead(301, { Location: redirectUrl });
        res.end();
        
    } catch (error) {
        console.error("Error processing Apple MDM request:", error);
        res.status(500).send('Internal Server Error');
    }
}
