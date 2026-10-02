const run = () => { throw Error("Bind the workspace effect before use"); };
run.nearEffect = "workspace";
io_eff(CID(Browser.workspace), run);
