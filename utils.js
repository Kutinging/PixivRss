const mysql = require('mysql');
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

// mysql
class DB {
  constructor() {
    this.cursor = mysql.createConnection({
      host: 'localhost',
      database: 'pixiv_rss',
      user: config.db.user,
      password: config.db.password
    });
  }
  query(sql, callback) {
    this.cursor.connect((err) => {
      if( err ) {
        return callback(err);
      }
    });
    this.cursor.query(sql, callback);
    this.cursor.end();
  }
}