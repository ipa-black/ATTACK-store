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
        const chunks = [];
        for await (const chunk of req) {
            chunks.push(chunk);
        }
        
        const body = Buffer.concat(chunks).toString('utf8');

        const extractValue = (key) => {
            const regex = new RegExp(`<key>${key}</key>\\s*<string>([^<]+)</string>`);
            const match = body.match(regex);
            if (match) {
                return match[1].replace(/[^a-zA-Z0-9,._-]/g, '');
            }
            return '';
        };

        const udid = extractValue('UDID');
        const product = extractValue('PRODUCT');

        const host = req.headers.host;
        const redirectProtocol = host.includes('localhost') ? 'http' : 'https';
        const redirectUrl = `${redirectProtocol}://${host}/?udid=${udid}&product=${product}`;

        res.writeHead(301, { Location: redirectUrl });
        res.end();
        
    } catch (error) {
        console.error("Error processing Apple MDM request:", error);
        res.status(500).send('Internal Server Error');
    }
}
