const {app} = require("electron");
const {EditJSApplication} = require("./src/editjs-app.js");
const configure = require("./src/configure.js");
const workingDir = process.cwd();

const editjs = new EditJSApplication(workingDir);
const {files} = configure(process);

editjs.initialize();

// support running in OSX dock
editjs.enableDarwinBehavior();

app.once("ready", () => {
  if (files.length) {
    for (const file of files) {
      editjs.openDocument(file);
    }
  } else {
    editjs.openDocument(null);
  }
});
