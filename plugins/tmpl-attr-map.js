/*
    属性映射，仅罗列了常用属性，后期有时间再补充完整
 */
let tagsBooleanPrpos = {
    '*': {
        spellcheck: 1,
        hidden: 1
    },
    input: {
        autofocus: 1,
        disabled: 1,
        readonly: 1,
        required: 1,
        multiple: 1
    },
    'input&checkbox': {
        checked: 1
    },
    'input&radio': {
        checked: 1
    },
    textarea: {
        autofocus: 1,
        disabled: 1,
        readonly: 1,
        required: 1
    },
    select: {
        disabled: 1,
        multiple: 1,
        required: 1
    },
    audio: {
        autoplay: 1,
        controls: 1,
        loop: 1,
        muted: 1
    },
    video: {
        autoplay: 1,
        controls: 1,
        loop: 1,
        muted: 1
    },
    button: {
        autofocus: 1,
        disabled: 1
    },
    form: {
        novalidate: 1
    },
    img: {
        ismap: 1
    },
    hr: {
        noshade: 1
    },
    area: {
        nohref: 1
    },
    td: {
        nowrap: 1
    }
};
let tagsProps = {
    '*': {
        lang: 'lang',
        spellcheck: 'spellcheck',
        draggable: 'draggable',
        id: 'id',
        class: 'className',
        title: 'title',
        slot: 'slot',
        dir: 'dir',
        accesskey: 'accessKey',
        contenteditable: 'contentEditable',
        tabindex: 'tabIndex',
        translate: 'translate',
        hidden: 'hidden'
    },
    input: {
        name: 'name',
        autofocus: 'autofocus',
        maxlength: 'maxLength',
        minlength: 'minLength',
        disabled: 'disabled',
        readonly: 'readOnly',
        value: 'value',
        placeholder: 'placeholder',
        required: 'required',
        size: 'size',
        pattern: 'pattern',
        multiple: 'multiple',
        src: 'src',
        autocomplete: 'autocomplete'
    },
    'input&checkbox': {
        disabled: 'disabled',
        checked: 'checked',
        value: 'value'
    },
    'input&radio': {
        disabled: 'disabled',
        checked: 'checked',
        value: 'value'
    },
    'input&number': {
        disabled: 'disabled',
        readonly: 'readOnly',
        value: 'value',
        placeholder: 'placeholder',
        size: 'size',
        max: 'max',
        min: 'min',
        step: 'step'
    },
    'input&range': {
        disabled: 'disabled',
        readonly: 'readOnly',
        value: 'value',
        max: 'max',
        min: 'min',
        step: 'step'
    },
    'input&file': {
        accept: 'accept'
    },
    textarea: {
        autofocus: 'autofocus',
        cols: 'cols',
        rows: 'rows',
        value: 'value',
        placeholder: 'placeholder',
        readonly: 'readOnly',
        required: 'required',
        maxlength: 'maxLength',
        minlength: 'minLength'
    },
    select: {
        disabled: 'disabled',
        multiple: 'multiple',
        size: 'size',
        required: 'required'
    },
    form: {
        autocomplete: 'autocomplete',
        novalidate: 'noValidate',
        'accept-charset': 'acceptCharset',
        action: 'action',
        target: 'target',
        method: 'method',
        enctype: 'enctype',
        name: 'name'
    },
    iframe: {
        src: 'src',
        scrolling: 'scrolling',
        sandbox: 'sandbox',
        width: 'width',
        height: 'height',
        name: 'name'
    },
    a: {
        href: 'href',
        charset: 'charset',
        hreflang: 'hreflang',
        name: 'name',
        rel: 'rel',
        rev: 'rev',
        type: 'type',
        target: 'target'
    },
    area: {
        href: 'href',
        coords: 'coords',
        shape: 'shape',
        target: 'target',
        nohref: 'noHref',
        alt: 'alt',
        name: 'name'
    },
    th: {
        colspan: 'colSpan',
        rowspan: 'rowSpan'
    },
    td: {
        colspan: 'colSpan',
        rowspan: 'rowSpan',
        nowrap: 'noWrap'
    },
    img: {
        src: 'src',
        alt: 'alt',
        width: 'width',
        height: 'height',
        usemap: 'useMap',
        ismap: 'isMap'
    },
    audio: {
        autoplay: 'autoplay',
        controls: 'controls',
        src: 'src',
        loop: 'loop',
        muted: 'muted',
        volume: 'volume'
    },
    video: {
        autoplay: 'autoplay',
        controls: 'controls',
        src: 'src',
        loop: 'loop',
        muted: 'muted',
        volume: 'volume',
        width: 'width',
        height: 'height'
    },
    button: {
        autofocus: 'autofocus',
        disabled: 'disabled',
        value: 'value',
        name: 'name'
    },
    canvas: {
        width: 'width',
        height: 'height'
    },
    progress: {
        max: 'max',
        value: 'value'
    },
    hr: {
        noshade: 'noShade'
    }
};
let allAttrs = {
    '*': {
        style: 'style',
    },
    label: {
        'for': 'for'
    },
    input: {
        type: 'type'
    },
    button: {
        type: 'type'
    }
};

module.exports = {
    getAll(tag, type) {
        let all = Object.assign({}, allAttrs['*'], (allAttrs[tag] || {}), tagsProps['*']);
        let tags = tagsProps[tag];
        if (tags) {
            all = Object.assign(all, tags);
        }
        tags = tagsProps[tag + '&' + type];
        if (tags) {
            all = Object.assign(all, tags);
        }
        return all;
    },
    getProps(tag, type) {
        let globals = Object.assign({}, tagsProps['*']);
        let tags = tagsProps[tag];
        if (tags) {
            globals = Object.assign(globals, tags);
        }
        tags = tagsProps[tag + '&' + type];
        if (tags) {
            globals = Object.assign(globals, tags);
        }
        return globals;
    },
    getBooleanProps(tag, type) {
        let globals = Object.assign({}, tagsBooleanPrpos['*']);
        let tags = tagsBooleanPrpos[tag];
        if (tags) {
            globals = Object.assign(globals, tags);
        }
        tags = tagsBooleanPrpos[tag + '&' + type];
        if (tags) {
            globals = Object.assign(globals, tags);
        }
        return globals;
    }
};