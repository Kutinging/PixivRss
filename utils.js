const fs = require('fs');
const path = require('path');
//
const mysql = require('mysql');
const _DATE_FORMAT = require('date.format');
//
const config = require('./config.js');

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

// log
const LOG = {
  path: path.join(__dirname, 'log'),
  log(pixivId, msg) {
    if( !config.debug ) {
      return false;
    }
    if( !msg ) {
      msg = pixivId;
      pixivId = undefined;
    }
    let now = new Date();
    let _msg = `[${now.format('{hh}:{mm}:{ss}')}] ` + (pixivId ? ` ${pixivId} >` : '') + ` ${msg}`;
    console.log(_msg);
    this.output(_msg);
  },
  end() {
    this.output('\r\n');
  },
  output(msg) {
    let date = new Date(), fname = path.join(LOG.path, date.format('{YYYY}-{MM}-{DD}.log'));
    fs.appendFile(fname, `${msg}\r\n`, (err) => {
      if( err ) {
        console.error(`写入日志文件失败 ${err}`);
      }
    });
  }
}

module.exports = {
  DB, LOG
};