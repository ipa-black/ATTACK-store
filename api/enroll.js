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
        
        // دمج الحزم وتحويلها إلى نصوص بشكل يسهل قراءته
        const buffer = Buffer.concat(chunks);
        const body = buffer.toString('utf8');

        // خوارزمية بحث متقدمة تتجاهل المسافات والرموز المشفرة بين الوسوم
        const extractValue = (key) => {
            const regex = new RegExp(`<key>${key}</key>[\\s\\S]*?<string>(.*?)</string>`);
            const match = body.match(regex);
            return match ? match[1] : 'غير معروف';
        };

        const udid = extractValue('UDID');
        const product = extractValue('PRODUCT');
        const version = extractValue('VERSION');

        const host = req.headers.host;
        const redirectProtocol = host.includes('localhost') ? 'http' : 'https';
        // ترميز البيانات لتجنب أي أخطاء في مسار الرابط
        const redirectUrl = `${redirectProtocol}://${host}/?udid=${encodeURIComponent(udid)}&product=${encodeURIComponent(product)}&version=${encodeURIComponent(version)}`;

        res.writeHead(301, { Location: redirectUrl });
        res.end();
        
    } catch (error) {
        console.error("Error parsing profile payload:", error);
        res.status(500).send('Internal Server Error');
    }
}
