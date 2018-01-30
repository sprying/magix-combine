/*
    增加mx-tag自定义标签的处理，方便开发者提取公用的html片断
 */
/*
    <mx-vframe src="app/views/default" pa="{{@a}}" pb="{{@b}}" />
    <mx-vframe src="app/views/default" pa="{{@a}}" pb="{{@b}}">
        loading...
    </mx-vframe>
 */
let fs = require('fs');
let path = require('path');
let configs = require('./util-config');
let tmplCmd = require('./tmpl-cmd');
let slog = require('./util-log');
let util = require('util');
let chalk = require('chalk');
let tmplParser = require('./tmpl-parser');
let attrMap = require('./tmpl-attr-map');
let duAttrChecker = require('./checker-tmpl-duattr');
let sep = path.sep;
let uncheckTags = {
    'mx-view': 1,
    'mx-include': 1,
    'mx-vframe': 1
};
let tagReg = /\btag\s*=\s*"([^"]+)"/;
let attrNameValueReg = /(?:^|\s)([^=\/\s]+)\s*=\s*(["'])([\s\S]*?)\2/g;
let inputTypeReg = /\btype\s*=\s*(['"])([\s\S]+?)\1/;
let tmplAttrsReg = /\$\{attrs\.([a-zA-Z_]+)\}/g;
let tmplContentReg = /\$\{content\}/g;
let tmplCommandAnchorReg = /\u0007\d+\u0007/;
let fileCache = Object.create(null);

let splitAttrs = (tag, type, attrs) => {
    let viewAttrs = '';
    let viewAttrsMap = {};
    attrs = attrs.replace(tagReg, (m, t) => {
        tag = t;
        return '';
    });
    let attrsMap = attrMap.getAll(tag, type);
    attrs = attrs.replace(attrNameValueReg, (m, key, q, content) => {
        if (!attrsMap[key] &&
            !key.startsWith('mx-') &&
            !key.startsWith('data-')) {
            if (key.startsWith('@view-')) {
                key = 'view-@' + key.slice(6);
            } else if (!key.startsWith('view-')) {
                key = 'view-' + key;
            }
            viewAttrs += ' ' + key + '="' + content + '"';
            viewAttrsMap[key.slice(5)] = content;
            return '';
        }
        return m;
    }).trim();
    viewAttrs = viewAttrs.trim();
    return {
        tag,
        attrs,
        viewAttrs,
        viewAttrsMap
    };
};
let toNative = (result, cmdStore, e) => {
    let attrs = result.attrs;
    let type = '';
    let tag = result.mainTag;
    if (tag == 'input') {
        let m = attrs.match(inputTypeReg);
        if (m) {
            type = m[2];
        }
    }
    let bAttrs = attrMap.getBooleanProps(tag, type);
    attrs = attrs.replace(attrNameValueReg, (m, key, q, content) => {
        if (bAttrs.hasOwnProperty(key)) {
            if (tmplCommandAnchorReg.test(content)) {
                let cmdContent = tmplCmd.extractCmdContent(content, cmdStore);
                if (cmdContent.succeed) {
                    return ' <%if(' + cmdContent.content + '){%>' + key + '<%}%> ';
                } else {
                    let ex1 = cmdContent.art ? `{{=data.${key}}}` : `<%=data.${key}%>`;
                    let ex2 = cmdContent.art ? `{{!data.${key}}}` : `<%!data.${key}%>`;
                    let ex3 = cmdContent.art ? `{{@data.${key}}}` : `<%@data.${key}%>`;
                    slog.ever(chalk.red('check attribute ' + key + '=' + q + cmdContent.origin + q), 'at', chalk.magenta(e.shortHTMLFile), 'the attribute value only support expression like ' + key + '="' + ex1 + '" or ' + key + '="' + ex2 + '" or ' + key + '="' + ex3 + '"');
                }
            } else {
                if (content === 'false' ||
                    content === '0' ||
                    content === '' ||
                    content === 'null') {
                    return '';
                } else {
                    return ' ' + key + ' ';
                }
            }
        }
        return m;
    });
    return `<${tag} ${attrs}>${result.content}</${tag}>`;
};
let innerView = (result, info, gRoot, map, extInfo) => {
    if (info) {
        result.mxView = gRoot + info.path;
        result.seprateAttrs = (tag, type) => splitAttrs(tag, type, result.attrs);
    }
    if (util.isObject(info) && util.isFunction(info.processor)) {
        return info.processor(result, map, extInfo) || '';
    }
    let tag = 'div';
    let hasTag = false;
    let attrs = result.attrs.replace(tagReg, (m, t) => {
        tag = t;
        hasTag = true;
        return '';
    });
    if (!hasTag && info && info.tag) {
        tag = info.tag;
    }
    let type = '';
    if (tag == 'input') {
        let m = attrs.match(inputTypeReg);
        if (m) {
            type = m[2];
        }
    }
    let allAttrs = attrMap.getAll(tag, type);
    let hasPath = false;
    let processedAttrs = {};
    attrs = attrs.replace(attrNameValueReg, (m, key, q, value) => {
        if (!info) {
            if (key == 'path' || key == 'view' || key == 'src') {
                hasPath = true;
                return ' mx-view=' + q + value + q;
            }
        }
        if (key.startsWith('@view-')) {
            return ' view-@' + key.slice(6) + '=' + q + value + q;
        }
        if (!allAttrs.hasOwnProperty(key) &&
            key.indexOf('view-') !== 0 &&
            key.indexOf('mx-') !== 0) {
            key = 'view-' + key;
        }
        if (info) {
            let pKey = '_' + key;
            if (info[key]) {
                processedAttrs[key] = 1;
            } else if (info[pKey]) {
                processedAttrs[pKey] = 1;
                value += ' ' + info[pKey];
            }
        }
        return ' ' + key + '=' + q + value + q;
    });
    if (info) {
        for (let p in info) {
            if (p != 'path' && p != 'tag' && !processedAttrs[p]) {
                let v = info[p];
                if (p.startsWith('_')) {
                    p = p.slice(1);
                }
                attrs += ` ${p}="${v}"`;
            }
        }
    }
    if (!hasPath && info) {
        attrs += ' mx-view="' + result.mxView + '"';
    }
    return `<${tag} ${attrs}>${result.content}</${tag}>`;
};

let innerInclude = (result, info) => {
    let file = '';
    let attrs = {};
    let src = '';
    result.attrs.replace(attrNameValueReg, (m, name, q, value) => {
        if (name == 'path' || name == 'src') {
            src = m;
            file = path.resolve(path.join(path.dirname(info.srcOwnerHTMLFile) + sep + value));
        } else {
            attrs[name] = value;
        }
    });
    if (!fs.existsSync(file)) {
        slog.ever(chalk.red('can not find file:' + file), 'for tag', chalk.magenta('<' + result.tag + ' ' + src + '>'), 'at', chalk.magenta(info.shortOwnerHTMLFile));
        return '';
    } else {
        let content = '';
        if (fileCache[file]) {
            content = fileCache[file];
        } else {
            content = fs.readFileSync(file) + '';
            fileCache[file] = content;
        }
        content = content.replace(tmplAttrsReg, (m, key) => {
            return attrs[key] || '';
        }).replace(tmplContentReg, () => {
            return result.content;
        });
        try {
            info.templateLang = path.extname(file).slice(1);
            info.srcHTMLFile = file;
            info.shortHTMLFile = file.replace(configs.moduleIdRemovedPath, '').slice(1);
            info.includeSnippet = true;
            content = configs.compileTmplStart(content, info);
            content = configs.compileTmplEnd(content, info);
        } catch (ex) {
            slog.ever(chalk.red('compile template error ' + ex.message), 'at', chalk.magenta(info.shortHTMLFile));
        }
        return content;
    }
};
module.exports = {
    process(tmpl, extInfo, e) {
        let badTags = Object.create(null);
        let cmdCache = Object.create(null);
        let galleriesMap = configs.galleries;
        let updateOffset = (pos, offset) => {
            let l = nodes => {
                if (nodes) {
                    for (let n of nodes) {
                        l(n.children);
                        if (n.start > pos) {
                            n.start += offset;
                        }
                        if (n.end > pos) {
                            n.end += offset;
                        }
                        if (n.hasAttrs) {
                            if (n.attrsStart > pos) {
                                n.attrsStart += offset;
                            }
                            if (n.attrsEnd > pos) {
                                n.attrsEnd += offset;
                            }
                        }
                        if (n.hasContent) {
                            if (n.contentStart > pos) {
                                n.contentStart += offset;
                            }
                            if (n.contentEnd > pos) {
                                n.contentEnd += offset;
                            }
                        }
                    }
                }
            };
            l(tokens);
        };
        let getTagInfo = n => {
            let content = '',
                attrs = '';
            if (n.hasAttrs) {
                attrs = tmpl.slice(n.attrsStart, n.attrsEnd);
            }
            if (n.hasContent) {
                content = tmpl.slice(n.contentStart, n.contentEnd);
            }
            let tag = n.tag;
            let oTag = tag;
            if (n.pfx) {
                tag = tag.slice(n.pfx.length + 1);
            }
            let tags = tag.split('.');
            let mainTag = tags.shift();
            let subTags = tags.length ? tags : ['index'];
            let result = {
                id: n.id,
                prefix: n.pfx,
                group: n.group,
                unary: !n.hasContent,
                tag: oTag,
                mainTag,
                subTags,
                attrs,
                attrsMap: n.attrsMap,
                content
            };
            return result;
        };

        let processCustomTag = (n, map) => {
            let result = getTagInfo(n);
            let content = result.content;
            let customContent = configs.customTagProcessor(result, map, extInfo, e);
            if (!customContent) {
                let tagName = result.tag;
                customContent = `<${tagName} ${result.attrs}>${content}</${tagName}>`;
                badTags[tagName] = 1;
            }
            if (content != customContent) {
                content = customContent;
                tmpl = tmpl.slice(0, n.start) + content + tmpl.slice(n.end);
                updateOffset(n.start, content.length - (n.end - n.start));
            }
        };
        let processToNativeTag = n => {
            let result = getTagInfo(n);
            let content = result.content;
            content = toNative(result, cmdCache, extInfo);
            tmpl = tmpl.slice(0, n.start) + content + tmpl.slice(n.end);
            updateOffset(n.start, content.length - (n.end - n.start));
        };
        let processGalleryTag = (n, map) => {
            let result = getTagInfo(n);
            let content = result.content;
            let mainTag = n.pfx + (n.group ? '.' : '-') + result.mainTag;
            let hasGallery = galleriesMap.hasOwnProperty(n.pfx + 'Root');
            let gRoot = galleriesMap[n.pfx + 'Root'] || '';
            let gMap = galleriesMap[n.pfx + 'Map'] || {};
            //console.log(mainTag, hasGallery, result);
            if (!uncheckTags.hasOwnProperty(mainTag) && hasGallery) {
                if (gMap.hasOwnProperty(result.tag)) {
                    let i = gMap[result.tag];
                    if (util.isFunction(i)) {
                        gMap[result.tag] = i = {
                            processor: i
                        };
                    }
                    if (i && !i.path) {
                        i.path = (n.group ? '' : n.pfx + '-') + result.mainTag + '/' + result.subTags.join('/');
                    }
                } else {
                    let cpath = path.join(configs.moduleIdRemovedPath, gRoot);
                    cpath = path.join(cpath, (n.group ? '' : n.pfx + '-') + result.mainTag);
                    if (fs.existsSync(cpath)) {
                        gMap[result.tag] = {
                            path: (n.group ? '' : n.pfx + '-') + result.mainTag + '/' + result.subTags.join('/')
                        };
                    } else {
                        uncheckTags[mainTag] = cpath;
                    }
                }
            }
            let tip = uncheckTags[mainTag];
            if (tip && tip !== 1) {
                slog.ever(chalk.red('can not process tag: ' + result.tag), 'at', chalk.magenta(e.shortHTMLFile), 'try path', chalk.magenta(tip));
            }
            let update = false;
            if (n.pfx == 'mx') {
                if (result.mainTag == 'view' || result.mainTag == 'vframe') {
                    if (result.mainTag == 'view') {
                        slog.ever(chalk.red('deprecated tag: mx-view'), 'at', chalk.magenta(e.shortHTMLFile), 'use', chalk.magenta('mx-vframe'), 'instead');
                    }
                    content = innerView(result);
                    update = true;
                } else if (result.mainTag == 'include') {
                    content = innerInclude(result, extInfo);
                    update = true;
                }
            }
            if (!update && gMap.hasOwnProperty(result.tag)) {
                content = innerView(result, gMap[result.tag], gRoot, map, extInfo);
                update = true;
            }
            if (update) {
                tmpl = tmpl.slice(0, n.start) + content + tmpl.slice(n.end);
                updateOffset(n.start, content.length - (n.end - n.start));
            }
        };
        let processAtAttrs = n => {
            let result = getTagInfo(n);
            let update = false;
            let content = '';
            let tag = result.tag;
            let attrs = result.attrs;
            attrs = attrs.replace(attrNameValueReg, (m, key, q, content) => {
                if (tmplCommandAnchorReg.test(content) && key.startsWith('@')) {
                    let cmdContent = tmplCmd.extractCmdContent(content, cmdCache);
                    if (cmdContent.succeed) {
                        update = true;
                        m = m.trim().slice(1);
                        return ' <%if(' + cmdContent.content + '){%>' + m + '<%}%> ';
                    } else {
                        let ex1 = cmdContent.art ? `{{=data.${key}}}` : `<%=data.${key}%>`;
                        let ex2 = cmdContent.art ? `{{!data.${key}}}` : `<%!data.${key}%>`;
                        let ex3 = cmdContent.art ? `{{@data.${key}}}` : `<%@data.${key}%>`;
                        slog.ever(chalk.red('check attribute ' + key + '=' + q + cmdContent.origin + q), 'at', chalk.magenta(e.shortHTMLFile), 'the attribute value only support expression like ' + key + '="' + ex1 + '" or ' + key + '="' + ex2 + '" or ' + key + '="' + ex3 + '"');
                    }
                }
            });
            if (update) {
                content = `<${tag} ${attrs}>${result.content}</${tag}>`;
                tmpl = tmpl.slice(0, n.start) + content + tmpl.slice(n.end);
                updateOffset(n.start, content.length - (n.end - n.start));
            }
        };
        let walk = (nodes, map) => {
            if (nodes) {
                if (!map) map = nodes.__map;
                for (let n of nodes) {
                    if (e.checker.checkTmplDuplicateAttr && n.attrs && n.attrs.length) {
                        duAttrChecker(n, e, cmdCache, tmpl.slice(n.attrsStart, n.attrsEnd));
                    }
                    walk(n.children, map);
                    if (n.customTag) {
                        //console.log(configs.galleryPrefixes, n.pfx);
                        if (configs.galleryPrefixes[n.pfx] === 1) {
                            if (n.group && n.pfx == 'native') {
                                processToNativeTag(n);
                            } else {
                                processGalleryTag(n, map);
                            }
                        } else {
                            //slog.ever(chalk.red('can not process custom tag:' + n.tag), 'at', chalk.magenta(extInfo.shortHTMLFile));
                            processCustomTag(n, map);
                        }
                    } else {
                        processAtAttrs(n);
                    }
                }
            }
        };
        let hasMxTag = nodes => {
            let map = nodes.__map;
            for (let n in map) {
                n = map[n];
                if (!badTags[n.tag] && n.customTag || n.atAttr) {
                    return true;
                }
            }
            return false;
        };
        tmpl = tmplCmd.store(tmpl, cmdCache);
        let tokens = tmplParser(tmpl);
        let checkTimes = 2 << 3;
        while (hasMxTag(tokens) && --checkTimes) {
            walk(tokens);
            tmpl = tmplCmd.store(tmpl, cmdCache);
            tmpl = tmplCmd.store(tmpl, cmdCache, configs.artTmplCommand);
            //console.log(tmpl);
            tokens = tmplParser(tmpl);
        }
        tmpl = tmplCmd.recover(tmpl, cmdCache);
        return tmpl;
    }
};