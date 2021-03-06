/*
    模板中事件的提取，主要为brix-event模块提供：https://github.com/thx/brix-event/blob/master/src/brix/event.js#L15
 */
let pureTagReg = /<[^>\s\/]+[^>]*>/g;
let attrsNameValueReg = /([^\s]+)=(["'])[\s\S]+?\2/ig;
let eventReg = /mx-(?!view|vframe|keys|options|data|partial|init|html)[a-zA-Z]+/;
module.exports = {
    extract(tmpl) {
        let map = Object.create(null);
        tmpl.replace(pureTagReg, match => {
            match.replace(attrsNameValueReg, (m, key) => {
                if (eventReg.test(key)) {
                    map[key.substring(3)] = 1;
                }
            });
        });
        return Object.keys(map);
    }
};