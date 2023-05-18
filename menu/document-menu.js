const {Menu} = require("electron");

module.exports = function DocumentMenu(editjs) {
  return Menu.buildFromTemplate([
    {
      label: "File",
      submenu: [
        {label: "Open", accelerator: "CmdOrCtrl+O",
          click(menu, window) { editjs.openFile(window); }},
        {label: "Save", accelerator: "CmdOrCtrl+S",
          click(menu, window) { editjs.saveFile(window); }},
        {label: "Save As", accelerator: "CmdOrCtrl+Shift+S",
          click(menu, window) { editjs.saveFileAs(window); }},
        {type: "separator"},
        {role: "close"},
        {role: "quit"}
      ]
    },
    {role: "viewMenu"}
  ]);
};
