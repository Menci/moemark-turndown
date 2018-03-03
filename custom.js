let _ = require('lodash');

function replaceRule(turndown, { filter, replacement }) {
    let isEqual = (x, y) => _.isArray(x) && _.isArray(y) && _.isEqual(x.sort(), y.sort()) || x == y;
    for (let i in turndown.rules.array) {
        if (isEqual(turndown.rules.array[i].filter, filter)) {
            turndown.rules.array[i].replacement = replacement;
            break;
        }
    }
}

function customize(turndown) {
    let readline = require('readline-sync');
    let cheerio = require('cheerio');

    replaceRule(turndown, {
        filter: 'li',
        replacement: function (content, node, options) {
            content = content
                .replace(/^\n+/, '') // remove leading newlines
                .replace(/\n+$/, '\n') // replace trailing newlines with just a single one
                .replace(/\n/gm, '\n    '); // indent
            var prefix = options.bulletListMarker + ' '; // modified here to reduce the space
            var parent = node.parentNode;
            if (parent.nodeName === 'OL') {
                var start = parent.getAttribute('start');
                var index = Array.prototype.indexOf.call(parent.children, node);
                prefix = (start ? Number(start) + index : index + 1) + '. '; // modified here to reduce the space
            }
            return (
                prefix + content + (node.nextSibling && !/\n$/.test(content) ? '\n' : '')
            )
        }
    });

    turndown.addRule('aplayer', {
        filter: node => ['APLAYER', 'SCRIPT', 'STYLE'].includes(node.tagName.toUpperCase()),
        replacement: (content, node) => {
            if (node.getAttribute('style')) return `\n<div style="width: 100%; text-align: center; ">${node.innerHTML}</div>\n`
            else return `\n${node.outerHTML}\n`;
        }
    });

    turndown.addRule('pygments-code', {
        filter: node => node.nodeName.toUpperCase() === 'DIV' && node.getAttribute('class') === 'highlight',
        replacement: (content, node) => {
            function guessLang(html, text) {
                if (html.indexOf('</span>') === -1) return 'plain';

                let map = {
                    'Python': 'python',
                    'JavaScript': 'js',
                    'TypeScript': 'js',
                    'CSS+Lasso': 'cpp',
                    'Rexx': 'cpp',
                    'Arduino': 'cpp',
                    Perl6: 'cpp', Prolog: 'python', INI: 'ini', Bash: 'bash'
                };

                let child_process = require('child_process');
                let res = child_process.execSync('python ./guess-language.py', { input: text }).toString().trim();
                let enteredLanguageMap = {};

                process.on('exit', () => {
                    console.log(enteredLanguageMap);
                });

                if (res === 'Text only') { // failed to detect
                    console.log(text);
                    console.log(res);
                    let input = readline.question('Enter the language name: ');
                    return input; // don't save to map
                } else if (map[res]) return map[res];
                else if (enteredLanguageMap[res]) return enteredLanguageMap[res];
                else {
                    console.log(text);
                    console.log(res);

                    let input = readline.question('Enter the language name: ');
                    enteredLanguageMap[res] = input;
                    return input;
                }
            }

            let lang = guessLang(node.innerHTML, node.textContent);
            return `\`\`\`${lang}\n${node.textContent.trim()}\n\`\`\`\n`
        }
    });

    turndown.addRule('katex', {
        filter: node => node.nodeName.toUpperCase() === 'SPAN' && ['katex', 'katex-display'].includes(node.getAttribute('class')),
        replacement: (content, node) => {
            let $ = cheerio.load(node.innerHTML);
            let texContent = $('annotation[encoding="application/x-tex"]').text();
            let delimiter = node.getAttribute('class') === 'katex-display' ? '$$' : '$';
            return `${delimiter}${texContent}${delimiter}`;
        }
    });

    turndown.addRule('mathjax-svg', {
        filter: node => node.nodeName.toUpperCase() === 'SVG' && node.getAttribute('aria-labelledby').startsWith('MathJax-SVG'),
        replacement: (content, node) => {
            let $ = cheerio.load(node.innerHTML);
            let texContent = $('title').text().trim();
            if (texContent.indexOf('\n') === -1) texContent = ` ${texContent} `;
            else texContent = `\n${texContent}\n`;
            let delimiter = node.parentNode.tagName.toUpperCase() === 'P' && node.parentNode.getAttribute('style') === 'text-align: center; ' ? '$$' : '$';
            return `${delimiter}${texContent}${delimiter}`;
        }
    });

    turndown.addRule('read-more', {
        filter: node => node.nodeName.toUpperCase() === 'A' && node.getAttribute('id') === 'more',
        replacement: () => '\n<!-- more -->\n'
    });
}

function preProcessHTML(html) {
    let cheerio = require('cheerio');

    let $ = cheerio.load(html);
    $('.headerlink').remove();    
    $('img').each((i, elem) => {
        let src = $(elem).attr('src');
        src = src.replace('//dn-menci.qbox.me/', '');
        $(elem).attr('src', src);
    });

    $('div[style="width: 100%; text-align: center; "]').each((i, elem) => {
        elem.name = 'script';
    });

    return $.html();
}

module.exports = {
    customize: customize,
    preProcessHTML: preProcessHTML
};