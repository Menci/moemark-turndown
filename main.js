let cheerio = require('cheerio');
let moment = require('moment');
let Turndown = require('turndown');
let yaml = require('js-yaml');
let fs = require('fs-extra');
let path = require('path');

let config = require('./config');

let turndown = new Turndown(config.turndownOptions);
turndown.use(require('turndown-plugin-gfm').gfm);

let custom = require('./custom');
custom.customize(turndown);

function parseMeta($, permlink) {
    let meta = {};

    meta.title = $('.post-title').text();
    meta.categories = $('.post-category').find('span[itemprop="name"]').map((i, elem) => $(elem).text()).get().map(x => x.trim()).filter(x => x.length);
    meta.tags = $('meta[name="keywords"]').attr('content').split(',').map(x => x.trim()).filter(x => x.length && x !== 'Hexo' && x !== 'NexT');
    meta.permlink = permlink;
    meta.date = moment($('time').attr('datetime')).format(config.timeFormat);

    if (!meta.categories.length) delete meta.categories;
    if (!meta.tags.length) delete meta.tags;

    return meta;
}

function parseContent(html) {
    return turndown.turndown(custom.preProcessHTML(html));
}

let articles = fs.readdirSync(config.dir).filter(x => fs.statSync(path.join(config.dir, x)).isDirectory()).filter(x => !config.exludedDirs.includes(x));

for (let articleName of articles) {
    if (fs.existsSync(path.join(config.outputDir, articleName + '.md'))) {
        console.log(articleName + ' - skipped');
        continue;
    }

    console.log(articleName);

    let $ = cheerio.load(fs.readFileSync(path.join(config.dir, articleName, 'index.html')));

    let meta = parseMeta($, articleName);
    let content = parseContent($('.post-body').html());

    let output = yaml.dump(meta) + '---\n\n' + content;

    fs.writeFileSync(path.join(config.outputDir, articleName + '.md'), output);
}