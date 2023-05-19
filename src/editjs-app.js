const {join, resolve} = require("path");
const {app, dialog, ipcMain, BrowserWindow, Menu} = require("electron");
const {Resource} = require("./resource.js");

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
      const resource = this.#documentData.get(window);

      resource.dirty = true;
      window.setTitle("EditJS - " + resource.getTitle());
    });

    ipcMain.handle("clean", ({sender}) => {
      const window = BrowserWindow.fromWebContents(sender);
      const resource = this.#documentData.get(window);

      resource.dirty = false;
      window.setTitle("EditJS - " + resource.getTitle());
    });

    ipcMain.handle("content", async ({sender}, content) => {
      const window = BrowserWindow.fromWebContents(sender);
      const resource = this.#documentData.get(window);

      await resource.save(content);

      window.setTitle("EditJS - " + resource.getTitle());
    });
  }

  /**
   * Open document window for a file.
   * @param {string|null} file
   */
  async openDocument(file) {
    const window = new BrowserWindow(DocumentWindowInit);
    const docMenu = require("../menu/document-menu.js")(this);
    const resource = await Resource.open(this, file);

    this.#documentData.set(window, resource);

    window.on("close", () => {
      this.#documentData.delete(window);
    });

    if (resource.dir) {
      await this.openFile(window);
      // HACK: using window for openFile context only
      window.close();
      return;
    }

    window.setMenu(docMenu);
    window.setTitle("EditJS - " + resource.getTitle());

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
    const resource = this.#documentData.get(window);

    if (resource.unknown) {
      await this.saveFileAs(window);
    } else {
      window.webContents.send("save");
    }
  }

  /**
   * Show file save dialog for a window.
   */
  async saveFileAs(window) {
    const resource = this.#documentData.get(window);

    const {canceled, filePath} = await dialog.showSaveDialog(window, {
      defaultPath: resource.path ?? undefined,
      // TODO: verify createDirectory works on Linux
      properties: ["createDirectory", "showOverwriteConfirmation"],
      filters: DialogFilters
    });

    if (!canceled) {
      resource.updatePath(filePath);
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
  width: 640,
  height: 480,
  webPreferences: {
    preload: join(__dirname, "preload.js")
  }
}
