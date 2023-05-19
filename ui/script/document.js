const {editjs} = window;
const mode = "javascript";
const lineNumbers = true;

document.addEventListener("DOMContentLoaded", async () => {
  const state = await editjs.init();
  const editor = window.editor = CodeMirror(document.body, {
    value: state.data ?? "",
    mode: "javascript",
    lineNumbers: true,
    autofocus: true,
    extraKeys: {
      "Shift-Tab": "indentLess"
    }
  });

  editor.on("change", async () => {
    const dirty = !editor.isClean(state.clean);

    if (dirty && !state.dirty) {
      state.dirty = true;
      await editjs.dirty();
    } else if (state.dirty && !dirty) {
      state.dirty = false;
      await editjs.clean();
    }
  });

  editjs.onsave(async () => {
    const saved = await editjs.content(editor.getValue());

    if (saved) {
      state.dirty = false;
      state.clean = editor.changeGeneration();
    }
  });
});
