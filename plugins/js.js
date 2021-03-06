/*
    总入口，因为模板、样式最终都依附在js文件中
 */
let path = require('path');
let fs = require('fs');
let chalk = require('chalk');
let fd = require('./util-fd');
let jsContent = require('./js-content');
let deps = require('./util-deps');
let configs = require('./util-config');
let slog = require('./util-log');
//文件处理
let processFile = (from, to, inwatch) => { // d:\a\b.js  d:\c\d.js
    return new Promise((resolve, reject) => {
        from = path.resolve(from);
        to = path.resolve(to);
        let promise = Promise.resolve();
        if (inwatch && deps.inDependents(from)) {
            promise = deps.runFileDepend(from);
        }
        if (fs.existsSync(from)) {
            if (configs.jsFileExtNamesReg.test(from)) {
                promise.then(() => {
                    return jsContent.process(from, to, 0, inwatch);
                }).then(e => {
                    if (!e.isSnippet) {
                        to = to.replace(configs.jsFileExtNamesReg, m => {
                            if (m.length > 3 && m[1] === 'm') {
                                return '.mjs';
                            }
                            return '.js';
                        });
                        configs.writeFileStart(e);
                        fd.write(to, e.content);
                    }
                    if (configs.log && inwatch) {
                        slog.ever('[MXC Tip(js)] finish:', chalk.green(from));
                    }
                    resolve();
                }).catch(reject);
            } else {
                promise.then(resolve, reject);
            }
        } else {
            promise.then(resolve, reject);
        }
    });
};
module.exports = deps.setContext({
    process: processFile
});