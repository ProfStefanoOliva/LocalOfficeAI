module.exports = {
  packagerConfig: {
    asar: true,
    executableName: "LocalOfficeAI Tray",
    prune: true
  },
  makers: [
    {
      name: "@electron-forge/maker-zip",
      platforms: ["win32"]
    }
  ]
};
