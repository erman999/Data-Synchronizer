module.exports = {
  packagerConfig: {
    asar: true,
    name: 'Data Synchronizer - Server',
    productName: 'Data Synchronizer - Server',
    executableName: 'Data Synchronizer - Server',
    ignore: ['./configs'],
    extraResource: ['./configs'],
    icon: './img/icons/icon.ico'
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        setupIcon: './img/icons/icon.ico'
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['win32', 'darwin'],
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
