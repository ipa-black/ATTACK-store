module.exports = (req, res) => {
  const { udid } = req.query;
  if (!udid) return res.status(400).send("UDID is required");

  const githubRepo = process.env.GITHUB_REPO;
  if (!githubRepo) return res.status(500).send("Error: GITHUB_REPO is missing");

  const ipaUrl = `https://github.com/${githubRepo}/releases/download/attack-${udid}/signed_app.ipa`;

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
                <string>ATTACK STORE</string>
            </dict>
        </dict>
    </array>
</dict>
</plist>`;

  res.setHeader('Content-Type', 'application/xml');
  res.status(200).send(xml);
};
