// Packager configs
// https://electron.github.io/electron-packager/main/interfaces/electronpackager.options.html
// Desktop Shortcutname -> name

module.exports = {
  packagerConfig: {
    asar: true,
    name: 'Data Synchronizer - Client',
    productName: 'Data Synchronizer - Client',
    executableName: 'Data Synchronizer - Client',
    ignore: 'configs'
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {},
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
  ],
};
