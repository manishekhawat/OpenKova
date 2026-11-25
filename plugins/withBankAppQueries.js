// Android 11+ hides other apps from getLaunchIntentForPackage unless they're declared in <queries>.
// Declares the bank apps Kova can open from the Pay screen (see src/data/banks.ts).
const { withAndroidManifest } = require('expo/config-plugins');

const PACKAGES = [
  'com.snapwork.hdfc',
  'com.csam.icici.bank.imobile',
  'com.axis.mobile',
  'com.msf.kbank.mobile',
  'com.sbi.lotusintouch',
];

module.exports = function withBankAppQueries(config, extra = []) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    const queries = (manifest.queries ??= [{}]);
    const q = queries[0];
    q.package ??= [];
    const have = new Set(q.package.map((p) => p.$['android:name']));
    for (const name of [...PACKAGES, ...extra]) {
      if (!have.has(name)) q.package.push({ $: { 'android:name': name } });
    }
    return cfg;
  });
};
