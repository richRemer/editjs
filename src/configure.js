module.exports = configure;

function configure({env, argv}) {
  const args = argv.slice(2);
  const files = [];

  for (let i=0,len=args.length; i<len; i++) {
    const arg = args[i];

    if (arg === "-") {
      throw new Error("invalid argument '-'");
    } else if (arg === "--") {
      files.push(...args.slice(i+1));
      break;
    } else if (arg === "--help") {
      console.log("editjs [--] [<file> ...]");
      process.exit(0);
    } else if (arg.startsWith("-")) {
      throw new Error(`invalid option '${arg}'`);
    } else {
      files.push(arg);
    }
  }

  return {files};
}
