const {join, resolve} = require("path");
const {readFile, writeFile} = require("fs").promises;
const {app, dialog, ipcMain, BrowserWindow, Menu} = require("electron");

class EditJSApplication {
  #dir;
  #initialized = false;
  #darwinEnabled = false;
  #documentData = new Map();

  constructor(workingDir) {
    this.#dir = workingDir;
  }

  get workingDir() { return this.#dir; }

  /**
   * Enable behaviors used to facilitate running the app window-less in the Mac
   * OSX dock.  Keeps the app running after all windows are closed and opens a
   * new window when the app is activated and there are no open windows.
   */
  enableDarwinBehavior() {
    if (this.#darwinEnabled) {
      throw new Error("Darwin behavior already enabled");
    }

    app.on("window-all-closed", () => {
      if (process.platform !== "darwin") {
        app.quit();
      }
    });

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.openDocument(null);
      }
    });
  }

  /**
   * Initialize application.
   */
  initialize() {
    if (this.#initialized) {
      throw new Error("application already initialized");
    }

    const appMenu = require("../menu/app-menu.js")(this);

    app.once("ready", () => {
      Menu.setApplicationMenu(appMenu);
    });

    ipcMain.handle("init", ({sender}) => {
      const window = BrowserWindow.fromWebContents(sender);
      return this.#documentData.get(window);
    });

    ipcMain.handle("dirty", ({sender}) => {
      const window = BrowserWindow.fromWebContents(sender);
      const data = this.#documentData.get(window);

      data.dirty = true;

      if (data.file) {
        window.setTitle(`EditJS - ${data.file}*`);
      }
    });

    ipcMain.handle("clean", ({sender}) => {
      const window = BrowserWindow.fromWebContents(sender);
      const data = this.#documentData.get(window);

      data.dirty = false;

      if (data.file) {
        window.setTitle(`EditJS - ${data.file}`);
      }
    });

    ipcMain.handle("content", async ({sender}, content) => {
      const window = BrowserWindow.fromWebContents(sender);
      const data = this.#documentData.get(window);

      await writeFile(data.path, content, "utf8");

      data.data = content;
      data.dirty = false;

      window.setTitle(`EditJS - ${data.file}`);
    });
  }

  /**
   * Open document window for a file.
   * @param {string|null} file
   */
  async openDocument(file) {
    const path = file ? resolve(this.#dir, file) : null;
    const data = path ? await readFile(path, "utf8") : null;
    const docMenu = require("../menu/document-menu.js")(this);
    const window = new BrowserWindow(DocumentWindowInit);

    this.#documentData.set(window, {file, path, data});

    window.setTitle("EditJS - " + (file ?? "*new*"));
    window.setMenu(docMenu);

    window.on("close", () => {
      this.#documentData.delete(window);
    });

    await window.loadFile("ui/document.html");
    await window.show();
  }

  /**
   * Show file open dialog.
   */
  async openFile(window) {
    const {path} = this.#documentData.get(window);

    const {canceled, filePaths} = await dialog.showOpenDialog({
      defaultPath: path ?? undefined,
      properties: ["openFile"],
      filters: DialogFilters
    });

    if (!canceled) {
      const [path] = filePaths;
      const file = path.startsWith(this.#dir)
        ? path.slice(this.#dir.length+1)
        : path;

      await this.openDocument(file);
    }
  }

  /**
   * Save file for a window.  Show file save dialog if document is new.
   */
  async saveFile(window) {
    const data = this.#documentData.get(window);

    if (data.path) {
      window.webContents.send("save");
    } else {
      await this.saveFileAs(window);
    }
  }

  /**
   * Show file save dialog for a window.
   */
  async saveFileAs(window) {
    const data = this.#documentData.get(window);

    const {canceled, filePath} = await dialog.showSaveDialog(window, {
      defaultPath: data.path ?? undefined,
      // TODO: verify createDirectory works on Linux
      properties: ["createDirectory", "showOverwriteConfirmation"],
      filters: DialogFilters
    });

    if (!canceled) {
      data.path = filePath;
      data.file = filePath.startsWith(this.#dir)
        ? filePath.slice(this.#dir.length+1)
        : filePath;

      window.webContents.send("save");
    }
  }
}

module.exports.EditJSApplication = EditJSApplication;

const DialogFilters = [
  {name: "JavaScript", extensions: ["js", "mjs", "cjs"]},
  {name: "All Files", extensions: ["*"]}
];

const DocumentWindowInit = {
  show: false,
  width: 800,
  height: 600,
  webPreferences: {
    preload: join(__dirname, "preload.js")
  }
}
