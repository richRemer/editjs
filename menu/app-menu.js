const {Menu} = require("electron");

module.exports = function AppMenu(editjs) {
  return Menu.buildFromTemplate([
    {
      label: "EditJS",
      submenu: [
        {role: "close"},
        {role: "quit"}
      ]
    }
  ]);
};
