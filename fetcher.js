const jsdom = require('jsdom').JSDOM;
const LOG = require('./utils.js').LOG;
const DB = require('./utils.js').DB;
const HTTP = require('./utils.js').HTTP;
const EXIST = require('./utils.js').EXIST;
const config = require('./config.js');

// 中文标题
const MODE = {
  'daily'      : '每日',
  'weekly'     : '每周',
  'monthly'    : '每月',
  'rookie'     : '新人',
  'original'   : '原创',
  'male'       : '男性向作品',
  'female'     : '女性向作品',
  // r18
  'daily_r18'  : '每日R-18',
  'weekly_r18' : '每周R-18',
  'male_r18'   : '男性向R-18',
  'female_r18' : '女性向R-18',
  'r18g'       : '每日R-18G',
};

// 这个id是保存上榜log时用的
const MODE_ID = {
  'daily'    : 1,
  'weekly'   : 2,
  'monthly'  : 3,
  'rookie'   : 4,
  'original' : 5,
  'male'     : 6,
  'female'   : 7,
}

// 登录Pixiv
function loginToPixiv() {
  LOG.log('开始登录');
  let http = new HTTP({
    headers: {
      'Host': 'accounts.pixiv.net',
      'Origin': 'https://accounts.pixiv.net',
      'Referer': 'https://accounts.pixiv.net/login',
      'X-Requested-With': 'XMLHttpRequest'
    },
    cookie: 'pixiv'
  });
  LOG.log('查找 post-key');
  return new Promise((resolve, reject) => {
    http.get('https://accounts.pixiv.net/login')
    .then((response) => {
      // 查找post_key
      let m = /name="post_key" value="(\w+)"/.exec(response.body);
      if( !m ) {
        return LOG.log('找不到 post-key');
      }
      return http.post('https://accounts.pixiv.net/api/login', {
        pixiv_id: config.user.user,
        password: config.user.password,
        source: 'accounts',
        post_key: m[1]
      });
    }).then(() => {
      LOG.log('登录成功');
      resolve();
    }).catch(() => {
      LOG.log('登录失败');
      reject();
    });
  });
}

// 解析排行页面，抓取排行列表
function parseRankPage(html, mode) {
  LOG.log(`开始解析 ${mode} 排行`);
  let doc = new jsdom(html);
  let nodes = doc.window.document.querySelectorAll('section.ranking-item');
  if( !nodes.length ) {
    LOG.log('解析失败：找不到 .ranking-item');
    throw new Error('解析失败：找不到 .ranking-item');
  }
  let items = [];
  Array.from(nodes).forEach((node) => {
    // 基本数据
    let item = {
      ranking: node.dataset.rank,
      title: node.dataset.title,
      author: node.dataset.userName,
      date: node.dataset.date,
      view: node.dataset.viewCount,
      score: node.dataset.ratingCount,
      preview: node.querySelector('._thumbnail').dataset.src
    }
    // 获取图片地址
    let linkDom = node.querySelector('.work._work');
    // 是否动图，动图抓不了，不过现在好像也不多了
    item.isAnimated = linkDom.classList.contains('ugoku-illust');
    // 获取图片pixivId
    let m1 = /illust_id=(\d+)/.exec(linkDom.href);
    item.id = m1[1];
    // 获取userId
    let userDom = node.querySelector('.user-container');
    let m2 = /member\.php\?id=(\d+)/.exec(userDom.href);
    item.uid = m2[1];
    items.push(item);
  });
  if( items.length ) {
    LOG.log('解析成功');
    return items;
  } else {
    LOG.log('解析失败');
    throw new Error('解析失败');
  }
}

// 抓取排行页面
function fetchRankPage(mode) {
  LOG.log(`开始抓取 ${mode} 排行`);
  let http = new HTTP({
    cookie: 'pixiv'
  });
  http.get(`http://www.pixiv.net/ranking.php?lang=zh&mode=${mode}`)
  .then((response) => {
    let list = parseRankPage(response.body, mode);
    let exists = EXIST.read(mode);
    let count = 0, postedWeiboCount = 0;
    LOG.log('开始按列表抓取内容');
    for( let i = 0; i < list.length; i++ ) {
      let item = list[i], pixivId = item.id;
      let m = exists.find((_item) => {
        return _item.id == pixivId;
      });
      if( m ) {
        console.log(`${pixivId} 已下载，跳过`);
        continue;
      }
      // 特别愚蠢的..手动延迟，拉开请求时间差
      setTimeout(() => {
        // 是否需要发微博
        // 发微博需要 1、抓一个中等尺寸图 2、发微博
        if( mode in config.weibo ) {
        } else {
          // 不发微博只需要 1、下小尺寸图 2、存在本地
          let dhttp = new HTTP({
            headers: {
              Referer: 'http://www.pixiv.net/ranking.php'
            },
            cookie: 'pixiv'
          });
          dhttp.download(item.preview, `${pixivId}.jpg`);
          item.image = `http://rakuen.thec.me/PixivRss/previews/${pixivId}.jpg`;
          item.preview = undefined;
        }
      }, 1234 * count);
      // debug模式下做个最大数据限制
      if( config.debug && ( ++count >= config.debugMaxFetch ) ) {
        LOG.log(`达到debug模式抓取阈值 ${config.debugMaxFetch}，停止抓取`);
        return false;
      }
    }
    LOG.log('抓取完毕');
  }).catch(() => {
    LOG.log(`抓取 ${mode} 排行失败`);
    process.exit();
  });
}

fetchRankPage('daily_r18')