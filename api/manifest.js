module.exports = (req, res) => {
  const { udid } = req.query;
  if (!udid) return res.status(400).send("UDID is required");

  const githubRepo = process.env.GITHUB_REPO;
  if (!githubRepo) return res.status(500).send("Error: GITHUB_REPO is missing in Vercel settings");

  // رابط التطبيق الموقّع المباشر من الريليز الخاص بهذا الجهاز
  const ipaUrl = `https://github.com/${githubRepo}/releases/download/attack-${udid}/signed_app.ipa`;
  // رابط أيقونة التطبيق الجديدة لكي تظهر أثناء التثبيت
  const iconUrl = `https://up6.cc/2026/06/178283429697381.png`;

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>items</key>
    <array>
        <dict>
            <key>assets</key>
            <array>
                <dict>
                    <key>kind</key>
                    <string>software-package</string>
                    <key>url</key>
                    <string>${ipaUrl}</string>
                </dict>
                <dict>
                    <key>kind</key>
                    <string>display-image</string>
                    <key>needs-shine</key>
                    <true/>
                    <key>url</key>
                    <string>${iconUrl}</string>
                </dict>
                <dict>
                    <key>kind</key>
                    <string>full-size-image</string>
                    <key>needs-shine</key>
                    <true/>
                    <key>url</key>
                    <string>${iconUrl}</string>
                </dict>
            </array>
            <key>metadata</key>
            <dict>
                <key>bundle-identifier</key>
                <string>app.attack</string>
                <key>bundle-version</key>
                <string>1.0.0</string>
                <key>kind</key>
                <string>software</string>
                <key>title</key>
                <string>ATTACK ستور</string>
            </dict>
        </dict>
    </array>
</dict>
</plist>`;

  // نرسل الملف كـ XML ونمنع الكاش لكي لا تحدث أخطاء في نظام iOS
  res.setHeader('Content-Type', 'application/xml');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.status(200).send(xml);
};
