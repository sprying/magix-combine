/*
    属性处理总入口
 */
let attrMxEvent = require('./tmpl-attr-mxevent');
let attrMxView = require('./tmpl-attr-mxview');
let attrLink = require('./tmpl-attr-link');
let checker = require('./checker');
let tmplCmd = require('./tmpl-cmd');
let regexp = require('./util-rcache');
let chalk = require('chalk');
let slog = require('./util-log');
let tagReg = /<([\w\-:]+)((?:"[^"]*"|'[^']*'|[^'">])*)>/g;
let attrReg = /([\w\-:@]+)="[\s\S]*?"/g;
module.exports = {
    process(fileContent, e, refTmplCommands) {
        let toSrc = expr => {
            return e.toTmplSrc ? e.toTmplSrc(expr, refTmplCommands) : tmplCmd.recover(expr, refTmplCommands);
        };
        return fileContent.replace(tagReg, (match, tagName, attrs) => { //标签进入
            attrs.replace(attrReg, (m, key) => {
                if (key.indexOf('view-') !== 0 &&
                    key.indexOf('mx-') !== 0 &&
                    key != 'mx-view' &&
                    tagName != 'q:group') {
                    m = toSrc(m);
                    let i = tmplCmd.extactCmd(m, ['!']);
                    if (i) {
                        if (i.operate == '!') {
                            let reg = regexp.get(i.open + '!', 'g');
                            slog.ever(chalk.magenta(`[MXC Tip(tmpl-attr)]`), chalk.red('avoid use ' + m), 'at', chalk.grey(e.shortHTMLFile), 'use', chalk.magenta(m.replace(reg, i.open + '=')), 'instead');
                        }
                    }
                }
            });
            match = attrMxEvent(e, match, refTmplCommands, toSrc);
            match = attrMxView(e, match, refTmplCommands, toSrc);
            match = attrLink(e, tagName, match, refTmplCommands, toSrc);
            match = checker.Tmpl.checkTag(e, match, toSrc);
            return match;
        });
    }
};