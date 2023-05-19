const {resolve} = require("path");
const {stat, readFile, writeFile} = require("fs").promises;

class Resource {
  constructor(app, path=null, data=null) {
    this.app = app;
    this.path = path === null ? path : String(path);
    this.data = typeof data === "string" || data === true ? data : null;
    this.dirty = false;
  }

  static async open(app, file=null) {
    if (file === null) {
      return new Resource(app);
    }

    const path = resolve(app.workingDir, file);

    try {
      const stats = await stat(path);
      const dir = stats.isDirectory();

      if (dir) {
        return new Resource(app, path, true);
      } else {
        const data = await readFile(path, "utf8");
        return new Resource(app, path, data);
      }
    } catch (err) {
      if (err.code === "ENOENT") {
        return new Resource(app, path);
      } else {
        throw err;
      }
    }
  }

  get unknown() { return this.path === null; }
  get exists() { return this.data !== null && this.data !== true; }
  get dir() { return this.data === true; }

  getTitle() {
    const {app, path} = this;
    const dirtyMark = this.dirty ? "*" : "";

    if (path === null) {
      return "(new)" + dirtyMark;
    } else if (path.startsWith(app.workingDir)) {
      return path.slice(app.workingDir.length+1) + dirtyMark;
    } else {
      return path + dirtyMark;
    }
  }

  async save(data) {
    if (this.unknown) {
      throw new Error("resource has no path");
    } else if (typeof data !== "string") {
      throw new TypeError("invalid resource data");
    }

    await writeFile(this.path, data, "utf8");

    this.data = data;
    this.dirty = false;
  }

  async saveAs(data, path) {
    if (typeof path !== "string") {
      throw new TypeError("invalid resource path");
    } else if (typeof data !== "string") {
      throw new TypeError("invalid resource data");
    }

    this.updatePath(path);
    await this.save(data);
  }

  updatePath(path) {
    if (typeof path !== "string") {
      throw new TypeError("invalid resource path");
    }

    this.path = path;
    this.dirty = true;
  }
}

module.exports.Resource = Resource;
