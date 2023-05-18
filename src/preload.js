const {contextBridge, ipcRenderer} = require("electron");

contextBridge.exposeInMainWorld("editjs", {
  init() {
    return ipcRenderer.invoke("init");
  },
  dirty() {
    return ipcRenderer.invoke("dirty");
  },
  clean() {
    return ipcRenderer.invoke("clean");
  },
  content(data) {
    return ipcRenderer.invoke("content", data);
  },
  onsave(callback) {
    ipcRenderer.on("save", callback);
  }
});
