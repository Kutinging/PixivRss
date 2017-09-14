const request = require('got');
const LOG = require('./utils.js').LOG;
const DB = require('./utils.js').DB;
const HTTP = require('./utils.js').HTTP;
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

function loginToPixiv() {
  LOG.log('登录Pixiv');
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
  }).catch(() => {
    LOG.log('登录失败');
  });
}